-- 採点拡張: その他項目の回答・正解、項目別手採点 JSON
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS guessed_other1 TEXT,
  ADD COLUMN IF NOT EXISTS guessed_other2 TEXT,
  ADD COLUMN IF NOT EXISTS bottle_image_url TEXT;

ALTER TABLE public.truths
  ADD COLUMN IF NOT EXISTS true_other1 TEXT,
  ADD COLUMN IF NOT EXISTS true_other2 TEXT;

ALTER TABLE public.distillery_grades
  ADD COLUMN IF NOT EXISTS item_grades JSONB NOT NULL DEFAULT '{}'::jsonb;
