"use client";

/**
 * Tiny, quiet "moments of delight" layer. Logging fires a small toast (+XP,
 * streak milestone, freeze earned, level up). Never loud, never childish — a
 * soft card that rises, lingers, and fades. No guilt/failure toasts ever.
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export interface DelightMessage {
  id: number;
  title: string;
  sub?: string;
  icon?: string;
  tone?: "xp" | "streak" | "level" | "freeze" | "calm";
}

interface DelightContextValue {
  notify: (m: Omit<DelightMessage, "id">) => void;
}

const DelightContext = createContext<DelightContextValue | null>(null);

export function useDelight() {
  const ctx = useContext(DelightContext);
  if (!ctx) throw new Error("useDelight must be used within DelightProvider");
  return ctx;
}

const TONE_RING: Record<NonNullable<DelightMessage["tone"]>, string> = {
  xp: "border-accent/60",
  streak: "border-flame/60",
  level: "border-gold/60",
  freeze: "border-info/60",
  calm: "border-border",
};

export function DelightProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<DelightMessage[]>([]);
  const counter = useRef(0);

  const notify = useCallback((m: Omit<DelightMessage, "id">) => {
    const id = ++counter.current;
    setMessages((prev) => [...prev, { ...m, id }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  return (
    <DelightContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`ql-rise pointer-events-auto flex items-center gap-3 rounded-2xl border bg-elevated/95 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur ${
              TONE_RING[m.tone ?? "xp"]
            }`}
          >
            {m.icon && <span className="text-xl leading-none">{m.icon}</span>}
            <div className="leading-tight">
              <div className="text-sm font-semibold text-fg">{m.title}</div>
              {m.sub && <div className="text-xs text-muted">{m.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </DelightContext.Provider>
  );
}
