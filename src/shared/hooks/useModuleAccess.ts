import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@shared/hooks/useAuth";

interface ModuleAccess {
  role: string;
  module_key: string;
  enabled: boolean;
}

export function useModuleAccess() {
  const [access, setAccess] = useState<ModuleAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    const { data } = await supabase
      .from("module_access")
      .select("role, module_key, enabled");
    setAccess((data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const canAccess = useCallback(
    (role: AppRole | null, moduleKey: string): boolean => {
      if (!role) return false;
      // Admins and super_admins always have full access
      if (role === "admin" || role === "super_admin") return true;
      const entry = access.find((a) => a.role === role && a.module_key === moduleKey);
      return entry?.enabled ?? false;
    },
    [access]
  );

  const updateAccess = useCallback(
    async (role: string, moduleKey: string, enabled: boolean) => {
      const { error } = await supabase
        .from("module_access")
        .update({ enabled, updated_at: new Date().toISOString() } as any)
        .eq("role", role as any)
        .eq("module_key", moduleKey);

      if (!error) {
        setAccess((prev) =>
          prev.map((a) =>
            a.role === role && a.module_key === moduleKey ? { ...a, enabled } : a
          )
        );
      }
      return { error };
    },
    []
  );

  const addModuleAccess = useCallback(
    async (role: string, moduleKey: string, enabled: boolean) => {
      const { error } = await supabase
        .from("module_access")
        .insert({ role, module_key: moduleKey, enabled } as any);

      if (!error) {
        setAccess((prev) => [...prev, { role, module_key: moduleKey, enabled }]);
      }
      return { error };
    },
    []
  );

  return { access, loading, canAccess, updateAccess, addModuleAccess, refetch: fetchAccess };
}
