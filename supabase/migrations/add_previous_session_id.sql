-- Migration: Add previous_session_id to sessions table
-- Purpose: Enable session relationships to prevent starting new sequential sessions
--          before previous session is published
-- Date: 2024

-- Add previous_session_id column (nullable, can reference another session)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS previous_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sessions_previous_session_id ON sessions(previous_session_id);

-- Add comment
COMMENT ON COLUMN sessions.previous_session_id IS '前のセッションID（逐次モードで前のセッションが完了するまで新規セッションを開始できないようにするため）';
