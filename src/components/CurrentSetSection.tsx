import React from 'react';
import { Sparkles, Package, Star } from 'lucide-react';

const CurrentSetSection: React.FC = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 to-pink-600">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="h-8 w-8 text-yellow-300" />
            <h2 className="text-3xl md:text-4xl font-bold text-white font-pokemon">
              Current Sets
            </h2>
            <Sparkles className="h-8 w-8 text-yellow-300" />
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="mb-6">
              <p className="text-xl text-white/90 font-pokemon mb-8">
                Three premium Pokémon TCG sets featuring the most sought-after cards
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-42 h-42 rounded-full overflow-hidden border-4 border-white/20 mb-4">
                    <img 
                      src="https://i.imgur.com/kg1PUbF.jpeg" 
                      alt="Prismatic Evolutions" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-white font-bold font-pokemon">Prismatic Evolutions</h4>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-42 h-42 rounded-full overflow-hidden border-4 border-white/20 mb-4">
                    <img 
                      src="https://i.imgur.com/KcbWdUK.jpeg" 
                      alt="Crown Zenith" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-white font-bold font-pokemon">Crown Zenith</h4>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-42 h-42 rounded-full overflow-hidden border-4 border-white/20 mb-4">
                    <img 
                      src="https://i.imgur.com/8UkvxtQ.jpeg" 
                      alt="Destined Rivals" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-white font-bold font-pokemon">Destined Rivals</h4>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-400 text-black rounded-xl p-4 inline-block">
              <p className="font-bold font-pokemon">
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