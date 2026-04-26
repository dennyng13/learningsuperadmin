import { ConstructionIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  /** Mô tả chức năng sẽ có khi backend hoàn thiện. */
  description: string;
  /** Checklist các table/RPC backend cần để bật tab này. */
  checklist?: string[];
}

/**
 * Placeholder dùng cho các tab chưa có backend (Sessions / Students /
 * Plan Progress / Activity / Leaderboard). Hiển thị thông báo rõ ràng
 * cho admin biết phần này đang trong giai đoạn xây dựng và liệt kê đúng
 * những gì còn thiếu — tránh cảm giác "trống không hiểu vì sao".
 */
export function BackendPendingTab({ icon: Icon = ConstructionIcon, title, description, checklist }: Props) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-6 sm:p-8 text-center space-y-3">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-display text-base font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {checklist && checklist.length > 0 && (
        <div className="mt-4 mx-auto max-w-sm text-left rounded-lg border bg-background p-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Backend còn cần
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {checklist.map((c) => (
              <li key={c} className="flex items-start gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                <span className="font-mono text-[11px]">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
