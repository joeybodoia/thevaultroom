/*
  # Streaming + Bidding (Chase Slots + Lottery) — Updated

  Changes from original:
  - REPLACED legacy "direct_bids" / "round_high_value_cards" with "chase_slots" + "chase_bids"
  - UPDATED "lottery_entries" to support per-pack entries (pack_number + new UNIQUE)
  - KEPT "lottery_winners" with assigned_packs int[]
  - ADDED "streams.singles_close_at" to support Live Singles closing window
  - ADDED RLS + policies for new/updated tables
*/

-- 1) Streams
CREATE TABLE IF NOT EXISTS public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scheduled_date timestamptz,
  singles_close_at timestamptz,               -- NEW: close time for Live Singles
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

-- Public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'streams' AND policyname = 'Anyone can read streams'
  ) THEN
    CREATE POLICY "Anyone can read streams"
      ON public.streams
      FOR SELECT
      TO public
      USING (true);
  END IF;
END$$;

-- 2) Rounds (one per set per stream)
CREATE TABLE IF NOT EXISTS public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE,
  set_name text NOT NULL,
  round_number int NOT NULL CHECK (round_number BETWEEN 1 AND 3),
  packs_opened int NOT NULL DEFAULT 10,       -- (optional rename to packs_opened_count later)
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Ensure each stream has at most one row per (set, round_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rounds_stream_set_round_uniq'
  ) THEN
    ALTER TABLE public.rounds
      ADD CONSTRAINT rounds_stream_set_round_uniq
      UNIQUE (stream_id, set_name, round_number);
  END IF;
END$$;

-- RLS
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

-- Public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rounds' AND policyname = 'Anyone can read rounds'
  ) THEN
    CREATE POLICY "Anyone can read rounds"
      ON public.rounds
      FOR SELECT
      TO public
      USING (true);
  END IF;
END$$;

-- 3) Users (linked to Supabase auth)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  email text,
  join_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false,
  avatar text,
  site_credit numeric(12,2) DEFAULT 0 CHECK (site_credit >= 0)   -- UPDATED precision + non-negative
);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read/insert/update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users can read own data'
  ) THEN
    CREATE POLICY "Users can read own data"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users can update own data'
  ) THEN
    CREATE POLICY "Users can update own data"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users can insert own data'
  ) THEN
    CREATE POLICY "Users can insert own data"
      ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- 4) CHASE SLOTS (replaces round_high_value_cards + direct_bids target)
CREATE TABLE IF NOT EXISTS public.chase_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  set_name text NOT NULL,
  all_card_id uuid NOT NULL REFERENCES public.all_cards(id) ON DELETE RESTRICT,
  starting_bid numeric(12,2) NOT NULL DEFAULT 1,
  min_increment numeric(12,2) NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  locked boolean NOT NULL DEFAULT false,
  winner_user_id uuid REFERENCES public.users(id),
  winning_bid_id uuid,
  -- NEW denormalized display fields
  card_name text,
  card_number text,
  rarity text,
  image_url text,
  ungraded_market_price numeric,
  date_updated timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
  );
CREATE INDEX IF NOT EXISTS idx_chase_slots_stream_set ON public.chase_slots (stream_id, set_name);
CREATE INDEX IF NOT EXISTS idx_chase_slots_active ON public.chase_slots (is_active);

-- RLS
ALTER TABLE public.chase_slots ENABLE ROW LEVEL SECURITY;

-- Public read; only admins insert/update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chase_slots' AND policyname='Anyone can read chase slots'
  ) THEN
    CREATE POLICY "Anyone can read chase slots"
      ON public.chase_slots
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chase_slots' AND policyname='Admins manage chase slots'
  ) THEN
    CREATE POLICY "Admins manage chase slots"
      ON public.chase_slots
      FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));
  END IF;
END$$;

-- 5) CHASE BIDS (replaces direct_bids)
CREATE TABLE IF NOT EXISTS public.chase_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.chase_slots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chase_bids_slot ON public.chase_bids (slot_id);
CREATE INDEX IF NOT EXISTS idx_chase_bids_user ON public.chase_bids (user_id, created_at DESC);

