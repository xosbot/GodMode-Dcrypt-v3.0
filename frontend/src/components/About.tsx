'use client';

import { useEffect, useRef, useState } from 'react';

export default function About() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" ref={sectionRef} className="py-24 bg-black relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            What is <span className="gradient-text">CrypDo</span>?
          </h2>
          <p className={`text-xl text-white/70 max-w-3xl mx-auto transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            The world's first NFT-linked physical cash system, combining the tangibility of traditional money
            with the innovation of blockchain technology.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Description */}
          <div className={`space-y-8 transition-all duration-1000 delay-400 ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
          }`}>
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Physical Crypto Meets Digital Ownership</h3>
              <p className="text-white/70 leading-relaxed">
                CrypDo represents a revolutionary approach to money. Each card is a physical manifestation
                of digital value, backed by USDT reserves and linked to a unique NFT that proves ownership
                and authenticity on the blockchain.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Real Value, Real Utility</h3>
              <p className="text-white/70 leading-relaxed">
                Unlike traditional crypto which exists only in digital wallets, CrypDo cards can be used
                anywhere Mastercard and Visa are accepted. The physical card provides the convenience of
                cash while the NFT backing ensures transparency and security.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Built for the Future</h3>
              <p className="text-white/70 leading-relaxed">
                Our cards are engineered with cutting-edge security features, including biometric authentication,
                NFC capabilities, and time-locked smart contracts that ensure your assets are always protected.
              </p>
            </div>
          </div>

          {/* Right side - Visual representation */}
          <div className={`relative transition-all duration-1000 delay-600 ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          }`}>
            {/* Card mockup */}
            <div className="relative">
              <div className="w-full max-w-md mx-auto transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="glass p-8 rounded-2xl shadow-2xl animate-glow">
                  {/* Card header */}
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-12 h-8 bg-gradient-to-r from-primary to-secondary rounded"></div>
                    <div className="text-right">
                      <div className="text-xs text-white/60 uppercase tracking-wider">CrypDo</div>
                      <div className="text-xs text-white/40">Premium</div>
                    </div>
                  </div>

                  {/* Card number */}
                  <div className="mb-6">
                    <div className="text-lg font-mono text-white tracking-wider">
                      4242 •••• •••• 4242
                    </div>
                  </div>

                  {/* Card details */}
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs text-white/60 uppercase tracking-wider">Card Holder</div>
                      <div className="text-sm font-semibold text-white">JOHN DOE</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/60 uppercase tracking-wider">Expires</div>
                      <div className="text-sm font-semibold text-white">12/28</div>
                    </div>
                  </div>

                  {/* NFT indicator */}
                  <div className="absolute top-4 right-4">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary/30 rounded-full animate-float"></div>
              <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-secondary/30 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 -right-8 w-4 h-4 bg-accent/30 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Stats overlay */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="glass p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">$10K</div>
                <div className="text-xs text-white/60">USDT Backed</div>
              </div>
              <div className="glass p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-secondary">NFT</div>
                <div className="text-xs text-white/60">Verified</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}