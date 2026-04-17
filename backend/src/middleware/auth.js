const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/auth.log' }),
        new winston.transports.Console()
    ]
});

// Rate limiting
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests from this IP, please try again later.'
        });
    }
});

// API rate limiting (stricter for API endpoints)
const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 API requests per windowMs
    message: {
        error: 'API rate limit exceeded'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Access token required'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

        // Get user from database
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: 'User not found'
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({
                error: 'Account is not active'
            });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(423).json({
                error: 'Account is temporarily locked due to too many failed login attempts'
            });
        }

        // Attach user to request
        req.user = user;

        // Log access
        logger.info(`Authenticated request: ${user.username} - ${req.method} ${req.path}`);

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired'
            });
        }

        logger.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication failed'
        });
    }
};

// Role-based authorization middleware
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        if (req.user.role !== requiredRole && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        if (!req.user.permissions[permission] && req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required'
        });
    }
    next();
};

// API key authentication for external integrations
const authenticateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({
                error: 'API key required'
            });
        }

        // Find user with this API key
        const user = await User.findOne({
            'apiKeys.key': apiKey,
            'apiKeys.active': true
        });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid API key'
            });
        }

        // Find the specific API key
        const keyData = user.apiKeys.find(k => k.key === apiKey);

        // Check permissions
        if (!keyData.permissions.includes(req.path.split('/')[2])) {
            return res.status(403).json({
                error: 'API key does not have permission for this endpoint'
            });
        }

        // Update last used
        keyData.lastUsed = new Date();
        await user.save();

        // Attach user and key info to request
        req.user = user;
        req.apiKey = keyData;

        logger.info(`API key authentication: ${user.username} - ${req.method} ${req.path}`);

        next();
    } catch (error) {
        logger.error('API key authentication error:', error);
        return res.status(500).json({
            error: 'API key authentication failed'
        });
    }
};

// Two-factor authentication check
const require2FA = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }

    if (req.user.twoFactorEnabled && !req.session?.twoFactorVerified) {
        return res.status(403).json({
            error: 'Two-factor authentication required',
            requires2FA: true
        });
    }

    next();
};

// Log all requests
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
    });

    next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove server header
    res.removeHeader('X-Powered-By');

    next();
};

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            process.env.FRONTEND_URL
        ].filter(Boolean);

        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

module.exports = {
    rateLimiter,
    apiRateLimiter,
    authenticateToken,
    requireRole,
    requirePermission,
    requireAdmin,
    authenticateApiKey,
    require2FA,
    requestLogger,
    securityHeaders,
    corsOptions
};