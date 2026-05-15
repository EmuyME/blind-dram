-- 結果ページ・CSV を「参加URLを知っている全員」か「オーナートークン保持者のみ」に制限する
-- true（デフォルト）: 従来どおり published なら join_token だけで閲覧可
-- false: published でも owner_token をクエリに付けたリクエストのみ可（API 側で検証）

alter table sessions
  add column if not exists public_results boolean not null default true;

comment on column sessions.public_results is 'If false, /api/results/get and /api/export/csv require matching owner_token when state=published';
