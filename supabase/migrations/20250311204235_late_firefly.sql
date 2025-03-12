/*
  # Add username field to users table

  1. Changes
    - Add username column to users table
    - Make username required and unique
    - Add index for better performance
    - Update existing policies
*/

-- Add username column to users table
ALTER TABLE users
ADD COLUMN username text NOT NULL DEFAULT '';

-- Add unique constraint
ALTER TABLE users
ADD CONSTRAINT users_username_key UNIQUE (username);

-- Add index for better performance
CREATE INDEX idx_users_username ON users(username);

-- Update handle_new_user function to set default username from email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    new.id,
    new.email,
    split_part(new.email, '@', 1)  -- Use part before @ as default username
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update transactions policies to use username
DROP POLICY IF EXISTS "Set created_by to current user" ON transactions;
CREATE POLICY "Set created_by to current user"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (
      SELECT username 
      FROM users 
      WHERE id = auth.uid()
    )
  );