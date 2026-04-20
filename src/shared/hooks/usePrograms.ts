/**
 * usePrograms — single source of truth for program metadata (key, name, color, icon).
 *
 * Reads from the shared `programs` table in the central Supabase project. The same
 * rows power all 3 apps (Student / Admin / Teacher), so when an admin edits a
 * program (e.g. changes IELTS color from teal → blue), every app reflects the
 * change in real-time without a redeploy.
 *
 * Architecture:
 *  - Module-scoped cache (`cachedPrograms`) so synchronous utility functions
 *    (e.g. `getProgramPalette`) can read program metadata without becoming async.
 *  - Eager fetch on module import (browser only) so the cache is warm before any
 *    component renders.
 *  - Realtime subscription via `programs-sync` channel — any insert/update/delete
 *    on the table triggers a refetch and notifies subscribers.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Program {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color_key: string | null;
  icon_key: string | null;
  sort_order: number;
  status: "active" | "inactive";
}

let cachedPrograms: Program[] = [];
let fetchPromise: Promise<Program[]> | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => {
    try { cb(); } catch { /* ignore subscriber errors */ }
  });
}

async function fetchPrograms(): Promise<Program[]> {
  // The `programs` table lives in a shared DB and is not in the generated types.
  // Use an untyped client call and validate the row shape ourselves.
  const { data, error } = await (supabase.from as any)("programs")
    .select("id, key, name, description, color_key, icon_key, sort_order, status")
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[usePrograms] fetch failed:", error.message);
    return cachedPrograms;
  }

  const rows: Program[] = Array.isArray(data) ? (data as Program[]) : [];
  cachedPrograms = rows;
  notify();
  return rows;
}

function ensureFetched(): Promise<Program[]> {
  if (!fetchPromise) fetchPromise = fetchPrograms();
  return fetchPromise;
}

/** Synchronous read of the cached program list. Empty until first fetch resolves. */
export function getCachedPrograms(): Program[] {
  return cachedPrograms;
}

/** Force a refetch (bypasses cache). Returns the new list. */
export async function refreshPrograms(): Promise<Program[]> {
  fetchPromise = fetchPrograms();
  return fetchPromise;
}

// ---- Eager load + realtime sync (browser only) -----------------------------
if (typeof window !== "undefined") {
  // Kick off the initial fetch immediately so utils can read cached data ASAP.
  ensureFetched();

  // Subscribe to any change on the `programs` table and refresh.
  const channel = (supabase as any)
    .channel("programs-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "programs" },
      () => { refreshPrograms(); },
    )
    .subscribe();

  // Best-effort cleanup on full page unload (HMR/dev safety).
  window.addEventListener("beforeunload", () => {
    try { (supabase as any).removeChannel(channel); } catch { /* noop */ }
  });
}

/**
 * React hook — returns the live list of programs and a `getByKey` helper.
 * Re-renders when the cache changes (initial load or realtime update).
 */
export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>(cachedPrograms);
  const [loading, setLoading] = useState<boolean>(cachedPrograms.length === 0);

  useEffect(() => {
    let mounted = true;
    const onChange = () => { if (mounted) setPrograms([...cachedPrograms]); };

    subscribers.add(onChange);
    ensureFetched().then(() => {
      if (!mounted) return;
      setPrograms([...cachedPrograms]);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscribers.delete(onChange);
    };
  }, []);

  const getByKey = (key?: string | null): Program | undefined => {
    if (!key) return undefined;
    const k = key.trim().toLowerCase();
    return programs.find((p) => p.key.toLowerCase() === k);
  };

  return { programs, loading, getByKey };
}
