-- ════════════════════════════════════════════════════════════════════════
--  QuestLog — Row Level Security
-- ════════════════════════════════════════════════════════════════════════
--  Single-user app, but RLS is the safety net: the anon/auth client can only
--  ever touch the signed-in user's rows.
--
--  Two shapes of policy:
--   1. Preset tables (categories, sheets, sheet_items): a row is visible if it
--      is the user's own (user_id = auth.uid()) OR a global preset (user_id IS
--      NULL). Users can only write rows they own — presets are read-only.
--   2. User tables (everything else): a row is visible/writable only if
--      user_id = auth.uid().
-- ════════════════════════════════════════════════════════════════════════

alter table public.categories      enable row level security;
alter table public.sheets          enable row level security;
alter table public.sheet_items     enable row level security;
alter table public.quests          enable row level security;
alter table public.quest_items     enable row level security;
alter table public.day_logs        enable row level security;
alter table public.xp_events       enable row level security;
alter table public.streak_state    enable row level security;
alter table public.retrospectives  enable row level security;

-- ── Preset-style tables: own rows + global presets readable, own rows writable
do $$
declare t text;
begin
  foreach t in array array['categories','sheets','sheet_items']
  loop
    execute format('drop policy if exists %1$s_select on public.%1$s;', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s;', t);
    execute format('drop policy if exists %1$s_update on public.%1$s;', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s;', t);

    execute format($f$
      create policy %1$s_select on public.%1$s
        for select using (user_id = auth.uid() or user_id is null);
    $f$, t);
    execute format($f$
      create policy %1$s_insert on public.%1$s
        for insert with check (user_id = auth.uid());
    $f$, t);
    execute format($f$
      create policy %1$s_update on public.%1$s
        for update using (user_id = auth.uid()) with check (user_id = auth.uid());
    $f$, t);
    execute format($f$
      create policy %1$s_delete on public.%1$s
        for delete using (user_id = auth.uid());
    $f$, t);
  end loop;
end$$;

-- ── User-owned tables: strict owner-only on all operations
do $$
declare t text;
begin
  foreach t in array array[
    'quests','quest_items','day_logs','xp_events','streak_state','retrospectives'
  ]
  loop
    execute format('drop policy if exists %1$s_select on public.%1$s;', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s;', t);
    execute format('drop policy if exists %1$s_update on public.%1$s;', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s;', t);

    execute format($f$
      create policy %1$s_select on public.%1$s
        for select using (user_id = auth.uid());
    $f$, t);
    execute format($f$
      create policy %1$s_insert on public.%1$s
        for insert with check (user_id = auth.uid());
    $f$, t);
    execute format($f$
      create policy %1$s_update on public.%1$s
        for update using (user_id = auth.uid()) with check (user_id = auth.uid());
    $f$, t);
    execute format($f$
      create policy %1$s_delete on public.%1$s
        for delete using (user_id = auth.uid());
    $f$, t);
  end loop;
end$$;
