import React, { useState, useEffect } from 'react';
import { Timer, Gift, Zap } from 'lucide-react';
import PriceRangeCard from './PriceRangeCard';

const BiddingSection: React.FC = () => {
  const [biddingTimeLeft, setBiddingTimeLeft] = useState({
    hours: 23,
    minutes: 45,
    seconds: 30
  });

  const priceRanges = [
    { range: '$1-10', buyNow: 25, color: 'bg-red-600' },
    { range: '$15-30', buyNow: 65, color: 'bg-black' },
    { range: '$35-50', buyNow: 110, color: 'bg-red-600' },
    { range: '$60-90', buyNow: 185, color: 'bg-black' },
    { range: '$100-150', buyNow: 320, color: 'bg-red-600' },
    { range: '$175-300', buyNow: 550, color: 'bg-black' },
    { range: '$350-500', buyNow: 850, color: 'bg-red-600' },
    { range: '$600-1000', buyNow: 1400, color: 'bg-black' },
    { range: '$1500-3000', buyNow: 2800, color: 'bg-red-600' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setBiddingTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section id="bidding" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 font-pokemon">
            Purchase a Product Experience
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 font-pokemon">
            Secure your price range now! Every purchase includes a guaranteed physical item 
            plus any cards that fall within your range during the live stream.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 inline-block mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Timer className="h-5 w-5 text-red-600" />
              <span className="text-black font-semibold font-pokemon">Bidding Closes In:</span>
            </div>
            <div className="flex items-center space-x-4">
              {[
                { label: 'Hours', value: biddingTimeLeft.hours },
                { label: 'Minutes', value: biddingTimeLeft.minutes },
                { label: 'Seconds', value: biddingTimeLeft.seconds }
              ].map((item, index) => (
                <React.Fragment key={item.label}>
                  <div className="text-center">
                    <div className="bg-red-600 text-white rounded-lg px-3 py-2 mb-1">
                      <span className="text-2xl font-bold">
                        {String(item.value).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-gray-600 text-xs uppercase">
                      {item.label}
                    </span>
                  </div>
                  {index < 2 && <span className="text-gray-600 text-2xl">:</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 mb-8">
          <div className="flex items-center justify-center space-x-8 mb-8">
            <div className="flex items-center space-x-2 text-red-600">
              <Gift className="h-5 w-5" />
              <span className="font-semibold">Guaranteed Physical Item</span>
            </div>
            <div className="flex items-center space-x-2 text-black">
              <Zap className="h-5 w-5" />
              <span className="font-semibold">Instant Digital Delivery</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {priceRanges.map((range, index) => (
              <PriceRangeCard
                key={index}
                range={range.range}
                buyNow={range.buyNow}
                color={range.color}
                isPopular={index === 4} // Make $100-150 popular
              />
            ))}
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm">
          <p className="mb-2">
            * All purchases include a guaranteed physical product (sticker, t-shirt, mousepad, etc.)
          </p>
          <p>
            ** Cards are valued using TCG Player ungraded near mint market price
          </p>
        </div>
      </div>
    </section>
  );
};

export default BiddingSection;