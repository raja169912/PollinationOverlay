// --- CONFIGURATION ---
const TRIGGER_DELAY_MS = 5000; // 5 Seconds hold to start
const DOUBLE_CLICK_SPEED = 500; // Panic Double-Click speed

// --- STATE VARIABLES ---
let triggerTimer = null;
let isProcessing = false;
let abortFlag = false; 
let lastRightClickTime = 0;
let hasTriggeredHold = false; 

// --- LISTENER FOR CLICKS ---
document.addEventListener('mousedown', (e) => {
    // 1. MIDDLE MOUSE BUTTON (Scroll Wheel)
    if (e.button === 1) {
        e.preventDefault(); 
        
        hasTriggeredHold = false;
        abortFlag = false; 

        // Start 5-second timer
        triggerTimer = setTimeout(() => {
            hasTriggeredHold = true; 
            runSolver();
        }, TRIGGER_DELAY_MS);
    }

    // 2. RIGHT MOUSE BUTTON (Panic Cancel)
    if (e.button === 2) {
        const now = Date.now();
        if (now - lastRightClickTime < DOUBLE_CLICK_SPEED) {
            console.log("!!! EMERGENCY ABORT !!!");
            abortFlag = true; 
            
            // Hide everything immediately
            const existingPanel = document.getElementById('pollination-panel');
            if (existingPanel) existingPanel.style.display = 'none';
        }
        lastRightClickTime = now;
    }
});

document.addEventListener('mouseup', (e) => {
    // Middle Mouse Release
    if (e.button === 1) {
        clearTimeout(triggerTimer); 
        
        // Short Click = Toggle Visibility (Hide/Show)
        if (!hasTriggeredHold) {
            toggleVisibility();
        }
    }
});

function toggleVisibility() {
    const panel = document.getElementById('pollination-panel');
    if (panel) {
        panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
    }
}

// --- MATH FORMATTER (The New Feature) ---
function formatText(rawText) {
    if (!rawText) return "";

    let clean = rawText;

    // 1. Remove weird AI artifacts (like /ttext123 or \text{...})
    clean = clean.replace(/\/ttext\d+/gi, ""); 
    clean = clean.replace(/\\text\{([^}]+)\}/gi, "$1");

    // 2. Format Superscripts (Power of: x^2 -> x<sup>2</sup>)
    // Matches ^2, ^5, ^{12}
    clean = clean.replace(/\^(\{([^}]+)\}|(\d+))/g, (match, group1, group2) => {
        return `<sup>${group2 || group1}</sup>`;
    });

    // 3. Format Subscripts (Base of: H_2 -> H<sub>2</sub>)
    // Matches _2, _i, _{n}
    clean = clean.replace(/_(\{([^}]+)\}|(\d+)|([a-z]))/g, (match, group1, group2, group3) => {
        // Only subscript usually numbers or single letters variables
        return `<sub>${group2 || group3 || group1}</sub>`;
    });

    // 4. Convert Newlines to HTML breaks
    clean = clean.replace(/\n/g, "<br>");

    // 5. Bold **text**
    clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    return clean;
}

// --- MAIN SOLVER ---
async function runSolver() {
    if (isProcessing) return;
    isProcessing = true;
    document.body.style.cursor = 'wait'; // Visual cue

    try {
        // --- YOUR CAPTURE LOGIC HERE ---
        // For testing, I am using dummy text with math to prove it works
        const questionText = document.body.innerText.substring(0, 500); 
        
        // Fake delay (simulate AI thinking)
        await new Promise(r => setTimeout(r, 2000)); 

        if (abortFlag) { isProcessing = false; document.body.style.cursor = 'default'; return; }

        // --- MOCK ANSWER (Replace with real API response) ---
        // This tests the cleaner: It has weird text, powers, and subscripts
        const answer = "The formula is Area = \\pi r^2 and for water H_2O. /ttext55 Ignore this. **Final Answer:** 5x^3 + 2y_0";

        if (abortFlag) { isProcessing = false; document.body.style.cursor = 'default'; return; }

        showOverlay(answer);

    } catch (err) {
        console.error(err);
    } finally {
        isProcessing = false;
        document.body.style.cursor = 'default';
    }
}

// --- UI DISPLAY ---
function showOverlay(text) {
    const old = document.getElementById('pollination-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'pollination-panel';
    
    // Stealth Style
    panel.style.position = 'fixed';
    panel.style.bottom = '20px';
    panel.style.right = '20px';
    panel.style.width = '300px';
    panel.style.padding = '12px';
    panel.style.backgroundColor = '#1a1a1a';
    panel.style.color = '#e0e0e0';
    panel.style.borderRadius = '6px';
    panel.style.zIndex = '999999';
    panel.style.fontFamily = 'Segoe UI, Arial, sans-serif'; // Better font for math
    panel.style.boxShadow = '0 4px 15px rgba(0,0,0,0.6)';
    panel.style.fontSize = '13px';
    panel.style.lineHeight = '1.4';

    // Apply the Math Formatting
    const formattedText = formatText(text);

    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:5px;">
            <strong style="color:#4caf50; font-size:11px;">> POLLINATIONS.AI</strong>
            <span id="close-btn" style="cursor:pointer; color:#888; font-weight:bold; font-size:14px;">&times;</span>
        </div>
        <div style="max-height:250px; overflow-y:auto;">
            ${formattedText}
        </div>
    `;

    document.body.appendChild(panel);
    document.getElementById('close-btn').onclick = () => panel.remove();
}
