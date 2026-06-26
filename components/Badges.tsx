"use client";

import { useBadges } from "@/lib/query/hooks";
import { Card, Spinner } from "@/components/ui";
import type { BadgeStatus } from "@/lib/domain/badges";

export function Badges() {
  const { data, isLoading } = useBadges();
  const badges = data?.badges ?? [];
  const earned = badges.filter((b) => b.earned).length;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Badges</h2>
        {badges.length > 0 && (
          <span className="text-xs text-faint">
            {earned}/{badges.length} earned
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {badges.map((b) => (
            <BadgeTile key={b.id} b={b} />
          ))}
        </div>
      )}
    </Card>
  );
}

function BadgeTile({ b }: { b: BadgeStatus }) {
  const pct = Math.round(b.progress * 100);
  return (
    <div
      title={b.blurb}
      className={`relative flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
        b.earned
          ? "border-accent/40 bg-accent-soft glow-accent"
          : "border-border bg-surface-2"
      }`}
    >
      <span
        className={`text-2xl ${b.earned ? "" : "opacity-30 grayscale"}`}
        aria-hidden
      >
        {b.icon}
      </span>
      <span
        className={`text-[11px] font-semibold leading-tight ${
          b.earned ? "text-fg" : "text-faint"
        }`}
        style={b.earned && b.color ? { color: b.color } : undefined}
      >
        {b.name}
      </span>

      {b.earned ? (
        <span className="text-[9px] font-bold uppercase tracking-wide text-accent">
          Earned
        </span>
      ) : (
        <>
          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent/60"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[9px] text-faint">
            {b.current}/{b.threshold}
          </span>
        </>
      )}
    </div>
  );
}
