/**
 * Shared time formatting utilities.
 *
 * Use these instead of defining ad-hoc formatTime / formatMinutes helpers
 * in individual components or pages.
 */

/** "3h 12m" or "12 phút" (Vietnamese) – for durations given in seconds. */
export function formatTimeVi(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} phút`;
}

/** "3m 45s" – compact English-style, for durations given in seconds. */
export function formatTimeCompact(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/** "3h 12m" or "12m" – for durations given in minutes. */
export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "02:30" MM:SS – for audio players / countdown timers. */
export function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
