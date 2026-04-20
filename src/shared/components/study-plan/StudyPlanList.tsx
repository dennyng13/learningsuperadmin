import { useState, useMemo } from "react";
import { useStudyPlanMutations, type StudyPlan } from "@shared/hooks/useStudyPlan";
import { useTemplateMutations } from "@shared/hooks/useStudyPlanTemplates";
import { useAuth } from "@shared/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { PlanAssignmentInfo, useAssignmentLookups } from "@shared/components/study-plan/PlanAssignmentInfo";
import { SharedPlanEditor } from "@shared/components/study-plan/SharedPlanEditor";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Skeleton } from "@shared/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@shared/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays, BookOpen, GraduationCap, Sparkles, Search, X, Image, Lock, ClipboardList, Eye, FileStack, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { getEffectiveStatus } from "@shared/utils/studyPlanStatus";
import TeacherPlanDetailView from "@shared/components/study-plan/TeacherPlanDetailView";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const PROGRAMS = [
  { value: "ielts", label: "IELTS" },
  { value: "wre", label: "WRE" },
  { value: "customized", label: "Customized" },
];

const PROGRAM_CONFIG: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string; badge: string; gradient: string }> = {
  ielts: {
    icon: <GraduationCap className="w-5 h-5" />,
    bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    gradient: "bg-gradient-to-br from-sky-500 to-blue-600",
  },
  wre: {
    icon: <BookOpen className="w-5 h-5" />,
    bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
  },
  customized: {
    icon: <Sparkles className="w-5 h-5" />,
    bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
  },
};




