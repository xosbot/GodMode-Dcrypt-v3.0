export default function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Crypto Investor',
      avatar: 'SC',
      content: 'CrypDo has transformed my investment strategy. I\'m earning 127% APY consistently. The platform is incredibly user-friendly and the returns are outstanding.',
      rating: 5,
      earnings: '+$45,230'
    },
    {
      name: 'Michael Rodriguez',
      role: 'DeFi Enthusiast',
      avatar: 'MR',
      content: 'After trying multiple yield farming platforms, CrypDo stands out with its security and high returns. My portfolio has grown by 340% in just 6 months.',
      rating: 5,
      earnings: '+$127,890'
    },
    {
      name: 'Emma Thompson',
      role: 'Financial Advisor',
      avatar: 'ET',
      content: 'I recommend CrypDo to all my clients. The multi-chain support and auto-compounding features make it the best DeFi platform I\'ve encountered.',
      rating: 5,
      earnings: '+$89,450'
    },
    {
      name: 'David Kim',
      role: 'Software Engineer',
      avatar: 'DK',
      content: 'The analytics dashboard is fantastic. I can track everything in real-time. Started with $5,000 and now I\'m at $23,000. Absolutely incredible returns!',
      rating: 5,
      earnings: '+$18,000'
    },
    {
      name: 'Lisa Wang',
      role: 'Business Owner',
      avatar: 'LW',
      content: 'CrypDo\'s customer support is exceptional. They helped me through every step. The 24/7 availability and instant withdrawals give me complete peace of mind.',
      rating: 5,
      earnings: '+$67,200'
    },
    {
      name: 'James Wilson',
      role: 'Retired Investor',
      avatar: 'JW',
      content: 'At 65 years old, I was skeptical about crypto, but CrypDo proved me wrong. The platform is secure, profitable, and easy to use. Best investment decision ever.',
      rating: 5,
      earnings: '+$156,780'
    }
  ];

  return (
    <section id="testimonials" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What Our Users Say
          </h2>
          <p className="text-lg text-gray-600">
            Join thousands of satisfied investors who trust CrypDo with their crypto assets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 mb-4 italic">
                "{testimonial.content}"
              </p>

              {/* Earnings */}
              <div className="text-green-600 font-semibold text-lg mb-4">
                {testimonial.earnings} earned
              </div>

              {/* User Info */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="text-center mt-12">
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Verified Reviews</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Trusted Platform</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>100% Secure</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}