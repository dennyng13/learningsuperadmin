import { useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, EyeOff, Layers, Loader2, Pencil, Plus,
  School, Users, Wallet, Target, GraduationCap, TrendingUp,
  ChevronRight, MoreHorizontal, Search, BookText, Volume2,
  Sparkles, ClipboardList, ArrowRight, Users2, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Progress } from "@shared/components/ui/progress";
import {
  useCoursesAdmin,
  type CourseProgramInput,
} from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { useCourses, type Course, type CourseInput } from "@admin/features/academic/hooks/useCourses";
import ProgramLevelManager from "@admin/features/academic/components/ProgramLevelManager";
import CourseCard from "@admin/features/academic/components/CourseCard";
import CourseEditorDialog from "@admin/features/academic/components/CourseEditorDialog";
import ProgramEditorDialog from "@admin/features/academic/components/ProgramEditorDialog";
import { getProgramIcon, getProgramPalette, getProgramEmoji } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

interface CohortData {
  name: string;
  enrolled: number;
  completed: number | string;
  avgLift: number | string;
  status: 'graduated' | 'active';
}

interface FunnelStage {
  stage: string;
  count: number;
  color: string;
}

interface TeacherData {
  name: string;
  role: string;
  color: string;
  classes: number;
  rating: number;
  initials: string;
}

/**
 * /courses/programs/:key — chi tiết 1 chương trình (mô tả, đầu ra, cấp độ, khoá học gắn).
 * Dùng khi user click "Chi tiết" trong tab program ở /courses, hoặc gõ trực tiếp URL.
 */
