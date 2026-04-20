import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MockTestProgressRow {
  mock_test_id: string;
  skill: string;
  result_data: any;
  completed_at: string;
}

/**
 * Tracks per-skill completion of a mock test.
 * Uses DB for authenticated users, sessionStorage as guest fallback.
 */
export function useMockTestProgress(mockTestId: string | undefined) {
  const [progress, setProgress] = useState<Record<string, MockTestProgressRow>>({});
  const [loading, setLoading] = useState(true);

  // Fetch on mount
  useEffect(() => {
    if (!mockTestId) { setLoading(false); return; }

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("mock_test_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("mock_test_id", mockTestId);
        if (data) {
          const map: Record<string, MockTestProgressRow> = {};
          data.forEach((r: any) => { map[r.skill] = r; });
          setProgress(map);
        }
      } else {
        // Guest fallback: sessionStorage
        try {
          const raw = JSON.parse(sessionStorage.getItem(`mockProgress_${mockTestId}`) || "{}");
          setProgress(raw);
        } catch { /* empty */ }
      }
      setLoading(false);
    })();
  }, [mockTestId]);

  const isCompleted = useCallback((skill: string) => !!progress[skill], [progress]);

  const markCompleted = useCallback(async (skill: string, resultData: any) => {
    if (!mockTestId) return;

    const row: MockTestProgressRow = {
      mock_test_id: mockTestId,
      skill,
      result_data: resultData,
      completed_at: new Date().toISOString(),
    };

    setProgress((prev) => ({ ...prev, [skill]: row }));

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("mock_test_progress").upsert(
        { user_id: user.id, mock_test_id: mockTestId, skill, result_data: resultData },
        { onConflict: "user_id,mock_test_id,skill" }
      );
    } else {
      // Guest fallback
      const prev = JSON.parse(sessionStorage.getItem(`mockProgress_${mockTestId}`) || "{}");
      prev[skill] = row;
      sessionStorage.setItem(`mockProgress_${mockTestId}`, JSON.stringify(prev));
    }
  }, [mockTestId]);

  return { progress, loading, isCompleted, markCompleted };
}
