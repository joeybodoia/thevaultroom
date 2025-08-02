import React from 'react';
import { Play, Gift, Users, Trophy } from 'lucide-react';

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 font-pokemon">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-pokemon">
            Join our live Pokemon card opening experience and bid on specific Pokemon cards to win them!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="order-2 lg:order-1">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="bg-red-600 text-white rounded-full p-3 flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2 font-pokemon">1. Place Your Bids</h3>
                  <p className="text-gray-600 font-pokemon">
                    Browse available Pokemon cards and place bids on the ones you want. The highest bidder for each Pokemon wins the slot for that card.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-black text-white rounded-full p-3 flex-shrink-0">
                  <Play className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2 font-pokemon">2. Watch Live</h3>
                  <p className="text-gray-600 font-pokemon">
                    Join our live stream as we open 6 booster packs from a Prismatic Evolutions bundle. The excitement builds with every card revealed!
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-yellow-400 text-black rounded-full p-3 flex-shrink-0">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2 font-pokemon">3. Claim Your Wins</h3>
                  <p className="text-gray-600 font-pokemon">
                    If your Pokemon appears during the pack opening, you win ALL copies of that card pulled in the 6 packs. No Pokemon pulled means no win for that round.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-red-600 text-white rounded-full p-3 flex-shrink-0">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2 font-pokemon">4. Get Your Cards</h3>
                  <p className="text-gray-600 font-pokemon">
                    We ship your winning Pokemon cards directly to you. Only winning bidders receive cards - bid strategically!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-red-600 to-black flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 mb-4 inline-block">
                    <Play className="h-16 w-16 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 font-pokemon">Watch How It Works</h3>
                  <p className="text-white/80 font-pokemon">See our live opening process in action</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-all cursor-pointer flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 transform hover:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-black" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-black mb-4 font-pokemon">Why Bid with The Vault Room?</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-black text-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Play className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-black mb-2 font-pokemon">Live Transparency</h4>
              <p className="text-gray-600 font-pokemon">Watch every pack opening live with complete transparency - no hidden tricks!</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-400 text-black rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-black mb-2 font-pokemon">Strategic Bidding</h4>
              <p className="text-gray-600 font-pokemon">Bid smart on the Pokemon you want most - highest bidder takes all copies!</p>
            </div>
            <div className="text-center">
              <div className="bg-red-600 text-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Gift className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-black mb-2 font-pokemon">Guaranteed Items</h4>
              <p className="text-gray-600 font-pokemon">Highest bidders receive guaranteed physical items like stickers or shirts!</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-gray-600 text-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-black mb-2 font-pokemon">Competitive Fun</h4>
              <p className="text-gray-600 font-pokemon">Compete with other collectors for the Pokemon cards you want most!</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;