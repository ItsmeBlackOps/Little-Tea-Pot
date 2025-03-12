/*
  # Add role management to users table

  1. Changes
    - Add role column to users table
    - Add check constraint to validate roles
    - Update policies to handle role-based access
    - Add default role assignment in handle_new_user function

  2. Security
    - Enable RLS for role-based access control
    - Add policies for role-specific operations
*/

-- Add role column with check constraint
ALTER TABLE users
ADD COLUMN role text NOT NULL DEFAULT 'customer'
CHECK (role IN ('admin', 'inventory', 'customer'));

-- Create index for role column
CREATE INDEX idx_users_role ON users(role);

-- Update handle_new_user function to set default role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      (SELECT username FROM public.users WHERE email = new.email),
      split_part(new.email, '@', 1)
    ),
    'customer'  -- Default role for new users
  )
  ON CONFLICT (email) DO UPDATE
  SET id = EXCLUDED.id,
      username = EXCLUDED.username;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies for role-based access
CREATE POLICY "Inventory users can view all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'inventory'
    )
  );

CREATE POLICY "Inventory users can update transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'inventory'
    )
  );

-- Add policy for admins to manage roles
CREATE POLICY "Admins can update user roles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );