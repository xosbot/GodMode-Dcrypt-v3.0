'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Stats from '@/components/Stats';
import Features from '@/components/Features';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import WalletModal from '@/components/WalletModal';

export default function Home() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert('Please install MetaMask to connect your wallet!');
      return;
    }

    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
      setIsWalletConnected(true);
      setShowWalletModal(false);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
      <Header
        isWalletConnected={isWalletConnected}
        walletAddress={walletAddress}
        onConnectWallet={() => setShowWalletModal(true)}
      />

      <main>
        <Hero 
          onConnectWallet={() => setShowWalletModal(true)} 
          walletAddress={walletAddress}
          isWalletConnected={isWalletConnected}
        />
        <Stats />
        <Features />
        <Testimonials />
      </main>

      <Footer />

      {showWalletModal && (
        <WalletModal
          onClose={() => setShowWalletModal(false)}
          onConnect={connectWallet}
        />
      )}
    </div>
  );
}
