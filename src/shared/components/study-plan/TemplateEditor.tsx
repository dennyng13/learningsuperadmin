import { useState, useEffect, useMemo } from "react";
import { useTemplateMutations, useStudyPlanTemplate, type StudyPlanTemplate } from "@shared/hooks/useStudyPlanTemplates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Button } from "@shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Badge } from "@shared/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { SessionCard, SESSION_TYPES } from "./SessionCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { useLevelCefrMap } from "@shared/hooks/useLevelCefrMap";
import { usePrograms } from "@shared/hooks/usePrograms";
import { getProgramIcon, getProgramLabel } from "@shared/utils/programColors";
import { useCourses } from "@/admin/features/academic/hooks/useCourses";
import { GraduationCap } from "lucide-react";
import { useAssignmentMapForResources } from "@shared/hooks/useResourceCourses";
import { Alert, AlertDescription, AlertTitle } from "@shared/components/ui/alert";

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
  const { formatCefr } = useLevelCefrMap();

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
    // "Khác" (other) không nằm trong bảng `programs` / `program_levels` →
    // không có pivot để filter. Cho phép admin chọn TOÀN BỘ levels để tránh
    // dropdown rỗng khi gán template ngoài 3 chương trình chính.
    if (form.program === "other") return courseLevels;
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

  // ------------------------------------------------------------------
  // Mismatch detection: when admin changes Program / Course, surface any
  // resources already pinned in `entries` that no longer fit the new scope.
  // ------------------------------------------------------------------
  const allExerciseIds = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.exercise_ids || []))),
    [entries],
  );
  const allFlashcardIds = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.flashcard_set_ids || []))),
    [entries],
  );
  const allAssessmentIds = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.assessment_ids || []))),
    [entries],
  );

  const { data: exMap = {} } = useAssignmentMapForResources("exercise", allExerciseIds);
  const { data: fcMap = {} } = useAssignmentMapForResources("flashcard_set", allFlashcardIds);
  const { data: asMap = {} } = useAssignmentMapForResources("assessment", allAssessmentIds);

  const mismatch = useMemo(() => {
    const exIds = new Set((exercises || []).map((r: any) => r.id));
    const fcIds = new Set((flashcardSets || []).map((r: any) => r.id));
    const asIds = new Set((assessments || []).map((r: any) => r.id));
    const programOff = {
      exercise: allExerciseIds.filter((id) => exercises && !exIds.has(id)),
      flashcard_set: allFlashcardIds.filter((id) => flashcardSets && !fcIds.has(id)),
      assessment: allAssessmentIds.filter((id) => assessments && !asIds.has(id)),
    };
    let courseOff: { exercise: string[]; flashcard_set: string[]; assessment: string[] } = {
      exercise: [],
      flashcard_set: [],
      assessment: [],
    };
    if (form.course_id) {
      const filt = (ids: string[], map: Record<string, string[]>) =>
        ids.filter((id) => {
          const courses = map[id] || [];
          // untagged is OK; only flag if assigned to OTHER courses (not the picked one)
          return courses.length > 0 && !courses.includes(form.course_id);
        });
      courseOff = {
        exercise: filt(allExerciseIds, exMap),
        flashcard_set: filt(allFlashcardIds, fcMap),
        assessment: filt(allAssessmentIds, asMap),
      };
    }
    const totalProgram =
      programOff.exercise.length + programOff.flashcard_set.length + programOff.assessment.length;
    const totalCourse =
      courseOff.exercise.length + courseOff.flashcard_set.length + courseOff.assessment.length;
    return { programOff, courseOff, totalProgram, totalCourse };
  }, [
    exercises,
    flashcardSets,
    assessments,
    allExerciseIds,
    allFlashcardIds,
    allAssessmentIds,
    exMap,
    fcMap,
    asMap,
    form.course_id,
  ]);

  const removeMismatched = (scope: "program" | "course") => {
    const target = scope === "program" ? mismatch.programOff : mismatch.courseOff;
    const exSet = new Set(target.exercise);
    const fcSet = new Set(target.flashcard_set);
    const asSet = new Set(target.assessment);
    setEntries((es) =>
      es.map((e) => ({
        ...e,
        exercise_ids: (e.exercise_ids || []).filter((id: string) => !exSet.has(id)),
        flashcard_set_ids: (e.flashcard_set_ids || []).filter((id: string) => !fcSet.has(id)),
        assessment_ids: (e.assessment_ids || []).filter((id: string) => !asSet.has(id)),
      })),
    );
    toast.success(
      `Đã gỡ ${
        target.exercise.length + target.flashcard_set.length + target.assessment.length
      } resource lệch ${scope === "program" ? "chương trình" : "khoá học"}`,
    );
  };

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
    if (!form.program) {
      toast.error("Vui lòng chọn Chương trình — Chương trình là bắt buộc.");
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
              <Label>
                Chương trình <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.program || "__none"}
                onValueChange={(v) => setForm((f) => ({ ...f, program: v === "__none" ? "" : v }))}
              >
                <SelectTrigger className={!form.program ? "border-destructive/60 ring-1 ring-destructive/20" : ""}>
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
              {!form.program && (
                <p className="text-[10px] text-destructive mt-1">
                  Bắt buộc — Cấp độ và Khoá học sẽ được fetch theo chương trình.
                </p>
              )}
            </div>
            <div>
              <Label>
                Level
                {form.program && form.program !== "other" && (
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                    (theo chương trình {getProgramLabel(form.program)})
                  </span>
                )}
                {form.program === "other" && (
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                    (hiển thị tất cả Level)
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
                      {(() => { const c = formatCefr(l.id); return c ? ` · ${c}` : ""; })()}
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
            <div className="md:col-span-2">
              {form.program === "other" ? (
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Chương trình "Khác" không có Khoá học. Bỏ qua bước gán khoá — chỉ chọn Level nếu cần.
                </div>
              ) : (
              <>
              <Label className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                Khoá học
                {form.program && (
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                    (theo chương trình {getProgramLabel(form.program)})
                  </span>
                )}
              </Label>
              <Select
                value={form.course_id || "__none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, course_id: v === "__none" ? "" : v }))
                }
                disabled={!form.program}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.program ? "Chưa gán khoá" : "Chọn chương trình trước"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Chưa gán khoá</SelectItem>
                  {programCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {form.program && programCourses.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Chương trình này chưa có khoá học nào.
                    </div>
                  )}
                </SelectContent>
              </Select>
              {form.course_id && (
                <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  Bài tập / flashcard sẽ được lọc theo khoá đã chọn — bài chưa gắn khoá nào sẽ hiện ở mục "Chưa phân loại".
                </p>
              )}
              </>
              )}
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

            {(mismatch.totalProgram > 0 || mismatch.totalCourse > 0) && (
              <div className="space-y-2 mb-3">
                {mismatch.totalProgram > 0 && (
                  <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900">
                    <AlertTriangle className="h-4 w-4 !text-amber-600" />
                    <AlertTitle className="text-sm">
                      {mismatch.totalProgram} resource không thuộc chương trình{" "}
                      <b>{getProgramLabel(form.program)}</b>
                    </AlertTitle>
                    <AlertDescription className="text-xs flex items-center justify-between gap-3 mt-1">
                      <span>
                        Các bài tập / flashcard / đề thi đã gán trước đây nay không còn xuất hiện trong danh sách của
                        chương trình mới. Học viên sẽ không thấy chúng.
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-400 text-amber-900 hover:bg-amber-100"
                        onClick={() => removeMismatched("program")}
                      >
                        Gỡ {mismatch.totalProgram} resource lệch
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {mismatch.totalCourse > 0 && (
                  <Alert className="border-orange-300 bg-orange-50 text-orange-900">
                    <AlertTriangle className="h-4 w-4 !text-orange-600" />
                    <AlertTitle className="text-sm">
                      {mismatch.totalCourse} resource đã gán cho khoá khác
                    </AlertTitle>
                    <AlertDescription className="text-xs flex items-center justify-between gap-3 mt-1">
                      <span>
                        Resource này được tag cho khoá học khác — không khớp khoá hiện tại. Bạn có thể gỡ hoặc giữ lại
                        nếu muốn dùng chéo khoá.
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-400 text-orange-900 hover:bg-orange-100"
                        onClick={() => removeMismatched("course")}
                      >
                        Gỡ {mismatch.totalCourse} resource lệch khoá
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

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
                    courseId={form.course_id || null}
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
