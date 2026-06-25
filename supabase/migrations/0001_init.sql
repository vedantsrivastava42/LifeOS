-- ════════════════════════════════════════════════════════════════════════
--  QuestLog — schema
-- ════════════════════════════════════════════════════════════════════════
--  Conventions:
--    • Every table: id uuid pk, created_at, updated_at.
--    • user_id references auth.users.
--    • Preset/template tables (categories, sheets, sheet_items) allow a NULL
--      user_id, meaning "global preset" — readable by everyone, owned by no
--      one (see 0002_rls.sql). All user-generated tables require a user_id.
--    • Enumerations are TEXT + CHECK (easy to extend without enum migrations).
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- Keep updated_at fresh on any update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── categories ────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade, -- NULL = preset
  name        text not null,
  icon        text,
  color       text,
  is_preset   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── sheets (reusable problem/topic templates) ─────────────────────────────
create table if not exists public.sheets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade, -- NULL = preset
  name        text not null,
  source      text not null default 'custom'
                check (source in ('striver','neetcode','blind75','custom','ai_generated')),
  category_id uuid references public.categories(id) on delete set null,
  is_preset   boolean not null default false,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── sheet_items ───────────────────────────────────────────────────────────
create table if not exists public.sheet_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade, -- NULL = preset
  sheet_id    uuid not null references public.sheets(id) on delete cascade,
  title       text not null,
  topic       text,
  difficulty  text check (difficulty in ('easy','medium','hard')),
  url         text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── quests ────────────────────────────────────────────────────────────────
create table if not exists public.quests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  category_id  uuid references public.categories(id) on delete set null,
  type         text not null check (type in ('streak','target','milestone')),
  start_date   date not null,
  end_date     date,                       -- NULL = open-ended / goalless
  status       text not null default 'active'
                 check (status in ('active','completed','archived')),
  sheet_id     uuid references public.sheets(id) on delete set null,
  config       jsonb not null default '{}'::jsonb,
  ai_generated boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── quest_items ───────────────────────────────────────────────────────────
create table if not exists public.quest_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  quest_id       uuid not null references public.quests(id) on delete cascade,
  label          text not null,
  source_item_id uuid references public.sheet_items(id) on delete set null,
  topic          text,
  difficulty     text check (difficulty in ('easy','medium','hard')),
  due_date       date,                     -- scheduled items (e.g. contests)
  is_done        boolean not null default false,
  done_at        timestamptz,
  kind           text not null default 'custom'
                   check (kind in ('problem','contest','checklist','custom')),
  order_index    integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── day_logs (one row per quest per engaged day) ──────────────────────────
create table if not exists public.day_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  quest_id   uuid not null references public.quests(id) on delete cascade,
  log_date   date not null,
  kind       text not null default 'tick' check (kind in ('tick','items','note')),
  note       text,
  item_ids   uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quest_id, log_date)
);

-- ── xp_events (append-only ledger; totals are always SUM(amount)) ──────────
create table if not exists public.xp_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  quest_id    uuid references public.quests(id) on delete cascade,
  event_date  date not null,
  amount      integer not null,
  base_amount integer not null,
  multiplier  numeric not null default 1,
  reason      text not null default '',
  created_at  timestamptz not null default now()
);

-- ── streak_state (recomputed server-side, never trusted from client) ──────
create table if not exists public.streak_state (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  quest_id         uuid not null references public.quests(id) on delete cascade,
  current_streak   integer not null default 0,
  longest_streak   integer not null default 0,
  last_active_date date,
  freezes_available integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (quest_id)
);

-- ── retrospectives (Phase 3; table created now) ───────────────────────────
create table if not exists public.retrospectives (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  quest_id     uuid not null references public.quests(id) on delete cascade,
  generated_at timestamptz not null default now(),
  content_md   text not null default '',
  stats        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (quest_id)
);

-- ── indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_quests_user_status   on public.quests (user_id, status);
create index if not exists idx_day_logs_quest_date  on public.day_logs (quest_id, log_date);
create index if not exists idx_quest_items_quest     on public.quest_items (quest_id);
create index if not exists idx_quest_items_due       on public.quest_items (quest_id, due_date);
create index if not exists idx_xp_events_user_date   on public.xp_events (user_id, event_date);
create index if not exists idx_xp_events_quest       on public.xp_events (quest_id);
create index if not exists idx_sheet_items_sheet     on public.sheet_items (sheet_id, order_index);
create index if not exists idx_sheets_category       on public.sheets (category_id);

-- ── updated_at triggers ───────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'categories','sheets','sheet_items','quests','quest_items',
    'day_logs','streak_state','retrospectives'
  ]
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;
