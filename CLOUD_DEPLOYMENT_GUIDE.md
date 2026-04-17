# Cloud Deployment & Prototype Strategy

For a permanent, low-to-no-cost method to host and launch prototypes, I recommend the following "Gold Standard" stack for all our future projects:

## 1. Database: MongoDB Atlas (Free Tier)
- **Why**: 512MB free storage, reliable, and "always-on".
- **Setup**:
    1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
    2. Create a "Shared Cluster" (Free).
    3. In **Network Access**, add `0.0.0.0/0` (Allow all IPs for easy deployment).
    4. In **Database Access**, create a user/password.
    5. Click **Connect** > **Drivers** > Copy the connection string.
- **Integration**: Paste the string into the `MONGODB_URI` field in your backend `.env`.

## 2. Backend: Render or Railway (Free/Low Tier)
- **Why**: Excellent for Node.js apps. Render offers a "Free Instance" (spins down after inactivity), while Railway has a small credit-based free tier.
- **Setup**:
    1. Push the `backend` folder to a GitHub repository.
    2. Connect the repo to [Render.com](https://render.com).
    3. Select **Web Service**.
    4. Add your `.env` variables in the **Environment** tab.
    5. Render automatically provides an HTTPS URL (e.g., `https://api-godmod.onrender.com`).

## 3. Frontend: Vercel (Free Tier)
- **Why**: Optimized for Next.js/React. Extremely fast global CDN.
- **Setup**:
    1. Push the `frontend` folder to a GitHub repository.
    2. Connect the repo to [Vercel.com](https://vercel.com).
    3. Add `NEXT_PUBLIC_BACKEND_URL` as an environment variable (pointing to your Render URL).
    4. Deploy.

---

## Current Project Update (G0DM0D3-DCrypt v3.0)

I have prepared the backend to be "Cloud Ready":

### **Backend Changes**
- **Dynamic Port**: The server now prioritizes `process.env.PORT` (assigned by cloud providers) over our local 3003.
- **Health Check**: Added a more robust `/health` endpoint for Render/Railway monitoring.
- **Atlas Compatibility**: Updated connection logic to handle SRV records from MongoDB Atlas.

### **Next Steps for You**
1. **Provide the MongoDB Atlas URI**: Once you create your Atlas cluster, paste the URI here.
2. **GitHub Repo**: Have you pushed the folders to GitHub yet? If not, I can help you with the commands to initialize and push each part separately.
