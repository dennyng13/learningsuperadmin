import { useState } from "react";
import { BookTemplate } from "lucide-react";
import AdminFeedbackTemplatesTab from "@admin/features/settings/components/AdminFeedbackTemplatesTab";

/**
 * Trang Mẫu nhận xét — tách khỏi Cài đặt, đưa vào nhóm Học thuật.
 * Wrap component cũ (`AdminFeedbackTemplatesTab`) với header thống nhất.
 */
export default function FeedbackTemplatesPage() {
  const [count, setCount] = useState<number | null>(null);
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Học thuật
        </p>
        <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
          <BookTemplate className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Mẫu nhận xét
          {count !== null && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono font-semibold text-muted-foreground">
              {count}
            </span>
          )}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Template nhận xét nhanh cho giáo viên khi chấm bài
        </p>
      </header>
      <AdminFeedbackTemplatesTab onCountChange={setCount} />
    </div>
  );
}