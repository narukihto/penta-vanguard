/**
 * Penta-V Vanguard: Combined Runtime Controller
 * Handles both Triggering (POST) and Monitoring (GET)
 */

async function triggerVanguardWorkflow() {
    const payloadInput = document.getElementById('issuePayload');
    const statusLabel = document.getElementById('systemStatus');
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const payload = payloadInput.value.trim();

    if (!payload) {
        alert("Payload cannot be empty.");
        return;
    }

    const authToken = getSovereignAuthToken();
    statusLabel.innerText = "System: Processing Payload...";
    outputCodeContainer.innerText = "// Initializing Vanguard Pipeline...";

    try {
        // 1. الإرسال (Triggering)
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
            outputCodeContainer.innerText = "// ✅ Payload accepted. Monitoring stream for results...";
            
            // 2. تفعيل الاستقبال (Polling) فوراً بعد نجاح الإرسال
            startPollingResolution(); 
        } else {
            throw new Error(`Pipeline Rejected: ${response.status}`);
        }
    } catch (error) {
        outputCodeContainer.innerText = `// Error: ${error.message}`;
    }
}

function startPollingResolution() {
    const outputCodeContainer = document.getElementById('certifiedOutput');
    const statusLabel = document.getElementById('systemStatus');
    
    // مراقبة الملف الخام (الذي يتم تحديثه بواسطة الوركفلو)
    const trackingInterval = setInterval(async () => {
        try {
            const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/agent_subsystem/tracker.json?t=${Date.now()}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const text = await response.text();
                const data = JSON.parse(text.trim());
                
                if (data.status === "ready") {
                    outputCodeContainer.innerText = data.last_perfect_solution;
                    statusLabel.innerText = "System: Core Immune";
                    statusLabel.className = "text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold";
                    clearInterval(trackingInterval); // إيقاف المراقبة بعد النجاح
                }
            }
        } catch (e) {
            console.log("Polling for updates...");
        }
    }, 2000);
}
