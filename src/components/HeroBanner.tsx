import React from 'react';
import { Instagram } from 'lucide-react';

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
        
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-brand font-bold text-black leading-tight">
            dread&apos;s vault
          </span>
        </div>

        <div className="mb-10 sm:mb-14 lg:mb-16 flex items-center justify-center space-x-6 sm:space-x-8">
          <a
            href="https://discord.gg/dreads-vault"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center w-[4.2rem] h-[4.2rem] sm:w-[4.8rem] sm:h-[4.8rem] rounded-full bg-black text-yellow-400 hover:scale-105 transition-transform"
            aria-label="Join us on Discord"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 245 240"
              className="w-10 h-10 sm:w-11 sm:h-11"
              fill="currentColor"
            >
              <path d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1Zm36.2 0c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1s-4.5-11.1-10.2-11.1Z" />
              <path d="M189.5 20h-134C41 20 30 31 30 44.6v131c0 13.6 11 24.6 24.5 24.6h113.4l-5.3-18.5 12.8 11.8 12.1 11.1 21.5 19V44.6c0-13.6-11-24.6-24.5-24.6Zm-38.6 135.4s-3.6-4.3-6.6-8c13.1-3.7 18.1-11.8 18.1-11.8-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.4-14.5 4.3-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.6-14.7-4.3-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 7.9 17.5 11.7c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.8c10.7-4.7 19.2-5.9 22.7-6.2.6-.1 1.1-.2 1.7-.2 6-0.8 12.8-1 19.9-.2 9.4 1.1 19.5 3.9 29.8 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0 0-8.5 14.5-30.6 15.2Z" />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/dreadsvault/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center w-[4.2rem] h-[4.2rem] sm:w-[4.8rem] sm:h-[4.8rem] rounded-full bg-black text-yellow-400 hover:scale-105 transition-transform"
            aria-label="Follow us on Instagram"
          >
            <Instagram className="w-10 h-10 sm:w-11 sm:h-11" />
          </a>
        </div>
        
        <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-black max-w-4xl mx-auto leading-relaxed font-pokemon px-2">
          <span className="font-bold text-red-600">Live Pokemon Card Opening Experience:</span> Pay a fixed entry fee to join our exclusive stream events! All participants receive equal site credits to bid on specific cards, enter lotteries, or participate in giveaways. Watch live as we open 30 packs total across three premium sets!
        </p>
      </div>
    </section>
  );
};

export default HeroBanner;
