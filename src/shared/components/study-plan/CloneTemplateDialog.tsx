import { useMemo, useState } from "react";
import { useTemplateMutations, type StudyPlanTemplate } from "@shared/hooks/useStudyPlanTemplates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Checkbox } from "@shared/components/ui/checkbox";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherAccessScope } from "@shared/hooks/useTeacherAccessScope";
import { Loader2, School, UserCheck, Calendar, Sparkles, Search, Filter, BookOpen, GraduationCap } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@shared/components/ui/breadcrumb";
import { usePrograms } from "@shared/hooks/usePrograms";
import { getProgramLabel } from "@shared/utils/programColors";

const DAYS = [
  { value: "mon", label: "T2" }, { value: "tue", label: "T3" }, { value: "wed", label: "T4" },
  { value: "thu", label: "T5" }, { value: "fri", label: "T6" }, { value: "sat", label: "T7" }, { value: "sun", label: "CN" },
];

/**
 * Một số chương trình (vd. Customized) không phân khoá học → bỏ filter khoá.
 * Có thể mở rộng danh sách này khi xuất hiện program tương tự.
 */
const PROGRAMS_WITHOUT_COURSE = new Set(["customized", "other"]);

interface Props {
  template: StudyPlanTemplate;
  teacherMode?: boolean;
  onClose: () => void;
}

