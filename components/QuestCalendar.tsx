"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useCalendar } from "@/lib/query/hooks";
import { localToday, weekdayOf } from "@/lib/domain/dates";
import type { CalendarDay } from "@/lib/api/types";
import type { DayStatus } from "@/lib/domain/streak";
import { Spinner } from "@/components/ui";

const STATUS_CLASS: Record<DayStatus, string> = {
  active: "bg-accent text-on-accent font-semibold",
  frozen: "bg-info/25 text-info",
  rest: "border border-dashed border-border text-faint",
  miss: "bg-surface-2 text-faint",
  idle: "text-faint/60",
  today: "ring-2 ring-accent text-fg",
  future: "text-faint/30",
  pre: "text-faint/20",
  // scheduled target quests
  met: "bg-success text-bg font-bold",
  missed: "bg-amber/25 text-amber",
  upcoming: "border border-accent/30 text-muted",
  off: "text-faint/30",
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function QuestCalendar({ questId }: { questId: string }) {
  const [month, setMonth] = useState(() => localToday().slice(0, 7));
  const { data, isLoading } = useCalendar(questId, month);
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const lead = data?.days.length ? weekdayOf(data.days[0].date) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="rounded-lg px-2 py-1 text-faint hover:text-fg"
        >
          ←
        </button>
        <div className="text-sm font-semibold">
          {format(new Date(`${month}-01T00:00:00`), "MMMM yyyy")}
        </div>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="rounded-lg px-2 py-1 text-faint hover:text-fg"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-faint">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {data?.days.map((day) => {
            const n = Number(day.date.slice(-2));
            const interactive = day.logged || day.scheduled_count > 0;
            return (
              <button
                key={day.date}
                disabled={!interactive}
                onClick={() => setSelected(day)}
                className={`grid aspect-square place-items-center rounded-lg text-xs transition ${
                  STATUS_CLASS[day.status]
                } ${interactive ? "hover:opacity-80" : "cursor-default"}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-faint">
        {data?.scheduled ? (
          <>
            <Legend cls="bg-success" label="Goal met" />
            <Legend cls="bg-amber/50" label="Missed" />
            <Legend cls="border border-accent/40" label="Upcoming" />
          </>
        ) : (
          <>
            <Legend cls="bg-accent" label="Logged" />
            <Legend cls="bg-info/40" label="Freeze used" />
            <Legend cls="border border-dashed border-border" label="Rest day" />
          </>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {format(new Date(`${selected.date}T00:00:00`), "EEE, MMM d")}
            </span>
            <button
              onClick={() => setSelected(null)}
              className="text-faint hover:text-fg"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-muted">
            {selected.scheduled_count > 0 && (
              <span>
                {selected.item_count}/{selected.scheduled_count} planned ·{" "}
              </span>
            )}
            {selected.scheduled_count === 0 && selected.item_count > 0 && (
              <span>{selected.item_count} item(s) · </span>
            )}
            <span className="text-accent">{selected.xp} XP</span>
          </div>
          {selected.note && (
            <p className="mt-1 text-xs text-faint">“{selected.note}”</p>
          )}
        </div>
      )}
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2.5 w-2.5 rounded ${cls}`} />
      {label}
    </span>
  );
}
