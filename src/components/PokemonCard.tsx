import React from 'react';
import { Star, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { PokemonCard as PokemonCardType } from '../types/pokemon';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface SlotInfo {
  slotId: string;
  startingBid: number;
  minIncrement: number;
  locked: boolean;
  isActive: boolean;
  topBid: number;
}

interface PokemonCardProps {
  pokemon: PokemonCardType;
  isPopular?: boolean;
  slotInfo?: SlotInfo | null;
  slotLoading?: boolean;
  user: User | null;
  loadingUser: boolean;
  isBiddingOpen: boolean;
  onBidSuccess?: () => void;
}

const PokemonCard: React.FC<PokemonCardProps> = ({
  pokemon,
  isPopular = false,
  slotInfo = null,
  slotLoading = false,
  user,
  loadingUser,
  isBiddingOpen,
  onBidSuccess,
}) => {
  const [bidAmount, setBidAmount] = React.useState('');
  const [currentBid, setCurrentBid] = React.useState<number>(
    slotInfo ? slotInfo.topBid ?? slotInfo.startingBid ?? 0 : 0
  );
  const [isSubmittingBid, setIsSubmittingBid] = React.useState(false);
  const [bidError, setBidError] = React.useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = React.useState(false);
  const [confirmingBid, setConfirmingBid] = React.useState(false);

  React.useEffect(() => {
    if (slotInfo) {
      const next = slotInfo.topBid ?? slotInfo.startingBid ?? 0;
      setCurrentBid(Number(next));
    } else if (!slotLoading) {
      setCurrentBid(0);
    }
  }, [slotInfo, slotLoading]);

  const formatMoney = (n?: number | null) =>
    n == null ? 'N/A' : `$${Number(n).toFixed(2)}`;

  // Place a bid via RPC (handles debit + prior leader refund)
  const placeBid = async () => {
    const amount = parseFloat(bidAmount || '0');
    if (!slotInfo) {
      setBidError('This card is not listed as a Chase Slot for the current round.');
      return;
    }
    if (!user?.id) {
      setBidError('You must be logged in to bid.');
      return;
    }
    if (!amount || amount <= currentBid) {
      setBidError('Your bid must be higher than the current top bid.');
      return;
    }

    setIsSubmittingBid(true);
    setBidError(null);
    setBidSuccess(false);

    try {
      const { error } = await supabase.rpc('place_chase_bid_immediate_refund', {
        p_user_id: user.id,
        p_slot_id: slotInfo.slotId,
        p_amount: amount
      });
      if (error) throw error;
      setCurrentBid(amount);
      setBidAmount('');
      setBidSuccess(true);
      setConfirmingBid(false);
      onBidSuccess?.();
      setTimeout(() => setBidSuccess(false), 2500);
    } catch (err: any) {
      setBidError(err?.message || 'Failed to place bid.');
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const formatRarity = (rarity: string | null) =>
    rarity ? rarity.split(',')[0].trim() : 'Unknown Rarity';

  const showNotListedBanner = !slotLoading && !slotInfo;
  const slotLocked = Boolean(slotInfo?.locked) || !isBiddingOpen;
  const minBidRequirement = slotInfo
    ? Math.max(
        currentBid + (slotInfo.minIncrement || 1),
        slotInfo.startingBid ?? currentBid + (slotInfo.minIncrement || 1)
      )
    : 0;

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

      {/* Image */}
      <div className="aspect-square mb-3 sm:mb-4 bg-gray-100 rounded-lg overflow-hidden">
        {pokemon.image_url ? (
          <img
            src={pokemon.image_url}
            alt={pokemon.card_name || 'Pokemon Card'}
            className="w-full h-full object-contain bg-white"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.pexels.com/photos/1040173/pexels-photo-1040173.jpeg?auto=compress&cs=tinysrgb&w=400';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600 to-black">
            <span className="text-white font-pokemon text-lg">No Image</span>
          </div>
        )}
      </div>

      {/* Title */}
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

      {/* Current bid + input */}
      <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4">
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-xs sm:text-sm font-pokemon">Current Top Bid:</span>
            {slotLoading ? (
              <div className="flex items-center space-x-1 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                <span className="font-bold font-pokemon text-xs sm:text-sm">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-600">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold font-pokemon text-sm sm:text-base">
                  {formatMoney(currentBid)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            <input
              type="number"
              placeholder={
                slotInfo ? `≥ ${minBidRequirement.toFixed(2)}` : 'Not available'
              }
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black placeholder-gray-400 focus:border-red-600 focus:outline-none font-pokemon"
              min={slotInfo ? minBidRequirement : 0}
              disabled={isSubmittingBid || showNotListedBanner || slotLoading || slotLocked}
            />
            <div className="relative">
              {!confirmingBid ? (
                <button
                  onClick={() => setConfirmingBid(true)}
                  disabled={
                    !slotInfo ||
                    !user ||
                    !bidAmount ||
                    parseFloat(bidAmount) <= (currentBid || 0) ||
                    isSubmittingBid ||
                    loadingUser ||
                    slotLoading ||
                    slotLocked
                  }
                  className="w-full bg-black text-white px-2 py-1.5 rounded-md font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon text-xs"
                >
                  {loadingUser ? 'Loading...' : !user ? 'Login to Bid' : isSubmittingBid ? 'Bidding...' : 'Bid'}
                </button>
              ) : (
                <div className="absolute inset-0 z-10">
                  <div className="bg-white border border-gray-300 rounded-md shadow-lg p-2 flex flex-col space-y-2">
                    <div className="text-xs text-gray-700 font-pokemon">
                      Confirm bid of ${parseFloat(bidAmount || '0').toFixed(2)}?
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={placeBid}
                        className="flex-1 bg-black text-white px-2 py-1 rounded-md text-xs font-semibold font-pokemon hover:bg-gray-800"
                        disabled={isSubmittingBid}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingBid(false)}
                        className="flex-1 bg-gray-200 text-gray-800 px-2 py-1 rounded-md text-xs font-semibold font-pokemon hover:bg-gray-300"
                        disabled={isSubmittingBid}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showNotListedBanner && (
            <div className="mt-2 text-red-600 text-sm font-pokemon flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>This card is not listed as a Chase Slot for the current round.</span>
            </div>
          )}

          {bidError && (
            <div className="mt-2 text-red-600 text-sm font-pokemon">{bidError}</div>
          )}
          {bidSuccess && (
            <div className="mt-2 text-green-600 text-sm font-pokemon">Bid placed! You’re the leader (for now).</div>
          )}
          {slotLocked && !showNotListedBanner && (
            <div className="mt-2 text-red-600 text-sm font-pokemon flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Bidding is locked for this slot.</span>
            </div>
          )}
        </div>
      </div>

      {/* Market info */}
      <div className="pt-3 sm:pt-4 border-top border-gray-200 space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-xs sm:text-sm font-pokemon">
            Market Price (Ungraded NM):
          </span>
          <span className="text-black font-bold font-pokemon text-sm sm:text-base">
            {formatMoney(pokemon.ungraded_market_price)}
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
