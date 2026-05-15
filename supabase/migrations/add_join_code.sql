-- Migration: Add join_code column to sessions table
-- Date: 2025-01-15
-- Description: 参加コード（短い識別子）を追加して、URLをコピーせずに参加できるようにする

-- UUID拡張機能が有効になっていることを確認（既に存在する場合はエラーにならない）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- join_codeカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'join_code'
    ) THEN
        ALTER TABLE sessions ADD COLUMN join_code TEXT UNIQUE;
    END IF;
END $$;

-- join_codeインデックス（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON sessions(join_code);

-- コメント
COMMENT ON COLUMN sessions.join_code IS '参加コード（短い識別子、4-6文字の英数字）';
