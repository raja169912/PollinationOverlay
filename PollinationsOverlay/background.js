// Pollinations.ai is a free, public API used by developers.
// It requires NO KEY and suffers NO COLD STARTS.
const API_URL = "https://text.pollinations.ai/";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SOLVE_SCREENSHOT") {
    
    // 1. Capture Screen (Low quality JPEG to ensure it fits in the request)
    chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 40 }, async (dataUrl) => {
      
      if (chrome.runtime.lastError || !dataUrl) {
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_ERROR", text: "Screenshot failed." });
        return;
      }

      chrome.tabs.sendMessage(sender.tab.id, { action: "UPDATE_STATUS", text: "Pollinating (Searching)..." });

      try {
        // 2. Send to Pollinations.ai (Proxies to GPT-4o or similar)
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
                    text: "You are an expert exam solver. Solve this MCQ from the image.\n1. Identify the question.\n2. Solve step-by-step.\n3. Output Format:\nFINAL ANSWER: [Option] [Value]\nEXPLANATION: [Concise logic]" 
                  },
                  { 
                    type: "image_url", 
                    image_url: { 
                      url: dataUrl // Send the Base64 image directly
                    } 
                  }
                ]
              }
            ],
            model: "openai", // Uses the best available vision model
            seed: 42 // Random seed to keep it consistent
          })
        });

        // 3. Handle Response
        if (!response.ok) {
           const text = await response.text();
           throw new Error("Pollinations Error: " + text);
        }

        // Pollinations returns text directly (not JSON sometimes), so we handle both
        const contentType = response.headers.get("content-type");
        let answer = "";
        
        if (contentType && contentType.includes("application/json")) {
           const data = await response.json();
           answer = data.choices ? data.choices[0].message.content : (data.output || data);
        } else {
           answer = await response.text();
        }

        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_RESULT", text: answer });

      } catch (error) {
        console.error("Pollinations Failed:", error);
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_ERROR", text: "Error: " + error.message });
      }
    });
  }
});
