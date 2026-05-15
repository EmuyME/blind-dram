-- Blind Dram MVP Database Schema
-- PostgreSQL (Supabase)
-- Version: 1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. sessions テーブル
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    owner_token TEXT NOT NULL UNIQUE,
    join_token TEXT NOT NULL UNIQUE,
    mode TEXT NOT NULL CHECK (mode IN ('sequential', 'simultaneous')),
    state TEXT NOT NULL DEFAULT 'created' CHECK (state IN ('created', 'registering', 'ordering', 'running', 'aggregating', 'published', 'closed')),
    flavor_chart_id UUID,
    flavor_chart_snapshot JSONB,
    cask_options_snapshot JSONB,
    region_options_snapshot JSONB,
    scoring_snapshot JSONB,
    previous_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- sessions インデックス
CREATE INDEX idx_sessions_owner_token ON sessions(owner_token);
CREATE INDEX idx_sessions_join_token ON sessions(join_token);
CREATE INDEX idx_sessions_state ON sessions(state);
CREATE INDEX idx_sessions_previous_session_id ON sessions(previous_session_id);

-- sessions updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sessions_updated_at();

-- ============================================
-- 2. participants テーブル
-- ============================================
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    is_attending BOOLEAN NOT NULL DEFAULT true,
    brought_count INTEGER NOT NULL DEFAULT 0 CHECK (brought_count >= 0),
    participant_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- participants インデックス
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_participants_participant_token ON participants(participant_token);

-- participants updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_participants_updated_at();

-- ============================================
-- 3. samples テーブル
-- ============================================
CREATE TABLE samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    presenter_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'answering', 'grading', 'revealed', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- samples インデックス
CREATE INDEX idx_samples_session_id ON samples(session_id);
CREATE INDEX idx_samples_presenter_participant_id ON samples(presenter_participant_id);
CREATE INDEX idx_samples_session_sort_order ON samples(session_id, sort_order);
CREATE INDEX idx_samples_state ON samples(state);

-- samples updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_samples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_samples_updated_at
    BEFORE UPDATE ON samples
    FOR EACH ROW
    EXECUTE FUNCTION update_samples_updated_at();

-- ============================================
-- 4. truths テーブル
-- ============================================
CREATE TABLE truths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    presenter_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    true_cask TEXT,
    true_region TEXT,
    true_age INTEGER,
    true_abv NUMERIC(5, 2),
    true_distillery TEXT,
    notes TEXT,
    bottle_image_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- UNIQUE制約: (session_id, sample_id)
    CONSTRAINT unique_truth_session_sample UNIQUE (session_id, sample_id)
);

-- truths インデックス
CREATE INDEX idx_truths_session_id ON truths(session_id);
CREATE INDEX idx_truths_sample_id ON truths(sample_id);
CREATE INDEX idx_truths_presenter_participant_id ON truths(presenter_participant_id);

-- truths updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_truths_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_truths_updated_at
    BEFORE UPDATE ON truths
    FOR EACH ROW
    EXECUTE FUNCTION update_truths_updated_at();

-- ============================================
-- 5. answers テーブル
-- ============================================
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    guessed_cask TEXT,
    guessed_region TEXT,
    guessed_age INTEGER,
    guessed_abv NUMERIC(5, 2),
    guessed_distillery TEXT,
    nose JSONB,
    palate JSONB,
    finish JSONB,
    score_0_100 INTEGER CHECK (score_0_100 IS NULL OR (score_0_100 >= 0 AND score_0_100 <= 100)),
    version INTEGER NOT NULL DEFAULT 1,
    submitted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- UNIQUE制約: (session_id, sample_id, participant_id)
    CONSTRAINT unique_answer_session_sample_participant UNIQUE (session_id, sample_id, participant_id)
);

-- answers インデックス
CREATE INDEX idx_answers_session_id ON answers(session_id);
CREATE INDEX idx_answers_sample_id ON answers(sample_id);
CREATE INDEX idx_answers_participant_id ON answers(participant_id);
CREATE INDEX idx_answers_status ON answers(status);
CREATE INDEX idx_answers_session_sample ON answers(session_id, sample_id);

-- answers updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_answers_updated_at
    BEFORE UPDATE ON answers
    FOR EACH ROW
    EXECUTE FUNCTION update_answers_updated_at();

-- ============================================
-- 6. distillery_grades テーブル
-- ============================================
CREATE TABLE distillery_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    graded_by_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    graded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- UNIQUE制約: (session_id, sample_id, participant_id)
    CONSTRAINT unique_grade_session_sample_participant UNIQUE (session_id, sample_id, participant_id)
);

-- distillery_grades インデックス
CREATE INDEX idx_distillery_grades_session_id ON distillery_grades(session_id);
CREATE INDEX idx_distillery_grades_sample_id ON distillery_grades(sample_id);
CREATE INDEX idx_distillery_grades_participant_id ON distillery_grades(participant_id);
CREATE INDEX idx_distillery_grades_graded_by ON distillery_grades(graded_by_participant_id);
CREATE INDEX idx_distillery_grades_session_sample ON distillery_grades(session_id, sample_id);

