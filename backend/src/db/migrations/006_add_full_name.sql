-- Add full_name column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Add index for name lookups (optional but useful for admin searches)
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);
