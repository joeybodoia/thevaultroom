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
  Crown,
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
  started_at: string | null;
  ended_at: string | null;
}

interface Round {
  id: string;
  stream_id: string | null;
  set_name: string;
  round_number: number;
  packs_opened: number;
  total_packs_planned: number | null;
  locked: boolean;
  created_at: string;
}

interface LotteryEntry {
  id: string;
  user_id: string | null;
  round_id: string | null;
}

interface ChaseSlotRow {
  id: string;
  card_name: string | null;
  set_name: string | null;
  rarity: string | null;
  ungraded_market_price: number | null;
  starting_bid: number;
  top_bid: number; // credits, default 0
  you_are_leading: boolean;
}

interface LiveSingleRow {
  id: string;
  card_name: string;
  set_name: string | null;
  ungraded_market_price: number | null;
  psa_10_price: number | null;
  buy_now: number | null;
  top_bid: number; // credits, default 0
  you_are_leading: boolean;
}

interface LotteryRoundRow {
  round_id: string;
  label: string;
  locked: boolean;
  total_entries: number;
  your_entries: number;
}

interface PulledCard {
  card_name: string;
  set_name: string | null;
  rarity: string | null;
  ungraded_market_price: number | null;
  date_updated: string | null;
}

/** ----------------- Helpers ----------------- */

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

