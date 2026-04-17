const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
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

// Login route
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).json({
            error: 'Username and password are required'
        });
    }

    // Check if running in test mode (no MongoDB)
    const isTestMode = process.env.NODE_ENV === 'test' || !process.env.MONGODB_URI;

    if (isTestMode) {
        // Mock authentication for test mode
        if (username === 'admin' && password === 'godmod123') {
            const token = jwt.sign(
                {
                    userId: 'test-user-id',
                    username: 'admin',
                    role: 'admin'
                },
                process.env.JWT_SECRET || 'fallback_secret',
                {
                    expiresIn: '24h'
                }
            );

            logger.info(`Test mode login successful: ${username}`);

            return res.json({
                token,
                user: {
                    id: 'test-user-id',
                    username: 'admin',
                    email: 'admin@godmod.test',
                    role: 'admin',
                    permissions: ['read', 'write', 'admin'],
                    lastLogin: new Date()
                }
            });
        } else {
            logger.warn(`Test mode login failed for user: ${username}`);
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }
    }

    // Production mode - use MongoDB
    const user = await User.findOne({ username });
    if (!user) {
        logger.warn(`Failed login attempt for non-existent user: ${username}`);
        return res.status(401).json({
            error: 'Invalid credentials'
        });
    }

    // Check if account is active
    if (user.status !== 'active') {
        logger.warn(`Login attempt for inactive account: ${username}`);
        return res.status(401).json({
            error: 'Account is not active'
        });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
        logger.warn(`Login attempt for locked account: ${username}`);
        return res.status(423).json({
            error: 'Account is temporarily locked due to too many failed login attempts'
        });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        // Increment failed login attempts
        user.failedLoginAttempts += 1;

        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
            user.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
            logger.warn(`Account locked due to failed attempts: ${username}`);
        }

        await user.save();

        logger.warn(`Failed login attempt for user: ${username} (${user.failedLoginAttempts}/5)`);
        return res.status(401).json({
            error: 'Invalid credentials'
        });
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
        {
            userId: user._id,
            username: user.username,
            role: user.role
        },
        process.env.JWT_SECRET || 'fallback_secret',
        {
            expiresIn: '24h'
        }
    );

    logger.info(`Successful login: ${username}`);

    res.json({
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            lastLogin: user.lastLogin
        }
    });
}));

// Logout route
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // We can optionally implement token blacklisting here if needed

    logger.info(`User logged out: ${req.user.username}`);

    res.json({
        message: 'Logged out successfully'
    });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
    // Check if running in test mode
    const isTestMode = process.env.NODE_ENV === 'test' || !process.env.MONGODB_URI;

    if (isTestMode) {
        return res.json({
            id: 'test-user-id',
            username: 'admin',
            email: 'admin@godmod.test',
            role: 'admin',
            permissions: ['read', 'write', 'admin'],
            status: 'active',
            lastLogin: new Date(),
            createdAt: new Date()
        });
    }

    const user = await User.findById(req.user._id)
        .select('-password -apiKeys -failedLoginAttempts -lockUntil');

    res.json(user);
}));

// Update user profile
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    // If changing password, verify current password
    if (newPassword) {
        if (!currentPassword) {
            return res.status(400).json({
                error: 'Current password is required to change password'
            });
        }

        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidCurrentPassword) {
            return res.status(401).json({
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        user.password = await bcrypt.hash(newPassword, saltRounds);
    }

    // Update email if provided
    if (email) {
        user.email = email;
    }

    user.updatedAt = new Date();
    await user.save();

    logger.info(`Profile updated: ${user.username}`);

    res.json({
        message: 'Profile updated successfully',
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            updatedAt: user.updatedAt
        }
    });
}));

// Change password (admin can change any user's password)
router.put('/password/:userId', authenticateToken, asyncHandler(async (req, res) => {
    // Only admins can change other users' passwords
    if (req.user.role !== 'admin' && req.params.userId !== req.user._id.toString()) {
        return res.status(403).json({
            error: 'Insufficient permissions'
        });
    }

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long'
        });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
        return res.status(404).json({
            error: 'User not found'
        });
    }

    // Hash new password
    const saltRounds = 12;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    user.updatedAt = new Date();
    await user.save();

    logger.info(`Password changed for user: ${user.username} by ${req.user.username}`);

    res.json({
        message: 'Password changed successfully'
    });
}));

