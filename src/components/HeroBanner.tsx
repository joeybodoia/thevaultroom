import React from 'react';

const HeroBanner: React.FC = () => {
  return (
    <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-yellow-400">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-1 sm:mb-1.5 lg:mb-1 font-brand leading-tight">
          <span className="block pb-[1px] sm:pb-0.5">Welcome to</span>
        </h1>
        
        <div className="flex justify-center mb-[1px] sm:mb-[6px] lg:mb-[6px]">
          <img 
            src="https://i.imgur.com/5ke3mJw.png" 
            alt="The Vault Room Logo" 
            className="h-32 sm:h-48 md:h-64 lg:h-96 w-auto max-w-full"
          />
        </div>
        
        <div className="text-center mb-16 sm:mb-20 lg:mb-24">
          <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-brand font-bold text-black leading-tight">
            dread&apos;s vault
          </span>
        </div>
        
        <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-black max-w-4xl mx-auto leading-relaxed font-pokemon px-2">
          <span className="font-bold text-red-600">Live Pokemon Card Opening Experience:</span> Pay a fixed entry fee to join our exclusive stream events! All participants receive equal site credits to bid on specific cards, enter lotteries, or participate in giveaways. Watch live as we open 30 packs total across three premium sets!
        </p>
      </div>
    </section>
  );
};

export default HeroBanner;
