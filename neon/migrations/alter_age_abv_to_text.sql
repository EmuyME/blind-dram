-- 選択式（例: 50.0-54.9）を保存できるよう age/abv を TEXT に変更
ALTER TABLE answers
  ALTER COLUMN guessed_age TYPE TEXT USING guessed_age::text,
  ALTER COLUMN guessed_abv TYPE TEXT USING guessed_abv::text;

ALTER TABLE truths
  ALTER COLUMN true_age TYPE TEXT USING true_age::text,
  ALTER COLUMN true_abv TYPE TEXT USING true_abv::text;
