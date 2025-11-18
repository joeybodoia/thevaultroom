# 🎴 Pokémon Live Breaks Platform  
A real-time interactive bidding and lottery system designed for live-streamed Pokémon TCG events.

---

## 📌 Overview

This application powers a live interactive Pokémon card break stream where users can participate in multiple auction formats using platform credits. All financial operations—including bidding, refunds, buyouts, and lottery entries—are controlled through Supabase stored procedures to guarantee fairness and prevent client manipulation.

The platform supports three participation modes:

| Mode | Description |
|------|-------------|
| **Chase Slots** | Users bid credits on high-value chase cards per set. The highest bidder wins the right to that card if it's pulled during the stream. Outbid users receive automatic refunds. |
| **Lottery System** | Users pay a fixed credit cost to enter a prize pool tied to a specific rarity in a specific pack number. If that rarity appears when the pack is opened, one winner is randomly chosen to receive the pack contents. |
| **Live Singles Auction** | Users bid on individual cards from an inventory pool. Bidding remains open until the end of Round 3. Highest bidder wins the card. Auto-refund logic applies. |

All user participation relies on a **virtual credit system** stored in the database.

---

## 🏗 Tech Stack

| Component | Technology |
|----------|------------|
| Frontend Framework | React + TypeScript |
| Styling | TailwindCSS |
| Backend / DB | Supabase (Postgres) |
| Authentication | Supabase Auth |
| Realtime Bidding | Supabase Realtime |
| Pricing Updates | Python Selenium Scraper (TCGPlayer) |

---

## 📂 Database Structure

The platform's core logic revolves around auction lifecycle, inventory persistence, and credit accounting. The schema is organized into functional domains:

```
AUTH + ACCOUNTS
│
└── users ── stores credit + admin access
│
▼

CARD METADATA & PRICING
│
├── all_cards ← master list of every card used anywhere in system
│
└── live_singles_inventory ← persistent stock of resale cards

STREAM-BOUND CONTENT
│
├── streams ← top-level container for a live show
│ └── rounds ← each stream is divided into sequential rounds

BIDDING + ENTRY STRUCTURES
│
├── chase_slots ── items available for bidding tied to stream/set
│ └── chase_bids ── incremental bidding history

├── live_singles ── cloned copies of inventory cards available in a specific stream
│ └── live_singles_bids ── bidding activity for singles

└── lottery_entries ── entries per rarity + pack
└── lottery_winners ── assigned when card rarity threshold is hit
```

---

## 📑 Key Tables

### 🧍 `users`

Stores credits and administrative permissions.

```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  site_credit numeric(12,2) DEFAULT 0 CHECK (site_credit >= 0),
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### 🧍 `all_cards (Master Card Registry)`

Contains metadata + pricing for every supported card. This table is updated via a scraping script.

```sql
CREATE TABLE public.all_cards (
  id bigserial PRIMARY KEY,
  card_name text NOT NULL,
  set_name text NOT NULL,
  card_number text NOT NULL,
  rarity text,
  image_url text,
  ungraded_market_price numeric,
  psa_10_price numeric,
  live_singles boolean DEFAULT false,
  date_updated timestamptz,
  UNIQUE (set_name, card_number, card_name)
);
```

### 🧍 `chase_slots (Auction Slots Per Stream)`

Each row represents one chase card available for bidding during a specific stream and set.

```sql
CREATE TABLE public.chase_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.streams(id),
  set_name text NOT NULL,
  all_card_id bigint REFERENCES public.all_cards(id),
  starting_bid numeric DEFAULT 1,
  min_increment numeric DEFAULT 1,
  is_active boolean DEFAULT true,
  locked boolean DEFAULT false,
  winner_user_id uuid,
  winning_bid_id uuid
);
```

Associated bids for chase_slots:

```sql
CREATE TABLE public.chase_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid REFERENCES public.chase_slots(id),
  user_id uuid REFERENCES public.users(id),
  amount numeric NOT NULL CHECK(amount > 0),
  created_at timestamptz DEFAULT now()
);
```

### 🧍 `live_singles_inventory (Persistent Stock)`

This is the master inventory list for live singles. It can spawn live auction items for future streams.

```sql
CREATE TABLE public.live_singles_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  all_card_id bigint REFERENCES public.all_cards(id),
  card_name text NOT NULL,
  card_number text,
  set_name text,
  image_url text,
  default_starting_bid numeric DEFAULT 1,
  default_min_increment numeric DEFAULT 1,
  default_buy_now numeric,
  quantity_available integer NOT NULL DEFAULT 1,
  quantity_sold integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### 🧍 `live_singles (Stream-Specific Auction Items)`

