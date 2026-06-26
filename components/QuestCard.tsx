"use client";

import Link from "next/link";
import { useState } from "react";
import { useCategories, useLogDay, useQuest } from "@/lib/query/hooks";
import { useDelight } from "@/components/Delight";
import { Card, Pill } from "@/components/ui";
import { ProgressRing } from "@/components/ProgressRing";
import { localToday } from "@/lib/domain/dates";
import type { LogResult, QuestSummary } from "@/lib/api/types";
import type { Difficulty, QuestItemRow } from "@/lib/domain/types";

const STREAK_MILESTONES = new Set([3, 7, 14, 21, 30, 50, 75, 100, 150, 200]);

function useCelebrate() {
  const { notify } = useDelight();
  return (res: LogResult, name: string) => {
    if (res.xp_gained > 0)
      notify({ title: `+${res.xp_gained} XP`, sub: name, icon: "✨", tone: "xp" });
    if (res.freeze_earned)
      notify({
        title: "Freeze earned",
        sub: "A missed day won't break your streak",
        icon: "❄️",
        tone: "freeze",
      });
    if (res.leveled_up)
      notify({
        title: `Level ${res.level.level}!`,
        sub: "Quiet momentum is adding up",
        icon: "⭐",
        tone: "level",
      });
    if (res.streak && STREAK_MILESTONES.has(res.streak.current))
      notify({
        title: `${res.streak.current}-day streak`,
        sub: "Beautifully consistent",
        icon: "🔥",
        tone: "streak",
      });
  };
}

function CardHeader({ s }: { s: QuestSummary }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Link href={`/quests/${s.id}`} className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 place-items-center rounded-2xl text-lg"
          style={{
            background: s.category?.color
              ? `${s.category.color}22`
              : "var(--color-surface-2)",
          }}
        >
          {s.category?.icon ?? "•"}
        </span>
        <div>
          <div className="font-bold leading-tight text-fg">{s.name}</div>
          <div className="text-xs text-faint">{s.category?.name}</div>
        </div>
      </Link>
      {s.today_xp > 0 && (
        <Pill className="bg-accent-soft text-accent">+{s.today_xp} today</Pill>
      )}
    </div>
  );
}

export function QuestCard({ s }: { s: QuestSummary }) {
  if (s.type === "streak") return <StreakCard s={s} />;
  if (s.type === "milestone") return <MilestoneCard s={s} />;
  if (s.type === "daily") return <DailyCard s={s} />;
  return <TargetCard s={s} />;
}

// ── Streak ──────────────────────────────────────────────────────────────────
function StreakCard({ s }: { s: QuestSummary }) {
  const log = useLogDay(s.id);
  const celebrate = useCelebrate();
  const [pop, setPop] = useState(false);
  const done = s.today_logged;
  const streak = s.streak;

  const onTick = () => {
    if (done || log.isPending) return;
    log.mutate(
      { kind: "tick", today: localToday() },
      {
        onSuccess: (res) => {
          setPop(true);
          setTimeout(() => setPop(false), 350);
          celebrate(res, s.name);
        },
      },
    );
  };

  return (
    <Card accent={s.category?.color}>
      <CardHeader s={s} />
      <button
        onClick={onTick}
        disabled={log.isPending}
        className={`relative flex w-full items-center justify-center gap-2 rounded-2xl py-6 text-base font-bold transition ${
          done
            ? "bg-success/15 text-success"
            : "gradient-accent text-on-accent shadow-lg shadow-accent/30 hover:brightness-110 active:scale-[0.99]"
        } ${pop ? "ql-pop" : ""}`}
      >
        {done ? (
          <>✓ Logged today</>
        ) : s.rest_today ? (
          <>😌 Rest day — tap only if you showed up</>
        ) : (
          <>Tap to log today</>
        )}
      </button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-base font-extrabold text-flame">
          🔥 {streak?.current ?? 0}
          <span className="text-xs font-normal text-faint">day streak</span>
        </span>
        <span className="flex items-center gap-3 text-faint">
          <span title="Freezes available">❄️ {streak?.freezes ?? 0}</span>
          <span>best {streak?.longest ?? 0}</span>
        </span>
      </div>
    </Card>
  );
}

