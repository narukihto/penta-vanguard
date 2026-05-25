/**
 * Penta-V Vanguard UI Controller Substrate
 * Handles massive content stream mapping, dynamic polling, and state hydration.
 * Optimized for instant API-level flat-file telemetry sync bypassing GitHub Pages CDN delay.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Check local sync status on interface initialization
    hydrateInterfaceState();
});

/**
 * Ensures a valid GitHub Personal Access Token exists in localStorage before transmission.
 */
function getSovereignAuthToken() {
    let token = localStorage.getItem("VANGUARD_TOKEN");
    if (!token) {
        token = prompt("🔒 [Penta-V Guard] Authentication Required.\nPlease enter your GitHub Personal Access Token (PAT) with Actions-Write and Code-Read access:");
        if (token) {
            localStorage.setItem("VANGUARD_TOKEN", token.trim());
        }
    }
    return token;
}

// الإعدادات البنيوية الثابتة للمستودع
const OWNER = "narukihto"; 
const REPO = "penta-vanguard";
const WORKFLOW_ID = "bounty-hunter-runtime.yml";

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

    const authToken = getSovereignAuthToken();
    if (!authToken) {
        alert("🔒 Sovereign Check Failed: Action aborted due to missing GitHub Authentication Token.");
        return;
    }

    // تحويل الواجهة إلى حالة المعالجة والنبض البرتقالي
    statusLabel.innerText = "System: Processing Payload...";
    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-amber-400 system-pulse-active";
    if(pulseIndicator) pulseIndicator.className = "w-3 h-3 rounded-full bg-amber-400 system-pulse-active animate-pulse";
    
    outputCodeContainer.innerText = "// Ingesting massive bounty registry stream...\n// Forwarding intelligence frame to private execution workspace via API...\n// Triggering private GitHub Runner via Secure Localized GITHUB_TOKEN...";

    try {
        const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`, {
            method: "POST",
            headers: {
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({
                ref: "main",
                inputs: {
                    issue_content: payload
                }
            })
        });

        if (response.ok || response.status === 204) {
            outputCodeContainer.innerText = "// ✅ Payload accepted and route verified!\n// Background pipeline initialized successfully.\n// Fetching fresh live metrics directly from GitHub Repository API (Bypassing CDN Cache)...";
            
            // إطلاق دالة الاستماع الذكي والفوري
            startPollingResolution();
        } else {
            const errData = await response.text();
            if (response.status === 401) {
                localStorage.removeItem("VANGUARD_TOKEN");
                throw new Error("Invalid or expired GitHub Token. Local token storage flushed. Please re-trigger to input a valid key.");
            }
            throw new Error(`GitHub Routing Layer Rejected: ${response.status} - ${errData}`);
        }

    } catch (error) {
        statusLabel.innerText = "System: Frame Error";
        statusLabel.className = "text-xs font-mono uppercase tracking-wider text-rose-500 font-bold";
        if(pulseIndicator) pulseIndicator.className = "w-3 h-3 rounded-full bg-rose-500";
        outputCodeContainer.innerText = `// Structural error intercepted during transmission: ${error.message}\n// Falling back to active tracking layer sync loop...`;
        
        startPollingResolution();
    }
}

/**
 * Continuously monitors the repo file via GitHub API to grab real-time outputs instantly.
 */
function startPollingResolution() {
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const statusLabel = document.getElementById('systemStatus');
    const pulseIndicator = document.getElementById('systemPulse');
    const entropyIndicator = document.getElementById('entropyValue');
    const authToken = localStorage.getItem("VANGUARD_TOKEN");
    
    const trackingInterval = setInterval(async () => {
        try {
            const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/agent_subsystem/tracker.json?ref=main&t=${Date.now()}`;
            
            const headers = { "Accept": "application/vnd.github.v3.raw" };
            if (authToken) {
                headers["Authorization"] = `Bearer ${authToken}`;
            }

            const streamResult = await fetch(apiUrl, { headers: headers });
            
            if (streamResult.ok) {
                // إصلاح جذري: قراءة الملف كنص أولاً ثم تحليله إلى كائن JSON لمنع انهيار اللوب دلالياً
                const rawText = await streamResult.text();
                const telemetryData = JSON.parse(rawText);
                
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
            // صيد الخطأ وطباعته في الـ Console للتشخيص إن لزم الأمر مع ضمان استمرارية المحاولة
            console.error("Vanguard Pipeline Engine Sync Tick Failed:", fetchError);
        }
    }, 4000); // تفقد مستمر كل 4 ثوانٍ
}

/**
 * Syncs the frontend viewbox layer on initial mount using direct repository endpoint.
 */
async function hydrateInterfaceState() {
    const authToken = localStorage.getItem("VANGUARD_TOKEN");
    try {
        const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/agent_subsystem/tracker.json?ref=main&t=${Date.now()}`;
        const headers = { "Accept": "application/vnd.github.v3.raw" };
        if (authToken) {
            headers["Authorization"] = `Bearer ${authToken}`;
        }

        const check = await fetch(apiUrl, { headers: headers });
        if (check.ok) {
            const rawText = await check.text();
            const data = JSON.parse(rawText);
            if (data.status === "ready") {
                document.getElementById('certifiedOutput').innerText = data.last_perfect_solution;
            }
        }
    } catch (e) {
        console.error("Hydration Layer Fault:", e);
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
