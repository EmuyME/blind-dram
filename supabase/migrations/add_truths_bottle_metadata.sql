-- Presenter が入力するボトルメタ（ボトラーズ名・蒸留年・ボトリング年）
ALTER TABLE public.truths
  ADD COLUMN IF NOT EXISTS true_bottler_name TEXT,
  ADD COLUMN IF NOT EXISTS true_distillation_year INTEGER,
  ADD COLUMN IF NOT EXISTS true_bottling_year INTEGER;
