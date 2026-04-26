import { BookOpen } from "lucide-react";
import AdminBandDescriptorsTab from "@admin/features/settings/components/AdminBandDescriptorsTab";

/**
 * Trang Band Descriptor — tách khỏi Cài đặt, đưa vào nhóm Học thuật để
 * giáo viên & academic lead truy cập trực tiếp từ sidebar.
 * Logic giữ nguyên trong `AdminBandDescriptorsTab`, page chỉ wrap header.
 */
export default function BandDescriptorsPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Học thuật
        </p>
        <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
          <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Band Descriptor
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Tiêu chí band IELTS dùng cho chấm điểm Writing &amp; Speaking
        </p>
      </header>
      <AdminBandDescriptorsTab />
    </div>
  );
}