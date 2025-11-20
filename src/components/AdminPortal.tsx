import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  CreditCard as Edit,
  Lock,
  Unlock,
  Eye,
  Save,
  X,
  AlertCircle,
  Loader,
  Ticket,
  Star,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/** ========= TYPES ========= */

interface Round {
  id: string;
  stream_id: string | null;
  set_name: string;
  round_number: number;
  packs_opened: number;
  total_packs_planned: number | null;
  chase_min_ungraded_price: number | null;
  locked: boolean;
  created_at: string;
  bidding_status?: 'not_started' | 'open' | 'closed' | null;
  bidding_started_at?: string | null;
  bidding_ends_at?: string | null;
}

interface AllCard {
  id: string; // bigserial in DB, but treated as string in the client
  card_name: string;
  card_number: string | null;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  ungraded_market_price: number | null;
  date_updated: string;
  // New DB fields (not strictly required by UI, but kept in sync)
  live_singles?: boolean;
  psa_10_price?: number | null;
}

interface PulledCard {
  id: string;
  round_id: string;
  all_card_id: string;
  card_name: string;
  card_number: string | null;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  ungraded_market_price: number | null;
  date_updated: string;
}

interface Stream {
  id: string;
  title: string;
  scheduled_date: string | null;
  created_at: string;
  // New stream state fields from DB
  status?: 'scheduled' | 'live' | 'ended' | null;
  started_at?: string | null;
  ended_at?: string | null;
  is_current?: boolean | null;
}

interface ChaseSlot {
  id: string;
  stream_id: string | null;
  round_id: string | null;
  set_name: string;
  all_card_id: string;
  starting_bid: number | null;
  min_increment: number | null;
  is_active: boolean;
  locked: boolean;
  winner_user_id: string | null;
  winning_bid_id: string | null;
}

interface LotteryEntry {
  id: string;
  round_id: string;
  user_id: string;
  pack_number: number;
  selected_rarity: string;
  credits_used: number;
  created_at: string;
  users?: {
    username?: string | null;
  };
}

interface LiveSingle {
  id: string;
  stream_id: string | null;
  inventory_id: string; // link back to live_singles_inventory
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
  status: 'open' | 'sold' | 'cancelled';
  created_at: string;
}

interface LiveSingleLeader {
  card_id: string;
  top_bid: number | null;
}

/** ========= CONSTANTS ========= */

const LOTTERY_RARITIES_BY_SET: Record<string, string[]> = {
  'SV: Prismatic Evolutions': ['SIR', 'Masterball Pattern', 'Ultra Rare', 'Pokeball Pattern'],
  'Crown Zenith: Galarian Gallery': [
    'Secret Rare (includes Pikachu)',
    'Ultra Rare (Non Galarian Gallery)',
    'Ultra Rare (Galarian Gallery)',
  ],
  'SV10: Destined Rivals': ['SIR / Hyper Rare', 'IR', 'Ultra Rare / Double Rare'],
};

const SET_OPTIONS = [
  'SV: Prismatic Evolutions',
  'SV10: Destined Rivals',
  'Crown Zenith: Galarian Gallery',
];

