-- Blind Dram Database Schema (Neon PostgreSQL 16)
-- Fresh install: run via `node scripts/apply-neon-schema.mjs`

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. sessions
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    owner_token TEXT NOT NULL UNIQUE,
    join_token TEXT NOT NULL UNIQUE,
    join_code TEXT UNIQUE,
    mode TEXT NOT NULL CHECK (mode IN ('sequential', 'simultaneous')),
    state TEXT NOT NULL DEFAULT 'created' CHECK (state IN ('created', 'registering', 'ordering', 'running', 'aggregating', 'published', 'closed')),
    flavor_chart_id UUID,
    flavor_chart_snapshot JSONB,
    cask_options_snapshot JSONB,
    region_options_snapshot JSONB,
    scoring_snapshot JSONB,
    public_results BOOLEAN NOT NULL DEFAULT true,
    results_ranking_image_url TEXT,
    results_ranking_image_updated_at TIMESTAMP WITH TIME ZONE,
    previous_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_owner_token ON sessions(owner_token);
CREATE INDEX idx_sessions_join_token ON sessions(join_token);
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_sessions_state ON sessions(state);
CREATE INDEX idx_sessions_previous_session_id ON sessions(previous_session_id);

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
-- 2. participants
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

CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_participants_participant_token ON participants(participant_token);

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
-- 3. samples
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

CREATE INDEX idx_samples_session_id ON samples(session_id);
CREATE INDEX idx_samples_presenter_participant_id ON samples(presenter_participant_id);
CREATE INDEX idx_samples_session_sort_order ON samples(session_id, sort_order);
CREATE INDEX idx_samples_state ON samples(state);

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
-- 4. truths
-- ============================================
CREATE TABLE truths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    presenter_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    true_cask TEXT,
    true_region TEXT,
    true_age TEXT,
    true_abv TEXT,
    true_distillery TEXT,
    true_bottler_name TEXT,
    true_distillation_year INTEGER,
    true_bottling_year INTEGER,
    true_other1 TEXT,
    true_other2 TEXT,
    notes TEXT,
    bottle_image_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_truth_session_sample UNIQUE (session_id, sample_id)
);

CREATE INDEX idx_truths_session_id ON truths(session_id);
CREATE INDEX idx_truths_sample_id ON truths(sample_id);
CREATE INDEX idx_truths_presenter_participant_id ON truths(presenter_participant_id);

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
-- 5. answers
-- ============================================
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    guessed_cask TEXT,
    guessed_region TEXT,
    guessed_age TEXT,
    guessed_abv TEXT,
    guessed_distillery TEXT,
    guessed_other1 TEXT,
    guessed_other2 TEXT,
    nose JSONB,
    palate JSONB,
    finish JSONB,
    bottle_image_url TEXT,
    score_0_100 INTEGER CHECK (score_0_100 IS NULL OR (score_0_100 >= 0 AND score_0_100 <= 100)),
    version INTEGER NOT NULL DEFAULT 1,
    submitted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_answer_session_sample_participant UNIQUE (session_id, sample_id, participant_id)
);

CREATE INDEX idx_answers_session_id ON answers(session_id);
CREATE INDEX idx_answers_sample_id ON answers(sample_id);
CREATE INDEX idx_answers_participant_id ON answers(participant_id);
CREATE INDEX idx_answers_status ON answers(status);
CREATE INDEX idx_answers_session_sample ON answers(session_id, sample_id);

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
-- 6. distillery_grades
-- ============================================
CREATE TABLE distillery_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    item_grades JSONB NOT NULL DEFAULT '{}'::jsonb,
    graded_by_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    graded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_grade_session_sample_participant UNIQUE (session_id, sample_id, participant_id)
);

CREATE INDEX idx_distillery_grades_session_id ON distillery_grades(session_id);
CREATE INDEX idx_distillery_grades_sample_id ON distillery_grades(sample_id);
CREATE INDEX idx_distillery_grades_participant_id ON distillery_grades(participant_id);
CREATE INDEX idx_distillery_grades_graded_by ON distillery_grades(graded_by_participant_id);
CREATE INDEX idx_distillery_grades_session_sample ON distillery_grades(session_id, sample_id);

-- ============================================
-- 7. aggregates
-- ============================================
CREATE TABLE aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aggregates_session_id ON aggregates(session_id);
CREATE INDEX idx_aggregates_version_label ON aggregates(version_label);

-- ============================================
-- 8. app_settings
-- ============================================
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_token TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'デフォルト設定',
    cask_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    region_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    flavor_chart JSONB NOT NULL,
    scoring JSONB NOT NULL DEFAULT '{"cask": 5, "region": 2, "age": 3, "abv": 3, "distillery": 5}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_app_settings_owner_name UNIQUE (owner_token, name)
);

CREATE INDEX idx_app_settings_owner_token ON app_settings(owner_token);
CREATE INDEX idx_app_settings_owner_name ON app_settings(owner_token, name);

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
-- 9. round_next_clicks
-- ============================================
CREATE TABLE round_next_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(sample_id, participant_id)
);

CREATE INDEX idx_round_next_clicks_sample_id ON round_next_clicks(sample_id);
CREATE INDEX idx_round_next_clicks_participant_id ON round_next_clicks(participant_id);
