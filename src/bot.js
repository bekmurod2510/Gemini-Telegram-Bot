const TelegramBot = require('node-telegram-bot-api');
const GeminiService = require('./gemini');
require('dotenv').config();

class TelegramBotHandler {
    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.geminiApiKey = process.env.GEMINI_API_KEY;

        if (!this.botToken) throw new Error("Missing TELEGRAM_BOT_TOKEN");
        if (!this.geminiApiKey) throw new Error("Missing GEMINI_API_KEY");

        // No polling or webhook server here!!
        this.bot = new TelegramBot(this.botToken, { polling: false });

        this.gemini = new GeminiService(this.geminiApiKey);
        this.setupHandlers();
    }

    setupHandlers() {
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            this.bot.sendMessage(chatId, "👋 Welcome! Send me any message.");
        });

        this.bot.onText(/\/clear/, (msg) => {
            const userId = msg.from.id;
            this.gemini.clearHistory(String(userId));
            this.bot.sendMessage(msg.chat.id, "🧹 Conversation history cleared.");
        });

        // Main chat handler
        this.bot.on('message', async (msg) => {
            if (msg.text?.startsWith('/')) return; // ignore commands

            const chatId = msg.chat.id;
            const userId = String(msg.from.id);
            const text = msg.text;

            this.bot.sendChatAction(chatId, 'typing');

            const reply = await this.gemini.generateResponse(userId, text);
            this.bot.sendMessage(chatId, reply);
        });
    }

    async startPolling() {
        console.log("Starting polling...");
        return this.bot.startPolling();
    }

    async setupWebhook(webhookBase) {
        const webhookUrl = `${webhookBase}/bot${this.botToken}`;
        console.log(`Setting webhook → ${webhookUrl}`);

        try {
            await this.bot.setWebHook(webhookUrl);
            console.log("Webhook set!");
        } catch (err) {
            console.error("Error setting webhook:", err.message);
        }
    }

    getBot() {
        return this.bot;
    }
}

module.exports = TelegramBotHandler;
