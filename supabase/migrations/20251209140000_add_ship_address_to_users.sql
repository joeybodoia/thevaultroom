-- Add shipping address to user profiles for fulfillment
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ship_address text;
