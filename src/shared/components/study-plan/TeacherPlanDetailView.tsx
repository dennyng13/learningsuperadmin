import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type StudyPlan, useStudyPlanEntries } from "@shared/hooks/useStudyPlan";
import { ClassNoteFilesDisplay } from "./ClassNoteFiles";
import { Card, CardContent } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@shared/components/ui/breadcrumb";
import {
  ArrowLeft, CalendarDays, BookOpen, GraduationCap, Sparkles,
  ExternalLink, FileText, Layers, ChevronDown,
  type LucideIcon, PenLine, Crosshair,
} from "lucide-react";
import { cn, normalizeUrl } from "@shared/lib/utils";
import { useState } from "react";

const SKILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Write: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Read: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  Listen: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  Speak: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  Vocab: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Grammar: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  L: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  R: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  W: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  S: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const SKILL_LABEL: Record<string, string> = { L: "Listening", R: "Reading", W: "Writing", S: "Speaking" };

const SESSION_TYPE_MAP: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  Study: { label: "Học", icon: BookOpen, color: "bg-blue-50 text-blue-700 border-blue-200" },
  Practice: { label: "Luyện tập", icon: PenLine, color: "bg-amber-50 text-amber-700 border-amber-200" },
  Exam: { label: "Thi", icon: Crosshair, color: "bg-red-50 text-red-700 border-red-200" },
};

const PROGRAM_CONFIG: Record<string, { icon: React.ReactNode; gradient: string }> = {
  ielts: { icon: <GraduationCap className="w-5 h-5" />, gradient: "bg-gradient-to-br from-sky-500 to-blue-600" },
  wre: { icon: <BookOpen className="w-5 h-5" />, gradient: "bg-gradient-to-br from-violet-500 to-purple-600" },
  customized: { icon: <Sparkles className="w-5 h-5" />, gradient: "bg-gradient-to-br from-amber-500 to-orange-600" },
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  plan: StudyPlan;
  onBack: () => void;
}

