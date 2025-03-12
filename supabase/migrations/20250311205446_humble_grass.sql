/*
  # Remove email column from users table

  1. Changes
    - Remove email column and related constraints
    - Update handle_new_user function to not use email
    - Remove email-related triggers and functions

  2. Security
    - Maintain existing RLS policies
    - Keep user authentication intact
*/

-- Drop email-related constraints and indexes first
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_email_fkey;

DROP INDEX IF EXISTS idx_users_email;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_email_key;

-- Remove email column
ALTER TABLE users
DROP COLUMN email;

-- Update handle_new_user function to not use email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, role)
  VALUES (
    new.id,
    COALESCE(
      (SELECT username FROM public.users WHERE id = new.id),
      split_part(new.email, '@', 1)
    ),
    'customer'  -- Default role for new users
  )
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop email sync function and trigger as they're no longer needed
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
DROP FUNCTION IF EXISTS sync_user_email();