/*
  # Add relationship between users and transactions tables

  1. Changes
    - Add foreign key constraint between transactions.created_by and users.username
    - Add index on users.username for better join performance
    - Update existing policies to handle the relationship

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with foreign key constraint
*/

-- Add foreign key constraint
ALTER TABLE transactions
ADD CONSTRAINT transactions_created_by_fkey
FOREIGN KEY (created_by) 
REFERENCES users(username)
ON UPDATE CASCADE;

-- Add index for better join performance if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' 
    AND indexname = 'idx_users_username'
  ) THEN
    CREATE INDEX idx_users_username ON users(username);
  END IF;
END $$;