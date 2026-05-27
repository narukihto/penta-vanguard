interface R2Bucket {
    createMultipartUpload(key: string): Promise<{ uploadId: string }>;
    uploadPart(key: string, uploadId: string, partNumber: number, data: ArrayBuffer): Promise<void>;
    completeMultipartUpload(key: string, uploadId: string, parts: { partNumber: number }[]): Promise<void>;
    getSignedUrl(method: 'GET', key: string, options: { expiration: number }): Promise<string>;
}

interface Env {
    R2_BUCKET: R2Bucket;
}

type ExportStatus = 'idle' | 'in_progress' | 'paused' | 'completed' | 'failed';
type ExportFormat = 'sql' | 'csv' | 'json';

class DatabaseExporter {
    state: DurableObjectState;
    env: Env;

    status: ExportStatus = 'idle';
    r2Key?: string;
    r2UploadId?: string;
    nextPartNumber: number = 1;
    lastProcessedRowId: number = 0;
    totalBytesWritten: number = 0;
    downloadUrl?: string;
    parts: { partNumber: number }[] = [];
    format?: ExportFormat;
    private exportPromise: Promise<void> | null = null;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;