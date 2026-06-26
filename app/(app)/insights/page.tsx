"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useInsights, useMonthInsights } from "@/lib/query/hooks";
import { localToday } from "@/lib/domain/dates";
import { Card, Spinner } from "@/components/ui";
import type { ActivityDay, XpBucket } from "@/lib/api/types";

export default function InsightsPage() {
  const router = useRouter();
  const { data, isLoading } = useInsights();
  const [grain, setGrain] = useState<"week" | "month">("week");

  return (
    <div className="space-y-6">
      <header>
        <button
          onClick={() => router.back()}
          className="mb-2 text-sm text-faint hover:text-fg"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="mt-0.5 text-sm text-muted">
          Your XP over time, and what you actually did.
        </p>
      </header>

      {isLoading || !data ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <>
          {/* XP windows */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Window label="Today" value={data.windows.day} />
            <Window label="Last 7 days" value={data.windows.week} />
            <Window label="Last 30 days" value={data.windows.month} />
            <Window label="Last year" value={data.windows.year} />
          </div>

          {/* Comparisons */}
          <div className="grid grid-cols-2 gap-2">
            <Compare
              label="This week"
              now={data.comparison.this_week}
              prev={data.comparison.last_week}
              prevLabel="last week"
            />
            <Compare
              label="This month"
              now={data.comparison.this_month}
              prev={data.comparison.last_month}
              prevLabel="last month"
            />
          </div>

          {/* Trend chart */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">XP trend</h2>
              <div className="flex gap-1">
                {(["week", "month"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrain(g)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                      grain === g
                        ? "gradient-accent text-on-accent"
                        : "bg-surface-2 text-muted hover:text-fg"
                    }`}
                  >
                    {g === "week" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>
            <BarChart
              buckets={grain === "week" ? data.weekly : data.monthly}
            />
          </Card>

          {/* Browse a specific month, day by day */}
          <MonthBrowser />

          {/* Activity log */}
          <div className="space-y-2">
            <h2 className="px-1 text-sm font-semibold">Recent activity</h2>
            {data.activity.length === 0 && (
              <p className="px-1 text-sm text-faint">
                Nothing logged yet — go tick something off.
              </p>
            )}
            {data.activity.map((d) => (
              <ActivityDayCard key={d.date} d={d} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function MonthBrowser() {
  const [month, setMonth] = useState(() => localToday().slice(0, 7));
  const { data, isLoading } = useMonthInsights(month);
  const thisMonth = localToday().slice(0, 7);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="rounded-lg px-2 py-1 text-faint hover:text-fg"
          aria-label="Previous month"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">
            {format(new Date(`${month}-01T00:00:00`), "MMMM yyyy")}
          </div>
          <div className="text-xs text-accent">{data?.total ?? 0} XP</div>
        </div>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= thisMonth}
          className="rounded-lg px-2 py-1 text-faint hover:text-fg disabled:opacity-30"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : !data || data.days.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">
          Nothing logged this month.
        </p>
      ) : (
        <div className="space-y-2">
          {data.days.map((d) => (
            <ActivityDayCard key={d.date} d={d} bare />
          ))}
        </div>
      )}
    </Card>
  );
}

function ActivityDayCard({ d, bare }: { d: ActivityDay; bare?: boolean }) {
  const body = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {format(new Date(`${d.date}T00:00:00`), "EEE, MMM d")}
        </span>
        <span className="text-xs font-bold text-accent">+{d.xp} XP</span>
      </div>
      <ul className="space-y-2">
        {d.entries.map((e, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-fg">
                {e.icon && <span>{e.icon}</span>}
                {e.quest}
              </span>
              {e.xp > 0 && (
                <span className="shrink-0 text-[11px] text-faint">+{e.xp}</span>
              )}
            </div>
            {e.items.length > 0 && (
              <div className="mt-0.5 pl-5 text-xs text-muted">
                {e.items.join(" · ")}
              </div>
            )}
            {e.note && (
              <div className="mt-0.5 pl-5 text-xs italic text-faint">
                “{e.note}”
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
  return bare ? (
    <div className="rounded-xl border border-border bg-surface-2 p-3">{body}</div>
  ) : (
    <Card>{body}</Card>
  );
}

function Window({ label, value }: { label: string; value: number }) {
  return (
    <Card className="text-center">
      <div className="text-2xl font-extrabold text-fg">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-faint">
        {label}
      </div>
    </Card>
  );
}

function Compare({
  label,
  now,
  prev,
  prevLabel,
}: {
  label: string;
  now: number;
  prev: number;
  prevLabel: string;
}) {
  const delta = now - prev;
  const pct = prev > 0 ? Math.round((delta / prev) * 100) : now > 0 ? 100 : 0;
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <Card>
      <div className="text-[10px] uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-extrabold text-fg">{now}</div>
      <div
        className={`mt-1 text-xs font-semibold ${
          flat ? "text-faint" : up ? "text-success" : "text-muted"
        }`}
      >
        {flat ? "—" : `${up ? "↑" : "↓"} ${Math.abs(pct)}%`}{" "}
        <span className="font-normal text-faint">
          vs {prevLabel} ({prev})
        </span>
      </div>
    </Card>
  );
}

function BarChart({ buckets }: { buckets: XpBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.xp));
  return (
    <div className="flex h-40 items-end justify-between gap-1">
      {buckets.map((b, i) => {
        const last = i === buckets.length - 1;
        const h = Math.round((b.xp / max) * 100);
        return (
          <div
            key={b.start}
            className="flex flex-1 flex-col items-center gap-1"
            title={`${b.label}: ${b.xp} XP`}
          >
            <span className="text-[9px] text-faint">{b.xp || ""}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md transition-all ${
                  last ? "gradient-accent" : "bg-accent/35"
                }`}
                style={{ height: `${Math.max(h, b.xp > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className="text-[9px] text-faint">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}
