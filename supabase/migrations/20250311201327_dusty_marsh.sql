/*
  # Update Transaction and Customer tables

  1. Changes
    - Drop existing tables and recreate with numeric IDs
    - Change customer_id from UUID to BIGINT
    - Add auto-incrementing IDs
    
  2. New Tables
    - customers
      - id (bigint, auto-incrementing)
      - name (text)
      - created_at (timestamp)
    - transactions
      - id (bigint, auto-incrementing)
      - customer_id (bigint, foreign key)
      - quantity (integer)
      - created_at (timestamp)

  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Drop existing tables
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS customers;

-- Create new customers table
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create new transactions table
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own customer data"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert customer data"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);