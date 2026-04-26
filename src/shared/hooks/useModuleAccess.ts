import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@shared/hooks/useAuth";

export interface ModuleAccessRow {
  role: string;
  module_key: string;
  enabled: boolean;
}

export const MODULE_ACCESS_QUERY_KEY = ["module-access"] as const;

async function fetchModuleAccess(): Promise<ModuleAccessRow[]> {
  const { data, error } = await supabase
    .from("module_access")
    .select("role, module_key, enabled");
  if (error) throw error;
  return (data as any[]) ?? [];
}

/**
 * Quản lý quyền truy cập **module** (feature-level).
 *
 * - `access`: toàn bộ rows (admin matrix UI cần).
 * - `canAccess(role, key)`: guard helper — admin/super_admin luôn có quyền.
 * - `updateAccess`: mutation upsert quyền cho 1 (role, module).
 *
 * Dùng React Query → cache 1 lần, mọi consumer share data, mutate invalidate
 * tự động. Pattern song song với `useStudentFieldAccess`.
 */
export function useModuleAccess() {
  const qc = useQueryClient();

  const { data: access = [], isLoading: loading, refetch } = useQuery({
    queryKey: MODULE_ACCESS_QUERY_KEY,
    queryFn: fetchModuleAccess,
    staleTime: 60_000,
  });

  const canAccess = useCallback(
    (role: AppRole | null, moduleKey: string): boolean => {
      if (!role) return false;
      if (role === "admin" || role === "super_admin") return true;
      const entry = access.find((a) => a.role === role && a.module_key === moduleKey);
      return entry?.enabled ?? false;
    },
    [access],
  );

  const updateMutation = useMutation({
    mutationFn: async ({ role, moduleKey, enabled }: { role: string; moduleKey: string; enabled: boolean }) => {
      // Upsert: row có thể chưa tồn tại (lần đầu cấp quyền cho role mới)
      const { data: existing } = await supabase
        .from("module_access")
        .select("role")
        .eq("role", role as any)
        .eq("module_key", moduleKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("module_access")
          .update({ enabled, updated_at: new Date().toISOString() } as any)
          .eq("role", role as any)
          .eq("module_key", moduleKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("module_access")
          .insert({ role, module_key: moduleKey, enabled } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MODULE_ACCESS_QUERY_KEY }),
  });

  const updateAccess = useCallback(
    async (role: string, moduleKey: string, enabled: boolean) => {
      try {
        await updateMutation.mutateAsync({ role, moduleKey, enabled });
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
    [updateMutation],
  );

  return { access, loading, canAccess, updateAccess, refetch };
}
