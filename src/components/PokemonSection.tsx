import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Sparkles, Search, Filter, ArrowUpDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DirectBidCard, PokemonCard as PokemonCardType } from '../types/pokemon';
import PokemonCard from './PokemonCard';
import type { User } from '@supabase/supabase-js';

type SetName = 'prismatic' | 'crown_zenith' | 'destined_rivals';
type BiddingMode = 'direct' | 'lottery' | 'singles';
type LotterySetName = 'prismatic' | 'crown_zenith' | 'destined_rivals';

interface Round {
  id: string;
  stream_id: string | null;
  set_name: string;
  round_number: number;
  packs_opened: number;
  locked: boolean;
  created_at: string;
}

interface LiveSingle {
  id: string;
  stream_id: string | null;
  card_name: string;
  card_number: string | null;
  card_condition: string | null;
  set_name: string | null;
  image_url: string | null;
  starting_bid: number;
  min_increment: number;
  buy_now: number | null;
  ungraded_market_price: number | null;
  psa_10_price: number | null;
  is_active: boolean;
  created_at: string;
}

interface LiveSingleLeaderRow {
  card_id: string;
  top_bid: number | null;
}

interface PokemonSectionProps {
  currentStreamId?: string | null;
}

/** ----------------- CONSTANTS / HELPERS ----------------- */
const PACKS = Array.from({ length: 10 }, (_, i) => i + 1);

const RARITIES = {
  prismatic: ['SIR', 'Masterball Pattern', 'Ultra Rare', 'Pokeball Pattern'],
  crown_zenith: [
    'Secret Rare (includes Pikachu)',
    'Ultra Rare (Non Galarian Gallery)',
    'Ultra Rare (Galarian Gallery)',
  ],
  destined_rivals: [
    'SIR / Hyper Rare',
    'IR',
    'Ultra Rare / Double Rare',
  ],
} as const;

type SetKey = keyof typeof RARITIES;

/** Map UI tabs -> DB set_name used for rounds/chase_slots */
const SET_DB_NAME: Record<SetName, string> = {
  prismatic: 'SV: Prismatic Evolutions',
  crown_zenith: 'Crown Zenith: Galarian Gallery',
  destined_rivals: 'SV10: Destined Rivals',
};

function rarityBg(rarity: string) {
  if (rarity.startsWith('SIR')) return 'bg-pink-600 hover:bg-pink-700';
  if (rarity.includes('Masterball')) return 'bg-purple-600 hover:bg-purple-700';
  if (rarity.includes('Pokeball')) return 'bg-red-600 hover:bg-red-700';
  if (rarity.includes('Secret Rare')) return 'bg-yellow-500 hover:bg-yellow-600';
  if (rarity.includes('Galarian Gallery')) return 'bg-indigo-600 hover:bg-indigo-700';
  if (rarity.includes('Non Galarian')) return 'bg-blue-600 hover:bg-blue-700';
  if (rarity === 'IR') return 'bg-green-600 hover:bg-green-700';
  if (rarity.includes('Hyper Rare')) return 'bg-yellow-500 hover:bg-yellow-600';
  if (rarity.includes('Double Rare')) return 'bg-blue-600 hover:bg-blue-700';
  return 'bg-blue-600 hover:bg-blue-700';
}
/** -------------------------------------------------------- */

