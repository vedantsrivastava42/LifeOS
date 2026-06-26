"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCategories,
  useCreateQuest,
  useSheet,
  useSheets,
} from "@/lib/query/hooks";
import { Button, Card } from "@/components/ui";
import { localToday, weekdayLabel } from "@/lib/domain/dates";
import {
  assignDailyCounts,
  generateContests,
  weekdaysForCadence,
  type Cadence,
} from "@/lib/domain/schedule";
import { TopicScheduler, type TopicRow } from "@/components/TopicScheduler";
import type { QuestType } from "@/lib/domain/types";
import type { CreateQuestInput } from "@/lib/validation/schemas";

const TYPES: {
  type: QuestType;
  title: string;
  blurb: string;
  icon: string;
}[] = [
  {
    type: "streak",
    title: "Streak",
    blurb: "Don't break the chain. Gym, journaling, daily practice.",
    icon: "🔥",
  },
  {
    type: "target",
    title: "Target",
    blurb: "Reach a number by a date. 200 DSA problems, 50 articles.",
    icon: "🎯",
  },
  {
    type: "milestone",
    title: "Milestone",
    blurb: "A one-off checklist. Settle into a new city, ship a project.",
    icon: "🪜",
  },
  {
    type: "daily",
    title: "Daily Task",
    blurb: "A recurring checklist that resets every day. Tag tasks by category.",
    icon: "🔁",
  },
];