// Two-factor authentication setup
router.post('/2fa/setup', authenticateToken, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user.twoFactorEnabled) {
        return res.status(400).json({
            error: 'Two-factor authentication is already enabled'
        });
    }

    // Generate secret for TOTP
    const speakeasy = require('speakeasy');
    const secret = speakeasy.generateSecret({
        name: `GodMode-DCrypt (${user.username})`,
        issuer: 'GodMode-DCrypt v3.0'
    });

    // Store temporary secret (not saved to DB yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code URL
    const qrcode = require('qrcode');
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
        secret: secret.base32,
        qrCode: qrCodeUrl,
        message: 'Scan the QR code with your authenticator app, then verify with the code'
    });
}));

// Verify and enable 2FA
router.post('/2fa/verify', authenticateToken, asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            error: 'Verification code is required'
        });
    }

    const user = await User.findById(req.user._id);

    if (!user.twoFactorSecret) {
        return res.status(400).json({
            error: 'Two-factor authentication setup not initiated'
        });
    }

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time steps (30 seconds) tolerance
    });

    if (!verified) {
        return res.status(401).json({
            error: 'Invalid verification code'
        });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorSecret = undefined; // Remove temporary secret
    await user.save();

    logger.info(`2FA enabled for user: ${user.username}`);

    res.json({
        message: 'Two-factor authentication enabled successfully'
    });
}));

// Disable 2FA
router.post('/2fa/disable', authenticateToken, asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            error: 'Verification code is required'
        });
    }

    const user = await User.findById(req.user._id);

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({
            error: 'Two-factor authentication is not enabled'
        });
    }

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
    });

    if (!verified) {
        return res.status(401).json({
            error: 'Invalid verification code'
        });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    logger.info(`2FA disabled for user: ${user.username}`);

    res.json({
        message: 'Two-factor authentication disabled successfully'
    });
}));

// Verify 2FA code (for login)
router.post('/2fa/verify-login', asyncHandler(async (req, res) => {
    const { username, code } = req.body;

    if (!username || !code) {
        return res.status(400).json({
            error: 'Username and verification code are required'
        });
    }

    const user = await User.findOne({ username });
    if (!user || !user.twoFactorEnabled) {
        return res.status(401).json({
            error: 'Invalid request'
        });
    }

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
    });

    if (!verified) {
        return res.status(401).json({
            error: 'Invalid verification code'
        });
    }

    // Mark 2FA as verified for this session
    // In a real implementation, you'd store this in session/cache
    req.session.twoFactorVerified = true;

    // Generate JWT token
    const token = jwt.sign(
        {
            userId: user._id,
            username: user.username,
            role: user.role,
            twoFactorVerified: true
        },
        process.env.JWT_SECRET || 'fallback_secret',
        {
            expiresIn: '24h'
        }
    );

    logger.info(`2FA login successful: ${username}`);

    res.json({
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            twoFactorEnabled: user.twoFactorEnabled
        }
    });
}));

// Refresh token
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(401).json({
            error: 'User not found'
        });
    }

    // Generate new token
    const token = jwt.sign(
        {
            userId: user._id,
            username: user.username,
            role: user.role
        },
        process.env.JWT_SECRET || 'fallback_secret',
        {
            expiresIn: '24h'
        }
    );

    res.json({
        token,
        user: {
            id: user._id,
            username: user.username,
            role: user.role
        }
    });
}));

// Get login history
router.get('/history', authenticateToken, asyncHandler(async (req, res) => {
    // This would typically be stored in a separate collection
    // For now, return basic info
    const user = await User.findById(req.user._id)
        .select('lastLogin failedLoginAttempts lockUntil');

    res.json({
        lastLogin: user.lastLogin,
        failedAttempts: user.failedLoginAttempts,
        isLocked: user.lockUntil && user.lockUntil > Date.now(),
        lockUntil: user.lockUntil
    });
}));

module.exports = router;