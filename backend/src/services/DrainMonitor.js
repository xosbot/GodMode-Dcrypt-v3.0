const WebSocket = require('ws');
const winston = require('winston');
const Transaction = require('../models/Transaction');
const Victim = require('../models/Victim');
const Contract = require('../models/Contract');

class DrainMonitor {
    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/drain-monitor.log' }),
                new winston.transports.Console()
            ]
        });

        this.subscribers = new Set();
        this.stats = {
            totalDrained: 0,
            totalVictims: 0,
            totalTransactions: 0,
            activeDrains: 0,
            recentDrains: []
        };

        this.updateStats();
        this.startPeriodicUpdates();
    }

    subscribe(ws) {
        this.subscribers.add(ws);

        // Send current stats immediately
        this.sendToSubscriber(ws, {
            type: 'stats_update',
            data: this.stats
        });

        ws.on('close', () => {
            this.subscribers.delete(ws);
        });

        this.logger.info(`WebSocket subscriber added. Total subscribers: ${this.subscribers.size}`);
    }

    unsubscribe(ws) {
        this.subscribers.delete(ws);
        this.logger.info(`WebSocket subscriber removed. Total subscribers: ${this.subscribers.size}`);
    }

    sendToSubscriber(ws, message) {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        } catch (error) {
            this.logger.error('Error sending to subscriber:', error);
            this.subscribers.delete(ws);
        }
    }

    broadcast(message) {
        this.subscribers.forEach(ws => {
            this.sendToSubscriber(ws, message);
        });
    }

    async updateStats() {
        try {
            const [
                totalDrainedResult,
                totalVictims,
                totalTransactions,
                recentDrains
            ] = await Promise.all([
                Transaction.aggregate([
                    { $match: { type: 'drain', status: 'confirmed' } },
                    { $group: { _id: null, total: { $sum: { $toDouble: '$usdValue' } } } }
                ]),
                Victim.countDocuments({}),
                Transaction.countDocuments({}),
                Transaction.find({ type: 'drain', status: 'confirmed' })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .populate('victim', 'address network')
            ]);

            this.stats = {
                totalDrained: totalDrainedResult[0]?.total || 0,
                totalVictims,
                totalTransactions,
                activeDrains: await this.getActiveDrainsCount(),
                recentDrains: recentDrains.map(tx => ({
                    id: tx._id,
                    victim: tx.victim?.address || 'Unknown',
                    network: tx.network,
                    amount: tx.amount,
                    usdValue: tx.usdValue,
                    timestamp: tx.createdAt,
                    token: tx.tokenSymbol
                }))
            };

            // Broadcast updated stats
            this.broadcast({
                type: 'stats_update',
                data: this.stats
            });

        } catch (error) {
            this.logger.error('Error updating stats:', error);
        }
    }

    async getActiveDrainsCount() {
        try {
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);

            return await Transaction.countDocuments({
                type: 'drain',
                status: 'pending',
                createdAt: { $gte: oneHourAgo }
            });
        } catch (error) {
            this.logger.error('Error getting active drains count:', error);
            return 0;
        }
    }

    async notifyNewDrain(transactionData) {
        try {
            // Update stats immediately
            await this.updateStats();

            // Send notification to all subscribers
            this.broadcast({
                type: 'new_drain',
                data: {
                    victim: transactionData.victim,
                    network: transactionData.network,
                    amount: transactionData.amount,
                    usdValue: transactionData.usdValue,
                    token: transactionData.tokenSymbol,
                    timestamp: new Date(),
                    txHash: transactionData.hash
                }
            });

            this.logger.info(`Notified subscribers of new drain: ${transactionData.amount} ${transactionData.tokenSymbol}`);
        } catch (error) {
            this.logger.error('Error notifying new drain:', error);
        }
    }

    async notifyNewVictim(victimData) {
        try {
            await this.updateStats();

            this.broadcast({
                type: 'new_victim',
                data: {
                    address: victimData.address,
                    network: victimData.network,
                    riskLevel: victimData.riskLevel,
                    timestamp: new Date()
                }
            });

            this.logger.info(`Notified subscribers of new victim: ${victimData.address}`);
        } catch (error) {
            this.logger.error('Error notifying new victim:', error);
        }
    }

    async notifySystemAlert(alertData) {
        this.broadcast({
            type: 'system_alert',
            data: {
                level: alertData.level, // 'info', 'warning', 'error', 'critical'
                message: alertData.message,
                details: alertData.details,
                timestamp: new Date()
            }
        });

        this.logger[alertData.level]('System alert:', alertData.message);
    }

    startPeriodicUpdates() {
        // Update stats every 30 seconds
        setInterval(async () => {
            await this.updateStats();
        }, 30000);

        // Send heartbeat every 60 seconds
        setInterval(() => {
            this.broadcast({
                type: 'heartbeat',
                timestamp: new Date()
            });
        }, 60000);
    }

    // Analytics methods
    async getDrainAnalytics(timeframe = '24h') {
        try {
            const now = new Date();
            let startDate;

            switch (timeframe) {
                case '1h':
                    startDate = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '24h':
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }

            const analytics = await Transaction.aggregate([
                {
                    $match: {
                        type: 'drain',
                        status: 'confirmed',
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            network: '$network',
                            token: '$tokenSymbol'
                        },
                        totalAmount: { $sum: { $toDouble: '$amount' } },
                        totalUsdValue: { $sum: { $toDouble: '$usdValue' } },
                        count: { $sum: 1 },
                        avgAmount: { $avg: { $toDouble: '$amount' } }
                    }
                },
                {
                    $sort: { totalUsdValue: -1 }
                }
            ]);

            return {
                timeframe,
                startDate,
                endDate: now,
                data: analytics
            };
        } catch (error) {
            this.logger.error('Error getting drain analytics:', error);
            return null;
        }
    }

    async getNetworkStats() {
        try {
            const networkStats = await Transaction.aggregate([
                {
                    $match: { type: 'drain', status: 'confirmed' }
                },
                {
                    $group: {
                        _id: '$network',
                        totalDrained: { $sum: { $toDouble: '$usdValue' } },
                        transactionCount: { $sum: 1 },
                        uniqueVictims: { $addToSet: '$victim' }
                    }
                },
                {
                    $project: {
                        network: '$_id',
                        totalDrained: 1,
                        transactionCount: 1,
                        uniqueVictimCount: { $size: '$uniqueVictims' }
                    }
                },
                {
                    $sort: { totalDrained: -1 }
                }
            ]);

            return networkStats;
        } catch (error) {
            this.logger.error('Error getting network stats:', error);
            return [];
        }
    }

    async getTopVictims(limit = 10) {
        try {
            const topVictims = await Victim.aggregate([
                {
                    $lookup: {
                        from: 'transactions',
                        localField: '_id',
                        foreignField: 'victim',
                        as: 'drainTransactions'
                    }
                },
                {
                    $addFields: {
                        totalDrained: {
                            $sum: {
                                $map: {
                                    input: '$drainTransactions',
                                    as: 'tx',
                                    in: { $toDouble: '$$tx.usdValue' }
                                }
                            }
                        },
                        drainCount: {
                            $size: {
                                $filter: {
                                    input: '$drainTransactions',
                                    as: 'tx',
                                    cond: { $eq: ['$$tx.type', 'drain'] }
                                }
                            }
                        }
                    }
                },
                {
                    $sort: { totalDrained: -1 }
                },
                {
                    $limit: limit
                },
                {
                    $project: {
                        address: 1,
                        network: 1,
                        totalDrained: 1,
                        drainCount: 1,
                        riskLevel: 1,
                        lastSeen: 1
                    }
                }
            ]);

            return topVictims;
        } catch (error) {
            this.logger.error('Error getting top victims:', error);
            return [];
        }
    }

    // Alert system
    async checkForAlerts() {
        try {
            // Check for unusual activity
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);

            const recentDrains = await Transaction.countDocuments({
                type: 'drain',
                status: 'confirmed',
                createdAt: { $gte: oneHourAgo }
            });

            if (recentDrains > 50) {
                await this.notifySystemAlert({
                    level: 'warning',
                    message: `High drain activity detected: ${recentDrains} drains in the last hour`,
                    details: { recentDrains, timeframe: '1h' }
                });
            }

            // Check for failed transactions
            const failedDrains = await Transaction.countDocuments({
                type: 'drain',
                status: 'failed',
                createdAt: { $gte: oneHourAgo }
            });

            if (failedDrains > 10) {
                await this.notifySystemAlert({
                    level: 'error',
                    message: `High failure rate: ${failedDrains} failed drains in the last hour`,
                    details: { failedDrains, timeframe: '1h' }
                });
            }

        } catch (error) {
            this.logger.error('Error checking for alerts:', error);
        }
    }
}

module.exports = DrainMonitor;