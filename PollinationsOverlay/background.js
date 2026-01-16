// Pollinations.ai is a free, public API.
// We use the "gpt-4o" model explicitly to ensure VISION support.
const API_URL = "https://text.pollinations.ai/";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SOLVE_SCREENSHOT") {
    
    // 1. Capture Screen
    // We increase quality slightly to 60 to ensure text is readable
    chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 60 }, async (dataUrl) => {
      
      if (chrome.runtime.lastError || !dataUrl) {
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_ERROR", text: "Screenshot failed." });
        return;
      }

      chrome.tabs.sendMessage(sender.tab.id, { action: "UPDATE_STATUS", text: "Analyzing Image..." });

      try {
        // 2. Send to Pollinations.ai
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: "You are an expert exam solver. Solve this MCQ from the image.\n1. Identify the question text.\n2. Think step-by-step.\n3. Output Format:\nFINAL ANSWER: [Option] [Value]\nEXPLANATION: [Concise logic]" 
                  },
                  { 
                    type: "image_url", 
                    image_url: { 
                      url: dataUrl // Send base64 image
                    } 
                  }
                ]
              }
            ],
            model: "gpt-4o", // CRITICAL FIX: Explicitly use GPT-4o for Vision
            jsonMode: false  // Ensure we get plain text back
          })
        });

        if (!response.ok) {
           const text = await response.text();
           throw new Error("API Error: " + text);
        }

        const contentType = response.headers.get("content-type");
        let answer = "";
        
        if (contentType && contentType.includes("application/json")) {
           const data = await response.json();
           answer = data.choices ? data.choices[0].message.content : (data.output || data);
        } else {
           answer = await response.text();
        }

        // 3. Send Answer Back to Content Script
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_RESULT", text: answer });

      } catch (error) {
        console.error("Pollinations Failed:", error);
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_ERROR", text: "Error: " + error.message });
      }
    });
  }
});