-- Leader view (top bid per slot)
CREATE OR REPLACE VIEW public.chase_slot_leaders AS
SELECT slot_id, MAX(amount) AS top_bid
FROM public.chase_bids
GROUP BY slot_id;

-- RLS
ALTER TABLE public.chase_bids ENABLE ROW LEVEL SECURITY;

-- Anyone can read; users can manage own bids
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chase_bids' AND policyname='Anyone can read chase bids'
  ) THEN
    CREATE POLICY "Anyone can read chase bids"
      ON public.chase_bids
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chase_bids' AND policyname='Users can insert own chase bids'
  ) THEN
    CREATE POLICY "Users can insert own chase bids"
      ON public.chase_bids
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chase_bids' AND policyname='Users can update own chase bids'
  ) THEN
    CREATE POLICY "Users can update own chase bids"
      ON public.chase_bids
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- 6) LOTTERY ENTRIES — updated to per-pack unique
CREATE TABLE IF NOT EXISTS public.lottery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  selected_rarity text NOT NULL,
  created_at timestamptz DEFAULT now(),
  credits_used smallint,
  pack_number int NOT NULL DEFAULT 1
);

-- Drop old unique (user_id, round_id) if exists, then add (user_id, round_id, pack_number)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lottery_entries'::regclass
      AND conname = 'lottery_entries_user_id_round_id_key'
  ) THEN
    ALTER TABLE public.lottery_entries
      DROP CONSTRAINT lottery_entries_user_id_round_id_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lottery_entries'::regclass
      AND conname = 'lottery_entries_user_round_pack_uniq'
  ) THEN
    ALTER TABLE public.lottery_entries
      ADD CONSTRAINT lottery_entries_user_round_pack_uniq
      UNIQUE (user_id, round_id, pack_number);
  END IF;
END$$;

-- Helpful indexes for live counts
CREATE INDEX IF NOT EXISTS idx_lottery_round_pack ON public.lottery_entries (round_id, pack_number);
CREATE INDEX IF NOT EXISTS idx_lottery_round_rarity ON public.lottery_entries (round_id, selected_rarity);
CREATE INDEX IF NOT EXISTS idx_lottery_round ON public.lottery_entries (round_id);
CREATE INDEX IF NOT EXISTS idx_lottery_user ON public.lottery_entries (user_id);

-- RLS
ALTER TABLE public.lottery_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lottery_entries' AND policyname='Anyone can read lottery entries'
  ) THEN
    CREATE POLICY "Anyone can read lottery entries"
      ON public.lottery_entries
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lottery_entries' AND policyname='Users can insert own lottery entries'
  ) THEN
    CREATE POLICY "Users can insert own lottery entries"
      ON public.lottery_entries
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lottery_entries' AND policyname='Users can update own lottery entries'
  ) THEN
    CREATE POLICY "Users can update own lottery entries"
      ON public.lottery_entries
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- 7) LOTTERY WINNERS
CREATE TABLE IF NOT EXISTS public.lottery_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  lottery_entry_id uuid REFERENCES public.lottery_entries(id) ON DELETE CASCADE,
  winner_position int CHECK (winner_position IN (1, 2)),
  assigned_packs int[],                           -- ensure int[] (not text)
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, winner_position)
);

-- RLS
ALTER TABLE public.lottery_winners ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lottery_winners' AND policyname='Anyone can read lottery winners'
  ) THEN
    CREATE POLICY "Anyone can read lottery winners"
      ON public.lottery_winners
      FOR SELECT
      TO public
      USING (true);
  END IF;
END$$;

-- 8) CLEAN UP LEGACY TABLES (optional here; safe to leave to a separate migration)
-- If these still exist from prior migrations, you can remove them now or in a dedicated cleanup:
-- DROP TABLE IF EXISTS public.direct_bids CASCADE;
-- DROP TABLE IF EXISTS public.round_high_value_cards CASCADE;

-- (Note) "live_singles" + "live_singles_bids" are introduced in your other migration file as discussed.
