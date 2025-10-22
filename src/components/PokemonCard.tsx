import React from 'react';
import { Star, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { PokemonCard as PokemonCardType } from '../types/pokemon';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

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
  const [user, setUser] = React.useState<User | null>(null);
  const [loadingUser, setLoadingUser] = React.useState(true);
  const [userCredit, setUserCredit] = React.useState<number>(0);
  const [loadingCredit, setLoadingCredit] = React.useState(false);

  // Check user authentication status
  React.useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          await fetchUserCredit(user.id);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredit(session.user.id);
      } else {
        setUserCredit(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserCredit = async (userId: string) => {
    try {
      setLoadingCredit(true);
      const { data, error } = await supabase
        .from('users')
        .select('site_credit')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserCredit(parseFloat(data.site_credit || '0'));
    } catch (error) {
      console.error('Error fetching user credit:', error);
      setUserCredit(0);
    } finally {
      setLoadingCredit(false);
    }
  };

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
        .maybeSingle();

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

  const handleCreditBid = async () => {
    const amount = parseFloat(bidAmount);
    
    // Validation
    if (!amount || amount <= currentBid) {
      setBidError('Bid must be higher than current bid');
      return;
    }

    if (amount > userCredit) {
      setBidError(`Insufficient credits. You have $${userCredit.toFixed(2)} available.`);
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

      // Start transaction: deduct credits and place bid
      const { data: updatedUser, error: creditError } = await supabase
        .from('users')
        .update({ site_credit: userCredit - amount })
        .eq('id', user.id)
        .select('site_credit')
        .single();

      if (creditError) {
        throw new Error('Failed to deduct credits');
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
        // Rollback credit deduction if bid fails
        await supabase
          .from('users')
          .update({ site_credit: userCredit })
          .eq('id', user.id);
        throw error;
      }

      // Success - update UI
      setCurrentBid(amount);
      setBidAmount('');
      setBidSuccess(true);
      setUserCredit(parseFloat(updatedUser.site_credit));
      
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
      console.error('Credit bid submission error:', err);
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
    <div className={`relative bg-white rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-gray-300 transition-all hover:transform hover:scale-105 shadow-lg ${isPopular ? 'ring-2 ring-red-600' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-red-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
            <Star className="h-3 w-3" />
            <span>FEATURED</span>
          </div>
        </div>
      )}
      
      {/* Pokemon Image */}
      <div className="aspect-square mb-3 sm:mb-4 bg-gray-100 rounded-lg overflow-hidden">
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
      <div className="text-center mb-3 sm:mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-black font-pokemon mb-2">
          {pokemon.card_name || 'Unknown Pokemon'}
        </h3>
        <div className="space-y-1">
          <p className="text-xs sm:text-sm text-gray-600 font-pokemon">
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
      {user && !loadingCredit && (
        <div className="mb-3 sm:mb-4 bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 text-xs sm:text-sm font-pokemon">Available Credits:</span>
            <span className="text-blue-800 font-bold font-pokemon text-sm sm:text-base">${userCredit.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4">
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-xs sm:text-sm font-pokemon">Current Bid:</span>
            {loadingCurrentBid ? (
              <div className="flex items-center space-x-1 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span className="font-bold font-pokemon text-xs sm:text-sm">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-600">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold font-pokemon text-sm sm:text-base">${currentBid}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col space-y-2">
            <input
              type="number"
              placeholder="Enter bid"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black placeholder-gray-400 focus:border-red-600 focus:outline-none font-pokemon"
              min={currentBid + 1}
              disabled={isSubmittingBid}
            />
            <button
              onClick={handleBid}
              disabled={!user || !bidAmount || parseFloat(bidAmount) <= currentBid || isSubmittingBid || loadingUser}
              className="w-full bg-black text-white px-2 py-1.5 rounded-md font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon text-xs whitespace-nowrap overflow-hidden text-ellipsis"
            >
              {loadingUser ? 'Loading...' : !user ? 'Login to Bid' : isSubmittingBid ? 'Bidding...' : 'Bid'}
            </button>
          </div>
          
          {/* Credit Bid Button */}
          {user && userCredit > 0 && (
            <div className="mt-1.5">
              <button
                onClick={handleCreditBid}
                disabled={!bidAmount || parseFloat(bidAmount) <= currentBid || parseFloat(bidAmount) > userCredit || isSubmittingBid}
                className="w-full bg-blue-600 text-white px-2 py-1.5 rounded-md font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon text-xs"
              >
                {isSubmittingBid ? 'Processing...' : `Bid with Credits ($${userCredit.toFixed(2)} available)`}
              </button>
            </div>
          )}
          
          {/* Login Required Message */}
          {!loadingUser && !user && (
            <div className="mt-1.5 text-orange-600 text-xs font-pokemon">
              Please sign in to place a bid
            </div>
          )}
          
          {/* Error Message */}
          {bidError && (
            <div className="mt-1.5 text-red-600 text-xs font-pokemon">
              {bidError}
            </div>
          )}
          
          {/* Success Message */}
          {bidSuccess && (
            <div className="mt-1.5 text-green-600 text-xs font-pokemon">
              Bid submitted successfully!
            </div>
          )}
        </div>
      </div>

      {/* Buy Now Option */}
      <div className="mb-3 sm:mb-4">
        <button 
          disabled={!user || loadingUser}
          className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center space-x-2 font-pokemon disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <DollarSign className="h-4 w-4" />
          <span>{loadingUser ? 'Loading...' : !user ? 'Login to Buy Now' : `Buy Now - $${buyNowPrice}`}</span>
        </button>
        {!loadingUser && !user ? (
          <p className="text-orange-600 text-xs text-center mt-1.5 font-pokemon">
            Please sign in to purchase
          </p>
        ) : (
          <p className="text-gray-400 text-xs text-center mt-1.5 font-pokemon">
            Secure your slot for this Pokemon
          </p>
        )}
      </div>

      {/* Market Info */}
      <div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-xs sm:text-sm font-pokemon">Market Price (Ungraded NM):</span>
          <span className="text-black font-bold font-pokemon text-sm sm:text-base">
            {formatPrice(pokemon.ungraded_market_price)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-xs sm:text-sm font-pokemon flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Last Updated:</span>
          </span>
          <span className="text-black font-semibold font-pokemon text-xs sm:text-sm">
            {pokemon.date_updated ? new Date(pokemon.date_updated).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PokemonCard;