export default function TeacherPlanDetailView({ plan, onBack }: Props) {
  const { data: entries } = useStudyPlanEntries(plan.id);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const sortedEntries = useMemo(() => {
    return [...(entries || [])].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  }, [entries]);

  // Collect all exercise/flashcard IDs
  const allExerciseIds = useMemo(() => {
    const planIds = Array.isArray(plan.exercise_ids) ? plan.exercise_ids : [];
    const entryIds = sortedEntries.flatMap(e => Array.isArray(e.exercise_ids) ? e.exercise_ids : []);
    return [...new Set([...planIds, ...entryIds])];
  }, [plan.exercise_ids, sortedEntries]);

  const allFlashcardIds = useMemo(() => {
    const planIds = Array.isArray(plan.flashcard_set_ids) ? plan.flashcard_set_ids : [];
    const entryIds = sortedEntries.flatMap(e => Array.isArray(e.flashcard_set_ids) ? e.flashcard_set_ids : []);
    return [...new Set([...planIds, ...entryIds])];
  }, [plan.flashcard_set_ids, sortedEntries]);

  const { data: exercises } = useQuery({
    queryKey: ["plan-exercises", allExerciseIds],
    enabled: allExerciseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_exercise_summaries", { p_ids: allExerciseIds });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: flashcardSets } = useQuery({
    queryKey: ["plan-flashcard-sets", allFlashcardIds],
    enabled: allFlashcardIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("flashcard_sets").select("id, title, course_level").in("id", allFlashcardIds);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const exerciseMap = useMemo(() => new Map((exercises || []).map((e: any) => [e.id, e])), [exercises]);
  const flashcardMap = useMemo(() => new Map((flashcardSets || []).map((f: any) => [f.id, f])), [flashcardSets]);

  const totalSessions = plan.total_sessions || sortedEntries.length;
  const pgm = PROGRAM_CONFIG[(plan.program || "").toLowerCase()];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Kế hoạch học tập</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Chi tiết kế hoạch</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Button variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Quay lại danh sách
      </Button>

      {/* Hero */}
      <div className={cn("rounded-2xl p-5 mb-4 text-white", pgm?.gradient || "bg-gradient-to-br from-primary to-primary/80")}>
        <div className="flex items-center gap-2 mb-1">
          {plan.program && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px] uppercase tracking-wider">
              {plan.program.toUpperCase()}
            </Badge>
          )}
          {plan.assigned_level && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px]">
              {plan.assigned_level}
            </Badge>
          )}
        </div>
        <h1 className="text-xl font-extrabold mb-1">{plan.student_name || plan.plan_name || "Kế hoạch học tập"}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm opacity-80">
          {plan.test_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" /> Ngày thi: {fmtDate(plan.test_date)}
            </span>
          )}
          <span>{totalSessions} buổi</span>
        </div>
      </div>

      {/* Target / Current scores */}
      {(plan.target_score?.overall || plan.current_score?.overall) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {plan.target_score?.overall && (
            <Card className="border-t-2 border-t-primary">
              <CardContent className="p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Mục tiêu</p>
                <p className="text-xl font-extrabold text-primary">{Number(plan.target_score.overall).toFixed(1)}</p>
              </CardContent>
            </Card>
          )}
          {plan.current_score?.overall && (
            <Card className="border-t-2 border-t-primary/60">
              <CardContent className="p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Hiện tại</p>
                <p className="text-xl font-extrabold">{Number(plan.current_score.overall).toFixed(1)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Teacher notes */}
      {plan.teacher_notes && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-extrabold text-sm mb-2"> Ghi chú</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{plan.teacher_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Plan-level exercises */}
      {exercises && exercises.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-extrabold text-sm mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" /> Bài tập ({exercises.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {exercises.map((ex: any) => (
                <span key={ex.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <FileText className="w-3.5 h-3.5" /> {ex.title}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session list — syllabus only */}
      <h3 className="font-extrabold text-base mb-3">
        Nội dung buổi học ({sortedEntries.length} buổi)
      </h3>

      <div className="flex flex-col gap-2.5">
        {sortedEntries.map((entry, idx) => {
          const isExpanded = expandedEntry === entry.id;
          const skills = Array.isArray(entry.skills) ? entry.skills : [];
          const links = Array.isArray(entry.links) ? entry.links : [];
          const sessionType = SESSION_TYPE_MAP[entry.session_type || "Study"] || SESSION_TYPE_MAP.Study;
          const entryExerciseIds = Array.isArray(entry.exercise_ids) ? entry.exercise_ids : [];
          const entryFlashcardIds = Array.isArray(entry.flashcard_set_ids) ? entry.flashcard_set_ids : [];
          const hasDetails = entry.homework || entry.class_note || links.length > 0 || entryExerciseIds.length > 0 || entryFlashcardIds.length > 0;

          return (
            <Card key={entry.id} className="border-l-4 border-l-primary/30">
              <CardContent className="p-0">
                {/* Header */}
                <button
                  className="w-full px-4 py-3 flex items-center gap-2 text-left select-none hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedEntry(prev => prev === entry.id ? null : entry.id)}
                >
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", isExpanded ? "rotate-0" : "-rotate-90")} />
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    {plan.plan_type === "structured" && (
                      <span className="text-xs font-bold text-muted-foreground">Buổi {idx + 1}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{fmtDate(entry.entry_date)}</span>
                    {skills.map(sk => {
                      const skc = SKILL_COLORS[sk as string] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted" };
                      return (
                        <Badge key={sk} variant="outline" className={`text-[10px] ${skc.bg} ${skc.text} ${skc.border}`}>
                          {SKILL_LABEL[sk as string] || sk}
                        </Badge>
                      );
                    })}
                    {entry.session_type && (
                      <Badge variant="outline" className={`text-[10px] ${sessionType.color}`}>
                        <sessionType.icon className="w-3 h-3 mr-0.5 inline" /> {sessionType.label}
                      </Badge>
                    )}
                    {!isExpanded && entry.homework && (
                      <span className="text-xs text-muted-foreground truncate max-w-[260px]">— {entry.homework}</span>
                    )}
                  </div>
                </button>

                {/* Expanded: syllabus content only */}
                {isExpanded && hasDetails && (
                  <div className="px-4 pb-4 ml-6 space-y-2 border-t border-border/50">
                    {entry.homework && (
                      <p className="text-sm leading-relaxed whitespace-pre-line pt-3">{entry.homework}</p>
                    )}

                    {entry.class_note && (
                      <div className="text-xs bg-orange-50 border-l-2 border-orange-400 rounded-r-md p-2.5">
                        <span className="font-bold">Ghi chú GV:</span> {entry.class_note}
                        <ClassNoteFilesDisplay files={(entry as any).class_note_files} />
                      </div>
                    )}
                    {!entry.class_note && (entry as any).class_note_files?.length > 0 && (
                      <div className="text-xs bg-orange-50 border-l-2 border-orange-400 rounded-r-md p-2.5">
                        <ClassNoteFilesDisplay files={(entry as any).class_note_files} />
                      </div>
                    )}

                    {links.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {links.map((l: any, i: number) => (
                          <a key={i} href={normalizeUrl(l.url)} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/5 border border-primary/20 rounded-md px-2 py-1 hover:bg-primary/10 transition-colors">
                            <ExternalLink className="w-3 h-3" /> {l.label || l.url}
                          </a>
                        ))}
                      </div>
                    )}

                    {entryExerciseIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entryExerciseIds.map((eid: string) => {
                          const ex = exerciseMap.get(eid);
                          return ex ? (
                            <span key={eid} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/5 border border-primary/20 rounded-md px-2 py-1">
                              <FileText className="w-3 h-3" /> {ex.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}

                    {entryFlashcardIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entryFlashcardIds.map((fid: string) => {
                          const fs = flashcardMap.get(fid);
                          return fs ? (
                            <span key={fid} className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-2 py-1">
                              <Layers className="w-3 h-3" /> {fs.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {sortedEntries.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Chưa có buổi học nào.</p>
        )}
      </div>
    </div>
  );
}
