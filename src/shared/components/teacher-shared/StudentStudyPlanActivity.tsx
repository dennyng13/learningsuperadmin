import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getEffectiveStatus } from "@shared/utils/studyPlanStatus";
import { ClassNoteFilesDisplay } from "@shared/components/study-plan/ClassNoteFiles";
import { Badge } from "@shared/components/ui/badge";
import { ClipboardList, CheckCircle2, Clock, Circle, MessageSquare, Image, Link2, ChevronDown } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  userId: string;
}

export default function StudentStudyPlanActivity({ userId }: Props) {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleEntry = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["student-study-plan-activity", userId],
    queryFn: async () => {
      const { data: students } = await (supabase as any)
        .from("synced_students")
        .select("teachngo_id, full_name")
        .eq("linked_user_id", userId);

      if (!students || students.length === 0) return [];

      const teachngoId = students[0].teachngo_id;

      const { data: classLinks } = await (supabase as any)
        .from("class_students")
        .select("class_id")
        .eq("teachngo_student_id", teachngoId);

      const classIds = (classLinks || []).map(c => c.class_id);

      const { data: allPlans } = await supabase
        .from("study_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (!allPlans || allPlans.length === 0) return [];

      const matchedPlans = allPlans.filter((p: any) => {
        if (p.teachngo_student_id === teachngoId) return true;
        const sids = Array.isArray(p.student_ids) ? p.student_ids : [];
        if (sids.includes(teachngoId)) return true;
        const pClassIds = Array.isArray(p.class_ids) ? p.class_ids : [];
        if (pClassIds.length > 0 && pClassIds.some((cid: string) => classIds.includes(cid))) return true;
        return false;
      });

      if (matchedPlans.length === 0) return [];

      const planIds = matchedPlans.map((p: any) => p.id);
      const { data: entries } = await supabase
        .from("study_plan_entries")
        .select("*")
        .in("plan_id", planIds)
        .order("entry_date", { ascending: false });

      return matchedPlans.map((p: any) => ({
        id: p.id,
        name: p.plan_name || "Kế hoạch học tập",
        program: p.program,
        entries: (entries || []).filter((e: any) => e.plan_id === p.id),
      }));
    },
  });

  if (isLoading || !data || data.length === 0) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const activeExpandedPlan = expandedPlan ?? data[0]?.id;

  const allEntries = data.flatMap((p: any) => p.entries);
  const totalDone = allEntries.filter((e: any) => getEffectiveStatus(e.entry_date, e.plan_status) === "done").length;
  const totalDelayed = allEntries.filter((e: any) => getEffectiveStatus(e.entry_date, e.plan_status) === "delayed").length;
  const totalPending = allEntries.filter((e: any) => getEffectiveStatus(e.entry_date, e.plan_status) === null).length;

  return (
    <Collapsible defaultOpen className="rounded-2xl border bg-card overflow-hidden">
      <CollapsibleTrigger className="w-full px-5 py-4 border-b flex items-center justify-between hover:bg-muted/30 transition-colors">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-3.5 w-3.5 text-primary" />
          </div>
          Kế hoạch học tập
          <span className="text-muted-foreground font-normal ml-1">
            ({allEntries.length} buổi)
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> {totalDone}
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] gap-1">
            <Clock className="w-3 h-3" /> {totalDelayed}
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Circle className="w-3 h-3" /> {totalPending}
          </Badge>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="divide-y">
          {data.map((plan: any) => {
            const isExpanded = activeExpandedPlan === plan.id;
            const doneCount = plan.entries.filter((e: any) => getEffectiveStatus(e.entry_date, e.plan_status) === "done").length;
            const delayedCount = plan.entries.filter((e: any) => getEffectiveStatus(e.entry_date, e.plan_status) === "delayed").length;

            return (
              <div key={plan.id}>
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{plan.name}</span>
                    {plan.program && (
                      <Badge variant="outline" className="text-[10px]">
                        {plan.program.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 text-[10px]">
                      <span className="text-emerald-600">{doneCount}</span>
                      <span className="text-amber-600">⏱{delayedCount}</span>
                      <span className="text-muted-foreground">{plan.entries.length} buổi</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 space-y-2">
                    {plan.entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Chưa có buổi học nào</p>
                    ) : (
                      plan.entries.map((entry: any) => {
                        const isToday = entry.entry_date === todayStr;
                        const note = entry.student_note as any;
                        const hasNote = note && (note.text || note.link || note.imageUrl);
                        const links = Array.isArray(entry.links) ? entry.links : [];
                        const skills = Array.isArray(entry.skills) ? entry.skills : [];

                        const entryExpanded = expandedEntries.has(entry.id);
                        const effectiveStatus = getEffectiveStatus(entry.entry_date, entry.plan_status);
                        const hasDetails = entry.homework || entry.class_note || links.length > 0 || hasNote;

                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              "rounded-xl border transition-colors",
                              isToday ? "border-primary/30 bg-primary/5" : "border-border bg-card",
                              effectiveStatus === "done" && "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10",
                              effectiveStatus === "delayed" && "border-amber-200 bg-amber-50/30 dark:bg-amber-950/10"
                            )}
                          >
                            <button
                              onClick={() => toggleEntry(entry.id)}
                              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", entryExpanded ? "rotate-0" : "-rotate-90")} />
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {fmtDate(entry.entry_date)}
                                </span>
                                {skills.map((s: string) => (
                                  <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {s}
                                  </Badge>
                                ))}
                                {isToday && (
                                  <Badge className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0">
                                    Hôm nay
                                  </Badge>
                                )}
                                {entry.session_type && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">
                                    {entry.session_type}
                                  </Badge>
                                )}
                                {!entryExpanded && entry.homework && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.homework}</span>
                                )}
                              </div>
                              <div className="shrink-0 ml-2">
                                {effectiveStatus === "done" ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Xong
                                  </span>
                                ) : effectiveStatus === "delayed" ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                                    <Clock className="h-3.5 w-3.5" /> Trễ
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Circle className="h-3.5 w-3.5" />
                                  </span>
                                )}
                              </div>
                            </button>

                            {entryExpanded && hasDetails && (
                              <div className="px-3.5 pb-3 pt-0 ml-5 space-y-2 border-t border-border/50">
                                {entry.homework && (
                                  <p className="text-sm pt-2">{entry.homework}</p>
                                )}
                                {entry.class_note && (
                                  <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                                    <span className="font-semibold text-foreground">Ghi chú GV:</span> {entry.class_note}
                                    <ClassNoteFilesDisplay files={(entry as any).class_note_files} />
                                  </div>
                                )}
                                {!entry.class_note && (entry as any).class_note_files?.length > 0 && (
                                  <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                                    <ClassNoteFilesDisplay files={(entry as any).class_note_files} />
                                  </div>
                                )}
                                {links.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {links.map((l: any, i: number) => (
                                      <a key={i} href={l.url} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline bg-primary/5 rounded-md px-2 py-1">
                                        <Link2 className="h-3 w-3" /> {l.label || l.url}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {hasNote && (
                                  <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
                                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3" /> Ghi chú học viên
                                    </p>
                                    {note.text && <p className="text-xs">{note.text}</p>}
                                    {note.link && (
                                      <a href={note.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                        <Link2 className="h-3 w-3" /> {note.link}
                                      </a>
                                    )}
                                    {note.imageUrl && (
                                      <a href={note.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                        <Image className="h-3 w-3" /> {note.imageName || "Xem ảnh"}
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
