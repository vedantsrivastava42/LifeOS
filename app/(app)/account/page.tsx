"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToday } from "@/lib/query/hooks";
import { Button, Card } from "@/components/ui";

export default function AccountPage() {
  const router = useRouter();
  const { data } = useToday();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const level = data?.level;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">You</h1>
        <p className="mt-1 text-sm text-muted">{email}</p>
      </header>

      {level && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-faint">
                Level
              </div>
              <div className="text-3xl font-bold text-gold">{level.level}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-faint">
                Lifetime XP
              </div>
              <div className="text-3xl font-bold text-fg">
                {data?.lifetime_xp ?? 0}
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${Math.round(level.progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {level.toNext} XP to level {level.level + 1}
          </p>
        </Card>
      )}

      <Button variant="danger" onClick={signOut} className="w-full">
        Sign out
      </Button>

      <p className="px-1 text-center text-xs text-faint">
        QuestLog · calm, momentum-focused progress.
      </p>
    </div>
  );
}
