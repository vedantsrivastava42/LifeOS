"use client";

import { useState } from "react";
import { useAiLog } from "@/lib/query/hooks";
import { useDelight } from "@/components/Delight";

export function AiLogBox() {
  const ai = useAiLog();
  const { notify } = useDelight();
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t || ai.isPending) return;
    ai.mutate(t, {
      onSuccess: (res) => {
        setText("");
        if (res.logged.length === 0) {
          notify({
            title: "Nothing matched",
            sub: "Try naming a quest or what you did",
            icon: "🤔",
            tone: "calm",
          });
          return;
        }
        notify({
          title: `+${res.total_xp} XP`,
          sub: res.logged.map((l) => l.quest).join(" · "),
          icon: "🪄",
          tone: "xp",
        });
      },
      onError: (e) => {
        notify({
          title: "Couldn't log that",
          sub: (e as Error)?.message ?? "Try again",
          icon: "⚠️",
          tone: "calm",
        });
      },
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface/60 px-3 py-2 focus-within:border-accent/50">
      <span className="text-lg">✍️</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="What did you do today? e.g. 3 DSA problems, gym"
        className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-faint"
      />
      <button
        onClick={submit}
        disabled={ai.isPending || !text.trim()}
        className="shrink-0 rounded-xl gradient-accent px-3.5 py-1.5 text-xs font-bold text-on-accent transition hover:brightness-110 disabled:opacity-40"
      >
        {ai.isPending ? "…" : "Log"}
      </button>
    </div>
  );
}
