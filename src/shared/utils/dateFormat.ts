/**
 * Shared date formatting utilities.
 *
 * Standardize date display across admin: dd/MM/yyyy (zero-padded).
 * Per Day 6 user feedback: "Sessions date time format sẽ là dd/mm/yyyy. Thời gian
 * thì đi theo dạng 24h."
 *
 * Use these instead of:
 * - `d.toLocaleDateString("vi-VN")` — browser-default vi-VN may NOT zero-pad
 *   (returns "5/1/2026" in Chrome). Inconsistent across browsers.
 * - Raw YYYY-MM-DD strings displayed directly (backend ISO format, not user-friendly).
 * - Inline manual `String(d.getDate()).padStart(2, "0")` — duplicate logic.
 *
 * Input accepts both `Date` object và ISO string ("2026-05-01" hoặc full ISO).
 * Empty/invalid input → returns "—" (em-dash placeholder).
 */

import { format, parseISO, isValid } from "date-fns";
import { vi } from "date-fns/locale";

/** Coerce input to Date. Returns null nếu invalid. */
function toDate(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return isValid(input) ? input : null;
  if (typeof input !== "string" || input.trim() === "") return null;
  // YYYY-MM-DD strings — parse as LOCAL date (avoid TZ shift).
  // Full ISO strings (with T) — parseISO handles them correctly.
  const d = input.length === 10 ? new Date(input + "T00:00:00") : parseISO(input);
  return isValid(d) ? d : null;
}

/** "01/05/2026" — date-only display. */
export function formatDateDDMMYYYY(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  return format(d, "dd/MM/yyyy", { locale: vi });
}

/** "01/05/2026 14:30" — date + 24h time display. */
export function formatDateTimeDDMMYYYY(input: string | Date | null | undefined): string {
  const d = toDate(input);
  if (!d) return "—";
  return format(d, "dd/MM/yyyy HH:mm", { locale: vi });
}

/** "14:30" — 24h time-only display from HH:MM:SS or HH:MM string. */
export function formatTime24h(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  return timeStr.slice(0, 5);
}
