import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Sparkles, Search, Filter, ArrowUpDown } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DirectBidCard, PokemonCard as PokemonCardType } from '../types/pokemon';
import PokemonCard from './PokemonCard';
import type { User } from '@supabase/supabase-js';

type SetName = 'prismatic' | 'crown_zenith' | 'destined_rivals';
type BiddingMode = 'direct' | 'lottery';
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

interface PokemonSectionProps {
  currentStreamId?: string | null;
}

/** ---- NEW: constants for the prismatic lottery ---- */
const PACKS = Array.from({ length: 10 }, (_, i) => i + 1);
const PRISMATIC_RARITIES = ['SIR', 'Masterball Pattern', 'Ultra Rare', 'Pokeball Pattern'] as const;
type PrismaticRarity = typeof PRISMATIC_RARITIES[number];

const PokemonSection: React.FC<PokemonSectionProps> = ({ currentStreamId }) => {
  const [activeTab, setActiveTab] = useState<SetName>('prismatic');
  const [biddingMode, setBiddingMode] = useState<BiddingMode>('direct');
  const [lotteryActiveTab, setLotteryActiveTab] = useState<LotterySetName>('prismatic');
  const [allCards, setAllCards] = useState<DirectBidCard[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<PokemonCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSet, setSelectedSet] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [selectedSetName, setSelectedSetName] = useState<string>('');
  const [sortBy, setSortBy] = useState('price-high');
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [roundLoading, setRoundLoading] = useState(false);
  const [lotterySubmitting, setLotterySubmitting] = useState<string | null>(null);
  const [lotteryError, setLotteryError] = useState<string | null>(null);
  const [lotterySuccess, setLotterySuccess] = useState<string | null>(null);
  const [userCredit, setUserCredit] = useState<number>(0);
  const [loadingCredit, setLoadingCredit] = useState(false);

  /** ---- CHANGED: participants are now nested [packNumber][rarity] ---- */
  const [lotteryParticipantsByPack, setLotteryParticipantsByPack] = useState<Record<number, Record<string, number>>>({});

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySuccess, setEntrySuccess] = useState(false);

  /** ---- CHANGED: include packNumber in the selection ---- */
  const [selectedLotteryEntry, setSelectedLotteryEntry] = useState<{
    roundId: string;
    rarity: string;
    setName: string;
    packNumber: number;
  } | null>(null);

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        await fetchUserCredit(session.user.id);
      }
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

  useEffect(() => {
    fetchAllCards();
  }, []);

  useEffect(() => {
    if (currentStreamId) {
      fetchCurrentRound();
    }
  }, [currentStreamId, activeTab, lotteryActiveTab, biddingMode]);

  /** re-fetch participants when currentRound changes */
  useEffect(() => {
    fetchLotteryParticipants();
  }, [currentRound]);

  useEffect(() => {
    // Reset filters when switching tabs
    setSearchTerm('');
    setSelectedRarity('');
  }, [activeTab]);

  useEffect(() => {
    filterAndSortPokemon();
  }, [activeTab, allCards, searchTerm, selectedRarity, sortBy]);

  const fetchCurrentRound = async () => {
    if (!currentStreamId) {
      setCurrentRound(null);
      return;
    }

    setRoundLoading(true);
    try {
      let setName = '';
      const tabToCheck = biddingMode === 'lottery' ? lotteryActiveTab : activeTab;

      if (tabToCheck === 'prismatic') {
        setName = 'SV: Prismatic Evolutions';
      } else if (tabToCheck === 'crown_zenith') {
        setName = 'Crown Zenith: Galarian Gallery';
      } else if (tabToCheck === 'destined_rivals') {
        setName = 'SV10: Destined Rivals';
      }

      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('stream_id', currentStreamId)
        .eq('set_name', setName)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setCurrentRound(data);
    } catch (err: any) {
      console.error('Error fetching current round:', err);
      setCurrentRound(null);
    } finally {
      setRoundLoading(false);
    }
  };

  /** ---- CHANGED: fetch pack+rarity counts ---- */
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
      data?.forEach((entry) => {
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
      currentCards = allCards.filter(card => card.set_name === 'SV: Prismatic Evolutions');
    } else if (activeTab === 'crown_zenith') {
      currentCards = allCards.filter(card =>
        card.set_name === 'Crown Zenith: Galarian Gallery' ||
        card.set_name === 'Crown Zenith'
      );
    } else if (activeTab === 'destined_rivals') {
      currentCards = allCards.filter(card => card.set_name === 'SV10: Destined Rivals');
    }

    currentCards = currentCards.filter(card => (card.ungraded_market_price || 0) > 50);

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

    if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.ungraded_market_price || 0) - (a.ungraded_market_price || 0));
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.ungraded_market_price || 0) - (b.ungraded_market_price || 0));
    }

    setFilteredPokemon(filtered);
  };

  /** ---- CHANGED: include packNumber in selection ---- */
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

  /** ---- CHANGED: insert with pack_number, then refresh counts ---- */
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
      setEntryError(err.message || 'Failed to enter lottery');
    } finally {
      setIsProcessingEntry(false);
    }
  };

  const getCurrentPokemon = () => {
    if (activeTab === 'prismatic') {
      return allCards.filter(card => card.set_name === 'SV: Prismatic Evolutions');
    } else if (activeTab === 'crown_zenith') {
      return allCards.filter(card =>
        card.set_name === 'Crown Zenith: Galarian Gallery' ||
        card.set_name === 'Crown Zenith'
      );
    } else if (activeTab === 'destined_rivals') {
      return allCards.filter(card => card.set_name === 'SV10: Destined Rivals');
    }
    return [];
  };

  const currentPokemon = getCurrentPokemon();
  const uniqueRarities = [...new Set(currentPokemon.map(card => {
    const rarity = card.rarity?.split(',')[0].trim();
    return rarity;
  }).filter(Boolean))];

  if (loading) {
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

  if (error) {
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

  if (allCards.length === 0) {
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

  const tabs = [
    { 
      id: 'prismatic' as SetName, 
      name: 'Prismatic Evolutions', 
      count: allCards.filter(card => card.set_name === 'SV: Prismatic Evolutions').length 
    },
    { 
      id: 'crown_zenith' as SetName, 
      name: 'Crown Zenith', 
      count: allCards.filter(card => 
        card.set_name === 'Crown Zenith: Galarian Gallery' || 
        card.set_name === 'Crown Zenith'
      ).length 
    },
    { 
      id: 'destined_rivals' as SetName, 
      name: 'Destined Rivals', 
      count: allCards.filter(card => card.set_name === 'SV10: Destined Rivals').length 
    }
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
              Three exciting rounds: Round 1 (10 Prismatic Evolutions packs), Round 2 (10 Destined Rivals packs), Round 3 (10 Crown Zenith packs). Each round offers two entry options.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-4">
              <h4 className="font-bold text-black mb-3 font-pokemon">Option 1: Direct Card Bidding</h4>
              <ul className="text-left space-y-2 mb-4">
                <li>• Use credits to bid on high-value cards (e.g., Umbreon EX) from each set</li>
                <li>• Highest bidder wins all pulled copies of their card</li>
                <li>• If bid card is not pulled, winning bidder receives nothing for that round</li>
                <li>• A user's credits are only applied for winning bidder. That is, credits placed on a direct card bid are returned to a user once that user is outbid</li>
              </ul>
              
              <h4 className="font-bold text-black mb-3 font-pokemon">Option 2: Lottery + Rarity Selection</h4>
              <ul className="text-left space-y-2 mb-4">
                <li>• Enter using credits and choose a rarity type from the set</li>
                <li>• If your rarity type is pulled, you're entered into the prize pool</li>
                <li>• 2 random winners per round. Each winner receives cards from 5 of the opened packs (minus direct bid wins)</li>
                <li>• Lottery winner #1 receives all cards from first 5 opened packs, winner #2 receives remaining cards from that round (barring any cards won through direct card bids) </li>
              </ul>
            </div>
            <p className="text-red-600 font-semibold">
              ⚠️ Choose your strategy: Go for specific high-value cards or try the lottery for complete packs!
            </p>
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
                Direct Bids
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

            {/* Search, Filter, and Sort Controls */}
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

            {/* Round ID Display */}
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

            {/* Pokemon Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPokemon.map((poke, index) => (
                <PokemonCard
                  key={poke.id}
                  pokemon={poke}
                  isPopular={index === 0}
                  currentRoundId={currentRound?.id || null}
                  onBidSuccess={() => {
                    console.log('Bid submitted successfully for card:', poke.card_name);
                  }}
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
        ) : (
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

            {/* ---- PRISMATIC: 10 ROWS x 4 RARITIES ---- */}
            {lotteryActiveTab === 'prismatic' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-8">
                  Prismatic Evolutions - Lottery
                </h3>

                {/* Round ID Display */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                  <div className="text-center">
                    <h4 className="font-semibold text-blue-800 font-pokemon mb-2">Current Round for Prismatic Evolutions</h4>
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
                    <div key={packNum} className="rounded-2xl p-4 border shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold font-pokemon">Pack {packNum}</h4>
                        {currentRound?.locked && <span className="text-sm">LOCKED</span>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {PRISMATIC_RARITIES.map((rarity) => {
                          const count = lotteryParticipantsByPack?.[packNum]?.[rarity] || 0;
                          const disabled = !user || loadingUser || Boolean(lotterySubmitting === rarity) || !!currentRound?.locked;
                          const bg =
                            rarity === 'SIR'
                              ? 'bg-pink-600 hover:bg-pink-700'
                              : rarity === 'Masterball Pattern'
                              ? 'bg-purple-600 hover:bg-purple-700'
                              : rarity === 'Ultra Rare'
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-red-600 hover:bg-red-700';

                          return (
                            <div key={`${packNum}-${rarity}`} className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                              <div className="text-center">
                                <div className={`${bg.split(' ')[0]} rounded-lg p-4 mb-4`}>
                                  <span className="text-xl font-bold text-white font-pokemon">{rarity}</span>
                                </div>
                                <div className="mb-4">
                                  <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity</p>
                                  <p className="text-blue-600 font-semibold text-sm font-pokemon">
                                    {count} participants
                                  </p>
                                </div>
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
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Your Crown Zenith / Destined Rivals sections can stay as-is for now */}
            {lotteryActiveTab === 'crown_zenith' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-8">
                  Crown Zenith - Lottery
                </h3>
                {/* ... existing Crown Zenith UI unchanged ... */}
              </div>
            )}

            {lotteryActiveTab === 'destined_rivals' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-8">
                  Destined Rivals - Lottery
                </h3>
                {/* ... existing Destined Rivals UI unchanged ... */}
              </div>
            )}

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
        )}

        {/* Confirmation Modal */}
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
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-pokemon">Your Credits:</span>
                    <span className="font-bold text-black font-pokemon">{userCredit.toFixed(2)} credits</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-600 font-pokemon">After Entry:</span>
                    <span className="font-bold text-black font-pokemon">{(userCredit - 5).toFixed(2)} credits</span>
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
