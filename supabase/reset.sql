-- ════════════════════════════════════════════════════════════════════════
--  QuestLog — FULL RESET  ⚠️  DESTRUCTIVE
-- ════════════════════════════════════════════════════════════════════════
--  Drops every app table (and the updated_at trigger function). ALL DATA IS
--  LOST — quests, logs, XP, streaks, AND the preset sheets/categories/patterns.
--
--  This file is intentionally NOT in the numbered migrations/ sequence, so it
--  never runs on a normal `supabase db push` / deploy. Run it by hand only.
--
--  ── To wipe and rebuild from scratch ──────────────────────────────────────
--    1. Run THIS file in the Supabase SQL Editor   → everything is gone.
--    2. Re-run the migrations in order to recover schema + presets:
--         supabase/migrations/0001_init.sql
--         supabase/migrations/0002_rls.sql
--         supabase/migrations/0003_seed.sql
--         supabase/migrations/0004_sheet_striver_a2z.sql
--         supabase/migrations/0005_sheet_system_design.sql
--         supabase/migrations/0006_dsa_category.sql
--         supabase/migrations/0007_item_patterns.sql
--    (All migrations are idempotent, so re-running the whole folder is safe.)
--
--  Auth users are NOT touched — your login still works after a reset.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- CASCADE handles foreign keys; order doesn't matter with it, but we list
-- children-first anyway for clarity.
drop table if exists public.retrospectives cascade;
drop table if exists public.xp_events      cascade;
drop table if exists public.streak_state   cascade;
drop table if exists public.day_logs       cascade;
drop table if exists public.quest_items    cascade;
drop table if exists public.quests         cascade;
drop table if exists public.sheet_items    cascade;
drop table if exists public.sheets         cascade;
drop table if exists public.categories     cascade;

-- Trigger function recreated by 0001.
drop function if exists public.set_updated_at() cascade;

commit;