// ── Milestone ───────────────────────────────────────────────────────────────
function MilestoneCard({ s }: { s: QuestSummary }) {
  const log = useLogDay(s.id);
  const celebrate = useCelebrate();
  const items = s.checklist ?? [];
  const done = items.filter((i) => i.is_done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  const toggle = (item: QuestItemRow) => {
    if (item.is_done || log.isPending) return;
    log.mutate(
      { kind: "items", itemIds: [item.id], today: localToday() },
      { onSuccess: (res) => celebrate(res, item.label) },
    );
  };

  return (
    <Card accent={s.category?.color}>
      <CardHeader s={s} />
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-faint">
          {done}/{items.length} done
        </span>
        <span className="font-bold text-accent">{pct}%</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => toggle(item)}
              disabled={item.is_done || log.isPending}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                item.is_done
                  ? "text-faint line-through"
                  : "bg-surface-2 text-fg hover:bg-elevated"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs ${
                  item.is_done
                    ? "gradient-accent text-on-accent"
                    : "border border-border"
                }`}
              >
                {item.is_done ? "✓" : ""}
              </span>
              {item.label}
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-1 text-sm text-faint">No checklist items yet.</li>
        )}
      </ul>
    </Card>
  );
}

// ── Daily ─────────────────────────────────────────────────────────────────
function FilterChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
        on
          ? "gradient-accent text-on-accent"
          : "bg-surface-2 text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function DailyCard({ s }: { s: QuestSummary }) {
  const log = useLogDay(s.id);
  const celebrate = useCelebrate();
  const cats = useCategories();
  const [filter, setFilter] = useState<string>("all");

  const tasks = s.checklist ?? [];
  const doneSet = new Set(s.today_item_ids ?? []);
  const doneCount = tasks.filter((t) => doneSet.has(t.id)).length;

  const catMap = new Map(
    (cats.data?.categories ?? []).map((c) => [c.id, c]),
  );
  const presentCats: string[] = [];
  for (const t of tasks) {
    if (t.category_id && !presentCats.includes(t.category_id))
      presentCats.push(t.category_id);
  }

  const visible =
    filter === "all" ? tasks : tasks.filter((t) => t.category_id === filter);

  const toggle = (item: QuestItemRow) => {
    if (doneSet.has(item.id) || log.isPending) return;
    log.mutate(
      { kind: "items", itemIds: [item.id], today: localToday() },
      { onSuccess: (res) => celebrate(res, item.label) },
    );
  };

  return (
    <Card accent={s.category?.color}>
      <CardHeader s={s} />
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-faint">
          {doneCount}/{tasks.length} done today
        </span>
        <span className="font-bold text-accent">
          {tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0}%
        </span>
      </div>

      {presentCats.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <FilterChip on={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          {presentCats.map((cid) => {
            const c = catMap.get(cid);
            return (
              <FilterChip
                key={cid}
                on={filter === cid}
                onClick={() => setFilter(cid)}
              >
                {c ? `${c.icon} ${c.name}` : "Other"}
              </FilterChip>
            );
          })}
        </div>
      )}

      <ul className="space-y-1.5">
        {visible.map((item) => {
          const done = doneSet.has(item.id);
          const c = item.category_id ? catMap.get(item.category_id) : null;
          return (
            <li key={item.id}>
              <button
                onClick={() => toggle(item)}
                disabled={done || log.isPending}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  done
                    ? "text-faint line-through"
                    : "bg-surface-2 text-fg hover:bg-elevated"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs ${
                    done
                      ? "gradient-accent text-on-accent"
                      : "border border-border"
                  }`}
                >
                  {done ? "✓" : ""}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {c && <span className="text-[11px]">{c.icon}</span>}
                {item.difficulty && <DiffDot d={item.difficulty} />}
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-1 text-sm text-faint">No tasks here.</li>
        )}
      </ul>
    </Card>
  );
}

// ── Target ──────────────────────────────────────────────────────────────────
const PACE_LABEL: Record<string, { text: string; cls: string }> = {
  ahead: { text: "Ahead of pace", cls: "bg-success/15 text-success" },
  on: { text: "On pace", cls: "bg-surface-2 text-muted" },
  behind: { text: "A little behind — no rush", cls: "bg-amber/15 text-amber" },
};