const formatElapsed = (startIso: string | null, endIso?: string | null) => {
  if (!startIso) return '—';
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return '—';

  const diffMs = end - start;
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0 && minutes <= 0) return '<1 min';
  if (hours <= 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
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

/** ----------------- Component ----------------- */

const StreamDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userCredit, setUserCredit] = useState<number | null>(null);

  const [stream, setStream] = useState<Stream | null>(null);
  const [loadingStream, setLoadingStream] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [packsOpened, setPacksOpened] = useState<number>(0);
  const [packsPlanned, setPacksPlanned] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number | null>(
    null
  );

  const [chaseSlotsActive, setChaseSlotsActive] = useState<number>(0);
  const [userChaseLeading, setUserChaseLeading] = useState<number>(0);
  const [chaseSlotRows, setChaseSlotRows] = useState<ChaseSlotRow[]>([]);

  const [lotteryEntriesOpenTotal, setLotteryEntriesOpenTotal] =
    useState<number>(0);
  const [userLotteryEntriesOpen, setUserLotteryEntriesOpen] =
    useState<number>(0);
  const [lotteryRoundRows, setLotteryRoundRows] = useState<LotteryRoundRow[]>(
    []
  );

  const [liveSinglesActive, setLiveSinglesActive] = useState<number>(0);
  const [userSinglesLeading, setUserSinglesLeading] = useState<number>(0);
  const [liveSingleRows, setLiveSingleRows] = useState<LiveSingleRow[]>([]);

  const [lastBigHit, setLastBigHit] = useState<PulledCard | null>(null);

  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);

  /** -------- Auth bootstrap -------- */

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

  /** -------- Select "current" stream -------- */

  useEffect(() => {
    const fetchStream = async () => {
      try {
        setLoadingStream(true);
        setError(null);

        // Prefer LIVE
        let { data, error } = await supabase
          .from('streams')
          .select('*')
          .eq('status', 'live')
          .order('scheduled_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        let picked: Stream | null = (data?.[0] as Stream) || null;

        // Then SCHEDULED
        if (!picked) {
          const { data: schedData, error: schedErr } = await supabase
            .from('streams')
            .select('*')
            .eq('status', 'scheduled')
            .order('scheduled_date', { ascending: true, nullsFirst: false })
            .limit(1);

          if (schedErr) throw schedErr;
          picked = (schedData?.[0] as Stream) || null;
        }

        // Then latest ENDED
        if (!picked) {
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

  /** -------- Overview + mechanic summaries -------- */

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

        /** 1) Rounds / packs */
        const { data: roundsData, error: roundsErr } = await supabase
          .from('rounds')
          .select('*')
          .eq('stream_id', streamId);

        if (roundsErr) throw roundsErr;

        const rounds = (roundsData || []) as Round[];

        const totalOpened = rounds.reduce(
          (sum, r) => sum + (r.packs_opened || 0),
          0
        );
        setPacksOpened(totalOpened);

        const totalPlannedRaw = rounds.reduce((sum, r) => {
          const planned =
            r.total_packs_planned != null
              ? r.total_packs_planned
              : r.packs_opened || 0;
          return sum + planned;
        }, 0);
        setPacksPlanned(totalPlannedRaw > 0 ? totalPlannedRaw : null);

        const maxRound = rounds.length
          ? Math.max(...rounds.map((r) => r.round_number || 0))
          : 0;
        setTotalRounds(maxRound);

        let currentRound: Round | undefined = rounds
          .filter((r) => !r.locked)
          .sort((a, b) => a.round_number - b.round_number)[0];

        if (!currentRound && rounds.length) {
          currentRound = rounds.sort(
            (a, b) => b.round_number - a.round_number
          )[0];
        }

        setCurrentRoundNumber(currentRound ? currentRound.round_number : null);

        /** 2) Chase Slots Summary (ungraded only) */

        const { data: chaseSlotsData, error: chaseSlotsErr } = await supabase
          .from('chase_slots')
          .select(
            'id, stream_id, card_name, set_name, rarity, starting_bid, min_increment, is_active, ungraded_market_price'
          )
          .eq('stream_id', streamId)
          .eq('is_active', true);

        if (chaseSlotsErr) throw chaseSlotsErr;

        const chaseSlots = (chaseSlotsData || []) as any[];
        setChaseSlotsActive(chaseSlots.length || 0);

        let chaseSlotRowsLocal: ChaseSlotRow[] = [];
        let userChaseLeadCount = 0;

        if (chaseSlots.length > 0) {
          const slotIds = chaseSlots.map((s) => s.id);
          const { data: bidsData, error: bidsErr } = await supabase
            .from('chase_bids')
            .select('slot_id, user_id, amount, created_at')
            .in('slot_id', slotIds);

          if (bidsErr) throw bidsErr;

          type SlotAgg = {
            row: ChaseSlotRow;
            topBidTs: number;
            topBidUserId: string | null;
          };

          const bySlot: Record<string, SlotAgg> = {};

          chaseSlots.forEach((slot) => {
            bySlot[slot.id] = {
              row: {
                id: slot.id,
                card_name: slot.card_name || null,
                set_name: slot.set_name || null,
                rarity: slot.rarity || null,
                ungraded_market_price:
                  slot.ungraded_market_price != null
                    ? Number(slot.ungraded_market_price)
                    : null,
                starting_bid: Number(slot.starting_bid || 1),
                top_bid: 0,
                you_are_leading: false,
              },
              topBidTs: 0,
              topBidUserId: null,
            };
          });

          (bidsData || []).forEach((b: any) => {
            const agg = bySlot[b.slot_id];
            if (!agg) return;

            const amount = Number(b.amount);
            const ts = new Date(b.created_at).getTime() || 0;

            if (
              amount > agg.row.top_bid ||
              (amount === agg.row.top_bid && ts > 0 && ts < agg.topBidTs)
            ) {
              agg.row.top_bid = amount;
              agg.topBidTs = ts;
              agg.topBidUserId = b.user_id;
            }
          });

          chaseSlotRowsLocal = Object.values(bySlot).map((agg) => {
            if (currentUserId && agg.topBidUserId === currentUserId) {
              agg.row.you_are_leading = true;
              userChaseLeadCount += 1;
            }
            return agg.row;
          });

          // Sort by ungraded NM price desc (fallback 0)
          chaseSlotRowsLocal.sort(
            (a, b) =>
              (b.ungraded_market_price || 0) -
              (a.ungraded_market_price || 0)
          );
        }

        setChaseSlotRows(chaseSlotRowsLocal);
        setUserChaseLeading(userChaseLeadCount);

        /** 3) Lottery Summary (Open Rounds) */

        const openRounds = rounds.filter((r) => !r.locked);
        const openRoundIds = openRounds.map((r) => r.id);

        let lotteryRowsLocal: LotteryRoundRow[] = [];
        let totalEntriesAll = 0;
        let totalUserEntriesAll = 0;

        if (openRoundIds.length > 0) {
          const { data: lotData, error: lotErr } = await supabase
            .from('lottery_entries')
            .select('id, user_id, round_id')
            .in('round_id', openRoundIds);

          if (lotErr) throw lotErr;

          const entries = (lotData || []) as LotteryEntry[];
          totalEntriesAll = entries.length;

          const byRound: Record<
            string,
            { total: number; yours: number }
          > = {};

          entries.forEach((e) => {
            if (!e.round_id) return;
            if (!byRound[e.round_id]) {
              byRound[e.round_id] = { total: 0, yours: 0 };
            }
            byRound[e.round_id].total += 1;
            if (currentUserId && e.user_id === currentUserId) {
              byRound[e.round_id].yours += 1;
            }
          });

          lotteryRowsLocal = openRounds
            .sort((a, b) => a.round_number - b.round_number)
            .map((r) => {
              const stats = byRound[r.id] || { total: 0, yours: 0 };
              totalUserEntriesAll += stats.yours;
              return {
                round_id: r.id,
                label: `Round ${r.round_number} – ${r.set_name}`,
                locked: r.locked,
                total_entries: stats.total,
                your_entries: stats.yours,
              };
            });
        }

        setLotteryEntriesOpenTotal(totalEntriesAll);
        setUserLotteryEntriesOpen(totalUserEntriesAll);
        setLotteryRoundRows(lotteryRowsLocal);

        /** 4) Live Singles Summary (ungraded + PSA10) */

        const { data: singlesData, error: singlesErr } = await supabase
          .from('live_singles')
          .select(
            'id, stream_id, card_name, set_name, buy_now, is_active, ungraded_market_price, psa_10_price'
          )
          .eq('stream_id', streamId)
          .eq('is_active', true);

        if (singlesErr) throw singlesErr;

        const singles = (singlesData || []) as any[];
        setLiveSinglesActive(singles.length || 0);

        let singlesRowsLocal: LiveSingleRow[] = [];
        let userSinglesLeadCountLocal = 0;

        if (singles.length > 0) {
          const singleIds = singles.map((s) => s.id);
          const { data: bidsRows, error: bidsErr } = await supabase
            .from('live_singles_bids')
            .select('card_id, user_id, amount, created_at')
            .in('card_id', singleIds);

          if (bidsErr) throw bidsErr;

          type CardAgg = {
            topBid: number;
            topBidTs: number;
            topBidUserId: string | null;
          };

          const byCard: Record<string, CardAgg> = {};

          (bidsRows || []).forEach((b: any) => {
            const cardId = b.card_id;
            const amount = Number(b.amount);
            const ts = new Date(b.created_at).getTime() || 0;

            const curr = byCard[cardId] || {
              topBid: 0,
              topBidTs: 0,
              topBidUserId: null,
            };

            if (
              amount > curr.topBid ||
              (amount === curr.topBid && ts > 0 && ts < curr.topBidTs)
            ) {
              curr.topBid = amount;
              curr.topBidTs = ts;
              curr.topBidUserId = b.user_id;
            }

            byCard[cardId] = curr;
          });

          singlesRowsLocal = singles.map((s) => {
            const agg = byCard[s.id] || {
              topBid: 0,
              topBidTs: 0,
              topBidUserId: null,
            };
            const youLead =
              !!currentUserId && agg.topBidUserId === currentUserId;

            if (youLead) {
              userSinglesLeadCountLocal += 1;
            }

            return {
              id: s.id,
              card_name: s.card_name,
              set_name: s.set_name || null,
              ungraded_market_price:
                s.ungraded_market_price != null
                  ? Number(s.ungraded_market_price)
                  : null,
              psa_10_price:
                s.psa_10_price != null
                  ? Number(s.psa_10_price)
                  : null,
              buy_now:
                s.buy_now != null ? Number(s.buy_now) : null,
              top_bid: agg.topBid || 0,
              you_are_leading: youLead,
            };
          });

          // Sort by PSA 10 price desc (fallback 0)
          singlesRowsLocal.sort(
            (a, b) => (b.psa_10_price || 0) - (a.psa_10_price || 0)
          );
        }

        setLiveSingleRows(singlesRowsLocal);
        setUserSinglesLeading(userSinglesLeadCountLocal);

        /** 5) Last big hit */

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
  }, [stream?.id, user?.id]);

  const loading = loadingStream || loadingOverview;

  /** -------- Render states -------- */

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

  const showLiveElapsed =
    stream.status === 'live' && stream.started_at != null;
  const showEndedElapsed =
    stream.status === 'ended' &&
    stream.started_at != null &&
    stream.ended_at != null;

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

          <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-2xl px-4 py-3 flex flex-col space-y-1 min-w-[220px]">
            <div className="flex items-center justify-between text-xs text-gray-300 font-pokemon">
              <span>Scheduled</span>
              <span>{formatDateTime(stream.scheduled_date)}</span>
            </div>

            {showLiveElapsed && (
              <div className="flex items-center justify-between text-xs text-yellow-300 font-pokemon">
                <span>Live for</span>
                <span>{formatElapsed(stream.started_at)}</span>
              </div>
            )}

            {showEndedElapsed && (
              <div className="flex items-center justify-between text-xs text-gray-300 font-pokemon">
                <span>Ran for</span>
                <span>{formatElapsed(stream.started_at, stream.ended_at)}</span>
              </div>
            )}

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
              {packsPlanned != null && (
                <span className="text-xs text-gray-400 ml-1">
                  / {packsPlanned}
                </span>
              )}
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
                <span>Overview</span>
              </div>
              <span>{loadingOverview ? 'Updating...' : 'Live snapshot'}</span>
            </div>
          </div>
        </div>

        {/* ---------- Chase Slots Table (Ungraded only) ---------- */}
        <div className="mt-8">
          <div className="flex items-center mb-3 space-x-2">
            <Trophy className="h-4 w-4 text-red-400" />
            <h2 className="text-sm sm:text-base text-red-200 font-pokemon font-semibold">
              Chase Slots Summary
            </h2>
          </div>
          <div className="bg-gray-900/80 border border-red-500/20 rounded-2xl">
            {chaseSlotRows.length === 0 ? (
              <div className="px-4 py-6 text-xs text-gray-500 font-pokemon text-center">
                No active chase slots for this stream yet.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full text-xs font-pokemon">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="px-3 py-2 text-left">Card / Slot</th>
                      <th className="px-3 py-2 text-left">Set</th>
                      <th className="px-3 py-2 text-left">Rarity</th>
                      <th className="px-3 py-2 text-right">
                        Ungraded NM
                      </th>
                      <th className="px-3 py-2 text-right">
                        Top Bid (credits)
                      </th>
                      <th className="px-3 py-2 text-center">Your Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chaseSlotRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-t border-gray-900 ${
                          row.you_are_leading
                            ? 'bg-red-600/10'
                            : 'hover:bg-gray-800/60'
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-100">
                          {row.card_name || 'Chase Slot'}
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          {row.set_name || '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          {row.rarity || '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {row.ungraded_market_price != null
                            ? `$${row.ungraded_market_price.toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-red-300">
                          {row.top_bid.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.you_are_leading ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                              <Crown className="h-3 w-3 mr-1" />
                              You&apos;re leading
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500">
                              Not leading
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ---------- Lottery Table ---------- */}
        <div className="mt-8">
          <div className="flex items-center mb-3 space-x-2">
            <Ticket className="h-4 w-4 text-blue-300" />
            <h2 className="text-sm sm:text-base text-blue-200 font-pokemon font-semibold">
              Lottery Summary (Open Rounds)
            </h2>
          </div>
          <div className="bg-gray-900/80 border border-blue-500/20 rounded-2xl overflow-x-auto">
            {lotteryRoundRows.length === 0 ? (
              <div className="px-4 py-6 text-xs text-gray-500 font-pokemon text-center">
                No open lottery rounds. Once new rounds unlock, entries will appear here.
              </div>
            ) : (
              <table className="min-w-full text-xs font-pokemon">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="px-3 py-2 text-left">Round</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Total Entries</th>
                    <th className="px-3 py-2 text-right">Your Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {lotteryRoundRows.map((row) => (
                    <tr
                      key={row.round_id}
                      className="border-t border-gray-900 hover:bg-gray-800/60"
                    >
                      <td className="px-3 py-2 text-gray-100">{row.label}</td>
                      <td className="px-3 py-2 text-gray-400">
                        {row.locked ? 'Locked' : 'Open'}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-300">
                        {row.total_entries}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.your_entries > 0 ? (
                          <span className="text-blue-200 font-semibold">
                            {row.your_entries}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">
                            None yet
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ---------- Live Singles Table ---------- */}
        <div className="mt-8">
          <div className="flex items-center mb-3 space-x-2">
            <Gavel className="h-4 w-4 text-purple-300" />
            <h2 className="text-sm sm:text-base text-purple-200 font-pokemon font-semibold">
              Live Singles Summary
            </h2>
          </div>
          <div className="bg-gray-900/80 border border-purple-500/20 rounded-2xl">
            {liveSingleRows.length === 0 ? (
              <div className="px-4 py-6 text-xs text-gray-500 font-pokemon text-center">
                No active Live Singles for this stream.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full text-xs font-pokemon">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="px-3 py-2 text-left">Card</th>
                      <th className="px-3 py-2 text-left">Set</th>
                      <th className="px-3 py-2 text-right">
                        Ungraded NM
                      </th>
                      <th className="px-3 py-2 text-right">
                        PSA 10
                      </th>
                      <th className="px-3 py-2 text-right">Buy Now</th>
                      <th className="px-3 py-2 text-right">
                        Top Bid (credits)
                      </th>
                      <th className="px-3 py-2 text-center">Your Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveSingleRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-t border-gray-900 ${
                          row.you_are_leading
                            ? 'bg-purple-600/10'
                            : 'hover:bg-gray-800/60'
                        }`}
                      >
                        <td className="px-3 py-2 text-gray-100">
                          {row.card_name}
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          {row.set_name || '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {row.ungraded_market_price != null
                            ? `$${row.ungraded_market_price.toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {row.psa_10_price != null
                            ? `$${row.psa_10_price.toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">
                          {row.buy_now != null
                            ? `$${row.buy_now.toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-purple-300">
                          {row.top_bid.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.you_are_leading ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px]">
                              <Crown className="h-3 w-3 mr-1" />
                              You&apos;re leading
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500">
                              Not leading
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-[10px] text-gray-500 font-pokemon text-center">
          This dashboard is a read-only snapshot powered by your existing tables:
          <span className="text-gray-400">
            {' '}
            streams, rounds, chase_slots, chase_bids, lottery_entries,
            live_singles, live_singles_bids, pulled_cards.
          </span>
        </div>
      </div>
    </section>
  );
};

export default StreamDashboard;
