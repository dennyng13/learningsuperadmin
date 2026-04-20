import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserAnswers } from "@shared/types/exam";

const AUTOSAVE_INTERVAL_MS = 30_000;

export interface AutosaveState {
  answers: UserAnswers;
  currentPart: number;
  timeRemaining: number;
}

/**
 * Autosaves exam state every 30s to `exam_autosave` table.
 * On mount, checks for existing autosave and exposes it via `pendingRestore`.
 */
export function useExamAutosave(assessmentId: string | undefined) {
  const [pendingRestore, setPendingRestore] = useState<AutosaveState | null>(null);
  const [checked, setChecked] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Check for existing autosave on mount
  useEffect(() => {
    if (!assessmentId) { setChecked(true); return; }

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userIdRef.current = user?.id ?? null;
      if (!user) { setChecked(true); return; }

      const { data } = await supabase
        .from("exam_autosave")
        .select("answers, current_part, time_remaining")
        .eq("user_id", user.id)
        .eq("assessment_id", assessmentId)
        .maybeSingle();

      if (data) {
        setPendingRestore({
          answers: (data.answers as any) || {},
          currentPart: data.current_part ?? 0,
          timeRemaining: data.time_remaining ?? 0,
        });
      }
      setChecked(true);
    })();
  }, [assessmentId]);

  const save = useCallback(async (state: AutosaveState) => {
    const uid = userIdRef.current;
    if (!uid || !assessmentId) return;

    await supabase.from("exam_autosave").upsert(
      {
        user_id: uid,
        assessment_id: assessmentId,
        answers: state.answers as any,
        current_part: state.currentPart,
        time_remaining: state.timeRemaining,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,assessment_id" }
    );
  }, [assessmentId]);

  const clear = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || !assessmentId) return;
    await supabase.from("exam_autosave")
      .delete()
      .eq("user_id", uid)
      .eq("assessment_id", assessmentId);
    setPendingRestore(null);
  }, [assessmentId]);

  const dismissRestore = useCallback(() => setPendingRestore(null), []);

  // Periodic autosave hook
  const useAutosaveInterval = (
    answers: UserAnswers,
    currentPart: number,
    timeRemaining: number,
    isActive: boolean
  ) => {
    const stateRef = useRef({ answers, currentPart, timeRemaining });
    stateRef.current = { answers, currentPart, timeRemaining };

    useEffect(() => {
      if (!isActive || !assessmentId) return;
      const interval = setInterval(() => {
        save(stateRef.current);
      }, AUTOSAVE_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [isActive]);
  };

  return { pendingRestore, checked, save, clear, dismissRestore, useAutosaveInterval };
}
