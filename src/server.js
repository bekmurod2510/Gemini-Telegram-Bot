const express = require('express');
const cors = require('cors');
require('dotenv').config();

const TelegramBotHandler = require('./bot');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.nodeEnv = process.env.NODE_ENV || 'development';
        
        // Initialize bot handler
        this.botHandler = new TelegramBotHandler();
        this.bot = this.botHandler.getBot();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Parse JSON bodies
        this.app.use(express.json());
        
        // Parse URL-encoded bodies
        this.app.use(express.urlencoded({ extended: true }));
        
        // Enable CORS
        this.app.use(cors());
        
        // Logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/', (req, res) => {
            res.json({
                status: 'online',
                service: 'Telegram Bot with Gemini AI',
                version: '1.0.0',
                environment: this.nodeEnv,
                timestamp: new Date().toISOString()
            });
        });

        // Webhook endpoint for Telegram
        this.app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
            this.bot.processUpdate(req.body);
            res.sendStatus(200);
        });

        // Test endpoint to verify bot is working
        this.app.get('/test', (req, res) => {
            res.json({
                message: 'Bot server is running',
                botUsername: this.bot.options.username,
                timestamp: new Date().toISOString()
            });
        });

        // Clear history endpoint (for testing)
        this.app.post('/clear/:userId', async (req, res) => {
            const userId = req.params.userId;
            const result = this.botHandler.gemini.clearHistory(userId);
            res.json({
                success: result,
                message: `Cleared history for user ${userId}`,
                timestamp: new Date().toISOString()
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                timestamp: new Date().toISOString()
            });
        });
    }

    async start() {
        // For production with webhook
        if (this.nodeEnv === 'production' && process.env.WEBHOOK_URL) {
            console.log('Production mode detected, setting up webhook...');
            const webhookSetup = await this.botHandler.setupWebhook(process.env.WEBHOOK_URL);
            
            if (webhookSetup) {
                console.log('Webhook setup successful');
            } else {
                console.log('Falling back to polling mode');
                this.botHandler.startPolling();
            }
        } else {
            // For development, use polling
            console.log('Development mode detected, using polling...');
            this.botHandler.startPolling();
        }

        // Start Express server
        this.server = this.app.listen(this.port, () => {
            console.log(`
🚀 Server is running!
🌐 Environment: ${this.nodeEnv}
📡 Port: ${this.port}
🤖 Bot: ${this.bot.options.username}
📊 Health Check: http://localhost:${this.port}/
            `);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully...');
            this.shutdown();
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully...');
            this.shutdown();
        });
    }

    shutdown() {
        console.log('Closing HTTP server...');
        this.server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
if (require.main === module) {
    const server = new Server();
    server.start();
}

module.exports = Server;