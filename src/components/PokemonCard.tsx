import React from 'react';
import { Star, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { PokemonCard as PokemonCardType } from '../types/pokemon';

interface PokemonCardProps {
  pokemon: PokemonCardType;
  isPopular?: boolean;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, isPopular = false }) => {
  const [bidAmount, setBidAmount] = React.useState('');
  const [currentBid, setCurrentBid] = React.useState(parseFloat(((pokemon.price || 0) * 0.01).toFixed(2))); // Start at 1% of market price

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const handleBid = () => {
    const amount = parseFloat(bidAmount);
    if (amount > currentBid) {
      setCurrentBid(amount);
      setBidAmount('');
      // Here you would typically send the bid to your backend
    }
  };

  const buyNowPrice = parseFloat(((pokemon.price || 0) * 0.075).toFixed(2)); // 7.5% of market price for buy now

  const formatRarity = (rarity: string | null) => {
    if (!rarity) return 'Unknown Rarity';
    return rarity.split(',')[0].trim();
  };

  return (
    <div className={`relative bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all hover:transform hover:scale-105 shadow-lg ${isPopular ? 'ring-2 ring-red-600' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
            <Star className="h-3 w-3" />
            <span>FEATURED</span>
          </div>
        </div>
      )}
      
      {/* Pokemon Image */}
      <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
        {pokemon.image_url ? (
          <img 
            src={pokemon.image_url} 
            alt={pokemon.name || 'Pokemon Card'}
            className="w-full h-full object-contain bg-white"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.pexels.com/photos/1040173/pexels-photo-1040173.jpeg?auto=compress&cs=tinysrgb&w=400';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600 to-black">
            <span className="text-white font-pokemon text-lg">No Image</span>
          </div>
        )}
      </div>

      {/* Pokemon Name */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-black font-pokemon mb-2">
          {pokemon.name || 'Unknown Pokemon'}
        </h3>
        <div className="space-y-1">
          <p className="text-sm text-gray-600 font-pokemon">
            {pokemon.set_name || 'Unknown Set'}
          </p>
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <span className="font-pokemon">{formatRarity(pokemon.rarity)}</span>
            <span>•</span>
            <span className="font-pokemon">{pokemon.card_num || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Bidding Section */}
      <div className="space-y-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-sm font-pokemon">Current Bid:</span>
            <div className="flex items-center space-x-1 text-red-600">
              <TrendingUp className="h-4 w-4" />
              <span className="font-bold font-pokemon">${currentBid}</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Enter bid"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-black placeholder-gray-400 focus:border-red-600 focus:outline-none font-pokemon"
              min={currentBid + 1}
            />
            <button
              onClick={handleBid}
              disabled={!bidAmount || parseFloat(bidAmount) <= currentBid}
              className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon"
            >
              Bid
            </button>
          </div>
        </div>
      </div>

      {/* Buy Now Option */}
      <div className="mb-4">
        <button className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center space-x-2 font-pokemon">
          <DollarSign className="h-4 w-4" />
          <span>Buy Now - ${buyNowPrice}</span>
        </button>
        <p className="text-gray-400 text-xs text-center mt-1 font-pokemon">
          Secure your slot for this Pokemon
        </p>
      </div>

      {/* Market Info */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm font-pokemon">Market Price (Ungraded NM):</span>
          <span className="text-black font-bold font-pokemon">
            {formatPrice(pokemon.price)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm font-pokemon flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Last Updated:</span>
          </span>
          <span className="text-black font-semibold font-pokemon text-sm">
            {pokemon.date_updated ? new Date(pokemon.date_updated).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PokemonCard;