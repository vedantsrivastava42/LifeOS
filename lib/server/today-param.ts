import type { NextRequest } from "next/server";
import { isDateStr, type DateStr } from "@/lib/domain/dates";

/**
 * The client is the source of truth for "what local day is it". It passes
 * ?today=yyyy-MM-dd; we fall back to the server's UTC day only if absent.
 */
export function readToday(req: NextRequest): DateStr {
  const t = req.nextUrl.searchParams.get("today");
  if (isDateStr(t)) return t;
  return new Date().toISOString().slice(0, 10);
}
