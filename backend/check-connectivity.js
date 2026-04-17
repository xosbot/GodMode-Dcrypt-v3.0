const { ethers } = require('ethers');
require('dotenv').config();

async function checkConnectivity() {
    console.log('--- G0DM0D3-DCrypt v3.0 Connectivity Check ---');
    console.log('Admin Email:', process.env.ADMIN_EMAIL);
    
    const networks = [
        { name: 'Ethereum', envPrefix: 'ETH' },
        { name: 'BSC', envPrefix: 'BSC' },
        { name: 'Polygon', envPrefix: 'POLYGON' },
        { name: 'Arbitrum', envPrefix: 'ARBITRUM' },
        { name: 'Optimism', envPrefix: 'OPTIMISM' },
        { name: 'Avalanche', envPrefix: 'AVALANCHE' }
    ];

    for (const network of networks) {
        const rpcUrl = process.env[`${network.envPrefix}_RPC_URL`] || process.env[`${network.envPrefix}_RPC`];
        const privateKey = process.env[`${network.envPrefix}_PRIVATE_KEY`];

        console.log(`\n[${network.name}]`);
        
        if (!rpcUrl) {
            console.log('❌ RPC URL not found');
            continue;
        }

        try {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const blockNumber = await provider.getBlockNumber();
            console.log(`✅ RPC Connection successful (Block: ${blockNumber})`);

            if (privateKey) {
                const wallet = new ethers.Wallet(privateKey, provider);
                const balance = await provider.getBalance(wallet.address);
                console.log(`✅ Wallet access successful: ${wallet.address}`);
                console.log(`💰 Balance: ${ethers.formatEther(balance)} Native`);
            } else {
                console.log('❌ Private Key not found');
            }
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}`);
        }
    }
}

checkConnectivity();
