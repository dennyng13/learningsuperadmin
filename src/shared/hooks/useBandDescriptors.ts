import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Load band descriptors for a skill + optional task type. Returns map of "criteria:band" → description */
export function useBandDescriptors(skill: string, taskType?: string) {
  const [descriptors, setDescriptors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!skill) return;

    let query = supabase
      .from("band_descriptors" as any)
      .select("criteria,band,description,task_type")
      .eq("skill", skill) as any;

    if (skill === "writing" && taskType) {
      query = query.eq("task_type", taskType);
    } else if (skill === "speaking") {
      query = query.eq("task_type", "general");
    }

    query.then(({ data }: any) => {
      if (data) {
        const map: Record<string, string> = {};
        for (const d of data) map[`${d.criteria}:${d.band}`] = d.description;
        setDescriptors(map);
      }
    });
  }, [skill, taskType]);

  return descriptors;
}