function TargetCard({ s }: { s: QuestSummary }) {
  const [open, setOpen] = useState(false);
  const log = useLogDay(s.id);
  const celebrate = useCelebrate();
  const p = s.progress;
  const pace = p ? PACE_LABEL[p.pace] : null;

  const tickContest = (item: QuestItemRow) => {
    if (log.isPending) return;
    log.mutate(
      { kind: "items", itemIds: [item.id], today: localToday() },
      { onSuccess: (res) => celebrate(res, item.label) },
    );
  };

  return (
    <Card accent={s.category?.color}>
      <CardHeader s={s} />

      <div className="flex items-center gap-4">
        <ProgressRing value={p ? p.percent / 100 : 0} size={84}>
          <div className="text-center leading-none">
            <div className="text-base font-extrabold text-fg">{p?.done ?? 0}</div>
            <div className="text-[10px] text-faint">/ {p?.target ?? "—"}</div>
          </div>
        </ProgressRing>
        <div className="flex-1">
          {pace && (
            <Pill className={pace.cls}>{pace.text}</Pill>
          )}
          <div className="mt-1 text-xs text-faint">
            {p?.pace_per_week ?? "—"}/week target · {p?.percent ?? 0}%
          </div>
          {s.streak && (s.streak.current > 0 || s.streak.freezes > 0) && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="font-extrabold text-flame">
                🔥 {s.streak.current}
              </span>
              <span className="text-faint">
                day streak · best {s.streak.longest}
              </span>
              {s.streak.freezes > 0 && (
                <span className="text-info">❄️ {s.streak.freezes}</span>
              )}
            </div>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2.5 rounded-xl gradient-accent px-3.5 py-2 text-xs font-bold text-on-accent shadow-md shadow-accent/30 hover:brightness-110"
          >
            {open ? "Close" : "Log progress"}
          </button>
        </div>
      </div>

      {s.due_today.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-faint">
              Today&apos;s plan
            </div>
            <span className="text-[11px] font-semibold text-accent">
              {s.due_today.length} to do
            </span>
          </div>
          {s.due_today.map((item) => {
            const isContest = item.kind === "contest";
            return (
              <button
                key={item.id}
                onClick={() => tickContest(item)}
                disabled={log.isPending}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  isContest
                    ? "bg-info/10 text-info hover:bg-info/15"
                    : "bg-surface-2 text-fg hover:bg-elevated"
                }`}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-border text-[10px]">
                  {isContest ? "🏆" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  {!isContest && (item.topic || item.pattern) && (
                    <span className="block truncate text-[10px] font-normal text-faint">
                      {[item.topic, item.pattern].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                {item.difficulty && <DiffDot d={item.difficulty} />}
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <TargetLogPanel
          questId={s.id}
          onLogged={(res) => {
            celebrate(res, s.name);
            setOpen(false);
          }}
        />
      )}
    </Card>
  );
}

function TargetLogPanel({
  questId,
  onLogged,
}: {
  questId: string;
  onLogged: (res: LogResult) => void;
}) {
  const detail = useQuest(questId);
  const log = useLogDay(questId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customDiff, setCustomDiff] = useState<Difficulty | "">("");

  const items = (detail.data?.quest.items ?? []).filter(
    (i) => !i.is_done && (i.kind === "problem" || i.kind === "custom"),
  );
  const q = search.toLowerCase();
  const filtered = search
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          (i.topic ?? "").toLowerCase().includes(q) ||
          (i.pattern ?? "").toLowerCase().includes(q),
      )
    : items;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canSubmit = selected.size > 0 || customLabel.trim().length > 0;

  const submit = () => {
    if (!canSubmit || log.isPending) return;
    const newItems = customLabel.trim()
      ? [
          {
            label: customLabel.trim(),
            difficulty: (customDiff || null) as Difficulty | null,
            kind: "custom" as const,
          },
        ]
      : [];
    log.mutate(
      { kind: "items", itemIds: [...selected], newItems, today: localToday() },
      {
        onSuccess: (res) => {
          setSelected(new Set());
          setCustomLabel("");
          setCustomDiff("");
          onLogged(res);
        },
      },
    );
  };

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface-2/60 p-3">
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-faint">
          Solved something custom?
        </div>
        <input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="e.g. Read about consistent hashing"
          className="input"
        />
        <div className="flex gap-1.5">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setCustomDiff(customDiff === d ? "" : d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                customDiff === d
                  ? "gradient-accent text-on-accent"
                  : "bg-surface text-muted hover:text-fg"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-faint">
            Or tick from your sheet
          </div>
          {selected.size > 0 && (
            <span className="text-xs font-semibold text-accent">
              {selected.size} selected
            </span>
          )}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search problems…"
          className="input"
        />
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {detail.isLoading && (
            <div className="px-1 py-2 text-sm text-faint">Loading…</div>
          )}
          {!detail.isLoading && filtered.length === 0 && (
            <div className="px-1 py-2 text-sm text-faint">
              Nothing left here — add a custom item above.
            </div>
          )}
          {filtered.slice(0, 80).map((item) => {
            const on = selected.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                  on ? "bg-accent-soft" : "hover:bg-surface"
                }`}
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                    on ? "gradient-accent border-transparent text-on-accent" : "border-border"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-fg">{item.label}</span>
                  {(item.topic || item.pattern) && (
                    <span className="block truncate text-[10px] text-faint">
                      {[item.topic, item.pattern].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                {item.difficulty && <DiffDot d={item.difficulty} />}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!canSubmit || log.isPending}
        className="w-full rounded-xl gradient-accent py-3 text-sm font-bold text-on-accent shadow-md shadow-accent/30 transition hover:brightness-110 disabled:opacity-40"
      >
        {log.isPending ? "Logging…" : "Log it"}
      </button>
    </div>
  );
}

export function DiffDot({ d }: { d: Difficulty }) {
  const map: Record<Difficulty, string> = {
    easy: "text-success",
    medium: "text-gold",
    hard: "text-flame",
  };
  return <span className={`text-[10px] font-bold uppercase ${map[d]}`}>{d[0]}</span>;
}
