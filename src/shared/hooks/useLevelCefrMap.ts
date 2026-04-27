import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useLevelCefrMap — đọc bảng `level_cefr_map` (level_id ↔ CEFR) dùng chung khắp UI.
 *
 * 1 cấp độ có thể map nhiều CEFR (vd "Ra khơi 2" = B2 + C1). Hook trả về
 * Map<level_id, Cefr[]> với mảng đã sort theo thứ tự CEFR_ORDER (A1→C2) để
 * hiển thị nhất quán.
 *
 * Module-scoped cache + realtime sync — giống `useCourseLevels`. Mọi component
 * gọi hook chia sẻ 1 fetch và auto-refresh khi admin lưu thay đổi ở dialog
 * Map CEFR.
 */

export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const CEFR_ORDER: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const RANK: Record<Cefr, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

let cache = new Map<string, Cefr[]>();
let fetchPromise: Promise<void> | null = null;
let hasLoaded = false;
const subs = new Set<() => void>();

function notify() {
  subs.forEach((cb) => { try { cb(); } catch { /* noop */ } });
}

async function doFetch() {
  const { data, error } = await (supabase as any)
    .from("level_cefr_map")
    .select("level_id, cefr");
  const next = new Map<string, Cefr[]>();
  if (!error && Array.isArray(data)) {
    for (const row of data as Array<{ level_id: string; cefr: Cefr }>) {
      const arr = next.get(row.level_id) ?? [];
      arr.push(row.cefr);
      next.set(row.level_id, arr);
    }
    for (const arr of next.values()) arr.sort((a, b) => RANK[a] - RANK[b]);
  }
  cache = next;
  hasLoaded = true;
  notify();
}

function ensureFetched(): Promise<void> {
  if (!fetchPromise) fetchPromise = doFetch();
  return fetchPromise;
}

export async function refreshLevelCefrMap(): Promise<void> {
  fetchPromise = doFetch();
  return fetchPromise;
}

if (typeof window !== "undefined") {
  const channel = (supabase as any)
    .channel("level-cefr-map-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "level_cefr_map" },
      () => { refreshLevelCefrMap(); },
    )
    .subscribe();
  window.addEventListener("beforeunload", () => {
    try { (supabase as any).removeChannel(channel); } catch { /* noop */ }
  });
}

export function useLevelCefrMap() {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!hasLoaded);

  useEffect(() => {
    let mounted = true;
    const onChange = () => { if (mounted) setTick((t) => t + 1); };
    subs.add(onChange);
    ensureFetched().then(() => {
      if (!mounted) return;
      setLoading(false);
      setTick((t) => t + 1);
    });
    return () => {
      mounted = false;
      subs.delete(onChange);
    };
  }, []);

  return {
    /** Map<level_id, Cefr[]> — mảng đã sort A1→C2. */
    cefrByLevel: cache,
    loading,
    /** Helper: lấy Cefr[] cho 1 level (rỗng nếu chưa map). */
    getCefr: (levelId: string): Cefr[] => cache.get(levelId) ?? [],
    /** Helper: format hiển thị "B2 · C1" (rỗng nếu không có). */
    formatCefr: (levelId: string): string => (cache.get(levelId) ?? []).join(" · "),
    refetch: refreshLevelCefrMap,
  };
}