const formatCountdownLabel = (endIso?: string | null) => {
  if (!endIso) return null;
  const diff = new Date(endIso).getTime() - Date.now();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  const seconds = Math.max(0, Math.floor((diff % 60000) / 1000));
  if (diff <= 0) return '00:00';
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/** ========= COMPONENT ========= */

const AdminPortal: React.FC = () => {
  /** Core state */
  const [streams, setStreams] = useState<Stream[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');

  /** Create/Edit Stream */
  const [showCreateStreamForm, setShowCreateStreamForm] = useState(false);
  const [streamFormData, setStreamFormData] = useState({
    title: '',
    scheduled_date: '',
  });
  const [savingStream, setSavingStream] = useState(false);

  /** Rounds create/edit */
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [formData, setFormData] = useState({
    set_name: '',
    round_number: 1,
    packs_opened: 0,
    total_packs_planned: 10,
    chase_min_ungraded_price: 40,
    locked: false,
  });
  const [saving, setSaving] = useState(false);

  /** Data sets */
  const [allCards, setAllCards] = useState<AllCard[]>([]);
  const [pulledCards, setPulledCards] = useState<{ [roundId: string]: PulledCard[] }>({});
  const [chaseSlots, setChaseSlots] = useState<{ [roundId: string]: ChaseSlot[] }>({});
  const [lotteryEntries, setLotteryEntries] = useState<{ [roundId: string]: LotteryEntry[] }>({});
  const [liveSinglesByStream, setLiveSinglesByStream] = useState<{ [streamId: string]: LiveSingle[] }>({});
  const [liveSinglesLeaders, setLiveSinglesLeaders] = useState<Record<string, number>>({}); // card_id -> top_bid

  /** UI helpers */
  const [loading, setLoading] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const [trackingRound, setTrackingRound] = useState<string | null>(null);

  /** Search / filter for pulled-cards tool */
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetFilter, setSelectedSetFilter] = useState('');
  const [selectedRarityFilter, setSelectedRarityFilter] = useState('');
  const [searchResults, setSearchResults] = useState<AllCard[]>([]);
  const [addingCard, setAddingCard] = useState(false);

  /** ========= INITIAL LOAD ========= */

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchStreams(), fetchRounds(), fetchAllCards()]);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Search results for pulled-cards tool */
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    let filtered = allCards.filter(
      (card) =>
        (card.card_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.set_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedSetFilter) {
      filtered = filtered.filter((card) => card.set_name === selectedSetFilter);
    }
    if (selectedRarityFilter) {
      filtered = filtered.filter((card) => card.rarity === selectedRarityFilter);
    }

    setSearchResults(filtered.slice(0, 40));
  }, [searchTerm, selectedSetFilter, selectedRarityFilter, allCards]);

  /** ========= FETCH HELPERS ========= */

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStreams(data || []);
    } catch (err: any) {
      console.error('Error fetching streams:', err);
      setError(err.message || 'Failed to fetch streams');
    }
  };

  const fetchRounds = async () => {
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRounds(data || []);
    } catch (err: any) {
      console.error('Error fetching rounds:', err);
      setError(err.message || 'Failed to fetch rounds');
    }
  };

  const fetchAllCards = async () => {
    try {
      setLoadingCards(true);
      const { data, error } = await supabase
        .from('all_cards')
        .select('*')
        .order('card_name');
      if (error) throw error;
      setAllCards(data || []);
    } catch (err: any) {
      console.error('Error fetching all_cards:', err);
      setError(err.message || 'Failed to fetch card catalog');
    } finally {
      setLoadingCards(false);
    }
  };

  const fetchPulledCards = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('pulled_cards')
        .select('*')
        .eq('round_id', roundId)
        .order('date_updated', { ascending: false });
      if (error) throw error;
      setPulledCards((prev) => ({ ...prev, [roundId]: data || [] }));
    } catch (err) {
      console.error('Failed to fetch pulled cards:', err);
    }
  };

  const fetchChaseSlotsForRound = async (round: Round) => {
    try {
      const { data, error } = await supabase
        .from('chase_slots')
        .select('*')
        .eq('round_id', round.id)
        .order('starting_bid', { ascending: false });
      if (error) throw error;
      setChaseSlots((prev) => ({ ...prev, [round.id]: (data || []) as ChaseSlot[] }));
    } catch (err) {
      console.error('Failed to fetch chase slots:', err);
    }
  };

  const fetchLotteryEntriesForRound = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('lottery_entries')
        .select(
          `
          *,
          users (
            username
          )
        `
        )
        .eq('round_id', roundId);
      if (error) throw error;
      setLotteryEntries((prev) => ({ ...prev, [roundId]: (data || []) as LotteryEntry[] }));
    } catch (err) {
      console.error('Failed to fetch lottery entries:', err);
    }
  };

  const fetchLiveSinglesForStream = async (streamId: string) => {
    try {
      const { data, error } = await supabase
        .from('live_singles')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_active', true)
        .eq('status', 'open') // only show open singles
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLiveSinglesByStream((prev) => ({
        ...prev,
        [streamId]: (data || []) as LiveSingle[],
      }));

      const { data: leaders, error: leadersErr } = await supabase
        .from('live_singles_leaders')
        .select('card_id, top_bid');

      if (!leadersErr && leaders) {
        const map: Record<string, number> = {};
        (leaders as LiveSingleLeader[]).forEach((row) => {
          if (row.card_id) map[row.card_id] = row.top_bid || 0;
        });
        setLiveSinglesLeaders(map);
      }
    } catch (err) {
      console.error('Failed to fetch live singles:', err);
    }
  };

  /** ========= STREAM HANDLERS ========= */

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStream(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('streams')
        .insert([
          {
            title: streamFormData.title,
            scheduled_date: streamFormData.scheduled_date || null,
          },
        ])
        .select()
        .single();
      if (error) throw error;

      setStreams((prev) => [data, ...prev]);
      setShowCreateStreamForm(false);
      setStreamFormData({ title: '', scheduled_date: '' });
      setSuccessMessage(`Stream "${data.title}" created successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to create stream');
    } finally {
      setSavingStream(false);
    }
  };

  const handleSetCurrentStream = async () => {
    if (!selectedStreamId) return;

    setError(null);
    setSuccessMessage(null);

    const selectedStream = streams.find((s) => s.id === selectedStreamId);

    try {
      const { error } = await supabase.rpc('set_current_stream', {
        p_stream_id: selectedStreamId,
      });
      if (error) throw error;

      // Refresh streams so is_current flags are updated locally
      await fetchStreams();

      setSuccessMessage(
        `Current stream set to "${selectedStream?.title || 'Selected Stream'}" successfully.`
      );
    } catch (err: any) {
      console.error('Failed to set current stream:', err);
      setError(err.message || 'Failed to set current stream');
    }
  };

  /**
   * Generate Live Singles for the selected stream by calling the DB function
   * create_live_singles_for_stream(p_stream_id) and then refreshing Live Singles.
   */
  const handleGenerateLiveSinglesForStream = async () => {
    if (!selectedStreamId) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.rpc('create_live_singles_for_stream', {
        p_stream_id: selectedStreamId,
      });
      if (error) throw error;

      // Refresh Live Singles for this stream so the UI reflects the new rows
      await fetchLiveSinglesForStream(selectedStreamId);

      const stream = streams.find((s) => s.id === selectedStreamId);
      setSuccessMessage(
        `Live Singles generated for stream "${stream?.title || 'Selected Stream'}" successfully.`
      );
    } catch (err: any) {
      console.error('Failed to generate live singles for stream:', err);
      setError(err.message || 'Failed to generate live singles for stream');
    }
  };

  /** ========= ROUND HANDLERS ========= */

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStreamId) {
      setError('Please select a stream first');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('rounds')
        .insert([
          {
            ...formData,
            stream_id: selectedStreamId,
          },
        ])
        .select()
        .single();
      if (error) throw error;

      setRounds((prev) => [data, ...prev]);
      setShowCreateForm(false);
      resetRoundForm();
      setSuccessMessage(
        `Round ${data.round_number} for "${data.set_name}" created successfully.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to create round');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRound) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('rounds')
        .update(formData)
        .eq('id', editingRound.id)
        .select()
        .single();
      if (error) throw error;

      setRounds((prev) => prev.map((r) => (r.id === editingRound.id ? data : r)));
      setEditingRound(null);
      resetRoundForm();
      setSuccessMessage(
        `Round ${data.round_number} for "${data.set_name}" updated successfully.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update round');
    } finally {
      setSaving(false);
    }
  };

  const toggleRoundLock = async (round: Round) => {
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('rounds')
        .update({ locked: !round.locked })
        .eq('id', round.id)
        .select()
        .single();
      if (error) throw error;
      setRounds((prev) => prev.map((r) => (r.id === round.id ? data : r)));

      setSuccessMessage(
        `Round ${data.round_number} for "${data.set_name}" is now ${
          data.locked ? 'LOCKED' : 'UNLOCKED'
        }.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to toggle round lock');
    }
  };

  const handleGenerateChaseSlots = async (round: Round) => {
    setError(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.rpc('generate_chase_slots_for_round', {
        p_round_id: round.id,
      });
      if (error) throw error;
      await fetchChaseSlotsForRound(round);
      setSuccessMessage(`Chase slots generated for ${round.set_name}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate chase slots');
    }
  };

  const handleOpenBidding = async (round: Round, durationMinutes = 7) => {
    setError(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.rpc('open_round_bidding', {
        p_round_id: round.id,
        p_duration_minutes: durationMinutes,
      });
      if (error) throw error;
      await fetchRounds();
      await fetchChaseSlotsForRound(round);
      setSuccessMessage(`Bidding opened for Round ${round.round_number}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to open bidding');
    }
  };

  const handleCloseBidding = async (round: Round) => {
    setError(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.rpc('close_round_bidding', {
        p_round_id: round.id,
      });
      if (error) throw error;
      await fetchRounds();
      await fetchChaseSlotsForRound(round);
      setSuccessMessage(`Bidding closed for Round ${round.round_number}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to close bidding');
    }
  };

  const handleExtendBidding = async (round: Round, extraSeconds = 60) => {
    setError(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.rpc('extend_round_bidding', {
        p_round_id: round.id,
        p_extra_seconds: extraSeconds,
      });
      if (error) throw error;
      await fetchRounds();
      setSuccessMessage(`Extended bidding by ${extraSeconds} seconds.`);
    } catch (err: any) {
      setError(err.message || 'Failed to extend bidding');
    }
  };

  const startEdit = (round: Round) => {
    setEditingRound(round);
    setShowCreateForm(true);
    setFormData({
      set_name: round.set_name,
      round_number: round.round_number,
      packs_opened: round.packs_opened ?? 0,
      total_packs_planned: round.total_packs_planned ?? 10,
      chase_min_ungraded_price: round.chase_min_ungraded_price ?? 40,
      locked: round.locked,
    });
  };

  const cancelEdit = () => {
    setEditingRound(null);
    setShowCreateForm(false);
    resetRoundForm();
  };

  const resetRoundForm = () => {
    setFormData({
      set_name: '',
      round_number: 1,
      packs_opened: 0,
      total_packs_planned: 10,
      chase_min_ungraded_price: 40,
      locked: false,
    });
  };

  /** ========= PULLED CARDS ========= */

  const handleAddPulledCard = async (card: AllCard, roundId: string) => {
    setAddingCard(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('pulled_cards')
        .insert([
          {
            round_id: roundId,
            all_card_id: card.id,
            card_name: card.card_name,
            card_number: card.card_number,
            set_name: card.set_name,
            rarity: card.rarity,
            image_url: card.image_url,
            ungraded_market_price: card.ungraded_market_price,
            date_updated: card.date_updated,
          },
        ])
        .select()
        .single();
      if (error) throw error;

      setPulledCards((prev) => ({
        ...prev,
        [roundId]: [data, ...(prev[roundId] || [])],
      }));

      setSearchTerm('');
      setSearchResults([]);
      setSuccessMessage(`Pulled card "${data.card_name}" added to this round.`);
    } catch (err: any) {
      setError(err.message || 'Failed to add pulled card');
    } finally {
      setAddingCard(false);
    }
  };

  const startTrackingCards = (roundId: string) => {
    setTrackingRound(roundId);
    setSearchTerm('');
    setSearchResults([]);
    setSelectedSetFilter('');
    setSelectedRarityFilter('');
    if (!pulledCards[roundId]) {
      fetchPulledCards(roundId);
    }
  };

  const stopTrackingCards = () => {
    setTrackingRound(null);
    setSearchTerm('');
    setSelectedSetFilter('');
    setSelectedRarityFilter('');
    setSearchResults([]);
  };

  /** ========= ROUND EXPANSION ========= */

  const toggleExpandRound = (roundId: string) => {
    if (expandedRound === roundId) {
      setExpandedRound(null);
      return;
    }

    const round = rounds.find((r) => r.id === roundId);
    setExpandedRound(roundId);

    if (round) {
      if (!pulledCards[roundId]) fetchPulledCards(roundId);
      if (!chaseSlots[roundId]) fetchChaseSlotsForRound(round);
      if (!lotteryEntries[roundId]) fetchLotteryEntriesForRound(roundId);
      if (round.stream_id && !liveSinglesByStream[round.stream_id]) {
        fetchLiveSinglesForStream(round.stream_id);
      }
    }
  };

  /** ========= DERIVED FILTER OPTIONS ========= */

  const uniqueSets = [...new Set(allCards.map((c) => c.set_name).filter(Boolean))] as string[];
  const uniqueRarities = [...new Set(allCards.map((c) => c.rarity).filter(Boolean))] as string[];

  /** ========= RENDER HELPERS ========= */

  const renderChaseSlots = (round: Round) => {
    const slots = chaseSlots[round.id] || [];
    if (!slots.length) {
      return (
        <p className="text-gray-500 text-sm font-pokemon">
          No Chase Slots configured for this round&apos;s set/stream.
        </p>
      );
    }

    // Map all_cards by id for display
    const cardById: Record<string, AllCard> = {};
    allCards.forEach((c) => {
      cardById[String(c.id)] = c;
    });

    return (
      <div className="space-y-3">
        <p className="text-gray-600 text-xs font-pokemon">
          Showing Chase Slots for stream{' '}
          <span className="font-semibold">{round.stream_id}</span> and set{' '}
          <span className="font-semibold">{round.set_name}</span>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {slots.map((slot) => {
            const card = cardById[String(slot.all_card_id)];
            return (
              <div
                key={slot.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-black text-sm font-pokemon">
                    {card?.card_name || 'Unknown Card'}
                  </h5>
                  {slot.locked && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-pokemon">
                      LOCKED
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs font-pokemon">
                  {card?.set_name} {card?.card_number ? `• #${card.card_number}` : ''}
                </p>
                <p className="text-gray-600 text-xs font-pokemon">
                  Market:{' '}
                  {card?.ungraded_market_price != null
                    ? `$${card.ungraded_market_price.toFixed(2)}`
                    : '—'}
                </p>
                <p className="text-gray-700 text-xs font-pokemon">
                  Starting Bid:{' '}
                  {slot.starting_bid != null ? `$${slot.starting_bid.toFixed(2)}` : '—'} • Min Inc:{' '}
                  {slot.min_increment != null ? `$${slot.min_increment.toFixed(2)}` : '—'}
                </p>
                <p className="text-gray-500 text-[10px] font-pokemon">
                  Active: {slot.is_active ? 'Yes' : 'No'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLotteryEntries = (round: Round) => {
    const entries = lotteryEntries[round.id] || [];
    if (!entries.length) {
      return (
        <p className="text-gray-500 text-sm font-pokemon">
          No lottery entries yet for this round.
        </p>
      );
    }

    // Build counts per pack/rarity
    const counts: Record<number, Record<string, number>> = {};
    entries.forEach((e) => {
      const p = e.pack_number || 0;
      counts[p] = counts[p] || {};
      counts[p][e.selected_rarity] = (counts[p][e.selected_rarity] || 0) + 1;
    });

    const rarities = LOTTERY_RARITIES_BY_SET[round.set_name] || [];

    const totalPacks = round.total_packs_planned ?? 0;
    const packNumbers =
      totalPacks > 0
        ? Array.from({ length: totalPacks }, (_, i) => i + 1)
        : Object.keys(counts)
            .map((n) => parseInt(n, 10))
            .sort((a, b) => a - b);

    return (
      <div className="space-y-3">
        <p className="text-gray-600 text-xs font-pokemon">
          Total Entries:{' '}
          <span className="font-semibold">{entries.length}</span>
        </p>
        <div className="space-y-2">
          {packNumbers.map((pack) => {
            const row = counts[pack] || {};
            const totalForPack = Object.values(row).reduce((a, b) => a + b, 0);
            if (!totalForPack) return null;

            return (
              <div
                key={pack}
                className="bg-gray-50 border border-gray-200 rounded-lg p-2 px-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ticket className="h-3 w-3 text-blue-500" />
                    <span className="font-pokemon text-xs font-semibold">
                      Pack {pack}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-pokemon">
                    {totalForPack} entr
                    {totalForPack === 1 ? 'y' : 'ies'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(rarities.length ? rarities : Object.keys(row)).map((rar) => {
                    const c = row[rar] || 0;
                    if (!c) return null;
                    return (
                      <span
                        key={rar}
                        className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-pokemon"
                      >
                        {rar}: {c}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPulledCardsSummary = (round: Round) => {
    const cards = pulledCards[round.id] || [];
    if (!cards.length) {
      return (
        <p className="text-gray-500 text-sm font-pokemon">
          No cards pulled yet for this round.
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-blue-50 rounded-lg p-3 border border-blue-200 flex flex-col"
          >
            {card.image_url && (
              <div className="aspect-square mb-2 bg-white rounded-md overflow-hidden border border-gray-200">
                <img
                  src={card.image_url}
                  alt={card.card_name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="space-y-0.5">
              <h5 className="font-semibold text-black text-sm font-pokemon">
                {card.card_name}
              </h5>
              <p className="text-gray-600 text-xs font-pokemon">
                {card.set_name}{' '}
                {card.card_number ? `• #${card.card_number}` : ''}
              </p>
              <p className="text-gray-500 text-[10px] font-pokemon">
                {card.rarity}
              </p>
              <p className="text-blue-700 font-semibold text-xs font-pokemon">
                {card.ungraded_market_price != null
                  ? `$${card.ungraded_market_price}`
                  : '—'}
              </p>
              <p className="text-gray-400 text-[9px] font-pokemon">
                Logged {new Date(card.date_updated).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLiveSinglesForRound = (round: Round) => {
    if (!round.stream_id) {
      return (
        <p className="text-gray-500 text-sm font-pokemon">
          No stream_id on this round; cannot load Live Singles.
        </p>
      );
    }

    const singles = liveSinglesByStream[round.stream_id] || [];
    if (!singles.length) {
      return (
        <p className="text-gray-500 text-sm font-pokemon">
          No active Live Singles listed for this stream.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-gray-600 text-xs font-pokemon">
          Showing Live Singles (active & open) for this stream. Bidding is managed by
          the <code>place_live_single_bid_immediate_refund</code> function.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {singles.map((card) => {
            const topBid = liveSinglesLeaders[card.id] ?? 0;
            return (
              <div
                key={card.id}
                className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col space-y-1"
              >
                <div className="flex justify-between items-start">
                  <h5 className="font-semibold text-black text-sm font-pokemon">
                    {card.card_name}
                  </h5>
                  {card.card_condition && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-pokemon">
                      {card.card_condition}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-xs font-pokemon">
                  {card.set_name || 'Unknown Set'}{' '}
                  {card.card_number ? `• #${card.card_number}` : ''}
                </p>
                <p className="text-gray-700 text-xs font-pokemon">
                  Market:{' '}
                  {card.ungraded_market_price != null
                    ? `$${card.ungraded_market_price.toFixed(2)}`
                    : '—'}{' '}
                  {card.psa_10_price != null && (
                    <span className="text-gray-500">
                      • PSA 10: ${card.psa_10_price.toFixed(2)}
                    </span>
                  )}
                </p>
                <p className="text-gray-700 text-xs font-pokemon">
                  Start: ${card.starting_bid.toFixed(2)} • Min Inc: $
                  {card.min_increment.toFixed(2)}
                </p>
                <p className="text-red-600 text-xs font-pokemon">
                  Top Bid:{' '}
                  {topBid > 0 ? `$${topBid.toFixed(2)}` : '—'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /** ========= DERIVED CURRENT STREAM ========= */
  const currentStream = streams.find((s) => s.is_current);

  /** ========= LOADING STATE ========= */

  if (loading) {
    return (
      <div
        id="admin"
        className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-yellow-600 mx-auto mb-4" />
            <span className="text-xl font-pokemon text-black">
              Loading Admin Portal...
            </span>
          </div>
        </div>
      </div>
    );
  }

  /** ========= MAIN RENDER ========= */

  return (
    <div
      id="admin"
      className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-black font-pokemon">
              Admin Portal
            </h1>
          </div>
          <p className="text-gray-600 font-pokemon">
            Manage streams, rounds, Chase Slots, lottery entries, Live Singles,
            and pulled cards for your events.
          </p>

          {/* Current Stream Banner */}
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-purple-700 font-pokemon mb-1">
              Current Stream
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center justify-between">
              {currentStream ? (
                <>
                  <div>
                    <p className="text-sm font-semibold text-purple-900 font-pokemon">
                      {currentStream.title}
                    </p>
                    <p className="text-xs text-purple-800 font-pokemon mt-1">
                      {currentStream.scheduled_date
                        ? `Scheduled: ${new Date(
                            currentStream.scheduled_date
                          ).toLocaleString()}`
                        : 'No scheduled date'}
                    </p>
                    <p className="text-[11px] text-purple-700 font-mono mt-1">
                      ID: {currentStream.id}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-pokemon font-semibold">
                    ACTIVE
                  </span>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-sm font-semibold text-purple-900 font-pokemon">
                      No current stream is set
                    </p>
                    <p className="text-xs text-purple-800 font-pokemon mt-1">
                      Use the “Set as Current Stream” button in Stream Management
                      to mark one as active.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold font-pokemon">Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1 font-pokemon">
              {error}
            </p>
          </div>
        )}

        {/* Success */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold font-pokemon">Success</span>
            </div>
            <p className="text-green-700 text-sm mt-1 font-pokemon">
              {successMessage}
            </p>
          </div>
        )}

        {/* STREAM MANAGEMENT */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-black font-pokemon">
              Stream Management
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {streams.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 font-pokemon mb-4">
                  No streams created yet.
                </p>
                <button
                  onClick={() => setShowCreateStreamForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all font-pokemon inline-flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New Stream</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                      Select Active Stream
                    </label>
                    <select
                      value={selectedStreamId}
                      onChange={(e) =>
                        setSelectedStreamId(e.target.value)
                      }
                      className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none font-pokemon"
                    >
                      <option value="">Select a stream</option>
                      {streams.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                          {s.scheduled_date
                            ? ` - ${new Date(
                                s.scheduled_date
                              ).toLocaleString()}`
                            : ''}
                          {s.is_current ? ' (Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-3 self-start">
                    <button
                      type="button"
                      disabled={!selectedStreamId}
                      onClick={handleSetCurrentStream}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-all font-pokemon inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Star className="h-4 w-4" />
                      <span>Set as Current Stream</span>
                    </button>
                    <button
                      type="button"
                      disabled={!selectedStreamId}
                      onClick={handleGenerateLiveSinglesForStream}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all font-pokemon inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Generate Live Singles</span>
                    </button>
                    <button
                      onClick={() => setShowCreateStreamForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all font-pokemon inline-flex items-center space-x-2 self-start"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create New Stream</span>
                    </button>
                  </div>
                </div>

                {showCreateStreamForm && (
                  <div className="bg-gray-50 rounded-lg p-6 mt-4 border border-gray-200">
                    <h3 className="text-lg font-bold text-black font-pokemon mb-4">
                      Create New Stream
                    </h3>
                    <form
                      onSubmit={handleCreateStream}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                            Stream Title{' '}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={streamFormData.title}
                            onChange={(e) =>
                              setStreamFormData((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none font-pokemon"
                            placeholder="Enter stream title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                            Scheduled Date
                          </label>
                          <input
                            type="datetime-local"
                            value={streamFormData.scheduled_date}
                            onChange={(e) =>
                              setStreamFormData((prev) => ({
                                ...prev,
                                scheduled_date: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none font-pokemon"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={savingStream}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon inline-flex items-center space-x-2"
                        >
                          {savingStream ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin" />
                              <span>Creating...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              <span>Create Stream</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateStreamForm(false);
                            setStreamFormData({
                              title: '',
                              scheduled_date: '',
                            });
                          }}
                          className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all font-pokemon inline-flex items-center space-x-2"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ROUND MANAGEMENT */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black font-pokemon">
                Round Management
              </h2>
              {!selectedStreamId && (
                <p className="text-gray-500 text-sm mt-1 font-pokemon">
                  Select a stream above to create rounds.
                </p>
              )}
            </div>
            <button
              disabled={!selectedStreamId}
              onClick={() => {
                setShowCreateForm(true);
                setEditingRound(null);
                resetRoundForm();
              }}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-all font-pokemon inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Round</span>
            </button>
          </div>

          <div className="p-6">
            {(showCreateForm || editingRound) && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                <h3 className="text-lg font-bold text-black font-pokemon mb-4">
                  {editingRound ? 'Edit Round' : 'Create New Round'}
                </h3>
                <form
                  onSubmit={
                    editingRound ? handleEditRound : handleCreateRound
                  }
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Set Name{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.set_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            set_name: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-600 focus:outline-none font-pokemon"
                      >
                        <option value="">Select a set</option>
                        {SET_OPTIONS.map((set) => (
                          <option key={set} value={set}>
                            {set}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Round Number{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.round_number}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            round_number: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-600 focus:outline-none font-pokemon"
                      >
                        <option value={1}>Round 1</option>
                        <option value={2}>Round 2</option>
                        <option value={3}>Round 3</option>
                      </select>
                    </div>

                    {/* Total Packs Planned */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Total Packs Planned{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={50}
                        value={formData.total_packs_planned}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            total_packs_planned: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-600 focus:outline-none font-pokemon"
                      />
                    </div>

                    {/* Packs Opened */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Packs Opened So Far
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={formData.total_packs_planned || 999}
                        value={formData.packs_opened}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            packs_opened: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-600 focus:outline-none font-pokemon"
                      />
                      <p className="text-[10px] text-gray-500 mt-1 font-pokemon">
                        This tracks how many packs you&apos;ve actually opened during the stream.
                      </p>
                    </div>

                    {/* Chase Slot Min Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Chase Slot Min Price ($){' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        step={1}
                        value={formData.chase_min_ungraded_price}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            chase_min_ungraded_price: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-600 focus:outline-none font-pokemon"
                      />
                      <p className="text-[10px] text-gray-500 mt-1 font-pokemon">
                        All cards from this set with ungraded market price at or above this value
                        will be used to populate Chase Slots (via your DB function/trigger).
                      </p>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center space-x-2 font-pokemon">
                        <input
                          type="checkbox"
                          checked={formData.locked}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              locked: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-600"
                        />
                        <span className="text-sm text-gray-700">
                          Lock round immediately
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon inline-flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>
                            {editingRound
                              ? 'Updating...'
                              : 'Creating...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>
                            {editingRound
                              ? 'Update Round'
                              : 'Create Round'}
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all font-pokemon inline-flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Rounds list */}
            <div className="space-y-4">
              {rounds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-pokemon">
                    No rounds created yet.
                  </p>
                </div>
              ) : (
                rounds
                  .filter(
                    (r) =>
                      !selectedStreamId ||
                      r.stream_id === selectedStreamId
                  )
                  .map((round) => {
                    const biddingOpen = round.bidding_status === 'open';
                    const countdownLabel = formatCountdownLabel(round.bidding_ends_at);
                    return (
                    <div
                      key={round.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-bold text-black font-pokemon">
                              Round {round.round_number} -{' '}
                              {round.set_name}
                            </h3>
                            <div
                              className={`px-2 py-1 rounded-full text-xs font-semibold font-pokemon ${
                                round.locked
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {round.locked
                                ? 'LOCKED'
                                : 'UNLOCKED'}
                            </div>
                          </div>
                          <p className="text-gray-600 text-xs font-pokemon mt-1">
                            Stream:{' '}
                            {round.stream_id || '—'} • Packs Opened:{' '}
                            {round.packs_opened ?? 0} /{' '}
                            {round.total_packs_planned ?? 0} planned • Chase Min:{' '}
                            {round.chase_min_ungraded_price != null
                              ? `$${round.chase_min_ungraded_price}`
                              : '—'}{' '}
                            • Created{' '}
                            {new Date(
                              round.created_at
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-gray-600 text-xs font-pokemon">
                            Bidding Status:{' '}
                            {(round.bidding_status || 'not_started').toUpperCase()}
                            {round.bidding_ends_at && (
                              <>
                                {' '}• Ends{' '}
                                {new Date(round.bidding_ends_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </>
                            )}
                            {countdownLabel && round.bidding_status === 'open' && (
                              <> • Countdown: {countdownLabel}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                          <button
                            onClick={() => handleGenerateChaseSlots(round)}
                            className="bg-purple-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-purple-700 transition-all inline-flex items-center space-x-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Generate Slots</span>
                          </button>
                          <button
                            onClick={() =>
                              toggleExpandRound(round.id)
                            }
                            className="bg-blue-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-blue-700 transition-all inline-flex items-center space-x-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() =>
                              startTrackingCards(round.id)
                            }
                            className="bg-green-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-green-700 transition-all inline-flex items-center space-x-1"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Track Pulls</span>
                          </button>
                          <button
                            onClick={() => startEdit(round)}
                            className="bg-gray-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-gray-700 transition-all inline-flex items-center space-x-1"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() =>
                              toggleRoundLock(round)
                            }
                            className={`px-3 py-1 rounded font-pokemon text-sm transition-all inline-flex items-center space-x-1 ${
                              round.locked
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {round.locked ? (
                              <>
                                <Unlock className="h-3 w-3" />
                                <span>Unlock</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                <span>Lock</span>
                              </>
                            )}
                          </button>
                          {biddingOpen ? (
                            <>
                              <button
                                onClick={() => handleCloseBidding(round)}
                                className="bg-red-500 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-red-600 transition-all inline-flex items-center space-x-1"
                              >
                                <Lock className="h-3 w-3" />
                                <span>Close Bidding</span>
                              </button>
                              <button
                                onClick={() => handleExtendBidding(round)}
                                className="bg-yellow-500 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-yellow-600 transition-all inline-flex items-center space-x-1"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Extend +1m</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenBidding(round)}
                              className="bg-green-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-green-700 transition-all inline-flex items-center space-x-1"
                            >
                              <Unlock className="h-3 w-3" />
                              <span>Open Bidding</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded per-round dashboard */}
                      {expandedRound === round.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-6">
                          {/* Chase Slots */}
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <h4 className="font-semibold text-black font-pokemon">
                                Chase Slots (Option 1)
                              </h4>
                            </div>
                            {renderChaseSlots(round)}
                          </div>

                          {/* Lottery */}
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Ticket className="h-4 w-4 text-blue-500" />
                              <h4 className="font-semibold text-black font-pokemon">
                                Lottery Entries (Option 2)
                              </h4>
                            </div>
                            {renderLotteryEntries(round)}
                          </div>

                          {/* Live Singles */}
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <CreditCardIcon />
                              <h4 className="font-semibold text-black font-pokemon">
                                Live Singles (Option 3)
                              </h4>
                            </div>
                            {renderLiveSinglesForRound(round)}
                          </div>

                          {/* Pulled Cards Summary */}
                          <div>
                            <h4 className="font-semibold text-black font-pokemon mb-2">
                              Pulled Cards Summary
                            </h4>
                            {renderPulledCardsSummary(round)}
                          </div>
                        </div>
                      )}

                      {/* Pulled Cards Tracking Panel */}
                      {trackingRound === round.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-black font-pokemon">
                              Track Pulled Cards (Round{' '}
                              {round.round_number})
                            </h4>
                            <button
                              onClick={stopTrackingCards}
                              className="bg-gray-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-gray-700 transition-all inline-flex items-center space-x-1"
                            >
                              <X className="h-3 w-3" />
                              <span>Close</span>
                            </button>
                          </div>

                          {/* Search + filters */}
                          <div className="mb-4 space-y-3">
                            <input
                              type="text"
                              placeholder="Search cards by name or set..."
                              value={searchTerm}
                              onChange={(e) =>
                                setSearchTerm(e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none font-pokemon"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 font-pokemon">
                                  Filter by Set
                                </label>
                                <select
                                  value={selectedSetFilter}
                                  onChange={(e) =>
                                    setSelectedSetFilter(
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none font-pokemon"
                                >
                                  <option value="">
                                    All Sets
                                  </option>
                                  {uniqueSets.map((set) => (
                                    <option
                                      key={set}
                                      value={set}
                                    >
                                      {set}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 font-pokemon">
                                  Filter by Rarity
                                </label>
                                <select
                                  value={selectedRarityFilter}
                                  onChange={(e) =>
                                    setSelectedRarityFilter(
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none font-pokemon"
                                >
                                  <option value="">
                                    All Rarities
                                  </option>
                                  {uniqueRarities.map(
                                    (rarity) => (
                                      <option
                                        key={rarity}
                                        value={rarity}
                                      >
                                        {rarity}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Search results */}
                          {searchResults.length > 0 && (
                            <div className="mb-6">
                              <h5 className="font-semibold text-black font-pokemon mb-2">
                                Search Results
                              </h5>
                              <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                                {searchResults.map((card) => (
                                  <div
                                    key={card.id}
                                    className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                                  >
                                    <div className="flex-1">
                                      <h6 className="font-semibold text-black text-sm font-pokemon">
                                        {card.card_name}
                                      </h6>
                                      <p className="text-gray-600 text-xs font-pokemon">
                                        {card.set_name} •{' '}
                                        {card.rarity} • $
                                        {card.ungraded_market_price ||
                                          '—'}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleAddPulledCard(
                                          card,
                                          round.id
                                        )
                                      }
                                      disabled={
                                        addingCard
                                      }
                                      className="bg-green-600 text-white px-3 py-1 rounded font-pokemon text-xs hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-1"
                                    >
                                      {addingCard ? (
                                        <Loader className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Plus className="h-3 w-3" />
                                      )}
                                      <span>
                                        Add
                                      </span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Already pulled for this round */}
                          <div>
                            <h5 className="font-semibold text-black font-pokemon mb-2">
                              Pulled Cards (
                              {pulledCards[round.id]
                                ?.length || 0}
                              )
                            </h5>
                            {pulledCards[round.id] &&
                            pulledCards[round.id]
                              .length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {pulledCards[
                                  round.id
                                ].map(
                                  (
                                    card
                                  ) => (
                                    <div
                                      key={
                                        card.id
                                      }
                                      className="bg-green-50 rounded-lg p-3 border border-green-200"
                                    >
                                      <h6 className="font-semibold text-black text-sm font-pokemon">
                                        {
                                          card.card_name
                                        }
                                      </h6>
                                      <p className="text-gray-600 text-xs font-pokemon">
                                        {
                                          card.set_name
                                        }{' '}
                                        •{' '}
                                        {
                                          card.rarity
                                        }
                                      </p>
                                      <p className="text-green-700 font-semibold text-xs font-pokemon">
                                        $
                                        {card.ungraded_market_price ||
                                          '—'}
                                      </p>
                                      <p className="text-gray-500 text-[10px] font-pokemon">
                                        Added{' '}
                                        {new Date(
                                          card.date_updated
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm font-pokemon">
                                No cards pulled yet
                                for this round.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Tiny icon wrapper to keep imports clean-ish */
const CreditCardIcon: React.FC = () => (
  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
    <Edit className="h-3 w-3 text-red-600" />
  </div>
);

export default AdminPortal;
