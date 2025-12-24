let holdTimer = null;
let isHolding = false;
let overlayHost = null;
let toastHost = null;

// --- MOUSE CONTROLS ---
window.addEventListener("mousedown", (e) => {
  if (e.button === 1) { // Middle Click
    isHolding = true;
    holdTimer = setTimeout(() => {
      if (isHolding) triggerSolver();
    }, 3000); // 3 second hold
  }
}, true);

window.addEventListener("mouseup", (e) => {
  if (e.button === 1) {
    isHolding = false;
    if (holdTimer) clearTimeout(holdTimer);
  }
}, true);

window.addEventListener("dblclick", (e) => {
  if (e.button === 1) removeOverlay();
}, true);

// --- FUNCTIONS ---
function triggerSolver() {
  showNotification("Capturing...", "#ffa500");
  chrome.runtime.sendMessage({ action: "SOLVE_SCREENSHOT" });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "SHOW_RESULT") {
    createStealthOverlay(request.text);
  } else if (request.action === "SHOW_ERROR") {
    showNotification(request.text, "#ff4444");
  } else if (request.action === "UPDATE_STATUS") {
    showNotification(request.text, "#ffa500"); // Update the orange toast
  }
});

// --- STEALTH UI ---
function createStealthOverlay(text) {
  removeOverlay();
  overlayHost = document.createElement("div");
  overlayHost.id = "res-" + Math.random().toString(36).substr(2, 9);
  Object.assign(overlayHost.style, { all: "initial", position: "fixed", zIndex: 2147483647, top: "0", left: "0" });
  document.body.appendChild(overlayHost);

  const shadow = overlayHost.attachShadow({ mode: "closed" });
  const box = document.createElement("div");
  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #555; padding-bottom:5px;">
      <span style="color:#00ff00; font-weight:bold;">SOLVER RESULT</span>
      <span id="close-x" style="cursor:pointer; color:red; font-weight:bold;">&times;</span>
    </div>
    <div style="white-space: pre-wrap; color: #ddd; font-family: monospace; font-size: 13px;">${text}</div>
  `;
  Object.assign(box.style, {
    position: "fixed", bottom: "30px", right: "30px", width: "350px", maxHeight: "80vh",
    overflowY: "auto", backgroundColor: "rgba(20, 20, 20, 0.98)", color: "white",
    padding: "15px", borderRadius: "8px", border: "1px solid #444", boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
  });
  shadow.appendChild(box);
  box.querySelector("#close-x").onclick = removeOverlay;
}

function showNotification(msg, color) {
  if (toastHost) toastHost.remove();
  toastHost = document.createElement("div");
  document.body.appendChild(toastHost);
  const shadow = toastHost.attachShadow({ mode: "closed" });
  const toast = document.createElement("div");
  toast.innerText = msg;
  Object.assign(toast.style, {
    position: "fixed", top: "20px", right: "20px", backgroundColor: color, color: "white",
    padding: "8px 16px", borderRadius: "4px", fontFamily: "sans-serif", zIndex: 2147483647, fontWeight: "bold"
  });
  shadow.appendChild(toast);
  if (color === "#ff4444") setTimeout(() => toastHost.remove(), 4000);
}

function removeOverlay() {
  if (overlayHost) { overlayHost.remove(); overlayHost = null; }
  if (toastHost) { toastHost.remove(); toastHost = null; }
}