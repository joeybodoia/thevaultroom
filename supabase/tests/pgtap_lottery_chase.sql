BEGIN;
SET search_path TO extensions, public;

-- Ensure pgTAP is available
SELECT plan(10);

-- Auth users to satisfy FK into public.users
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-00000000ad01', 'admin@test.local')
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-00000000aa01', 'user@test.local')
ON CONFLICT (id) DO NOTHING;

-- Common fixtures
-- Admin and normal users (set auth to match RLS policies on insert)
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ad01', true);
INSERT INTO public.users (id, email, is_admin, site_credit)
VALUES ('00000000-0000-0000-0000-00000000ad01', 'admin@test.local', true, 0)
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
INSERT INTO public.users (id, email, is_admin, site_credit)
VALUES ('00000000-0000-0000-0000-00000000aa01', 'user@test.local', false, 0)
ON CONFLICT (id) DO NOTHING;

-- Streams needed for round/slot FKs
INSERT INTO public.streams (id, title, status)
VALUES
  ('00000000-0000-0000-0000-00000000s001', 'Test Stream 1', 'scheduled'),
  ('00000000-0000-0000-0000-00000000s002', 'Test Stream 2', 'scheduled'),
  ('00000000-0000-0000-0000-00000000s003', 'Test Stream 3', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Helper: set auth context
-- Non-admin context for rejection tests
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

----------------------------------------------------------------------------
-- compute_chase_slot_winners
----------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT public.compute_chase_slot_winners('00000000-0000-0000-0000-00000000c0a1') $$,
  '.*Not authorized.*',
  'compute_chase_slot_winners rejects non-admin'
);

-- Admin context
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ad01', true);

INSERT INTO public.rounds (id, bidding_status, set_name, stream_id, round_number)
VALUES
  ('00000000-0000-0000-0000-00000000c0b1', 'open', 'Set Alpha', '00000000-0000-0000-0000-00000000s001', 1),
  ('00000000-0000-0000-0000-00000000c0b2', 'closed', 'Set Alpha', '00000000-0000-0000-0000-00000000s001', 2)
ON CONFLICT (id) DO NOTHING;

SELECT throws_ok(
  $$ SELECT public.compute_chase_slot_winners('00000000-0000-0000-0000-00000000c0b1') $$,
  '.*must be closed.*',
  'compute_chase_slot_winners requires closed round'
);