-- ============================================
-- 7. aggregates テーブル
-- ============================================
CREATE TABLE aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- aggregates インデックス
CREATE INDEX idx_aggregates_session_id ON aggregates(session_id);
CREATE INDEX idx_aggregates_version_label ON aggregates(version_label);

-- ============================================
-- 8. app_settings テーブル
-- ============================================
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_token TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'デフォルト設定',
    cask_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    region_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    flavor_chart JSONB NOT NULL,
    scoring JSONB NOT NULL DEFAULT '{"cask": 3, "region": 3, "age": 3, "abv": 3, "distillery": 6}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- UNIQUE制約: (owner_token, name) - 同じオーナー内で同じ名前の設定は1つまで
    CONSTRAINT unique_app_settings_owner_name UNIQUE (owner_token, name)
);

-- app_settings インデックス
CREATE INDEX idx_app_settings_owner_token ON app_settings(owner_token);
CREATE INDEX idx_app_settings_owner_name ON app_settings(owner_token, name);

-- app_settings updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_updated_at();

-- ============================================
-- コメント（テーブル説明）
-- ============================================
COMMENT ON TABLE sessions IS 'イベント（Session）情報。状態管理とフレーバーチャートスナップショットを保持';
COMMENT ON TABLE participants IS '参加者情報。participant_tokenで認証';
COMMENT ON TABLE samples IS 'テイスティング対象のボトル（Sample）。順番と状態を管理';
COMMENT ON TABLE truths IS '正解（Truth）情報。Presenterが入力。session_idとsample_idで一意';
COMMENT ON TABLE answers IS '参加者の回答。session_id、sample_id、participant_idで一意。upsert対応';
COMMENT ON TABLE distillery_grades IS '蒸留所名の採点結果。session_id、sample_id、participant_idで一意';
COMMENT ON TABLE aggregates IS '集計結果のスナップショット。将来の拡張用';
COMMENT ON TABLE app_settings IS 'アプリケーション設定テンプレート（Ownerごと、名前付き）。カスク選択肢、地域選択肢、フレーバーチャート、配点を保存';

-- ============================================
-- コメント（カラム説明）
-- ============================================
COMMENT ON COLUMN sessions.mode IS '回答モード: sequential（逐次公開）または simultaneous（一斉公開）';
COMMENT ON COLUMN sessions.state IS 'Session状態: created → registering → ordering → running → aggregating → published → closed';
COMMENT ON COLUMN sessions.flavor_chart_snapshot IS 'セッション開始時に保存されたフレーバーチャートのスナップショット（JSONB）';
COMMENT ON COLUMN sessions.cask_options_snapshot IS 'セッション開始時に保存されたカスク選択肢のスナップショット（JSONB）';
COMMENT ON COLUMN sessions.region_options_snapshot IS 'セッション開始時に保存された地域選択肢のスナップショット（JSONB）';
COMMENT ON COLUMN sessions.scoring_snapshot IS 'セッション開始時に保存された配点設定のスナップショット（JSONB）: {cask: number, region: number, age: number, abv: number, distillery: number}';
COMMENT ON COLUMN samples.state IS 'Round状態: pending → answering → grading → revealed/closed';
COMMENT ON COLUMN answers.nose IS 'Noseのフレーバー情報（JSONB）: {tier1_tags: string[], tier2_terms: string[], text: string | null}';
COMMENT ON COLUMN answers.palate IS 'Palateのフレーバー情報（JSONB）: {tier1_tags: string[], tier2_terms: string[], text: string | null}';
COMMENT ON COLUMN answers.finish IS 'Finishのフレーバー情報（JSONB）: {tier1_tags: string[], tier2_terms: string[], text: string | null}';
COMMENT ON COLUMN answers.version IS '回答の更新回数（訂正対応）';
COMMENT ON COLUMN distillery_grades.is_correct IS '蒸留所名が正解かどうか（true=6点、false=0点）';
COMMENT ON COLUMN app_settings.name IS '設定テンプレート名（Ownerごとに一意）';
COMMENT ON COLUMN app_settings.cask_options IS 'カスクタイプの選択肢（JSONB配列）: ["シェリー樽", "バーボン樽", ...]';
COMMENT ON COLUMN app_settings.region_options IS '地域の選択肢（JSONB配列）: ["スコットランド", "アイルランド", ...]';
COMMENT ON COLUMN app_settings.flavor_chart IS 'フレーバーチャート設定（JSONB）: {version: string, tier1: string[], tier2_suggestions: {[tier1]: string[]}}';

-- ============================================
-- 11. round_next_clicks テーブル（逐次モード用）
-- ============================================
CREATE TABLE round_next_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(sample_id, participant_id)
);

-- round_next_clicks インデックス
CREATE INDEX idx_round_next_clicks_sample_id ON round_next_clicks(sample_id);
CREATE INDEX idx_round_next_clicks_participant_id ON round_next_clicks(participant_id);

COMMENT ON TABLE round_next_clicks IS '逐次モードでラウンド終了時に「次へ」ボタンをクリックした参加者を記録';
COMMENT ON COLUMN app_settings.scoring IS '配点設定（JSONB）: {cask: number, region: number, age: number, abv: number, distillery: number}';