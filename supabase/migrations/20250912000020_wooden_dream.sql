/*
  Migration #2 — Site Credits + Live Singles Inventory + Atomic Bid/Credit RPCs

  Contents:
    0) all_cards flags (live_singles + psa_10_price) + index
    1) Ensure users.site_credit precision/check
    2) New-user trigger: grant $10 to first 100 users
    3) RPC: enter_lottery_with_debit (atomic debit + insert)
    4) Live Singles Inventory + Live Singles (+ bids) and leader view
    5) RPC: place_chase_bid_immediate_refund (immediate refund on outbid)
    6) RPC: place_live_single_bid_immediate_refund (immediate refund on outbid)
    7) create_live_singles_for_stream(p_stream_id)
    8) Grants for authenticated role (including set_current_stream)
*/

-- 0) all_cards: live_singles flag + psa_10_price + index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'all_cards'
  ) THEN
    -- live_singles boolean flag
    ALTER TABLE public.all_cards
      ADD COLUMN IF NOT EXISTS live_singles boolean NOT NULL DEFAULT false;

    -- psa_10_price column
    ALTER TABLE public.all_cards
      ADD COLUMN IF NOT EXISTS psa_10_price numeric;

    -- psa_10_price non-negative check (named as in current DB)
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'all_cards_psa_10_price_check'
        AND conrelid = 'public.all_cards'::regclass
    ) THEN
      ALTER TABLE public.all_cards
        ADD CONSTRAINT all_cards_psa_10_price_check
        CHECK (psa_10_price IS NULL OR psa_10_price >= 0);
    END IF;
  END IF;
END$$;

-- Index on live_singles flag for filtering
CREATE INDEX IF NOT EXISTS idx_all_cards_live_singles
  ON public.all_cards (live_singles);


-- 1) Users: site_credit precision/check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'site_credit'
  ) THEN
    ALTER TABLE public.users
      ALTER COLUMN site_credit TYPE numeric(12,2)
      USING site_credit::numeric,
      ALTER COLUMN site_credit SET DEFAULT 0,
      DROP CONSTRAINT IF EXISTS users_site_credit_nonneg,
      ADD CONSTRAINT users_site_credit_nonneg CHECK (site_credit >= 0);
  ELSE
    ALTER TABLE public.users
      ADD COLUMN site_credit numeric(12,2) DEFAULT 0 CHECK (site_credit >= 0);
  END IF;
END$$;

-- Note: no idx_users_credit index here, matching current DB state.


-- 2) New-user trigger: credit on signup (first 100 users)
CREATE OR REPLACE FUNCTION public.handle_new_user_with_credits()
RETURNS TRIGGER AS $$
DECLARE
  user_count integer;
  initial_credit numeric(12,2) := 0;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  IF user_count < 100 THEN
    initial_credit := 10.00;
  END IF;

  INSERT INTO public.users (id, email, username, site_credit)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    initial_credit
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, users.username),
    site_credit = COALESCE(users.site_credit, initial_credit);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_credits();


-- 3) RPC: enter_lottery_with_debit (atomic)
CREATE OR REPLACE FUNCTION public.enter_lottery_with_debit(
  p_user_id uuid,
  p_round_id uuid,
  p_selected_rarity text,
  p_pack_number int,
  p_credit_cost numeric DEFAULT 5
) RETURNS uuid AS $$
DECLARE
  new_entry_id uuid;
BEGIN
  -- Ensure sufficient credits and lock user row
  PERFORM 1 FROM public.users WHERE id = p_user_id AND site_credit >= p_credit_cost FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Debit credits
  UPDATE public.users
    SET site_credit = site_credit - p_credit_cost
  WHERE id = p_user_id;

  -- Insert entry (unique on user_id, round_id, pack_number)
  INSERT INTO public.lottery_entries (user_id, round_id, selected_rarity, pack_number, credits_used)
  VALUES (p_user_id, p_round_id, p_selected_rarity, p_pack_number, p_credit_cost)
  RETURNING id INTO new_entry_id;

  RETURN new_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4) Live Singles Inventory + Live Singles (+ bids) and leader view

-- 4a) Live Singles Inventory (master inventory of cards that can be run as live singles)
CREATE TABLE IF NOT EXISTS public.live_singles_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to global card metadata
  all_card_id uuid NOT NULL REFERENCES public.all_cards(id),

  -- Static config / overrides for how you want to run it as a single
  card_name text NOT NULL,
  card_number text,
  set_name text,
  image_url text,

  default_starting_bid numeric(12,2) NOT NULL DEFAULT 1,
  default_min_increment numeric(12,2) NOT NULL DEFAULT 1,
  default_buy_now numeric(12,2),

  -- Inventory tracking
  quantity_available integer NOT NULL DEFAULT 1,
  quantity_sold integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index to quickly join to all_cards from inventory
