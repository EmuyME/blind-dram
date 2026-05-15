-- Migration: Add round_next_clicks table for sequential mode
-- Date: 2025-01-15
-- Description: 逐次モードでラウンド終了時に「次へ」ボタンをクリックした参加者を記録するテーブルを追加

-- UUID拡張機能が有効になっていることを確認（既に存在する場合はエラーにならない）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- round_next_clicks テーブル（逐次モード用）
-- ============================================
-- テーブルが既に存在する場合はスキップ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'round_next_clicks'
    ) THEN
        CREATE TABLE round_next_clicks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
            participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            UNIQUE(sample_id, participant_id)
        );
    END IF;
END $$;

-- round_next_clicks インデックス
-- インデックスが既に存在する場合はスキップ
CREATE INDEX IF NOT EXISTS idx_round_next_clicks_sample_id ON round_next_clicks(sample_id);
CREATE INDEX IF NOT EXISTS idx_round_next_clicks_participant_id ON round_next_clicks(participant_id);

-- コメント（既に存在する場合は更新）
COMMENT ON TABLE round_next_clicks IS '逐次モードでラウンド終了時に「次へ」ボタンをクリックした参加者を記録';