export default function ProgramDetailPage() {
  const { key = "" } = useParams<{ key: string }>();
  const { programs, loading: programsLoading, refetch, update: updateProgram } = useCoursesAdmin();
  const { levels, refetch: refetchLevels } = useCourseLevels({ includeOrphans: true });

  /* ─── Tab state ─── */
  const [activeTab, setActiveTab] = useState("curriculum");

  const program = useMemo(
    () => programs.find((p) => p.key.toLowerCase() === key.toLowerCase()),
    [programs, key],
  );
  const {
    courses, loading: coursesLoading,
    getStats, getStudyPlanNames, create, update, remove, updateStudyPlans,
  } = useCourses({ programId: program?.id, withStats: true });

  /* ─── Program editor (inline) ─── */
  const [programEditorOpen, setProgramEditorOpen] = useState(false);
  const handleProgramSubmit = async (input: CourseProgramInput) => {
    if (!program) return;
    await updateProgram(program.id, input);
    await refetch();
  };

  /* ─── Course editor ─── */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (c: Course) => { setEditing(c); setEditorOpen(true); };

  const handleSubmit = async (input: CourseInput) => {
    if (editing) await update(editing.id, input);
    else await create(input);
  };

  const handleDelete = async (c: Course) => {
    try {
      await remove(c.id);
      toast.success(`Đã xoá khoá học "${c.name}".`);
    } catch (e: any) {
      toast.error(`Lỗi xoá: ${e?.message ?? "không rõ"}`);
    }
  };

  /* ─── Levels chỉ trong program (cho dialog resolve tên) ─── */
  const programLevels = useMemo(() => {
    if (!program) return [];
    const set = new Set(program.level_ids);
    return levels.filter((l) => set.has(l.id));
  }, [program, levels]);

  /* ─── Mock data for enhanced UI (will be replaced with real data) ─── */
  const cohorts: CohortData[] = useMemo(() => [
    { name: 'Cohort 24Q4', enrolled: 38, completed: 34, avgLift: 1.3, status: 'graduated' },
    { name: 'Cohort 25Q1', enrolled: 42, completed: 36, avgLift: 1.2, status: 'graduated' },
    { name: 'Cohort 25Q2', enrolled: 44, completed: 39, avgLift: 1.4, status: 'graduated' },
    { name: 'Cohort 25Q3', enrolled: 46, completed: 41, avgLift: 1.1, status: 'graduated' },
    { name: 'Cohort 25Q4', enrolled: 52, completed: 0, avgLift: 0, status: 'active' },
    { name: 'Cohort 26Q1', enrolled: 48, completed: 0, avgLift: 0, status: 'active' },
  ], []);

  const funnel: FunnelStage[] = useMemo(() => [
    { stage: 'Đăng ký quan tâm', count: 248, color: 'bg-sky-500' },
    { stage: 'Test xếp lớp', count: 192, color: 'bg-teal-500' },
    { stage: 'Đóng học phí', count: 138, color: 'bg-amber-500' },
    { stage: 'Vào lớp tuần đầu', count: 124, color: 'bg-rose-500' },
    { stage: 'Hoàn thành 50%', count: 108, color: 'bg-violet-500' },
    { stage: 'Hoàn thành & lên cấp', count: 86, color: 'bg-teal-600' },
  ], []);

  const teachers: TeacherData[] = useMemo(() => [
    { name: 'Ms. Linh Trần', role: 'Lead', color: 'bg-rose-500', classes: 2, rating: 4.92, initials: 'LT' },
    { name: 'Ms. Dung Phạm', role: 'Co-lead', color: 'bg-violet-500', classes: 2, rating: 4.81, initials: 'DP' },
    { name: 'Mr. Tuấn Lê', role: 'Support', color: 'bg-sky-500', classes: 1, rating: 4.62, initials: 'TL' },
    { name: 'Mr. Khoa Nguyễn', role: 'Support', color: 'bg-teal-500', classes: 1, rating: 4.76, initials: 'KN' },
  ], []);

  /* ─── KPI strip: real lớp + student counts từ classes table.
     Doanh thu + completion là MOCK placeholders (chưa có backend). */
  const kpiQ = useQuery({
    queryKey: ["program-kpis", program?.key],
    enabled: !!program?.key,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("classes")
        .select("id, lifecycle_status, student_count, max_students")
        .eq("program", program!.key);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        lifecycle_status: string | null;
        student_count: number | null;
        max_students: number | null;
      }>;
      const running = rows.filter((r) =>
        r.lifecycle_status === "in_progress" || r.lifecycle_status === "ready",
      ).length;
      const totalStudents = rows.reduce((sum, r) => sum + (r.student_count ?? 0), 0);
      const totalCapacity = rows.reduce((sum, r) => sum + (r.max_students ?? 0), 0);
      const utilization = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;
      return { totalClasses: rows.length, running, totalStudents, utilization };
    },
    staleTime: 60_000,
  });

  if (programsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!program) return <Navigate to="/courses" replace />;

  const Icon = getProgramIcon(program.key);
  const palette = getProgramPalette(program.key);
  const emoji = getProgramEmoji(program.key);
  const isInactive = program.status === "inactive";

  const onChanged = async () => {
    await Promise.all([refetch(), refetchLevels()]);
  };

  /* Derived stats */
  const totalEnrolled = cohorts.reduce((a, c) => a + c.enrolled, 0);
  const completedCohorts = cohorts.filter(c => c.status === 'graduated');
  const avgCompletion = completedCohorts.length > 0
    ? Math.round(completedCohorts.reduce((a, c) => a + (Number(c.completed) / c.enrolled), 0) / completedCohorts.length * 100)
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 pb-16">
      {/* Back */}
      <Button asChild size="sm" variant="ghost" className="h-8 -ml-2 gap-1.5 text-xs text-muted-foreground">
        <Link to="/courses">
          <ArrowLeft className="h-3.5 w-3.5" /> Tất cả chương trình
        </Link>
      </Button>

      {/* Enhanced Hero */}
      <section className={cn("rounded-2xl border-2 bg-card overflow-hidden shadow-sm", isInactive && "opacity-80")}>
        {/* Top gradient bar */}
        <div className={cn("h-2 w-full", palette.progressFill)} />

        <div className="p-6 md:p-8">
          <div className="flex items-start gap-6">
            {/* Emoji sticker */}
            <div className={cn(
              "h-20 w-20 rounded-2xl flex items-center justify-center shrink-0 text-4xl",
              "bg-white border-2 shadow-md transform -rotate-3",
              palette.borderColor
            )}>
              {emoji}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted font-bold">
                  {program.key}
                </code>
                <Badge variant={isInactive ? "secondary" : "default"} className="text-[10px]">
                  {isInactive ? "Đã ẩn" : "Đang hoạt động"}
                </Badge>
                {program.cefr_range && (
                  <Badge variant="outline" className="text-[10px]">
                    <Target className="h-3 w-3 mr-1" /> {program.cefr_range}
                  </Badge>
                )}
                <Badge className="text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                  ⭐ Bestseller
                </Badge>
              </div>

              {/* Title */}
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">{program.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{program.tagline || "Chương trình học phổ biến nhất"}</p>
              </div>

              {/* Description */}
              {program.description && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{program.description}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Mở lớp mới
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setProgramEditorOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Sửa chương trình
                </Button>
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" /> Brochure PDF
                </Button>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="hidden lg:grid grid-cols-2 gap-3 min-w-[280px]">
              <StatBlock
                label="Học viên"
                value={kpiQ.data ? String(kpiQ.data.totalStudents) : "—"}
                sub="đang theo học"
                color="rose"
                loading={kpiQ.isLoading}
              />
              <StatBlock
                label="Lớp active"
                value={kpiQ.data ? `${kpiQ.data.running}/${kpiQ.data.totalClasses}` : "—"}
                sub={kpiQ.data ? `+1 sắp mở` : undefined}
                color="teal"
                loading={kpiQ.isLoading}
              />
              <StatBlock
                label="Khoá học"
                value={String(courses.length)}
                sub={`${courses.length * 3} tuần`}
                color="amber"
              />
              <StatBlock
                label="Band lift"
                value="+1.2"
                sub="TB / cohort"
                color="violet"
              />
            </div>
          </div>
        </div>

        {/* Sub stats row */}
        <div className="grid grid-cols-5 border-t-2 divide-x">
          <SubStat label="Học phí" value="18.5M" sub="~1.028k/tuần" />
          <SubStat label="Doanh thu QTD" value={kpiQ.data ? `${Math.round(kpiQ.data.totalStudents * 18500000 / 1000000)}M` : "—"} sub="Ước tính" />
          <SubStat label="Hoàn thành" value={`${avgCompletion}%`} sub={`> ngưỡng 75%`} />
          <SubStat label="Hài lòng" value="92%" sub="feedback HV" />
          <SubStat label="Retention" value="94%" sub="tuần 1 → kết thúc" />
        </div>
      </section>

      {/* Level Manager */}
      <ProgramLevelManager program={program} allLevels={levels} onChanged={onChanged} />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="curriculum" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" /> Curriculum
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-1.5 text-xs">
              <School className="h-3.5 w-3.5" /> Lớp học ({kpiQ.data?.totalClasses || 0})
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Cohorts
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" /> Phễu tuyển sinh
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs">
              <Users2 className="h-3.5 w-3.5" /> Team
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Course timeline */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-xl border-2 bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">01</span>
                    <h2 className="font-display text-lg font-bold">
                      Lộ trình <span className={cn("text-rose-500")}>{courses.length} khoá</span>
                    </h2>
                  </div>
                  <span className="text-xs text-muted-foreground">18 tuần · 4 buổi/tuần · 90 phút</span>
                </div>

                {/* Course list with spine */}
                <div className="relative pl-6 space-y-3">
                  {/* Vertical spine */}
                  <div className="absolute left-2 top-3 bottom-3 w-0.5 bg-border rounded-full" />

                  {coursesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : courses.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">Chưa có khoá học nào</p>
                      <Button onClick={openCreate} size="sm" className="mt-3 gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Thêm khoá học
                      </Button>
                    </div>
                  ) : (
                    courses.map((c, idx) => {
                      const isActive = c.status === 'active';
                      const isCompleted = c.status === 'completed';
                      const courseColor = isCompleted ? 'bg-teal-500' : isActive ? 'bg-rose-500' : 'bg-slate-300';
                      const courseEmoji = getCourseEmoji(c.code || c.name);
                      return (
                        <div
                          key={c.id}
                          className={cn(
                            "relative rounded-xl border-2 p-4 transition-all",
                            isActive ? "bg-rose-50 border-rose-200 shadow-sm" : "bg-white",
                            "hover:border-rose-300"
                          )}
                        >
                          {/* Bullet point */}
                          <div className={cn(
                            "absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10",
                            isCompleted ? "bg-teal-500 border-teal-600 text-white" :
                            isActive ? "bg-rose-500 border-rose-600 text-white" :
                            "bg-white border-slate-300 text-slate-600"
                          )}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Emoji */}
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2 shrink-0",
                              courseColor.replace('bg-', 'bg-').replace('500', '100'),
                              courseColor.replace('bg-', 'border-').replace('500', '200')
                            )}>
                              {courseEmoji}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <code className="text-[10px] font-mono font-bold text-muted-foreground">{c.code}</code>
                                <Badge variant="outline" className={cn("text-[9px] h-4",
                                  isCompleted ? "bg-teal-100 text-teal-700 border-teal-200" :
                                  isActive ? "bg-rose-100 text-rose-700 border-rose-200" :
                                  "bg-slate-100 text-slate-700"
                                )}>
                                  {isCompleted ? '✓ Xong' : isActive ? '● Đang chạy' : '◯ Sắp tới'}
                                </Badge>
                              </div>
                              <h3 className="font-display font-bold text-sm truncate">{c.name}</h3>
                              <div className="flex gap-1.5 flex-wrap mt-1">
                                {c.skills?.slice(0, 3).map((skill: string) => (
                                  <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-display font-bold text-sm text-rose-600">{c.cefr_range || 'A1 → A2'}</div>
                              <div className="text-[10px] text-muted-foreground">{c.total_sessions || 12} buổi</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Side panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Outcomes card */}
              <div className="rounded-xl border-2 bg-amber-50 border-amber-200 p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-3">🎯 Outcomes cam kết</h3>
                <ul className="space-y-2">
                  {[
                    'Đạt mục tiêu IELTS 6.0 với band tối thiểu 5.5 mỗi kỹ năng',
                    '1,800+ từ vựng học thuật core',
                    '3 mock test full với feedback chi tiết',
                    'Mở khoá lên thẳng IELTS-INT 6.5+'
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-amber-200 border border-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Materials card */}
              <div className="rounded-xl border-2 bg-card p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">📚 Tài liệu & Đầu vào</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { l: 'Yêu cầu đầu vào', v: 'Test xếp lớp ≥ 3.5' },
                    { l: 'Sách core', v: 'Cambridge IELTS 17–19' },
                    { l: 'Lesson plans', v: '72 plans · 1,440 phút' },
                    { l: 'Bài tập về nhà', v: '~3h/tuần (LMS)' },
                  ].map((r) => (
                    <div key={r.l} className="flex justify-between py-1.5 border-b border-dashed last:border-0">
                      <span className="text-muted-foreground">{r.l}</span>
                      <span className="font-medium">{r.v}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 text-xs gap-1.5">
                  <BookText className="h-3.5 w-3.5" /> Mở lesson plan kho
                </Button>
              </div>

              {/* Next program card */}
              <div className="rounded-xl border-2 bg-teal-50 border-teal-200 p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-3">🚀 Lộ trình tiếp theo</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border-2 border-teal-300 flex items-center justify-center text-2xl shadow-sm transform -rotate-3">
                    ⚡
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-bold text-sm">IELTS Intensive 6.5+</div>
                    <div className="text-[10px] text-muted-foreground">8 tuần · 156M doanh thu QTD · 76% HV chuyển tiếp</div>
                  </div>
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes">
          <ClassesTabContent kpiQ={kpiQ} programKey={program.key} />
        </TabsContent>

        {/* Cohorts Tab */}
        <TabsContent value="cohorts">
          <CohortsTabContent cohorts={cohorts} totalEnrolled={totalEnrolled} avgCompletion={avgCompletion} />
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel">
          <FunnelTabContent funnel={funnel} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <TeamTabContent teachers={teachers} />
        </TabsContent>
      </Tabs>

      <CourseEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        programId={program.id}
        programKey={program.key}
        programName={program.name}
        levels={programLevels}
        course={editing}
        onSubmit={handleSubmit}
      />

      <ProgramEditorDialog
        open={programEditorOpen}
        onOpenChange={setProgramEditorOpen}
        initial={program}
        onSubmit={handleProgramSubmit}
      />
    </div>
  );
}

/* ─── Helper functions ─── */

function getCourseEmoji(codeOrName: string): string {
  if (codeOrName?.includes('Listening')) return '🎧';
  if (codeOrName?.includes('Reading')) return '📖';
  if (codeOrName?.includes('Writing')) return '✍️';
  if (codeOrName?.includes('Speaking')) return '🎙️';
  if (codeOrName?.includes('Mock')) return '🏁';
  if (codeOrName?.includes('Foundation')) return '🌱';
  return '📚';
}

/* ─── Stat Block Component ─── */

interface StatBlockProps {
  label: string;
  value: string;
  sub?: string;
  color: "rose" | "teal" | "amber" | "violet" | "sky";
  loading?: boolean;
}

const COLOR_MAP: Record<StatBlockProps["color"], { bg: string; border: string; text: string }> = {
  rose:   { bg: "bg-rose-100", border: "border-rose-200", text: "text-rose-600" },
  teal:   { bg: "bg-teal-100", border: "border-teal-200", text: "text-teal-600" },
  amber:  { bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-600" },
  violet: { bg: "bg-violet-100", border: "border-violet-200", text: "text-violet-600" },
  sky:    { bg: "bg-sky-100", border: "border-sky-200", text: "text-sky-600" },
};

function StatBlock({ label, value, sub, color, loading }: StatBlockProps) {
  const colors = COLOR_MAP[color];
  return (
    <div className={cn("rounded-xl border-2 p-3 bg-white shadow-sm", colors.border)}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <div className={cn("font-display text-2xl font-extrabold", colors.text)}>{value}</div>
      )}
      {sub && <div className="text-[10px] text-muted-foreground font-medium">{sub}</div>}
    </div>
  );
}

/* ─── SubStat Component ─── */

interface SubStatProps {
  label: string;
  value: string;
  sub?: string;
}

function SubStat({ label, value, sub }: SubStatProps) {
  return (
    <div className="px-4 py-3 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-lg font-extrabold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ─── Tab Content Components ─── */

function ClassesTabContent({ kpiQ, programKey }: { kpiQ: any; programKey: string }) {
  return (
    <div className="rounded-xl border-2 bg-card overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold">{kpiQ.data?.totalClasses || 0} lớp đang vận hành</h3>
          {kpiQ.data && (
            <span className="text-xs text-muted-foreground">
              · cap: {kpiQ.data.totalStudents + 50} ghế · fill: {kpiQ.data.totalStudents}/{kpiQ.data.totalStudents + 50}
            </span>
          )}
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Mở lớp mới
        </Button>
      </div>
      <div className="p-4 text-center text-sm text-muted-foreground">
        <School className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p>Danh sách lớp học sẽ hiển thị tại đây.</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to={`/classes/list?program=${encodeURIComponent(programKey)}`}>
            Xem tất cả lớp
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CohortsTabContent({ cohorts, totalEnrolled, avgCompletion }: { cohorts: CohortData[]; totalEnrolled: number; avgCompletion: number }) {
  const completedCohorts = cohorts.filter(c => c.status === 'graduated');
  const avgLift = completedCohorts.length > 0
    ? (completedCohorts.reduce((a, c) => a + Number(c.avgLift), 0) / completedCohorts.length).toFixed(2)
    : '0.00';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border-2 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">Cohorts</span>
          <h2 className="font-display text-lg font-bold">Lịch sử <span className="text-rose-500">{cohorts.length} cohorts</span></h2>
        </div>
        <div className="space-y-3">
          {cohorts.map((c) => {
            const isDone = c.status === 'graduated';
            const fill = isDone ? Math.round(Number(c.completed) / c.enrolled * 100) : 0;
            return (
              <div key={c.name} className={cn(
                "rounded-xl border-2 p-4",
                isDone ? "bg-white" : "bg-rose-50 border-rose-200"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-display font-bold">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.enrolled} HV enrolled · {isDone ? `${c.completed} graduated` : 'đang học'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDone && <span className="font-display font-bold text-lg text-teal-600">+{c.avgLift}</span>}
                    <Badge variant={isDone ? "default" : "secondary"} className="text-[9px]">
                      {isDone ? 'graduated' : 'active'}
                    </Badge>
                  </div>
                </div>
                {isDone && (
                  <div className="flex items-center gap-2">
                    <Progress value={fill} className="h-2 flex-1" />
                    <span className="text-[11px] font-bold w-8">{fill}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border-2 bg-card p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Conversion ngắn</h3>
          <div className="grid grid-cols-2 gap-3">
            <BigStat label="Total enrolled" value={String(totalEnrolled)} sub={`${cohorts.length} cohorts`} color="rose" />
            <BigStat label="Avg completion" value={`${avgCompletion}%`} sub="4 cohorts đã xong" color="teal" />
            <BigStat label="Avg band lift" value={`+${avgLift}`} sub="điểm IELTS / cohort" color="amber" />
            <BigStat label="Drop rate" value={`${100 - avgCompletion}%`} sub="trung bình" color="violet" />
          </div>
        </div>

        <div className="rounded-xl border-2 bg-amber-50 border-amber-200 p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2">📈 Insight</h3>
          <p className="text-sm leading-relaxed">
            Cohort 25Q3 có tỷ lệ hoàn thành cao nhất <strong>(89%)</strong>. Pattern: khoá có 2 mock test thay vì 1, và lớp được mentor 1-1 vào tuần 6.
          </p>
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: StatBlockProps["color"] }) {
  const colors = COLOR_MAP[color];
  return (
    <div className={cn("rounded-xl border-2 p-3 bg-white", colors.border)}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-display text-xl font-extrabold mt-1", colors.text)}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function FunnelTabContent({ funnel }: { funnel: FunnelStage[] }) {
  const topCount = funnel[0]?.count || 1;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 rounded-xl border-2 bg-card p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">Funnel</span>
            <h2 className="font-display text-xl font-bold">Phễu <span className="text-rose-500">tuyển sinh</span></h2>
          </div>
          <span className="text-xs text-muted-foreground">Tháng này · {funnel[0]?.count} leads</span>
        </div>

        <div className="space-y-2">
          {funnel.map((f, i) => {
            const widthPct = (f.count / topCount) * 100;
            const prev = i > 0 ? funnel[i - 1].count : f.count;
            const conv = i > 0 ? Math.round(f.count / prev * 100) : 100;
            return (
              <div key={f.stage} className="grid grid-cols-[140px_1fr_60px] items-center gap-3">
                <div className="text-xs font-medium">{f.stage}</div>
                <div className="relative h-9">
                  <div
                    className={cn("h-full rounded-lg border-2 flex items-center px-3 text-sm font-bold shadow-sm", f.color, "border-slate-800 text-white")}
                    style={{ width: `${widthPct}%`, minWidth: '60px' }}
                  >
                    {f.count}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("font-bold text-sm", conv >= 75 ? "text-teal-600" : conv >= 60 ? "text-amber-600" : "text-rose-600")}>
                    {conv}%
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase">{i === 0 ? 'top' : 'từ trên'}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Lead → Graduate</div>
            <div className="font-display text-xl font-extrabold">{Math.round(funnel[5].count / funnel[0].count * 100)}%</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">CAC → LTV ratio</div>
            <div className="font-display text-xl font-extrabold text-teal-600">1 : 4.8</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Avg time-to-pay</div>
            <div className="font-display text-xl font-extrabold">4.2 ngày</div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border-2 bg-teal-50 border-teal-200 p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-2">💰 Doanh thu QTD</h3>
          <div className="font-display text-3xl font-extrabold">312Mđ</div>
          <div className="text-xs text-muted-foreground mt-1">Mục tiêu 320Mđ · còn 8Mđ</div>
          <Progress value={97} className="h-2 mt-3" />
        </div>

        <div className="rounded-xl border-2 bg-card p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Cost breakdown / HV</h3>
          <div className="space-y-2 text-xs">
            {[
              { l: 'Học phí thu', v: '18.5M', c: 'bg-teal-500' },
              { l: 'Giảng viên', v: '-7.2M', c: 'bg-rose-500' },
              { l: 'Tài liệu + LMS', v: '-1.4M', c: 'bg-amber-500' },
              { l: 'Vận hành', v: '-2.1M', c: 'bg-violet-500' },
              { l: 'Marketing', v: '-2.3M', c: 'bg-sky-500' },
            ].map((r) => (
              <div key={r.l} className="flex justify-between py-1.5 border-b border-dashed last:border-0">
                <span className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", r.c)} />
                  {r.l}
                </span>
                <span className={cn("font-bold", r.v.startsWith('-') ? "text-rose-600" : "text-teal-600")}>{r.v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-3 mt-2 border-t-2">
            <span className="font-bold text-sm">Net / HV</span>
            <span className="font-display font-extrabold text-lg text-teal-600">+5.5M</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamTabContent({ teachers }: { teachers: TeacherData[] }) {
  return (
    <div className="rounded-xl border-2 bg-card p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">Team</span>
          <h2 className="font-display text-xl font-bold">Đội <span className="text-rose-500">{teachers.length} giáo viên</span></h2>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Gán giáo viên
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {teachers.map((t) => (
          <div key={t.name} className="rounded-xl border-2 bg-card p-4 text-center hover:shadow-md transition-shadow">
            <div className={cn(
              "w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold text-white border-2 border-slate-800 shadow-sm transform -rotate-3",
              t.color
            )}>
              {t.initials}
            </div>
            <div className="font-display font-bold text-sm">{t.name}</div>
            <div className="text-xs text-muted-foreground mb-3">{t.role}</div>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              <div>
                <div className="font-display font-bold text-lg">{t.classes}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">lớp</div>
              </div>
              <div>
                <div className="font-display font-bold text-lg text-amber-600">{t.rating}★</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">rating</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Legacy KPI card (giữ lại cho tương thích) ─── */

interface KpiCardProps {
  icon: typeof School;
  label: string;
  value: string;
  hint?: string;
  tone: "teal" | "coral" | "amber" | "violet";
  loading?: boolean;
  mock?: boolean;
}

const TONE_BG: Record<KpiCardProps["tone"], string> = {
  teal:   "bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900",
  coral:  "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900",
  amber:  "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900",
  violet: "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900",
};

const TONE_ICON: Record<KpiCardProps["tone"], string> = {
  teal:   "text-teal-600 dark:text-teal-400",
  coral:  "text-rose-600 dark:text-rose-400",
  amber:  "text-amber-600 dark:text-amber-400",
  violet: "text-violet-600 dark:text-violet-400",
};

function KpiCard({ icon: Icon, label, value, hint, tone, loading, mock }: KpiCardProps) {
  return (
    <div className={cn(
      "rounded-xl border p-3.5 space-y-1.5 relative",
      TONE_BG[tone],
      mock && "opacity-70",
    )}>
      <div className="flex items-center justify-between">
        <Icon className={cn("h-4 w-4", TONE_ICON[tone])} />
        {mock && (
          <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground border border-muted-foreground/30 rounded px-1 py-0.5">
            Mock
          </span>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <p className="font-display text-xl font-extrabold tabular-nums leading-tight">
          {value}
        </p>
      )}
      {hint && (
        <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>
      )}
    </div>
  );
}