CREATE INDEX IF NOT EXISTS idx_live_singles_inventory_all_card_id
  ON public.live_singles_inventory (all_card_id);


-- 4b) Live Singles (per-stream instances, pointing into inventory)
CREATE TABLE IF NOT EXISTS public.live_singles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE,

  -- Link back to inventory
  inventory_id uuid NOT NULL REFERENCES public.live_singles_inventory(id),

  -- Display / auction config
  card_name text NOT NULL,
  card_number text,
  card_condition text,
  set_name text,
  image_url text,
  starting_bid numeric(12,2) NOT NULL DEFAULT 1,
  min_increment numeric(12,2) NOT NULL DEFAULT 1,
  buy_now numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Pricing metadata
  ungraded_market_price numeric(12,2) CHECK (ungraded_market_price IS NULL OR ungraded_market_price >= 0),
  psa_10_price         numeric(12,2) CHECK (psa_10_price IS NULL OR psa_10_price >= 0),

  CONSTRAINT live_singles_status_check
    CHECK (status IN ('open', 'sold', 'cancelled'))
);

-- match current DB index set
CREATE INDEX IF NOT EXISTS live_singles_stream_id_is_active_idx
  ON public.live_singles (stream_id, is_active);

CREATE INDEX IF NOT EXISTS idx_live_singles_stream_active_psa10_price
  ON public.live_singles (stream_id, is_active, psa_10_price DESC, ungraded_market_price DESC);

-- Index to quickly find all live_singles rows for a given inventory card
CREATE INDEX IF NOT EXISTS idx_live_singles_inventory_id
  ON public.live_singles (inventory_id);


CREATE TABLE IF NOT EXISTS public.live_singles_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.live_singles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- match current DB index set
CREATE INDEX IF NOT EXISTS idx_individual_bids_top
  ON public.live_singles_bids (card_id, amount DESC);

CREATE INDEX IF NOT EXISTS live_singles_bids_user_id_created_at_idx
  ON public.live_singles_bids (user_id, created_at DESC);

CREATE OR REPLACE VIEW public.live_singles_leaders AS
SELECT card_id, MAX(amount) AS top_bid
FROM public.live_singles_bids
GROUP BY card_id;

ALTER TABLE public.live_singles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_singles_bids ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='live_singles' AND policyname='Anyone can read live singles'
  ) THEN
    CREATE POLICY "Anyone can read live singles"
      ON public.live_singles
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='live_singles' AND policyname='Admins manage live singles'
  ) THEN
    CREATE POLICY "Admins manage live singles"
      ON public.live_singles
      FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='live_singles_bids' AND policyname='Anyone can read live singles bids'
  ) THEN
    CREATE POLICY "Anyone can read live singles bids"
      ON public.live_singles_bids
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='live_singles_bids' AND policyname='Users can insert own live singles bids'
  ) THEN
    CREATE POLICY "Users can insert own live singles bids"
      ON public.live_singles_bids
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='live_singles_bids' AND policyname='Users can update own live singles bids'
  ) THEN
    CREATE POLICY "Users can update own live singles bids"
      ON public.live_singles_bids
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;


-- 5) RPC: Chase Slots immediate-refund bidding
DROP FUNCTION IF EXISTS public.place_chase_bid_with_hold(uuid, uuid, numeric);

CREATE OR REPLACE FUNCTION public.place_chase_bid_immediate_refund(
  p_user_id uuid,
  p_slot_id uuid,
  p_amount numeric
) RETURNS uuid AS $$
DECLARE
  v_slot RECORD;
  v_prev RECORD;
  v_min_allowed numeric;
  v_bid_id uuid;
BEGIN
  SELECT * INTO v_slot
  FROM public.chase_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chase slot not found';
  END IF;

  IF v_slot.locked THEN
    RAISE EXCEPTION 'Bidding is closed for this chase slot';
  END IF;

  SELECT b.id, b.user_id, b.amount
  INTO v_prev
  FROM public.chase_bids b
  WHERE b.slot_id = p_slot_id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;

  IF v_prev IS NULL THEN
    IF p_amount < v_slot.starting_bid THEN
      RAISE EXCEPTION 'Minimum bid is $%', v_slot.starting_bid;
    END IF;
  ELSE
    v_min_allowed := v_prev.amount + v_slot.min_increment;
    IF p_amount < v_min_allowed THEN
      RAISE EXCEPTION 'Your bid must be at least $% (top $% + increment $%)',
        v_min_allowed, v_prev.amount, v_slot.min_increment;
    END IF;
  END IF;

  PERFORM 1 FROM public.users WHERE id = p_user_id AND site_credit >= p_amount FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits for this bid';
  END IF;

  IF v_prev IS NOT NULL THEN
    PERFORM 1 FROM public.users WHERE id = v_prev.user_id FOR UPDATE;
    UPDATE public.users SET site_credit = site_credit + v_prev.amount
    WHERE id = v_prev.user_id;
  END IF;

  UPDATE public.users SET site_credit = site_credit - p_amount
  WHERE id = p_user_id;

  INSERT INTO public.chase_bids (slot_id, user_id, amount)
  VALUES (p_slot_id, p_user_id, p_amount)
  RETURNING id INTO v_bid_id;

  UPDATE public.chase_slots
    SET winner_user_id = p_user_id,
        winning_bid_id = v_bid_id
  WHERE id = p_slot_id;

  RETURN v_bid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6) RPC: Live Singles immediate-refund bidding
