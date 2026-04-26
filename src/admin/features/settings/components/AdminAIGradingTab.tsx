import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@shared/components/ui/card";
import { Switch } from "@shared/components/ui/switch";
import { Input } from "@shared/components/ui/input";
import { Loader2, Sparkles, Search, PenLine, Mic } from "lucide-react";
import { toast } from "sonner";

interface TeacherRow {
  id: string;
  full_name: string;
  email: string | null;
  can_use_ai_writing: boolean | null;
  can_use_ai_speaking: boolean | null;
}

type AiSkill = "writing" | "speaking";
const COL_BY_SKILL: Record<AiSkill, "can_use_ai_writing" | "can_use_ai_speaking"> = {
  writing: "can_use_ai_writing",
  speaking: "can_use_ai_speaking",
};

export default function AdminAIGradingTab() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // `${teacherId}:${skill}`
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from("teachers")
      .select("id, full_name, email, can_use_ai_writing, can_use_ai_speaking" as any)
      .eq("status", "active")
      .order("full_name");
    setTeachers((data as any[] | null) ?? []);
    setLoading(false);
  };

  const toggleSkill = async (teacherId: string, skill: AiSkill, enabled: boolean) => {
    const key = `${teacherId}:${skill}`;
    setSaving(key);
    const col = COL_BY_SKILL[skill];
    const { error } = await supabase
      .from("teachers")
      .update({ [col]: enabled, updated_at: new Date().toISOString() } as any)
      .eq("id", teacherId);

    if (error) {
      toast.error(error.message);
    } else {
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacherId ? { ...t, [col]: enabled } : t)),
      );
      toast.success(`Đã ${enabled ? "bật" : "tắt"} AI ${skill === "writing" ? "Writing" : "Speaking"}`);
    }
    setSaving(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.full_name.toLowerCase().includes(q) ||
        (t.email ?? "").toLowerCase().includes(q),
    );
  }, [teachers, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-primary/5 border-primary/10">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Cách hoạt động</p>
            <p className="text-muted-foreground mt-0.5">
              Cấp quyền độc lập cho từng kỹ năng. Khi bật, giáo viên sẽ thấy nút
              "Chấm bằng AI" trong form chấm điểm Writing / Speaking. AI tự động
              chấm theo tiêu chí IELTS và đề xuất nhận xét tiếng Việt — giáo viên
              vẫn xem lại và chỉnh sửa trước khi lưu.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold">
          Giáo viên ({filtered.length}{filtered.length !== teachers.length && `/${teachers.length}`})
        </h3>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email…"
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {teachers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Chưa có giáo viên nào trong hệ thống.</p>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Giáo viên</th>
                <th className="text-center px-4 py-3 font-medium min-w-[120px]">
                  <span className="inline-flex items-center gap-1.5">
                    <PenLine className="h-3.5 w-3.5" /> Writing
                  </span>
                </th>
                <th className="text-center px-4 py-3 font-medium min-w-[120px]">
                  <span className="inline-flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5" /> Speaking
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher) => (
                <tr key={teacher.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium truncate">{teacher.full_name}</p>
                    {teacher.email && (
                      <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                    )}
                  </td>
                  {(["writing", "speaking"] as AiSkill[]).map((skill) => {
                    const col = COL_BY_SKILL[skill];
                    const enabled = teacher[col] === true;
                    const isSaving = saving === `${teacher.id}:${skill}`;
                    return (
                      <td key={skill} className="px-4 py-3 text-center">
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                        ) : (
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => toggleSkill(teacher.id, skill, checked)}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Không tìm thấy giáo viên khớp “{search}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
