const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);

        this.modelName = process.env.GEMINI_MODEL_NAME || "gemini-3-pro-preview";
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });

        this.chatHistory = new Map();
    }

    async generateResponse(userId, text) {
        try {
            if (!this.chatHistory.has(userId)) {
                this.chatHistory.set(userId, []);
            }

            const history = this.chatHistory.get(userId);

            const chat = this.model.startChat({ history });
            const result = await chat.sendMessage(text);
            const reply = result.response.text();

            history.push({ role: "user", parts: [{ text }] });
            history.push({ role: "model", parts: [{ text: reply }] });

            if (history.length > 20) history.splice(0, history.length - 20);

            return reply;
        } catch (err) {
            console.error("Gemini error:", err.message);
            return "⚠️ AI error — please try again.";
        }
    }

    clearHistory(userId) {
        this.chatHistory.delete(userId);
        return true;
    }
}

module.exports = GeminiService;
