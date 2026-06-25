-- ════════════════════════════════════════════════════════════════════════
--  QuestLog — DSA as its own category (moved out of "Skill Up")
-- ════════════════════════════════════════════════════════════════════════
--  Run this once to upgrade an existing DB. Idempotent.
--  Fresh installs already get this via 0003/0004 (which now point the Striver
--  sheets at the DSA category); this migration is a no-op there.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Add the DSA category.
insert into public.categories (id, user_id, name, icon, color, is_preset) values
  ('00000000-0000-0000-0000-000000000006', null, 'DSA', '🧩', '#2dd4bf', true)
on conflict (id) do nothing;

-- 2) Move the Striver sheets from Skill Up → DSA.
update public.sheets
   set category_id = '00000000-0000-0000-0000-000000000006'
 where id in (
   '00000000-0000-0000-0000-0000000000a1',  -- Striver SDE Sheet
   '00000000-0000-0000-0000-0000000000a2'   -- Striver A-Z
 );

-- 3) Drop the redundant "(422)" baked into the A-Z sheet name.
--    The UI appends the item count, so the name shouldn't include it.
update public.sheets
   set name = 'Striver A-Z'
 where id = '00000000-0000-0000-0000-0000000000a2';
