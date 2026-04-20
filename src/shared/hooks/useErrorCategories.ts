import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ErrorCategory {
  id: string;
  skill: string;
  key: string;
  label_vi: string;
  label_en: string;
  color_key: string | null;
  is_positive: boolean;
  sort_order: number;
}

/**
 * Fetch active error/feedback categories filtered by skill ('writing' | 'speaking').
 * Returns both error and positive categories. Caller can split by `is_positive`.
 */
export function useErrorCategories(skill: "writing" | "speaking") {
  const [categories, setCategories] = useState<ErrorCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("error_categories" as any)
        .select("*")
        .in("skill", [skill, "both"])
        .eq("is_active", true)
        .order("is_positive", { ascending: true })
        .order("sort_order", { ascending: true }) as any;

      if (!cancelled) {
        setCategories((data || []) as ErrorCategory[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [skill]);

  const errors = categories.filter(c => !c.is_positive);
  const positives = categories.filter(c => c.is_positive);
  return { categories, errors, positives, loading };
}
