-- デッキ保存用テーブル
-- cards は { "カードID": 枚数 } の形の JSON。例: {"r001": 4, "r002": 3}

create table if not exists public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  cards       jsonb not null default '{}'::jsonb check (jsonb_typeof(cards) = 'object'),
  note        text not null default '' check (char_length(note) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists decks_user_id_updated_at_idx
  on public.decks (user_id, updated_at desc);

-- updated_at を自動更新
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists decks_set_updated_at on public.decks;
create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

-- 行レベルセキュリティ: 自分のデッキだけ読み書きできる
alter table public.decks enable row level security;

drop policy if exists "decks_select_own" on public.decks;
create policy "decks_select_own" on public.decks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "decks_insert_own" on public.decks;
create policy "decks_insert_own" on public.decks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "decks_update_own" on public.decks;
create policy "decks_update_own" on public.decks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "decks_delete_own" on public.decks;
create policy "decks_delete_own" on public.decks
  for delete to authenticated
  using ((select auth.uid()) = user_id);
