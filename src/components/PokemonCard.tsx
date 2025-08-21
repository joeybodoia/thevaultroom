import React from 'react';
import { Star, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { PokemonCard as PokemonCardType } from '../types/pokemon';
import { supabase } from '../lib/supabase';

interface PokemonCardProps {
  pokemon: PokemonCardType;
  isPopular?: boolean;
  currentRoundId?: string | null;
  onBidSuccess?: () => void;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ 
  pokemon, 
  isPopular = false, 
  currentRoundId,
  onBidSuccess 
}) => {
  const [bidAmount, setBidAmount] = React.useState('');
  const [currentBid, setCurrentBid] = React.useState(parseFloat(((pokemon.ungraded_market_price || 0) * 0.01).toFixed(2))); // Default to 1% of market price
  const [isSubmittingBid, setIsSubmittingBid] = React.useState(false);
  const [bidError, setBidError] = React.useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = React.useState(false);
  const [loadingCurrentBid, setLoadingCurrentBid] = React.useState(false);

  // Fetch current highest bid when component mounts or round changes
  React.useEffect(() => {
    if (currentRoundId) {
      fetchCurrentBid();
    }
  }, [currentRoundId, pokemon.id]);

  const fetchCurrentBid = async () => {
    if (!currentRoundId) return;

    setLoadingCurrentBid(true);
    try {
      console.log('Fetching current bid for card:', pokemon.card_name, 'in round:', currentRoundId);
      
      const { data, error } = await supabase
        .from('direct_bids')
        .select('bid_amount')
        .eq('round_id', currentRoundId)
        .eq('card_id', pokemon.id)
        .order('bid_amount', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching current bid:', error);
        return;
      }

      if (data) {
        console.log('Found highest bid:', data.bid_amount);
        setCurrentBid(parseFloat(data.bid_amount));
      } else {
        console.log('No bids found, using default (1% of market price)');
        // Keep default 1% of market price if no bids exist
        const defaultBid = parseFloat(((pokemon.ungraded_market_price || 0) * 0.01).toFixed(2));
        setCurrentBid(defaultBid);
      }
    } catch (err: any) {
      console.error('Error fetching current bid:', err);
    } finally {
      setLoadingCurrentBid(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const handleBid = async () => {
    const amount = parseFloat(bidAmount);
    
    // Validation
    if (!amount || amount <= currentBid) {
      setBidError('Bid must be higher than current bid');
      return;
    }

    if (!currentRoundId) {
      setBidError('No active round found for this set');
      return;
    }

    setIsSubmittingBid(true);
    setBidError(null);
    setBidSuccess(false);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to place a bid');
      }

      // Insert bid into direct_bids table
      const { data, error } = await supabase
        .from('direct_bids')
        .insert([{
          user_id: user.id,
          round_id: currentRoundId,
          card_id: pokemon.id,
          bid_amount: amount
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Success - update UI
      setCurrentBid(amount);
      setBidAmount('');
      setBidSuccess(true);
      
      // Refresh current bid to make sure we have the latest
      fetchCurrentBid();
      
      // Call success callback if provided
      if (onBidSuccess) {
        onBidSuccess();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setBidSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error('Bid submission error:', err);
      setBidError(err.message || 'Failed to submit bid');
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const buyNowPrice = parseFloat(((pokemon.ungraded_market_price || 0) * 0.075).toFixed(2)); // 7.5% of market price for buy now

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
            alt={pokemon.card_name || 'Pokemon Card'}
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
          {pokemon.card_name || 'Unknown Pokemon'}
        </h3>
        <div className="space-y-1">
          <p className="text-sm text-gray-600 font-pokemon">
            {pokemon.set_name || 'Unknown Set'}
          </p>
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <span className="font-pokemon">{formatRarity(pokemon.rarity)}</span>
            <span>•</span>
            <span className="font-pokemon">{pokemon.card_number || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Bidding Section */}
      <div className="space-y-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-sm font-pokemon">Current Bid:</span>
            {loadingCurrentBid ? (
              <div className="flex items-center space-x-1 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span className="font-bold font-pokemon text-sm">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-600">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold font-pokemon">${currentBid}</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Enter bid"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-black placeholder-gray-400 focus:border-red-600 focus:outline-none font-pokemon"
              min={currentBid + 1}
              disabled={isSubmittingBid}
            />
            <button
              onClick={handleBid}
              disabled={!bidAmount || parseFloat(bidAmount) <= currentBid || isSubmittingBid}
              className="bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon"
            >
              {isSubmittingBid ? 'Bidding...' : 'Bid'}
            </button>
          </div>
          
          {/* Error Message */}
          {bidError && (
            <div className="mt-2 text-red-600 text-sm font-pokemon">
              {bidError}
            </div>
          )}
          
          {/* Success Message */}
          {bidSuccess && (
            <div className="mt-2 text-green-600 text-sm font-pokemon">
              Bid submitted successfully!
            </div>
          )}
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
            {formatPrice(pokemon.ungraded_market_price)}
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