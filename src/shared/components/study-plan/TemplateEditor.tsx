import { useState, useEffect, useMemo } from "react";
import { useTemplateMutations, useStudyPlanTemplate, type StudyPlanTemplate } from "@shared/hooks/useStudyPlanTemplates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Button } from "@shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Badge } from "@shared/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@shared/components/ui/breadcrumb";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { SessionCard, SESSION_TYPES } from "./SessionCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { usePrograms } from "@shared/hooks/usePrograms";
import { getProgramIcon, getProgramLabel } from "@shared/utils/programColors";

interface Props {
  template: Partial<StudyPlanTemplate> | {};
  onClose: () => void;
}

export function TemplateEditor({ template, onClose }: Props) {
  const tplId = (template as any)?.id as string | undefined;
  const isNew = !tplId;
  const { upsertTemplate, bulkUpsertEntries } = useTemplateMutations();
  const { data: loaded } = useStudyPlanTemplate(tplId || null);
  const { programs } = usePrograms();

  const [form, setForm] = useState({
    template_name: (template as any)?.template_name || "",
    description: (template as any)?.description || "",
    program: ((template as any)?.program || "").toLowerCase(),
    assigned_level: (template as any)?.assigned_level || "",
    plan_type: (template as any)?.plan_type || "structured",
    total_sessions: (template as any)?.total_sessions || 10,
    session_duration: (template as any)?.session_duration || 60,
    teacher_notes: (template as any)?.teacher_notes || "",
    skills: (template as any)?.skills || [],
    schedule_pattern: (template as any)?.schedule_pattern || { type: "weekly", days: ["mon", "wed", "fri"] },
  });
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Load entries from server when editing existing template
  useEffect(() => {
    if (loaded?.entries && !entriesLoaded) {
      setEntries(loaded.entries.map(e => ({
        session_order: e.session_order,
        day_offset: e.day_offset,
        session_type: e.session_type,
        skills: e.skills || [],
        homework: e.homework || "",
        class_note: e.class_note || "",
        class_note_files: e.class_note_files || [],
        class_note_visible: e.class_note_visible ?? true,
        links: e.links || [],
        exercise_ids: e.exercise_ids || [],
        flashcard_set_ids: e.flashcard_set_ids || [],
        assessment_ids: e.assessment_ids || [],
      })));
      setForm(f => ({
        ...f,
        template_name: loaded.template_name,
        description: loaded.description || "",
        program: (loaded.program || "ielts").toLowerCase(),
        assigned_level: loaded.assigned_level || "",
        plan_type: loaded.plan_type,
        total_sessions: loaded.total_sessions,
        session_duration: loaded.session_duration,
        teacher_notes: loaded.teacher_notes || "",
        skills: loaded.skills || [],
        schedule_pattern: loaded.schedule_pattern || { type: "weekly", days: ["mon", "wed", "fri"] },
      }));
      setEntriesLoaded(true);
    }
  }, [loaded, entriesLoaded]);

  // Chỉ lấy levels thuộc program đang ACTIVE — tránh lộ level của program đã ẩn.
  const { levels: courseLevels = [] } = useCourseLevels();

  /**
   * Default program selection.
   * - Khi đang tạo mới và chưa có `program` từ caller, ưu tiên program đầu tiên
   *   trong danh sách động (`programs`) để dropdown không hiển thị "—".
   * - Tránh ghi đè khi user đã chủ động chọn / hoặc khi đang edit (loaded sẽ
   *   set lại ở effect bên dưới).
   */
  useEffect(() => {
    if (isNew && !form.program && programs.length > 0) {
      setForm((f) => ({ ...f, program: programs[0].key.toLowerCase() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs, isNew]);

  /**
   * Levels filtered theo program đang chọn — qua bảng `program_levels`.
   * Ngăn admin gán nhầm level của program khác (vd. chọn IELTS nhưng pick
   * "WRE Beginner"). Trả về tên level (vì `assigned_level` lưu dạng text).
   */
  const selectedProgram = useMemo(
    () => programs.find((p) => p.key.toLowerCase() === form.program),
    [programs, form.program],
  );

  const { data: programLevelLinks = [] } = useQuery({
    queryKey: ["program-levels-for-template", selectedProgram?.id],
    enabled: !!selectedProgram?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("program_levels")
        .select("level_id, sort_order")
        .eq("program_id", selectedProgram!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{ level_id: string; sort_order: number }>;
    },
  });

  const programLevels = useMemo(() => {
    if (!form.program) return courseLevels;
    const order = new Map(programLevelLinks.map((l, i) => [l.level_id, l.sort_order ?? i]));
    return courseLevels
      .filter((l: any) => order.has(l.id))
      .sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [courseLevels, programLevelLinks, form.program]);

  /**
   * Khi đổi program, nếu `assigned_level` hiện tại không nằm trong danh sách
   * level của program mới → reset để tránh dữ liệu mồ côi.
   */
  useEffect(() => {
    if (!form.assigned_level || !form.program) return;
    if (programLevels.length === 0) return;
    const has = programLevels.some((l: any) => l.name === form.assigned_level);
    if (!has) {
      setForm((f) => ({ ...f, assigned_level: "" }));
    }
  }, [form.program, programLevels, form.assigned_level]);

  // Resources by program
  const { data: exercises } = useQuery({
    queryKey: ["exercises-tpl", form.program],
    queryFn: async () => {
      let q = supabase.from("practice_exercises").select("id, title, skill, course_level, program").eq("status", "published").order("title");
      if (form.program && form.program !== "customized") q = q.eq("program", form.program);
      const { data } = await q;
      return data || [];
    },
  });
  const { data: flashcardSets } = useQuery({
    queryKey: ["flashcards-tpl", form.program],
    queryFn: async () => {
      let q = supabase.from("flashcard_sets").select("id, title, course_level, program, description").eq("status", "published").order("title");
      if (form.program && form.program !== "customized") q = q.eq("program", form.program);
      const { data } = await q;
      return data || [];
    },
  });
  const { data: assessments } = useQuery({
    queryKey: ["assessments-tpl", form.program],
    queryFn: async () => {
      let q = supabase.from("assessments").select("id, name, section_type, course_level, program").eq("status", "published").order("name");
      if (form.program && form.program !== "customized") q = q.eq("program", form.program);
      const { data } = await q;
      return data || [];
    },
  });

  const addEntry = () => {
    setEntries(e => [...e, {
      session_order: e.length + 1,
      day_offset: null,
      session_type: "Study",
      skills: [],
      homework: "",
      class_note: "",
      class_note_files: [],
      class_note_visible: true,
      links: [],
      exercise_ids: [],
      flashcard_set_ids: [],
      assessment_ids: [],
    }]);
    setExpanded(entries.length);
  };

  const removeEntry = (idx: number) => {
    setEntries(es => es.filter((_, i) => i !== idx).map((e, i) => ({ ...e, session_order: i + 1 })));
  };

  const updateEntry = (idx: number, field: string, value: any) => {
    setEntries(es => es.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleSave = async () => {
    if (!form.template_name.trim()) {
      toast.error("Vui lòng nhập tên mẫu");
      return;
    }
    setSaving(true);
    try {
      const id = await upsertTemplate.mutateAsync({
        ...(tplId ? { id: tplId } : {}),
        ...form,
        total_sessions: Math.max(entries.length, form.total_sessions),
      } as any);
      await bulkUpsertEntries.mutateAsync({
        templateId: id,
        entries: entries.map((e, i) => ({ ...e, session_order: i + 1 })),
      });
      toast.success(isNew ? "Đã tạo mẫu mới" : "Đã lưu mẫu");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Kế hoạch học tập</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Mẫu kế hoạch</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{isNew ? "Tạo mẫu" : "Chỉnh sửa mẫu"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <DialogTitle className="flex items-center gap-2">
            {selectedProgram &&
              (() => {
                const Icon = getProgramIcon(selectedProgram.key);
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
            {isNew ? "Tạo mẫu kế hoạch mới" : "Chỉnh sửa mẫu"}
            {selectedProgram && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                {selectedProgram.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Mẫu là khuôn chung. Khi gán cho lớp/học viên, hệ thống sẽ tự sao chép thành kế hoạch độc lập.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header info */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Tên mẫu *</Label>
              <Input value={form.template_name} onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))} placeholder="VD: IELTS Foundation 30 buổi" />
            </div>
            <div className="md:col-span-2">
              <Label>Mô tả</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả ngắn về mẫu..." rows={2} />
            </div>
            <div>
              <Label>Chương trình</Label>
              <Select
                value={form.program || "__none"}
                onValueChange={(v) => setForm((f) => ({ ...f, program: v === "__none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chương trình" />
                </SelectTrigger>
                <SelectContent>
                  {programs.length === 0 && (
                    <SelectItem value="__none">— Không có chương trình —</SelectItem>
                  )}
                  {programs.map((p) => {
                    const Icon = getProgramIcon(p.key);
                    return (
                      <SelectItem key={p.id} value={p.key.toLowerCase()}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" /> {p.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Level
                {form.program && (
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                    (theo chương trình {getProgramLabel(form.program)})
                  </span>
                )}
              </Label>
              <Select
                value={form.assigned_level || "__none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, assigned_level: v === "__none" ? "" : v }))
                }
                disabled={!form.program}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.program ? "Chưa gán" : "Chọn chương trình trước"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Chưa gán</SelectItem>
                  {programLevels.map((l: any) => (
                    <SelectItem key={l.id} value={l.name}>
                      {l.name}
                      {l.cefr ? ` · ${l.cefr}` : ""}
                    </SelectItem>
                  ))}
                  {form.program && programLevels.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Chương trình này chưa có level nào.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Số buổi (tổng)</Label>
              <Input type="number" min={1} value={form.total_sessions} onChange={e => setForm(f => ({ ...f, total_sessions: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <Label>Thời lượng (phút/buổi)</Label>
              <Input type="number" min={15} step={15} value={form.session_duration} onChange={e => setForm(f => ({ ...f, session_duration: parseInt(e.target.value) || 60 }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Ghi chú giáo viên</Label>
              <Textarea value={form.teacher_notes} onChange={e => setForm(f => ({ ...f, teacher_notes: e.target.value }))} rows={2} />
            </div>
          </div>

          {/* Sessions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-bold">Các buổi học ({entries.length})</Label>
              <Button size="sm" onClick={addEntry}><Plus className="w-3.5 h-3.5 mr-1" /> Thêm buổi</Button>
            </div>
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={idx} className="relative group">
                  <SessionCard
                    entry={entry}
                    idx={idx}
                    isExpanded={expanded === idx}
                    onToggle={() => setExpanded(expanded === idx ? null : idx)}
                    onUpdate={(f, v) => updateEntry(idx, f, v)}
                    exercises={exercises}
                    flashcardSets={flashcardSets}
                    assessments={assessments}
                    selectedLevel={form.assigned_level}
                  />
                  <button
                    onClick={() => removeEntry(idx)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xoá buổi"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {entries.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                  Chưa có buổi nào — Nhấn "Thêm buổi" để bắt đầu
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : "Lưu mẫu"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
