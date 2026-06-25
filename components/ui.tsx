"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = "primary" | "ghost" | "soft" | "danger";
const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "gradient-accent text-on-accent font-semibold shadow-lg shadow-accent/30 hover:brightness-110 active:scale-[0.98]",
  ghost:
    "bg-transparent text-muted hover:text-fg hover:bg-surface-2 border border-border",
  soft: "bg-surface-2 text-fg hover:bg-elevated border border-border",
  danger:
    "bg-transparent text-danger hover:bg-danger/10 border border-danger/30",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${VARIANT[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
  accent,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: string | null;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface/80 p-5 backdrop-blur-sm ${
        glow ? "glow-accent" : "glow-soft"
      } ${className}`}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: accent }}
        />
      )}
      {children}
    </div>
  );
}

export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

/** Gradient XP/level progress bar. value 0..1. */
export function LevelBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-surface-2 ${className}`}
    >
      <div
        className="h-full rounded-full gradient-accent transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent ${className}`}
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  icon = "🌱",
  title,
  sub,
  action,
}: {
  icon?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="text-5xl opacity-90">{icon}</div>
      <div className="text-lg font-bold text-fg">{title}</div>
      {sub && <div className="max-w-xs text-sm text-muted">{sub}</div>}
      {action}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-bold uppercase tracking-[0.15em] text-faint">
      {children}
    </h2>
  );
}
