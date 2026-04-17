const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
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
    type: {
        type: String,
        required: true,
        enum: ['drainer', 'factory', 'token', 'nft', 'dex', 'bridge']
    },
    name: String,
    symbol: String,
    decimals: Number,
    abi: [mongoose.Schema.Types.Mixed],
    bytecode: String,
    deployedAt: Date,
    deployer: String,
    deploymentTx: String,
    verified: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'failed'],
        default: 'unverified'
    },
    totalDrained: {
        type: mongoose.Schema.Types.Decimal128,
        default: 0
    },
    totalVictims: {
        type: Number,
        default: 0
    },
    totalTransactions: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'blacklisted', 'paused'],
        default: 'active'
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    configuration: {
        maxDrainAmount: mongoose.Schema.Types.Decimal128,
        minDrainAmount: mongoose.Schema.Types.Decimal128,
        gasLimit: Number,
        priorityFee: mongoose.Schema.Types.Decimal128,
        slippageTolerance: Number,
        autoTransfer: {
            type: Boolean,
            default: true
        },
        transferTo: String,
        blacklistedTokens: [String],
        whitelistedTokens: [String]
    },
    statistics: {
        successRate: Number,
        averageDrainTime: Number,
        totalGasSpent: mongoose.Schema.Types.Decimal128,
        profitMargin: Number
    },
    lastActivity: Date,
    notes: String,
    tags: [String]
}, {
    timestamps: true
});

// Indexes for performance
contractSchema.index({ network: 1, type: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ 'configuration.autoTransfer': 1 });
contractSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Contract', contractSchema);