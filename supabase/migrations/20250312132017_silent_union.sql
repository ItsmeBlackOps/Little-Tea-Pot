/*
  # Update transaction constraints and policies

  1. Changes
    - Modify quantity check constraint to allow negative values
    - Update transaction policies to maintain data integrity
    
  2. Security
    - Maintain existing RLS policies
    - Ensure data validation
*/

-- Drop the existing check constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_quantity_check;

-- Add new check constraint that allows negative values but not zero
ALTER TABLE transactions 
ADD CONSTRAINT transactions_quantity_check 
CHECK (quantity != 0);