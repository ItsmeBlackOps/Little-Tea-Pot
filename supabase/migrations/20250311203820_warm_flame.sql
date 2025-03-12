/*
  # Add user tracking to transactions

  1. Changes
    - Add created_by column to transactions table to track which admin created the purchase
    - Add index for better query performance on created_by column
    - Add policies to handle created_by field for authenticated and public users

  2. Security
    - Ensure created_by can only be set to the authenticated user's email
    - Allow public users to create transactions with null created_by
*/

-- Add created_by column
ALTER TABLE transactions 
ADD COLUMN created_by text;

-- Add index for better query performance
CREATE INDEX idx_transactions_created_by ON transactions(created_by);

-- Update policy to force created_by to be set to current user's email
CREATE POLICY "Set created_by to current user"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow public inserts with null created_by (for non-authenticated purchases)
CREATE POLICY "Allow public inserts with null created_by"
  ON transactions
  FOR INSERT
  TO public
  WITH CHECK (created_by IS NULL);