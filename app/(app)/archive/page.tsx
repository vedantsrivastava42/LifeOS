"use client";

import Link from "next/link";
import { useArchive } from "@/lib/query/hooks";
import { Card, EmptyState, Pill, Spinner } from "@/components/ui";
import type { ArchiveEntry } from "@/lib/api/types";

export default function ArchivePage() {
  const { data, isLoading } = useArchive();
  const entries = data?.entries ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
        <p className="mt-1 text-sm text-muted">Look how far you&apos;ve come.</p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {data && entries.length === 0 && (
        <EmptyState
          icon="📦"
          title="Nothing archived yet"
          sub="When you complete or archive a quest, it lands here with its stats and (soon) a narrative retrospective."
        />
      )}

      <div className="space-y-3">
        {entries.map((e) => (
          <ArchiveCard key={e.quest.id} e={e} />
        ))}
      </div>
    </div>
  );
}

function ArchiveCard({ e }: { e: ArchiveEntry }) {
  const { quest: q, stats } = e;
  return (
    <Link href={`/quests/${q.id}`}>
      <Card accent={q.category?.color} className="transition hover:border-accent/40">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{q.category?.icon}</span>
            <span className="font-semibold text-fg">{q.name}</span>
          </div>
          <Pill className="bg-surface-2 text-muted capitalize">{q.status}</Pill>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Metric label="Active days" value={`${stats.total_active_days}`} />
          <Metric label="Best stretch" value={`${stats.longest_streak}`} />
          {stats.completion_percent !== null && (
            <Metric label="Completion" value={`${stats.completion_percent}%`} />
          )}
          <Metric label="XP earned" value={`${stats.xp_total}`} />
        </div>

        {stats.strongest_topic && (
          <p className="mt-3 text-xs text-faint">
            Strongest area:{" "}
            <span className="text-muted">{stats.strongest_topic}</span>
          </p>
        )}

        {!e.has_retrospective && (
          <p className="mt-2 text-xs text-faint">
            ✍️ Narrative retrospective arrives in a later phase.
          </p>
        )}
      </Card>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-fg">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-faint">
        {label}
      </div>
    </div>
  );
}
