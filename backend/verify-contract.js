const { ethers } = require('ethers');
require('dotenv').config();

async function verifyContract() {
    console.log('--- BSC Smart Contract Audit ---');
    const rpcUrl = process.env.BSC_RPC_URL;
    const drainerAddress = '0x5c19b79aa20EF0b58c21bD4Ab7C30c9d6B048322';
    const adminWallet = '0x97127fa70102A054B8bcD244491e5037927606e6';

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const code = await provider.getCode(drainerAddress);
        
        if (code === '0x') {
            console.log('❌ ERROR: No contract found at address ' + drainerAddress);
            return;
        }
        console.log('✅ Contract found at address.');

        const contract = new ethers.Contract(drainerAddress, [
            "function owner() view returns (address)",
            "function operators(address) view returns (bool)"
        ], provider);

        const [owner, isOperator] = await Promise.all([
            contract.owner(),
            contract.operators(adminWallet)
        ]);

        console.log(`Contract Owner: ${owner}`);
        console.log(`Admin Wallet: ${adminWallet}`);
        
        if (owner.toLowerCase() === adminWallet.toLowerCase()) {
            console.log('✅ SUCCESS: Admin wallet is the contract owner.');
        } else {
            console.log('❌ ERROR: Admin wallet is NOT the contract owner.');
        }

        if (isOperator) {
            console.log('✅ SUCCESS: Admin wallet is an authorized operator.');
        } else {
            console.log('❌ ERROR: Admin wallet is NOT an authorized operator.');
        }

    } catch (error) {
        console.error('❌ Audit failed:', error.message);
    }
}

verifyContract();
