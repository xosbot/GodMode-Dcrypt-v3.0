interface WalletModalProps {
  onClose: () => void;
  onConnect: () => void;
}

export default function WalletModal({ onClose, onConnect }: WalletModalProps) {
  const wallets = [
    {
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect to your MetaMask wallet',
      popular: true
    },
    {
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan with WalletConnect',
      popular: false
    },
    {
      name: 'Trust Wallet',
      icon: '🔐',
      description: 'Connect to Trust Wallet',
      popular: false
    },
    {
      name: 'Coinbase Wallet',
      icon: '📱',
      description: 'Connect to Coinbase Wallet',
      popular: false
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600">
            Choose your preferred wallet to get started
          </p>
        </div>

        {/* Wallet Options */}
        <div className="space-y-3">
          {wallets.map((wallet, index) => (
            <button
              key={index}
              onClick={onConnect}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{wallet.icon}</span>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 flex items-center">
                    {wallet.name}
                    {wallet.popular && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {wallet.description}
                  </div>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">New to crypto wallets?</p>
              <p>We recommend starting with MetaMask - it's free and easy to use.</p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            By connecting your wallet, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}