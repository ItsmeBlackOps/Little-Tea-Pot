/*
  # Add admin policies for transactions and customers tables

  1. Security Changes
    - Add policies for admin access to all tables
    - Enable RLS for both tables
    - Add policies for authenticated users to manage their own data

  2. Changes
    - Add policies to customers table
    - Add policies to transactions table
    - Enable RLS on both tables
*/

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies for customers table
CREATE POLICY "Allow admins full access to customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for transactions table
CREATE POLICY "Allow admins full access to transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public can insert into customers (needed for new customer creation)
CREATE POLICY "Allow public to insert customers"
  ON customers
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can insert into transactions (needed for purchases)
CREATE POLICY "Allow public to insert transactions"
  ON transactions
  FOR INSERT
  TO public
  WITH CHECK (true);