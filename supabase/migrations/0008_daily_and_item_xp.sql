-- ════════════════════════════════════════════════════════════════════════
--  QuestLog — Daily quest type + per-item XP + per-item category
-- ════════════════════════════════════════════════════════════════════════
--  • quest_items.xp_value  — custom XP for a checklist/daily item (null = default)
--  • quest_items.category_id — per-task category (used by Daily tasks for filtering)
--  • 'daily' added to the quests.type and quest_items.kind CHECK constraints
--  Idempotent.
-- ════════════════════════════════════════════════════════════════════════

alter table public.quest_items add column if not exists xp_value integer;
alter table public.quest_items
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists idx_quest_items_category on public.quest_items (category_id);

-- Allow the new 'daily' quest type.
alter table public.quests drop constraint if exists quests_type_check;
alter table public.quests
  add constraint quests_type_check
  check (type in ('streak', 'target', 'milestone', 'daily'));

-- Allow the new 'daily' item kind.
alter table public.quest_items drop constraint if exists quest_items_kind_check;
alter table public.quest_items
  add constraint quest_items_kind_check
  check (kind in ('problem', 'contest', 'checklist', 'custom', 'daily'));
