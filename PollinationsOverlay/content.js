// --- CONFIGURATION ---
const TRIGGER_DELAY_MS = 5000; // 5 Seconds hold to start
const DOUBLE_CLICK_SPEED = 500; // Panic speed
let overlayHost = null; 

// --- STATE VARIABLES ---
let triggerTimer = null;
let abortFlag = false; 
let lastRightClickTime = 0;
let hasTriggeredHold = false;

// --- MOUSE LISTENERS ---
window.addEventListener("mousedown", (e) => {
    // 1. MIDDLE MOUSE BUTTON (Scroll Wheel)
    if (e.button === 1) {
        e.preventDefault(); 
        hasTriggeredHold = false;
        abortFlag = false;

        // Start the 5-second timer
        triggerTimer = setTimeout(() => {
            hasTriggeredHold = true;
            runSolver();
        }, TRIGGER_DELAY_MS);
    }

    // 2. RIGHT MOUSE BUTTON (Panic Cancel)
    if (e.button === 2) {
        const now = Date.now();
        if (now - lastRightClickTime < DOUBLE_CLICK_SPEED) {
            // Double Right-Click -> KILL EVERYTHING
            abortFlag = true;
            removeOverlay();
        }
        lastRightClickTime = now;
    }
}, true);

window.addEventListener("mouseup", (e) => {
    // Middle Mouse Release
    if (e.button === 1) {
        if (triggerTimer) clearTimeout(triggerTimer); 
        
        // If short click -> Toggle Visibility
        if (!hasTriggeredHold) {
            toggleVisibility();
        }
    }
}, true);

// --- TOGGLE VISIBILITY (Stealth) ---
function toggleVisibility() {
    if (overlayHost) {
        overlayHost.style.display = (overlayHost.style.display === 'none') ? 'block' : 'none';
    }
}

// --- COMMUNICATION WITH BACKGROUND SCRIPT ---
chrome.runtime.onMessage.addListener((request) => {
    if (abortFlag) return; // Ignore if panicked

    if (request.action === "SHOW_RESULT") {
        // AI finished! Format text and show overlay
        const cleanText = formatText(request.text);
        createStealthOverlay(cleanText);
    } 
    else if (request.action === "SHOW_ERROR") {
        showNotification("Connection Error", "#ff4444");
    } 
    else if (request.action === "UPDATE_STATUS") {
        showNotification(request.text, "#666");
    }
});

// --- MAIN SOLVER TRIGGER ---
function runSolver() {
    // Visual cue that it started
    showNotification("Syncing...", "#666");
    
    // Send command to Background.js to capture screen & solve
    chrome.runtime.sendMessage({ action: "SOLVE_SCREENSHOT" });
}

// --- MATH FORMATTER ---
function formatText(rawText) {
    if (!rawText) return "";
    let clean = rawText;

    // 1. Clean artifacts
    clean = clean.replace(/\/ttext\d+/gi, ""); 
    clean = clean.replace(/\\text\{([^}]+)\}/gi, "$1");

    // 2. Superscripts (x^2 -> x²)
    clean = clean.replace(/\^(\{([^}]+)\}|(\d+))/g, (m, g1, g2) => `<sup>${g2||g1}</sup>`);

    // 3. Subscripts (H_2 -> H₂)
    clean = clean.replace(/_(\{([^}]+)\}|(\d+)|([a-z]))/g, (m, g1, g2, g3) => `<sub>${g2||g3||g1}</sub>`);

    // 4. Symbols
    clean = clean.replace(/\\pi/g, "&pi;"); 
    clean = clean.replace(/\\theta/g, "&theta;");
    clean = clean.replace(/\\rightarrow/g, "&rarr;");
    
    // 5. Formatting
    clean = clean.replace(/\n/g, "<br>");
    clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    return clean;
}

// --- UI: WHITE CONSOLE OVERLAY ---
function createStealthOverlay(text) {
    removeOverlay(); 

    overlayHost = document.createElement("div");
    overlayHost.id = "sys-" + Math.random().toString(36).substr(2, 9);
    Object.assign(overlayHost.style, { all: "initial", position: "fixed", zIndex: 2147483647, top: "0", left: "0" });
    document.body.appendChild(overlayHost);

    const shadow = overlayHost.attachShadow({ mode: "closed" });
    const box = document.createElement("div");

    box.innerHTML = `
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #888; border-bottom: 1px solid #eee; margin-bottom: 5px; padding-bottom: 3px;">
        Console Output (Debug Mode) <span style="float:right; cursor:pointer; font-weight:bold;" id="close-x">&times;</span>
      </div>
      <div style="white-space: pre-wrap; color: #333; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; line-height: 1.4;">
        ${text}
      </div>
    `;
    
    Object.assign(box.style, {
      position: "fixed", 
      bottom: "20px", 
      right: "20px", 
      width: "320px", 
      maxHeight: "250px",
      overflowY: "auto", 
      backgroundColor: "rgba(255, 255, 255, 0.96)", 
      color: "#333",
      padding: "12px", 
      borderRadius: "4px", 
      border: "1px solid #ccc", 
      boxShadow: "0 2px 15px rgba(0,0,0,0.05)",
      fontSize: "12px"
    });

    shadow.appendChild(box);
    box.querySelector("#close-x").onclick = removeOverlay;
}

// --- UI: NOTIFICATION TOAST ---
function showNotification(msg, color) {
  if (overlayHost) removeOverlay();
  
  const toastHost = document.createElement("div");
  Object.assign(toastHost.style, { all: "initial", position: "fixed", zIndex: 2147483647, top: "0", left: "0" });
  document.body.appendChild(toastHost);
  const shadow = toastHost.attachShadow({ mode: "closed" });

  const toast = document.createElement("div");
  toast.innerText = msg;
  Object.assign(toast.style, {
    position: "fixed", bottom: "20px", right: "20px", 
    backgroundColor: "#333", color: "#fff", padding: "6px 12px", 
    borderRadius: "4px", fontSize: "11px", fontFamily: "sans-serif",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
  });
  
  shadow.appendChild(toast);
  setTimeout(() => toastHost.remove(), 2500);
}

function removeOverlay() {
    if (overlayHost) { overlayHost.remove(); overlayHost = null; }
}
