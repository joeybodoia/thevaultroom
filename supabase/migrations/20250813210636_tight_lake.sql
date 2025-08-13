/*
  # Add streaming and bidding tables

  1. New Tables
    - `streams` - One per live stream session with title and scheduled date
    - `rounds` - Each stream has 3 rounds (one per set) with pack counts and lock status
    - `round_high_value_cards` - Many-to-many mapping between rounds and high-value cards
    - `users` - User management linked to Supabase auth
    - `direct_bids` - User bids on specific high-value cards per round
    - `lottery_entries` - User lottery entries with rarity selection per round
    - `lottery_winners` - Winners selected from lottery entries with pack assignments

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading public stream/round data

  3. Constraints
    - Unique constraints to prevent duplicate bids and entries
    - Check constraints for valid round numbers and winner positions
    - Foreign key relationships to maintain data integrity
*/

-- 1. Streams (1 per live stream session)
CREATE TABLE IF NOT EXISTS streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scheduled_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. Rounds (Each stream has 3 rounds — 1 per set)
CREATE TABLE IF NOT EXISTS rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES streams(id) ON DELETE CASCADE,
  set_name text NOT NULL,
  round_number int NOT NULL CHECK (round_number BETWEEN 1 AND 3),
  packs_opened int NOT NULL DEFAULT 10,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Round ↔ High-Value Card mapping (Many-to-many)
CREATE TABLE IF NOT EXISTS round_high_value_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE,
  card_id bigint REFERENCES direct_bid_cards(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, card_id)
);

-- 4. Users (linked to Supabase auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  email text,
  join_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- 5. Direct Bids (1 per user per high-value card per round)
CREATE TABLE IF NOT EXISTS direct_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE,
  card_id bigint REFERENCES direct_bid_cards(id) ON DELETE CASCADE,
  bid_amount numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, round_id, card_id)
);

-- 6. Lottery Entries
CREATE TABLE IF NOT EXISTS lottery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE,
  selected_rarity text NOT NULL,
  payment_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, round_id)
);

-- 7. Lottery Winners
CREATE TABLE IF NOT EXISTS lottery_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE,
  lottery_entry_id uuid REFERENCES lottery_entries(id) ON DELETE CASCADE,
  winner_position int CHECK (winner_position IN (1, 2)),
  assigned_packs int[],
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, winner_position)
);

-- Enable Row Level Security on all tables
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_high_value_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for streams (public read access)
CREATE POLICY "Anyone can read streams"
  ON streams
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for rounds (public read access)
CREATE POLICY "Anyone can read rounds"
  ON rounds
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for round_high_value_cards (public read access)
CREATE POLICY "Anyone can read round high value cards"
  ON round_high_value_cards
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for users (users can read/update their own data)
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for direct_bids (users can manage their own bids, everyone can read)
CREATE POLICY "Anyone can read direct bids"
  ON direct_bids
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own bids"
  ON direct_bids
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bids"
  ON direct_bids
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for lottery_entries (users can manage their own entries, everyone can read)
CREATE POLICY "Anyone can read lottery entries"
  ON lottery_entries
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own lottery entries"
  ON lottery_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lottery entries"
  ON lottery_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for lottery_winners (public read access)
CREATE POLICY "Anyone can read lottery winners"
  ON lottery_winners
  FOR SELECT
  TO public
  USING (true);