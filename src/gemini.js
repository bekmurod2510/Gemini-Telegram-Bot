const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro-latest",
            generationConfig: {
                temperature: 0.9,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        });
        this.chatHistory = new Map();
    }

    /**
     * Generate response using Gemini AI
     * @param {string} userId - User ID for chat history
     * @param {string} message - User message
     * @returns {Promise<string>} AI response
     */
    async generateResponse(userId, message) {
        try {
            // Get or create chat history for user
            if (!this.chatHistory.has(userId)) {
                this.chatHistory.set(userId, []);
            }
            
            const history = this.chatHistory.get(userId);
            
            // Start chat with history
            const chat = this.model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 1000,
                },
            });

            // Send message and get response
            const result = await chat.sendMessage(message);
            const response = await result.response;
            const text = response.text();

            // Update chat history (keep last 10 messages)
            history.push({ role: "user", parts: [{ text: message }] });
            history.push({ role: "model", parts: [{ text }] });
            
            if (history.length > 20) { // Keep last 10 exchanges (20 messages)
                history.splice(0, history.length - 20);
            }

            return text;

        } catch (error) {
            console.error('Gemini API Error:', error);
            
            // User-friendly error messages
            if (error.message.includes('429')) {
                return "I'm receiving too many requests right now. Please wait a moment and try again.";
            } else if (error.message.includes('API key')) {
                return "There's an issue with the AI service configuration. Please contact the bot administrator.";
            } else if (error.message.includes('safety')) {
                return "I cannot respond to that request as it violates my safety guidelines.";
            } else {
                return "I'm having trouble processing your request. Please try again in a moment.";
            }
        }
    }

    /**
     * Clear chat history for a user
     * @param {string} userId - User ID
     */
    clearHistory(userId) {
        this.chatHistory.delete(userId);
        return true;
    }
}

module.exports = GeminiService;