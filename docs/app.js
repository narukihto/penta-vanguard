/**
 * Penta-V Vanguard UI Controller: High-Robustness Sync Edition
 */

document.addEventListener("DOMContentLoaded", () => {
    hydrateInterfaceState();
});

function getSovereignAuthToken() {
    let token = localStorage.getItem("VANGUARD_TOKEN");
    if (!token) {
        token = prompt("🔒 [Penta-V Guard] Authentication Required:");
        if (token) localStorage.setItem("VANGUARD_TOKEN", token.trim());
    }
    return token;
}

const OWNER = "narukihto"; 
const REPO = "penta-vanguard";
const WORKFLOW_ID = "bounty-hunter-runtime.yml";

async function triggerVanguardWorkflow() {
    const payloadInput = document.getElementById('issuePayload');
    const statusLabel = document.getElementById('systemStatus');
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const payload = payloadInput.value.trim();

    if (!payload) return;

    const authToken = getSovereignAuthToken();
    statusLabel.innerText = "System: Processing Payload...";
    outputCodeContainer.innerText = "// Pipeline Engaged... Monitoring for Registry Sync...";

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
            startPollingResolution();
        }
    } catch (error) {
        console.error("Transmission Error:", error);
    }
}

function startPollingResolution() {
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const statusLabel = document.getElementById('systemStatus');
    const authToken = localStorage.getItem("VANGUARD_TOKEN");
    
    // استخدام عداد لضمان عدم توقف النظام
    const trackingInterval = setInterval(async () => {
        try {
            // استخدام رابط الـ raw المباشر لتجنب تعقيدات الـ API
            const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/agent_subsystem/tracker.json?t=${Date.now()}`;
            
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                // تنظيف البيانات قبل التحليل
                const data = JSON.parse(text.trim());
                
                if (data.status === "ready") {
                    outputCodeContainer.innerText = data.last_perfect_solution;
                    statusLabel.innerText = "System: Core Immune";
                    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold";
                    clearInterval(trackingInterval);
                }
            }
        } catch (e) {
            console.log("Syncing...");
        }
    }, 2000);
}

async function hydrateInterfaceState() {
    // محاولة استعادة الحالة عند تحميل الصفحة
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
