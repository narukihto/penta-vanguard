/**
 * Penta-V Vanguard UI Controller Substrate
 * Combined Runtime: Handles Payload Dispatching & Instant Telemetry Sync
 */

document.addEventListener("DOMContentLoaded", () => {
    hydrateInterfaceState();
});

// الإعدادات البنيوية الثابتة
const OWNER = "narukihto"; 
const REPO = "penta-vanguard";
const WORKFLOW_ID = "bounty-hunter-runtime.yml";

/**
 * توثيق السيادة (Sovereignty Auth)
 */
function getSovereignAuthToken() {
    let token = localStorage.getItem("VANGUARD_TOKEN");
    if (!token) {
        token = prompt("🔒 [Penta-V Guard] Authentication Required.\nPlease enter your GitHub PAT:");
        if (token) localStorage.setItem("VANGUARD_TOKEN", token.trim());
    }
    return token;
}

/**
 * إرسال البيانات ومراقبة النتائج
 */
async function triggerVanguardWorkflow() {
    const payloadInput = document.getElementById('issuePayload');
    const statusLabel = document.getElementById('systemStatus');
    const pulseIndicator = document.getElementById('systemPulse');
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const payload = payloadInput.value.trim();

    if (!payload) {
        alert("Sovereign Check Failed: Payload context cannot be empty.");
        return;
    }

    const authToken = getSovereignAuthToken();
    if (!authToken) return;

    // حالة الإرسال
    statusLabel.innerText = "System: Processing Payload...";
    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-amber-400 system-pulse-active";
    if(pulseIndicator) pulseIndicator.className = "w-3 h-3 rounded-full bg-amber-400 animate-pulse";
    outputCodeContainer.innerText = "// Initializing Vanguard Pipeline...";

    try {
        const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`, {
            method: "POST",
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ ref: "main", inputs: { issue_content: payload } })
        });

        if (response.ok || response.status === 204) {
            outputCodeContainer.innerText = "// ✅ Payload accepted. Vanguard Engine Active.\n// Monitoring stream for telemetry...";
            startPollingResolution(); 
        } else {
            throw new Error(`Routing Layer Rejected: ${response.status}`);
        }
    } catch (error) {
        statusLabel.innerText = "System: Frame Error";
        statusLabel.className = "text-xs font-mono uppercase tracking-wider text-rose-500 font-bold";
        outputCodeContainer.innerText = `// Error: ${error.message}`;
    }
}

/**
 * الاستماع الفوري للنتائج (Polling)
 */
function startPollingResolution() {
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const statusLabel = document.getElementById('systemStatus');
    const pulseIndicator = document.getElementById('systemPulse');
    const entropyIndicator = document.getElementById('entropyValue');
    
    const trackingInterval = setInterval(async () => {
        try {
            // استخدام رابط raw المباشر لتجاوز أي كاش أو تعقيدات API
            const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/agent_subsystem/tracker.json?t=${Date.now()}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const text = await response.text();
                const data = JSON.parse(text.trim());
                
                if (data.status === "ready") {
                    outputCodeContainer.innerText = data.last_perfect_solution;
                    statusLabel.innerText = "System: Core Immune";
                    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold";
                    if(pulseIndicator) pulseIndicator.className = "w-3 h-3 rounded-full bg-emerald-500";
                    if(entropyIndicator) entropyIndicator.innerText = "0.00 (Absolute Unitary Sovereignty)";
                    clearInterval(trackingInterval);
                }
            }
        } catch (e) {
            console.log("Polling for updates...");
        }
    }, 2000);
}

/**
 * تحميل الحالة عند فتح الصفحة
 */
async function hydrateInterfaceState() {
    const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/agent_subsystem/tracker.json?t=${Date.now()}`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.status === "ready") {
                document.getElementById('certifiedOutput').innerText = data.last_perfect_solution;
            }
        }
    } catch (e) {}
}

/**
 * النسخ للحافظة
 */
function copyCertifiedCode() {
    const targetPayload = document.getElementById('certifiedOutput').innerText;
    navigator.clipboard.writeText(targetPayload);
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.innerText = "✓ Copied";
    setTimeout(() => copyBtn.innerText = "📋 Copy Code", 2000);
}
