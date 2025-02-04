-- Supabase SQL for API Keys Table

CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id), -- Assuming you have a users table
  model_name VARCHAR(50) NOT NULL, -- e.g., 'deepseek', 'gemini', 'groq'
  api_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add Unique Constraint on user_id and model_name
ALTER TABLE api_keys
ADD CONSTRAINT unique_user_model UNIQUE (user_id, model_name);

-- You might want to add indexes for faster lookups, e.g., on user_id and model_name
CREATE INDEX api_keys_user_model_idx ON api_keys (user_id, model_name);

-- RLS (Row Level Security) policies for api_keys table (example - adjust as needed)
-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy for users to insert their own API keys
CREATE POLICY "Users can insert their own api keys" ON api_keys
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to select their own API keys
CREATE POLICY "Users can select their own api keys" ON api_keys
FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to update their own API keys
CREATE POLICY "Users can update their own api keys" ON api_keys
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own API keys
CREATE POLICY "Users can delete their own api keys" ON api_keys
FOR DELETE USING (auth.uid() = user_id);

-- Important:
-- 1. Replace 'users(id)' with your actual users table and id column if different.
-- 2. Consider encrypting the api_key column for enhanced security.
-- 3. Adjust RLS policies based on your application's specific security requirements.
-- 4. This SQL assumes you have enabled auth in Supabase and have a 'users' table.
