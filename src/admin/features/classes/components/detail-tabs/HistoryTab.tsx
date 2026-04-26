import { History as HistoryIcon } from "lucide-react";
import ClassStatusBadge from "@shared/components/admin/ClassStatusBadge";
import type { ClassDetail } from "@admin/features/classes/components/ClassInfoCard";

/**
 * Tab "Lịch sử" — placeholder timeline dựng từ thông tin có sẵn trên
 * teachngo_classes (status_changed_at + cancellation_reason). Khi backend
 * `class_status_history` sẵn sàng, swap query và render full audit trail.
 */
export function HistoryTab({ cls }: { cls: ClassDetail }) {
  const events: Array<{ ts: string; label: string; node?: React.ReactNode; reason?: string | null }> = [];

  if (cls.status_changed_at && cls.lifecycle_status) {
    events.push({
      ts: cls.status_changed_at,
      label: "Đổi trạng thái sang",
      node: <ClassStatusBadge status={cls.lifecycle_status} size="sm" />,
      reason: cls.cancellation_reason ?? null,
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-800 dark:text-amber-300">
        Bảng <code className="font-mono">class_status_history</code> chưa có
        trong backend. Hiện tại chỉ hiện sự kiện cuối cùng dựa trên cột
        <code className="font-mono"> status_changed_at</code>.
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center space-y-2">
          <HistoryIcon className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chưa có thay đổi trạng thái nào được ghi nhận.</p>
        </div>
      ) : (
        <ol className="relative border-l border-border ml-3 space-y-4">
          {events.map((e, i) => (
            <li key={i} className="ml-4">
              <div className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-[11px] text-muted-foreground">
                {new Date(e.ts).toLocaleString("vi-VN")}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm">{e.label}</span>
                {e.node}
              </div>
              {e.reason && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Lý do: {e.reason}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
