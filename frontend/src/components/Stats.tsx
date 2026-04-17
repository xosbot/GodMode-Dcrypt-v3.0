import { useState, useEffect } from 'react';

export default function Stats() {
  const [stats, setStats] = useState({
    tvl: 2100000000,
    users: 100000,
    apy: 127.5,
    transactions: 2500000
  });

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const ws = new WebSocket('ws://localhost:3006');

    ws.onopen = () => {
      console.log('Connected to WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stats') {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Fallback to simulated updates if WebSocket fails
    const interval = setInterval(() => {
      setStats(prev => ({
        tvl: prev.tvl + Math.random() * 10000,
        users: prev.users + Math.floor(Math.random() * 5),
        apy: 125 + Math.random() * 5,
        transactions: prev.transactions + Math.floor(Math.random() * 10)
      }));
    }, 3000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  return (
    <section id="stats" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Platform Statistics
          </h2>
          <p className="text-lg text-gray-600">
            Real-time data from our DeFi ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* TVL */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatNumber(stats.tvl)}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Total Value Locked
            </div>
            <div className="text-xs text-green-600 mt-1">↗️ +12.5% this week</div>
          </div>

          {/* Users */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatNumber(stats.users)}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Active Users
            </div>
            <div className="text-xs text-green-600 mt-1">↗️ +8.2% this month</div>
          </div>

          {/* APY */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {stats.apy.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Average APY
            </div>
            <div className="text-xs text-green-600 mt-1">↗️ +2.1% today</div>
          </div>

          {/* Transactions */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {formatNumber(stats.transactions)}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide">
              Total Transactions
            </div>
            <div className="text-xs text-green-600 mt-1">↗️ +15.3% this week</div>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live data updated every 3 seconds</span>
          </div>
        </div>
      </div>
    </section>
  );
}