import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";
import { Download, Loader2, FileText, Users, Layers, Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ExportItem {
  key: string;
  label: string;
  description: string;
  icon: any;
  table: string;
  columns?: string;
}

const EXPORT_ITEMS: ExportItem[] = [
  {
    key: "assessments",
    label: "Bài thi (Assessments)",
    description: "Tất cả đề thi đã tạo, bao gồm parts, passages, question_groups, questions",
    icon: FileText,
    table: "assessments",
    columns: "id, name, section_type, status, book_name, duration, total_questions, created_at",
  },
  {
    key: "test_results",
    label: "Kết quả thi",
    description: "Toàn bộ kết quả thi của học viên",
    icon: CheckCircle2,
    table: "test_results",
    columns: "id, user_id, assessment_id, assessment_name, section_type, score, correct_answers, total_questions, time_spent, created_at",
  },
  {
    key: "practice_exercises",
    label: "Bài tập luyện",
    description: "Tất cả bài tập đã tạo kèm câu hỏi",
    icon: Layers,
    table: "practice_exercises",
    columns: "id, title, skill, question_type, difficulty, status, created_at",
  },
  {
    key: "profiles",
    label: "Hồ sơ học viên",
    description: "Thông tin tài khoản, mục tiêu IELTS, nguồn giới thiệu",
    icon: Users,
    table: "profiles",
    columns: "id, full_name, phone, organization, target_ielts, referral_source, referral_code, created_at",
  },
  {
    key: "badges",
    label: "Huy hiệu & trao thưởng",
    description: "Danh sách huy hiệu và lịch sử trao",
    icon: Award,
    table: "badges",
    columns: "id, name, description, tier, criteria_type, status, created_at",
  },
];

function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    toast.error("Không có dữ liệu để xuất");
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = typeof val === "object" ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data: any[], filename: string) {
  if (!data || data.length === 0) {
    toast.error("Không có dữ liệu để xuất");
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminBackupTab() {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (item: ExportItem, format: "csv" | "json") => {
    setExporting(`${item.key}-${format}`);
    try {
      let query = supabase.from(item.table as any).select(item.columns || "*");
      const { data, error } = await query;
      if (error) throw error;

      if (format === "csv") {
        downloadCSV(data as any[], item.key);
      } else {
        downloadJSON(data as any[], item.key);
      }
      toast.success(`Đã xuất ${item.label} thành công!`);
    } catch (err: any) {
      toast.error(`Lỗi xuất dữ liệu: ${err.message}`);
    }
    setExporting(null);
  };

  const handleExportAll = async () => {
    setExporting("all");
    try {
      const allData: Record<string, any[]> = {};
      for (const item of EXPORT_ITEMS) {
        const { data } = await supabase.from(item.table as any).select(item.columns || "*");
        allData[item.key] = (data as any[]) || [];
      }
      downloadJSON(
        [{ exported_at: new Date().toISOString(), tables: allData }],
        "full_backup"
      );
      toast.success("Đã xuất toàn bộ dữ liệu!");
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Sao lưu dữ liệu</h2>
          <p className="text-sm text-muted-foreground">
            Xuất dữ liệu ra file CSV hoặc JSON để lưu trữ an toàn
          </p>
        </div>
        <Button onClick={handleExportAll} disabled={!!exporting} variant="primary">
          {exporting === "all" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          Xuất tất cả (JSON)
        </Button>
      </div>

      <div className="grid gap-4">
        {EXPORT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(item, "csv")}
                  disabled={!!exporting}
                >
                  {exporting === `${item.key}-csv` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-1" /> CSV
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(item, "json")}
                  disabled={!!exporting}
                >
                  {exporting === `${item.key}-json` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-1" /> JSON
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 bg-muted/30 border-dashed">
        <p className="text-sm text-muted-foreground">
           <strong>Lưu ý:</strong> Nên sao lưu định kỳ (hàng tuần hoặc hàng tháng). File JSON chứa đầy đủ cấu trúc dữ liệu, 
          CSV phù hợp để mở bằng Excel. Dữ liệu xuất ra chỉ bao gồm thông tin bạn có quyền truy cập.
        </p>
      </Card>
    </div>
  );
}
