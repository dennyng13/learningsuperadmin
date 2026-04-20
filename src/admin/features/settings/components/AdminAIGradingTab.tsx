import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@shared/components/ui/card";
import { Switch } from "@shared/components/ui/switch";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";

interface TeacherRow {
  id: string;
  full_name: string;
  email: string | null;
  can_use_ai_grading: boolean | null;
}

export default function AdminAIGradingTab() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from("teachers")
      .select("id, full_name, email, can_use_ai_grading")
      .eq("status", "active")
      .order("full_name");
    setTeachers(data || []);
    setLoading(false);
  };

  const toggleTeacher = async (teacherId: string, enabled: boolean) => {
    setSaving(teacherId);
    const { error } = await supabase
      .from("teachers")
      .update({ can_use_ai_grading: enabled, updated_at: new Date().toISOString() })
      .eq("id", teacherId);

    if (error) {
      toast.error(error.message);
    } else {
      setTeachers(prev =>
        prev.map(t => t.id === teacherId ? { ...t, can_use_ai_grading: enabled } : t)
      );
      toast.success(enabled ? "Đã bật AI cho giáo viên" : "Đã tắt AI cho giáo viên");
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Chấm bài
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý quyền sử dụng tính năng chấm bài Writing bằng AI cho từng giáo viên.
          Super Admin luôn có quyền truy cập mặc định.
        </p>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/10">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Cách hoạt động</p>
            <p className="text-muted-foreground mt-0.5">
              Khi được bật, giáo viên sẽ thấy nút "Chấm bằng AI" trong form chấm điểm Writing.
              AI sẽ tự động chấm theo 4 tiêu chí IELTS (TA, CC, LR, GRA) và đề xuất nhận xét bằng tiếng Việt.
              Giáo viên có thể xem lại và chỉnh sửa trước khi lưu.
            </p>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3">
          Giáo viên ({teachers.length})
        </h3>
        {teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Chưa có giáo viên nào trong hệ thống.</p>
        ) : (
          <div className="space-y-1">
            {teachers.map(teacher => (
              <div
                key={teacher.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{teacher.full_name}</p>
                  {teacher.email && (
                    <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {teacher.can_use_ai_grading && (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  {saving === teacher.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={teacher.can_use_ai_grading === true}
                      onCheckedChange={(checked) => toggleTeacher(teacher.id, checked)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
