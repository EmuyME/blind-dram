ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS results_ranking_image_url TEXT,
  ADD COLUMN IF NOT EXISTS results_ranking_image_updated_at TIMESTAMP WITH TIME ZONE;
