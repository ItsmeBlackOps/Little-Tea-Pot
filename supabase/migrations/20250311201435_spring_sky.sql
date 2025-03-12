/*
  # Update RLS policies for customers and transactions

  1. Changes
    - Drop existing policies
    - Create new policies with proper security rules
    - Enable public access for both tables
    
  2. Security Updates
    - Allow public access to customers and transactions tables
    - Maintain data integrity while allowing necessary operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own customer data" ON customers;
DROP POLICY IF EXISTS "Users can insert customer data" ON customers;
DROP POLICY IF EXISTS "Users can read transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;

-- Create new policies for customers table
CREATE POLICY "Enable read access for all users"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON customers FOR INSERT
  WITH CHECK (true);

-- Create new policies for transactions table
CREATE POLICY "Enable read access for all users"
  ON transactions FOR SELECT
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON transactions FOR INSERT
  WITH CHECK (true);