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
  const [lotteryParticipants, setLotteryParticipants] = useState<{ [key: string]: number }>({});
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySuccess, setEntrySuccess] = useState(false);
  const [selectedLotteryEntry, setSelectedLotteryEntry] = useState<{
    roundId: string;
    rarity: string;
    setName: string;
  } | null>(null);

  // Check user authentication status
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
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
        }, 100); // Small delay to ensure modal is rendered
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
      fetchLotteryParticipants();
    }
  }, [currentStreamId, activeTab, lotteryActiveTab, biddingMode]);

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
      if (activeTab === 'prismatic') {
        setName = 'SV: Prismatic Evolutions';
      } else if (activeTab === 'crown_zenith') {
        setName = 'Crown Zenith: Galarian Gallery';
      } else if (activeTab === 'destined_rivals') {
        setName = 'SV10: Destined Rivals';
      }

      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('stream_id', currentStreamId)
        .eq('set_name', setName)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
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

  const fetchLotteryParticipants = async () => {
    if (!currentRound) return;

    try {
      const { data, error } = await supabase
        .from('lottery_entries')
        .select('selected_rarity')
        .eq('round_id', currentRound.id);

      if (error) throw error;

      // Count participants by rarity
      const counts: { [key: string]: number } = {};
      data?.forEach(entry => {
        const rarity = entry.selected_rarity;
        counts[rarity] = (counts[rarity] || 0) + 1;
      });

      setLotteryParticipants(counts);
    } catch (err: any) {
      console.error('Error fetching lottery participants:', err);
    }
  };

  const fetchAllCards = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching all cards from all_cards table...');
      
      const { data, error } = await supabase
        .from('all_cards')
        .select('*')
        .order('ungraded_market_price', { ascending: false });

      if (error) {
        console.error('Error fetching cards:', error);
        throw error;
      }

      console.log(`Successfully fetched ${data?.length || 0} cards`);
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
    // Filter cards by set based on active tab
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

    // Filter to only show cards with market price > $50 (should already be filtered in DB, but double-check)
    currentCards = currentCards.filter(card => (card.ungraded_market_price || 0) > 50);

    let filtered = currentCards;

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter(card => 
        card.card_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by set
    if (selectedRarity) {
      filtered = filtered.filter(card => {
        const rarity = card.rarity?.split(',')[0].trim();
        return rarity === selectedRarity;
      });
    }

    // Sort by price
    if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.ungraded_market_price || 0) - (a.ungraded_market_price || 0));
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.ungraded_market_price || 0) - (b.ungraded_market_price || 0));
    }

    setFilteredPokemon(filtered);
  };

  const handleLotteryEntry = async (rarity: string) => {
    console.log("handling lottery entry")
    if (!currentRound) {
      setLotteryError('No active round found for this set');
      return;
    }

    if (!user) {
      setLotteryError('Please sign in to enter the lottery');
      return;
    }

    // Show confirmation modal
    setSelectedLotteryEntry({ 
      roundId: currentRound.id, 
      rarity, 
      setName: currentRound.set_name 
    });
    setShowConfirmModal(true);
  };

  const handleCreditLotteryEntry = async () => {
    console.log("correct function for inserting lottery entry")
    console.log("current round id = ", currentRound.id)
    console.log("current user = ", user.id)
    console.log("selected rarity = ", selectedRarity)
    if (!user?.id || !currentRound.id || !selectedRarity) {
      setError('Missing required information for lottery entry');
      return;
    }
    // Refresh participant counts

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      // First, deduct 5 credits from user's account
      const newCreditBalance = userCredits - 5;
      
      const { error: creditError } = await supabase
        .from('users')
        .update({ site_credit: newCreditBalance })
        .eq('id', user.id);

      if (creditError) {
        throw new Error('Failed to deduct credits: ' + creditError.message);
      }

      // Then, insert lottery entry
      const { error: lotteryError } = await supabase
        .from('lottery_entries')
        .insert([{
          user_id: user.id,
          round_id: currentRound.id,
          selected_rarity: selectedRarity,
          created_at: new Date().toISOString(),
          credits_used: 5
        }]);

      if (lotteryError) {
        // Rollback credit deduction if lottery entry fails
        await supabase
          .from('users')
          .update({ site_credit: userCredits })
          .eq('id', user.id);
        
        throw new Error('Failed to create lottery entry: ' + lotteryError.message);
      }

      // Update local state
      setUserCredits(newCreditBalance);
      setShowConfirmModal(false);
      setSelectedRarity('');
      
      // Refresh lottery entries to show the new entry
      fetchLotteryEntries(currentRound.id);
      
      // Show success message
      setSuccess('Successfully entered the lottery! 5 credits deducted.');
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (err: any) {
      console.error('Lottery entry error:', err);
      setError(err.message || 'Failed to enter lottery');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get unique sets and rarities for filter options
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
                      onClick={() => setActiveTab(tab.id)}
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
                {/* Search */}
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

                {/* Rarity Filter */}
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

                {/* Sort */}
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

              {/* Results Count */}
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
                  isPopular={index === 0} // Make first card popular
                  currentRoundId={currentRound?.id || null}
                  onBidSuccess={() => {
                    // Optionally refresh data or show notification
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

            {/* Lottery Content based on selected set */}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Pokeball Pattern */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-red-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Pokeball Pattern</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['Pokeball Pattern'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('Pokeball Pattern')}
                        disabled={!user || loadingUser || lotterySubmitting === 'Pokeball Pattern'}
                        className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'Pokeball Pattern' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                      {lotterySuccess === 'Successfully entered lottery for Pokeball Pattern!' && (
                        <div className="mt-2 text-green-600 text-sm font-pokemon font-semibold">
                          Successfully Entered lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Masterball Pattern */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-purple-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Masterball Pattern</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['Masterball Pattern'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('Masterball Pattern')}
                        disabled={!user || loadingUser || lotterySubmitting === 'Masterball Pattern'}
                        className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'Masterball Pattern' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                      {lotterySuccess === 'Successfully entered lottery for Masterball Pattern!' && (
                        <div className="mt-2 text-green-600 text-sm font-pokemon font-semibold">
                          Successfully Entered lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hyper Rare */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-yellow-500 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Hyper Rare</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 font-semibold text-sm font-pokemon">
                          {lotteryParticipants['Hyper Rare'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('Hyper Rare')}
                        disabled={!user || loadingUser || lotterySubmitting === 'Hyper Rare'}
                        className="w-full bg-yellow-500 text-white font-bold py-3 rounded-lg hover:bg-yellow-600 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'Hyper Rare' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ultra Rare */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-blue-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Ultra Rare</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 font-semibold text-sm font-pokemon">
                          {lotteryParticipants['Ultra Rare'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('Ultra Rare')}
                        disabled={!user || loadingUser || lotterySubmitting === 'Ultra Rare'}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'Ultra Rare' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SIR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-pink-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">SIR</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 font-semibold text-sm font-pokemon">
                          {lotteryParticipants['SIR'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('SIR')}
                        disabled={!user || loadingUser || lotterySubmitting === 'SIR'}
                        className="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'SIR' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* IR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-green-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">IR</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['IR'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('IR')}
                        disabled={!user || loadingUser || lotterySubmitting === 'IR'}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'IR' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                      {lotterySuccess === 'Successfully entered lottery for IR!' && (
                        <div className="mt-2 text-green-600 text-sm font-pokemon font-semibold">
                          Successfully Entered lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACE SPEC */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-black rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">ACE SPEC</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 font-semibold text-sm font-pokemon">
                          {lotteryParticipants['ACE SPEC'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('ACE SPEC')}
                        disabled={!user || loadingUser || lotterySubmitting === 'ACE SPEC'}
                        className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'ACE SPEC' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lotteryActiveTab === 'crown_zenith' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-8">
                  Crown Zenith - Lottery
                </h3>
                
                {/* Round ID Display */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                  <div className="text-center">
                    <h4 className="font-semibold text-blue-800 font-pokemon mb-2">Current Round for Crown Zenith</h4>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* VSTAR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-purple-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">VSTAR</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['VSTAR'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('VSTAR')}
                        disabled={!user || loadingUser || lotterySubmitting === 'VSTAR'}
                        className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'VSTAR' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VMAX */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-red-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">VMAX</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['VMAX'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('VMAX')}
                        disabled={!user || loadingUser || lotterySubmitting === 'VMAX'}
                        className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'VMAX' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* V */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-blue-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">V</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['V'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('V')}
                        disabled={!user || loadingUser || lotterySubmitting === 'V'}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'V' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Radiant */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-yellow-500 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Radiant</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['Radiant'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('Radiant')}
                        disabled={!user || loadingUser || lotterySubmitting === 'Radiant'}
                        className="w-full bg-yellow-500 text-white font-bold py-3 rounded-lg hover:bg-yellow-600 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'Radiant' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lotteryActiveTab === 'destined_rivals' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-8">
                  Destined Rivals - Lottery
                </h3>
                
                {/* Round ID Display */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                  <div className="text-center">
                    <h4 className="font-semibold text-blue-800 font-pokemon mb-2">Current Round for Destined Rivals</h4>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Hyper Rare */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-yellow-500 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Hyper Rare</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['Hyper Rare'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('Hyper Rare')}
                        disabled={!user || loadingUser || lotterySubmitting === 'Hyper Rare'}
                        className="w-full bg-yellow-500 text-white font-bold py-3 rounded-lg hover:bg-yellow-600 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'Hyper Rare' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ultra Rare */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-blue-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Ultra Rare</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['Ultra Rare'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('Ultra Rare')}
                        disabled={!user || loadingUser || lotterySubmitting === 'Ultra Rare'}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'Ultra Rare' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SIR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-pink-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">SIR</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['SIR'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('SIR')}
                        disabled={!user || loadingUser || lotterySubmitting === 'SIR'}
                        className="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'SIR' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* IR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-green-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">IR</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['IR'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('IR')}
                        disabled={!user || loadingUser || lotterySubmitting === 'IR'}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'IR' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACE SPEC */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-black rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">ACE SPEC</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm font-pokemon mb-2">Enter lottery for this rarity type</p>
                        <p className="text-blue-600 text-xs font-pokemon font-semibold">
                          {lotteryParticipants['ACE SPEC'] || 0} participants
                        </p>
                      </div>
                      <button 
                        onClick={() => handleLotteryEntry('ACE SPEC')}
                        disabled={!user || loadingUser || lotterySubmitting === 'ACE SPEC'}
                        className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingUser ? 'Loading...' : !user ? 'Login to Enter' : lotterySubmitting === 'ACE SPEC' ? 'Entering...' : 'Enter for 5 Credits'}
                      </button>
                      {!loadingUser && !user && (
                        <div className="mt-2 text-orange-600 text-sm font-pokemon">
                          Please sign in to enter lottery
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
        {/* {showConfirmModal && selectedLotteryEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-black font-pokemon mb-4">Confirm Lottery Entry</h3>
                <p className="text-gray-600 font-pokemon">
                  Please confirm that you want to apply 5 credits to entering the lottery for <strong>{selectedLotteryEntry.rarity}</strong> cards.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-pokemon">Cost:</span>
                  <span className="font-bold text-black font-pokemon">5 credits</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-pokemon">Your Credits:</span>
                  <span className="font-bold text-black font-pokemon">{userCredit.toFixed(2)} credits</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-700 font-pokemon">After Entry:</span>
                  <span className="font-bold text-black font-pokemon">{(userCredit - 5).toFixed(2)} credits</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handlePaymentSuccess}
                  disabled={isProcessing}
                  className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-500 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    'Yes, Enter Lottery'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedLotteryEntry(null);
                  }}
                  className="flex-1 bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-all font-pokemon"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )} */}

      {/* Fixed Modal with Auto-scroll */}
      {showConfirmModal && (
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
                Please confirm that you want to apply 5 credits to entering the lottery for <span className="font-bold">{selectedLotteryEntry.rarity}</span> cards.
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