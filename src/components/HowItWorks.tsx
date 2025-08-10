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
            Join our live Pokemon card opening experience with three rounds of pack openings and two ways to win!
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
                  <h3 className="text-xl font-bold text-black mb-2 font-pokemon">1. Choose Your Entry</h3>
                  <p className="text-gray-600 font-pokemon">
                    Option 1: Bid on high-value cards directly. Highest bidder for a particular card wins that card (all copies) if pulled.
                    Option 2: Enter the $1 lottery and select a rarity type. All users who select a rarity type which is pulled during round are added into final pool from which winners are randomly selected.
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
                    Round 1: 10 sealed Prismatic Evolutions packs. 
                    Round 2: 10 sealed Destined Rivals packs. 
                    Round 3: 10 sealed Crown Zenith packs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-yellow-400 text-black rounded-full p-3 flex-shrink-0">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2 font-pokemon">3. Win Your Prizes</h3>
                  <p className="text-gray-600 font-pokemon">
                    Direct bidders win all copies of their card if pulled. Lottery winners each win all cards from the packs opened that round, minus any direct bid wins. Lottery winner #1 receives all cards from first 5 packs and lottery winner #2 receives all cards from last 5 packs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-red-600 text-white rounded-full p-3 flex-shrink-0">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black mb-2 font-pokemon">4. Receive Your Cards</h3>
                  <p className="text-gray-600 font-pokemon">
                    We ship all winning cards directly to you. Direct bid winners get specific cards, lottery winners get all remaining cards!
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