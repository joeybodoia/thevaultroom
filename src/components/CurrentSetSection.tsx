import React from 'react';
import { Sparkles, Package, Star } from 'lucide-react';

const CurrentSetSection: React.FC = () => {
  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 to-pink-600">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-300" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-pokemon">
              Current Sets
            </h2>
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-300" />
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20">
            <div className="mb-4 sm:mb-6">
              <p className="text-base sm:text-lg lg:text-xl text-white/90 font-pokemon mb-6 sm:mb-8">
                Three premium Pokémon TCG sets featuring the most sought-after cards
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-42 lg:h-42 rounded-full overflow-hidden border-4 border-white/20 mb-2 sm:mb-4">
                    <img 
                      src="https://i.imgur.com/kg1PUbF.jpeg" 
                      alt="Prismatic Evolutions" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg text-white font-bold font-pokemon text-center">Prismatic Evolutions</h4>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-42 lg:h-42 rounded-full overflow-hidden border-4 border-white/20 mb-2 sm:mb-4">
                    <img 
                      src="https://i.imgur.com/KcbWdUK.jpeg" 
                      alt="Crown Zenith" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg text-white font-bold font-pokemon text-center">Crown Zenith</h4>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-42 lg:h-42 rounded-full overflow-hidden border-4 border-white/20 mb-2 sm:mb-4">
                    <img 
                      src="https://i.imgur.com/8UkvxtQ.jpeg" 
                      alt="Destined Rivals" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-sm sm:text-base lg:text-lg text-white font-bold font-pokemon text-center">Destined Rivals</h4>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-400 text-black rounded-xl p-3 sm:p-4 inline-block">
              <p className="font-bold font-pokemon text-sm sm:text-base">
                🎯 Three rounds: 10 packs per set, 30 total packs opened live!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CurrentSetSection;