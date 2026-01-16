// --- CONFIGURATION ---
const TRIGGER_DELAY_MS = 5000; // 5 Seconds hold for Auto-Mode
let overlayHost = null;

// --- STATE ---
let triggerTimer = null;
let isHolding = false;
let abortFlag = false;

// --- MOUSE LISTENERS ---
window.addEventListener("mousedown", (e) => {
    
    // 1. TRIPLE LEFT CLICK (Manual Mode Trigger)
    if (e.button === 0 && e.detail === 3) {
        e.preventDefault(); 
        e.stopPropagation(); 
        openManualMode();
        return;
    }

    // 2. MIDDLE CLICK (Auto-Solve & Toggle)
    if (e.button === 1) {
        e.preventDefault();
        isHolding = true;
        abortFlag = false;

        // Start 5s Timer for Auto-Solve
        triggerTimer = setTimeout(() => {
            if (isHolding) {
                runTextSolver();
            }
        }, TRIGGER_DELAY_MS);
    }
    
    // 3. RIGHT CLICK (Panic - Close Everything)
    if (e.button === 2) {
        abortFlag = true;
        removeOverlay();
    }
}, true);

window.addEventListener("mouseup", (e) => {
    if (e.button === 1) {
        isHolding = false;
        if (triggerTimer) clearTimeout(triggerTimer);
        
        // Toggle visibility on short middle click
        if (overlayHost && !abortFlag) {
             overlayHost.style.display = (overlayHost.style.display === 'none') ? 'block' : 'none';
        }
    }
}, true);


// --- MAIN SOLVER (Auto Scrape) ---
function runTextSolver() {
    if (abortFlag) return;
    showNotification("Extracting...", "#666");

    let targetElement = document.querySelector('.tst-quection-block') || 
                        document.querySelector('.q-type') || 
                        document.body;

    let pageText = targetElement.innerText;

    chrome.runtime.sendMessage({ 
        action: "SOLVE_TEXT", 
        text: pageText 
    });
}

// --- MANUAL MODE (Type Question) ---
function openManualMode() {
    createStealthOverlay(); 
    
    const shadow = overlayHost.shadowRoot;
    const resultView = shadow.getElementById("result-view");
    const inputView = shadow.getElementById("input-view");
    const textArea = shadow.getElementById("manual-text");
    
    if (overlayHost.style.display === 'none') overlayHost.style.display = 'block';
    
    resultView.style.display = "none";
    inputView.style.display = "flex";
    textArea.focus();
}

// --- HANDLE RESPONSES ---
chrome.runtime.onMessage.addListener((request) => {
    if (abortFlag) return;

    if (request.action === "SHOW_RESULT") {
        createStealthOverlay(formatMath(request.text));
    } else if (request.action === "SHOW_ERROR") {
        showNotification(request.text, "#ff4444");
    } else if (request.action === "UPDATE_STATUS") {
        showNotification(request.text, "#666");
    }
});

// --- MATH FORMATTER (CLEANER) ---
function formatMath(raw) {
    if (!raw) return "";
    let clean = raw;

    // 1. Remove LaTeX Wrappers \( ... \) and \[ ... \]
    clean = clean.replace(/\\\(/g, "").replace(/\\\)/g, "");
    clean = clean.replace(/\\\[/g, "").replace(/\\\]/g, "");

    // 2. Fix Fractions: \frac{a}{b} -> a/b
    clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2");

    // 3. Fix Symbols
    clean = clean.replace(/\\times/g, "×");
    clean = clean.replace(/\\cdot/g, "·");
    clean = clean.replace(/\\approx/g, "≈");
    clean = clean.replace(/\\rightarrow/g, "→");
    clean = clean.replace(/\\pi/g, "π");
    clean = clean.replace(/\\theta/g, "θ");
    clean = clean.replace(/\\mu/g, "μ");

    // 4. Remove \text{...} wrappers
    clean = clean.replace(/\\text\{([^}]+)\}/g, "$1");

    // 5. Fix Powers: x^2 -> x²
    clean = clean.replace(/\^2/g, "²");
    clean = clean.replace(/\^3/g, "³");
    clean = clean.replace(/\^0/g, "⁰");

    // 6. Basic Formatting
    clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"); // Bold
    clean = clean.replace(/\n/g, "<br>"); // Newlines

    return clean;
}

