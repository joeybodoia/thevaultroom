import React, { useState, useEffect, useCallback } from 'react';
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
  total_packs_planned: number | null;
  locked: boolean;
  created_at: string;
  bidding_status?: 'not_started' | 'open' | 'closed' | null;
  bidding_started_at?: string | null;
  bidding_ends_at?: string | null;
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
  status: 'open' | 'locked' | 'sold' | 'cancelled';
  created_at: string;
}

interface LiveSingleLeaderRow {
  card_id: string;
  top_bid: number | null;
}

interface PokemonSectionProps {
  currentStreamId?: string | null;
}

interface ChaseSlotMeta {
  slotId: string;
  allCardId: string;
  setName: string;
  startingBid: number;
  minIncrement: number;
  isActive: boolean;
  locked: boolean;
  topBid: number;
}

/** ----------------- CONSTANTS / HELPERS ----------------- */

const RARITIES = {
  prismatic: ['SIR', 'Masterball Pattern', 'Ultra Rare', 'Pokeball Pattern'],
  crown_zenith: [
    'Secret Rare (includes Pikachu)',
    'Ultra Rare (Non Galarian Gallery)',
    'Ultra Rare (Galarian Gallery)',
  ],
  destined_rivals: ['SIR / Hyper Rare', 'IR', 'Ultra Rare / Double Rare'],
} as const;

type SetKey = keyof typeof RARITIES;

/** Map UI tabs -> DB set_name used for rounds/chase_slots */
const SET_DB_NAME: Record<SetName, string> = {
  prismatic: 'SV: Prismatic Evolutions',
  crown_zenith: 'Crown Zenith: Galarian Gallery',
  destined_rivals: 'SV10: Destined Rivals',
};
const DB_SET_TO_KEY: Record<string, SetName> = Object.entries(SET_DB_NAME).reduce(
  (acc, [key, value]) => {
    acc[value] = key as SetName;
    return acc;
  },
  {} as Record<string, SetName>
);

