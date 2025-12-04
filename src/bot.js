const TelegramBot = require('node-telegram-bot-api');
const GeminiService = require('./gemini');
require('dotenv').config();

class TelegramBotHandler {
    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.webhookUrl = process.env.WEBHOOK_URL;
        
        if (!this.botToken) {
            throw new Error('TELEGRAM_BOT_TOKEN is required in environment variables');
        }
        
        if (!this.geminiApiKey) {
            throw new Error('GEMINI_API_KEY is required in environment variables');
        }

        // Initialize bot
        this.bot = new TelegramBot(this.botToken);
        
        // Initialize Gemini service
        this.gemini = new GeminiService(this.geminiApiKey);
        
        // Store user states (optional: for more complex interactions)
        this.userStates = new Map();
        
        // Setup bot commands
        this.setupCommands();
        this.setupMessageHandlers();
    }

    setupCommands() {
        // Set bot commands in Telegram menu
        const commands = [
            { command: 'start', description: 'Start the bot' },
            { command: 'help', description: 'Show help information' },
            { command: 'clear', description: 'Clear chat history' },
            { command: 'about', description: 'About this bot' }
        ];

        this.bot.setMyCommands(commands);
    }

    setupMessageHandlers() {
        // Handle /start command
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const welcomeMessage = `
🤖 *Welcome to Gemini AI Bot!*

I'm powered by Google's Gemini AI. Here's what I can do:

• *Chat with AI*: Just send me any message!
• *Clear History*: Use /clear to start fresh
• *Get Help*: Use /help for assistance

*Commands Available:*
/start - Start the bot
/help - Show help information
/clear - Clear chat history
/about - About this bot

*Note:* I remember our conversation history (last 10 messages). Use /clear if you want to start fresh.

Let's start chatting! Send me a message! ✨
            `;
            
            await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        });

        // Handle /help command
        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id;
            const helpMessage = `
📚 *Help Guide*

*How to use this bot:*
1. Just send me any message and I'll respond using Gemini AI
2. I remember our conversation (last 10 messages)
3. Use /clear to reset our conversation

*Available Commands:*
/start - Start the bot and see welcome message
/help - Show this help message
/clear - Clear our chat history
/about - Learn about this bot

*Tips:*
• Be specific with your questions for better answers
• I can help with coding, writing, analysis, and more!
• If I don't respond, try /clear and ask again

*Need help?* Contact the bot administrator.
            `;
            
            await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        });

        // Handle /clear command
        this.bot.onText(/\/clear/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            this.gemini.clearHistory(userId.toString());
            this.userStates.delete(userId);
            
            await this.bot.sendMessage(chatId, "🗑️ Chat history cleared! Our conversation has been reset.", {
                parse_mode: 'Markdown'
            });
        });

        // Handle /about command
        this.bot.onText(/\/about/, async (msg) => {
            const chatId = msg.chat.id;
            const aboutMessage = `
🤖 *About Gemini AI Bot*

*Version:* 1.0.0
*Powered by:* Google Gemini AI
*Framework:* Node.js with node-telegram-bot-api

*Features:*
• Conversational AI using Gemini Pro
• Context memory (last 10 messages)
• Safety filtering
• Multi-user support

*Developer:* [Your Name]
*GitHub:* [Your Repository Link]

This bot is deployed on Render.com as a web service.

*Privacy:* Conversations are not stored permanently and are only kept temporarily for context.
            `;
            
            await this.bot.sendMessage(chatId, aboutMessage, { parse_mode: 'Markdown' });
        });

        // Handle all text messages (non-commands)
        this.bot.on('message', async (msg) => {
            // Skip if message is a command
            if (msg.text && msg.text.startsWith('/')) {
                return;
            }

            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const messageText = msg.text || '';
            const username = msg.from.username || msg.from.first_name;

            // Skip empty messages
            if (!messageText.trim()) {
                await this.bot.sendMessage(chatId, "Please send a text message. 😊");
                return;
            }

            // Show "typing" action
            await this.bot.sendChatAction(chatId, 'typing');

            try {
                // Generate response from Gemini
                const response = await this.gemini.generateResponse(
                    userId.toString(), 
                    messageText
                );

                // Send response (split if too long)
                if (response.length > 4096) {
                    // Telegram has 4096 character limit per message
                    for (let i = 0; i < response.length; i += 4096) {
                        await this.bot.sendMessage(
                            chatId, 
                            response.substring(i, i + 4096),
                            { parse_mode: 'Markdown' }
                        );
                    }
                } else {
                    await this.bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
                }

            } catch (error) {
                console.error('Error processing message:', error);
                
                // Send error message to user
                await this.bot.sendMessage(chatId, 
                    "❌ Sorry, I encountered an error processing your request. Please try again in a moment.",
                    { parse_mode: 'Markdown' }
                );
            }
        });

        // Handle errors
        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });

        this.bot.on('webhook_error', (error) => {
            console.error('Webhook error:', error);
        });
    }

    /**
     * Start bot in polling mode (for development)
     */
    startPolling() {
        console.log('Starting bot in polling mode...');
        this.bot.startPolling();
        console.log('Bot is running in polling mode');
    }

    /**
     * Set up webhook for production
     * @param {string} webhookUrl - Full URL for webhook
     */
    async setupWebhook(webhookUrl) {
        try {
            await this.bot.setWebHook(`${webhookUrl}/bot${this.botToken}`);
            console.log(`Webhook set to: ${webhookUrl}/bot${this.botToken}`);
            return true;
        } catch (error) {
            console.error('Error setting webhook:', error);
            return false;
        }
    }

    /**
     * Get bot instance for webhook handling
     */
    getBot() {
        return this.bot;
    }
}

module.exports = TelegramBotHandler;