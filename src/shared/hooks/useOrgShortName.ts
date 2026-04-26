import { useEffect, useState } from "react";
import { getPartyASettings } from "@admin/features/contracts/hooks/useContracts";

/**
 * Trả về tên viết tắt của tổ chức (short_name) đã cấu hình tại
 * Cài đặt → Cấu hình chung. Fallback về "Learn+" nếu chưa có.
 *
 * Cache module-level để mọi component (sidebar, header, favicon) chia sẻ
 * cùng một lần fetch trong suốt session.
 */
let cached: string | null = null;
let inflight: Promise<string> | null = null;
const subscribers = new Set<(v: string) => void>();

const FALLBACK = "Learn+";

async function load(): Promise<string> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const settings = await getPartyASettings();
      const value = settings?.short_name?.trim() || FALLBACK;
      cached = value;
      subscribers.forEach((cb) => cb(value));
      return value;
    } catch {
      cached = FALLBACK;
      return FALLBACK;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Gọi sau khi user save settings để refresh tất cả nơi đang dùng */
export function refreshOrgShortName(next?: string) {
  if (next !== undefined) {
    cached = next?.trim() || FALLBACK;
    subscribers.forEach((cb) => cb(cached!));
    return;
  }
  cached = null;
  void load();
}

export function useOrgShortName(): string {
  const [value, setValue] = useState<string>(cached ?? FALLBACK);

  useEffect(() => {
    let mounted = true;
    const cb = (v: string) => {
      if (mounted) setValue(v);
    };
    subscribers.add(cb);
    void load().then((v) => mounted && setValue(v));
    return () => {
      mounted = false;
      subscribers.delete(cb);
    };
  }, []);

  return value;
}