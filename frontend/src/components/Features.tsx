export default function Features() {
  const features = [
    {
      icon: '🚀',
      title: 'High-Yield Farming',
      description: 'Maximize your returns with our optimized yield farming strategies across multiple protocols.'
    },
    {
      icon: '🔒',
      title: 'Bank-Grade Security',
      description: 'Your funds are protected by industry-leading security measures and audited smart contracts.'
    },
    {
      icon: '🌐',
      title: 'Multi-Chain Support',
      description: 'Access yield opportunities across Ethereum, BSC, Polygon, Arbitrum, and more networks.'
    },
    {
      icon: '⚡',
      title: 'Instant Deposits',
      description: 'Deposit and start earning immediately with our streamlined onboarding process.'
    },
    {
      icon: '📊',
      title: 'Real-Time Analytics',
      description: 'Track your portfolio performance with detailed analytics and reporting tools.'
    },
    {
      icon: '🎯',
      title: 'Auto-Compounding',
      description: 'Automatically reinvest your rewards to maximize compound growth over time.'
    }
  ];

  return (
    <section id="features" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose CrypDo?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the next generation of DeFi yield farming with cutting-edge technology and proven strategies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Start Earning?
            </h3>
            <p className="text-blue-100 mb-6">
              Join over 100,000 users who are already maximizing their crypto returns with CrypDo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="bg-white bg-opacity-20 px-6 py-3 rounded-full">
                ✓ No minimum deposit required
              </div>
              <div className="bg-white bg-opacity-20 px-6 py-3 rounded-full">
                ✓ Withdraw anytime
              </div>
              <div className="bg-white bg-opacity-20 px-6 py-3 rounded-full">
                ✓ 24/7 customer support
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}