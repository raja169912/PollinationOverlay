// --- CONFIGURATION ---
const TRIGGER_DELAY_MS = 5000; // 5 Seconds hold to start
const DOUBLE_CLICK_SPEED = 500; // Time allowed between right clicks for Panic
let overlayHost = null; // Store the shadow root host

// --- STATE VARIABLES ---
let triggerTimer = null;
let isProcessing = false;
let abortFlag = false; // The Panic switch
let lastRightClickTime = 0;
let hasTriggeredHold = false;

// --- LISTENERS ---
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
            // Double Right-Click Detected -> KILL EVERYTHING
            abortFlag = true;
            removeOverlay(); // Instantly destroy the box
        }
        lastRightClickTime = now;
    }
}, true); // Use capturing phase (true) to catch events early

window.addEventListener("mouseup", (e) => {
    // Middle Mouse Release
    if (e.button === 1) {
        if (triggerTimer) clearTimeout(triggerTimer); // Stop timer if released early
        
        // If we didn't hold for 5s, treat it as a "Toggle Visibility" click
        if (!hasTriggeredHold) {
            toggleVisibility();
        }
    }
}, true);

// --- VISIBILITY TOGGLE (Stealth Mode) ---
function toggleVisibility() {
    if (overlayHost) {
        // Toggle opacity instead of removing, so we don't lose the answer
        overlayHost.style.display = (overlayHost.style.display === 'none') ? 'block' : 'none';
    }
}

// --- MATH FORMATTER (Clean up the text) ---
function formatText(rawText) {
    if (!rawText) return "";
    let clean = rawText;

    // 1. Clean AI artifacts
    clean = clean.replace(/\/ttext\d+/gi, ""); 
    clean = clean.replace(/\\text\{([^}]+)\}/gi, "$1");

    // 2. Format Powers (x^2 -> x²)
    clean = clean.replace(/\^(\{([^}]+)\}|(\d+))/g, (m, g1, g2) => `<sup>${g2||g1}</sup>`);

    // 3. Format Subscripts (H_2 -> H₂)
    clean = clean.replace(/_(\{([^}]+)\}|(\d+)|([a-z]))/g, (m, g1, g2, g3) => `<sub>${g2||g3||g1}</sub>`);

    // 4. Symbols
    clean = clean.replace(/\\pi/g, "&pi;"); // Pi symbol
    clean = clean.replace(/\\theta/g, "&theta;");
    
    // 5. Newlines and Bold
    clean = clean.replace(/\n/g, "<br>");
    clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    return clean;
}

// --- MAIN SOLVER LOGIC ---
async function runSolver() {
    if (isProcessing) return;
    isProcessing = true;

    // 1. Show Fake System Notification
    showNotification("Syncing...", "#666");

    try {
        // --- SIMULATED DELAY (Replace this with actual AI fetch later) ---
        await new Promise(r => setTimeout(r, 2000)); 

        if (abortFlag) return; // Stop if panicked

        // --- MOCK ANSWER (For Testing) ---
        const rawAnswer = "Area = \\pi r^2 and Volume = 4/3 \\pi r^3. /ttext99 Ignore this. **Final:** H_2O is water.";
        const cleanAnswer = formatText(rawAnswer);

        if (abortFlag) return;

        // 2. Show the White Console Overlay
        createStealthOverlay(cleanAnswer);

    } catch (err) {
        showNotification("Connection Timeout", "#ff4444");
    } finally {
        isProcessing = false;
    }
}

// --- UI: THE "BORING WHITE CONSOLE" ---
function createStealthOverlay(text) {
    removeOverlay(); // Remove existing if any

    // Create a Shadow DOM host to protect styles from the website
    overlayHost = document.createElement("div");
    overlayHost.id = "sys-" + Math.random().toString(36).substr(2, 9);
    Object.assign(overlayHost.style, { all: "initial", position: "fixed", zIndex: 2147483647, top: "0", left: "0" });
    document.body.appendChild(overlayHost);

    const shadow = overlayHost.attachShadow({ mode: "closed" });
    const box = document.createElement("div");

    // YOUR PREVIOUS STYLE (White, Low Contrast, Console-like)
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
      backgroundColor: "rgba(255, 255, 255, 0.96)", // White background
      color: "#333",
      padding: "12px", 
      borderRadius: "4px", 
      border: "1px solid #ccc", 
      boxShadow: "0 2px 15px rgba(0,0,0,0.05)", // Very subtle shadow
      fontSize: "12px"
    });

    shadow.appendChild(box);
    
    // Close button logic
    box.querySelector("#close-x").onclick = removeOverlay;
}

// --- UI: FAKE NOTIFICATION TOAST ---
function showNotification(msg, color) {
  // Remove existing overlay so text doesn't overlap
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
  
  // Auto-remove toast after 2 seconds
  setTimeout(() => toastHost.remove(), 2000);
}

function removeOverlay() {
    if (overlayHost) { overlayHost.remove(); overlayHost = null; }
}