Generated via RPC `create_live_singles_for_stream`.
```sql
CREATE TABLE public.live_singles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.streams(id),
  inventory_id uuid REFERENCES public.live_singles_inventory(id),
  card_name text NOT NULL,
  card_number text,
  set_name text,
  image_url text,
  starting_bid numeric DEFAULT 1,
  min_increment numeric DEFAULT 1,
  buy_now numeric,
  ungraded_market_price numeric,
  psa_10_price numeric,
  card_condition text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'open' CHECK (status IN ('open','sold','cancelled'))
);
```

### 🧍 `streams` + `rounds`

`streams` are the top-level live shows, and `rounds` slice each stream by set/phase so the app can track pack counts and race conditions around locking.

```sql
CREATE TABLE public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scheduled_date timestamptz,
  singles_close_at timestamptz,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended')),
  is_current boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE,
  set_name text NOT NULL,
  round_number int NOT NULL CHECK (round_number BETWEEN 1 AND 3),
  total_packs_planned int,
  packs_opened int DEFAULT 10,
  locked boolean DEFAULT false,
  chase_min_ungraded_price int,
  created_at timestamptz DEFAULT now(),
  UNIQUE (stream_id, set_name, round_number)
);
```

### 🧍 `lottery_entries` + `lottery_winners`

Lottery entries are unique per user/round/pack number and store the rarity the entrant selected. Winners are posted once a rarity hits.

```sql
CREATE TABLE public.lottery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  selected_rarity text NOT NULL,
  pack_number int NOT NULL,
  credits_used smallint,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, round_id, pack_number)
);

CREATE TABLE public.lottery_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  lottery_entry_id uuid REFERENCES public.lottery_entries(id) ON DELETE CASCADE,
  winner_position int CHECK (winner_position IN (1, 2)),
  assigned_packs int[],
  created_at timestamptz DEFAULT now(),
  UNIQUE (round_id, winner_position)
);
```

### 🧍 `live_singles_bids` + views

Live singles bids mirror the chase bid structure, and leader views power the real-time UI.

```sql
CREATE TABLE public.live_singles_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES public.live_singles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE VIEW public.live_singles_leaders AS
SELECT card_id, MAX(amount) AS top_bid
FROM public.live_singles_bids
GROUP BY card_id;
```

> `chase_slot_leaders` follows the same pattern for `chase_bids`.


## RPC Stored Procedures
| RPC NAME | PURPOSE |
|------|-------------|
| **place_chase_bid_immediate_refund** | Handles chase bidding and outbid refunds atomically |
| **place_live_single_bid_immediate_refund** | Same logic for live singles |
| **enter_lottery_with_debit** | Deducts credits and places a lottery entry |
| **create_live_singles_for_stream** | Copies active inventory into stream-level live_singles table |

All operations modifying credit must use these procedures.

## Frontend Component Model
| COMPONENT | ROLE |
|------|-------------|
| **StreamCountdown.tsx** | Detects and broadcasts current active stream |
| **PokemonSection.tsx** | Main controller for display + bidding mode switching |
| **PokemonCard.tsx** | Single card bid widget with RPC integration |
| **AdminPortal.tsx** | Inventory + stream builder |
| **StreamDashboard.tsx** | Stream overlay view (future: OBS integration) |

## Data Integrity Rules
| RULE | ENFORCEMENT LEVEL |
|------|-------------|
| **Credits cannot go negative** | DB-level constraint |
| **No direct manipulation of credits** | RPC-only mutation |
| **Duplicate card identity prevented** | Unique index |
| **All bidding is atomic and reversible** | Transactional stored procedures |
| **Stream-level copies of inventory ensure history integrity** | live_singles cloning |


## Platform Guarantees
This platform creates a controlled, fair, real-time bidding environment for live Pokémon card breaks. All logic critical to fairness (credits, bidding, refunds, inventory assignment, and lottery logic) is handled server-side, ensuring game integrity even against malicious clients.
