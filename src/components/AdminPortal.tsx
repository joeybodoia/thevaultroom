import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Lock, Unlock, Eye, Save, X, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Round {
  id: string;
  stream_id: string | null;
  set_name: string;
  round_number: number;
  packs_opened: number;
  locked: boolean;
  created_at: string;
}

interface HighValueCard {
  id: string;
  round_id: string;
  card_id: number;
  created_at: string;
  direct_bid_cards: {
    card_name: string;
    set_name: string;
    ungraded_market_price: number;
  };
}

interface AllCard {
  id: string;
  card_name: string;
  card_number: string | null;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  ungraded_market_price: number | null;
  date_updated: string;
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
}

const AdminPortal: React.FC = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [showCreateStreamForm, setShowCreateStreamForm] = useState(false);
  const [streamFormData, setStreamFormData] = useState({
    title: '',
    scheduled_date: ''
  });
  const [savingStream, setSavingStream] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [formData, setFormData] = useState({
    set_name: '',
    round_number: 1,
    packs_opened: 10,
    locked: false
  });
  const [saving, setSaving] = useState(false);
  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const [highValueCards, setHighValueCards] = useState<{ [roundId: string]: HighValueCard[] }>({});
  const [trackingRound, setTrackingRound] = useState<string | null>(null);
  const [allCards, setAllCards] = useState<AllCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AllCard[]>([]);
  const [pulledCards, setPulledCards] = useState<{ [roundId: string]: PulledCard[] }>({});
  const [loadingCards, setLoadingCards] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

  useEffect(() => {
    console.log('AdminPortal useEffect running...');
    fetchStreams();
    fetchRounds();
    fetchAllCards();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = allCards.filter(card =>
        card.card_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.set_name && card.set_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setSearchResults(filtered.slice(0, 20)); // Limit to 20 results
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allCards]);

  const fetchStreams = async () => {
    try {
      console.log('Fetching streams...');
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Streams fetched:', data);
      setStreams(data || []);
    } catch (err: any) {
      console.error('Error fetching streams:', err);
      setError(err.message || 'Failed to fetch streams');
    }
  };

  const fetchRounds = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching rounds...');

      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Rounds fetched:', data);
      setRounds(data || []);
    } catch (err: any) {
      console.error('Error fetching rounds:', err);
      setError(err.message || 'Failed to fetch rounds');
    } finally {
      console.log('Setting AdminPortal loading to false');
      setLoading(false);
    }
  };

  const fetchAllCards = async () => {
    try {
      console.log('Fetching all cards...');
      const { data, error } = await supabase
        .from('all_cards')
        .select('*')
        .order('card_name');

      if (error) throw error;

      console.log('All cards fetched:', data?.length);
      setAllCards(data || []);
    } catch (err: any) {
      console.error('Error fetching all cards:', err);
      setError(err.message || 'Failed to fetch cards');
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

      setPulledCards(prev => ({
        ...prev,
        [roundId]: data || []
      }));
    } catch (err: any) {
      console.error('Failed to fetch pulled cards:', err);
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStream(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('streams')
        .insert([{
          title: streamFormData.title,
          scheduled_date: streamFormData.scheduled_date || null
        }])
        .select()
        .single();

      if (error) throw error;

      setStreams(prev => [data, ...prev]);
      setShowCreateStreamForm(false);
      setStreamFormData({
        title: '',
        scheduled_date: ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create stream');
    } finally {
      setSavingStream(false);
    }
  };

  const fetchHighValueCards = async (roundId: string) => {
    try {
      const { data, error } = await supabase
        .from('round_high_value_cards')
        .select(`
          *,
          direct_bid_cards (
            card_name,
            set_name,
            ungraded_market_price
          )
        `)
        .eq('round_id', roundId);

      if (error) throw error;

      setHighValueCards(prev => ({
        ...prev,
        [roundId]: data || []
      }));
    } catch (err: any) {
      console.error('Failed to fetch high value cards:', err);
    }
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStreamId) {
      setError('Please select a stream first');
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('rounds')
        .insert([{
          ...formData,
          stream_id: selectedStreamId
        }])
        .select()
        .single();

      if (error) throw error;

      setRounds(prev => [data, ...prev]);
      setShowCreateForm(false);
      setFormData({
        set_name: '',
        round_number: 1,
        packs_opened: 10,
        locked: false
      });
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

    try {
      const { data, error } = await supabase
        .from('rounds')
        .update(formData)
        .eq('id', editingRound.id)
        .select()
        .single();

      if (error) throw error;

      setRounds(prev => prev.map(round => 
        round.id === editingRound.id ? data : round
      ));
      setEditingRound(null);
      setFormData({
        set_name: '',
        round_number: 1,
        packs_opened: 10,
        locked: false
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update round');
    } finally {
      setSaving(false);
    }
  };

  const toggleRoundLock = async (round: Round) => {
    try {
      const { data, error } = await supabase
        .from('rounds')
        .update({ locked: !round.locked })
        .eq('id', round.id)
        .select()
        .single();

      if (error) throw error;

      setRounds(prev => prev.map(r => 
        r.id === round.id ? data : r
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to toggle round lock');
    }
  };

  const handleAddPulledCard = async (card: AllCard, roundId: string) => {
    setAddingCard(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('pulled_cards')
        .insert([{
          round_id: roundId,
          all_card_id: card.id,
          card_name: card.card_name,
          card_number: card.card_number,
          set_name: card.set_name,
          rarity: card.rarity,
          image_url: card.image_url,
          ungraded_market_price: card.ungraded_market_price,
          date_updated: card.date_updated
        }])
        .select()
        .single();

      if (error) throw error;
          card_name: card.card_name,
          card_number: card.card_number,
          set_name: card.set_name,
          rarity: card.rarity,
          image_url: card.image_url,
          ungraded_market_price: card.ungraded_market_price,
          date_updated: card.date_updated
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setPulledCards(prev => ({
        ...prev,
        [roundId]: [data, ...(prev[roundId] || [])]
      }));

      // Clear search
      setSearchTerm('');
      setSearchResults([]);
    } catch (err: any) {
      setError(err.message || 'Failed to add pulled card');
    } finally {
      setAddingCard(false);
    }
  };

  const startEdit = (round: Round) => {
    setEditingRound(round);
    setFormData({
      set_name: round.set_name,
      round_number: round.round_number,
      packs_opened: round.packs_opened,
      locked: round.locked
    });
  };

  const cancelEdit = () => {
    setEditingRound(null);
    setFormData({
      set_name: '',
      round_number: 1,
      packs_opened: 10,
      locked: false
    });
  };

  const toggleExpandRound = (roundId: string) => {
    if (expandedRound === roundId) {
      setExpandedRound(null);
    } else {
      setExpandedRound(roundId);
      if (!highValueCards[roundId]) {
        fetchHighValueCards(roundId);
      }
    }
  };

  const startTrackingCards = (roundId: string) => {
    setTrackingRound(roundId);
    setSearchTerm('');
    setSearchResults([]);
    if (!pulledCards[roundId]) {
      fetchPulledCards(roundId);
    }
  };

  const stopTrackingCards = () => {
    setTrackingRound(null);
    setSearchTerm('');
    setSearchResults([]);
  };

  const setOptions = [
    'SV: Prismatic Evolutions',
    'Crown Zenith: Galarian Gallery',
    'SV10: Destined Rivals'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-yellow-600 mx-auto mb-4" />
            <span className="text-xl font-pokemon text-black">Loading Admin Portal...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-black font-pokemon">Admin Portal</h1>
          </div>
          <p className="text-gray-600 font-pokemon">
            Manage streams, rounds, bids, and lottery systems
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold font-pokemon">Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1 font-pokemon">{error}</p>
          </div>
        )}

        {/* Stream Management Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-black font-pokemon">Stream Management</h2>
          </div>

          <div className="p-6">
            {streams.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 font-pokemon mb-4">No streams created yet</p>
                <button
                  onClick={() => setShowCreateStreamForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all font-pokemon flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New Stream</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                      Select Stream
                    </label>
                    <select
                      value={selectedStreamId}
                      onChange={(e) => setSelectedStreamId(e.target.value)}
                      className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none font-pokemon"
                    >
                      <option value="">Select a stream</option>
                      {streams.map(stream => (
                        <option key={stream.id} value={stream.id}>
                          {stream.title} {stream.scheduled_date && `- ${new Date(stream.scheduled_date).toLocaleDateString()}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setShowCreateStreamForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all font-pokemon flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create New Stream</span>
                  </button>
                </div>
              </div>
            )}

            {/* Create Stream Form */}
            {showCreateStreamForm && (
              <div className="bg-gray-50 rounded-lg p-6 mt-6 border border-gray-200">
                <h3 className="text-lg font-bold text-black font-pokemon mb-4">Create New Stream</h3>
                
                <form onSubmit={handleCreateStream} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Stream Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={streamFormData.title}
                        onChange={(e) => setStreamFormData(prev => ({ ...prev, title: e.target.value }))}
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
                        onChange={(e) => setStreamFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none font-pokemon"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={savingStream}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon flex items-center space-x-2"
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
                          scheduled_date: ''
                        });
                      }}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all font-pokemon flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Round Management Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black font-pokemon">Round Management</h2>
              <button
                disabled={!selectedStreamId}
                onClick={() => setShowCreateForm(true)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-all font-pokemon flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-600"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Round</span>
              </button>
            </div>
            {!selectedStreamId && (
              <p className="text-gray-500 text-sm mt-2 font-pokemon">
                Please select a stream above to create rounds
              </p>
            )}
          </div>

          <div className="p-6">
            {/* Create/Edit Form */}
            {(showCreateForm || editingRound) && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                <h3 className="text-lg font-bold text-black font-pokemon mb-4">
                  {editingRound ? 'Edit Round' : 'Create New Round'}
                </h3>
                
                <form onSubmit={editingRound ? handleEditRound : handleCreateRound} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Set Name <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.set_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, set_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-600 focus:outline-none font-pokemon"
                      >
                        <option value="">Select a set</option>
                        {setOptions.map(set => (
                          <option key={set} value={set}>{set}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Round Number <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.round_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, round_number: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-600 focus:outline-none font-pokemon"
                      >
                        <option value={1}>Round 1</option>
                        <option value={2}>Round 2</option>
                        <option value={3}>Round 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-pokemon">
                        Packs to Open <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="50"
                        value={formData.packs_opened}
                        onChange={(e) => setFormData(prev => ({ ...prev, packs_opened: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-600 focus:outline-none font-pokemon"
                      />
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center space-x-2 font-pokemon">
                        <input
                          type="checkbox"
                          checked={formData.locked}
                          onChange={(e) => setFormData(prev => ({ ...prev, locked: e.target.checked }))}
                          className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-600"
                        />
                        <span className="text-sm text-gray-700">Lock round immediately</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>{editingRound ? 'Updating...' : 'Creating...'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>{editingRound ? 'Update Round' : 'Create Round'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        cancelEdit();
                      }}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all font-pokemon flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Rounds List */}
            <div className="space-y-4">
              {rounds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-pokemon">No rounds created yet</p>
                </div>
              ) : (
                rounds.map((round) => (
                  <div key={round.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <h3 className="text-lg font-bold text-black font-pokemon">
                            Round {round.round_number} - {round.set_name}
                          </h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-semibold font-pokemon ${
                            round.locked 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {round.locked ? 'LOCKED' : 'UNLOCKED'}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm font-pokemon mt-1">
                          {round.packs_opened} packs • Created {new Date(round.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleExpandRound(round.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-blue-700 transition-all flex items-center space-x-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Cards</span>
                        </button>
                        <button
                          onClick={() => startTrackingCards(round.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-green-700 transition-all flex items-center space-x-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Track Pulled Cards</span>
                        </button>
                        <button
                          onClick={() => startEdit(round)}
                          className="bg-gray-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-gray-700 transition-all flex items-center space-x-1"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => toggleRoundLock(round)}
                          className={`px-3 py-1 rounded font-pokemon text-sm transition-all flex items-center space-x-1 ${
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
                      </div>
                    </div>

                    {/* Expanded High Value Cards */}
                    {expandedRound === round.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-black font-pokemon mb-3">High Value Cards</h4>
                        {highValueCards[round.id] ? (
                          highValueCards[round.id].length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {highValueCards[round.id].map((card) => (
                                <div key={card.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                  <h5 className="font-semibold text-black font-pokemon text-sm">
                                    {card.direct_bid_cards.card_name}
                                  </h5>
                                  <p className="text-gray-600 text-xs font-pokemon">
                                    {card.direct_bid_cards.set_name}
                                  </p>
                                  <p className="text-green-600 font-semibold text-sm font-pokemon">
                                    ${card.direct_bid_cards.ungraded_market_price}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm font-pokemon">No high value cards assigned to this round</p>
                          )
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Loader className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-gray-500 text-sm font-pokemon">Loading cards...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pulled Cards Tracking */}
                    {trackingRound === round.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-black font-pokemon">Track Pulled Cards</h4>
                          <button
                            onClick={stopTrackingCards}
                            className="bg-gray-600 text-white px-3 py-1 rounded font-pokemon text-sm hover:bg-gray-700 transition-all flex items-center space-x-1"
                          >
                            <X className="h-3 w-3" />
                            <span>Close</span>
                          </button>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-4">
                          <input
                            type="text"
                            placeholder="Search cards by name or set..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-green-600 focus:outline-none font-pokemon"
                          />
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                          <div className="mb-6">
                            <h5 className="font-semibold text-black font-pokemon mb-2">Search Results</h5>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                              {searchResults.map((card) => (
                                <div key={card.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                                  <div className="flex-1">
                                    <h6 className="font-semibold text-black font-pokemon text-sm">
                                      {card.card_name}
                                    </h6>
                                    <p className="text-gray-600 text-xs font-pokemon">
                                      {card.set_name} • {card.rarity} • ${card.ungraded_market_price}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleAddPulledCard(card, round.id)}
                                    disabled={addingCard}
                                    className="bg-green-600 text-white px-3 py-1 rounded font-pokemon text-xs hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                  >
                                    {addingCard ? (
                                      <Loader className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Plus className="h-3 w-3" />
                                    )}
                                    <span>Add</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Already Pulled Cards */}
                        <div>
                          <h5 className="font-semibold text-black font-pokemon mb-2">
                            Pulled Cards ({pulledCards[round.id]?.length || 0})
                          </h5>
                          {pulledCards[round.id] && pulledCards[round.id].length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {pulledCards[round.id].map((card) => (
                                <div key={card.id} className="bg-green-50 rounded-lg p-3 border border-green-200">
                                  <h6 className="font-semibold text-black font-pokemon text-sm">
                                    {card.card_name}
                                  </h6>
                                  <p className="text-gray-600 text-xs font-pokemon">
                                    {card.set_name} • {card.rarity}
                                  </p>
                                  <p className="text-green-600 font-semibold text-sm font-pokemon">
                                    ${card.ungraded_market_price}
                                  </p>
                                  <p className="text-gray-500 text-xs font-pokemon">
                                    Added {new Date(card.date_updated).toLocaleDateString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm font-pokemon">No cards pulled yet for this round</p>
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

export default AdminPortal;