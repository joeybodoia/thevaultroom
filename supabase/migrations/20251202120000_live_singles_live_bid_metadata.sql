-- Expand live_singles bidding metadata to carry stream + card context and bidder email

-- Add columns to capture bidder email, stream, and card name on each bid
ALTER TABLE public.live_singles_bids
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS stream_id uuid,
  ADD COLUMN IF NOT EXISTS card_name text;

-- Backfill new columns from source tables for existing bids
UPDATE public.live_singles_bids b
SET
  email = u.email,
  stream_id = ls.stream_id,
  card_name = ls.card_name
FROM public.users u, public.live_singles ls
WHERE b.user_id = u.id
  AND ls.id = b.card_id
  AND (b.email IS DISTINCT FROM u.email
    OR b.stream_id IS DISTINCT FROM ls.stream_id
    OR b.card_name IS DISTINCT FROM ls.card_name);

-- Rebuild leaders view to expose new metadata alongside the top bid
CREATE OR REPLACE VIEW public.live_singles_leaders AS
SELECT DISTINCT ON (b.card_id)
  b.card_id,
  b.stream_id,
  b.card_name,
  b.user_id,
  b.email,
  b.amount AS top_bid,
  b.created_at
FROM public.live_singles_bids b
ORDER BY b.card_id, b.amount DESC, b.created_at ASC;

-- Update bidding RPC to populate new columns on write
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
  v_user_email text;
  v_user_site_credit numeric;
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

  SELECT email, site_credit
  INTO v_user_email, v_user_site_credit
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_user_site_credit < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits for this bid';
  END IF;

  IF v_prev IS NOT NULL THEN
    PERFORM 1 FROM public.users WHERE id = v_prev.user_id FOR UPDATE;
    UPDATE public.users SET site_credit = site_credit + v_prev.amount
    WHERE id = v_prev.user_id;
  END IF;

  UPDATE public.users SET site_credit = site_credit - p_amount
  WHERE id = p_user_id;

  INSERT INTO public.live_singles_bids (
    card_id,
    user_id,
    amount,
    email,
    stream_id,
    card_name
  )
  VALUES (
    p_card_id,
    p_user_id,
    p_amount,
    v_user_email,
    v_card.stream_id,
    v_card.card_name
  )
  RETURNING id INTO v_bid_id;

  RETURN v_bid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
