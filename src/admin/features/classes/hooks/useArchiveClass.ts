import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Archive / unarchive một lớp học.
 * - Archive = set lifecycle_status='archived' (lưu trữ toàn bộ history).
 * - Restore = quay về 'planning' (admin có thể đổi tay sang status khác sau).
 *
 * Backend trigger (nếu có) sẽ tự cập nhật `status_changed_at`. Nếu chưa có
 * trigger, hook tự set timestamp tại UI để counter chip cập nhật ngay.
 */
export function useArchiveClass() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      args: { id: string; action: "archive" | "restore"; reason?: string },
    ) => {
      const { id, action, reason } = args;
      const payload: Record<string, unknown> = {
        lifecycle_status: action === "archive" ? "archived" : "planning",
        status_changed_at: new Date().toISOString(),
      };
      // Reuse cancellation_reason làm note lưu trữ — schema chưa có cột riêng.
      if (action === "archive" && reason?.trim()) payload.cancellation_reason = reason.trim();

      const { error } = await (supabase as any)
        .from("teachngo_classes")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "archive" ? "Đã lưu trữ lớp" : "Đã khôi phục lớp");
      qc.invalidateQueries({ queryKey: ["admin-classes-list"] });
      qc.invalidateQueries({ queryKey: ["admin-classes-counts"] });
    },
    onError: (e: Error) => toast.error(`Thao tác thất bại: ${e.message}`),
  });
}