// --- UI GENERATOR ---
function createStealthOverlay(text = "") {
    if (overlayHost) {
        // If box exists, just update text and ensure keyboard button is active
        if (text) {
             const resView = overlayHost.shadowRoot.getElementById("result-view");
             const inpView = overlayHost.shadowRoot.getElementById("input-view");
             if (resView && inpView) {
                 resView.innerHTML = text;
                 resView.style.display = "block";
                 inpView.style.display = "none";
                 if (overlayHost.style.display === 'none') overlayHost.style.display = 'block';
             }
        }
        return; 
    }

    // Create New Box
    overlayHost = document.createElement("div");
    Object.assign(overlayHost.style, { all: "initial", position: "fixed", zIndex: 2147483647, top: "0", left: "0" });
    document.body.appendChild(overlayHost);
    
    const shadow = overlayHost.attachShadow({ mode: "closed" });
    const box = document.createElement("div");
    
    // The "Keyboard" button is added here in the header
    box.innerHTML = `
      <div style="font-family:sans-serif;font-size:11px;color:#888;border-bottom:1px solid #ccc;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;">
        <span>Console Output</span>
        <div>
            <span id="manual-mode-btn" style="cursor:pointer;margin-right:12px;font-size:14px;color:#555;" title="Type Question">⌨</span>
            <span id="close" style="cursor:pointer;font-weight:bold;font-size:14px;">&times;</span>
        </div>
      </div>
      
      <div id="result-view" style="color:#333;font-family:monospace;font-size:12px;line-height:1.4;">${text || "Ready."}</div>

      <div id="input-view" style="display:none;flex-direction:column;height:100%;">
        <textarea id="manual-text" placeholder="Type question..." 
            style="width:95%;height:150px;border:1px solid #ccc;resize:none;font-family:monospace;font-size:11px;padding:5px;margin-bottom:8px;outline:none;"></textarea>
        <button id="solve-btn" style="background:#333;color:white;border:none;padding:6px;cursor:pointer;border-radius:3px;font-weight:bold;font-size:11px;">SOLVE</button>
      </div>
    `;

    Object.assign(box.style, {
        position: "fixed", bottom: "20px", right: "20px", width: "320px", 
        maxHeight: "350px", overflowY: "auto", background: "white", 
        padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
    });
    
    shadow.appendChild(box);

    // --- EVENTS ---
    
    // 1. Close Button
    shadow.getElementById("close").onclick = removeOverlay;
    
    // 2. Keyboard Button (Toggle Input View)
    shadow.getElementById("manual-mode-btn").onclick = () => {
        const resView = shadow.getElementById("result-view");
        const inpView = shadow.getElementById("input-view");
        const txtArea = shadow.getElementById("manual-text");

        if (inpView.style.display === "none") {
            // Show Input
            resView.style.display = "none";
            inpView.style.display = "flex";
            txtArea.focus();
        } else {
            // Show Result
            inpView.style.display = "none";
            resView.style.display = "block";
        }
    };

    // 3. Solve Button
    shadow.getElementById("solve-btn").onclick = () => {
        const txt = shadow.getElementById("manual-text").value;
        if (txt.length > 2) {
            shadow.getElementById("input-view").style.display = "none";
            shadow.getElementById("result-view").style.display = "block";
            shadow.getElementById("result-view").innerHTML = "<i>Thinking...</i>";
            chrome.runtime.sendMessage({ action: "SOLVE_TEXT", text: txt });
        }
    };
}

function showNotification(msg, color) {
    const div = document.createElement("div");
    div.innerText = msg;
    Object.assign(div.style, {
        position: "fixed", bottom: "20px", right: "20px", background: "#333", color: "white",
        padding: "5px 10px", borderRadius: "3px", fontSize: "11px", zIndex: 2147483647
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2000);
}

function removeOverlay() {
    if (overlayHost) { overlayHost.remove(); overlayHost = null; }
    document.querySelectorAll('div[style*="z-index: 2147483647"]').forEach(e => e.remove());
}