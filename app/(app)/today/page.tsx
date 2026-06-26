"use client";

import Link from "next/link";
import { useToday } from "@/lib/query/hooks";
import { QuestCard } from "@/components/QuestCard";
import { AiLogBox } from "@/components/AiLogBox";
import { EmptyState, LevelBar, LinkButton, Spinner } from "@/components/ui";
import { format } from "date-fns";

export default function TodayPage() {
  const { data, isLoading, isError, error } = useToday();
  const welcomeBack = data?.quests.some((q) => q.streak?.needs_welcome_back);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface/70 p-5 glow-soft">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full opacity-30 blur-3xl gradient-accent"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-faint">
            {format(new Date(), "EEEE · MMM d")}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Today</h1>
          {data && <p className="mt-0.5 text-sm text-muted">{data.greeting}</p>}

          {data && (
            <Link href="/insights" className="mt-5 block">
              <div className="mb-1.5 flex items-end justify-between">
                <span className="flex items-baseline gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-faint">
                    Level
                  </span>
                  <span className="text-2xl font-extrabold text-gradient">
                    {data.level.level}
                  </span>
                </span>
                <span className="text-sm font-semibold text-gold">
                  +{data.total_today_xp} XP today
                </span>
              </div>
              <LevelBar value={data.level.progress} />
              <div className="mt-1 flex justify-between text-[11px] text-faint">
                <span>{data.lifetime_xp} XP total</span>
                <span className="text-accent">View insights →</span>
              </div>
            </Link>
          )}
        </div>
      </header>

      {welcomeBack && (
        <div className="rounded-[var(--radius-card)] border border-info/40 bg-info/10 p-4">
          <p className="font-bold text-info">Welcome back 👋</p>
          <p className="mt-1 text-sm text-info/90">
            You stepped away for a bit — totally fine. Here&apos;s where things
            stand. Just pick one thing to log today.
          </p>
        </div>
      )}

      {/* AI natural-language logging */}
      <AiLogBox />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {(error as Error)?.message ?? "Couldn't load today."}
        </div>
      )}

      {data && data.quests.length === 0 && (
        <EmptyState
          icon="🌱"
          title="Nothing on today"
          sub="A calm day is fine. When you're ready, start a quest to begin building momentum."
          action={<LinkButton href="/quests/new">Start a quest</LinkButton>}
        />
      )}

      <div className="space-y-3">
        {data?.quests.map((q) => (
          <QuestCard key={q.id} s={q} />
        ))}
      </div>
    </div>
  );
}
