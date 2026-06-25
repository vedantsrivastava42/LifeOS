# QuestLog — Feature Documentation

A single-user, **anti-anxiety** personal quest tracker for the college → career
transition (DSA, fitness, finance, skill-building). Everything works by
tapping. No leaderboards, no guilt screens, no hard streak resets.

> **Status:** Phase 1 (no AI) is fully built. Phases 2–4 layer AI on top
> (see [Roadmap](#13-roadmap)). All scoring is deterministic and server-side.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Tech Stack](#2-tech-stack)
3. [Core Concepts](#3-core-concepts)
4. [Quest Types](#4-quest-types)
5. [The XP System](#5-the-xp-system)
6. [Levels](#6-levels)
7. [The Anti-Anxiety Streak Engine](#7-the-anti-anxiety-streak-engine)
8. [DSA Scheduling (Topics & Patterns)](#8-dsa-scheduling-topics--patterns)
9. [Calendar](#9-calendar)
10. [Categories & Sheets](#10-categories--sheets)
11. [Screens & Navigation](#11-screens--navigation)
12. [Data Model & Architecture](#12-data-model--architecture)
13. [Roadmap](#13-roadmap)
14. [Tuning the Game](#14-tuning-the-game)

---

## 1. Design Philosophy

The product brief's non-negotiables, all enforced in code:

| Principle | How it shows up |
| --- | --- |
| **Reward consistency, never cramming** | Diminishing XP for repeated items in one day |
| **Streaks want you to win** | Rest days, earnable freezes, soft decay instead of resets |
| **No shaming** | No "you failed" UI; missed planned days are **amber**, never red |
| **No hard resets** | A miss steps your streak down gently; only a >7-day gap resets it |
| **Gentle delight** | Streak bonus, levels, XP "pop" animations |
| **Trustworthy numbers** | XP/streak computed **server-side only**, never trusted from the client |
| **Deterministic where rules exist** | Contest dates & XP math are plain code, not an LLM |

---

## 2. Tech Stack

- **Next.js 16** (App Router, Turbopack, React Compiler) + **React 19** + **TypeScript** (strict)
- **Tailwind v4** — "Bold gamified" theme (violet→fuchsia accent, dark UI)
- **Supabase** — Postgres + Auth + Row-Level Security
- **TanStack Query** — client data fetching/caching
- **date-fns** — date math · **Zod** — request validation
- **OpenAI SDK** — installed for the future AI layer (Phase 2+); not used in Phase 1

Data flow: **UI → React Query hooks → API route handlers → Supabase**. The
client never talks to Supabase directly for scored data — all XP/streak logic is
server-authoritative.

---

## 3. Core Concepts

- **Quest** — one thing you're working on. Has a type, category, start/end date,
  optional sheet, and a config blob.
- **Quest item** — a unit inside a quest: a problem, a contest, or a checklist step.
- **Day log** — one row per quest per day you engaged (a tick, items, or a note).
- **XP event** — an append-only ledger entry. **Totals are always `SUM(amount)`**,
  never a stored counter — so XP can't drift or be tampered with.
- **Streak state** — recomputed from logs server-side, never trusted from the client.

---

## 4. Quest Types

### 🔥 Streak — *"Don't break the chain"*
For habits: gym, journaling, daily practice.
- One-tap **daily tick** to log the day.
- **Rest days** (pick weekdays) never count as a break.
- **Freezes** absorb missed days (see §7).
- Detail view shows **Current / Longest / Freezes** stats.

### 🎯 Target — *"Reach a number by a date"*
For volume goals: 200 DSA problems, 50 articles.
- A **target count** and a **pace/week**.
- Optionally **attach a sheet** (e.g. Striver A-Z) to copy its problems in as a
  tickable pool.
- Optional **day-by-day schedule** that assigns specific problems to specific
  days (see §8).
- Optional auto-scheduled **LeetCode contests** (weekly Sundays, biweekly alt.
  Saturdays).
- Progress shows **ahead / on-track / behind** vs. expected pace.

### 🪜 Milestone — *"A one-off checklist"*
For projects/transitions: settle into a new city, ship a project.
- A simple ordered checklist; each item completed awards XP.

---

## 5. The XP System

All XP is derived in [lib/domain/xp.ts](../lib/domain/xp.ts) and written to the
`xp_events` ledger. Constants live in [lib/config/xp.ts](../lib/config/xp.ts).

### Base values (before multipliers)

| Action | XP |
| --- | --- |
| Easy problem | 10 |
| Medium problem | 15 |
| Hard problem | 25 |
| Problem with unknown difficulty | 12 |
| Daily streak tick | 10 |
| Milestone / checklist item | 50 |
| Scheduled contest | 30 |
| Plain note (no items) | 5 |

### Multipliers (stack together)

**Diminishing returns** — *spread it out beats cramming.*
The Nth item logged for a quest **on the same day** earns
`base × max(0.5, 1 − 0.10·(N−1))`.
→ 1st item ×1.00, 2nd ×0.90, 3rd ×0.80 … floored at ×0.50.
The count carries across multiple logs on the same day.

**Streak bonus** — a gentle reward for consistency.
`× (1 + min(0.30, 0.02 · currentStreak))` → +2% per consecutive day, capped at **+30%**.

> Final amount = `round(base × diminishing × streakBonus)`, minimum 1.
> Every event records its base, multiplier, and a human-readable reason
> (e.g. *"3-Sum ·×0.90 spread ·×1.10 streak"*).

---

## 6. Levels

A cosmetic global layer over **lifetime XP** — a quiet sense of overall progress.

- Level **L** begins at `120 · (L−1)^1.6` cumulative XP.
- Example thresholds: L2 = 120 · L3 ≈ 364 · L4 ≈ 696 · L5 ≈ 1,103 XP.
- The Today hero shows your level, a gradient progress bar, and XP-to-next.

---

## 7. The Anti-Anxiety Streak Engine

The heart of the app. Pure, deterministic, server-authoritative
([lib/domain/streak.ts](../lib/domain/streak.ts)).

### Freezes — streak insurance
- **Earn 1 freeze every 5 consecutive active days** (capped at your *Max freezes*).
- A missed normal day **automatically spends a freeze** instead of breaking the
  streak — silently, no shaming.
- **Max freezes** = how many you can bank (default 3). **Starting freezes** = how
  many you begin with (default 1).

### Rest days
Weekdays you mark as rest **never count as a miss** and never cost a freeze.

### Soft decay (not a reset)
If you miss a non-rest day **and have no freeze**, the streak **steps down by 3
days per missed day** — a gentle dip, not a wipe.

### Welcome-back
Only a gap of **more than 7 days** resets the streak to 0, and even then you get
a *welcome-back* flow instead of a guilt screen.

### Today is never a miss
The current day is never penalized — it isn't over yet.

---

## 8. DSA Scheduling (Topics & Patterns)

When you attach a DSA sheet to a Target quest, you get a real study plan, not a
flat list.

### Topic-wise sequence
- The sheet's **topics** (Arrays, Binary Search, DP, Graph, …) appear as a
  **reorderable list** — drag DP to the top to do it first (▲▼).
- Each topic carries its **own pace** — e.g. 4/week for Graphs, 20/week for
  Arrays — set independently per topic.
- **Untick** topics you'll skip for now; they move to an untimed backlog
  (still tickable, just not dated).
- Topics run **sequentially**: one topic's block fills its days, then the next
  picks up the day it ends — no overlaps, no idle gaps.

### Patterns nested inside topics
- Every problem carries a **pattern** (a sub-grouping within a topic), e.g.
  Arrays → *Kadane / Max Subarray*, *K-Sum (Two Pointer / Hashing)*,
  *Majority Element (Moore's Voting)*.
- The Striver A-Z sheet is tagged with **70 patterns** across its 16 topics.
- The quest detail's **Items** list is grouped **topic → pattern**, each with its
  own done/total counts. Scheduler rows show a "· N patterns" hint.

### Cadence
Choose **Every day**, **Weekdays**, or **Weekends** — the plan only lands
problems on active weekdays.

### Per-day assignment
The scheduler spreads each topic's problems across its active days at its pace
(e.g. 10/week daily → Mon 2, Tue 2, Wed 2, Thu 1, Fri 1, Sat 1, Sun 1) and
stamps a **due date** on each problem.

### LeetCode contests (deterministic, no LLM)
- **Weekly** → every Sunday in range.
- **Biweekly** → every other Saturday, anchored to the first Saturday after start.

### Editing the schedule later
On a quest's page, **⚙︎ Edit schedule** lets you reorder topics, retune
per-topic pace, change cadence, and pick a new start date. Only **unfinished**
problems get re-dated — anything you've already done stays put; unticked topics
move to the backlog.

---

## 9. Calendar

A per-quest month calendar in the detail view, with tap-to-inspect days.

**Streak quests** color each day by status:
- **Active** (logged) · **Freeze used** · **Rest day** · idle / future.

**Scheduled Target quests** color by goal:
- **Green** = the day's planned problems were met.
- **Amber** = a past planned day whose goal wasn't met *(softer than red — by design)*.
- **Upcoming** = a future planned day (outlined).
- **Today** turns green the moment you hit the day's goal, and **never goes
  amber while it's still today**.

Tapping a day shows `done/planned`, XP earned, and any note.

---

## 10. Categories & Sheets

### Preset categories
🧩 **DSA** · 💰 **Finance** · 🏋️ **Fitness** · 🧠 **Skill Up** · 🏗️ **System
Design** · 💼 **Work**. You can also create your own.

### Preset sheets
| Sheet | Size | Notes |
| --- | --- | --- |
| **Striver A-Z** | 422 problems | 16 topics, 70 patterns — the full topic/pattern scheduler |
| **Striver SDE Sheet** | ~180 problems | Classic SDE sheet |
| **System Design (10-Week)** | 52 topics | Organized week-by-week |

Presets are global rows (owned by no user) readable by everyone. You can also
create **custom sheets** with your own problems, topics, and difficulties.

---

## 11. Screens & Navigation

Bottom-nav app with a central **+** to create quests.

| Screen | Route | What it does |
| --- | --- | --- |
| **Today** | `/today` | Hero (level bar, lifetime XP, +today XP) + one-tap logging for each active quest |
| **Quests** | `/quests` | All active quests |
| **New quest** | `/quests/new` | Create a quest: type, category, dates, sheet, schedule, contests |
| **Quest detail** | `/quests/[id]` | Log, streak stats, calendar, schedule editor, topic→pattern item list, lifecycle |
| **Archive** | `/archive` | Completed/archived quests with summary stats |
| **Account** | `/account` | Account settings |
| **Login** | `/login` | Supabase auth |

### Logging mechanics
- **Tick** — one tap to log a streak day.
- **Items** — check off problems/contests/checklist items (existing or new).
- **Note** — a plain text log.

Each log returns the XP gained, a breakdown, level-up status, and whether a
freeze was earned.

### Quest lifecycle
Active → **Mark complete** or **Archive** → (Reactivate) → **Delete**.

---

## 12. Data Model & Architecture

### Tables (`supabase/migrations/`)
- `categories` · `sheets` · `sheet_items` — templates; preset rows have `user_id = NULL`
- `quests` — a quest (type, dates, sheet, JSON `config`)
- `quest_items` — problems / contests / checklist items (with `topic`, `pattern`, `due_date`, `is_done`)
- `day_logs` — one row per quest per engaged day (`tick` / `items` / `note`)
- `xp_events` — **append-only** XP ledger (totals = `SUM(amount)`)
- `streak_state` — recomputed streak snapshot
- `retrospectives` — Phase 3 table (created now, used later)

### Security
- **Row-Level Security** on every table. Users see only their own rows **plus**
  global presets (`user_id IS NULL`).
- Two Supabase keys: public/anon (browser) and service_role (server only).
  **API keys are never exposed to the client.**
- All XP/streak computation happens in route handlers, never the browser.

### Migrations
`0001` schema · `0002` RLS · `0003` seed (categories + Striver SDE) ·
`0004` Striver A-Z (422) · `0005` System Design (10-week) · `0006` DSA category ·
`0007` problem patterns (adds `pattern` column + tags Striver A-Z).

---

## 13. Roadmap

- **Phase 1 — built.** Everything above, fully deterministic, no AI.
- **Phase 2+ — the AI layer (planned):** AI-assisted plan refinement (e.g.
  smarter pattern ordering), fuzzy item classification, and retrospectives.
  The OpenAI SDK is installed; the scheduler stays deterministic — the LLM only
  does fuzzy work, never XP math or contest dates.

---

## 14. Tuning the Game

Every XP/streak number lives in one file: **[lib/config/xp.ts](../lib/config/xp.ts)**.
Change a constant, change the feel — no logic edits needed:

- `XP_BASE` — per-action base values
- `DIMINISHING` — anti-cramming curve (`step`, `floor`)
- `STREAK_BONUS` — consistency reward (`perDay`, `max`)
- `STREAK_RULES` — freezes, soft decay, long-gap reset
- `LEVELS` — level curve (`base`, `exp`)
