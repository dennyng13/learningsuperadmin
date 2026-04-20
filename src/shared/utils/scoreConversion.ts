import { supabase } from "@/integrations/supabase/client";

interface ConversionRow {
  min_marks: number;
  max_marks: number;
  band_score: number;
}

// Cache conversion tables in memory
const cache: Record<string, ConversionRow[]> = {};

/**
 * Load score conversion table for a skill (reading/listening) from DB.
 * Results are cached for the session.
 */
async function loadConversionTable(skill: string): Promise<ConversionRow[]> {
  if (cache[skill]) return cache[skill];

  const { data } = await supabase
    .from("score_conversion" as any)
    .select("min_marks, max_marks, band_score")
    .eq("skill", skill)
    .order("band_score", { ascending: false }) as any;

  if (data && data.length > 0) {
    cache[skill] = data;
    return data;
  }
  return [];
}

/**
 * Convert raw marks (correct answers) to IELTS band score
 * using the official conversion table stored in the database.
 *
 * Falls back to a percentage-based estimate if no conversion table is available.
 */
export async function marksToBandScore(
  correct: number,
  total: number,
  skill: "reading" | "listening"
): Promise<number> {
  const table = await loadConversionTable(skill);

  if (table.length > 0) {
    for (const row of table) {
      if (correct >= row.min_marks && correct <= row.max_marks) {
        return Number(row.band_score);
      }
    }
    // Below minimum in table
    return Number(table[table.length - 1].band_score);
  }

  // Fallback: percentage-based estimation
  return fallbackBandScore(correct, total);
}

/**
 * Synchronous fallback when DB table is not available.
 * Uses approximate percentage mapping.
 */
export function fallbackBandScore(correct: number, total: number): number {
  const pct = (correct / total) * 100;
  if (pct >= 97.5) return 9;
  if (pct >= 92.5) return 8.5;
  if (pct >= 87.5) return 8;
  if (pct >= 82.5) return 7.5;
  if (pct >= 75) return 7;
  if (pct >= 67.5) return 6.5;
  if (pct >= 57.5) return 6;
  if (pct >= 47.5) return 5.5;
  if (pct >= 37.5) return 5;
  if (pct >= 32.5) return 4.5;
  if (pct >= 25) return 4;
  if (pct >= 20) return 3.5;
  if (pct >= 15) return 3;
  if (pct >= 10) return 2.5;
  return 2;
}

/** Clear cache (e.g. after admin updates the conversion table) */
export function clearConversionCache() {
  Object.keys(cache).forEach(k => delete cache[k]);
}
