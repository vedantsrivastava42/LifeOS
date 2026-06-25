"use client";

import { useId } from "react";

/** A glanceable, glowing progress ring. `value` is 0..1. */
export function ProgressRing({
  value,
  size = 76,
  stroke = 8,
  gradient = true,
  color = "var(--color-accent)",
  trackColor = "var(--color-surface-2)",
  glow = true,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  gradient?: boolean;
  color?: string;
  trackColor?: string;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dash = c * clamped;
  const strokeColor = gradient ? `url(#grad-${id})` : color;

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
          style={
            glow && clamped > 0
              ? { filter: "drop-shadow(0 0 6px rgba(124,92,255,0.55))" }
              : undefined
          }
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children}
      </div>
    </div>
  );
}
