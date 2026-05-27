// worker.js - The main Cloudflare Worker entry point
// This worker acts as an API gateway, routing requests to the appropriate Durable Object.

/**
 * ARCHITECTURAL NOTE:
 * This Worker serves as the public-facing API. It does not hold any export state itself.
 * All state management and heavy lifting for database exports are delegated to
 * Durable Objects, ensuring scalability and resilience.
 */

export interface Env {
    DATABASE_EXPORTER: DurableObjectNamespace;
    R2_BUCKET: R2Bucket;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // Helper to get a DO instance
        const getExportDO = (exportId: string): DurableObjectStub => {
            const id = env.DATABASE_EXPORTER.idFromName(exportId);
            return env.DATABASE_EXPORTER.get(id);
        };

        // Route requests
        if (path === '/export/start' && request.method === 'POST') {
            return handleStartExport(request, env, getExportDO);
        } else if (path.startsWith('/export/') && path.endsWith('/status') && request.method === 'GET') {
            return handleGetStatus(request, env, getExportDO);
        } else if (path.startsWith('/export/') && path.endsWith('/download') && request.method === 'GET') {
            return handleGetDownloadUrl(request, env, getExportDO);
        } else if (path.startsWith('/export/') && path.endsWith('/resume') && request.method === 'POST') {
            // This endpoint allows explicitly resuming a paused export, though the DO
            // will also self-resume after its yield interval.
            return handleResumeExport(request, env, getExportDO);
        } else {
            return new Response('Not Found', { status: 404 });
        }
    },
};