const PokemonSection: React.FC<PokemonSectionProps> = ({ currentStreamId }) => {
  const [activeTab, setActiveTab] = useState<SetName>('prismatic');
  const [biddingMode, setBiddingMode] = useState<BiddingMode>('direct'); // 'direct' (Chase Slots) | 'lottery' | 'singles'
  const [lotteryActiveTab, setLotteryActiveTab] = useState<LotterySetName>('prismatic');
  const [allCards, setAllCards] = useState<DirectBidCard[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<PokemonCardType[]>([]);
  const [loading, setLoading] = useState(true); // page-level loading for all_cards section
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [sortBy, setSortBy] = useState('price-high');
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [roundLoading, setRoundLoading] = useState(false);

  const [lotteryError, setLotteryError] = useState<string | null>(null);
  const [lotterySuccess, setLotterySuccess] = useState<string | null>(null);
  const [userCredit, setUserCredit] = useState<number>(0);
  const [loadingCredit, setLoadingCredit] = useState(false);

  /** participants are nested [packNumber][rarity] */
  const [lotteryParticipantsByPack, setLotteryParticipantsByPack] = useState<Record<number, Record<string, number>>>({});

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySuccess, setEntrySuccess] = useState(false);

  /** include packNumber in the selection */
  const [selectedLotteryEntry, setSelectedLotteryEntry] = useState<{
    roundId: string;
    rarity: string;
    setName: string;
    packNumber: number;
  } | null>(null);

  /** ----------------- LIVE SINGLES STATE ----------------- */
  const [liveSingles, setLiveSingles] = useState<LiveSingle[]>([]);
  const [liveSinglesLoading, setLiveSinglesLoading] = useState<boolean>(false);
  const [liveSinglesError, setLiveSinglesError] = useState<string | null>(null);
  const [leadersMap, setLeadersMap] = useState<Record<string, number>>({});
  const [singlesSearch, setSinglesSearch] = useState('');
  const [singlesSort, setSinglesSort] = useState<'recent'|'price-hi'|'price-lo'>('recent');
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});
  const [placingBidFor, setPlacingBidFor] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  /** ----------------- CHASE SLOTS META (for counts & filtering) -------- */
  const [chaseCounts, setChaseCounts] = useState<Record<SetName, number>>({
    prismatic: 0,
    crown_zenith: 0,
    destined_rivals: 0
  });
  const [chaseCardIdsForActiveTab, setChaseCardIdsForActiveTab] = useState<Set<string>>(new Set());
  /** -------------------------------------------------------------------- */

  // Check user authentication status
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user?.id) await fetchUserCredit(user.id);
      } catch (error) {
        console.error('Error checking user:', error);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) await fetchUserCredit(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-scroll to modal when it opens
  useEffect(() => {
    if (showConfirmModal) {
      const modal = document.getElementById('lottery-confirm-modal');
      if (modal) {
        setTimeout(() => {
          modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [showConfirmModal]);

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

  // Initial pulls for Direct Bids gallery (using all_cards)
  useEffect(() => {
    fetchAllCards();
  }, []);

  useEffect(() => {
    if (currentStreamId) fetchCurrentRound();
  }, [currentStreamId, activeTab, lotteryActiveTab, biddingMode]);

  useEffect(() => {
    fetchLotteryParticipants();
  }, [currentRound]);

  useEffect(() => {
    // Reset filters when switching set tabs
    setSearchTerm('');
    setSelectedRarity('');
  }, [activeTab]);

  useEffect(() => {
    filterAndSortPokemon();
  }, [activeTab, allCards, searchTerm, selectedRarity, sortBy, chaseCardIdsForActiveTab]);

  /** When switching to "Live Singles", load them */
  useEffect(() => {
    if (biddingMode === 'singles') {
      void loadLiveSingles();
    }
  }, [biddingMode, currentStreamId]);

  /** Fetch chase_slots counts for all tabs + the list of all_card_id for the active tab */
  useEffect(() => {
    if (biddingMode !== 'direct') return;

    const run = async () => {
      try {
        // --- counts for all three sets (for the badge) ---
        const countFor = async (setKey: SetName) => {
          let q = supabase
            .from('chase_slots')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('set_name', SET_DB_NAME[setKey])
            .gte('ungraded_market_price', 40); // match your chase slot selection rule

          if (currentStreamId) q = q.eq('stream_id', currentStreamId);

          const { count, error } = await q;
          if (error) throw error;
          return count || 0;
        };

        const [c1, c2, c3] = await Promise.all([
          countFor('prismatic'),
          countFor('crown_zenith'),
          countFor('destined_rivals'),
        ]);
        setChaseCounts({ prismatic: c1, crown_zenith: c2, destined_rivals: c3 });

        // --- ids for active tab (so the grid matches the badge) ---
        let idsQuery = supabase
          .from('chase_slots')
          .select('all_card_id')
          .eq('is_active', true)
          .eq('set_name', SET_DB_NAME[activeTab])
          .gte('ungraded_market_price', 40);

        if (currentStreamId) idsQuery = idsQuery.eq('stream_id', currentStreamId);

        const { data: idRows, error: idsErr } = await idsQuery;
        if (idsErr) throw idsErr;
        const idSet = new Set<string>((idRows || []).map(r => String(r.all_card_id)));
        setChaseCardIdsForActiveTab(idSet);
      } catch (e) {
        // If anything fails, keep graceful fallbacks: zero counts and empty set
        setChaseCardIdsForActiveTab(new Set());
      }
    };

    run();
  }, [biddingMode, activeTab, currentStreamId]);

  const fetchCurrentRound = async () => {
    if (!currentStreamId) {
      setCurrentRound(null);
      return;
    }

    setRoundLoading(true);
    try {
      const tabToCheck = biddingMode === 'lottery' ? lotteryActiveTab : activeTab;
      const setName = SET_DB_NAME[tabToCheck as SetName];

      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('stream_id', currentStreamId)
        .eq('set_name', setName)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentRound(data);
    } catch (err: any) {
      console.error('Error fetching current round:', err);
      setCurrentRound(null);
    } finally {
      setRoundLoading(false);
    }
  };

  /** fetch pack+rarity counts for current round */
  const fetchLotteryParticipants = async () => {
    if (!currentRound) {
      setLotteryParticipantsByPack({});
      return;
    }
    try {
      const { data, error } = await supabase
        .from('lottery_entries')
        .select('pack_number, selected_rarity')
        .eq('round_id', currentRound.id);

      if (error) throw error;

      const counts: Record<number, Record<string, number>> = {};
      data?.forEach((entry: any) => {
        const pack = entry.pack_number || 0;
        const rarity = entry.selected_rarity as string;
        counts[pack] ??= {};
        counts[pack][rarity] = (counts[pack][rarity] || 0) + 1;
      });

      setLotteryParticipantsByPack(counts);
    } catch (err: any) {
      console.error('Error fetching lottery participants:', err);
    }
  };

  const fetchAllCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('all_cards')
        .select('*')
        .order('ungraded_market_price', { ascending: false });

      if (error) throw error;
      setAllCards(data || []);
    } catch (err: any) {
      console.error('Error fetching cards:', err);
      setError(err.message || 'Failed to fetch cards');
      setAllCards([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPokemon = () => {
    // Start with the set’s cards from all_cards
    let currentCards: DirectBidCard[] = [];
    if (activeTab === 'prismatic') {
      currentCards = allCards.filter(card => card.set_name === SET_DB_NAME.prismatic);
    } else if (activeTab === 'crown_zenith') {
      currentCards = allCards.filter(card =>
        card.set_name === SET_DB_NAME.crown_zenith || card.set_name === 'Crown Zenith'
      );
    } else if (activeTab === 'destined_rivals') {
      currentCards = allCards.filter(card => card.set_name === SET_DB_NAME.destined_rivals);
    }

    // Only cards that actually have a Chase Slot for this stream/set
    if (chaseCardIdsForActiveTab.size > 0) {
      currentCards = currentCards.filter(c => chaseCardIdsForActiveTab.has(String(c.id)));
    }

    // Match your selection rule (≥ 40)
    currentCards = currentCards.filter(card => (card.ungraded_market_price || 0) >= 40);

    // Search / rarity filter
    let filtered = currentCards;

    if (searchTerm) {
      filtered = filtered.filter(card =>
        card.card_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRarity) {
      filtered = filtered.filter(card => {
        const rarity = card.rarity?.split(',')[0].trim();
        return rarity === selectedRarity;
      });
    }

    // Sort
    if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.ungraded_market_price || 0) - (a.ungraded_market_price || 0));
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.ungraded_market_price || 0) - (b.ungraded_market_price || 0));
    }

    setFilteredPokemon(filtered);
  };

  /** include packNumber in selection */
  const handleLotteryEntry = (packNumber: number, rarity: string) => {
    if (!currentRound) {
      setLotteryError('No active round found for this set');
      return;
    }
    if (!user) {
      setLotteryError('Please sign in to enter the lottery');
      return;
    }
    setSelectedLotteryEntry({
      roundId: currentRound.id,
      rarity,
      setName: currentRound.set_name,
      packNumber
    });
    setShowConfirmModal(true);
  };

  /** insert with pack_number, then refresh counts (with friendlier duplicate message) */
  const handleCreditLotteryEntry = async () => {
    if (!user?.id || !currentRound?.id || !selectedLotteryEntry?.rarity || !selectedLotteryEntry?.packNumber) {
      setError('Missing required information for lottery entry');
      return;
    }

    setIsProcessingEntry(true);
    setEntryError('');
    setEntrySuccess('');

    try {
      const newCreditBalance = userCredit - 5;

      // Deduct credits
      const { error: creditError } = await supabase
        .from('users')
        .update({ site_credit: newCreditBalance })
        .eq('id', user.id);

      if (creditError) throw new Error('Failed to deduct credits: ' + creditError.message);

      // Insert entry WITH pack number
      const { error: lotteryInsertError } = await supabase
        .from('lottery_entries')
        .insert([{
          user_id: user.id,
          round_id: currentRound.id,
          pack_number: selectedLotteryEntry.packNumber,
          selected_rarity: selectedLotteryEntry.rarity,
          created_at: new Date().toISOString(),
          credits_used: 5
        }]);

      if (lotteryInsertError) {
        // rollback
        await supabase.from('users').update({ site_credit: userCredit }).eq('id', user.id);
        throw new Error('Failed to create lottery entry: ' + lotteryInsertError.message);
      }

      setUserCredit(newCreditBalance);
      setShowConfirmModal(false);
      setSelectedRarity('');

      // Refresh counts
      await fetchLotteryParticipants();

      setEntrySuccess('Successfully entered the lottery! 5 credits deducted.');
      setTimeout(() => setEntrySuccess(''), 3000);
    } catch (err: any) {
      console.error('Lottery entry error:', err);

      const msg = String(err?.message || '').toLowerCase();
      // Handle uniqueness errors gracefully
      if (
        msg.includes('lottery_entries_user_id_round_id_pack_key') ||
        msg.includes('lottery_entries_user_round_pack_uniq') ||
        msg.includes('duplicate key value') ||
        msg.includes('unique constraint')
      ) {
        setEntryError('You already entered this pack for this round.');
      } else {
        setEntryError(err.message || 'Failed to enter lottery');
      }
    } finally {
      setIsProcessingEntry(false);
    }
  };

  // Get unique sets and rarities for filter options
  const getCurrentPokemon = () => {
    if (activeTab === 'prismatic') {
      return allCards.filter(card => card.set_name === SET_DB_NAME.prismatic);
    } else if (activeTab === 'crown_zenith') {
      return allCards.filter(card =>
        card.set_name === SET_DB_NAME.crown_zenith ||
        card.set_name === 'Crown Zenith'
      );
    } else if (activeTab === 'destined_rivals') {
      return allCards.filter(card => card.set_name === SET_DB_NAME.destined_rivals);
    }
    return [];
  };

  const currentPokemon = getCurrentPokemon();
  const uniqueRarities = [...new Set(currentPokemon.map(card => {
    const rarity = card.rarity?.split(',')[0].trim();
    return rarity;
  }).filter(Boolean))];

  /** ----------------- LIVE SINGLES: DATA + ACTIONS ----------------- */
  const loadLiveSingles = async () => {
    try {
      setLiveSinglesLoading(true);
      setLiveSinglesError(null);

      const query = supabase
        .from('live_singles')
        .select('*')
        .eq('is_active', true);

      if (currentStreamId) query.eq('stream_id', currentStreamId);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setLiveSingles(data as LiveSingle[]);

      // Leaders map
      const { data: leaders, error: leadersErr } = await supabase
        .from('live_singles_leaders')
        .select('card_id, top_bid');

      if (leadersErr) throw leadersErr;

      const m: Record<string, number> = {};
      (leaders as LiveSingleLeaderRow[]).forEach((row) => {
        if (row.card_id) m[row.card_id] = row.top_bid ?? 0;
      });
      setLeadersMap(m);
    } catch (err: any) {
      console.error('loadLiveSingles error:', err);
      setLiveSinglesError(err.message || 'Failed to load Live Singles');
    } finally {
      setLiveSinglesLoading(false);
    }
  };

  const refreshLeadersAndCredit = async () => {
    // leaders
    const { data: leaders, error: leadersErr } = await supabase
      .from('live_singles_leaders')
      .select('card_id, top_bid');

    if (!leadersErr && leaders) {
      const m: Record<string, number> = {};
      (leaders as LiveSingleLeaderRow[]).forEach((row) => {
        if (row.card_id) m[row.card_id] = row.top_bid ?? 0;
      });
      setLeadersMap(m);
    }
    // credit
    if (user?.id) await fetchUserCredit(user.id);
  };

  const handleBidInputChange = (cardId: string, val: string) => {
    setBidInputs((prev) => ({ ...prev, [cardId]: val }));
  };

  const handlePlaceLiveSingleBid = async (card: LiveSingle) => {
    if (!user) {
      setBidError('Please sign in to place a bid.');
      return;
    }
    const raw = bidInputs[card.id];
    const amt = Number(raw);
    if (!raw || isNaN(amt) || amt <= 0) {
      setBidError('Enter a valid bid amount.');
      return;
    }

    setPlacingBidFor(card.id);
    setBidError(null);
    setBidSuccess(null);

    try {
      const { error } = await supabase.rpc('place_live_single_bid_immediate_refund', {
        p_user_id: user.id,
        p_card_id: card.id,
        p_amount: amt
      });

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        // common friendly messages
        if (msg.includes('minimum bid')) {
          setBidError(`Minimum bid is $${card.starting_bid}.`);
        } else if (msg.includes('least') && msg.includes('increment')) {
          setBidError('Your bid must be at least the current top bid plus the minimum increment.');
        } else if (msg.includes('insufficient credits')) {
          setBidError('Insufficient credits for this bid.');
        } else if (msg.includes('closed')) {
          setBidError('Bidding is closed for this live single.');
        } else {
          setBidError(error.message);
        }
        return;
      }

      // success
      setBidSuccess('Bid placed! If you were outbid later, your credits will be refunded automatically.');
      setBidInputs((prev) => ({ ...prev, [card.id]: '' }));
      await refreshLeadersAndCredit();
      setTimeout(() => setBidSuccess(null), 2500);
    } catch (e: any) {
      setBidError(e.message || 'Failed to place bid.');
    } finally {
      setPlacingBidFor(null);
    }
  };
  /** ------------------------------------------------------ */

  /** ----------------- RENDERER FOR A SET (even spacing) ----------------- */
  function renderSetPacks(setKey: SetKey, title: string) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-8">
          {title} - Lottery
        </h3>

        {/* Round ID Display */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
          <div className="text-center">
            <h4 className="font-semibold text-blue-800 font-pokemon mb-2">
              Current Round for {title}
            </h4>
            {roundLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-blue-600 font-pokemon">Loading round...</span>
              </div>
            ) : currentRound ? (
              <div className="space-y-1">
                <p className="text-blue-700 font-bold font-pokemon">Round ID: {currentRound.id}</p>
                <p className="text-blue-600 text-sm font-pokemon">
                  Round {currentRound.round_number} • {currentRound.packs_opened} packs •
                  {currentRound.locked ? ' LOCKED' : ' UNLOCKED'}
                </p>
              </div>
            ) : (
              <p className="text-blue-600 font-pokemon">No round found</p>
            )}
          </div>
        </div>

        {/* PACK ROWS */}
        <div className="space-y-4">
          {PACKS.map((packNum) => (
            <div key={`${setKey}-${packNum}`} className="rounded-2xl p-4 border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold font-pokemon">Pack {packNum}</h4>
                {currentRound?.locked && <span className="text-sm">LOCKED</span>}
              </div>

              {/* Auto-fit grid: evenly spaced regardless of 3 or 4 cards */}
              <div
                className="
                  grid
                  [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]
                  gap-5 md:gap-6
                  items-stretch justify-items-stretch
                  mx-auto
                "
              >
                {RARITIES[setKey].map((rarity) => {
                  const count = lotteryParticipantsByPack?.[packNum]?.[rarity] || 0;
                  const disabled = !user || loadingUser || !!currentRound?.locked;
                  const bg = rarityBg(rarity);

                  return (
                    <div
                      key={`${packNum}-${rarity}`}
                      className="
                        bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300
                        transition-all shadow-lg
                        h-full flex flex-col
                      "
                    >
                      <div className="text-center flex-1 flex flex-col">
                        <div className={`${bg.split(' ')[0]} rounded-lg p-4 mb-4`}>
                          <span className="text-lg font-bold text-white font-pokemon">{rarity}</span>
                        </div>

                        <div className="mb-4">
                          <p className="text-gray-600 text-sm font-pokemon mb-2">
                            Enter lottery for this rarity
                          </p>
                          <p className="text-blue-600 font-semibold text-sm font-pokemon">
                            {count} participants
                          </p>
                        </div>

                        {/* Push button to bottom for equal heights */}
                        <div className="mt-auto">
                          <button
                            onClick={() => handleLotteryEntry(packNum, rarity)}
                            disabled={disabled}
                            className={`w-full ${bg} text-white font-bold py-3 rounded-lg transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : 'Enter for 5 Credits'}
                          </button>
                          {!loadingUser && !user && (
                            <div className="mt-2 text-orange-600 text-sm font-pokemon">
                              Please sign in to enter lottery
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  /** ------------------------------------------------------------------ */

  /** ----------------- LIVE SINGLES RENDER ----------------- */
  function renderLiveSingles() {
    // client-side filter/sort
    let rows = [...liveSingles];
    if (singlesSearch) {
      const q = singlesSearch.toLowerCase();
      rows = rows.filter(r =>
        (r.card_name || '').toLowerCase().includes(q) ||
        (r.set_name || '').toLowerCase().includes(q) ||
        (r.card_number || '').toLowerCase().includes(q) ||
        (r.card_condition || '').toLowerCase().includes(q)
      );
    }
    if (singlesSort === 'price-hi') {
      rows.sort((a, b) => (b.ungraded_market_price || 0) - (a.ungraded_market_price || 0));
    } else if (singlesSort === 'price-lo') {
      rows.sort((a, b) => (a.ungraded_market_price || 0) - (b.ungraded_market_price || 0));
    } else {
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-2">
          Live Singles
        </h3>
        <p className="text-center text-gray-600 font-pokemon mb-6">
          Bid on individual cards I currently own. Bidding stays open until the end of Round 3.
        </p>

        {/* Filters */}
        <div className="bg-gray-50 rounded-xl p-6 mb-2 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, set, #, or condition..."
                value={singlesSearch}
                onChange={(e) => setSinglesSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:outline-none font-pokemon"
              />
            </div>
            <div />
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={singlesSort}
                onChange={(e) => setSinglesSort(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:outline-none font-pokemon appearance-none bg-white"
              >
                <option value="recent">Newest</option>
                <option value="price-hi">Price: High to Low</option>
                <option value="price-lo">Price: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Errors */}
        {liveSinglesError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 font-pokemon">{liveSinglesError}</span>
            </div>
          </div>
        )}

        {/* Grid */}
        {liveSinglesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader className="h-6 w-6 animate-spin text-red-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center space-x-2 mb-4 text-gray-600">
              <Sparkles className="h-8 w-8" />
              <span className="text-xl font-pokemon">No Live Singles yet</span>
            </div>
            <p className="text-gray-600 font-pokemon">Check back soon for more!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map((card) => {
              const topBid = leadersMap[card.id] ?? 0;
              const isPlacing = placingBidFor === card.id;

              return (
                <div key={card.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-lg mb-3 bg-gray-50 flex items-center justify-center">
                    {card.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.image_url} alt={card.card_name} className="object-contain w-full h-full" />
                    ) : (
                      <div className="text-gray-400 font-pokemon">No image</div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold text-black font-pokemon">{card.card_name}</h4>
                    <div className="text-sm text-gray-600 font-pokemon">
                      {(card.set_name || 'Unknown Set')} {card.card_number ? `• #${card.card_number}` : ''}
                    </div>
                    {card.card_condition && (
                      <div className="text-xs text-gray-500 font-pokemon">Condition: {card.card_condition}</div>
                    )}
                    <div className="text-sm text-gray-700 font-pokemon mt-1">
                      Market: {card.ungraded_market_price != null ? `$${card.ungraded_market_price.toFixed(2)}` : '—'}
                      {card.psa_10_price != null ? ` • PSA 10: $${card.psa_10_price.toFixed(2)}` : ''}
                    </div>

                    <div className="mt-2 rounded-lg bg-gray-50 p-2 flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-pokemon">Top Bid</span>
                      <span className="text-sm font-bold text-black font-pokemon">
                        {topBid > 0 ? `$${topBid.toFixed(2)}` : '—'}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-5 gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={`≥ ${Math.max(topBid + card.min_increment, card.starting_bid).toFixed(2)}`}
                        value={bidInputs[card.id] ?? ''}
                        onChange={(e) => handleBidInputChange(card.id, e.target.value)}
                        className="col-span-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600 font-pokemon"
                      />
                      <button
                        onClick={() => handlePlaceLiveSingleBid(card)}
                        disabled={!user || isPlacing}
                        className="col-span-2 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon"
                      >
                        {isPlacing ? 'Bidding...' : user ? 'Place Bid' : 'Login'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bid messages */}
        {bidError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 font-pokemon">{bidError}</span>
            </div>
          </div>
        )}
        {bidSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Sparkles className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-pokemon">{bidSuccess}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  /** ------------------------------------------------------ */

  if (loading && biddingMode !== 'singles') {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Loader className="h-8 w-8 animate-spin text-red-600" />
              <span className="text-xl font-pokemon text-black">Loading Pokemon Cards...</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error && biddingMode !== 'singles') {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4 text-red-600">
              <AlertCircle className="h-8 w-8" />
              <span className="text-xl font-pokemon">Error loading Pokemon cards</span>
            </div>
            <p className="text-gray-600 font-pokemon">{error}</p>
            <button 
              onClick={fetchAllCards}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-pokemon hover:bg-red-700 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (allCards.length === 0 && biddingMode !== 'singles') {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4 text-gray-600">
              <Sparkles className="h-8 w-8" />
              <span className="text-xl font-pokemon">No Pokemon cards available</span>
            </div>
            <p className="text-gray-600 font-pokemon">Check back soon for new Pokemon cards!</p>
          </div>
        </div>
      </section>
    );
  }

  // Tab badges: use chase slot counts (not total cards)
  const tabs = [
    { id: 'prismatic' as SetName,      name: 'Prismatic Evolutions', count: chaseCounts.prismatic },
    { id: 'crown_zenith' as SetName,   name: 'Crown Zenith',         count: chaseCounts.crown_zenith },
    { id: 'destined_rivals' as SetName, name: 'Destined Rivals',     count: chaseCounts.destined_rivals },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 font-pokemon">
            Bid on Pokemon Cards
          </h2>
          <div className="text-lg text-gray-600 max-w-4xl mx-auto mb-8 font-pokemon">
            <p className="mb-4">
              Three exciting rounds: Round 1 (10 Prismatic Evolutions packs), Round 2 (10 Destined Rivals packs), Round 3 (10 Crown Zenith packs). Each round offers three entry options.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-4">
              <h4 className="font-bold text-black mb-3 font-pokemon">Option 1: Chase Slots</h4>
              <ul className="text-left space-y-2 mb-4">
                <li>• Use credits to bid on high-value cards from each set</li>
                <li>• Highest bidder wins the slot; if the card is pulled in the round, they keep it</li>
                <li>• Credits are immediately refunded when you are outbid</li>
              </ul>
              
              <h4 className="font-bold text-black mb-3 font-pokemon">Option 2: Lottery + Rarity Selection</h4>
              <ul className="text-left space-y-2 mb-4">
    <li>• Use credits to enter a lottery for Packs 1–10 for a given round by selecting a rarity for a specific pack</li>
    <li>• If that rarity hits in that pack, you’re entered into that pack’s prize pool</li>
    <li>• One winner is drawn per pack — winner keeps all the cards from that specific pack (barring any cards won through Chase Slot bidding). 10 possible winners per round</li>
              </ul>

              <h4 className="font-bold text-black mb-3 font-pokemon">Option 3: Live Singles</h4>
              <ul className="text-left space-y-2 mb-0">
                <li>• Use credits to bid on individual cards in my collection</li>
                <li>• Open until end of Round 3; highest bidder wins the card</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bidding Mode Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setBiddingMode('direct')}
                className={`py-2 px-1 border-b-2 font-medium text-lg font-pokemon transition-colors ${
                  biddingMode === 'direct'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Chase Slots
              </button>
              <button
                onClick={() => setBiddingMode('lottery')}
                className={`py-2 px-1 border-b-2 font-medium text-lg font-pokemon transition-colors ${
                  biddingMode === 'lottery'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Lottery
              </button>
              <button
                onClick={() => setBiddingMode('singles')}
                className={`py-2 px-1 border-b-2 font-medium text-lg font-pokemon transition-colors ${
                  biddingMode === 'singles'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Live Singles
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on bidding mode */}
        {biddingMode === 'direct' ? (
          <>
            {/* Set Tabs */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSelectedRarity('');
                      }}
                      className={`py-2 px-1 border-b-2 font-medium text-lg font-pokemon transition-colors ${
                        activeTab === tab.id
                          ? 'border-red-600 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.name}
                      <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Search, Filter, Sort */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Pokemon..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:outline-none font-pokemon"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:outline-none font-pokemon appearance-none bg-white"
                  >
                    <option value="">All Rarities</option>
                    {uniqueRarities.map(rarity => (
                      <option key={rarity} value={rarity}>{rarity}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:outline-none font-pokemon appearance-none bg-white"
                  >
                    <option value="price-high">Price: High to Low</option>
                    <option value="price-low">Price: Low to High</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="text-gray-600 font-pokemon">
                  Showing {filteredPokemon.length} of {currentPokemon.length} Pokemon
                </span>
              </div>
            </div>

            {/* Round Info */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
              <div className="text-center">
                <h4 className="font-semibold text-blue-800 font-pokemon mb-2">
                  Current Round for {tabs.find(t => t.id === activeTab)?.name}
                </h4>

                {roundLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-blue-600 font-pokemon">Loading round...</span>
                  </div>
                ) : currentRound ? (
                  <div className="space-y-1">
                    <p className="text-blue-700 font-bold font-pokemon">
                      Round ID: {currentRound.id}
                    </p>
                    <p className="text-blue-600 text-sm font-pokemon">
                      Round {currentRound.round_number} • {currentRound.packs_opened} packs •
                      {currentRound.locked ? ' LOCKED' : ' UNLOCKED'}
                    </p>
                  </div>
                ) : (
                  <p className="text-blue-600 font-pokemon">No round found</p>
                )}
              </div>
            </div>

            {/* Cards (Chase Slots gallery uses all_cards list here, filtered by chase_slots) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPokemon.map((poke, index) => (
                <PokemonCard
                  key={poke.id}
                  pokemon={poke}
                  isPopular={index === 0}
                  roundStreamId={currentRound?.stream_id ?? null}
                  roundSetName={currentRound?.set_name ?? null}
                  onBidSuccess={() => console.log('Bid submitted for card:', poke.card_name)}
                />
              ))}
            </div>

            {filteredPokemon.length === 0 && currentPokemon.length > 0 && (
              <div className="text-center py-12">
                <div className="flex items-center justify-center space-x-2 mb-4 text-gray-600">
                  <Sparkles className="h-8 w-8" />
                  <span className="text-xl font-pokemon">No Pokemon Found</span>
                </div>
                <p className="text-gray-600 font-pokemon">Try adjusting your search or filters</p>
              </div>
            )}
          </>
        ) : biddingMode === 'lottery' ? (
          /* Lottery Tab Content */
          <div>
            {/* Lottery Set Tabs */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setLotteryActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-lg font-pokemon transition-colors ${
                        lotteryActiveTab === tab.id
                          ? 'border-red-600 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {lotteryActiveTab === 'prismatic' && renderSetPacks('prismatic', 'Prismatic Evolutions')}
            {lotteryActiveTab === 'crown_zenith' && renderSetPacks('crown_zenith', 'Crown Zenith')}
            {lotteryActiveTab === 'destined_rivals' && renderSetPacks('destined_rivals', 'Destined Rivals')}

            {/* Error and Success Messages */}
            {lotteryError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800 font-pokemon">{lotteryError}</span>
                </div>
              </div>
            )}

            {lotterySuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Sparkles className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-pokemon">{lotterySuccess}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Live Singles
          renderLiveSingles()
        )}

        {/* Confirmation Modal (Lottery) */}
        {showConfirmModal && selectedLotteryEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div 
              id="lottery-confirm-modal"
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-black font-pokemon mb-4 text-center">
                Confirm Lottery Entry
              </h3>
              
              <div className="space-y-4">
                <p className="text-gray-700 font-pokemon text-center">
                  Apply 5 credits to enter <span className="font-bold">{selectedLotteryEntry.rarity}</span> for <span className="font-bold">Pack {selectedLotteryEntry.packNumber}</span>?
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-pokemon">Cost:</span>
                    <span className="font-bold text-black font-pokemon">5 credits</span>
                  </div>
                </div>

                {entryError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm font-pokemon">{entryError}</p>
                  </div>
                )}

                {entrySuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-600 text-sm font-pokemon">
                      Lottery entry successful! Good luck!
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleCreditLotteryEntry}
                    disabled={isProcessingEntry || userCredit < 5}
                    className="flex-1 bg-yellow-400 text-black font-bold py-2 rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon"
                  >
                    {isProcessingEntry ? 'Processing...' : 'Yes, Enter Lottery'}
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setEntryError(null);
                      setEntrySuccess(false);
                      setSelectedLotteryEntry(null);
                    }}
                    disabled={isProcessingEntry}
                    className="flex-1 bg-gray-600 text-white font-bold py-2 rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50 font-pokemon"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PokemonSection;


