-- ============================================================================
-- 観客ジャッジ投票アプリ - Supabase スキーマ
-- 要件定義書 v1.0 7章「データモデル」に準拠
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください。
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- events（イベント）
-- ----------------------------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  venue text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- performers（出場プレイヤー）
-- ----------------------------------------------------------------------------
create table if not exists performers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  instagram_username text not null,
  photo_url text,
  affiliation text,
  created_at timestamptz not null default now()
);

create index if not exists idx_performers_event_id on performers(event_id);

-- ----------------------------------------------------------------------------
-- matches（対戦カード）
-- ----------------------------------------------------------------------------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  performer_a_id uuid not null references performers(id),
  performer_b_id uuid not null references performers(id),
  sort_order int not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'voting_open', 'voting_closed', 'finished')),
  results_public boolean not null default false,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_event_id on matches(event_id);
create index if not exists idx_matches_status on matches(status);

-- 同一イベント内で voting_open は常に1件のみ、をDBレベルでも保証する
create unique index if not exists one_open_match_per_event
  on matches(event_id)
  where (status = 'voting_open');

-- ----------------------------------------------------------------------------
-- votes（投票）… 同一端末×同一対戦の重複投票をDB一意制約で防止
-- ----------------------------------------------------------------------------
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  voter_token text not null,
  choice text not null check (choice in ('A', 'B')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, voter_token)
);

create index if not exists idx_votes_match_id on votes(match_id);

-- ----------------------------------------------------------------------------
-- follow_clicks（フォロータップ計測）
-- ----------------------------------------------------------------------------
create table if not exists follow_clicks (
  id uuid primary key default gen_random_uuid(),
  performer_id uuid not null references performers(id) on delete cascade,
  voter_token text,
  created_at timestamptz not null default now()
);

create index if not exists idx_follow_clicks_performer_id on follow_clicks(performer_id);

-- ============================================================================
-- Row Level Security
-- 来場者側は NEXT_PUBLIC_SUPABASE_ANON_KEY（anonロール）でRealtime購読のみ行う。
-- 実際の書き込み（投票・フォロータップ計測・出場者/対戦の管理）はすべて
-- サーバ側 API ルートが SUPABASE_SERVICE_ROLE_KEY で行うため、anon には
-- 参照(select)権限のみを付与し、insert/update/deleteは一切許可しない。
-- ============================================================================

alter table events enable row level security;
alter table performers enable row level security;
alter table matches enable row level security;
alter table votes enable row level security;
alter table follow_clicks enable row level security;

drop policy if exists "events_public_read" on events;
create policy "events_public_read" on events for select using (true);

drop policy if exists "performers_public_read" on performers;
create policy "performers_public_read" on performers for select using (true);

drop policy if exists "matches_public_read" on matches;
create policy "matches_public_read" on matches for select using (true);

-- votes / follow_clicks は anon からの select/insert を許可しない
-- (service_role キーはRLSを常にバイパスするため、API側の書き込みには影響しません)

-- ============================================================================
-- Realtime … matches テーブルの変更を来場者画面へ配信する
-- ============================================================================
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table votes;

-- ============================================================================
-- 初期データ（ダミー）… 運営が管理画面から出場者・対戦カードを登録する前提
-- ============================================================================
insert into events (name, event_date, venue)
select '2on2 ヘッドバトル／アンダー18 フリースタイルバトル', current_date, '会場未定'
where not exists (select 1 from events);
