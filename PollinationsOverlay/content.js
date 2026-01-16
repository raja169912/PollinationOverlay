let holdTimer = null;
let isHolding = false;
let overlayHost = null;

// --- PANIC KEY (Press 'Esc' to instantly destroy everything) ---
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") removeOverlay();
}, true);

// --- MOUSE CONTROLS ---
window.addEventListener("mousedown", (e) => {
  if (e.button === 1) { // Middle Click
    isHolding = true;
    holdTimer = setTimeout(() => {
      if (isHolding) triggerSolver();
    }, 2000); // Reduced to 2 seconds for speed
  }
}, true);

window.addEventListener("mouseup", (e) => {
  if (e.button === 1) {
    isHolding = false;
    if (holdTimer) clearTimeout(holdTimer);
  }
}, true);

function triggerSolver() {
  // Fake "Loading" toast that looks like a system sync message
  showNotification("Syncing...", "#666"); 
  chrome.runtime.sendMessage({ action: "SOLVE_SCREENSHOT" });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "SHOW_RESULT") {
    createStealthOverlay(request.text);
  } else if (request.action === "SHOW_ERROR") {
    showNotification("Connection Timeout", "#ff4444"); // Fake error name
  } else if (request.action === "UPDATE_STATUS") {
    showNotification("Syncing data...", "#666");
  }
});

// --- STEALTH UI (Looks like a boring Developer Console or System Note) ---
function createStealthOverlay(text) {
  removeOverlay();
  overlayHost = document.createElement("div");
  // Set random ID to avoid detection
  overlayHost.id = "sys-" + Math.random().toString(36).substr(2, 9); 
  Object.assign(overlayHost.style, { all: "initial", position: "fixed", zIndex: 2147483647, top: "0", left: "0" });
  document.body.appendChild(overlayHost);

  const shadow = overlayHost.attachShadow({ mode: "closed" });
  const box = document.createElement("div");
  
  // Design: Low contrast, looks like a generic browser warning or note
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
    backgroundColor: "rgba(255, 255, 255, 0.95)", // White background looks less "hacker-ish"
    color: "#333",
    padding: "10px", 
    borderRadius: "4px", 
    border: "1px solid #ccc", 
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    opacity: "0.9" // Slight transparency
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
  // Also remove any toasts
  const toasts = document.querySelectorAll('div[style*="z-index: 2147483647"]');
  toasts.forEach(t => t.remove());
}
