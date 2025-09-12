/*
  # Add Site Credits System

  1. New Columns
    - `users.site_credit` (numeric, default 0.00) - User's available site credits
  
  2. Functions
    - `handle_new_user_with_credits()` - Automatically grants $10 to first 100 users
  
  3. Triggers
    - Updates existing trigger to use new function with credit logic
  
  4. Security
    - RLS policies updated to handle credit operations
*/

-- Add site_credit column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'site_credit'
  ) THEN
    ALTER TABLE users ADD COLUMN site_credit NUMERIC(10, 2) DEFAULT 0.00;
  END IF;
END $$;

-- Create or replace the user creation function with credit logic
CREATE OR REPLACE FUNCTION handle_new_user_with_credits()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  initial_credit NUMERIC(10, 2) := 0.00;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM users;
  
  -- Grant $10 credit if user count is less than 100
  IF user_count < 100 THEN
    initial_credit := 10.00;
  END IF;
  
  -- Insert new user record with appropriate credit
  INSERT INTO public.users (id, email, username, site_credit)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    initial_credit
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, users.username),
    site_credit = COALESCE(users.site_credit, initial_credit);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger to use the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_with_credits();

-- Add RLS policy for users to update their own credit (for spending)
CREATE POLICY "Users can update own credit" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);