DROP FUNCTION IF EXISTS public.place_live_single_bid_with_hold(uuid, uuid, numeric);

CREATE OR REPLACE FUNCTION public.place_live_single_bid_immediate_refund(
  p_user_id uuid,
  p_card_id uuid,
  p_amount numeric
) RETURNS uuid AS $$
DECLARE
  v_card RECORD;
  v_prev RECORD;
  v_min_allowed numeric;
  v_bid_id uuid;
BEGIN
  SELECT * INTO v_card
  FROM public.live_singles
  WHERE id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Live single not found';
  END IF;

  IF NOT v_card.is_active OR v_card.status <> 'open' THEN
    RAISE EXCEPTION 'Bidding is closed for this live single';
  END IF;

  SELECT b.id, b.user_id, b.amount
  INTO v_prev
  FROM public.live_singles_bids b
  WHERE b.card_id = p_card_id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;

  IF v_prev IS NULL THEN
    IF p_amount < v_card.starting_bid THEN
      RAISE EXCEPTION 'Minimum bid is $%', v_card.starting_bid;
    END IF;
  ELSE
    v_min_allowed := v_prev.amount + v_card.min_increment;
    IF p_amount < v_min_allowed THEN
      RAISE EXCEPTION 'Your bid must be at least $% (top $% + increment $%)',
        v_min_allowed, v_prev.amount, v_card.min_increment;
    END IF;
  END IF;

  PERFORM 1 FROM public.users WHERE id = p_user_id AND site_credit >= p_amount FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits for this bid';
  END IF;

  IF v_prev IS NOT NULL THEN
    PERFORM 1 FROM public.users WHERE id = v_prev.user_id FOR UPDATE;
    UPDATE public.users SET site_credit = site_credit + v_prev.amount
    WHERE id = v_prev.user_id;
  END IF;

  UPDATE public.users SET site_credit = site_credit - p_amount
  WHERE id = p_user_id;

  INSERT INTO public.live_singles_bids (card_id, user_id, amount)
  VALUES (p_card_id, p_user_id, p_amount)
  RETURNING id INTO v_bid_id;

  RETURN v_bid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7) RPC: create_live_singles_for_stream(p_stream_id)
CREATE OR REPLACE FUNCTION public.create_live_singles_for_stream(p_stream_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.live_singles (
    stream_id,
    inventory_id,
    card_name,
    card_number,
    set_name,
    image_url,
    starting_bid,
    min_increment,
    buy_now,
    ungraded_market_price,
    psa_10_price,
    card_condition
    -- optionally: is_active, status
  )
  SELECT
    p_stream_id,
    inv.id,
    COALESCE(inv.card_name,  ac.card_name),
    COALESCE(inv.card_number, ac.card_number),
    COALESCE(inv.set_name,    ac.set_name),
    COALESCE(inv.image_url,   ac.image_url),
    inv.default_starting_bid,
    inv.default_min_increment,
    inv.default_buy_now,
    ac.ungraded_market_price,
    ac.psa_10_price,
    NULL::text AS card_condition
  FROM public.live_singles_inventory inv
  JOIN public.all_cards ac
    ON ac.id = inv.all_card_id
  WHERE inv.is_active = TRUE
    AND inv.quantity_available > inv.quantity_sold
    AND (ac.live_singles IS TRUE)              -- 🔹 NEW: respect singles flag
    -- don’t create duplicates for the same stream + inventory card
    AND NOT EXISTS (
      SELECT 1
      FROM public.live_singles ls
      WHERE ls.stream_id    = p_stream_id
        AND ls.inventory_id = inv.id
    );
END;
$$ LANGUAGE plpgsql;


-- 8) Grants for authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT EXECUTE ON FUNCTION public.enter_lottery_with_debit(uuid, uuid, text, int, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_chase_bid_immediate_refund(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_live_single_bid_immediate_refund(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_stream(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_live_singles_for_stream(uuid) TO authenticated;

