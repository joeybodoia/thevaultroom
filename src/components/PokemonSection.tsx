import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, Sparkles, Search, Filter, ArrowUpDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PrismaticPokemonFull, CrownZenithFull, DestinedRivalsFull, PokemonCard as PokemonCardType } from '../types/pokemon';
import PokemonCard from './PokemonCard';

type SetName = 'prismatic' | 'crown_zenith' | 'destined_rivals';
type BiddingMode = 'direct' | 'lottery';
type LotterySetName = 'prismatic' | 'crown_zenith' | 'destined_rivals';

const PokemonSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SetName>('prismatic');
  const [biddingMode, setBiddingMode] = useState<BiddingMode>('direct');
  const [lotteryActiveTab, setLotteryActiveTab] = useState<LotterySetName>('prismatic');
  const [prismaticPokemon, setPrismaticPokemon] = useState<PrismaticPokemonFull[]>([]);
  const [crownZenithPokemon, setCrownZenithPokemon] = useState<CrownZenithFull[]>([]);
  const [destinedRivalsPokemon, setDestinedRivalsPokemon] = useState<DestinedRivalsFull[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<PokemonCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSet, setSelectedSet] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [sortBy, setSortBy] = useState('price-high');

  useEffect(() => {
    fetchAllPokemon();
  }, []);

  useEffect(() => {
    // Reset filters when switching tabs
    setSearchTerm('');
    setSelectedRarity('');
  }, [activeTab]);

  useEffect(() => {
    filterAndSortPokemon();
  }, [activeTab, prismaticPokemon, crownZenithPokemon, destinedRivalsPokemon, searchTerm, selectedRarity, sortBy]);
  const fetchAllPokemon = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Prismatic Evolutions
      const { data: prismaticData, error: prismaticError } = await supabase
        .from('prismatic_pokemon_full')
        .select('*')
        .order('price', { ascending: false });

      if (prismaticError) {
        throw prismaticError;
      }

      // Fetch Crown Zenith
      const { data: crownData, error: crownError } = await supabase
        .from('crown_zenith_full')
        .select('*')
        .order('price', { ascending: false });

      if (crownError) {
        throw crownError;
      }

      // Fetch Destined Rivals
      const { data: rivalsData, error: rivalsError } = await supabase
        .from('destined_rivals_full')
        .select('*')
        .order('price', { ascending: false });

      if (rivalsError) {
        throw rivalsError;
      }

      setPrismaticPokemon(prismaticData || []);
      setCrownZenithPokemon(crownData || []);
      setDestinedRivalsPokemon(rivalsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Pokemon data');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPokemon = () => {
    // Get current tab's pokemon data
    let currentPokemon: PokemonCardType[] = [];
    if (activeTab === 'prismatic') {
      currentPokemon = [...prismaticPokemon];
    } else if (activeTab === 'crown_zenith') {
      currentPokemon = [...crownZenithPokemon];
    } else if (activeTab === 'destined_rivals') {
      currentPokemon = [...destinedRivalsPokemon];
    }

    // Filter to only show cards with market price > $50
    currentPokemon = currentPokemon.filter(poke => (poke.price || 0) > 50);

    let filtered = currentPokemon;

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter(poke => 
        poke.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by set
    if (selectedRarity) {
      filtered = filtered.filter(poke => {
        const rarity = poke.rarity?.split(',')[0].trim();
        return rarity === selectedRarity;
      });
    }

    // Sort by price
    if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    setFilteredPokemon(filtered);
  };

  // Get unique sets and rarities for filter options
  const getCurrentPokemon = () => {
    if (activeTab === 'prismatic') return prismaticPokemon;
    if (activeTab === 'crown_zenith') return crownZenithPokemon;
    if (activeTab === 'destined_rivals') return destinedRivalsPokemon;
    return [];
  };

  const currentPokemon = getCurrentPokemon();
  const uniqueRarities = [...new Set(currentPokemon.map(poke => {
    const rarity = poke.rarity?.split(',')[0].trim();
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
              onClick={fetchAllPokemon}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-pokemon hover:bg-red-700 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (prismaticPokemon.length === 0 && crownZenithPokemon.length === 0 && destinedRivalsPokemon.length === 0) {
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
    { id: 'prismatic' as SetName, name: 'Prismatic Evolutions', count: prismaticPokemon.length },
    { id: 'crown_zenith' as SetName, name: 'Crown Zenith', count: crownZenithPokemon.length },
    { id: 'destined_rivals' as SetName, name: 'Destined Rivals', count: destinedRivalsPokemon.length }
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
                <li>• Bid on high-value cards (e.g., Umbreon EX) from each set</li>
                <li>• Highest bidder wins all pulled copies of their card</li>
                <li>• If not pulled, you get nothing for that card</li>
              </ul>
              
              <h4 className="font-bold text-black mb-3 font-pokemon">Option 2: $1 Lottery + Rarity Selection</h4>
              <ul className="text-left space-y-2 mb-4">
                <li>• Enter for $1 and choose a rarity type from the set</li>
                <li>• If your rarity type is pulled, you're entered into the prize pool</li>
                <li>• 2 random winners per round each get 5 packs (minus direct bid wins)</li>
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
                $1 Lottery
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

            {/* Pokemon Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPokemon.map((poke, index) => (
                <PokemonCard
                  key={poke.id}
                  pokemon={poke}
                  isPopular={index === 0} // Make first card popular
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
                  Prismatic Evolutions - $1 Lottery
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Pokeball Pattern */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-red-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Pokeball Pattern</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* Masterball Pattern */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-purple-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Masterball Pattern</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* Hyper Rare */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-yellow-500 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Hyper Rare</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-yellow-500 text-white font-bold py-3 rounded-lg hover:bg-yellow-600 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* Ultra Rare */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-blue-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Ultra Rare</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* SIR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-pink-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">SIR</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* IR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-green-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">IR</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* ACE SPEC */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-black rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">ACE SPEC</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lotteryActiveTab === 'crown_zenith' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-black font-pokemon text-center mb-8">
                  Crown Zenith - $1 Lottery
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Ultra Rare */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-blue-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Ultra Rare</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* Hyper Rare */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-yellow-500 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Hyper Rare</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-yellow-500 text-white font-bold py-3 rounded-lg hover:bg-yellow-600 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* SIR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-pink-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">SIR</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* IR */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-green-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">IR</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>

                  {/* Code Card */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all shadow-lg">
                    <div className="text-center">
                      <div className="bg-gray-600 rounded-lg p-4 mb-4">
                        <span className="text-xl font-bold text-white font-pokemon">Code Card</span>
                      </div>
                      <p className="text-gray-600 text-sm font-pokemon mb-4">Enter lottery for this rarity type</p>
                      <button className="w-full bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-all font-pokemon">
                        Enter for $1
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lotteryActiveTab === 'destined_rivals' && (
              <div className="text-center py-20">
                <h3 className="text-2xl font-bold text-black font-pokemon">Destined Rivals - $1 Lottery</h3>
                <p className="text-gray-600 font-pokemon mt-4">Coming soon...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PokemonSection;