"use client";

// The stale-factor demo: GET /demo/stale-factor?live=1 runs a real Tavily search and a model extraction (the API
// reuses a successful run for ten minutes, and falls back to its captured result, saying so, if either is down).
// Demo mode, or an unreachable API, uses the saved copy.

import saved from "@/fixtures/stale-factor.json";
import { INTELLIGENCE_URL, type StaleDemo } from "@/lib/dropwise";

const SAVED = saved as unknown as StaleDemo;

export async function fetchStale(live: boolean): Promise<{ demo: StaleDemo; source: "live" | "saved" }> {
  if (live) {
    try {
      const res = await fetch(`${INTELLIGENCE_URL}/demo/stale-factor?live=1`, { cache: "no-store", signal: AbortSignal.timeout(90_000) });
      if (res.ok) return { demo: (await res.json()) as StaleDemo, source: "live" };
    } catch {
      // fall back to the saved copy
    }
  }
  return { demo: SAVED, source: "saved" };
}
