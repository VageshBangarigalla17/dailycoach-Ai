const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the API client using an environment variable
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is missing.");
    console.log("Please run: export GEMINI_API_KEY='your_api_key_here'");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function generateTerminalResponse() {
    try {
        // Instantiate the model. 'gemini-1.5-flash' is standard for general text tasks.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Explain the core benefits of converting a website into a Progressive Web App.";

        console.log(`Sending prompt: "${prompt}"...\n`);

        // Call the API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("=== Gemini Response ===");
        console.log(text);
        console.log("=======================");

    } catch (error) {
        console.error("Failed to generate content:", error);
    }
}

// Execute the function
generateTerminalResponse();