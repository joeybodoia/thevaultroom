/*
  # Streaming + Bidding (Chase Slots + Lottery) — Finalized

  Includes:
  - streams (with singles_close_at)
  - rounds (unique per stream/set/round)
  - users (is_admin, site_credit numeric(12,2) non-negative)
  - chase_slots (denormalized display fields + sync triggers)
  - chase_bids + leaders view
  - lottery_entries (per-pack unique) + indexes
  - lottery_winners (assigned_packs int[])
  - RLS + policies
*/

-- 1) Streams
CREATE TABLE IF NOT EXISTS public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scheduled_date timestamptz,
  singles_close_at timestamptz,               -- close time for Live Singles
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

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
  packs_opened int NOT NULL DEFAULT 10,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rounds_stream_set_round_uniq'
  ) THEN
    ALTER TABLE public.rounds
      ADD CONSTRAINT rounds_stream_set_round_uniq
      UNIQUE (stream_id, set_name, round_number);
  END IF;
END$$;

-- match current index: idx_rounds_stream_set_created
CREATE INDEX IF NOT EXISTS idx_rounds_stream_set_created
  ON public.rounds (stream_id, set_name, created_at DESC);

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

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
  site_credit numeric(12,2) DEFAULT 0 CHECK (site_credit >= 0)   -- precision + non-negative
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

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

-- 4) CHASE SLOTS (replaces legacy direct_bids targets)
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
  -- Denormalized display fields (populated from all_cards)
  card_name text,
  card_number text,
  rarity text,
  image_url text,
  ungraded_market_price numeric,
  date_updated timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique: one slot per stream/set/card
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chase_slots_stream_set_card_uniq'
  ) THEN
    ALTER TABLE public.chase_slots
      ADD CONSTRAINT chase_slots_stream_set_card_uniq
      UNIQUE (stream_id, set_name, all_card_id);
  END IF;
END$$;

-- Final index set — match current DB
CREATE INDEX IF NOT EXISTS idx_chase_slots_all_card_id
  ON public.chase_slots (all_card_id);

CREATE INDEX IF NOT EXISTS idx_chase_slots_stream_set_locked
  ON public.chase_slots (stream_id, set_name, locked);

CREATE INDEX IF NOT EXISTS idx_chase_slots_stream_set_active_price
  ON public.chase_slots (stream_id, set_name, is_active, ungraded_market_price DESC);

-- Name search: trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_chase_slots_card_name_trgm
  ON public.chase_slots USING gin (card_name gin_trgm_ops);

ALTER TABLE public.chase_slots ENABLE ROW LEVEL SECURITY;

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

-- 4a) Sync denormalized fields from all_cards (triggers)
CREATE OR REPLACE FUNCTION public.sync_chase_slot_card_details()
RETURNS TRIGGER AS $$
DECLARE
  r public.all_cards%ROWTYPE;
BEGIN
  IF NEW.all_card_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO r FROM public.all_cards WHERE id = NEW.all_card_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'all_cards row % not found for chase_slots', NEW.all_card_id;
  END IF;

  NEW.card_name             := r.card_name;
  NEW.card_number           := r.card_number;
  NEW.rarity                := r.rarity;
  NEW.image_url             := r.image_url;
  NEW.ungraded_market_price := r.ungraded_market_price;
  NEW.date_updated          := r.date_updated;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_chase_slot_card_details ON public.chase_slots;
CREATE TRIGGER trg_sync_chase_slot_card_details
BEFORE INSERT OR UPDATE OF all_card_id
ON public.chase_slots
FOR EACH ROW
EXECUTE FUNCTION public.sync_chase_slot_card_details();

CREATE OR REPLACE FUNCTION public.propagate_all_cards_to_chase_slots()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chase_slots cs
  SET
    card_name             = NEW.card_name,
    card_number           = NEW.card_number,
    rarity                = NEW.rarity,
    image_url             = NEW.image_url,
    ungraded_market_price = NEW.ungraded_market_price,
    date_updated          = NEW.date_updated
  WHERE cs.all_card_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_propagate_all_cards_to_chase_slots ON public.all_cards;
CREATE TRIGGER trg_propagate_all_cards_to_chase_slots
AFTER UPDATE OF
  card_name,
  card_number,
  rarity,
  image_url,
  ungraded_market_price,
  date_updated
ON public.all_cards
FOR EACH ROW
EXECUTE FUNCTION public.propagate_all_cards_to_chase_slots();

-- 5) CHASE BIDS
CREATE TABLE IF NOT EXISTS public.chase_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.chase_slots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- match current DB index set
CREATE INDEX IF NOT EXISTS idx_chase_bids_top
  ON public.chase_bids (slot_id, amount DESC);

CREATE INDEX IF NOT EXISTS chase_bids_user_id_created_at_idx
  ON public.chase_bids (user_id, created_at DESC);

CREATE OR REPLACE VIEW public.chase_slot_leaders AS
SELECT slot_id, MAX(amount) AS top_bid
FROM public.chase_bids
GROUP BY slot_id;

ALTER TABLE public.chase_bids ENABLE ROW LEVEL SECURITY;

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

-- 6) LOTTERY ENTRIES — per-pack unique
CREATE TABLE IF NOT EXISTS public.lottery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  selected_rarity text NOT NULL,
  created_at timestamptz DEFAULT now(),
  credits_used smallint,
  pack_number int NOT NULL DEFAULT 1
);

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

-- match current index set
CREATE INDEX IF NOT EXISTS idx_lottery_round_pack_rarity
  ON public.lottery_entries (round_id, pack_number, selected_rarity);

CREATE INDEX IF NOT EXISTS idx_lottery_user
  ON public.lottery_entries (user_id);

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
  assigned_packs int[],
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, winner_position)
);

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

-- Optional legacy cleanup lives in a separate migration.
