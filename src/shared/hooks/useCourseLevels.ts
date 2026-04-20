import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CourseLevel {
  id: string;
  name: string;
  sort_order: number;
  color_key: string | null;
}

export function useCourseLevels() {
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLevels = useCallback(async () => {
    const { data } = await supabase
      .from("course_levels")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setLevels(data as unknown as CourseLevel[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  return { levels, loading, refetch: fetchLevels };
}
