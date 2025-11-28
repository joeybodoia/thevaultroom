-- Add email tracking to chase bids/leaders/winner matches

-- 1) chase_bids: email column + backfill + trigger to keep in sync
ALTER TABLE IF EXISTS public.chase_bids
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.chase_bids cb
SET email = u.email
FROM public.users u
WHERE cb.user_id = u.id
  AND (cb.email IS NULL OR cb.email = '');

CREATE OR REPLACE FUNCTION public.fill_chase_bid_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email FROM public.users WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fill_chase_bid_email ON public.chase_bids;
CREATE TRIGGER trg_fill_chase_bid_email
BEFORE INSERT ON public.chase_bids
FOR EACH ROW
EXECUTE FUNCTION public.fill_chase_bid_email();

-- 2) chase_slot_leaders view: include top bidder email
CREATE OR REPLACE VIEW public.chase_slot_leaders AS
WITH ranked AS (
  SELECT
    cb.slot_id,
    cb.amount,
    cb.email,
    cb.created_at,
    cb.id,
    ROW_NUMBER() OVER (PARTITION BY cb.slot_id ORDER BY cb.amount DESC, cb.created_at ASC, cb.id ASC) AS rnk,
    MAX(cb.amount) OVER (PARTITION BY cb.slot_id) AS top_bid
  FROM public.chase_bids cb
)
SELECT slot_id, top_bid, email AS top_bid_email
FROM ranked
WHERE rnk = 1;

-- 3) chase_slot_winner_matches: add winner_email
ALTER TABLE IF EXISTS public.chase_slot_winner_matches
  ADD COLUMN IF NOT EXISTS winner_email text;

-- 4) compute_chase_slot_winners: populate winner_email
CREATE OR REPLACE FUNCTION public.compute_chase_slot_winners(p_round_id uuid)
RETURNS SETOF public.chase_slot_winner_matches
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
    RAISE EXCEPTION 'Round % must be closed to compute winners', p_round_id;
  END IF;

  DELETE FROM public.chase_slot_winner_matches WHERE round_id = p_round_id;

  INSERT INTO public.chase_slot_winner_matches (
    round_id, slot_id, all_card_id, winner_user_id, winner_email, top_bid, pulled_card_id, matched
  )
  SELECT
    cs.round_id,
    cs.id AS slot_id,
    cs.all_card_id,
    cs.winner_user_id,
    u.email AS winner_email,
    csl.top_bid,
    pc.id AS pulled_card_id,
    (pc.id IS NOT NULL) AS matched
  FROM public.chase_slots cs
  LEFT JOIN public.chase_slot_leaders csl ON csl.slot_id = cs.id
  LEFT JOIN public.pulled_cards pc
    ON pc.round_id = cs.round_id
   AND pc.all_card_id = cs.all_card_id
  LEFT JOIN public.users u ON u.id = cs.winner_user_id
  WHERE cs.round_id = p_round_id
    AND cs.winner_user_id IS NOT NULL;

  RETURN QUERY
    SELECT * FROM public.chase_slot_winner_matches
    WHERE round_id = p_round_id;
END;
$$;
