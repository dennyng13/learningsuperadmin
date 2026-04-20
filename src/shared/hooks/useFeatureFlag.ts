/**
 * useFeatureFlag — client SDK cho Feature Flags.
 *
 * Copy file này sang IELTS Practice và Teacher's Hub (cùng Supabase client).
 * Subscribe Realtime → cập nhật tức thì khi admin bật/tắt flag.
 *
 * Logic:
 *  1. Có override cho user hiện tại → dùng override.enabled
 *  2. Không có override → dùng flag.enabled global
 *  3. Nếu rollout_pct < 100 → hash(userId + key) % 100 < rollout_pct
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppKey = "ielts" | "teacher" | "shared";

interface FeatureFlag {
  id: string;
  key: string;
  app_key: AppKey;
  enabled: boolean;
  rollout_pct: number;
}

interface Override {
  flag_id: string;
  user_id: string;
  enabled: boolean;
}

/** In-memory cache, shared cho mọi hook instance trong 1 tab */
interface Cache {
  flags: Record<string, FeatureFlag>;       // keyed by flag.key
  overrides: Record<string, boolean>;       // keyed by flag.key (cho user hiện tại)
  userId: string | null;
  loaded: boolean;
  listeners: Set<() => void>;
}

const cache: Cache = { flags: {}, overrides: {}, userId: null, loaded: false, listeners: new Set() };
let initPromise: Promise<void> | null = null;

function notifyAll() {
  cache.listeners.forEach((l) => l());
}

async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    cache.userId = user?.id ?? null;

    const [{ data: flags }, overridesRes] = await Promise.all([
      supabase.from("feature_flags" as any).select("id, key, app_key, enabled, rollout_pct"),
      cache.userId
        ? supabase.from("feature_flag_overrides" as any).select("flag_id, enabled").eq("user_id", cache.userId)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    cache.flags = {};
    (flags || []).forEach((f: any) => { cache.flags[f.key] = f; });

    cache.overrides = {};
    const flagById: Record<string, string> = {};
    Object.values(cache.flags).forEach((f) => { flagById[f.id] = f.key; });
    (overridesRes.data || []).forEach((o: any) => {
      const k = flagById[o.flag_id];
      if (k) cache.overrides[k] = o.enabled;
    });

    cache.loaded = true;
    notifyAll();

    // Realtime: cập nhật tức thì
    supabase
      .channel("feature-flags-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, (payload: any) => {
        if (payload.eventType === "DELETE") {
          const row = payload.old;
          const entry = Object.entries(cache.flags).find(([, f]) => f.id === row.id);
          if (entry) delete cache.flags[entry[0]];
        } else {
          const row = payload.new as FeatureFlag;
          cache.flags[row.key] = row;
        }
        notifyAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flag_overrides" }, (payload: any) => {
        const row = (payload.new || payload.old) as any;
        if (!cache.userId || row.user_id !== cache.userId) return;
        const key = Object.values(cache.flags).find((f) => f.id === row.flag_id)?.key;
        if (!key) return;
        if (payload.eventType === "DELETE") delete cache.overrides[key];
        else cache.overrides[key] = row.enabled;
        notifyAll();
      })
      .subscribe();
  })();
  return initPromise;
}

/** Deterministic hash cho rollout percentage */
function hashPct(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

function resolve(key: string): boolean {
  const flag = cache.flags[key];
  if (!flag) return false;
  if (key in cache.overrides) return cache.overrides[key];
  if (!flag.enabled) return false;
  if (flag.rollout_pct >= 100) return true;
  if (!cache.userId) return flag.rollout_pct >= 100;
  return hashPct(cache.userId + ":" + key) < flag.rollout_pct;
}

/** Hook: trả về boolean (enabled/disabled) cho flag key */
export function useFeatureFlag(key: string): boolean {
  const [, setTick] = useState(0);
  useEffect(() => {
    init();
    const listener = () => setTick((t) => t + 1);
    cache.listeners.add(listener);
    return () => { cache.listeners.delete(listener); };
  }, []);
  return resolve(key);
}

/** Helper không cần hook (vd. trong service/util) — trả false nếu chưa init */
export function isFeatureEnabled(key: string): boolean {
  return cache.loaded ? resolve(key) : false;
}
