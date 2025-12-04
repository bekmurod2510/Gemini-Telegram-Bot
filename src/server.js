const express = require('express');
const cors = require('cors');
require('dotenv').config();

const TelegramBotHandler = require('./bot');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.nodeEnv = process.env.NODE_ENV || 'development';

        this.botHandler = new TelegramBotHandler();
        this.bot = this.botHandler.getBot();

        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cors());

        this.app.use((req, res, next) => {
            console.log(`${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/', (req, res) => {
            res.json({
                status: 'online',
                environment: this.nodeEnv,
                timestamp: new Date().toISOString(),
            });
        });

        // Telegram webhook endpoint
        this.app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
            this.bot.processUpdate(req.body);
            res.sendStatus(200);
        });

        // Clear chat history
        this.app.post('/clear/:userId', (req, res) => {
            const ok = this.botHandler.gemini.clearHistory(req.params.userId);
            res.json({ success: ok });
        });

        // 404
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                route: req.originalUrl,
            });
        });
    }

    async start() {
        this.server = this.app.listen(this.port, async () => {
            console.log(`Server running on ${this.port}`);

            // Mode-based bot startup
            if (this.nodeEnv === 'production' && process.env.WEBHOOK_URL) {
                console.log('Production: Using Webhook...');
                await this.botHandler.setupWebhook(process.env.WEBHOOK_URL);
            } else {
                console.log('Development: Using Polling...');
                await this.botHandler.startPolling();
            }
        });
    }
}

if (require.main === module) {
    const server = new Server();
    server.start();
}

module.exports = Server;
