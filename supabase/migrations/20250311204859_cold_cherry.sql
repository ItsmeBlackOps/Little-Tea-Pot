/*
  # Fix email foreign key constraint

  1. Changes
    - Add unique constraint on auth.users.email
    - Add foreign key from users.email to auth.users.email
    - Update trigger functions to maintain data consistency
*/

-- First ensure auth.users.email has a unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key' 
    AND conrelid = 'auth.users'::regclass
  ) THEN
    ALTER TABLE auth.users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- Now we can safely add the foreign key
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_email_fkey;

ALTER TABLE public.users
ADD CONSTRAINT users_email_fkey 
FOREIGN KEY (email) 
REFERENCES auth.users(email)
ON UPDATE CASCADE;

-- Update handle_new_user function to handle email changes
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      (SELECT username FROM public.users WHERE email = new.email),
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (email) DO UPDATE
  SET id = EXCLUDED.id,
      username = EXCLUDED.username;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync email changes
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.email <> OLD.email THEN
    UPDATE public.users
    SET email = NEW.email
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;

-- Create new trigger for email sync
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_user_email();