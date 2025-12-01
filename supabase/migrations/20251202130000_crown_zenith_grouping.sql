-- Align Crown Zenith (base + Galarian Gallery) under a single round set for chase slot generation

CREATE OR REPLACE FUNCTION public.generate_chase_slots_for_round(p_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_round public.rounds%ROWTYPE;
  v_is_admin boolean;
  v_set_names text[];
BEGIN
  SELECT * INTO v_round FROM public.rounds WHERE id = p_round_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id;
  END IF;

  IF v_round.stream_id IS NULL THEN
    RAISE EXCEPTION 'Round % is not attached to a stream', p_round_id;
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM public.users
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Crown Zenith rounds should pull cards from both base and Galarian Gallery
  IF v_round.set_name = 'Crown Zenith' THEN
    v_set_names := ARRAY['Crown Zenith', 'Crown Zenith: Galarian Gallery'];
  ELSE
    v_set_names := ARRAY[v_round.set_name];
  END IF;

  INSERT INTO public.chase_slots (round_id, stream_id, set_name, all_card_id, locked)
  SELECT
    v_round.id,
    v_round.stream_id,
    v_round.set_name,
    ac.id,
    TRUE
  FROM public.all_cards ac
  WHERE ac.set_name = ANY (v_set_names)
    AND ac.ungraded_market_price >= COALESCE(v_round.chase_min_ungraded_price, 0)
    AND COALESCE(ac.live_singles, false) = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.chase_slots cs
      WHERE cs.round_id = v_round.id AND cs.all_card_id = ac.id
    );
END;
$$;