async function handleStartExport(request: Request, env: Env, getExportDO: (id: string) => DurableObjectStub): Promise<Response> {
    try {
        const { dbName, format } = await request.json() as { dbName: string; format: string };
        if (!dbName || !format) {
            return new Response('Missing dbName or format', { status: 400 });
        }

        // Generate a unique export ID
        const exportId = crypto.randomUUID();
        const exportDO = getExportDO(exportId);

        // Call the Durable Object to start the export
        const doResponse = await exportDO.fetch(new Request(`https://do/${exportId}/start`, {
            method: 'POST',
            body: JSON.stringify({ dbName, format }),
            headers: { 'Content-Type': 'application/json' },
        }));

        const doResult = await doResponse.json();
        if (doResponse.ok) {
            return new Response(JSON.stringify({ exportId, status: doResult.status, message: doResult.message }), {
                headers: { 'Content-Type': 'application/json' },
                status: 202, // Accepted
            });
        } else {
            return new Response(JSON.stringify({ error: doResult.error || 'Failed to start export' }), {
                headers: { 'Content-Type': 'application/json' },
                status: doResponse.status,
            });
        }
    } catch (error: any) {
        console.error('Error starting export:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}

async function handleGetStatus(request: Request, env: Env, getExportDO: (id: string) => DurableObjectStub): Promise<Response> {
    try {
        const exportId = request.url.split('/')[4]; // e.g., /export/123/status -> 123
        if (!exportId) {
            return new Response('Missing exportId', { status: 400 });
        }

        const exportDO = getExportDO(exportId);
        const doResponse = await exportDO.fetch(new Request(`https://do/${exportId}/status`));

        const doResult = await doResponse.json();
        if (doResponse.ok) {
            return new Response(JSON.stringify(doResult), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        } else {
            return new Response(JSON.stringify({ error: doResult.error || 'Failed to get status' }), {
                headers: { 'Content-Type': 'application/json' },
                status: doResponse.status,
            });
        }
    } catch (error: any) {
        console.error('Error getting export status:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}

async function handleGetDownloadUrl(request: Request, env: Env, getExportDO: (id: string) => DurableObjectStub): Promise<Response> {
    try {
        const exportId = request.url.split('/')[4];
        if (!exportId) {
            return new Response('Missing exportId', { status: 400 });
        }

        const exportDO = getExportDO(exportId);
        const doResponse = await exportDO.fetch(new Request(`https://do/${exportId}/download`));

        const doResult = await doResponse.json();
        if (doResponse.ok) {
            return new Response(JSON.stringify(doResult), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        } else {
            return new Response(JSON.stringify({ error: doResult.error || 'Failed to get download URL' }), {
                headers: { 'Content-Type': 'application/json' },
                status: doResponse.status,
            });
        }
    } catch (error: any) {
        console.error('Error getting download URL:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}

async function handleResumeExport(request: Request, env: Env, getExportDO: (id: string) => DurableObjectStub): Promise<Response> {
    try {
        const exportId = request.url.split('/')[4];
        if (!exportId) {
            return new Response('Missing exportId', { status: 400 });
        }

        const exportDO = getExportDO(exportId);
        const doResponse = await exportDO.fetch(new Request(`https://do/${exportId}/resume`, { method: 'POST' }));

        const doResult = await doResponse.json();
        if (doResponse.ok) {
            return new Response(JSON.stringify(doResult), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        } else {
            return new Response(JSON.stringify({ error: doResult.error || 'Failed to resume export' }), {
                headers: { 'Content-Type': 'application/json' },
                status: doResponse.status,
            });
        }
    } catch (error: any) {
        console.error('Error resuming export:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
    }
}


// durable_object.js - The Durable Object implementation
// This DO manages the state and execution of a single database export.

/**
 * ARCHITECTURAL NOTE:
 * This Durable Object is responsible for the entire lifecycle of a database export.
 * It manages state persistence, interacts with R2 for chunked uploads, and implements
 * the "breathing interval" mechanism to prevent long-running operations from blocking
 * other requests to this DO instance.
 *
 * LAYOUT/LOGIC CHOICES:
 * - State is stored in `this.state.storage` to ensure durability across DO restarts.
 * - Multipart upload is used for R2 to handle large files efficiently.
 * - A generator function simulates database reading in chunks.
 * - The `_runExportLoop` is designed to be re-entrant and idempotent, allowing it to
 *   resume from its last saved state.
 * - `_yieldControl` is the core mechanism for the 5-second execution / 5-second pause loop.
 *
 * SAFETY CONSTRAINTS:
 * - Frequent state saving ensures progress is not lost.
 * - Error handling includes aborting R2 multipart uploads on failure to prevent orphaned parts.
 * - Chunking prevents memory exhaustion by not loading the entire database into DO memory.
 */

// Constants for export process
const DATABASE_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for R2 multipart upload
const EXPORT_EXECUTION_BURST_MS = 5 * 1000; // Execute for 5 seconds
const EXPORT_PAUSE_INTERVAL_MS = 5 * 1000; // Pause for 5 seconds
const SIGNED_URL_EXPIRATION_SECONDS = 3600; // Signed URL valid for 1 hour

// Export status types
type ExportStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'ABORTED';

// State interface for Durable Object storage
interface ExportState {
    exportId: string;
    dbName: string;
    format: string;
    status: ExportStatus;
    r2Key: string;
    multipartUploadId?: string;
    uploadedParts: { ETag: string; PartNumber: number }[];
    currentPartNumber: number;
    currentByteOffset: number;
    totalBytesExpected?: number; // Optional, if known
    downloadUrl?: string;
    errorMessage?: string;
    lastActivityTime: number; // Timestamp of last state update or activity
    lastYieldTime?: number; // Timestamp when the DO last yielded control
    executionStartTime?: number; // Timestamp when the current execution burst started
}

export class DatabaseExportDO {
    state: DurableObjectState;
    env: Env;
    r2Bucket: R2Bucket;
    exportState: ExportState | null;
    exportLoopPromise: Promise<void> | null; // To track the ongoing export loop

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
        this.r2Bucket = env.R2_BUCKET;
        this.exportState = null;
        this.exportLoopPromise = null;

        // Ensure the DO is always active if an export is in progress
        this.state.blockConcurrencyWhile(async () => {
            await this._loadState();
            if (this.exportState && (this.exportState.status === 'IN_PROGRESS' || this.exportState.status === 'PAUSED')) {
                console.log(`DO ${this.exportState.exportId}: Resuming export on constructor load.`);
                this._runExportLoop(); // Restart the loop if it was in progress
            }
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const exportId = pathParts[2]; // e.g., /do/exportId/start

        if (!this.exportState && pathParts[3] !== 'start') {
            // If state is not loaded and it's not a start request, try to load it
            await this._loadState();
            if (!this.exportState) {
                return new Response(JSON.stringify({ error: 'Export not found or initialized' }), { status: 404 });
            }
        }

        switch (pathParts[3]) {
            case 'start':
                return this._handleStartExport(request, exportId);
            case 'status':
                return this._handleGetStatus();
            case 'download':
                return this._handleGetDownloadUrl();
            case 'resume':
                return this._handleResumeExport();
            default:
                return new Response('Not Found', { status: 404 });
        }
    }

    private async _loadState(): Promise<void> {
        const storedState = await this.state.storage.get<ExportState>('exportState');
        if (storedState) {
            this.exportState = storedState;
            console.log(`DO ${this.exportState.exportId}: State loaded. Status: ${this.exportState.status}`);
        } else {
            console.log(`DO: No state found.`);
        }
    }

    private async _saveState(): Promise<void> {
        if (this.exportState) {
            this.exportState.lastActivityTime = Date.now();
            await this.state.storage.put('exportState', this.exportState);
            console.log(`DO ${this.exportState.exportId}: State saved. Status: ${this.exportState.status}, Part: ${this.exportState.currentPartNumber}`);
        }
    }

    private async _handleStartExport(request: Request, exportId: string): Promise<Response> {
        if (this.exportState && this.exportState.status !== 'PENDING' && this.exportState.status !== 'FAILED' && this.exportState.status !== 'ABORTED') {
            return new Response(JSON.stringify({ status: this.exportState.status, message: 'Export already in progress or completed.' }), { status: 200 });
        }

        try {
            const { dbName, format } = await request.json() as { dbName: string; format: string };
            const r2Key = `${dbName}-${exportId}.${format}`;

            this.exportState = {
                exportId,
                dbName,
                format,
                status: 'PENDING',
                r2Key,
                uploadedParts: [],
                currentPartNumber: 0,
                currentByteOffset: 0,
                lastActivityTime: Date.now(),
            };
            await this._saveState();

            // Start the export loop in the background
            this.exportLoopPromise = this._runExportLoop();

            return new Response(JSON.stringify({ status: this.exportState.status, message: 'Export initiated.' }), { status: 202 });
        } catch (error: any) {
            console.error(`DO ${exportId}: Error starting export:`, error);
            if (this.exportState) {
                this.exportState.status = 'FAILED';
                this.exportState.errorMessage = error.message;
                await this._saveState();
            }
            return new Response(JSON.stringify({ error: error.message || 'Failed to initiate export' }), { status: 500 });
        }
    }

    private async _handleGetStatus(): Promise<Response> {
        if (!this.exportState) {
            return new Response(JSON.stringify({ error: 'Export not found' }), { status: 404 });
        }
        return new Response(JSON.stringify({
            exportId: this.exportState.exportId,
            dbName: this.exportState.dbName,
            format: this.exportState.format,
            status: this.exportState.status,
            progressBytes: this.exportState.currentByteOffset,
            totalParts: this.exportState.currentPartNumber,
            errorMessage: this.exportState.errorMessage,
            lastActivityTime: this.exportState.lastActivityTime,
        }), { status: 200 });
    }

    private async _handleGetDownloadUrl(): Promise<Response> {
        if (!this.exportState) {
            return new Response(JSON.stringify({ error: 'Export not found' }), { status: 404 });
        }
        if (this.exportState.status !== 'COMPLETED') {
            return new Response(JSON.stringify({ status: this.exportState.status, message: 'Export not yet completed.' }), { status: 409 });
        }
        if (!this.exportState.downloadUrl) {
            // Should not happen if status is COMPLETED, but generate if missing
            await this._generateSignedUrl();
            await this._saveState();
        }
        return new Response(JSON.stringify({ status: this.exportState.status, downloadUrl: this.exportState.downloadUrl }), { status: 200 });
    }

    private async _handleResumeExport(): Promise<Response> {
        if (!this.exportState) {
            return new Response(JSON.stringify({ error: 'Export not found' }), { status: 404 });
        }
        if (this.exportState.status === 'COMPLETED') {
            return new Response(JSON.stringify({ status: 'COMPLETED', message: 'Export already completed.' }), { status: 200 });
        }
        if (this.exportState.status === 'IN_PROGRESS') {
            return new Response(JSON.stringify({ status: 'IN_PROGRESS', message: 'Export already in progress.' }), { status: 200 });
        }

        console.log(`DO ${this.exportState.exportId}: Explicitly resuming export.`);
        this.exportState.status = 'IN_PROGRESS';
        await this._saveState();
        this.exportLoopPromise = this._runExportLoop(); // Resume the loop
        return new Response(JSON.stringify({ status: this.exportState.status, message: 'Export resumed.' }), { status: 200 });
    }

    /**
     * CORE LOGIC: The main export loop that reads data, uploads chunks, and manages pauses.
     * This method is designed to be re-entrant and can be called multiple times to resume
     * the export from its last saved state.
     */
    private async _runExportLoop(): Promise<void> {
        if (!this.exportState) {
            console.error('DO: _runExportLoop called without exportState.');
            return;
        }

        // Prevent multiple concurrent loops for the same DO instance
        if (this.exportLoopPromise && this.exportState.status === 'IN_PROGRESS') {
            console.log(`DO ${this.exportState.exportId}: Export loop already running.`);
            return;
        }

        // Set status to IN_PROGRESS if it's PENDING or PAUSED
        if (this.exportState.status === 'PENDING' || this.exportState.status === 'PAUSED') {
            this.exportState.status = 'IN_PROGRESS';
            this.exportState.executionStartTime = Date.now();
            await this._saveState();
        } else if (this.exportState.status === 'COMPLETED' || this.exportState.status === 'FAILED' || this.exportState.status === 'ABORTED') {
            console.log(`DO ${this.exportState.exportId}: Export already ${this.exportState.status}. Not running loop.`);
            return;
        }

        console.log(`DO ${this.exportState.exportId}: Starting/Resuming export loop. Current part: ${this.exportState.currentPartNumber}`);

        try {
            // Step 1: Initialize Multipart Upload if not already started
            if (!this.exportState.multipartUploadId) {
                console.log(`DO ${this.exportState.exportId}: Initiating R2 multipart upload for key: ${this.exportState.r2Key}`);
                const multipartUpload = await this.r2Bucket.createMultipartUpload(this.exportState.r2Key);
                this.exportState.multipartUploadId = multipartUpload.uploadId;
                await this._saveState();
            }

            // Step 2: Main loop for reading and uploading chunks
            const dbReader = this._simulateDatabaseRead(this.exportState.currentByteOffset);
            let chunk: string | null;

            while (this.exportState.status === 'IN_PROGRESS') {
                // Check for execution burst limit and yield if necessary
                if (this.exportState.executionStartTime && (Date.now() - this.exportState.executionStartTime > EXPORT_EXECUTION_BURST_MS)) {
                    console.log(`DO ${this.exportState.exportId}: Execution burst limit reached. Yielding control.`);
                    await this._yieldControl();
                    // After yielding, the loop will either be resumed by a new fetch or by the timeout.
                    // If status is still IN_PROGRESS, it means we resumed. Reset execution start time.
                    if (this.exportState.status === 'IN_PROGRESS') {
                        this.exportState.executionStartTime = Date.now();
                    } else {
                        // If status changed (e.g., to PAUSED by another request), break the loop
                        break;
                    }
                }

                // Read next chunk from simulated database
                const { value, done } = dbReader.next(DATABASE_CHUNK_SIZE);
                chunk = value;

                if (done) {
                    console.log(`DO ${this.exportState.exportId}: No more data to read. Finishing export.`);
                    break; // All data read
                }

                if (chunk) {
                    this.exportState.currentPartNumber++;
                    console.log(`DO ${this.exportState.exportId}: Uploading part ${this.exportState.currentPartNumber} (${chunk.length} bytes)`);

                    const part = await this.r2Bucket.uploadPart(
                        this.exportState.r2Key,
                        this.exportState.multipartUploadId!,
                        this.exportState.currentPartNumber,
                        new TextEncoder().encode(chunk)
                    );

                    this.exportState.uploadedParts.push({ ETag: part.etag, PartNumber: