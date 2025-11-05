import React from 'react';
import { Star, TrendingUp, Calendar, Info } from 'lucide-react';
import { PokemonCard as PokemonCardType } from '../types/pokemon';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface PokemonCardProps {
  pokemon: PokemonCardType;        // row from all_cards
  isPopular?: boolean;
  currentRoundId?: string | null;  // used to resolve stream/set → chase_slots
  onBidSuccess?: () => void;
}

interface RoundRow {
  id: string;
  stream_id: string | null;
  set_name: string;
  locked: boolean;
}

interface SlotRow {
  id: string;
  starting_bid: number;
  min_increment: number;
  locked: boolean;
}

const PokemonCard: React.FC<PokemonCardProps> = ({
  pokemon,
  isPopular = false,
  currentRoundId,
  onBidSuccess
}) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loadingUser, setLoadingUser] = React.useState(true);

  const [userCredit, setUserCredit] = React.useState<number>(0);
  const [loadingCredit, setLoadingCredit] = React.useState(false);

  const [roundRow, setRoundRow] = React.useState<RoundRow | null>(null);

  const [slot, setSlot] = React.useState<SlotRow | null>(null);
  const [slotId, setSlotId] = React.useState<string | null>(null);
  const [slotLoading, setSlotLoading] = React.useState(false);
  const [slotError, setSlotError] = React.useState<string | null>(null);

  const [currentBid, setCurrentBid] = React.useState<number>(0);
  const [loadingCurrentBid, setLoadingCurrentBid] = React.useState(false);

  const [bidAmount, setBidAmount] = React.useState('');
  const [isSubmittingBid, setIsSubmittingBid] = React.useState(false);
  const [bidError, setBidError] = React.useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = React.useState(false);

  // ----------------- Auth & Credit -----------------
  React.useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user ?? null);
        if (user?.id) await fetchUserCredit(user.id);
      } finally {
        setLoadingUser(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u?.id) await fetchUserCredit(u.id);
      else setUserCredit(0);
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
      setUserCredit(parseFloat((data?.site_credit ?? 0) as any));
    } catch {
      setUserCredit(0);
    } finally {
      setLoadingCredit(false);
    }
  };

  // ----------------- Round → Slot resolution -----------------
  React.useEffect(() => {
    if (!currentRoundId) {
      setRoundRow(null);
      setSlot(null);
      setSlotId(null);
      setCurrentBid(0);
      return;
    }
    void resolveRoundAndSlot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundId, pokemon.id]);

  const resolveRoundAndSlot = async () => {
    setSlotLoading(true);
    setSlotError(null);
    try {
      // 1) Get the round to learn stream_id & set_name
      const { data: rnd, error: rndErr } = await supabase
        .from('rounds')
        .select('id, stream_id, set_name, locked')
        .eq('id', currentRoundId)
        .single();

      if (rndErr || !rnd) {
        setRoundRow(null);
        throw new Error('No active round found for this set');
      }
      setRoundRow(rnd as RoundRow);

      // 2) Find the chase slot for this card within the stream+set
      const { data: slotRow, error: slotErr } = await supabase
        .from('chase_slots')
        .select('id, starting_bid, min_increment, locked')
        .eq('stream_id', rnd.stream_id)
        .eq('set_name', rnd.set_name)
        .eq('all_card_id', pokemon.id)
        .maybeSingle();

      if (slotErr) throw slotErr;
      if (!slotRow) {
        setSlot(null);
        setSlotId(null);
        setCurrentBid(0);
        setSlotError('This card is not listed as a Chase Slot for the current round.');
        return;
      }

      setSlot(slotRow as SlotRow);
      setSlotId(slotRow.id as string);

      // 3) Current leader (via view)
      await fetchCurrentLeader(slotRow.id as string, slotRow as SlotRow);
    } catch (e: any) {
      setSlotError(e?.message || 'Failed to resolve Chase Slot');
    } finally {
      setSlotLoading(false);
    }
  };

  const fetchCurrentLeader = async (slotIdLocal: string, slotLocal?: SlotRow | null) => {
    setLoadingCurrentBid(true);
    try {
      const { data, error } = await supabase
        .from('chase_slot_leaders')
        .select('top_bid')
        .eq('slot_id', slotIdLocal)
        .maybeSingle();

      if (error) throw error;

      const top = data?.top_bid ?? null;
      if (top != null) {
        setCurrentBid(Number(top));
      } else {
        // If no bids yet, show 0 (and enforce min at starting_bid in the UI/validation)
        setCurrentBid(0);
      }
    } catch {
      // Fallback to 0 if view not found/empty
      setCurrentBid(0);
    } finally {
      setLoadingCurrentBid(false);
    }
  };

  // ----------------- Bid handler (RPC) -----------------
  const handleBid = async () => {
    setBidError(null);

    if (!user) {
      setBidError('Please sign in to place a bid.');
      return;
    }
    if (!slotId || !slot) {
      setBidError('This card is not available as a Chase Slot for the current round.');
      return;
    }
    if (slot.locked || roundRow?.locked) {
      setBidError('Bidding is closed for this slot.');
      return;
    }

    const amount = Number(bidAmount);
    if (!amount || Number.isNaN(amount)) {
      setBidError('Enter a valid bid amount.');
      return;
    }

    // Enforce min rules on the client (server enforces again)
    const minAllowed = Math.max(
      slot.starting_bid,
      (currentBid > 0 ? currentBid + slot.min_increment : slot.starting_bid)
    );
    if (amount < minAllowed) {
      setBidError(
        `Your bid must be at least $${minAllowed.toFixed(2)} (top $${currentBid.toFixed(2)} + min inc $${slot.min_increment.toFixed(2)}).`
      );
      return;
    }

    setIsSubmittingBid(true);
    setBidSuccess(false);

    try {
      const { error } = await supabase.rpc('place_chase_bid_immediate_refund', {
        p_user_id: user.id,
        p_slot_id: slotId,
        p_amount: amount
      });

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('insufficient credits')) {
          setBidError('Insufficient credits for this bid.');
        } else if (msg.includes('minimum bid')) {
          setBidError(`Minimum bid is $${slot.starting_bid.toFixed(2)}.`);
        } else if (msg.includes('increment')) {
          setBidError(
            `Your bid must be at least $${(currentBid + slot.min_increment).toFixed(2)}.`
          );
        } else if (msg.includes('closed')) {
          setBidError('Bidding is closed for this slot.');
        } else {
          setBidError(error.message);
        }
        return;
      }

      // Success
      setBidAmount('');
      setBidSuccess(true);
      // Refresh current leader & user credit (RPC already handled funds)
      await Promise.all([
        fetchCurrentLeader(slotId, slot),
        user?.id ? fetchUserCredit(user.id) : Promise.resolve()
      ]);

      if (onBidSuccess) onBidSuccess();
      setTimeout(() => setBidSuccess(false), 2500);
    } catch (e: any) {
      setBidError(e?.message || 'Failed to place bid.');
    } finally {
      setIsSubmittingBid(false);
    }
  };

  // ----------------- Helpers -----------------
  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return 'N/A';
    return `$${Number(price).toFixed(2)}`;
    };

  const formatRarity = (rarity: string | null) => {
    if (!rarity) return 'Unknown Rarity';
    return rarity.split(',')[0].trim();
  };

  const nextMinPlaceholder = (() => {
    if (!slot) return 'Enter bid';
    const baseline = currentBid > 0 ? currentBid + slot.min_increment : slot.starting_bid;
    return `≥ ${baseline.toFixed(2)}`;
  })();

  const biddingDisabled =
    loadingUser || slotLoading || loadingCurrentBid || !user || !slotId || !slot || slot.locked || roundRow?.locked;

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
          // eslint-disable-next-line @next/next/no-img-element
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

      {/* Title / Meta */}
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

      {/* Slot state / credit */}
      <div className="space-y-2 mb-3 sm:mb-4">
        {slotId && slot && (
          <div className="rounded-lg p-2 bg-gray-50 border border-gray-200 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-gray-700 font-pokemon">
              <Info className="h-4 w-4" />
              <span>Starting:</span>
              <span className="font-bold">${slot.starting_bid.toFixed(2)}</span>
            </div>
            <div className="text-gray-700 font-pokemon">
              Min inc: <span className="font-bold">${slot.min_increment.toFixed(2)}</span>
            </div>
            <div className={`font-pokemon ${slot.locked ? 'text-red-600 font-semibold' : 'text-green-700'}`}>
              {slot.locked ? 'Locked' : 'Open'}
            </div>
          </div>
        )}

        {user && !loadingCredit && (
          <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 text-xs sm:text-sm font-pokemon">Available Credits:</span>
              <span className="text-blue-800 font-bold font-pokemon text-sm sm:text-base">${userCredit.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bidding */}
      <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4">
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-xs sm:text-sm font-pokemon">Current Top Bid:</span>
            {loadingCurrentBid ? (
              <div className="flex items-center space-x-1 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span className="font-bold font-pokemon text-xs sm:text-sm">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-600">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold font-pokemon text-sm sm:text-base">
                  {currentBid > 0 ? `$${currentBid.toFixed(2)}` : '—'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            <input
              type="number"
              placeholder={nextMinPlaceholder}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black placeholder-gray-400 focus:border-red-600 focus:outline-none font-pokemon"
              disabled={isSubmittingBid || biddingDisabled}
              min={0}
              step="0.01"
            />
            <button
              onClick={handleBid}
              disabled={isSubmittingBid || biddingDisabled || !bidAmount}
              className="w-full bg-black text-white px-2 py-1.5 rounded-md font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon text-xs whitespace-nowrap overflow-hidden text-ellipsis"
            >
              {loadingUser
                ? 'Loading...'
                : !user
                ? 'Login to Bid'
                : isSubmittingBid
                ? 'Bidding...'
                : 'Bid'}
            </button>
            {slotError && (
              <p className="text-xs text-red-600 font-pokemon">{slotError}</p>
            )}
            {roundRow?.locked && (
              <p className="text-xs text-red-600 font-pokemon">This round is locked.</p>
            )}
          </div>
        </div>

        {bidError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm font-pokemon">{bidError}</p>
          </div>
        )}
        {bidSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-600 text-sm font-pokemon">
              Bid placed! If you’re later outbid, your credits are refunded automatically.
            </p>
          </div>
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
