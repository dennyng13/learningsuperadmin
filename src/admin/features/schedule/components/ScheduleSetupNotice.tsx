import { AlertTriangle, FileCode2 } from "lucide-react";

export default function ScheduleSetupNotice({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-sm md:text-base">{title}</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            {message || "Chưa có bảng/flow availability trong DB dùng chung nên module mới đang ở chế độ chờ setup."}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
        <FileCode2 className="h-3.5 w-3.5 text-primary" />
        Apply assumption SQL tại <span className="font-mono text-foreground">docs/teacher-availability-flow-assumption.sql</span>
      </div>
    </div>
  );
}
