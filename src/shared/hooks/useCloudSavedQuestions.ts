import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SavedQuestion } from "@shared/components/exam/SavedQuestions";

const STORAGE_KEY = "savedQuestions";

function loadLocal(): SavedQuestion[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map((item: any) => ({
      ...item,
      type: item.type || "question",
    }));
  } catch { return []; }
}

function persistLocal(items: SavedQuestion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Merges localStorage saved questions with cloud `saved_questions` table.
 * Cloud is source of truth; localStorage serves as offline fallback.
 */
export function useCloudSavedQuestions(
  saved: SavedQuestion[],
  setSaved: (items: SavedQuestion[]) => void,
) {
  const userIdRef = useRef<string | null>(null);
  const syncedRef = useRef(false);

  // Initial sync: merge cloud + local
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userIdRef.current = user?.id ?? null;
      if (!user) return;

      const { data } = await supabase
        .from("saved_questions")
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();

      const cloudItems: SavedQuestion[] = Array.isArray(data?.data) ? (data.data as any) : [];
      const localItems = loadLocal();

      // Merge: deduplicate by id, prefer cloud version
      const map = new Map<string, SavedQuestion>();
      cloudItems.forEach((item: any) => map.set(item.id, item));
      localItems.forEach((item) => { if (!map.has(item.id)) map.set(item.id, item); });
      const merged = Array.from(map.values());

      persistLocal(merged);
      setSaved(merged);
      syncedRef.current = true;

      // If local had extra items, push merged back to cloud
      if (merged.length !== cloudItems.length) {
        await writeCloud(user.id, merged);
      }
    })();
  }, []);

  // Write to cloud whenever saved changes (after initial sync)
  const writeToCloud = useCallback(async (items: SavedQuestion[]) => {
    const uid = userIdRef.current;
    if (!uid) return;
    await writeCloud(uid, items);
    persistLocal(items);
  }, []);

  return { writeToCloud };
}

async function writeCloud(userId: string, items: SavedQuestion[]) {
  await supabase.from("saved_questions").upsert(
    {
      user_id: userId,
      data: items as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}