export function CloneTemplateDialog({ template, teacherMode = false, onClose }: Props) {
  const { cloneTemplate } = useTemplateMutations();
  const { data: scope } = useTeacherAccessScope();
  const { programs } = usePrograms();

  const [tab, setTab] = useState<"class" | "student">("class");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [planNameOverride, setPlanNameOverride] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState<string[]>(template.schedule_pattern?.days || ["mon", "wed", "fri"]);
  const [autoFromClass, setAutoFromClass] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchClass, setSearchClass] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  // Resolve chương trình của template từ DB (an toàn hơn hardcode "IELTS"/"WRE"/"Customized")
  const tplProgramKey = (template.program || "").toLowerCase();
  const tplProgram = useMemo(
    () => programs.find((p) => p.key.toLowerCase() === tplProgramKey),
    [programs, tplProgramKey],
  );
  const programDbName = tplProgram?.name; // tên chuẩn ở cột classes.program
  const programHasCourse = tplProgramKey && !PROGRAMS_WITHOUT_COURSE.has(tplProgramKey);

  // Filters trong dialog: cho phép tắt từng filter để mở rộng phạm vi nếu cần
  const [filterByCourse, setFilterByCourse] = useState<boolean>(!!(template as any).course_id && programHasCourse);
  const [filterByLevel, setFilterByLevel] = useState<boolean>(!!template.assigned_level);

  // Levels thuộc course của template — dùng để OR-match `classes.level`
  // (vì classes hiện chưa có cột course_id, ta map qua course_level_links → course_levels.name).
  const { data: courseLevelNames = [] } = useQuery({
    queryKey: ["clone-course-level-names", (template as any).course_id],
    enabled: !!(template as any).course_id && programHasCourse,
    queryFn: async () => {
      const courseId = (template as any).course_id as string;
      const { data: links } = await (supabase as any)
        .from("course_level_links")
        .select("level_id")
        .eq("course_id", courseId);
      const levelIds = (links || []).map((l: any) => l.level_id);
      if (levelIds.length === 0) return [] as string[];
      const { data: lvs } = await (supabase as any)
        .from("course_levels")
        .select("name")
        .in("id", levelIds);
      return (lvs || []).map((l: any) => l.name as string);
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-clone", programDbName, teacherMode, scope?.teacherId, scope?.canViewAllClasses],
    queryFn: async () => {
      let q = (supabase as any).from("classes" as any).select("id, class_name, program, level, start_date, end_date, schedule").order("class_name");
      // Lọc theo program qua tên chuẩn từ bảng `programs` (không hardcode)
      if (programDbName) q = q.eq("program", programDbName);
      if (teacherMode && !scope?.canViewAllClasses && scope?.teacherId) q = q.eq("teacher_id", scope.teacherId);
      const { data } = await q;
      return data || [];
    },
  });

  // Lọc client-side theo course / level / search
  const filteredClasses = useMemo(() => {
    let arr = classes || [];
    if (filterByCourse && programHasCourse && courseLevelNames.length > 0) {
      const set = new Set(courseLevelNames);
      arr = arr.filter((c: any) => c.level && set.has(c.level));
    }
    if (filterByLevel && template.assigned_level) {
      arr = arr.filter((c: any) => c.level === template.assigned_level);
    }
    const q = searchClass.trim().toLowerCase();
    if (q) arr = arr.filter((c: any) => (c.class_name || "").toLowerCase().includes(q));
    return arr;
  }, [classes, filterByCourse, filterByLevel, programHasCourse, courseLevelNames, template.assigned_level, searchClass]);

  const { data: students } = useQuery({
    queryKey: ["students-clone", teacherMode, scope?.teacherId, scope?.canViewAllClasses],
    queryFn: async () => {
      if (teacherMode && !scope?.canViewAllClasses && scope?.teacherId) {
        const { data: tc } = await (supabase as any).from("classes" as any).select("id").eq("teacher_id", scope.teacherId);
        if (!tc || tc.length === 0) return [];
        const { data: cs } = await (supabase as any).from("class_students" as any).select("teachngo_student_id").in("class_id", tc.map(c => c.id));
        if (!cs) return [];
        const ids = [...new Set(cs.map(c => c.teachngo_student_id))];
        const { data } = await (supabase as any).from("synced_students" as any).select("teachngo_id, full_name").in("teachngo_id", ids).order("full_name");
        return data || [];
      }
      const { data } = await (supabase as any).from("synced_students" as any).select("teachngo_id, full_name").order("full_name");
      return data || [];
    },
  });

  const filteredStudents = useMemo(() => {
    const arr = students || [];
    const q = searchStudent.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((s: any) => (s.full_name || "").toLowerCase().includes(q));
  }, [students, searchStudent]);

  // When user picks a class with start/end date, auto-fill (if autoFromClass)
  const onPickClass = (id: string) => {
    setSelectedClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if (autoFromClass) {
      const cls = classes?.find(c => c.id === id);
      if (cls?.start_date) setStartDate(cls.start_date.split("T")[0]);
      if (cls?.end_date) setEndDate(cls.end_date.split("T")[0]);
    }
  };

  const toggleDay = (d: string) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSubmit = async () => {
    if (tab === "class" && selectedClassIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 lớp");
      return;
    }
    if (tab === "student" && selectedStudentIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 học viên");
      return;
    }
    setSubmitting(true);
    try {
      await cloneTemplate.mutateAsync({
        templateId: template.id,
        classIds: tab === "class" ? selectedClassIds : undefined,
        studentIds: tab === "student" ? selectedStudentIds : undefined,
        startDate,
        endDate: endDate || undefined,
        schedulePattern: { type: "weekly", days },
        planNameOverride: planNameOverride.trim() || undefined,
      });
      toast.success("Đã tạo kế hoạch từ mẫu");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <BreadcrumbPage>Gán mẫu</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gán mẫu: {template.template_name}
          </DialogTitle>
          <DialogDescription>
            Hệ thống sẽ tạo bản sao độc lập. Mọi chỉnh sửa sau này không ảnh hưởng đến mẫu gốc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tên kế hoạch (tuỳ chọn)</Label>
            <Input value={planNameOverride} onChange={e => setPlanNameOverride(e.target.value)} placeholder={template.template_name} />
          </div>

          <Tabs value={tab} onValueChange={v => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="class"><School className="w-3.5 h-3.5 mr-1" /> Theo lớp</TabsTrigger>
              <TabsTrigger value="student"><UserCheck className="w-3.5 h-3.5 mr-1" /> Theo học viên</TabsTrigger>
            </TabsList>

            <TabsContent value="class" className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-xs text-muted-foreground">Tất cả học viên trong lớp sẽ thấy kế hoạch này</p>
              {classes?.length === 0 && <p className="text-sm text-muted-foreground italic">Không có lớp phù hợp</p>}
              {classes?.map(c => (
                <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={selectedClassIds.includes(c.id)} onCheckedChange={() => onPickClass(c.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.class_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.level || "—"} {c.start_date && `· ${new Date(c.start_date).toLocaleDateString("vi-VN")}`}
                      {c.end_date && ` → ${new Date(c.end_date).toLocaleDateString("vi-VN")}`}
                    </p>
                  </div>
                </label>
              ))}
            </TabsContent>

            <TabsContent value="student" className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-xs text-muted-foreground">Chỉ các học viên được chọn mới thấy kế hoạch</p>
              {students?.map(s => (
                <label key={s.teachngo_id} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={selectedStudentIds.includes(s.teachngo_id)}
                    onCheckedChange={() => setSelectedStudentIds(prev => prev.includes(s.teachngo_id) ? prev.filter(x => x !== s.teachngo_id) : [...prev, s.teachngo_id])}
                  />
                  <span className="text-sm">{s.full_name}</span>
                </label>
              ))}
            </TabsContent>
          </Tabs>

          {tab === "class" && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={autoFromClass} onCheckedChange={v => setAutoFromClass(!!v)} />
              Tự động lấy ngày bắt đầu/kết thúc từ lịch lớp
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Ngày bắt đầu</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Ngày kết thúc (tuỳ chọn)</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Các thứ trong tuần học</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {DAYS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    days.includes(d.value) ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:border-primary/40"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{template.total_sessions} buổi</Badge>
              <Badge variant="outline">{template.session_duration}′/buổi</Badge>
              {template.program && <Badge variant="outline">{template.program.toUpperCase()}</Badge>}
            </div>
            <p className="text-muted-foreground mt-2">
              Hệ thống sẽ tự động trải {template.total_sessions} buổi vào các thứ đã chọn, bắt đầu từ {new Date(startDate).toLocaleDateString("vi-VN")}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Tạo kế hoạch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
