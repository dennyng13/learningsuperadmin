import { Download, ExternalLink, Pencil } from "lucide-react";
import { PopButton } from "@shared/components/ui/pop-button";
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Page head — reference skin */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--lp-body, #6B7280)", marginBottom: 6 }}>
            Học thuật · Band Descriptors · IELTS rubric
          </div>
          <h1 className="font-display" style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>
            Tiêu chí chấm{" "}
            <span style={{ color: "var(--lp-coral, #FA7D64)" }}>band điểm</span>
          </h1>
          <div style={{ fontSize: 13, color: "var(--lp-body, #6B7280)", marginTop: 4 }}>
            Hệ tiêu chí nội bộ — đồng bộ với IELTS public rubric · cập nhật 12/03/26 · áp dụng cho Mock Test, Speaking 1-1, Writing Lab
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PopButton tone="white" size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export PDF
          </PopButton>
          <PopButton tone="yellow" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Public IELTS rubric
          </PopButton>
          <PopButton tone="coral" size="sm">
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Sửa rubric nội bộ
          </PopButton>
        </div>
      </div>

      <AdminBandDescriptorsTab />
    </div>
  );
}