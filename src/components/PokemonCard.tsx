import React from 'react';
import { Star, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { PokemonCard as PokemonCardType } from '../types/pokemon';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface PokemonCardProps {
  pokemon: PokemonCardType;            // from all_cards
  isPopular?: boolean;
  currentRoundId?: string | null;      // rounds.id of the active set
  onBidSuccess?: () => void;
}

type RoundRow = {
  id: string;
  stream_id: string;
  set_name: string;
  locked: boolean;
};

type ChaseSlot = {
  id: string;
  stream_id: string;
  set_name: string;
  all_card_id: string;
  starting_bid: number | null;
  min_increment: number | null;
  is_active: boolean;
  locked: boolean;
  winner_user_id: string | null;
  winning_bid_id: string | null;
};

const DEBUG = false;

/** ---------- small helpers ---------- */
const isUUID = (v?: string | null) =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const isNetworkFailedToFetch = (e: any) =>
  e?.name === 'TypeError' && /Failed to fetch/i.test(String(e?.message));

async function withNetRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isNetworkFailedToFetch(e)) {
      await new Promise(r => setTimeout(r, 400));
      return await fn();
    }
    throw e;
  }
}
/** ----------------------------------- */

const PokemonCard: React.FC<PokemonCardProps> = ({
  pokemon,
  isPopular = false,
  currentRoundId,
  onBidSuccess
}) => {
  const [bidAmount, setBidAmount] = React.useState('');
  const [currentBid, setCurrentBid] = React.useState<number>(0);
  const [isSubmittingBid, setIsSubmittingBid] = React.useState(false);
  const [bidError, setBidError] = React.useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = React.useState(false);

  const [loadingTopBid, setLoadingTopBid] = React.useState(false);
  const [loadingSlot, setLoadingSlot] = React.useState(false);
  const [roundRow, setRoundRow] = React.useState<RoundRow | null>(null);
  const [slot, setSlot] = React.useState<ChaseSlot | null>(null);

  const [user, setUser] = React.useState<User | null>(null);
  const [loadingUser, setLoadingUser] = React.useState(true);
  const [userCredit, setUserCredit] = React.useState<number>(0);
  const [loadingCredit, setLoadingCredit] = React.useState(false);

  // auth + credit
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(user);
        if (user?.id) await fetchUserCredit(user.id);
      } catch {
        setUser(null);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) await fetchUserCredit(session.user.id);
      else setUserCredit(0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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
      setUserCredit(parseFloat(String(data?.site_credit ?? 0)));
    } catch {
      setUserCredit(0);
    } finally {
      setLoadingCredit(false);
    }
  };

  // Resolve the current round row (guard on UUID, cancel on unmount)
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      // guard: only query when we actually have a plausible UUID
      if (!isUUID(currentRoundId)) {
        setRoundRow(null);
        setSlot(null);
        setCurrentBid(0);
        return;
      }

      try {
        const res = await withNetRetry(() =>
          supabase
            .from('rounds')
            .select('id, stream_id, set_name, locked')
            .eq('id', currentRoundId as string)
            .single()
        );
        if (cancelled) return;
        setRoundRow(res.data as RoundRow);
      } catch (err) {
        if (DEBUG) console.debug('round fetch error', err);
        if (!cancelled) setRoundRow(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentRoundId]);

  // Find the chase slot for THIS card and THIS round’s stream/set
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!roundRow) {
        setSlot(null);
        setCurrentBid(0);
        return;
      }

      setLoadingSlot(true);
      try {
        const slotRes = await withNetRetry(() =>
          supabase
            .from('chase_slots')
            .select('id, stream_id, set_name, all_card_id, starting_bid, min_increment, is_active, locked, winner_user_id, winning_bid_id')
            .eq('stream_id', roundRow.stream_id)
            .eq('set_name', roundRow.set_name)
            .eq('all_card_id', pokemon.id)
            .maybeSingle()
        );

        if (cancelled) return;

        const slotRow = (slotRes.data || null) as ChaseSlot | null;

        if (!slotRow) {
          setSlot(null);
          setCurrentBid(0);
          if (DEBUG) {
            console.debug('No slot for', {
              stream_id: roundRow.stream_id,
              set_name: roundRow.set_name,
              all_card_id: pokemon.id,
              card_name: pokemon.card_name
            });
          }
          return;
        }

        setSlot(slotRow);

        // fetch current top bid (retry once on network error)
        setLoadingTopBid(true);
        try {
          const topRes = await withNetRetry(() =>
            supabase
              .from('chase_bids')
              .select('amount')
              .eq('slot_id', slotRow.id)
              .order('amount', { ascending: false })
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle()
          );
          if (cancelled) return;
          const top = (topRes.data || null) as { amount: number } | null;
          if (top?.amount != null) {
            setCurrentBid(Number(top.amount));
          } else {
            setCurrentBid(Number(slotRow.starting_bid ?? 0));
          }
        } catch (e) {
          if (DEBUG) console.debug('top bid fetch error', e);
          if (!cancelled) setCurrentBid(Number(slotRow.starting_bid ?? 0));
        } finally {
          if (!cancelled) setLoadingTopBid(false);
        }
      } catch (e) {
        if (DEBUG) console.debug('slot fetch error', e);
        if (!cancelled) {
          setSlot(null);
          setCurrentBid(0);
        }
      } finally {
        if (!cancelled) setLoadingSlot(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roundRow, pokemon.id]);

  const formatMoney = (n?: number | null) =>
    n == null ? 'N/A' : `$${Number(n).toFixed(2)}`;

  // Place a bid via RPC (handles debit + prior leader refund)
  const placeBid = async () => {
    const amount = parseFloat(bidAmount || '0');
    if (!slot) {
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
        p_slot_id: slot.id,
        p_amount: amount
      });
      if (error) throw error;

      // refresh top bid after placing
      try {
        const topRes = await withNetRetry(() =>
          supabase
            .from('chase_bids')
            .select('amount')
            .eq('slot_id', slot.id)
            .order('amount', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
        );
        const top = (topRes.data || null) as { amount: number } | null;
        if (top?.amount != null) setCurrentBid(Number(top.amount));
      } catch {
        // if refresh fails, at least set to user amount
        setCurrentBid(amount);
      }

      setBidAmount('');
      setBidSuccess(true);
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

  const showNotListedBanner = Boolean(roundRow) && slot === null;

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
            {loadingTopBid || loadingSlot ? (
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
              placeholder="Enter bid"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-2 py-1.5 text-sm text-black placeholder-gray-400 focus:border-red-600 focus:outline-none font-pokemon"
              min={(currentBid || 0) + 1}
              disabled={isSubmittingBid || showNotListedBanner}
            />
            <button
              onClick={placeBid}
              disabled={!user || !bidAmount || parseFloat(bidAmount) <= (currentBid || 0) || isSubmittingBid || loadingUser || showNotListedBanner}
              className="w-full bg-black text-white px-2 py-1.5 rounded-md font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon text-xs"
            >
              {loadingUser ? 'Loading...' : !user ? 'Login to Bid' : isSubmittingBid ? 'Bidding...' : 'Bid'}
            </button>
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

      {DEBUG && (
        <pre className="mt-3 text-[10px] text-gray-500 whitespace-pre-wrap">
          {JSON.stringify({ roundRow, slotId: slot?.id, lookups: {
            stream_id: roundRow?.stream_id,
            set_name: roundRow?.set_name,
            all_card_id: pokemon.id
          } }, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default PokemonCard;