function TodayStatusPanel({ plans }: { plans: StudyPlan[] }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const planIds = plans.map(p => p.id);

  const { data: todayEntries } = useQuery({
    queryKey: ["today-entries", todayStr, planIds],
    enabled: planIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("study_plan_entries")
        .select("*")
        .eq("entry_date", todayStr)
        .in("plan_id", planIds);
      return data || [];
    },
  });

  if (!todayEntries || todayEntries.length === 0) return null;

  const nameMap = new Map(plans.map(p => [p.id, p.student_name || p.plan_name || "?"]));
  const done = todayEntries.filter((e: any) => getEffectiveStatus(e.entry_date, e.plan_status) === "done").length;
  const delayed = todayEntries.filter((e: any) => getEffectiveStatus(e.entry_date, e.plan_status) === "delayed").length;
  const pending = todayEntries.filter((e: any) => getEffectiveStatus(e.entry_date, e.plan_status) === null).length;

  return (
    <Card className="mb-4 border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Bài tập hôm nay ({fmtDate(todayStr)})
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline"className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"> {done}</Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">⏱ {delayed}</Badge>
            <Badge variant="outline" className="text-xs">○ {pending}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {todayEntries.map((e: any, i: number) => (
          <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2.5 text-sm">
            <span className="font-bold min-w-[80px]">{nameMap.get(e.plan_id) || "?"}</span>
            <Badge variant="outline" className="text-[10px]">
              {Array.isArray(e.skills) ? e.skills.join(", ") : e.skills}
            </Badge>
            <span className="flex-1 text-muted-foreground text-xs truncate">{e.homework}</span>
            {e.student_note?.imageUrl && (
              <a href={e.student_note.imageUrl} target="_blank" rel="noreferrer">
                <Image className="w-3.5 h-3.5 text-primary" />
              </a>
            )}
            {(() => {
              const st = getEffectiveStatus(e.entry_date, e.plan_status);
              return (
                <Badge variant="outline" className={`text-[10px] ${
                  st === "done" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  st === "delayed" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "text-muted-foreground"
                }`}>
                  {st ==="done"?"Done": st ==="delayed"?"⏱ Trễ":"○ Chưa"}
                </Badge>
              );
            })()}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface StudyPlanListProps {
  plans: StudyPlan[] | undefined;
  isLoading: boolean;
  /** Whether this is a teacher portal (adds permission checks) */
  teacherMode?: boolean;
  /** Whether the user can create/edit/delete plans */
  canCreate?: boolean;
}

export function StudyPlanList({ plans, isLoading, teacherMode = false, canCreate = true }: StudyPlanListProps) {
  const { deletePlan } = useStudyPlanMutations();
  const { syncToTemplate } = useTemplateMutations();
  const { isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { classNames, studentNames } = useAssignmentLookups(plans || []);
  const [editTarget, setEditTarget] = useState<Partial<StudyPlan> | null | "new">(null);
  const [viewTarget, setViewTarget] = useState<StudyPlan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StudyPlan | null>(null);
  const [syncConfirm, setSyncConfirm] = useState<StudyPlan | null>(null);
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredPlans = useMemo(() => {
    if (!plans) return [];
    let result = plans;
    if (filterProgram !== "all") {
      result = result.filter(p => (p.program || "").toLowerCase() === filterProgram);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(p =>
        (p.student_name || "").toLowerCase().includes(q) ||
        (p.plan_name || "").toLowerCase().includes(q) ||
        (p.program || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [plans, filterProgram, search]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePlan.mutateAsync(deleteConfirm.id);
      toast.success("Đã xoá kế hoạch");
    } catch (err: any) {
      toast.error(err.message);
    }
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (viewTarget) {
    return <TeacherPlanDetailView plan={viewTarget} onBack={() => setViewTarget(null)} />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold">Kế hoạch học tập</h1>
          <p className="text-sm text-muted-foreground">{plans?.length || 0} kế hoạch</p>
        </div>
        <div className="flex items-center gap-2">
          {!teacherMode && (
            <Button variant="outline" size="sm" onClick={() => navigate("/study-plans/templates")}>
              <FileStack className="w-4 h-4 mr-1" /> Mẫu
            </Button>
          )}
          {teacherMode && !canCreate ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button disabled className="opacity-50 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5 mr-1" />
                      <Plus className="w-4 h-4 mr-1" /> Tạo kế hoạch
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bạn chưa được phân quyền tạo kế hoạch</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button onClick={() => setEditTarget("new")}>
              <Plus className="w-4 h-4 mr-1" /> Tạo kế hoạch
            </Button>
          )}
        </div>
      </div>

      {/* Search + Program filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {showSearch ? (
          <div className="relative min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Tìm kế hoạch, học viên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onBlur={() => { if (!search.trim()) setShowSearch(false); }}
              className="pl-9 pr-8 h-9 text-sm rounded-full"
            />
            <button
              onClick={() => { setSearch(""); setShowSearch(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center justify-center h-9 w-9 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        {[{ value: "all", label: "Tất cả" }, ...PROGRAMS].map(p => {
          const cfg = PROGRAM_CONFIG[p.value];
          const count = p.value === "all" ? (plans?.length || 0) : (plans || []).filter(pl => (pl.program || "").toLowerCase() === p.value).length;
          const isActive = filterProgram === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setFilterProgram(p.value)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                isActive
                  ? (cfg ? `${cfg.badge} font-bold ring-1 ring-offset-1 ring-current` : "bg-primary text-primary-foreground border-primary shadow-primary/20")
                  : "bg-card border-border text-foreground hover:border-primary/40 hover:shadow-md"
              )}
            >
              {cfg?.icon || <BookOpen className="h-3.5 w-3.5" />}
              {p.label}
              <span className={cn(
                "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                isActive
                  ? (cfg ? "opacity-70" : "bg-primary-foreground/20 text-primary-foreground")
                  : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {teacherMode && plans && plans.length > 0 && <TodayStatusPanel plans={plans} />}

      <div className="space-y-3">
        {filteredPlans.map(plan => {
          const days = plan.test_date ? Math.ceil((new Date(plan.test_date).getTime() - Date.now()) / 86400000) : 0;
          const pgm = PROGRAM_CONFIG[(plan.program || "").toLowerCase()];

          return (
            <Card key={plan.id} className={`hover:shadow-md transition-shadow border-l-4 ${pgm ? pgm.border : "border-l-muted"}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold shrink-0 ${
                      pgm?.gradient || "bg-gradient-to-br from-primary to-primary/70"
                    }`}>
                      {pgm?.icon || <CalendarDays className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{plan.student_name || plan.plan_name || "Kế hoạch"}</p>
                        {pgm && (
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${pgm.badge}`}>
                            {PROGRAMS.find(p => p.value === (plan.program || "").toLowerCase())?.label}
                          </Badge>
                        )}
                        {plan.plan_type === "structured" && (
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-muted/50">
                            {plan.total_sessions} buổi × {plan.session_duration}′
                          </Badge>
                        )}
                        {plan.source_template_id && (
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-indigo-50 text-indigo-700 border-indigo-200">
                            <FileStack className="w-2.5 h-2.5 mr-0.5" /> Từ mẫu
                          </Badge>
                        )}
                        {plan.is_template_dirty && (
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                            <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Đã sửa
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.test_date ? `Thi ${fmtDate(plan.test_date)} · còn ${days} ngày` :
                         plan.plan_type === "structured" ? `${plan.total_sessions} buổi học` : "Chưa đặt ngày thi"}
                      </p>
                      <PlanAssignmentInfo
                        assignedLevel={plan.assigned_level}
                        classIds={plan.class_ids}
                        studentIds={plan.student_ids}
                        teachngoStudentId={plan.teachngo_student_id}
                        classNames={classNames}
                        studentNames={studentNames}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {plan.plan_type === "customized" && plan.target_score?.overall ? (
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-muted-foreground">Mục tiêu</p>
                        <p className="text-lg font-extrabold text-primary leading-tight">{Number(plan.target_score.overall || 0).toFixed(1)}</p>
                      </div>
                    ) : null}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setViewTarget(plan)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {(isAdmin || isSuperAdmin) && plan.source_template_id && plan.is_template_dirty && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700" onClick={() => setSyncConfirm(plan)} title="Cập nhật mẫu gốc">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setEditTarget(plan)} disabled={teacherMode && !canCreate}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(plan)} disabled={teacherMode && !canCreate}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredPlans.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có kế hoạch nào</p>
            <p className="text-sm">Nhấn "Tạo kế hoạch" để bắt đầu</p>
          </div>
        )}
      </div>

      {editTarget !== null && (
        <SharedPlanEditor
          plan={editTarget === "new" ? {} : editTarget}
          onClose={() => setEditTarget(null)}
          {...(teacherMode ? { teacherMode: true } : {})}
        />
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá kế hoạch?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xoá kế hoạch <strong>{deleteConfirm?.student_name || deleteConfirm?.plan_name}</strong>? Toàn bộ dữ liệu sẽ bị xoá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!syncConfirm} onOpenChange={() => setSyncConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cập nhật mẫu gốc?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ thay đổi trong kế hoạch <strong>{syncConfirm?.student_name || syncConfirm?.plan_name}</strong> sẽ được đẩy ngược lên mẫu gốc.
              Các kế hoạch khác đã gán từ mẫu này sẽ <strong>không</strong> bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!syncConfirm) return;
              try {
                await syncToTemplate.mutateAsync(syncConfirm.id);
                toast.success("Đã cập nhật mẫu gốc");
              } catch (e: any) { toast.error(e.message); }
              setSyncConfirm(null);
            }}>Cập nhật mẫu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
