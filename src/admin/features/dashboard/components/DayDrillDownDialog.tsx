/**
 * Drill-down dialog: hiển thị chi tiết hoạt động của 1 ngày
 * cho IELTS Practice (test_results + practice_results) hoặc Teacher's Hub (study_plan_entries).
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2, FileText, Activity, CalendarClock, BookOpenCheck, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@shared/components/ui/dialog";
import { Badge } from "@shared/components/ui/badge";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { cn } from "@shared/lib/utils";

export type DrillDownKind = "ielts" | "teacher";

interface Props {
  open: boolean;
  onClose: () => void;
  day: string | null; // yyyy-MM-dd
  kind: DrillDownKind;
}

interface IeltsRow {
  id: string;
  type: "test" | "practice";
  created_at: string;
  title: string;
  user_name: string | null;
  user_id: string | null;
  score: number | null;
}

interface TeacherRow {
  id: string;
  plan_id: string;
  session_type: string | null;
  skills: string[];
  homework: string;
  plan_status: string | null;
  plan_name: string | null;
}

export default function DayDrillDownDialog({ open, onClose, day, kind }: Props) {
  const navigate = useNavigate();
  const dayLabel = day ? format(new Date(day), "EEEE, dd/MM/yyyy", { locale: vi }) : "";

  const { data: ieltsRows, isLoading: ieltsLoading } = useQuery({
    queryKey: ["drill-ielts", day],
    enabled: open && kind === "ielts" && !!day,
    queryFn: async () => {
      const start = `${day}T00:00:00`;
      const end = `${day}T23:59:59.999`;
      const [{ data: tests }, { data: practices }] = await Promise.all([
        supabase
          .from("test_results")
          .select("id, created_at, score, user_id, assessment_id")
          .gte("created_at", start)
          .lte("created_at", end)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("practice_results")
          .select("id, created_at, correct_answers, total_questions, user_id, exercise_id")
          .gte("created_at", start)
          .lte("created_at", end)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const userIds = Array.from(
        new Set([
          ...(tests || []).map((t: any) => t.user_id).filter(Boolean),
          ...(practices || []).map((p: any) => p.user_id).filter(Boolean),
        ]),
      );
      const assessmentIds = Array.from(
        new Set([
          ...(tests || []).map((t: any) => t.assessment_id).filter(Boolean),
          ...(practices || []).map((p: any) => p.exercise_id).filter(Boolean),
        ]),
      );

      const [profMap, asmtMap] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", userIds).then(({ data }) => {
              const m: Record<string, string> = {};
              (data || []).forEach((p: any) => { m[p.id] = p.full_name || ""; });
              return m;
            })
          : Promise.resolve({} as Record<string, string>),
        assessmentIds.length > 0
          ? supabase.from("assessments").select("id, name").in("id", assessmentIds).then(({ data }) => {
              const m: Record<string, string> = {};
              (data || []).forEach((a: any) => { m[a.id] = a.name || ""; });
              return m;
            })
          : Promise.resolve({} as Record<string, string>),
      ]);

      const merged: IeltsRow[] = [
        ...((tests || []).map((t: any) => ({
          id: t.id,
          type: "test" as const,
          created_at: t.created_at,
          title: asmtMap[t.assessment_id] || "(Test)",
          user_name: profMap[t.user_id] || null,
          user_id: t.user_id,
          score: t.score,
        }))),
        ...((practices || []).map((p: any) => {
          const total = p.total_questions || 0;
          const correct = p.correct_answers || 0;
          const score = total > 0 ? (correct / total) * 100 : null;
          return {
            id: p.id,
            type: "practice" as const,
            created_at: p.created_at,
            title: asmtMap[p.exercise_id] || "(Practice)",
            user_name: profMap[p.user_id] || null,
            user_id: p.user_id,
            score,
          };
        })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

      return merged;
    },
  });

  const { data: teacherRows, isLoading: teacherLoading } = useQuery({
    queryKey: ["drill-teacher", day],
    enabled: open && kind === "teacher" && !!day,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_plan_entries")
        .select("id, plan_id, session_type, skills, homework, plan_status")
        .eq("entry_date", day!)
        .limit(100);
      if (error) throw error;

      const planIds = Array.from(new Set((data || []).map((r: any) => r.plan_id).filter(Boolean)));
      const planMap: Record<string, string> = {};
      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from("study_plans")
          .select("id, plan_name")
          .in("id", planIds);
        (plans || []).forEach((p: any) => { planMap[p.id] = p.plan_name || ""; });
      }

      return ((data || []) as any[]).map<TeacherRow>((r) => ({
        id: r.id,
        plan_id: r.plan_id,
        session_type: r.session_type,
        skills: r.skills || [],
        homework: r.homework || "",
        plan_status: r.plan_status,
        plan_name: planMap[r.plan_id] || null,
      }));
    },
  });

  const isLoading = kind === "ielts" ? ieltsLoading : teacherLoading;
  const totalCount = kind === "ielts" ? ieltsRows?.length ?? 0 : teacherRows?.length ?? 0;

  const Icon = kind === "ielts" ? BookOpenCheck : GraduationCap;
  const accent = kind === "ielts" ? "text-blue-600" : "text-emerald-600";
  const bg = kind === "ielts" ? "bg-blue-500/10" : "bg-emerald-500/10";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
              <Icon className={cn("h-4.5 w-4.5", accent)} />
            </div>
            <div className="min-w-0">
              <DialogTitle>
                {kind === "ielts" ? "IELTS Practice" : "Teacher's Hub"} · {dayLabel}
              </DialogTitle>
              <DialogDescription>
                {isLoading
                  ? "Đang tải…"
                  : `${totalCount} ${kind === "ielts" ? "bài làm" : "buổi học"} trong ngày`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[420px] -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : kind === "ielts" ? (
            <IeltsList
              rows={ieltsRows || []}
              onClickUser={(uid) => { onClose(); navigate(`/users/${uid}/performance`); }}
            />
          ) : (
            <TeacherList
              rows={teacherRows || []}
              onClickPlan={() => { onClose(); navigate(`/study-plans`); }}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function IeltsList({ rows, onClickUser }: { rows: IeltsRow[]; onClickUser: (uid: string) => void }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Không có hoạt động trong ngày.</p>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div
          key={`${r.type}-${r.id}`}
          className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
        >
          <div className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
            r.type === "test" ? "bg-blue-500/10" : "bg-violet-500/10",
          )}>
            {r.type === "test" ? (
              <FileText className="h-3.5 w-3.5 text-blue-600" />
            ) : (
              <Activity className="h-3.5 w-3.5 text-violet-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{r.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {r.user_name && r.user_id ? (
                <button
                  className="hover:underline hover:text-primary"
                  onClick={() => onClickUser(r.user_id!)}
                >
                  {r.user_name}
                </button>
              ) : (
                <span className="italic">Ẩn danh</span>
              )}
              {" · "}
              {format(new Date(r.created_at), "HH:mm")}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {r.type === "test" ? "Test" : "Practice"}
          </Badge>
          {r.score != null && (
            <span className="font-bold font-mono text-sm tabular-nums shrink-0 w-12 text-right">
              {Number(r.score).toFixed(1)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TeacherList({ rows, onClickPlan }: { rows: TeacherRow[]; onClickPlan: () => void }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Không có buổi học trong ngày.</p>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <button
          key={r.id}
          onClick={onClickPlan}
          className="w-full flex items-start gap-3 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/40 transition-colors text-left"
        >
          <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <CalendarClock className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {r.plan_name || "(Study plan)"}
              {r.session_type && (
                <span className="ml-2 text-[10px] font-normal text-muted-foreground uppercase">{r.session_type}</span>
              )}
            </p>
            {r.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {r.skills.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px] capitalize">{s}</Badge>
                ))}
              </div>
            )}
            {r.homework && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.homework}</p>
            )}
          </div>
          {r.plan_status && (
            <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{r.plan_status}</Badge>
          )}
        </button>
      ))}
    </div>
  );
}
