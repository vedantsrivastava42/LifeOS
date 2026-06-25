"use client";

import Link from "next/link";
import { useCategories, useQuests } from "@/lib/query/hooks";
import {
  EmptyState,
  LinkButton,
  Pill,
  SectionTitle,
  Spinner,
} from "@/components/ui";
import type { QuestSummary } from "@/lib/api/types";

export default function QuestsPage() {
  const quests = useQuests("active");
  const cats = useCategories();

  const byCategory = new Map<string, QuestSummary[]>();
  for (const q of quests.data?.quests ?? []) {
    const key = q.category?.id ?? "uncategorized";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(q);
  }
  const categories = cats.data?.categories ?? [];
  const ordered = categories.filter((c) => byCategory.has(c.id));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quests</h1>
        <LinkButton href="/quests/new" variant="soft" className="!py-2">
          + New
        </LinkButton>
      </header>

      {quests.isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {quests.data && quests.data.quests.length === 0 && (
        <EmptyState
          icon="🧭"
          title="No active quests"
          sub="Pick something you're working toward — DSA, the gym, settling into a new city — and start tracking it."
          action={<LinkButton href="/quests/new">Create your first quest</LinkButton>}
        />
      )}

      {ordered.map((cat) => (
        <section key={cat.id} className="space-y-2">
          <SectionTitle>
            <span className="mr-1">{cat.icon}</span>
            {cat.name}
          </SectionTitle>
          <div className="space-y-2">
            {byCategory.get(cat.id)!.map((q) => (
              <QuestRow key={q.id} q={q} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  streak: "Streak",
  target: "Target",
  milestone: "Milestone",
};

function QuestRow({ q }: { q: QuestSummary }) {
  return (
    <Link
      href={`/quests/${q.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-accent/40"
      style={
        q.category?.color
          ? { boxShadow: `inset 3px 0 0 0 ${q.category.color}` }
          : undefined
      }
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-fg">{q.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
          <Pill className="bg-surface-2 text-muted">{TYPE_LABEL[q.type]}</Pill>
          {q.type === "streak" && q.streak && (
            <span className="text-flame">🔥 {q.streak.current}</span>
          )}
          {q.type === "target" && q.progress && (
            <span>
              {q.progress.done}/{q.progress.target} · {q.progress.percent}%
            </span>
          )}
          {q.type === "milestone" && q.checklist && (
            <span>
              {q.checklist.filter((i) => i.is_done).length}/{q.checklist.length}{" "}
              done
            </span>
          )}
        </div>
      </div>
      <span className="text-sm font-semibold text-faint">{q.xp_total} XP</span>
    </Link>
  );
}
