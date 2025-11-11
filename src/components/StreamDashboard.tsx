// import React from 'react';

// const StreamDashboard: React.FC = () => {
//   return (
//     <section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-yellow-400 min-h-screen">
//       <div className="max-w-4xl mx-auto text-center">
//         <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-6 lg:mb-8 font-pokemon">
//           Stream Dashboard
//         </h1>
//       </div>
//     </section>
//   );
// };

// export default StreamDashboard;

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Box,
  Clock,
  Gavel,
  Loader,
  Sparkles,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Stream {
  id: string;
  title: string;
  status: 'scheduled' | 'live' | 'ended';
  scheduled_date: string | null;
  created_at: string;
  singles_close_at: string | null;
  // Once added:
  // started_at: string | null;
  // ended_at: string | null;
  // total_packs_planned: number | null;
}

interface Round {
  id: string;
  stream_id: string | null;
  set_name: string;
  round_number: number;
  packs_opened: number;
  locked: boolean;
  created_at: string;
}

interface LotteryEntry {
  id: string;
  user_id: string | null;
  round_id: string | null;
}

interface ChaseSlot {
  id: string;
  stream_id: string;
  is_active: boolean;
}

interface ChaseBid {
  slot_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

interface LiveSingleRow {
  id: string;
  stream_id: string | null;
  is_active: boolean;
}

interface LiveSingleBid {
  card_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

interface PulledCard {
  card_name: string;
  set_name: string | null;
  rarity: string | null;
  ungraded_market_price: number | null;
  date_updated: string | null;
}

/**
 * Small helpers
 */
const formatTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const statusLabel = (status: Stream['status']) => {
  switch (status) {
    case 'live':
      return 'LIVE';
    case 'scheduled':
      return 'Scheduled';
    case 'ended':
      return 'Completed';
    default:
      return status;
  }
};

const statusColor = (status: Stream['status']) => {
  switch (status) {
    case 'live':
      return 'bg-red-600 text-white';
    case 'scheduled':
      return 'bg-yellow-400 text-black';
    case 'ended':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const StreamDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userCredit, setUserCredit] = useState<number | null>(null);

  const [stream, setStream] = useState<Stream | null>(null);
  const [loadingStream, setLoadingStream] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [packsOpened, setPacksOpened] = useState<number>(0);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number | null>(null);

  const [chaseSlotsActive, setChaseSlotsActive] = useState<number>(0);
  const [userChaseLeading, setUserChaseLeading] = useState<number>(0);

  const [lotteryEntriesOpenTotal, setLotteryEntriesOpenTotal] = useState<number>(0);
  const [userLotteryEntriesOpen, setUserLotteryEntriesOpen] = useState<number>(0);

  const [liveSinglesActive, setLiveSinglesActive] = useState<number>(0);
  const [userSinglesLeading, setUserSinglesLeading] = useState<number>(0);

  const [lastBigHit, setLastBigHit] = useState<PulledCard | null>(null);

  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);

  /**
   * Auth bootstrap (matches pattern from PokemonSection)
   */
  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user ?? null);

