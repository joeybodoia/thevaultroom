import React from 'react';
import { Play, Gift, Users, Trophy } from 'lucide-react';

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-4 sm:mb-6 font-pokemon">
            How It Works
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto font-pokemon px-2">
            Pay a fixed entry fee to join our exclusive live Pokémon card opening events. Every participant receives the same amount of site credits (no monetary value) to use during the stream.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-8 sm:mb-12 lg:mb-16">
          <div className="order-2 lg:order-1">
            <div className="space-y-6 lg:space-y-8">
              {/* 1 */}
              <div className="flex items-start space-x-4">
                <div className="bg-red-600 text-white rounded-full p-3 flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2 font-pokemon">
                    1. Pay Entry Fee & Receive Credits
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 font-pokemon">
                    Pay a fixed entry fee to join the stream event. All participants receive the same amount of site credits (no monetary value).
                    <br />
                    <strong>Use credits for:</strong> ‘Chase Slot’ bidding, lottery entries, and Live Singles bidding (individual cards from my collection).
                  </p>
                </div>
              </div>

              {/* 2 */}
              <div className="flex items-start space-x-4">
                <div className="bg-black text-white rounded-full p-3 flex-shrink-0">
                  <Play className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2 font-pokemon">2. Watch Live</h3>
                  <p className="text-sm sm:text-base text-gray-600 font-pokemon">
                    <strong>Round 1:</strong> 10 sealed Prismatic Evolutions packs.
                    <br />
                    <strong>Round 2:</strong> 10 sealed Destined Rivals packs.
                    <br />
                    <strong>Round 3:</strong> 10 sealed Crown Zenith packs.
                  </p>
                </div>
              </div>

              {/* 3 */}
              <div className="flex items-start space-x-4">
                <div className="bg-yellow-400 text-black rounded-full p-3 flex-shrink-0">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2 font-pokemon">
                    3. Win Your Prizes
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 font-pokemon">
                    <strong>Chase Slots:</strong> Highest credit bidder for a slot wins all copies of that card if it’s pulled. Chase Slot wins are prioritized over lottery wins when they overlap in the same pack.
                    <br />
                    <strong>Lottery:</strong> Use credits to enter a lottery for packs 1–10 by selecting a rarity. If that rarity hits in a pack, you’re entered into the prize pool for that specific pack. One winner per pack (10 packs → up to 10 winners), each keeps the cards from their winning pack minus any Chase Slot wins from the same pack.
                    <br />
                    <strong>Live Singles:</strong> Highest credit bidder wins the specific individual card listed from my collection.
                  </p>
                </div>
              </div>

              {/* 4 */}
              <div className="flex items-start space-x-4">
                <div className="bg-red-600 text-white rounded-full p-3 flex-shrink-0">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2 font-pokemon">4. Receive Your Cards</h3>
                  <p className="text-sm sm:text-base text-gray-600 font-pokemon">
                    All winning cards are carefully shipped directly to you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right-side visual */}
          <div className="order-1 lg:order-2">
            <div className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-red-600 to-black flex items-center justify-center p-4">
                <div className="text-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 mb-4 inline-block">
                    <Play className="h-16 w-16 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 font-pokemon">Watch How It Works</h3>
                  <p className="text-sm sm:text-base text-white/80 font-pokemon">See our live opening process in action</p>
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

        {/* Why bid */}
        <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200">
          <div className="text-center mb-6 lg:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-black mb-4 font-pokemon">
              Why Bid with The Vault Room?
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="text-center">
              <div className="bg-black text-white rounded-full p-3 sm:p-4 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <Play className="h-8 w-8" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-black mb-2 font-pokemon">Live Transparency</h4>
              <p className="text-sm sm:text-base text-gray-600 font-pokemon">
                Watch every pack opening live with complete transparency—no hidden tricks.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-400 text-black rounded-full p-3 sm:p-4 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-black mb-2 font-pokemon">Strategic Bidding</h4>
              <p className="text-sm sm:text-base text-gray-600 font-pokemon">
                Allocate your credits across Chase Slots, Lottery, and Live Singles to match your strategy.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gray-600 text-white rounded-full p-3 sm:p-4 w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-black mb-2 font-pokemon">Competitive Fun</h4>
              <p className="text-sm sm:text-base text-gray-600 font-pokemon">
                Compete with other participants using equal credits—the excitement stays fair and fun.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
