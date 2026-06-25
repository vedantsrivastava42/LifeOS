# QuestLog

A calm, single-user personal **quest tracker** for the college → career transition.
It makes slow, multi-month progress (DSA, fitness, finance, skill-building) feel
visible and alive day to day — without creating grind anxiety.

The center of gravity is the **Quest**: a time-boxed (or open-ended) commitment in
a category, with a tiny daily tracking surface, that ends in a retrospective.

> **This repo is Phase 1 — the working spine.** Everything works by *tapping*.
> No AI yet (that's Phase 2+). See [Build phases](#build-phases).

---

## What's in Phase 1

- **Auth + RLS** — Supabase email/password; Row Level Security on every table.
- **Categories** — Work · Skill Up · Fitness · Finance presets, plus custom ones.
- **Sheet presets** — the **Striver SDE Sheet** (~180) and the full **Striver A–Z**
  (422 problems across 16 topics), seeded as global data.
- **Three quest types**
  - **Streak** (e.g. Gym) — one big tap; honors rest days + earnable freezes.
  - **Target** (e.g. 200 DSA by Dec) — progress ring + gentle pace; tick sheet
    items or add a custom solve. Optional **auto-scheduled LeetCode contests**
    (weekly Sundays / biweekly alt. Saturdays — generated deterministically).
  - **Milestone** (e.g. Settle in Gurgaon) — a one-off checklist.
  Quests can start on any date (incl. the future) and can be goalless (no end).
- **"Today" view** — the calm daily home: what's due, one-tap logging, today's XP,
  current streaks, level. Nearly empty when there's little to do — that's fine.
- **XP ledger + streak engine** — fully server-side and deterministic
  (anti-burnout diminishing returns, streak bonus, rest days, freezes, soft decay
  instead of hard resets, a quiet "welcome back" after a long gap).
- **Per-quest calendar** — logged days, rest days, and freeze-used days.
- **Archive** — completed/abandoned quests with consistency stats.
- **Small moments of delight** — subtle +XP / streak / freeze / level-up toasts.

What's intentionally **not** here: leaderboards, social, push nagging, hard streak
resets, any "you failed" guilt UI. One user, calm, momentum-focused.

---

## Tech stack

- **Next.js 16 (App Router) + React 19 + TypeScript**, **Tailwind v4**, mobile-first.
- **Supabase** (Postgres + Auth) via `@supabase/supabase-js` + `@supabase/ssr`.
- **TanStack Query** for data fetching against Route Handlers.
- **date-fns** for dates (everything is reasoned about as local `yyyy-MM-dd`).
- **Zod** for request validation.

All XP/streak computation and all (future) AI calls happen **server-side only**.
The client never writes XP or streak state directly.

---

## Setup

### 1. Create a Supabase project
At [supabase.com](https://supabase.com), create a project and grab, from
**Settings → API**:
- Project URL
- `anon` public key
- `service_role` key (server-only; not strictly needed for Phase 1)

### 2. Run the SQL migrations
In the Supabase **SQL Editor**, run the files in `supabase/migrations/` **in order**:

1. `0001_init.sql` — tables, indexes, `updated_at` triggers
2. `0002_rls.sql` — Row Level Security policies
3. `0003_seed.sql` — preset categories (incl. DSA) + the Striver SDE Sheet
4. `0004_sheet_striver_a2z.sql` — the full Striver A–Z preset sheet (422 problems)
5. `0005_sheet_system_design.sql` — System Design category + 10-week roadmap sheet
6. `0006_dsa_category.sql` — upgrade for existing DBs: adds DSA, moves Striver sheets to it

> Presets are seeded as **global rows** (`user_id = NULL`, `is_preset = true`) that
> every user can read via RLS. Attaching a preset sheet to a quest *copies* its
> items into your quest. This is why `categories` / `sheets` / `sheet_items` allow a
> nullable `user_id` while all user-data tables require one. The seed is idempotent
> (fixed UUIDs + `ON CONFLICT DO NOTHING`).

### 3. Configure env
Copy the example and fill it in:

```bash
cp .env.local.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only
OPENAI_API_KEY=                                    # Phase 2+, unused now
AI_MODEL_GEN=gpt-4.1                                # Phase 2+ (reasoning/generation)
AI_MODEL_CLASSIFY=gpt-4o-mini                       # Phase 2+ (cheap classification)
```

> A placeholder `.env.local` ships so the app *boots* before setup — replace it.

### 4. (Auth) Email confirmation
For the fastest single-user start, turn **off** email confirmation in
**Supabase → Authentication → Providers → Email** ("Confirm email"). Then sign up
and you're straight in. Leave it on if you prefer the confirmation email flow.

### 5. Run

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign up, create a quest, and start tapping.

```bash
npm run build && npm run start   # production
npm run lint                     # eslint
```

---

## Where the tunable constants live

**All XP & streak tuning is in one file:** [`lib/config/xp.ts`](lib/config/xp.ts).

| Constant            | Controls                                                        |
| ------------------- | -------------------------------------------------------------- |
| `XP_BASE`           | Base XP per problem difficulty / tick / milestone / contest.   |
| `DIMINISHING`       | Within-day diminishing returns (anti-cramming).                |
| `STREAK_BONUS`      | Streak multiplier growth + cap.                                |
| `STREAK_RULES`      | Freeze cadence, soft-decay size, long-gap threshold.           |
| `LEVELS`            | The global level curve.                                        |

Change a number, change the feel — no logic edits needed. The logic that reads
these lives in [`lib/domain/xp.ts`](lib/domain/xp.ts) (XP) and
[`lib/domain/streak.ts`](lib/domain/streak.ts) (streaks).

---

## Project structure

```
app/
  (app)/            authenticated shell: today, quests, quests/new,
                    quests/[id], archive, account
  api/              route handlers (today, quests, log, calendar, archive, …)
  login/            email/password auth
lib/
  config/xp.ts      ← all tunable game constants
  domain/           pure logic: dates, xp, streak, schedule, types
  server/           server-only derivations: log, today, calendar, archive…
  supabase/         browser / server / admin clients + session proxy
  validation/       Zod schemas
  api/ , query/     fetch client + TanStack Query hooks
components/         QuestCard, QuestCalendar, ProgressRing, nav, delight…
supabase/migrations/  0001 schema · 0002 RLS · 0003 preset seed
proxy.ts            auth/session middleware (Next 16 "proxy" convention)
```

---

## Build phases

- **Phase 1 — working spine (this repo).** Everything by tapping. ✅
- **Phase 2 — AI assist.** Natural-language auto-logging + NL quest creation.
- **Phase 3 — depth.** Narrative retrospectives, richer archive stats, re-entry.
- **Phase 4 — polish.** AI quest editing, sheet generation, more presets, animation.

Phase 2+ uses **OpenAI** (the `openai` SDK, added when Phase 2 lands) with
structured outputs for anything parsed into the data model, validated with Zod
before any DB write. Model routing is env-overridable: `AI_MODEL_GEN` for
reasoning/generation, `AI_MODEL_CLASSIFY` for cheap classification.

Phase 2+ scaffolding is already in place: env vars are wired, the
`retrospectives` table exists, and contest/schedule expansion is deterministic
code (so the future "Flow A" only needs the LLM to parse intent, not dates).
