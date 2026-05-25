/**
 * Penta-V Vanguard UI Controller Substrate - V3.0 (Tri-Axis Sync)
 * Combined Runtime: Handles Payload Dispatching & Instant Telemetry Sync
 */

document.addEventListener("DOMContentLoaded", () => {
    hydrateInterfaceState();
});

const OWNER = "narukihto"; 
const REPO = "penta-vanguard";
const WORKFLOW_ID = "bounty-hunter-runtime.yml";

function getSovereignAuthToken() {
    let token = localStorage.getItem("VANGUARD_TOKEN");
    if (!token) {
        token = prompt("🔒 [Penta-V Guard] Authentication Required.\nPlease enter your GitHub PAT:");
        if (token) localStorage.setItem("VANGUARD_TOKEN", token.trim());
    }
    return token;
}

async function triggerVanguardWorkflow() {
    const payloadInput = document.getElementById('issuePayload');
    const statusLabel = document.getElementById('systemStatus');
    const pulseIndicator = document.getElementById('systemPulse');
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const outputTestContainer = document.getElementById('certifiedTests');
    const payload = payloadInput.value.trim();

    if (!payload) { alert("Sovereign Check Failed: Payload context cannot be empty."); return; }
    const authToken = getSovereignAuthToken();
    if (!authToken) return;

    statusLabel.innerText = "System: Processing Payload...";
    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-amber-400";
    outputCodeContainer.innerText = "// Initializing Vanguard Pipeline...";
    outputTestContainer.innerText = "// Awaiting synthesis...";

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
            outputCodeContainer.innerText = "// ✅ Payload accepted. Vanguard Engine Active.";
            startPollingResolution(); 
        } else {
            throw new Error(`Routing Layer Rejected: ${response.status}`);
        }
    } catch (error) {
        statusLabel.innerText = "System: Frame Error";
        outputCodeContainer.innerText = `// Error: ${error.message}`;
    }
}

function startPollingResolution() {
    const statusLabel = document.getElementById('systemStatus');
    const pulseIndicator = document.getElementById('systemPulse');
    
    const trackingInterval = setInterval(async () => {
        try {
            const response = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/agent_subsystem/tracker.json?t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === "ready") {
                    // جلب الملفات الذرية الثلاثية
                    const [codeRes, testRes] = await Promise.all([
                        fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/circuit_impl.tsx?t=${Date.now()}`),
                        fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/circuit_impl.test.ts?t=${Date.now()}`)
                    ]);

                    if (codeRes.ok) document.getElementById('certifiedOutput').innerText = await codeRes.text();
                    if (testRes.ok) document.getElementById('certifiedTests').innerText = await testRes.text();
                    
                    statusLabel.innerText = "System: Core Immune";
                    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold";
                    clearInterval(trackingInterval);
                }
            }
        } catch (e) { console.log("System: Syncing pending..."); }
    }, 60000); 
}

async function hydrateInterfaceState() {
    try {
        const response = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/agent_subsystem/tracker.json?t=${Date.now()}`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === "ready") {
                const [codeRes, testRes] = await Promise.all([
                    fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/circuit_impl.tsx?t=${Date.now()}`),
                    fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/circuit_impl.test.ts?t=${Date.now()}`)
                ]);
                if (codeRes.ok) document.getElementById('certifiedOutput').innerText = await codeRes.text();
                if (testRes.ok) document.getElementById('certifiedTests').innerText = await testRes.text();
            }
        }
    } catch (e) {}
}

function copyCertifiedCode(elementId) {
    const target = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(target);
    const btn = event.target;
    btn.innerText = "✓ Copied";
    setTimeout(() => btn.innerText = "📋 Copy", 2000);
}
