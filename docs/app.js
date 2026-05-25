/**
 * Penta-V Vanguard UI Controller Substrate
 * Handles massive content stream mapping, dynamic polling, and state hydration.
 * Updated for direct, automated background workflow dispatch execution.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Check local sync status on interface initialization
    hydrateInterfaceState();
});

/**
 * Initiates the automated code hunting pipeline via GitHub Action stream mapping.
 */
async function triggerVanguardWorkflow() {
    const payloadInput = document.getElementById('issuePayload');
    const statusLabel = document.getElementById('systemStatus');
    const pulseIndicator = document.getElementById('systemPulse');
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const payload = payloadInput.value.trim();

    if (!payload) {
        alert("Sovereign Check Failed: Target issue payload context cannot be empty.");
        return;
    }

    // الإعدادات البنيوية الخاصة بمستودعك لربط الـ API
    const owner = "narukihto"; 
    const repo = "penta-vanguard";
    const workflowId = "bounty-hunter-runtime.yml";

    // Adapt UI layer into processing/stress states
    statusLabel.innerText = "System: Processing Payload...";
    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-amber-400 system-pulse-active";
    if(pulseIndicator) pulseIndicator.className = "w-3 h-3 rounded-full bg-amber-400 system-pulse-active animate-pulse";
    
    outputCodeContainer.innerText = "// Ingesting massive bounty registry stream...\n// Forwarding intelligence frame to private execution workspace via API...\n// Triggering private GitHub Runner via VANGUARD_GITHUB_TOKEN...";

    try {
        // استدعاء مباشر لـ GitHub API من المتصفح لتشغيل الـ Action صامتاً دون مغادرة الموقع
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
            method: "POST",
            headers: {
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ref: "main",
                inputs: {
                    issue_content: payload
                }
            })
        });

        if (response.ok || response.status === 204) {
            outputCodeContainer.innerText = "// ✅ Payload accepted and route verified!\n// Background pipeline initialized successfully.\n// Monitoring tracker state for purified logic results (Polling live)...";
            
            // Initiate active background validation engine tracking
            startPollingResolution();
        } else {
            const errData = await response.text();
            throw new Error(`GitHub Routing Layer Rejected: ${response.status} - ${errData}`);
        }

    } catch (error) {
        statusLabel.innerText = "System: Frame Error";
        statusLabel.className = "text-xs font-mono uppercase tracking-wider text-rose-500 font-bold";
        if(pulseIndicator) pulseIndicator.className = "w-3 h-3 rounded-full bg-rose-500";
        outputCodeContainer.innerText = `// Structural error intercepted during transmission: ${error.message}\n// Falling back to active tracking layer sync loop...`;
        
        // المحاولة التلقائية للاستماع للـ Tracker في كل الأحوال
        startPollingResolution();
    }
}

/**
 * Continuously monitors the repository flat-file data tracker to pull non-hallucinated outcomes.
 */
function startPollingResolution() {
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const statusLabel = document.getElementById('systemStatus');
    const pulseIndicator = document.getElementById('systemPulse');
    const entropyIndicator = document.getElementById('entropyValue');
    
    // Check consistency intervals dynamically to reduce cloud execution footprints
    const trackingInterval = setInterval(async () => {
        try {
            // Cache busting using 2026 epoch millisecond hashes to guarantee fresh data streams
            const queryUrl = `../agent_subsystem/tracker.json?epoch=${Date.now()}`;
            const streamResult = await fetch(queryUrl);
            
            if (streamResult.ok) {
                const telemetryData = await streamResult.json();
                
                if (telemetryData.status === "ready") {
                    outputCodeContainer.innerText = telemetryData.last_perfect_solution;
                    statusLabel.innerText = "System: Core Immune";
                    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold";
                    if(pulseIndicator) pulseIndicator.className = "w-3 h-3 rounded-full bg-emerald-500";
                    entropyIndicator.innerText = "0.00 (Absolute Unitary Sovereignty v0.4.3)";
                    entropyIndicator.className = "text-emerald-400 transition-colors";
                    clearInterval(trackingInterval);
                } else if (telemetryData.status === "failed") {
                    outputCodeContainer.innerText = telemetryData.last_perfect_solution;
                    statusLabel.innerText = "System: Lockdown Active";
                    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-rose-500 font-bold";
                    if(pulseIndicator) pulseIndicator.className = "w-3 h-3 rounded-full bg-rose-500";
                    entropyIndicator.innerText = "High Divergence (Logic Poisoning Suppressed)";
                    entropyIndicator.className = "text-rose-500 transition-colors";
                    clearInterval(trackingInterval);
                }
            }
        } catch (fetchError) {
            // Fail silently, retry on next scheduled engine tick to maintain seamless layout runtime
        }
    }, 6000); // Poll every 6 seconds for clean runtime state propagation
}

/**
 * Syncs the frontend viewbox layer on initial mount with current file telemetry state.
 */
async function hydrateInterfaceState() {
    try {
        const check = await fetch(`../agent_subsystem/tracker.json?epoch=${Date.now()}`);
        if (check.ok) {
            const data = await check.json();
            if (data.status === "ready") {
                document.getElementById('certifiedOutput').innerText = data.last_perfect_solution;
            }
        }
    } catch (e) {
        // Core layer remains pristine if structural state file is uninitialized
    }
}

/**
 * Utilities component to securely parse structural code text content into system clipboards.
 */
function copyCertifiedCode() {
    const targetPayload = document.getElementById('certifiedOutput').innerText;
    navigator.clipboard.writeText(targetPayload).then(() => {
        const copyButton = document.getElementById('copyBtn');
        const originalText = copyButton.innerText;
        copyButton.innerText = "✓ Copied Clean";
        copyButton.className = "text-xs bg-emerald-900/40 text-emerald-400 font-medium py-1.5 px-3 rounded border border-emerald-700 transition-colors duration-150";
        
        setTimeout(() => {
            copyButton.innerText = originalText;
            copyButton.className = "text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1.5 px-3 rounded border border-slate-700 transition-colors duration-150";
        }, 2000);
    });
}
