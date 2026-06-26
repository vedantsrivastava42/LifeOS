"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import {
  useDeleteQuest,
  usePatchQuest,
  useQuest,
} from "@/lib/query/hooks";
import { QuestCard, DiffDot } from "@/components/QuestCard";
import { QuestCalendar } from "@/components/QuestCalendar";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { Button, Card, Pill, Spinner } from "@/components/ui";
import type { Difficulty } from "@/lib/domain/types";

export default function QuestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data, isLoading } = useQuest(id);
  const patch = usePatchQuest();
  const del = useDeleteQuest();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  const q = data?.quest;
  if (!q) {
    return <div className="py-20 text-center text-faint">Quest not found.</div>;
  }

  const isActive = q.status === "active";
  const doneItems = q.items.filter((i) => i.is_done).length;
  const hasUndoneProblems = q.items.some(
    (i) => i.kind === "problem" && !i.is_done,
  );

  // Group items by topic → pattern so the sheet's structure is visible
  // (e.g. Arrays › Kadane, Arrays › K-Sum, …).
  const itemGroups = (() => {
    const topics = new Map<string, Map<string, typeof q.items>>();
    for (const it of q.items) {
      const tk = it.topic ?? (it.kind === "contest" ? "Contests" : "Other");
      const pk = it.pattern ?? "";
      let pm = topics.get(tk);
      if (!pm) {
        pm = new Map();
        topics.set(tk, pm);
      }
      const arr = pm.get(pk);
      if (arr) arr.push(it);
      else pm.set(pk, [it]);
    }
    return [...topics.entries()].map(([topic, pm]) => {
      const patterns = [...pm.entries()].map(([pattern, items]) => ({
        pattern,
        items,
      }));
      const flat = patterns.flatMap((p) => p.items);
      return {
        topic,
        patterns,
        total: flat.length,
        done: flat.filter((i) => i.is_done).length,
      };
    });
  })();

  const complete = () =>
    patch.mutate(
      { id, body: { status: "completed" } },
      { onSuccess: () => router.push("/archive") },
    );
  const archive = () =>
    patch.mutate(
      { id, body: { status: "archived" } },
      { onSuccess: () => router.push("/archive") },
    );
  const reactivate = () =>
    patch.mutate({ id, body: { status: "active" } });
  const remove = () =>
    del.mutate(id, { onSuccess: () => router.push("/quests") });

  return (
    <div className="space-y-5">
      <header>
        <button
          onClick={() => router.back()}
          className="mb-2 text-sm text-faint hover:text-fg"
        >
          ← Back
        </button>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-faint">
              <span>{q.category?.icon}</span>
              <span>{q.category?.name}</span>
              <Pill className="bg-surface-2 text-muted capitalize">
                {q.type}
              </Pill>
              {!isActive && (
                <Pill className="bg-surface-2 text-muted capitalize">
                  {q.status}
                </Pill>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{q.name}</h1>
            <p className="mt-0.5 text-xs text-faint">
              {format(new Date(`${q.start_date}T00:00:00`), "MMM d, yyyy")}
              {q.end_date
                ? ` → ${format(new Date(`${q.end_date}T00:00:00`), "MMM d, yyyy")}`
                : " · open-ended"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{q.xp_total}</div>
            <div className="text-[10px] uppercase tracking-wide text-faint">
              XP
            </div>
          </div>
        </div>
      </header>

      {/* Log from here too (active quests). */}
      {isActive && <QuestCard s={q} />}

      {/* Streak stats */}
      {q.type === "streak" && q.streak && (
        <Card className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Current" value={`🔥 ${q.streak.current}`} />
          <Stat label="Longest" value={`${q.streak.longest}`} />
          <Stat label="Freezes" value={`❄️ ${q.streak.freezes}`} />
        </Card>
      )}
      {q.type === "target" && q.streak && (
        <Card className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Current" value={`🔥 ${q.streak.current}`} />
          <Stat label="Longest" value={`${q.streak.longest}`} />
          <Stat label="Freezes" value={`❄️ ${q.streak.freezes}`} />
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Calendar</h2>
        <QuestCalendar questId={id} />
      </Card>

      {/* Schedule editor (target quests with unfinished problems) */}
      {q.type === "target" && isActive && hasUndoneProblems && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Schedule</h2>
          <ScheduleEditor questId={id} items={q.items} config={q.config} />
        </Card>
      )}

      {/* Items, grouped by topic */}
      {q.items.length > 0 && q.type !== "milestone" && q.type !== "daily" && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Items
              <span className="ml-1 text-xs font-normal text-faint">
                · {itemGroups.length} topics
              </span>
            </h2>
            <span className="text-xs text-faint">
              {doneItems}/{q.items.length} done
            </span>
          </div>
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {itemGroups.map((g) => (
              <div key={g.topic}>
                <div className="mb-1 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {g.topic}
                  </span>
                  <span className="text-[10px] text-faint">
                    {g.done}/{g.total}
                  </span>
                </div>
                <div className="space-y-2">
                  {g.patterns.map((p) => (
                    <div key={p.pattern || "_none"}>
                      {p.pattern && (
                        <div className="mb-0.5 flex items-center gap-1 px-1 text-[10px] font-medium text-muted">
                          <span>▸ {p.pattern}</span>
                          <span className="text-faint">
                            {p.items.filter((i) => i.is_done).length}/
                            {p.items.length}
                          </span>
                        </div>
                      )}
                      <ul className={p.pattern ? "space-y-1 pl-2.5" : "space-y-1"}>
                        {p.items.map((item) => (
                          <li
                            key={item.id}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                              item.is_done
                                ? "text-faint line-through"
                                : "text-fg"
                            }`}
                          >
                            <span
                              className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                                item.is_done
                                  ? "border-success bg-success/20 text-success"
                                  : "border-border"
                              }`}
                            >
                              {item.is_done ? "✓" : ""}
                            </span>
                            <span className="flex-1 truncate">
                              {item.label}
                            </span>
                            {item.due_date && (
                              <span
                                className={`text-[10px] ${
                                  item.kind === "contest"
                                    ? "text-info"
                                    : "text-faint"
                                }`}
                              >
                                {format(
                                  new Date(`${item.due_date}T00:00:00`),
                                  "MMM d",
                                )}
                              </span>
                            )}
                            {item.difficulty && (
                              <DiffDot d={item.difficulty as Difficulty} />
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lifecycle */}
      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Manage</h2>
        {isActive ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={complete} disabled={patch.isPending}>
              Mark complete
            </Button>
            <Button variant="soft" onClick={archive} disabled={patch.isPending}>
              Archive
            </Button>
          </div>
        ) : (
          <Button variant="soft" onClick={reactivate} disabled={patch.isPending}>
            Reactivate
          </Button>
        )}

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Delete forever?</span>
            <Button variant="danger" onClick={remove} disabled={del.isPending}>
              Yes, delete
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-faint hover:text-red-400"
          >
            Delete quest
          </button>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-fg">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-faint">
        {label}
      </div>
    </div>
  );
}
