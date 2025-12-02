-- Enforce unique usernames (case-insensitive, ignoring NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
  ON public.users (lower(username))
  WHERE username IS NOT NULL;