        if (user?.id) {
          const { data, error } = await supabase
            .from('users')
            .select('site_credit')
            .eq('id', user.id)
            .single();

          if (!error && data?.site_credit != null) {
            setUserCredit(Number(data.site_credit));
          }
        }
      } catch (err) {
        console.error('Error loading user for dashboard:', err);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authed = session?.user ?? null;
      setUser(authed);
      if (authed?.id) {
        const { data, error } = await supabase
          .from('users')
          .select('site_credit')
          .eq('id', authed.id)
          .single();
        if (!error && data?.site_credit != null) {
          setUserCredit(Number(data.site_credit));
        }
      } else {
        setUserCredit(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch "current" stream for the dashboard.
   * Priority:
   *  1) latest LIVE
   *  2) latest SCHEDULED
   *  3) latest ENDED
   */
  useEffect(() => {
    const fetchStream = async () => {
      try {
        setLoadingStream(true);
        setError(null);

        // 1) Try LIVE
        let { data, error } = await supabase
          .from('streams')
          .select('*')
          .eq('status', 'live')
          .order('scheduled_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        let picked: Stream | null = (data?.[0] as Stream) || null;

        if (!picked) {
          // 2) Next: upcoming / scheduled
          const { data: schedData, error: schedErr } = await supabase
            .from('streams')
            .select('*')
            .eq('status', 'scheduled')
            .order('scheduled_date', { ascending: true, nullsFirst: false })
            .limit(1);

          if (schedErr) throw schedErr;
          picked = (schedData?.[0] as Stream) || null;
        }

        if (!picked) {
          // 3) Fallback: most recent ended
          const { data: endedData, error: endedErr } = await supabase
            .from('streams')
            .select('*')
            .eq('status', 'ended')
            .order('created_at', { ascending: false })
            .limit(1);

          if (endedErr) throw endedErr;
          picked = (endedData?.[0] as Stream) || null;
        }

        setStream(picked);
      } catch (err: any) {
        console.error('Error loading stream for dashboard:', err);
        setError(err.message || 'Failed to load stream dashboard');
      } finally {
        setLoadingStream(false);
      }
    };

    fetchStream();
  }, []);

  /**
   * Fetch overview metrics once we know the stream.
   */
  useEffect(() => {
    if (!stream?.id) {
      setLoadingOverview(false);
      return;
    }

    const fetchOverview = async () => {
      try {
        setLoadingOverview(true);

        const streamId = stream.id;
        const currentUserId = user?.id || null;

        /** 1) Rounds: packs opened, total rounds, current round */
        const { data: roundsData, error: roundsErr } = await supabase
          .from('rounds')
          .select('*')
          .eq('stream_id', streamId);

        if (roundsErr) throw roundsErr;

        const rounds = (roundsData || []) as Round[];
        const totalOpened = rounds.reduce(
          (sum, r) => sum + (r.packs_opened ?? 0),
          0
        );
        setPacksOpened(totalOpened);

        const maxRound = rounds.length
          ? Math.max(...rounds.map((r) => r.round_number || 0))
          : 0;
        setTotalRounds(maxRound);

        // Current round: first unlocked; fallback to highest round_number
        let currentRound: Round | undefined = rounds
          .filter((r) => !r.locked)
          .sort((a, b) => a.round_number - b.round_number)[0];

        if (!currentRound && rounds.length) {
          currentRound = rounds.sort(
            (a, b) => b.round_number - a.round_number
          )[0];
        }

        setCurrentRoundNumber(currentRound ? currentRound.round_number : null);

        // NOTE: Once you add streams.total_packs_planned, you can compute:
        // const totalPlanned = stream.total_packs_planned ?? null;
        // and show `${totalOpened} / ${totalPlanned}` instead of just totalOpened.

        /** 2) Chase slots summary */
        const { count: chaseActiveCount, error: chaseCountErr } = await supabase
          .from('chase_slots')
          .select('id', { count: 'exact', head: true })
          .eq('stream_id', streamId)
          .eq('is_active', true);

        if (chaseCountErr) throw chaseCountErr;
        setChaseSlotsActive(chaseActiveCount || 0);

        let userChaseLeadCount = 0;
        if (currentUserId && (chaseActiveCount || 0) > 0) {
          const { data: activeSlots, error: slotsErr } = await supabase
            .from('chase_slots')
            .select('id')
            .eq('stream_id', streamId)
            .eq('is_active', true);

          if (slotsErr) throw slotsErr;

          const slotIds = (activeSlots || []).map((s: any) => s.id);
          if (slotIds.length > 0) {
            const { data: bidsData, error: bidsErr } = await supabase
              .from('chase_bids')
              .select('slot_id, user_id, amount, created_at')
              .in('slot_id', slotIds);

            if (bidsErr) throw bidsErr;

            const bySlot: Record<string, ChaseBid[]> = {};
            (bidsData || []).forEach((b: any) => {
              const bid = b as ChaseBid;
              if (!bySlot[bid.slot_id]) bySlot[bid.slot_id] = [];
              bySlot[bid.slot_id].push(bid);
            });

            Object.values(bySlot).forEach((bids) => {
              if (!bids.length) return;
              bids.sort((a, b) => {
                if (b.amount !== a.amount) return b.amount - a.amount;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              });
              const top = bids[0];
              if (top.user_id === currentUserId) userChaseLeadCount += 1;
            });
          }
        }
        setUserChaseLeading(userChaseLeadCount);

        /** 3) Lottery summary for OPEN rounds (locked = false) */
        const openRoundIds = rounds.filter((r) => !r.locked).map((r) => r.id);
        if (openRoundIds.length > 0) {
          const { data: lotData, error: lotErr } = await supabase
            .from('lottery_entries')
            .select('id, user_id, round_id')
            .in('round_id', openRoundIds);

          if (lotErr) throw lotErr;

          const entries = (lotData || []) as LotteryEntry[];
          setLotteryEntriesOpenTotal(entries.length);

          if (currentUserId) {
            const userEntriesCount = entries.filter(
              (e) => e.user_id === currentUserId
            ).length;
            setUserLotteryEntriesOpen(userEntriesCount);
          } else {
            setUserLotteryEntriesOpen(0);
          }
        } else {
          setLotteryEntriesOpenTotal(0);
          setUserLotteryEntriesOpen(0);
        }

        /** 4) Live singles summary */
        const {
          count: liveSinglesCount,
          error: liveSinglesCountErr,
        } = await supabase
          .from('live_singles')
          .select('id', { count: 'exact', head: true })
          .eq('stream_id', streamId)
          .eq('is_active', true);

        if (liveSinglesCountErr) throw liveSinglesCountErr;
        setLiveSinglesActive(liveSinglesCount || 0);

        let userSinglesLeadCount = 0;
        if (currentUserId && (liveSinglesCount || 0) > 0) {
          const { data: singlesRows, error: singlesErr } = await supabase
            .from('live_singles')
            .select('id')
            .eq('stream_id', streamId)
            .eq('is_active', true);

          if (singlesErr) throw singlesErr;

          const singleIds = (singlesRows || []).map((s: any) => s.id);
          if (singleIds.length > 0) {
            const { data: bidsRows, error: bidsErr } = await supabase
              .from('live_singles_bids')
              .select('card_id, user_id, amount, created_at')
              .in('card_id', singleIds);

            if (bidsErr) throw bidsErr;

            const byCard: Record<string, LiveSingleBid[]> = {};
            (bidsRows || []).forEach((b: any) => {
              const bid = b as LiveSingleBid;
              if (!byCard[bid.card_id]) byCard[bid.card_id] = [];
              byCard[bid.card_id].push(bid);
            });

            Object.values(byCard).forEach((bids) => {
              if (!bids.length) return;
              bids.sort((a, b) => {
                if (b.amount !== a.amount) return b.amount - a.amount;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              });
              const top = bids[0];
              if (top.user_id === currentUserId) userSinglesLeadCount += 1;
            });
          }
        }
        setUserSinglesLeading(userSinglesLeadCount);

        /** 5) Last big hit (from pulled_cards) */
        if (rounds.length > 0) {
          const roundIds = rounds.map((r) => r.id);
          const { data: pulls, error: pullsErr } = await supabase
            .from('pulled_cards')
            .select(
              'card_name, set_name, rarity, ungraded_market_price, date_updated, round_id'
            )
            .in('round_id', roundIds)
            .order('date_updated', { ascending: false })
            .limit(1);

          if (pullsErr) throw pullsErr;

          const hit = pulls?.[0] as PulledCard | undefined;
          setLastBigHit(hit || null);
        } else {
          setLastBigHit(null);
        }
      } catch (err: any) {
        console.error('Error loading dashboard overview:', err);
        setError(err.message || 'Failed to load dashboard overview');
      } finally {
        setLoadingOverview(false);
      }
    };

    fetchOverview();
  }, [stream?.id, user?.id]); // re-run when stream or user changes

  const loading = loadingStream || loadingOverview;

  /**
   * RENDER
   */
  if (loading && !stream) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="h-8 w-8 animate-spin text-yellow-400" />
          <p className="text-yellow-400 font-pokemon text-lg">
            Loading Stream Dashboard...
          </p>
        </div>
      </section>
    );
  }

  if (error && !stream) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black min-h-screen flex items-center justify-center">
        <div className="bg-red-900/40 border border-red-500 rounded-2xl p-6 max-w-md w-full">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <h2 className="text-red-300 font-pokemon text-xl">
              Unable to load dashboard
            </h2>
          </div>
          <p className="text-red-200 text-sm font-pokemon">
            {error || 'Something went wrong. Please refresh and try again.'}
          </p>
        </div>
      </section>
    );
  }

  if (!stream) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-yellow-400 font-pokemon text-2xl mb-2">
            No stream found
          </h2>
          <p className="text-gray-300 font-pokemon text-sm">
            Once a stream is scheduled or live, this dashboard will display its
            real-time status.
          </p>
        </div>
      </section>
    );
  }

  const statusPill = (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold font-pokemon ${statusColor(
        stream.status
      )}`}
    >
      <span className="w-2 h-2 rounded-full bg-white mr-2" />
      {statusLabel(stream.status)}
    </span>
  );

  return (
    <section className="py-10 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-3">
              {statusPill}
              <div className="flex items-center text-xs text-gray-400 font-pokemon space-x-2">
                <Activity className="h-3 w-3" />
                <span>Stream Overview</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-yellow-400 font-pokemon leading-tight">
              {stream.title}
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm mt-2 font-pokemon max-w-xl">
              One glance summary of chase slots, lotteries, and live singles for this
              stream. Use this page to see where the action is and where you&apos;re
              currently leading.
            </p>
          </div>

          <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-2xl px-4 py-3 flex flex-col space-y-1 min-w-[200px]">
            <div className="flex items-center justify-between text-xs text-gray-300 font-pokemon">
              <span>Scheduled</span>
              <span>{formatDateTime(stream.scheduled_date)}</span>
            </div>
            {/* Once started_at is added, this becomes real elapsed time:
            {stream.started_at && stream.status === 'live' && (
              <div className="flex items-center justify-between text-xs text-gray-300 font-pokemon">
                <span>Live for</span>
                <span>{formatElapsed(stream.started_at)}</span>
              </div>
            )}
            */}
            <div className="flex items-center justify-between text-xs text-gray-300 font-pokemon">
              <span>Singles Close</span>
              <span>{formatDateTime(stream.singles_close_at)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-yellow-300 font-pokemon">
              <span>Your Credits</span>
              <span>
                {loadingUser
                  ? 'Loading...'
                  : userCredit != null
                  ? `$${userCredit.toFixed(2)}`
                  : 'Sign in'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Packs / Rounds */}
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-3 sm:p-4 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-pokemon">
                Packs Opened
              </span>
              <Box className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-400 font-pokemon">
              {packsOpened}
              {/* Once total_packs_planned is added on streams:
              {stream.total_packs_planned != null && (
                <span className="text-xs text-gray-400 ml-1">
                  / {stream.total_packs_planned}
                </span>
              )}
              */}
            </div>
            <div className="text-[10px] text-gray-400 font-pokemon mt-1">
              Rounds: {totalRounds || '—'}
              {currentRoundNumber
                ? ` • Current: Round ${currentRoundNumber}`
                : ''}
            </div>
          </div>

          {/* Chase Slots */}
          <div className="bg-red-600/10 border border-red-600/40 rounded-2xl p-3 sm:p-4 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-pokemon">
                Chase Slots (Active)
              </span>
              <Trophy className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-400 font-pokemon">
              {chaseSlotsActive}
            </div>
            <div className="text-[10px] text-gray-400 font-pokemon mt-1">
              You&apos;re leading on{' '}
              <span className="text-red-300 font-semibold">
                {userChaseLeading}
              </span>{' '}
              slot{userChaseLeading === 1 ? '' : 's'}
            </div>
          </div>

          {/* Lottery */}
          <div className="bg-blue-500/10 border border-blue-500/40 rounded-2xl p-3 sm:p-4 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-pokemon">
                Lottery Entries (Open Rounds)
              </span>
              <Ticket className="h-4 w-4 text-blue-300" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-300 font-pokemon">
              {lotteryEntriesOpenTotal}
            </div>
            <div className="text-[10px] text-gray-400 font-pokemon mt-1">
              Your entries:{' '}
              <span className="text-blue-200 font-semibold">
                {userLotteryEntriesOpen}
              </span>
            </div>
          </div>

          {/* Live Singles */}
          <div className="bg-purple-500/10 border border-purple-500/40 rounded-2xl p-3 sm:p-4 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-pokemon">
                Live Singles (Active)
              </span>
              <Gavel className="h-4 w-4 text-purple-300" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-300 font-pokemon">
              {liveSinglesActive}
            </div>
            <div className="text-[10px] text-gray-400 font-pokemon mt-1">
              You&apos;re top bidder on{' '}
              <span className="text-purple-200 font-semibold">
                {userSinglesLeading}
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Row: Last Hit + Meta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Last Big Hit */}
          <div className="md:col-span-2 bg-gray-900/80 border border-yellow-400/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/40">
              <Sparkles className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 font-pokemon">
                Latest Pull Highlight
              </div>
              {lastBigHit ? (
                <>
                  <div className="text-sm sm:text-base text-yellow-300 font-pokemon font-semibold">
                    {lastBigHit.card_name}
                  </div>
                  <div className="text-[10px] text-gray-400 font-pokemon">
                    {lastBigHit.set_name || 'Set unknown'} •{' '}
                    {lastBigHit.rarity || 'Rarity N/A'}{' '}
                    {lastBigHit.ungraded_market_price != null &&
                      `• $${Number(
                        lastBigHit.ungraded_market_price
                      ).toFixed(2)} ungraded`}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-gray-500 font-pokemon">
                  No tracked pulls yet for this stream. As big hits are logged,
                  they&apos;ll appear here automatically.
                </div>
              )}
            </div>
          </div>

          {/* Quick Meta */}
          <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-4 space-y-2 text-xs text-gray-300 font-pokemon">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3 text-gray-400" />
                <span>Signed In</span>
              </div>
              <span>{user ? user.email || 'Yes' : 'Guest'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span>Stream Status</span>
              </div>
              <span className="capitalize">{stream.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-3 w-3 text-gray-400" />
                <span>Overview Loaded</span>
              </div>
              <span>{loadingOverview ? 'Updating...' : 'Live snapshot'}</span>
            </div>
          </div>
        </div>

        {/* Placeholder for future per-mechanic tables */}
        <div className="mt-6 text-[10px] text-gray-500 font-pokemon text-center">
          Detailed tables for Chase Slots, Lottery, and Live Singles can slot in
          below this overview, using the same stream_id and schema.
        </div>
      </div>
    </section>
  );
};

export default StreamDashboard;
