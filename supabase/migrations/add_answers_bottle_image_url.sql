-- answers にボトル画像URL列（API・フロントが参照。truths と別に保持する場合用）
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS bottle_image_url TEXT;
