"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  buildTopicSchedule,
  weekdaysForCadence,
  type Cadence,
} from "@/lib/domain/schedule";

/** One topic the user can order, pace, and toggle. */
export interface TopicRow {
  topic: string;
  count: number; // problems available to schedule from this topic
  pace: number; // per-week pace for this topic
  enabled: boolean;
  patternCount?: number; // distinct patterns inside this topic (display only)
}

const CADENCES: { value: Cadence; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
];

export function TopicScheduler({
  rows,
  onChange,
  cadence,
  onCadence,
  startDate,
  countNoun = "left",
}: {
  rows: TopicRow[];
  onChange: (rows: TopicRow[]) => void;
  cadence: Cadence;
  onCadence: (c: Cadence) => void;
  startDate: string;
  /** Word shown after a topic's count, e.g. "left" or "problems". */
  countNoun?: string;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const patch = (i: number, p: Partial<TopicRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const sched = useMemo(() => {
    const slices = rows
      .filter((r) => r.enabled && r.count > 0)
      .map((r) => ({
        topic: r.topic,
        pace_per_week: r.pace > 0 ? r.pace : 1,
        count: r.count,
      }));
    return buildTopicSchedule(startDate, slices, weekdaysForCadence(cadence));
  }, [rows, cadence, startDate]);

  const dayGroups = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sched) m.set(s.date, (m.get(s.date) ?? 0) + 1);
    return [...m.entries()];
  }, [sched]);

  const total = sched.length;
  const lastDate = sched.length ? sched[sched.length - 1].date : null;

  return (
    <div className="space-y-3">
      {/* Cadence */}
      <div className="flex flex-wrap gap-2">
        {CADENCES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onCadence(c.value)}
            className={`rounded-xl border px-3 py-1.5 text-sm transition ${
              cadence === c.value
                ? "border-accent bg-accent-soft text-fg"
                : "border-border bg-surface text-muted hover:text-fg"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Topic rows — order = sequence */}
      <ul className="space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={r.topic}
            className={`flex items-center gap-2 rounded-xl border px-2 py-2 transition ${
              r.enabled
                ? "border-border bg-surface-2"
                : "border-border/50 bg-surface opacity-50"
            }`}
          >
            <span className="flex flex-col">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="px-1 text-xs text-faint hover:text-fg disabled:opacity-20"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1}
                className="px-1 text-xs text-faint hover:text-fg disabled:opacity-20"
                aria-label="Move down"
              >
                ▼
              </button>
            </span>

            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-accent-soft text-[10px] font-bold text-accent">
              {i + 1}
            </span>

            <button
              type="button"
              onClick={() => patch(i, { enabled: !r.enabled })}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-medium text-fg">
                {r.topic}
              </span>
              <span className="text-[10px] text-faint">
                {r.count} {countNoun}
                {r.patternCount ? ` · ${r.patternCount} patterns` : ""}
              </span>
            </button>

            <label className="flex items-center gap-1 text-[10px] text-faint">
              <input
                type="number"
                min={1}
                max={1000}
                value={r.pace}
                disabled={!r.enabled}
                onChange={(e) =>
                  patch(i, { pace: Math.max(1, Number(e.target.value) || 1) })
                }
                className="input w-14 px-2 py-1 text-center text-sm disabled:opacity-40"
              />
              /wk
            </label>

            <input
              type="checkbox"
              checked={r.enabled}
              onChange={(e) => patch(i, { enabled: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-accent)]"
              aria-label={`Include ${r.topic}`}
            />
          </li>
        ))}
      </ul>

      {/* Preview */}
      {total > 0 ? (
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
          <div className="font-semibold text-fg">
            {total} problems scheduled
            {lastDate && (
              <>
                {" "}
                · finishes{" "}
                <span className="text-accent">
                  {format(new Date(`${lastDate}T00:00:00`), "MMM d, yyyy")}
                </span>
              </>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {dayGroups.slice(0, 8).map(([date, count]) => (
              <span key={date} className="rounded-md bg-surface px-1.5 py-0.5">
                {format(new Date(`${date}T00:00:00`), "EEE d")}:{" "}
                <span className="font-semibold text-fg">{count}</span>
              </span>
            ))}
            {dayGroups.length > 8 && <span className="px-1">…</span>}
          </div>
        </div>
      ) : (
        <p className="text-xs text-faint">
          Enable at least one topic to build a plan.
        </p>
      )}
    </div>
  );
}
