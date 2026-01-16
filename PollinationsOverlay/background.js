// Pollinations.ai is a free, public API.
// We use the "openai" model which supports Vision.
const API_URL = "https://text.pollinations.ai/";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SOLVE_SCREENSHOT") {
    
    // 1. Capture Screen (Quality REDUCED to 30 to prevent timeout)
    chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 30 }, async (dataUrl) => {
      
      if (chrome.runtime.lastError || !dataUrl) {
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_ERROR", text: "Screenshot failed." });
        return;
      }

      chrome.tabs.sendMessage(sender.tab.id, { action: "UPDATE_STATUS", text: "Analyzing Image..." });

      try {
        // 2. Send to Pollinations.ai
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: "Solve this MCQ. Identify the question text. Think step-by-step. Output: FINAL ANSWER: [Option] [Value]" 
                  },
                  { 
                    type: "image_url", 
                    image_url: { url: dataUrl } 
                  }
                ]
              }
            ],
            model: "openai", // "openai" is the correct ID for the vision model
            seed: Math.floor(Math.random() * 1000), // Random seed to prevent caching
            jsonMode: false
          })
        });

        if (!response.ok) {
           const errText = await response.text();
           throw new Error("API " + response.status + ": " + errText.substring(0, 50));
        }

        const answer = await response.text();
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_RESULT", text: answer });

      } catch (error) {
        console.error("Pollinations Failed:", error);
        // Send the REAL error message to the popup
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_ERROR", text: error.message });
      }
    });
  }
});