-- Seed chase slots and related data for happy path
INSERT INTO public.all_cards (id, set_name, card_name, card_number, ungraded_market_price, live_singles)
VALUES
  ('00000000-0000-0000-0000-00000000card1', 'Set Alpha', 'Card One', '1', 50, false),
  ('00000000-0000-0000-0000-00000000card2', 'Set Alpha', 'Card Two', '2', 40, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chase_slots (id, round_id, all_card_id, winner_user_id, locked, stream_id, set_name)
VALUES
  ('00000000-0000-0000-0000-00000000slot1', '00000000-0000-0000-0000-00000000c0b2', '00000000-0000-0000-0000-00000000card1', '00000000-0000-0000-0000-00000000aa01', true, '00000000-0000-0000-0000-00000000s001', 'Set Alpha'),
  ('00000000-0000-0000-0000-00000000slot2', '00000000-0000-0000-0000-00000000c0b2', '00000000-0000-0000-0000-00000000card2', '00000000-0000-0000-0000-00000000aa01', true, '00000000-0000-0000-0000-00000000s001', 'Set Alpha')
ON CONFLICT (id) DO NOTHING;

-- Insert bids under the bidder's auth context to satisfy RLS
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
INSERT INTO public.chase_bids (id, slot_id, user_id, amount)
VALUES
  ('00000000-0000-0000-0000-00000000bid01', '00000000-0000-0000-0000-00000000slot1', '00000000-0000-0000-0000-00000000aa01', 75.00),
  ('00000000-0000-0000-0000-00000000bid02', '00000000-0000-0000-0000-00000000slot2', '00000000-0000-0000-0000-00000000aa01', 60.00)
ON CONFLICT (id) DO NOTHING;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ad01', true);

INSERT INTO public.pulled_cards (id, round_id, all_card_id, rarity, card_name, pack_number)
VALUES
  ('00000000-0000-0000-0000-00000000pull1', '00000000-0000-0000-0000-00000000c0b2', '00000000-0000-0000-0000-00000000card1', 'Gold', 'Card One', 1)
ON CONFLICT (id) DO NOTHING;

-- Pre-existing stale matches should be replaced
INSERT INTO public.chase_slot_winner_matches (round_id, slot_id, all_card_id, winner_user_id, top_bid, pulled_card_id, matched)
VALUES ('00000000-0000-0000-0000-00000000c0b2', '00000000-0000-0000-0000-00000000slot1', '00000000-0000-0000-0000-00000000card1', '00000000-0000-0000-0000-00000000aa01', 10, NULL, false)
ON CONFLICT DO NOTHING;

SELECT results_eq(
  $$
    SELECT slot_id, matched, pulled_card_id IS NOT NULL AS has_pulled, top_bid
    FROM public.compute_chase_slot_winners('00000000-0000-0000-0000-00000000c0b2')
    ORDER BY slot_id
  $$,
  $$
    VALUES
      ('00000000-0000-0000-0000-00000000slot1'::uuid, true,  true,  75.00::numeric),
      ('00000000-0000-0000-0000-00000000slot2'::uuid, false, false, 60.00::numeric)
  $$,
  'compute_chase_slot_winners populates matches and replaces stale rows'
);

SELECT is(
  (SELECT COUNT(*) FROM public.chase_slot_winner_matches WHERE round_id = '00000000-0000-0000-0000-00000000c0b2'),
  2::bigint,
  'chase_slot_winner_matches only has fresh rows for the round'
);

----------------------------------------------------------------------------
-- compute_lottery_prize_pool
----------------------------------------------------------------------------

-- Non-admin rejection
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT throws_ok(
  $$ SELECT public.compute_lottery_prize_pool('00000000-0000-0000-0000-00000000l0b1') $$,
  '.*Not authorized.*',
  'compute_lottery_prize_pool rejects non-admin'
);

-- Admin context
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ad01', true);

INSERT INTO public.rounds (id, bidding_status, set_name, stream_id, round_number)
VALUES ('00000000-0000-0000-0000-00000000l0b1', 'open', 'Set Beta', '00000000-0000-0000-0000-00000000s002', 1)
ON CONFLICT (id) DO NOTHING;

SELECT throws_ok(
  $$ SELECT public.compute_lottery_prize_pool('00000000-0000-0000-0000-00000000l0b1') $$,
  '.*must be closed.*',
  'compute_lottery_prize_pool requires closed round'
);

-- Closed round setup
UPDATE public.rounds
  SET bidding_status = 'closed'
WHERE id = '00000000-0000-0000-0000-00000000l0b1';

INSERT INTO public.pulled_cards (id, round_id, set_name, rarity, card_name, pack_number)
VALUES ('00000000-0000-0000-0000-00000000pull2', '00000000-0000-0000-0000-00000000l0b1', 'Set Beta', 'Gold', 'Beta Card', 1)
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
INSERT INTO public.lottery_entries (id, round_id, user_id, selected_rarity, pack_number, credits_used)
VALUES ('00000000-0000-0000-0000-00000000entry1', '00000000-0000-0000-0000-00000000l0b1', '00000000-0000-0000-0000-00000000aa01', 'Gold', 1, 5)
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ad01', true);
INSERT INTO public.lottery_entries (id, round_id, user_id, selected_rarity, pack_number, credits_used)
VALUES ('00000000-0000-0000-0000-00000000entry2', '00000000-0000-0000-0000-00000000l0b1', '00000000-0000-0000-0000-00000000ad01', 'Silver', 2, 5)
ON CONFLICT (id) DO NOTHING;

-- Stale pool row to ensure delete/replace
INSERT INTO public.lottery_prize_pool (round_id, user_id, email, selected_rarity)
VALUES ('00000000-0000-0000-0000-00000000l0b1', '00000000-0000-0000-0000-00000000aa01', 'old@test.local', 'Old')
ON CONFLICT DO NOTHING;

SELECT set_eq(
  $$
    SELECT user_id, email, selected_rarity, pack_number
    FROM public.compute_lottery_prize_pool('00000000-0000-0000-0000-00000000l0b1')
  $$,
  $$
    VALUES ('00000000-0000-0000-0000-00000000aa01'::uuid, 'user@test.local', 'Gold', 1)
  $$,
  'compute_lottery_prize_pool keeps only entries matching pulled rarities and carries pack_number'
);

----------------------------------------------------------------------------
-- order_lottery_prize_pool
----------------------------------------------------------------------------

-- Non-admin rejection
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000aa01', true);
SELECT throws_ok(
  $$ SELECT public.order_lottery_prize_pool('00000000-0000-0000-0000-00000000l0b2') $$,
  '.*Not authorized.*',
  'order_lottery_prize_pool rejects non-admin'
);

-- Admin context
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ad01', true);

INSERT INTO public.rounds (id, bidding_status, set_name, stream_id, round_number)
VALUES ('00000000-0000-0000-0000-00000000l0b2', 'closed', 'Set Gamma', '00000000-0000-0000-0000-00000000s003', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lottery_prize_pool (round_id, user_id, email, selected_rarity, pack_number)
VALUES
  ('00000000-0000-0000-0000-00000000l0b2', '00000000-0000-0000-0000-00000000aa01', 'user@test.local', 'Gold', 1),
  ('00000000-0000-0000-0000-00000000l0b2', '00000000-0000-0000-0000-00000000ad01', 'admin@test.local', 'Silver', 2)
ON CONFLICT DO NOTHING;

-- Stale ordered row to ensure wipe
INSERT INTO public.lottery_prize_pool_ordered (round_id, user_id, email, selected_rarity, seq)
VALUES ('00000000-0000-0000-0000-00000000l0b2', '00000000-0000-0000-0000-00000000aa01', 'stale@test.local', 'Stale', 99)
ON CONFLICT DO NOTHING;

SELECT set_eq(
  $$
    SELECT user_id, selected_rarity, pack_number
    FROM public.order_lottery_prize_pool('00000000-0000-0000-0000-00000000l0b2')
  $$,
  $$
    VALUES
      ('00000000-0000-0000-0000-00000000aa01'::uuid, 'Gold', 1),
      ('00000000-0000-0000-0000-00000000ad01'::uuid, 'Silver', 2)
  $$,
  'order_lottery_prize_pool retains exactly the pool members with pack_number'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.lottery_prize_pool_ordered
    WHERE round_id = '00000000-0000-0000-0000-00000000l0b2'
    GROUP BY round_id
    HAVING COUNT(*) = 2
       AND COUNT(DISTINCT seq) = 2
       AND bool_and(seq BETWEEN 1 AND 2)
  ),
  'ordered prize pool rows have unique seq values starting at 1'
);

SELECT * FROM finish();
ROLLBACK;
