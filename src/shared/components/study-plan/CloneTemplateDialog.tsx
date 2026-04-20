import { useState } from "react";
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
import { useAuth } from "@shared/hooks/useAuth";
import { Loader2, School, UserCheck, Calendar, Sparkles } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@shared/components/ui/breadcrumb";

const DAYS = [
  { value: "mon", label: "T2" }, { value: "tue", label: "T3" }, { value: "wed", label: "T4" },
  { value: "thu", label: "T5" }, { value: "fri", label: "T6" }, { value: "sat", label: "T7" }, { value: "sun", label: "CN" },
];

interface Props {
  template: StudyPlanTemplate;
  teacherMode?: boolean;
  onClose: () => void;
}

export function CloneTemplateDialog({ template, teacherMode = false, onClose }: Props) {
  const { user } = useAuth();
  const { cloneTemplate } = useTemplateMutations();

  const [tab, setTab] = useState<"class" | "student">("class");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [planNameOverride, setPlanNameOverride] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState<string[]>(template.schedule_pattern?.days || ["mon", "wed", "fri"]);
  const [autoFromClass, setAutoFromClass] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: teacherRecord } = useQuery({
    queryKey: ["teacher-rec-clone", user?.id],
    enabled: teacherMode && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("id").eq("linked_user_id", user!.id).single();
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-clone", template.program, teacherMode, teacherRecord?.id],
    queryFn: async () => {
      let q = supabase.from("teachngo_classes").select("id, class_name, program, level, start_date, end_date, schedule").order("class_name");
      if (template.program) {
        const programNorm = template.program === "customized" ? "Customized" : template.program === "wre" ? "WRE" : "IELTS";
        q = q.eq("program", programNorm);
      }
      if (teacherMode && teacherRecord?.id) q = q.eq("teacher_id", teacherRecord.id);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: students } = useQuery({
    queryKey: ["students-clone", teacherMode, teacherRecord?.id],
    queryFn: async () => {
      if (teacherMode && teacherRecord?.id) {
        const { data: tc } = await supabase.from("teachngo_classes").select("id").eq("teacher_id", teacherRecord.id);
        if (!tc || tc.length === 0) return [];
        const { data: cs } = await supabase.from("teachngo_class_students").select("teachngo_student_id").in("class_id", tc.map(c => c.id));
        if (!cs) return [];
        const ids = [...new Set(cs.map(c => c.teachngo_student_id))];
        const { data } = await supabase.from("teachngo_students").select("teachngo_id, full_name").in("teachngo_id", ids).order("full_name");
        return data || [];
      }
      const { data } = await supabase.from("teachngo_students").select("teachngo_id, full_name").order("full_name");
      return data || [];
    },
  });

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
