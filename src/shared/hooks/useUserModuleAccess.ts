import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";

/**
 * Per-user, per-module access control for the **admin portal**.
 *
 * Tách biệt với `module_access` (theo role, dùng cho student/teacher
 * portal). Bảng `user_module_access` cấp/thu hồi quyền cho TỪNG admin user
 * vào các module admin cụ thể (vd. admin-tests / admin-flashcards /
 * admin-study-plans).
 *
 * Quy tắc:
 *   • super_admin luôn bypass (return true).
 *   • admin: nếu chưa có row trong bảng → mặc định cho phép (back-compat
 *     với admin hiện hữu trước khi feature này tồn tại). Nếu có row →
 *     dùng `enabled`.
 *   • Role khác → false (không có khái niệm này ngoài portal admin).
 */

export const ADMIN_MODULE_KEYS = {
  TESTS: "admin-tests",
  FLASHCARDS: "admin-flashcards",
  STUDY_PLANS: "admin-study-plans",
} as const;

export type AdminModuleKey = typeof ADMIN_MODULE_KEYS[keyof typeof ADMIN_MODULE_KEYS];

export interface UserModuleAccessRow {
  user_id: string;
  module_key: string;
  enabled: boolean;
}

export const USER_MODULE_ACCESS_QUERY_KEY = ["user-module-access"] as const;

async function fetchAll(): Promise<UserModuleAccessRow[]> {
  const { data, error } = await (supabase as any)
    .from("user_module_access")
    .select("user_id, module_key, enabled");
  if (error) throw error;
  return (data ?? []) as UserModuleAccessRow[];
}

/* ─── Public hook for matrix admin ─── */
export function useUserModuleAccessMatrix() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading: loading, refetch } = useQuery({
    queryKey: USER_MODULE_ACCESS_QUERY_KEY,
    queryFn: fetchAll,
    staleTime: 60_000,
  });

  const isEnabled = useCallback(
    (userId: string, moduleKey: string) => {
      const row = rows.find((r) => r.user_id === userId && r.module_key === moduleKey);
      // Default ENABLED when no row exists — back-compat.
      return row?.enabled ?? true;
    },
    [rows],
  );

  const updateMutation = useMutation({
    mutationFn: async ({ userId, moduleKey, enabled }: { userId: string; moduleKey: string; enabled: boolean }) => {
      const { error } = await (supabase as any)
        .from("user_module_access")
        .upsert(
          { user_id: userId, module_key: moduleKey, enabled, updated_at: new Date().toISOString() },
          { onConflict: "user_id,module_key" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_MODULE_ACCESS_QUERY_KEY }),
  });

  const setEnabled = useCallback(
    async (userId: string, moduleKey: string, enabled: boolean) => {
      try {
        await updateMutation.mutateAsync({ userId, moduleKey, enabled });
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
    [updateMutation],
  );

  return { rows, loading, isEnabled, setEnabled, refetch };
}

/* ─── Hook for the current user — used by guards ─── */
export function useMyModuleAccess() {
  const { user, isSuperAdmin, isAdmin, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["user-module-access", "me", userId],
    queryFn: async () => {
      if (!userId) return [] as UserModuleAccessRow[];
      const { data, error } = await (supabase as any)
        .from("user_module_access")
        .select("user_id, module_key, enabled")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as UserModuleAccessRow[];
    },
    enabled: !!userId && isAdmin,
    staleTime: 60_000,
  });

  const canAccess = useCallback(
    (moduleKey: AdminModuleKey | string): boolean => {
      if (!userId) return false;
      if (isSuperAdmin) return true;
      if (!isAdmin) return false;
      const row = rows.find((r) => r.module_key === moduleKey);
      return row?.enabled ?? true; // default true = back-compat
    },
    [rows, isSuperAdmin, isAdmin, userId],
  );

  return { canAccess, loading: authLoading || isLoading };
}
