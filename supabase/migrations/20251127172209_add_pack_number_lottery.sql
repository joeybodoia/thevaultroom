-- Adds pack_number tracking to lottery prize pool tables and pulled_cards

-- 1) pulled_cards: pack_number
ALTER TABLE IF EXISTS public.pulled_cards
  ADD COLUMN IF NOT EXISTS pack_number int DEFAULT 1;

-- 2) lottery_prize_pool: pack_number
ALTER TABLE IF EXISTS public.lottery_prize_pool
  ADD COLUMN IF NOT EXISTS pack_number int;

-- 3) lottery_prize_pool_ordered: pack_number
ALTER TABLE IF EXISTS public.lottery_prize_pool_ordered
  ADD COLUMN IF NOT EXISTS pack_number int;

-- 4) Update compute_lottery_prize_pool to include pack_number
CREATE OR REPLACE FUNCTION public.compute_lottery_prize_pool(p_round_id uuid)
RETURNS SETOF public.lottery_prize_pool
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_is_admin boolean;
  v_round public.rounds%ROWTYPE;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.users WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_round FROM public.rounds WHERE id = p_round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id;
  END IF;
  IF v_round.bidding_status <> 'closed' THEN
    RAISE EXCEPTION 'Round % must be closed to compute lottery prize pool', p_round_id;
  END IF;

  DELETE FROM public.lottery_prize_pool WHERE round_id = p_round_id;

  WITH round_set AS (
    SELECT set_name FROM public.rounds WHERE id = p_round_id
  ), winning_rarities AS (
    SELECT DISTINCT normalize_lottery_rarity(pc.set_name, pc.rarity, pc.card_name) AS norm_rarity
    FROM public.pulled_cards pc
    WHERE pc.round_id = p_round_id AND pc.rarity IS NOT NULL
  )
  INSERT INTO public.lottery_prize_pool (round_id, user_id, email, selected_rarity, pack_number)
  SELECT
    le.round_id,
    le.user_id,
    u.email,
    le.selected_rarity,
    le.pack_number
  FROM public.lottery_entries le
  JOIN public.users u ON u.id = le.user_id
  CROSS JOIN round_set rs
  WHERE le.round_id = p_round_id
    AND normalize_lottery_rarity(rs.set_name, le.selected_rarity, NULL) IN (SELECT norm_rarity FROM winning_rarities);

  RETURN QUERY
    SELECT * FROM public.lottery_prize_pool
    WHERE round_id = p_round_id;
END;
$$;

-- 5) Update order_lottery_prize_pool to carry pack_number
CREATE OR REPLACE FUNCTION public.order_lottery_prize_pool(p_round_id uuid)
RETURNS SETOF public.lottery_prize_pool_ordered
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.users WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.lottery_prize_pool_ordered WHERE round_id = p_round_id;

  INSERT INTO public.lottery_prize_pool_ordered (round_id, user_id, email, selected_rarity, pack_number, seq)
  SELECT
    p.round_id,
    p.user_id,
    p.email,
    p.selected_rarity,
    p.pack_number,
    ROW_NUMBER() OVER (ORDER BY gen_random_uuid()) AS seq
  FROM public.lottery_prize_pool p
  WHERE p.round_id = p_round_id;

  RETURN QUERY
    SELECT * FROM public.lottery_prize_pool_ordered
    WHERE round_id = p_round_id
    ORDER BY seq;
END;
$$;
