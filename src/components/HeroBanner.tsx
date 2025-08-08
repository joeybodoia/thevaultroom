import React from 'react';

const HeroBanner: React.FC = () => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-yellow-400">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-black mb-8 font-pokemon">
          Welcome to The Vault Room
        </h1>
        
        <div className="flex justify-center mb-8">
          <img 
            src="https://i.imgur.com/5ke3mJw.png" 
            alt="The Vault Room Logo" 
            className="h-96 w-auto"
          />
        </div>
        
        <p className="text-xl md:text-2xl text-black max-w-4xl mx-auto leading-relaxed font-pokemon">
          <span className="font-bold text-red-600">Live Pokemon Card Opening Experience:</span> Three exciting rounds of pack openings! Choose between direct card bidding for high-value cards or enter the $1 lottery with rarity selection. Watch live as we open 30 packs total across three premium sets!
        </p>
      </div>
    </section>
  );
};

export default HeroBanner;