"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { TopicScheduler, type TopicRow } from "@/components/TopicScheduler";
import { useRescheduleQuest } from "@/lib/query/hooks";
import { localToday } from "@/lib/domain/dates";
import type { Cadence } from "@/lib/domain/schedule";
import { isTargetConfig, type QuestItemRow, type QuestConfig } from "@/lib/domain/types";

/** Build the editor's starting rows from the quest's undone problems + config. */
function seedRows(
  items: QuestItemRow[],
  config: QuestConfig,
): { rows: TopicRow[]; cadence: Cadence } {
  const undone = new Map<string, number>();
  const seenOrder: string[] = [];
  const patterns = new Map<string, Set<string>>();
  for (const it of items) {
    if (it.kind !== "problem" || it.is_done) continue;
    const t = it.topic ?? "Uncategorized";
    if (!undone.has(t)) {
      seenOrder.push(t);
      patterns.set(t, new Set());
    }
    undone.set(t, (undone.get(t) ?? 0) + 1);
    if (it.pattern) patterns.get(t)!.add(it.pattern);
  }

  const cfgTopics = isTargetConfig(config) ? config.schedule?.topics ?? [] : [];
  const paceByTopic = new Map(cfgTopics.map((t) => [t.topic, t.pace_per_week]));
  const defaultPace = isTargetConfig(config) ? config.pace_per_week || 10 : 10;
  const hadConfig = cfgTopics.length > 0;

  // Order: previously-configured topics first (preserving their order), then
  // any remaining topics that still have undone problems.
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const t of cfgTopics.map((t) => t.topic)) {
    if (undone.has(t) && !seen.has(t)) {
      ordered.push(t);
      seen.add(t);
    }
  }
  for (const t of seenOrder) {
    if (!seen.has(t)) {
      ordered.push(t);
      seen.add(t);
    }
  }

  const rows: TopicRow[] = ordered.map((t) => ({
    topic: t,
    count: undone.get(t) ?? 0,
    pace: paceByTopic.get(t) ?? defaultPace,
    enabled: hadConfig ? paceByTopic.has(t) : true,
    patternCount: patterns.get(t)?.size ?? 0,
  }));
  const cadence =
    (isTargetConfig(config) ? config.schedule?.cadence : undefined) ?? "daily";
  return { rows, cadence };
}

export function ScheduleEditor({
  questId,
  items,
  config,
}: {
  questId: string;
  items: QuestItemRow[];
  config: QuestConfig;
}) {
  const reschedule = useRescheduleQuest(questId);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [startDate, setStartDate] = useState(localToday());

  const undoneProblems = items.filter(
    (i) => i.kind === "problem" && !i.is_done,
  ).length;
  if (!undoneProblems) return null;

  const openEditor = () => {
    const seed = seedRows(items, config);
    setRows(seed.rows);
    setCadence(seed.cadence);
    setStartDate(localToday());
    setOpen(true);
  };

  const apply = () => {
    reschedule.mutate(
      {
        cadence,
        start_date: startDate,
        topics: rows.map((r) => ({
          topic: r.topic,
          pace_per_week: r.pace > 0 ? r.pace : 1,
          enabled: r.enabled,
        })),
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  if (!open) {
    return (
      <button
        onClick={openEditor}
        className="text-sm font-medium text-accent hover:underline"
      >
        ⚙︎ Edit schedule — reorder topics &amp; pace
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Reschedule remaining problems</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-faint hover:text-fg"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-faint">
          Start from
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="input"
        />
      </div>

      <TopicScheduler
        rows={rows}
        onChange={setRows}
        cadence={cadence}
        onCadence={setCadence}
        startDate={startDate}
        countNoun="left"
      />

      {reschedule.isError && (
        <p className="text-sm text-red-400">
          {(reschedule.error as Error)?.message ?? "Couldn't reschedule"}
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={apply} disabled={reschedule.isPending}>
          {reschedule.isPending ? "Applying…" : "Apply schedule"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-[11px] text-faint">
        Only unfinished problems get re-dated — anything you’ve already done
        stays put. Unticked topics move to the untimed backlog.
      </p>
    </div>
  );
}
