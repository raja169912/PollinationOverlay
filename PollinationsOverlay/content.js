let holdTimer = null;
let isHolding = false;
let overlayHost = null;

// --- NEW STATE VARIABLES ---
let lastRightClickTime = 0; // For Panic Button
let hasTriggeredHold = false; // To check if we held long enough
let abortFlag = false; // To stop the solver if we panic

// --- MOUSE CONTROLS (Middle Hold + Panic + Toggle) ---
window.addEventListener("mousedown", (e) => {
  
  // 1. MIDDLE CLICK (Button 1)
  if (e.button === 1) { 
    e.preventDefault();
    isHolding = true;
    hasTriggeredHold = false;
    abortFlag = false;

    // CHANGED: 2000 -> 5000 (5 Seconds)
    holdTimer = setTimeout(() => {
      if (isHolding) {
        hasTriggeredHold = true;
        triggerSolver();
      }
    }, 5000); 
  }

  // 2. RIGHT CLICK (Button 2) -> PANIC BUTTON
  if (e.button === 2) {
    const now = Date.now();
    // Check if clicked twice within 500ms
    if (now - lastRightClickTime < 500) {
        abortFlag = true; // Stop any running process
        removeOverlay();  // Kill the box instantly
    }
    lastRightClickTime = now;
  }
}, true);

window.addEventListener("mouseup", (e) => {
  if (e.button === 1) {
    isHolding = false;
    if (holdTimer) clearTimeout(holdTimer);

    // NEW: If we didn't hold for 5s, it's a "Short Click" -> Toggle Visibility
    if (!hasTriggeredHold) {
        toggleVisibility();
    }
  }
}, true);

// --- TOGGLE FUNCTION (Hide/Show without deleting) ---
function toggleVisibility() {
    if (overlayHost) {
        // Toggle display between 'block' and 'none'
        overlayHost.style.display = (overlayHost.style.display === 'none') ? 'block' : 'none';
    }
}

function triggerSolver() {
  if (abortFlag) return;
  
  // Fake "Loading" toast
  showNotification("Syncing...", "#666"); 
  
  // EXACT SAME LOGIC: Sends screenshot to Pollinations AI
  chrome.runtime.sendMessage({ action: "SOLVE_SCREENSHOT" });
}

chrome.runtime.onMessage.addListener((request) => {
  if (abortFlag) return; // Don't show if we panicked

  if (request.action === "SHOW_RESULT") {
    // NEW: Clean the text before showing it
    const cleanText = formatText(request.text);
    createStealthOverlay(cleanText);

  } else if (request.action === "SHOW_ERROR") {
    showNotification("Connection Timeout", "#ff4444"); 
  } else if (request.action === "UPDATE_STATUS") {
    showNotification("Syncing data...", "#666");
  }
});

// --- NEW: TEXT FORMATTER (Fixes ^2, _2, /ttext artifacts) ---
function formatText(rawText) {
    if (!rawText) return "";
    let clean = rawText;

    // Remove AI garbage
    clean = clean.replace(/\/ttext\d+/gi, ""); 
    clean = clean.replace(/\\text\{([^}]+)\}/gi, "$1");

    // Fix Powers (x^2 -> x²)
    clean = clean.replace(/\^(\{([^}]+)\}|(\d+))/g, (m, g1, g2) => `<sup>${g2||g1}</sup>`);

    // Fix Subscripts (H_2 -> H₂)
    clean = clean.replace(/_(\{([^}]+)\}|(\d+)|([a-z]))/g, (m, g1, g2, g3) => `<sub>${g2||g3||g1}</sub>`);

    // Fix Symbols & Lines
    clean = clean.replace(/\\pi/g, "&pi;"); 
    clean = clean.replace(/\n/g, "<br>");
    clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    return clean;
}

// --- STEALTH UI (Your Exact White Console Design) ---
function createStealthOverlay(text) {
  removeOverlay();
  overlayHost = document.createElement("div");
  overlayHost.id = "sys-" + Math.random().toString(36).substr(2, 9); 
  Object.assign(overlayHost.style, { all: "initial", position: "fixed", zIndex: 2147483647, top: "0", left: "0" });
  document.body.appendChild(overlayHost);

  const shadow = overlayHost.attachShadow({ mode: "closed" });
  const box = document.createElement("div");
  
  // Your original innerHTML structure
  box.innerHTML = `
    <div style="font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #888; border-bottom: 1px solid #ddd; margin-bottom: 5px;">
      Console Output (Debug Mode) <span style="float:right; cursor:pointer;" id="close-x">&times;</span>
    </div>
    <div style="white-space: pre-wrap; color: #333; font-family: monospace; font-size: 12px; line-height: 1.4;">${text}</div>
  `;
  
  Object.assign(box.style, {
    position: "fixed", 
    bottom: "10px", 
    right: "10px", 
    width: "300px", 
    maxHeight: "200px",
    overflowY: "auto", 
    backgroundColor: "rgba(255, 255, 255, 0.95)", 
    color: "#333",
    padding: "10px", 
    borderRadius: "4px", 
    border: "1px solid #ccc", 
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    opacity: "0.9" 
  });

  shadow.appendChild(box);
  box.querySelector("#close-x").onclick = removeOverlay;
}

function showNotification(msg, color) {
  if (overlayHost) removeOverlay();
  const toast = document.createElement("div");
  toast.innerText = msg;
  Object.assign(toast.style, {
    position: "fixed", bottom: "10px", right: "10px", 
    backgroundColor: "#333", color: "white", padding: "5px 10px", 
    borderRadius: "3px", fontSize: "11px", fontFamily: "sans-serif", zIndex: 2147483647
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function removeOverlay() {
  if (overlayHost) { overlayHost.remove(); overlayHost = null; }
  const toasts = document.querySelectorAll('div[style*="z-index: 2147483647"]');
  toasts.forEach(t => t.remove());
}
