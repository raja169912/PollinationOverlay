// Pollinations AI (Text Mode)
const API_URL = "https://text.pollinations.ai/";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SOLVE_TEXT") {
    
    const rawPageText = request.text;

    // LIMIT TEXT SIZE: APIs have limits. We take the middle chunk where the question usually is,
    // or just the first 10,000 characters to be safe.
    const cleanText = rawPageText.substring(0, 15000); 

    chrome.tabs.sendMessage(sender.tab.id, { action: "UPDATE_STATUS", text: "Analyzing Page Text..." });

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [
                {
                    role: "system",
                    content: "You are an expert exam solver. The user will provide the raw text of a webpage containing an exam question. 1. Ignore navigation menus, footers, and sidebars. 2. Find the main Question and Options. 3. Solve it. 4. Output ONLY: 'FINAL ANSWER: [Option] [Value]' followed by a 1-sentence explanation."
                },
                {
                    role: "user",
                    content: cleanText
                }
            ],
            model: "openai", // Standard text model (Fast & Free)
            seed: Math.floor(Math.random() * 1000),
            jsonMode: false
        })
    })
    .then(response => response.text())
    .then(answer => {
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_RESULT", text: answer });
    })
    .catch(error => {
        chrome.tabs.sendMessage(sender.tab.id, { action: "SHOW_ERROR", text: "API Error: " + error.message });
    });
  }
});