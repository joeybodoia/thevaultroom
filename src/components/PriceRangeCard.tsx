// import React, { useState } from 'react';
// import { TrendingUp, Zap, Star } from 'lucide-react';
// import CryptoPaymentModal from './CryptoPaymentModal';

// interface PriceRangeCardProps {
//   range: string;
//   buyNow: number;
//   color: string;
//   isPopular?: boolean;
// }
 
// const PriceRangeCard: React.FC<PriceRangeCardProps> = ({ 
//   range, 
//   buyNow, 
//   color, 
//   isPopular = false 
// }) => {
//   const [currentBid, setCurrentBid] = useState(Math.floor(buyNow * 0.6));
//   const [bidAmount, setBidAmount] = useState('');
//   const [showCryptoModal, setShowCryptoModal] = useState(false);

//   const handleBid = () => {
//     const amount = parseFloat(bidAmount);
//     if (amount > currentBid) {
//       setCurrentBid(amount);
//       setBidAmount('');
//     }
//   };

//   const handleCryptoPurchase = () => {
//     setShowCryptoModal(true);
//   };

//   return (
//     <>
//     <div className={`relative bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all hover:transform hover:scale-105 shadow-lg ${isPopular ? 'ring-2 ring-red-600' : ''}`}>
//       {isPopular && (
//         <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
//           <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
//             <Star className="h-3 w-3" />
//             <span>MOST POPULAR</span>
//           </div>
//         </div>
//       )}
      
//       <div className="text-center mb-4">
//         <div className={`${color} rounded-lg p-4 mb-3`}>
//           <span className="text-2xl font-bold text-white font-pokemon">{range}</span>
//         </div>
//         <p className="text-gray-600 text-sm font-pokemon">Card Value Range</p>
//       </div>

//       <div className="space-y-4">
//         <div className="bg-gray-50 rounded-lg p-4">
//           <div className="flex items-center justify-between mb-2">
//             <span className="text-gray-700 text-sm font-pokemon">Current Bid:</span>
//             <div className="flex items-center space-x-1 text-red-600">
//               <TrendingUp className="h-4 w-4" />
//               <span className="font-bold font-pokemon">${currentBid}</span>
//             </div>
//           </div>
          
//           <div className="flex space-x-2">
//             <input
//               type="number"
//               placeholder="Bid amount"
//               value={bidAmount}
//               onChange={(e) => setBidAmount(e.target.value)}
//               className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-black placeholder-gray-400 focus:border-red-600 focus:outline-none"
//               min={currentBid + 1}
//             />
//             <button
//               onClick={handleBid}
//               disabled={!bidAmount || parseFloat(bidAmount) <= currentBid}
//               className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon"
//             >
//               Bid
//             </button>
//           </div>
//         </div>

//         <div className="border-t border-gray-200 pt-4">
//           <div className="space-y-2">
//             <button className={`w-full ${color} text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center space-x-2 font-pokemon`}>
//               <Zap className="h-4 w-4" />
//               <span>Buy Now - ${buyNow}</span>
//             </button>
//             <button 
//               onClick={handleCryptoPurchase}
//               className="w-full bg-yellow-400 text-black font-bold py-2 rounded-lg hover:bg-yellow-500 transition-all flex items-center justify-center space-x-2 font-pokemon text-sm"
//             >
//               <span>Pay with Crypto</span>
//             </button>
//           </div>
//           <p className="text-gray-400 text-xs text-center mt-2 font-pokemon">
//             Includes guaranteed physical item
//           </p>
//         </div>
//       </div>

//       <div className="mt-4 pt-4 border-t border-gray-200">
//         <div className="grid grid-cols-2 gap-4 text-center">
//           <div>
//             <span className="text-gray-600 text-xs block font-pokemon">Participants</span>
//             <span className="text-black font-semibold font-pokemon">{Math.floor(Math.random() * 50) + 10}</span>
//           </div>
//           <div>
//             <span className="text-gray-600 text-xs block font-pokemon">Time Left</span>
//             <span className="text-black font-semibold font-pokemon">23h 45m</span>
//           </div>
//         </div>
//       </div>
//     </div>
    
//     <CryptoPaymentModal
//       isOpen={showCryptoModal}
//       onClose={() => setShowCryptoModal(false)}
//       priceRange={range}
//       usdAmount={buyNow}
//     />
//     </>
//   );
// };

// export default PriceRangeCard;