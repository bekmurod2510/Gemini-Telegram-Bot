const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
    constructor(apiKey) {
        if (!apiKey) {
            console.warn('⚠️ Gemini API key not provided');
            return;
        }
        
        this.genAI = new GoogleGenerativeAI(apiKey);
        
        // Try different model names
        this.modelName = this.getWorkingModelName();
        console.log(`🧠 Using Gemini model: ${this.modelName}`);
        
        this.model = this.genAI.getGenerativeModel({ 
            model: this.modelName,
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
    
    getWorkingModelName() {
        // Try environment variable first
        if (process.env.GEMINI_MODEL_NAME) {
            return process.env.GEMINI_MODEL_NAME;
        }
        
        // Common working model names (updated Dec 2024)
        return "gemini-1.5-pro-latest";
    }

    async generateResponse(userId, message) {
        if (!this.model) {
            return "⚠️ Gemini AI is not configured properly. Please check the API key.";
        }
        
        try {
            // Get or create chat history
            if (!this.chatHistory.has(userId)) {
                this.chatHistory.set(userId, []);
            }
            
            const history = this.chatHistory.get(userId);
            
            // Start chat
            const chat = this.model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 1000,
                },
            });

            // Get response
            const result = await chat.sendMessage(message);
            const response = await result.response;
            const text = response.text();

            // Update history
            history.push({ role: "user", parts: [{ text: message }] });
            history.push({ role: "model", parts: [{ text }] });
            
            // Keep last 20 messages max
            if (history.length > 20) {
                history.splice(0, history.length - 20);
            }

            return text;

        } catch (error) {
            console.error('Gemini API Error:', error.message);
            
            // User-friendly error messages
            if (error.message.includes('404') || error.message.includes('not found')) {
                return `⚠️ Model configuration issue. Please update the model name.`;
            } else if (error.message.includes('API key') || error.message.includes('authentication')) {
                return '⚠️ API key issue. Please check your Gemini API configuration.';
            } else if (error.message.includes('quota') || error.message.includes('429')) {
                return "📊 Rate limit reached. Please try again in a moment.";
            } else {
                return "🤖 I'm having trouble processing your request. Please try again.";
            }
        }
    }

    clearHistory(userId) {
        this.chatHistory.delete(userId);
        return true;
    }
}

module.exports = GeminiService;