const INITIAL_ROUND_MAP: Record<SetName, Round | null> = {
  prismatic: null,
  crown_zenith: null,
  destined_rivals: null,
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

function getCountdown(endIso?: string | null, nowTs?: number) {
  if (!endIso || !nowTs) return null;
  const target = new Date(endIso).getTime();
  const diff = target - nowTs;
  const minutes = Math.max(0, Math.floor(diff / 60000));
  const seconds = Math.max(0, Math.floor((diff % 60000) / 1000));
  return {
    minutes,
    seconds,
    expired: diff <= 0,
  };
}

function formatCountdownLabel(endIso?: string | null, nowTs?: number) {
  const countdown = getCountdown(endIso, nowTs);
  if (!countdown) return null;
  const m = String(countdown.minutes).padStart(2, '0');
  const s = String(countdown.seconds).padStart(2, '0');
  return `${m}:${s}`;
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
  const [roundsBySet, setRoundsBySet] = useState<Record<SetName, Round | null>>({
    ...INITIAL_ROUND_MAP,
  });
  const [roundsLoading, setRoundsLoading] = useState(false);

  const [lotteryError, setLotteryError] = useState<string | null>(null);
  const [lotterySuccess, setLotterySuccess] = useState<string | null>(null);
  const [userCredit, setUserCredit] = useState<number>(0);
  const [loadingCredit, setLoadingCredit] = useState(false);

  /** participants are nested [packNumber][rarity] */
  const [lotteryParticipantsByPack, setLotteryParticipantsByPack] = useState<
    Record<number, Record<string, number>>
  >({});

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [confirmingLotteryKey, setConfirmingLotteryKey] = useState<string | null>(null);
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
  const [singlesSort, setSinglesSort] = useState<
    'psa10-desc' | 'psa10-asc' | 'ungraded-desc' | 'ungraded-asc'
  >('psa10-desc');
  const [singlesSetFilter, setSinglesSetFilter] = useState<string>('all');
  const [singlesConditionFilter, setSinglesConditionFilter] = useState<string>('all');
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});
  const [placingBidFor, setPlacingBidFor] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [confirmingLiveSingle, setConfirmingLiveSingle] = useState<string | null>(null);
  const fetchUserCredit = useCallback(async (userId: string) => {
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
  }, []);

  /** ----------------- CHASE SLOTS META (for counts & filtering) -------- */
  const [chaseCounts, setChaseCounts] = useState<Record<SetName, number>>({
    prismatic: 0,
    crown_zenith: 0,
    destined_rivals: 0,
  });
  const [chaseCardIdsForActiveTab, setChaseCardIdsForActiveTab] = useState<Set<string>>(
    new Set()
  );
  const [chaseSlotsByCardId, setChaseSlotsByCardId] = useState<Record<string, ChaseSlotMeta>>({});
  const [chaseSnapshotLoading, setChaseSnapshotLoading] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  /** -------------------------------------------------------------------- */

  // Check user authentication status
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) await fetchUserCredit(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserCredit]);

  // Inline confirmation replaces modal, so no scroll handling needed

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadRoundsForStream = useCallback(async () => {
    if (!currentStreamId) {
      setRoundsBySet({ ...INITIAL_ROUND_MAP });
      setRoundsLoading(false);
      return;
    }

    setRoundsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('stream_id', currentStreamId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const next: Record<SetName, Round | null> = { ...INITIAL_ROUND_MAP };
      (data || []).forEach((round: Round) => {
        const key = DB_SET_TO_KEY[round.set_name as string];
        if (key && !next[key]) {
          next[key] = round;
        }
      });
      setRoundsBySet(next);
    } catch (err) {
      console.error('Error loading rounds:', err);
    } finally {
      setRoundsLoading(false);
    }
  }, [currentStreamId]);

  // Initial pulls for Direct Bids gallery (using all_cards)
  useEffect(() => {
    fetchAllCards();
  }, []);

  useEffect(() => {
    void loadRoundsForStream();
  }, [loadRoundsForStream]);

  useEffect(() => {
    if (!currentStreamId) return;

    const channel = supabase
      .channel('rounds_bidding_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `stream_id=eq.${currentStreamId}` },
        () => {
          void loadRoundsForStream();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStreamId, loadRoundsForStream]);

  const activeChaseRound = roundsBySet[activeTab];
  const activeLotteryRound = roundsBySet[lotteryActiveTab as SetName];

  useEffect(() => {
    if (activeLotteryRound?.id) {
      void fetchLotteryParticipants(activeLotteryRound.id);
    } else {
      setLotteryParticipantsByPack({});
    }
  }, [activeLotteryRound?.id]);

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

  const refreshChaseSnapshot = useCallback(async () => {
    if (biddingMode !== 'direct') {
      setChaseCounts({ prismatic: 0, crown_zenith: 0, destined_rivals: 0 });
      setChaseCardIdsForActiveTab(new Set());
      setChaseSlotsByCardId({});
      setChaseSnapshotLoading(false);
      return;
    }

    const roundIds = Object.values(roundsBySet)
      .map((round) => round?.id)
      .filter((id): id is string => Boolean(id));

    if (!roundIds.length) {
      setChaseCounts({ prismatic: 0, crown_zenith: 0, destined_rivals: 0 });
      setChaseCardIdsForActiveTab(new Set());
      setChaseSlotsByCardId({});
      setChaseSnapshotLoading(false);
      return;
    }

    const activeRoundId = activeChaseRound?.id ?? null;

    setChaseSnapshotLoading(true);
    try {
      let query = supabase
        .from('active_chase_slot_status')
        .select(
          'slot_id, round_id, stream_id, set_name, all_card_id, top_bid, starting_bid, min_increment, is_active, locked'
        )
        .in('round_id', roundIds);

      const { data, error } = await query;
      if (error) throw error;

      const nextCounts: Record<SetName, number> = {
        prismatic: 0,
        crown_zenith: 0,
        destined_rivals: 0,
      };
      const activeSetCardIds = new Set<string>();
      const slotMap: Record<string, ChaseSlotMeta> = {};

      (data ?? []).forEach((row: any) => {
        const setKey = DB_SET_TO_KEY[row.set_name as string];
        if (!setKey) return;

        nextCounts[setKey] = (nextCounts[setKey] || 0) + 1;

        if (row.all_card_id && row.slot_id && row.round_id === activeRoundId) {
          const cardId = String(row.all_card_id);
          slotMap[cardId] = {
            slotId: row.slot_id,
            allCardId: cardId,
            setName: row.set_name,
            startingBid: Number(row.starting_bid ?? 0),
            minIncrement: Number(row.min_increment ?? 1),
            isActive: Boolean(row.is_active),
            locked: Boolean(row.locked),
            topBid:
              row.top_bid != null
                ? Number(row.top_bid)
                : Number(row.starting_bid ?? 0),
          };
          activeSetCardIds.add(cardId);
        }
      });

      setChaseCounts(nextCounts);
      setChaseCardIdsForActiveTab(activeSetCardIds);
      setChaseSlotsByCardId(slotMap);
    } catch (err) {
      console.error('Error loading chase slot snapshot:', err);
      setChaseCounts({ prismatic: 0, crown_zenith: 0, destined_rivals: 0 });
      setChaseCardIdsForActiveTab(new Set());
      setChaseSlotsByCardId({});
    } finally {
      setChaseSnapshotLoading(false);
    }
  }, [biddingMode, roundsBySet, activeChaseRound?.id, activeTab]);

  useEffect(() => {
    void refreshChaseSnapshot();
  }, [refreshChaseSnapshot]);

  const userId = user?.id ?? null;

  const handleChaseBidSuccess = useCallback(async () => {
    await refreshChaseSnapshot();
    if (userId) {
      await fetchUserCredit(userId);
    }
  }, [refreshChaseSnapshot, userId, fetchUserCredit]);

  useEffect(() => {
    if (biddingMode !== 'direct') return;

    const channel = supabase
      .channel('chase_bids_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chase_bids' },
        () => {
          void refreshChaseSnapshot();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [biddingMode, refreshChaseSnapshot]);

  /** fetch pack+rarity counts for current round */
  const fetchLotteryParticipants = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('lottery_entries')
        .select('pack_number, selected_rarity')
        .eq('round_id', roundId);

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
    let currentCards: DirectBidCard[] = [];
    if (activeTab === 'prismatic') {
      currentCards = allCards.filter((card) => card.set_name === SET_DB_NAME.prismatic);
    } else if (activeTab === 'crown_zenith') {
      currentCards = allCards.filter(
        (card) =>
          card.set_name === SET_DB_NAME.crown_zenith || card.set_name === 'Crown Zenith'
      );
    } else if (activeTab === 'destined_rivals') {
      currentCards = allCards.filter(
        (card) => card.set_name === SET_DB_NAME.destined_rivals
      );
    }

    // Only include cards that have an active chase_slot for the current tab
    if (chaseCardIdsForActiveTab.size > 0) {
      currentCards = currentCards.filter((c) =>
        chaseCardIdsForActiveTab.has(String(c.id))
      );
    }

    // No hard-coded price floor here — chase_slots in the DB already reflect
    // whatever min price you configured for the current round.

    let filtered = currentCards;

    if (searchTerm) {
      filtered = filtered.filter((card) =>
        card.card_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRarity) {
      filtered = filtered.filter((card) => {
        const rarity = card.rarity?.split(',')[0].trim();
        return rarity === selectedRarity;
      });
    }

    if (sortBy === 'price-high') {
      filtered.sort(
        (a, b) => (b.ungraded_market_price || 0) - (a.ungraded_market_price || 0)
      );
    } else if (sortBy === 'price-low') {
      filtered.sort(
        (a, b) => (a.ungraded_market_price || 0) - (b.ungraded_market_price || 0)
      );
    }

    setFilteredPokemon(filtered);
  };

  /** include packNumber in selection */
  const handleLotteryEntry = (packNumber: number, rarity: string) => {
    if (!activeLotteryRound) {
      setLotteryError('No active round found for this set');
      return;
    }
    if (activeLotteryRound.bidding_status !== 'open') {
      setLotteryError('Bidding is not open for this round.');
      return;
    }
    if (!user) {
      setLotteryError('Please sign in to enter the lottery');
      return;
    }
    setSelectedLotteryEntry({
      roundId: activeLotteryRound.id,
      rarity,
      setName: activeLotteryRound.set_name,
      packNumber,
    });
    setConfirmingLotteryKey(`${packNumber}-${rarity}`);
  };

  /** insert with pack_number, then refresh counts */
  const handleCreditLotteryEntry = async () => {
    if (
      !user?.id ||
      !activeLotteryRound?.id ||
      !selectedLotteryEntry?.rarity ||
      !selectedLotteryEntry?.packNumber
    ) {
      setEntryError('Missing required information for lottery entry');
      return;
    }

    if (activeLotteryRound.bidding_status !== 'open') {
      setEntryError('Bidding is not open for this round.');
      return;
    }

    setIsProcessingEntry(true);
    setEntryError('');
    setEntrySuccess('');

    try {
      const newCreditBalance = userCredit - 5;

      const { error: creditError } = await supabase
        .from('users')
        .update({ site_credit: newCreditBalance })
        .eq('id', user.id);

      if (creditError)
        throw new Error('Failed to deduct credits: ' + creditError.message);

      const { error: lotteryInsertError } = await supabase
        .from('lottery_entries')
        .insert([
          {
            user_id: user.id,
            round_id: activeLotteryRound.id,
            pack_number: selectedLotteryEntry.packNumber,
            selected_rarity: selectedLotteryEntry.rarity,
            created_at: new Date().toISOString(),
            credits_used: 5,
          },
        ]);

      if (lotteryInsertError) {
        await supabase
          .from('users')
          .update({ site_credit: userCredit })
          .eq('id', user.id);
        throw new Error(
          'Failed to create lottery entry: ' + lotteryInsertError.message
        );
      }

      setUserCredit(newCreditBalance);
      setConfirmingLotteryKey(null);
      setSelectedRarity('');

      await fetchLotteryParticipants(activeLotteryRound.id);

      setEntrySuccess('Successfully entered the lottery! 5 credits deducted.');
      setLotterySuccess('Successfully entered the lottery! 5 credits deducted.');
      setTimeout(() => setEntrySuccess(''), 3000);
      setTimeout(() => setLotterySuccess(null), 3000);
    } catch (err: any) {
      console.error('Lottery entry error:', err);
      const msg = String(err?.message || '').toLowerCase();
      if (
        msg.includes('lottery_entries_user_id_round_id_pack_key') ||
        msg.includes('lottery_entries_user_round_pack_uniq') ||
        msg.includes('duplicate key value') ||
        msg.includes('unique constraint')
      ) {
        setEntryError('You already entered this pack for this round.');
        setLotteryError('You already entered this pack for this round.');
      } else {
        setEntryError(err.message || 'Failed to enter lottery');
        setLotteryError(err.message || 'Failed to enter lottery');
      }
    } finally {
      setIsProcessingEntry(false);
    }
  };

  // For Chase Slots rarity filter options
  const getCurrentPokemon = () => {
    if (activeTab === 'prismatic') {
      return allCards.filter((card) => card.set_name === SET_DB_NAME.prismatic);
    } else if (activeTab === 'crown_zenith') {
      return allCards.filter(
        (card) =>
          card.set_name === SET_DB_NAME.crown_zenith ||
          card.set_name === 'Crown Zenith'
      );
    } else if (activeTab === 'destined_rivals') {
      return allCards.filter(
        (card) => card.set_name === SET_DB_NAME.destined_rivals
      );
    }
    return [];
  };

  const currentPokemon = getCurrentPokemon();
  const uniqueRarities = [
    ...new Set(
      currentPokemon
        .map((card) => card.rarity?.split(',')[0].trim())
        .filter(Boolean)
    ),
  ];

  /** ----------------- LIVE SINGLES: DATA + ACTIONS ----------------- */
  const loadLiveSingles = async () => {
    try {
      setLiveSinglesLoading(true);
      setLiveSinglesError(null);

      let query = supabase
        .from('live_singles')
        .select('*')
        .eq('is_active', true);

      if (currentStreamId) {
        query = query.eq('stream_id', currentStreamId);
      }

      const { data, error } = await query
        .order('psa_10_price', { ascending: false })
        .order('ungraded_market_price', { ascending: false });

      if (error) throw error;
      setLiveSingles(data as LiveSingle[]);

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
    setConfirmingLiveSingle(null);

    try {
      const { error } = await supabase.rpc(
        'place_live_single_bid_immediate_refund',
        {
          p_user_id: user.id,
          p_card_id: card.id,
          p_amount: amt,
        }
      );

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('minimum bid')) {
          setBidError(`Minimum bid is $${card.starting_bid}.`);
        } else if (msg.includes('least') && msg.includes('increment')) {
          setBidError(
            'Your bid must be at least the current top bid plus the minimum increment.'
          );
        } else if (msg.includes('insufficient credits')) {
          setBidError('Insufficient credits for this bid.');
        } else if (msg.includes('closed')) {
          setBidError('Bidding is closed for this live single.');
        } else {
          setBidError(error.message);
        }
        return;
      }

      setBidSuccess(
        'Bid placed! If you are outbid later, your credits will be refunded automatically.'
      );
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
    const roundForSet = roundsBySet[setKey] ?? null;
    const plannedPacks = roundForSet?.total_packs_planned ?? 0;
    const packNumbers =
      roundForSet && plannedPacks > 0
        ? Array.from({ length: plannedPacks }, (_, i) => i + 1)
        : [];
    const biddingOpen = roundForSet?.bidding_status === 'open';
    const countdownLabel = formatCountdownLabel(roundForSet?.bidding_ends_at, nowTs);

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
            {roundsLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-blue-600 font-pokemon">Loading round...</span>
              </div>
            ) : roundForSet ? (
              <div className="space-y-1">
                <p className="text-blue-700 font-bold font-pokemon">
                  Round ID: {roundForSet.id}
                </p>
                <p className="text-blue-600 text-sm font-pokemon">
                  Round {roundForSet.round_number} • {plannedPacks} planned •{' '}
                  {roundForSet.packs_opened} opened • Status:{' '}
                  {(roundForSet.bidding_status || 'not_started').toUpperCase()}
                </p>
                {countdownLabel && (
                  <p className="text-blue-600 text-sm font-pokemon">
                    Bidding ends in: {countdownLabel}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-blue-600 font-pokemon">No round found</p>
            )}
          </div>
        </div>

        {/* PACK ROWS */}
        <div className="space-y-4">
          {packNumbers.map((packNum) => (
            <div key={`${setKey}-${packNum}`} className="rounded-2xl p-4 border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold font-pokemon">Pack {packNum}</h4>
                {!biddingOpen && <span className="text-sm">LOCKED</span>}
              </div>

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
                  const disabled =
                    !user || loadingUser || !biddingOpen || isProcessingEntry;
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
                          <span className="text-lg font-bold text-white font-pokemon">
                            {rarity}
                          </span>
                        </div>

                        <div className="mb-4">
                          <p className="text-gray-600 text-sm font-pokemon mb-2">
                            Enter lottery for this rarity
                          </p>
                          <p className="text-blue-600 font-semibold text-sm font-pokemon">
                            {count} participants
                          </p>
                        </div>

                        <div className="mt-auto">
                          <div className="relative">
                            {confirmingLotteryKey === `${packNum}-${rarity}` ? (
                              <div className="absolute inset-0 z-10">
                                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-3">
                                  <p className="text-sm text-gray-800 font-pokemon text-center">
                                    Confirm entry for Pack {packNum} • {rarity} (5 credits)?
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleCreditLotteryEntry}
                                      disabled={isProcessingEntry}
                                      className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-pokemon disabled:opacity-50"
                                    >
                                      {isProcessingEntry ? 'Submitting...' : 'Confirm'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmingLotteryKey(null)}
                                      disabled={isProcessingEntry}
                                      className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-300 transition-all text-sm font-pokemon disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleLotteryEntry(packNum, rarity)}
                                disabled={disabled}
                                className={`w-full ${bg} text-white font-bold py-3 rounded-lg transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {loadingUser
                                  ? 'Loading...'
                                  : !user
                                  ? 'Login to Enter'
                                  : !biddingOpen
                                  ? 'Bidding Closed'
                                  : 'Enter for 5 Credits'}
                              </button>
                            )}
                          </div>
                          {!loadingUser && !user && (
                            <div className="mt-2 text-orange-600 text-sm font-pokemon">
                              Please sign in to enter lottery
                            </div>
                          )}
                          {lotteryError && (
                            <p className="text-red-600 text-sm font-pokemon mt-2">
                              {lotteryError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {roundForSet && packNumbers.length === 0 && (
            <div className="text-center py-6 text-gray-600 font-pokemon">
              This round has 0 packs planned.
            </div>
          )}
        </div>
      </div>
    );
  }
  /** ------------------------------------------------------------------ */

  /** ----------------- LIVE SINGLES RENDER ----------------- */
  function renderLiveSingles() {
    // Options for filters (based on loaded singles)
    const setOptions = Array.from(
      new Set(
        liveSingles
          .map((r) => r.set_name)
          .filter((v): v is string => Boolean(v))
      )
    ).sort((a, b) => a.localeCompare(b));

    const conditionOptions = Array.from(
      new Set(
        liveSingles
          .map((r) => r.card_condition)
          .filter((v): v is string => Boolean(v))
      )
    ).sort((a, b) => a.localeCompare(b));

    let rows = [...liveSingles];

    // Text search
    if (singlesSearch) {
      const q = singlesSearch.toLowerCase();
      rows = rows.filter((r) =>
        (r.card_name || '').toLowerCase().includes(q) ||
        (r.set_name || '').toLowerCase().includes(q) ||
        (r.card_number || '').toLowerCase().includes(q) ||
        (r.card_condition || '').toLowerCase().includes(q)
      );
    }

    // Set filter
    if (singlesSetFilter !== 'all') {
      rows = rows.filter((r) => (r.set_name || '') === singlesSetFilter);
    }

    // Condition filter
    if (singlesConditionFilter !== 'all') {
      rows = rows.filter(
        (r) => (r.card_condition || '') === singlesConditionFilter
      );
    }

    // Sorting
    if (singlesSort === 'psa10-desc') {
      rows.sort((a, b) => {
        const aP = a.psa_10_price || 0;
        const bP = b.psa_10_price || 0;
        if (bP !== aP) return bP - aP;
        return (
          (b.ungraded_market_price || 0) -
          (a.ungraded_market_price || 0)
        );
      });
    } else if (singlesSort === 'psa10-asc') {
      rows.sort((a, b) => {
        const aP = a.psa_10_price || 0;
        const bP = b.psa_10_price || 0;
        if (aP !== bP) return aP - bP;
        return (
          (a.ungraded_market_price || 0) -
          (b.ungraded_market_price || 0)
        );
      });
    } else if (singlesSort === 'ungraded-desc') {
      rows.sort(
        (a, b) =>
          (b.ungraded_market_price || 0) -
          (a.ungraded_market_price || 0)
      );
    } else if (singlesSort === 'ungraded-asc') {
      rows.sort(
        (a, b) =>
          (a.ungraded_market_price || 0) -
          (b.ungraded_market_price || 0)
      );
    }

    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-2">
          Live Singles
        </h3>
        <p className="text-center text-gray-600 font-pokemon mb-6">
          Use your credits to bid on individual cards from my collection. Bidding
          stays open until the end of Round 3.
        </p>

        {/* Filters + Sort */}
        <div className="bg-gray-50 rounded-xl p-6 mb-2 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
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

            {/* Set Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={singlesSetFilter}
                onChange={(e) => setSinglesSetFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:outline-none font-pokemon appearance-none bg-white"
              >
                <option value="all">All Sets</option>
                {setOptions.map((set) => (
                  <option key={set} value={set}>
                    {set}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={singlesConditionFilter}
                onChange={(e) => setSinglesConditionFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:outline-none font-pokemon appearance-none bg-white"
              >
                <option value="all">All Conditions</option>
                {conditionOptions.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={singlesSort}
                onChange={(e) =>
                  setSinglesSort(
                    e.target.value as
                      | 'psa10-desc'
                      | 'psa10-asc'
                      | 'ungraded-desc'
                      | 'ungraded-asc'
                  )
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:outline-none font-pokemon appearance-none bg-white"
              >
                <option value="psa10-desc">PSA 10: High to Low</option>
                <option value="psa10-asc">PSA 10: Low to High</option>
                <option value="ungraded-desc">Ungraded: High to Low</option>
                <option value="ungraded-asc">Ungraded: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Errors */}
        {liveSinglesError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 font-pokemon">
                {liveSinglesError}
              </span>
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
            <p className="text-gray-600 font-pokemon">
              Check back soon for more!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map((card) => {
              const topBid = leadersMap[card.id] ?? 0;
              const isPlacing = placingBidFor === card.id;
              const biddingOpenForCard = card.status === 'open';

              return (
                <div
                  key={card.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-lg mb-3 bg-gray-50 flex items-center justify-center">
                    {card.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image_url}
                        alt={card.card_name}
                        className="object-contain w-full h-full"
                      />
                    ) : (
                      <div className="text-gray-400 font-pokemon">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold text-black font-pokemon">
                      {card.card_name}
                    </h4>
                    <div className="text-sm text-gray-600 font-pokemon">
                      {(card.set_name || 'Unknown Set')}{' '}
                      {card.card_number ? `• #${card.card_number}` : ''}
                    </div>
                    {card.card_condition && (
                      <div className="text-xs text-gray-500 font-pokemon">
                        Condition: {card.card_condition}
                      </div>
                    )}
                    <div className="text-sm text-gray-700 font-pokemon mt-1">
                      Market:{' '}
                      {card.ungraded_market_price != null
                        ? `$${card.ungraded_market_price.toFixed(2)}`
                        : '—'}
                      {card.psa_10_price != null
                        ? ` • PSA 10: $${card.psa_10_price.toFixed(2)}`
                        : ''}
                    </div>

                    <div className="mt-2 rounded-lg bg-gray-50 p-2 flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-pokemon">
                        Top Bid
                      </span>
                      <span className="text-sm font-bold text-black font-pokemon">
                        {topBid > 0 ? `$${topBid.toFixed(2)}` : '—'}
                      </span>
                    </div>

                    {!biddingOpenForCard && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold font-pokemon">
                          LOCKED
                        </span>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-5 gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={`≥ ${Math.max(
                          topBid + card.min_increment,
                          card.starting_bid
                        ).toFixed(2)}`}
                        value={bidInputs[card.id] ?? ''}
                        onChange={(e) =>
                          handleBidInputChange(card.id, e.target.value)
                        }
                        className="col-span-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-600 font-pokemon disabled:bg-gray-100 disabled:text-gray-500"
                        disabled={!biddingOpenForCard}
                      />
                      <div className="col-span-2 relative">
                        {confirmingLiveSingle === card.id ? (
                          <div className="absolute inset-0 z-10">
                            <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 space-y-2">
                              <p className="text-xs text-gray-700 font-pokemon">
                                Confirm bid of ${Number(bidInputs[card.id] || 0).toFixed(2)}?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handlePlaceLiveSingleBid(card)}
                                  disabled={isPlacing}
                                  className="flex-1 bg-red-600 text-white font-bold py-1.5 rounded-md hover:bg-red-700 transition-all text-xs font-pokemon"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmingLiveSingle(null)}
                                  disabled={isPlacing}
                                  className="flex-1 bg-gray-200 text-gray-800 font-bold py-1.5 rounded-md hover:bg-gray-300 transition-all text-xs font-pokemon"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingLiveSingle(card.id)}
                            disabled={
                              !user ||
                              isPlacing ||
                              !biddingOpenForCard ||
                              !bidInputs[card.id]
                            }
                            className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon"
                          >
                            {isPlacing
                              ? 'Bidding...'
                              : !biddingOpenForCard
                              ? 'Locked'
                              : user
                              ? 'Place Bid'
                              : 'Login'}
                          </button>
                        )}
                      </div>
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
              <span className="text-green-800 font-pokemon">
                {bidSuccess}
              </span>
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
              <span className="text-xl font-pokemon text-black">
                Loading Pokemon Cards...
              </span>
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
              <span className="text-xl font-pokemon">
                Error loading Pokemon cards
              </span>
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
              <span className="text-xl font-pokemon">
                No Pokemon cards available
              </span>
            </div>
            <p className="text-gray-600 font-pokemon">
              Check back soon for new Pokemon cards!
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Tab badges use chase slot counts
  const tabs = [
    {
      id: 'prismatic' as SetName,
      name: 'Prismatic Evolutions',
      count: chaseCounts.prismatic,
    },
    {
      id: 'crown_zenith' as SetName,
      name: 'Crown Zenith',
      count: chaseCounts.crown_zenith,
    },
    {
      id: 'destined_rivals' as SetName,
      name: 'Destined Rivals',
      count: chaseCounts.destined_rivals,
    },
  ];

  const plannedDisplayDirect = activeChaseRound?.total_packs_planned ?? 0;
  const chaseCountdownLabel = formatCountdownLabel(activeChaseRound?.bidding_ends_at, nowTs);
  const chaseBiddingOpen = activeChaseRound?.bidding_status === 'open';

  return (
    <section
      id="bidding"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 font-pokemon">
            Bid on Pokemon Cards
          </h2>
          <div className="text-lg text-gray-600 max-w-4xl mx-auto mb-8 font-pokemon">
            <p className="mb-4">
              Three exciting rounds:
              <br />
              Round 1 (Prismatic Evolutions)
              <br />
              Round 2 (Destined Rivals)
              <br />
              Round 3 (Crown Zenith)
              <br />
              Each round offers three entry options.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-4">
              <h4 className="font-bold text-black mb-3 font-pokemon">
                Option 1: Chase Slots
              </h4>
              <ul className="text-left space-y-2 mb-4">
                <li>• Use credits to bid on high-value cards from each set</li>
                <li>
                  • Highest bidder wins the slot; if the card is pulled in the
                  round, they keep it
                </li>
                <li>
                  • Credits are immediately refunded when you are outbid
                </li>
              </ul>

              <h4 className="font-bold text-black mb-3 font-pokemon">
                Option 2: Lottery + Rarity Selection
              </h4>
              <ul className="text-left space-y-2 mb-4">
                <li>
                  • Use credits to enter a lottery for Packs 1–N in a given
                  round by selecting a rarity for a specific pack
                </li>
                <li>
                  • If that rarity hits in that pack, you’re entered into that
                  pack’s prize pool
                </li>
                <li>
                  • One winner is drawn per pack — winner keeps all cards from
                  that specific pack (minus any cards won via Chase Slots).
                  That’s up to N winners per round.
                </li>
              </ul>

              <h4 className="font-bold text-black mb-3 font-pokemon">
                Option 3: Live Singles
              </h4>
              <ul className="text-left space-y-2 mb-0">
                <li>
                  • Use credits to bid on individual cards from my collection
                </li>
                <li>
                  • Open until the end of Round 3; highest bidder for each card
                  wins that card
                </li>
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

            {/* Search, Filter, Sort for Chase Slots */}
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
                    {uniqueRarities.map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {rarity}
                      </option>
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
                  Showing {filteredPokemon.length} of {currentPokemon.length}{' '}
                  Pokemon
                </span>
              </div>
            </div>

            {/* Round Info (Direct / Chase Slots) */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
              <div className="text-center">
                <h4 className="font-semibold text-blue-800 font-pokemon mb-2">
                  Current Round for {tabs.find((t) => t.id === activeTab)?.name}
                </h4>

                {roundsLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-blue-600 font-pokemon">
                      Loading round...
                    </span>
                  </div>
                ) : activeChaseRound ? (
                  <div className="space-y-1">
                    <p className="text-blue-700 font-bold font-pokemon">
                      Round ID: {activeChaseRound.id}
                    </p>
                    <p className="text-blue-600 text-sm font-pokemon">
                      Round {activeChaseRound.round_number} •{' '}
                      {plannedDisplayDirect} planned • {activeChaseRound.packs_opened} opened •
                      Status: {(activeChaseRound.bidding_status || 'not_started').toUpperCase()}
                    </p>
                    {chaseCountdownLabel && (
                      <p className="text-blue-600 text-sm font-pokemon">
                        Bidding ends in: {chaseCountdownLabel}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-blue-600 font-pokemon">No round found</p>
                )}
              </div>
            </div>

            {/* Cards (Chase Slots) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPokemon.map((poke, index) => (
                <PokemonCard
                  key={poke.id}
                  pokemon={poke}
                  isPopular={index === 0}
                  slotInfo={chaseSlotsByCardId[String(poke.id)] ?? null}
                  slotLoading={chaseSnapshotLoading}
                  user={user}
                  loadingUser={loadingUser}
                  isBiddingOpen={Boolean(chaseBiddingOpen)}
                  onBidSuccess={handleChaseBidSuccess}
                />
              ))}
            </div>

            {filteredPokemon.length === 0 && currentPokemon.length > 0 && (
              <div className="text-center py-12">
                <div className="flex items-center justify-center space-x-2 mb-4 text-gray-600">
                  <Sparkles className="h-8 w-8" />
                  <span className="text-xl font-pokemon">
                    No Pokemon Found
                  </span>
                </div>
                <p className="text-gray-600 font-pokemon">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </>
        ) : biddingMode === 'lottery' ? (
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

            {lotteryActiveTab === 'prismatic' &&
              renderSetPacks('prismatic', 'Prismatic Evolutions')}
            {lotteryActiveTab === 'crown_zenith' &&
              renderSetPacks('crown_zenith', 'Crown Zenith')}
            {lotteryActiveTab === 'destined_rivals' &&
              renderSetPacks('destined_rivals', 'Destined Rivals')}

            {/* Error and Success Messages */}
            {lotteryError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800 font-pokemon">
                    {lotteryError}
                  </span>
                </div>
              </div>
            )}

            {lotterySuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Sparkles className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-pokemon">
                    {lotterySuccess}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Live Singles
          renderLiveSingles()
        )}
      </div>
    </section>
  );
};

export default PokemonSection;