export default function NewQuestPage() {
  const router = useRouter();
  const cats = useCategories();
  const sheets = useSheets();
  const create = useCreateQuest();

  const [type, setType] = useState<QuestType>("streak");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState(localToday());
  const [openEnded, setOpenEnded] = useState(true);
  const [endDate, setEndDate] = useState("");

  // target
  const [targetCount, setTargetCount] = useState(200);
  const [pace, setPace] = useState(10);
  const [sheetId, setSheetId] = useState("");
  const [attachSheet, setAttachSheet] = useState(true);
  const [weekly, setWeekly] = useState(false);
  const [biweekly, setBiweekly] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [cadence, setCadence] = useState<Cadence>("daily");

  // Topic ordering + per-topic pace, derived from the attached sheet's items.
  const sheetDetail = useSheet(
    sheetId && attachSheet && scheduleEnabled ? sheetId : undefined,
  );
  const [topicRows, setTopicRows] = useState<TopicRow[]>([]);
  const [topicSheetKey, setTopicSheetKey] = useState("");

  // Seed topic rows from the attached sheet. Adjusting state during render
  // (guarded by a key change) is React's recommended alternative to an effect
  // for "reset some state when a prop/source changes".
  const loadedSheetId = sheetDetail.data?.sheet?.id;
  if (loadedSheetId && loadedSheetId !== topicSheetKey) {
    const order: string[] = [];
    const counts = new Map<string, number>();
    const patterns = new Map<string, Set<string>>();
    for (const it of sheetDetail.data!.items) {
      const t = it.topic ?? "Uncategorized";
      if (!counts.has(t)) {
        order.push(t);
        patterns.set(t, new Set());
      }
      counts.set(t, (counts.get(t) ?? 0) + 1);
      if (it.pattern) patterns.get(t)!.add(it.pattern);
    }
    setTopicRows(
      order.map((t) => ({
        topic: t,
        count: counts.get(t) ?? 0,
        pace,
        enabled: true,
        patternCount: patterns.get(t)?.size ?? 0,
      })),
    );
    setTopicSheetKey(loadedSheetId);
  }

  const hasTopics = topicRows.length > 0;
  const scheduledTotal = useMemo(
    () =>
      topicRows
        .filter((r) => r.enabled)
        .reduce((s, r) => s + r.count, 0),
    [topicRows],
  );

  // streak
  const [restDays, setRestDays] = useState<number[]>([]);
  const [freezesMax, setFreezesMax] = useState(3);
  const [freezesStart, setFreezesStart] = useState(1);
  const [tickXp, setTickXp] = useState("");

  // milestone: each step has a label + optional XP override.
  const [milestoneItems, setMilestoneItems] = useState<
    { label: string; xp: string }[]
  >([{ label: "", xp: "" }]);

  // daily: recurring tasks with optional per-task category + XP.
  const [dailyItems, setDailyItems] = useState<
    { label: string; categoryId: string; xp: string }[]
  >([{ label: "", categoryId: "", xp: "" }]);

  const categories = cats.data?.categories ?? [];
  const effectiveEnd = openEnded ? null : endDate || null;

  const contestPreview = useMemo(() => {
    if (type !== "target" || (!weekly && !biweekly)) return 0;
    return generateContests(startDate, effectiveEnd, { weekly, biweekly })
      .length;
  }, [type, weekly, biweekly, startDate, effectiveEnd]);

  const dayPlan = useMemo(() => {
    if (type !== "target" || !scheduleEnabled) return [];
    return assignDailyCounts(
      startDate,
      targetCount,
      pace,
      weekdaysForCadence(cadence),
    );
  }, [type, scheduleEnabled, cadence, startDate, targetCount, pace]);

  const canSubmit =
    name.trim().length > 0 &&
    !!categoryId &&
    (type !== "milestone" || milestoneItems.some((i) => i.label.trim())) &&
    (type !== "daily" || dailyItems.some((i) => i.label.trim()));

  async function submit() {
    if (!canSubmit) return;
    const input: CreateQuestInput = {
      name: name.trim(),
      category_id: categoryId,
      type,
      start_date: startDate,
      end_date: effectiveEnd,
      sheet_id: type === "target" && sheetId ? sheetId : null,
    };
    if (type === "target") {
      input.target = { target_count: targetCount, pace_per_week: pace };
      input.attach_sheet = !!sheetId && attachSheet;
      if (weekly || biweekly) input.contests = { weekly, biweekly };
      if (scheduleEnabled && sheetId && attachSheet) {
        const enabledRows = topicRows.filter((r) => r.enabled && r.count > 0);
        if (enabledRows.length) {
          input.schedule = {
            enabled: true,
            cadence,
            topics: enabledRows.map((r) => ({
              topic: r.topic,
              pace_per_week: r.pace > 0 ? r.pace : 1,
              count: r.count,
            })),
          };
          // Target = the topics you actually picked.
          input.target = {
            target_count: enabledRows.reduce((s, r) => s + r.count, 0),
            pace_per_week: pace,
          };
        } else {
          input.schedule = { enabled: true, cadence };
        }
      }
    } else if (type === "streak") {
      input.streak = {
        rest_days: restDays,
        freezes_max: freezesMax,
        freezes_available: freezesStart,
        tick_xp: tickXp.trim() ? Number(tickXp) : undefined,
      };
    } else if (type === "milestone") {
      input.milestone_items = milestoneItems
        .filter((i) => i.label.trim())
        .map((i) => ({
          label: i.label.trim(),
          xp: i.xp.trim() ? Number(i.xp) : undefined,
        }));
    } else if (type === "daily") {
      input.daily_items = dailyItems
        .filter((i) => i.label.trim())
        .map((i) => ({
          label: i.label.trim(),
          category_id: i.categoryId || null,
          xp: i.xp.trim() ? Number(i.xp) : undefined,
        }));
    }

    const res = await create.mutateAsync(input);
    router.push(`/quests/${res.id}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <button
          onClick={() => router.back()}
          className="mb-2 text-sm text-faint hover:text-fg"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">New quest</h1>
      </header>

      {/* Type */}
      <div className="grid grid-cols-1 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => setType(t.type)}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
              type === t.type
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface hover:border-border"
            }`}
          >
            <span className="text-2xl">{t.icon}</span>
            <div>
              <div className="font-semibold text-fg">{t.title}</div>
              <div className="text-xs text-faint">{t.blurb}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Name + category */}
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              type === "streak"
                ? "Hit the gym"
                : type === "target"
                  ? "200 DSA problems"
                  : "Settle into Gurgaon"
            }
            className="input"
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  categoryId === c.id
                    ? "border-accent bg-accent-soft text-fg"
                    : "border-border bg-surface text-muted hover:text-fg"
                }`}
              >
                <span className="mr-1">{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={endDate}
              min={startDate}
              disabled={openEnded}
              onChange={(e) => setEndDate(e.target.value)}
              className="input disabled:opacity-40"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={openEnded}
                onChange={(e) => setOpenEnded(e.target.checked)}
              />
              Open-ended
            </label>
          </Field>
        </div>
      </div>

      {/* Type-specific */}
      {type === "target" && (
        <Card className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target count">
              <input
                type="number"
                min={1}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Pace / week">
              <input
                type="number"
                min={1}
                value={pace}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPace(v);
                  // Propagate to every topic's pace (a "set all"); per-topic
                  // tweaks below override just that one until the next change.
                  if (v > 0) {
                    setTopicRows((rows) =>
                      rows.map((r) => ({ ...r, pace: v })),
                    );
                  }
                }}
                className="input"
              />
            </Field>
          </div>

          <Field label="Attach a sheet (optional)">
            <select
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              className="input"
            >
              <option value="">None</option>
              {(sheets.data?.sheets ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.item_count})
                </option>
              ))}
            </select>
            {sheetId && (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={attachSheet}
                  onChange={(e) => setAttachSheet(e.target.checked)}
                />
                Copy its problems into this quest to tick off
              </label>
            )}
          </Field>

          <Field label="LeetCode contests (auto-scheduled)">
            <div className="flex gap-2">
              <Toggle on={weekly} onClick={() => setWeekly((v) => !v)}>
                Weekly (Sundays)
              </Toggle>
              <Toggle on={biweekly} onClick={() => setBiweekly((v) => !v)}>
                Biweekly (alt. Sat)
              </Toggle>
            </div>
          </Field>

          <Field label="Day-by-day schedule">
            <label className="mb-2 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              Assign specific problems to specific days
            </label>

            {scheduleEnabled && !(sheetId && attachSheet) && (
              <p className="mt-2 text-xs text-flame">
                Attach a sheet above (and keep “copy its problems” on) to build a
                day-by-day plan.
              </p>
            )}

            {/* Topic-sequenced plan (sheet has topics). */}
            {scheduleEnabled && sheetId && attachSheet && hasTopics && (
              <div className="space-y-2">
                <p className="text-xs text-faint">
                  Reorder topics with ▲▼ (e.g. put DP first), set a per-topic
                  pace (4/wk for one, 20/wk for another), and untick any you’ll
                  skip for now. {scheduledTotal} problems selected.
                </p>
                <TopicScheduler
                  rows={topicRows}
                  onChange={setTopicRows}
                  cadence={cadence}
                  onCadence={setCadence}
                  startDate={startDate}
                  countNoun="problems"
                />
              </div>
            )}

            {/* Sheet attached but topics still loading. */}
            {scheduleEnabled &&
              sheetId &&
              attachSheet &&
              !hasTopics &&
              sheetDetail.isLoading && (
                <p className="text-xs text-faint">Loading topics…</p>
              )}

            {/* Sheet with no topic metadata → flat cadence + preview. */}
            {scheduleEnabled &&
              sheetId &&
              attachSheet &&
              !hasTopics &&
              !sheetDetail.isLoading && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(["daily", "weekdays", "weekends"] as Cadence[]).map(
                      (c) => (
                        <Toggle
                          key={c}
                          on={cadence === c}
                          onClick={() => setCadence(c)}
                        >
                          {c === "daily"
                            ? "Every day"
                            : c === "weekdays"
                              ? "Weekdays"
                              : "Weekends"}
                        </Toggle>
                      ),
                    )}
                  </div>
                  {dayPlan.length > 0 && (
                    <div className="mt-2 rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
                      ~{pace}/week → {dayPlan.reduce((s, d) => s + d.count, 0)}{" "}
                      problems over {dayPlan.length} active days
                    </div>
                  )}
                </>
              )}
          </Field>

          {contestPreview > 0 && (
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
              {contestPreview} contests scheduled on the calendar
            </div>
          )}
        </Card>
      )}

      {type === "streak" && (
        <Card className="space-y-4">
          <Field label="Rest days (never break the streak)">
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <Toggle
                  key={d}
                  on={restDays.includes(d)}
                  onClick={() =>
                    setRestDays((prev) =>
                      prev.includes(d)
                        ? prev.filter((x) => x !== d)
                        : [...prev, d],
                    )
                  }
                >
                  {weekdayLabel(d)}
                </Toggle>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max freezes">
              <input
                type="number"
                min={0}
                max={10}
                value={freezesMax}
                onChange={(e) => setFreezesMax(Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Starting freezes">
              <input
                type="number"
                min={0}
                max={freezesMax}
                value={freezesStart}
                onChange={(e) => setFreezesStart(Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>
          <Field label="XP per day (blank = default 10)">
            <input
              type="number"
              min={0}
              value={tickXp}
              onChange={(e) => setTickXp(e.target.value)}
              placeholder="10"
              className="input"
            />
          </Field>
          <p className="text-xs text-faint">
            Earn a freeze every 7 consistent days. A missed day spends a freeze
            instead of breaking your streak.
          </p>
        </Card>
      )}

      {type === "milestone" && (
        <Card className="space-y-3">
          <Field label="Checklist (set XP per step — blank = default 50)">
            <div className="space-y-2">
              {milestoneItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item.label}
                    onChange={(e) =>
                      setMilestoneItems((prev) =>
                        prev.map((v, idx) =>
                          idx === i ? { ...v, label: e.target.value } : v,
                        ),
                      )
                    }
                    placeholder={`Step ${i + 1}`}
                    className="input min-w-0 flex-1"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.xp}
                    onChange={(e) =>
                      setMilestoneItems((prev) =>
                        prev.map((v, idx) =>
                          idx === i ? { ...v, xp: e.target.value } : v,
                        ),
                      )
                    }
                    placeholder="XP"
                    className="input shrink-0 text-center"
                    style={{ width: "5.5rem" }}
                  />
                  {milestoneItems.length > 1 && (
                    <button
                      onClick={() =>
                        setMilestoneItems((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      className="rounded-lg px-3 text-faint hover:text-fg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Field>
          <button
            onClick={() =>
              setMilestoneItems((prev) => [...prev, { label: "", xp: "" }])
            }
            className="text-sm text-accent hover:underline"
          >
            + Add step
          </button>
        </Card>
      )}

      {type === "daily" && (
        <Card className="space-y-3">
          <Field label="Daily tasks (category + XP per task — blank XP = default 8)">
            <div className="space-y-2">
              {dailyItems.map((item, i) => (
                <div key={i} className="space-y-1.5 rounded-xl border border-border bg-surface-2 p-2">
                  <div className="flex gap-2">
                    <input
                      value={item.label}
                      onChange={(e) =>
                        setDailyItems((prev) =>
                          prev.map((v, idx) =>
                            idx === i ? { ...v, label: e.target.value } : v,
                          ),
                        )
                      }
                      placeholder={`Task ${i + 1} — e.g. Solve 1 DSA problem`}
                      className="input flex-1"
                    />
                    {dailyItems.length > 1 && (
                      <button
                        onClick={() =>
                          setDailyItems((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="rounded-lg px-3 text-faint hover:text-fg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={item.categoryId}
                      onChange={(e) =>
                        setDailyItems((prev) =>
                          prev.map((v, idx) =>
                            idx === i
                              ? { ...v, categoryId: e.target.value }
                              : v,
                          ),
                        )
                      }
                      className="input min-w-0 flex-1 text-sm"
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={item.xp}
                      onChange={(e) =>
                        setDailyItems((prev) =>
                          prev.map((v, idx) =>
                            idx === i ? { ...v, xp: e.target.value } : v,
                          ),
                        )
                      }
                      placeholder="XP"
                      className="input shrink-0 text-center"
                      style={{ width: "5.5rem" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Field>
          <button
            onClick={() =>
              setDailyItems((prev) => [
                ...prev,
                { label: "", categoryId: "", xp: "" },
              ])
            }
            className="text-sm text-accent hover:underline"
          >
            + Add task
          </button>
          <p className="text-xs text-faint">
            These reset every day — tick them off fresh each morning. The XP
            consecutive-day bonus still applies.
          </p>
        </Card>
      )}

      {create.isError && (
        <p className="text-sm text-red-400">
          {(create.error as Error)?.message ?? "Couldn't create quest"}
        </p>
      )}

      <Button
        onClick={submit}
        disabled={!canSubmit || create.isPending}
        className="w-full"
      >
        {create.isPending ? "Creating…" : "Create quest"}
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
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
      className={`rounded-xl border px-3 py-2 text-sm transition ${
        on
          ? "border-accent bg-accent-soft text-fg"
          : "border-border bg-surface text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
