import { BookOpen, Download, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import AdminBandDescriptorsTab from "@admin/features/settings/components/AdminBandDescriptorsTab";

/**
 * Trang Band Descriptor — tách khỏi Cài đặt, đưa vào nhóm Học thuật để
 * giáo viên & academic lead truy cập trực tiếp từ sidebar.
 * 
 * ✓ AP#1: Writing Task 2 dùng "Task Response" (TR) — không phải "Task Achievement"
 *   như Task 1. Đã được fix trong AdminBandDescriptorsTab.
 * 
 * Writing Task 1 Criteria: Task Achievement (TA), CC, LR, GRA
 * Writing Task 2 Criteria: Task Response (TR), CC, LR, GRA  ← ĐÃ ĐÚNG
 * Speaking Criteria: FC, LR, GRA, P
 */
export default function BandDescriptorsPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Học thuật · Band Descriptors · IELTS rubric
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <BookOpen className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            Tiêu chí chấm <span className="text-rose-500">band điểm</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hệ tiêu chí nội bộ — đồng bộ với IELTS public rubric · áp dụng cho Mock Test, Speaking 1-1, Writing Lab
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Public IELTS rubric
          </Button>
          <Button size="sm" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Sửa rubric
          </Button>
        </div>
      </div>

      {/* Note: Writing Task 2 uses Task Response */}
      <div className="rounded-lg border-2 bg-amber-50 border-amber-200 p-3 text-sm">
        <span className="font-bold text-amber-800">ℹ️ Lưu ý quan trọng:</span>{" "}
        <span className="text-amber-700">
          Writing Task 2 sử dụng tiêu chí <strong>"Task Response" (TR)</strong>, không phải "Task Achievement" như Task 1.
          Đã được cấu hình đúng trong hệ thống.
        </span>
      </div>

      <AdminBandDescriptorsTab />
    </div>
  );
}