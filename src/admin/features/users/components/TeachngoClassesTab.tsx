import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";
import {
  Search, Loader2, BookOpen, Users, ChevronDown, ChevronUp, User, Pencil, Tags, GraduationCap, Link2, Archive, X, ClipboardList, Layers,
} from "lucide-react";
import { Switch } from "@shared/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@shared/components/ui/dialog";

const PROGRAM_COLORS: Record<string, string> = {};
const COLOR_POOL = [
  "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
  "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
];
let colorIndex = 0;
function getProgramColor(program: string): string {
  if (!PROGRAM_COLORS[program]) {
    PROGRAM_COLORS[program] = COLOR_POOL[colorIndex % COLOR_POOL.length];
    colorIndex++;
  }
  return PROGRAM_COLORS[program];
}

interface TnGClass {
  id: string;
  teachngo_class_id: string;
  class_name: string;
  course_title: string | null;
  teacher_name: string | null;
  teacher_id: string | null;
  program: string | null;
  level: string | null;
  schedule: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  synced_at: string;
  leaderboard_enabled: boolean;
}

interface TeacherOption {
  id: string;
  full_name: string;
}

interface ClassStudent {
  id: string;
  teachngo_student_id: string;
  enrollment_date: string | null;
  unenrollment_date: string | null;
  status: string | null;
  student_name?: string;
}

import { getLevelColor, getLevelColorConfig } from "@shared/utils/levelColors";

export default function TeachngoClassesTab() {
  const { levels: courseLevels } = useCourseLevels();
  const [classes, setClasses] = useState<TnGClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewTab, setViewTab] = useState<"active" | "ended">("active");
  
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [programFilters, setProgramFilters] = useState<Set<string>>(new Set());
  const [levelFilters, setLevelFilters] = useState<Set<string>>(new Set());
  const [levelExpanded, setLevelExpanded] = useState(false);
  const [programExpanded, setProgramExpanded] = useState(false);

  const toggleLevel = (name: string) => {
    setLevelFilters(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const toggleProgram = (name: string) => {
    setProgramFilters(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentsMap, setStudentsMap] = useState<Record<string, ClassStudent[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<string | null>(null);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [classTeacherMap, setClassTeacherMap] = useState<Record<string, string>>({});
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editingProgramValue, setEditingProgramValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLevel, setBulkLevel] = useState("");
  const [bulkProgram, setBulkProgram] = useState("");
  const [bulkTeacher, setBulkTeacher] = useState("");
  const [bulkStudyPlan, setBulkStudyPlan] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [studyPlans, setStudyPlans] = useState<{ id: string; plan_name: string | null; display_name: string; class_ids: string[] }[]>([]);
  const [classPlansMap, setClassPlansMap] = useState<Record<string, { id: string; plan_name: string }[]>>({});

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleBulkLevelAssign = async () => {
    if (!bulkLevel || selectedIds.size === 0) return;
    setBulkSaving(true);
    const val = bulkLevel === "__none__" ? null : bulkLevel;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("teachngo_classes")
      .update({ level: val, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      toast.error("Lỗi gán level hàng loạt");
    } else {
      setClasses(prev => prev.map(c => ids.includes(c.id) ? { ...c, level: val } : c));
      toast.success(`Đã gán level cho ${ids.length} lớp`);
      setSelectedIds(new Set());
      setBulkLevel("");
    }
    setBulkSaving(false);
  };

  const handleBulkProgramAssign = async () => {
    if (!bulkProgram || selectedIds.size === 0) return;
    setBulkSaving(true);
    const val = bulkProgram === "__none__" ? null : bulkProgram;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("teachngo_classes")
      .update({ program: val, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      toast.error("Lỗi gán program hàng loạt");
    } else {
      setClasses(prev => prev.map(c => ids.includes(c.id) ? { ...c, program: val } : c));
      toast.success(`Đã gán program cho ${ids.length} lớp`);
      setSelectedIds(new Set());
      setBulkProgram("");
    }
    setBulkSaving(false);
  };

  const handleTeacherChange = async (classId: string, teacherId: string) => {
    const val = teacherId === "__none__" ? null : teacherId;
    const { error } = await supabase
      .from("teachngo_classes")
      .update({ teacher_id: val, updated_at: new Date().toISOString() } as any)
      .eq("id", classId);
    if (!error) {
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, teacher_id: val } : c));
      toast.success("Đã gán giáo viên");
    }
  };

  const handleBulkTeacherAssign = async () => {
    if (!bulkTeacher || selectedIds.size === 0) return;
    setBulkSaving(true);
    const val = bulkTeacher === "__none__" ? null : bulkTeacher;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("teachngo_classes")
      .update({ teacher_id: val, updated_at: new Date().toISOString() } as any)
      .in("id", ids);
    if (error) {
      toast.error("Lỗi gán giáo viên hàng loạt");
    } else {
      setClasses(prev => prev.map(c => ids.includes(c.id) ? { ...c, teacher_id: val } : c));
      toast.success(`Đã gán giáo viên cho ${ids.length} lớp`);
      setSelectedIds(new Set());
      setBulkTeacher("");
    }
    setBulkSaving(false);
  };

  const handleBulkStudyPlanAssign = async () => {
    if (!bulkStudyPlan || selectedIds.size === 0) return;
    setBulkSaving(true);
    const plan = studyPlans.find(p => p.id === bulkStudyPlan);
    if (!plan) { setBulkSaving(false); return; }
    const classIds = Array.from(selectedIds);
    const existingSet = new Set(plan.class_ids);
    const newClassIds = [...plan.class_ids, ...classIds.filter(id => !existingSet.has(id))];
    const { error } = await supabase
      .from("study_plans")
      .update({ class_ids: newClassIds, updated_at: new Date().toISOString() })
      .eq("id", bulkStudyPlan);
    if (error) {
      toast.error("Lỗi gán kế hoạch hàng loạt");
    } else {
      setStudyPlans(prev => prev.map(p => p.id === bulkStudyPlan ? { ...p, class_ids: newClassIds } : p));
      const planName = plan.display_name;
      setClassPlansMap(prev => {
        const next = { ...prev };
        for (const cid of classIds) {
          if (!existingSet.has(cid)) {
            next[cid] = [...(next[cid] || []), { id: bulkStudyPlan, plan_name: planName }];
          }
        }
        return next;
      });
      toast.success(`Đã gán kế hoạch "${planName}" cho ${classIds.length} lớp`);
      setSelectedIds(new Set());
      setBulkStudyPlan("");
    }
    setBulkSaving(false);
  };

  const handleAutoLinkTeachers = async () => {
    setBulkSaving(true);
    const { data, error } = await supabase.rpc("auto_link_class_teachers" as any);
    if (error) {
      toast.error("Lỗi auto-link giáo viên");
    } else {
      const matched = (data as any)?.matched || 0;
      toast.success(`Đã liên kết ${matched} lớp với giáo viên`);
      // Refresh classes
      const { data: refreshed } = await supabase.from("teachngo_classes").select("*").order("class_name", { ascending: true });
      if (refreshed) setClasses(refreshed as unknown as TnGClass[]);
    }
    setBulkSaving(false);
  };

  const handleProgramSave = async (classId: string) => {
    const val = editingProgramValue.trim() || null;
    const { error } = await supabase
      .from("teachngo_classes")
      .update({ program: val, updated_at: new Date().toISOString() })
      .eq("id", classId);
    if (!error) {
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, program: val } : c));
    }
    setEditingProgramId(null);
  };

  const handleLevelChange = async (classId: string, level: string) => {
    const val = level === "__none__" ? null : level;
    const { error } = await supabase
      .from("teachngo_classes")
      .update({ level: val, updated_at: new Date().toISOString() })
      .eq("id", classId);
    if (!error) {
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, level: val } : c));
    }
  };

  const handleStudyPlanChange = async (classId: string, planId: string) => {
    if (planId === "__none__") return;
    const existing = classPlansMap[classId] || [];
    if (existing.some(p => p.id === planId)) return;
    const plan = studyPlans.find(p => p.id === planId);
    if (!plan) return;
    const newClassIds = [...plan.class_ids, classId];
    const { error } = await supabase
      .from("study_plans")
      .update({ class_ids: newClassIds, updated_at: new Date().toISOString() })
      .eq("id", planId);
    if (error) {
      toast.error("Lỗi gán kế hoạch học tập");
    } else {
      setStudyPlans(prev => prev.map(p => p.id === planId ? { ...p, class_ids: newClassIds } : p));
      setClassPlansMap(prev => ({
        ...prev,
        [classId]: [...(prev[classId] || []), { id: planId, plan_name: plan.display_name }],
      }));
      toast.success("Đã gán kế hoạch học tập");
    }
  };

  const handleStudyPlanRemove = async (classId: string, planId: string) => {
    const plan = studyPlans.find(p => p.id === planId);
    if (!plan) return;
    const newClassIds = plan.class_ids.filter(id => id !== classId);
    const { error } = await supabase
      .from("study_plans")
      .update({ class_ids: newClassIds, updated_at: new Date().toISOString() })
      .eq("id", planId);
    if (error) {
      toast.error("Lỗi bỏ gán kế hoạch");
    } else {
      setStudyPlans(prev => prev.map(p => p.id === planId ? { ...p, class_ids: newClassIds } : p));
      setClassPlansMap(prev => ({
        ...prev,
        [classId]: (prev[classId] || []).filter(p => p.id !== planId),
      }));
      toast.success("Đã bỏ gán kế hoạch");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [classRes, countRes, teacherRes, plansRes] = await Promise.all([
        supabase.from("teachngo_classes").select("*").order("class_name", { ascending: true }),
        supabase.from("teachngo_class_students").select("class_id, status"),
        supabase.from("teachers").select("id, full_name, classes, teachngo_staff_id"),
        supabase.from("study_plans").select("id, plan_name, class_ids, teachngo_student_id, program"),
      ]);

      if (classRes.data) setClasses(classRes.data as unknown as TnGClass[]);

      // Build teacher options for dropdown
      if (teacherRes.data) {
        setTeacherOptions(
          (teacherRes.data as any[])
            .filter((t: any) => t.full_name && !t.full_name.startsWith("Teacher #"))
            .map((t: any) => ({ id: t.id, full_name: t.full_name }))
            .sort((a: TeacherOption, b: TeacherOption) => a.full_name.localeCompare(b.full_name))
        );
      }

      if (countRes.data) {
        const counts: Record<string, number> = {};
        for (const row of countRes.data as any[]) {
          counts[row.class_id] = (counts[row.class_id] || 0) + 1;
        }
        setStudentCounts(counts);
      }

      if (teacherRes.data && classRes.data) {
        const map: Record<string, string[]> = {};
        for (const t of teacherRes.data as any[]) {
          if (!t.classes || !t.full_name || t.full_name.startsWith("Teacher #")) continue;
          const classList = (t.classes as string).split(", ");
          for (const className of classList) {
            if (!map[className]) map[className] = [];
            if (!map[className].includes(t.full_name)) {
              map[className].push(t.full_name);
            }
          }
        }
        const finalMap: Record<string, string> = {};
        for (const c of classRes.data as any[]) {
          const names = map[c.class_name];
          if (names && names.length > 0) {
            finalMap[c.id] = names.join(", ");
          }
        }
        setClassTeacherMap(finalMap);
      }

      // Build study plans map with resolved student names
      if (plansRes.data) {
        const rawPlans = plansRes.data as any[];
        const studentIds = rawPlans.map(p => p.teachngo_student_id).filter(Boolean);
        let nameMap = new Map<string, string>();
        if (studentIds.length > 0) {
          const { data: students } = await supabase
            .from("teachngo_students")
            .select("teachngo_id, full_name")
            .in("teachngo_id", studentIds);
          nameMap = new Map((students || []).map((s: any) => [s.teachngo_id, s.full_name]));
        }
        const plans = rawPlans.map(p => {
          let displayName = p.plan_name;
          if (!displayName && p.teachngo_student_id) {
            displayName = nameMap.get(p.teachngo_student_id) || null;
          }
          if (!displayName) {
            displayName = `Kế hoạch ${p.program || "Customized"}`;
          }
          return {
            id: p.id,
            plan_name: p.plan_name,
            display_name: displayName,
            class_ids: Array.isArray(p.class_ids) ? p.class_ids as string[] : [],
          };
        });
        setStudyPlans(plans);
        const cpMap: Record<string, { id: string; plan_name: string }[]> = {};
        for (const p of plans) {
          for (const cid of p.class_ids) {
            if (!cpMap[cid]) cpMap[cid] = [];
            cpMap[cid].push({ id: p.id, plan_name: p.display_name });
          }
        }
        setClassPlansMap(cpMap);
      }

      setLoading(false);
    })();
  }, []);

  const fetchStudents = async (classId: string) => {
    if (studentsMap[classId]) return;
    setLoadingStudents(classId);
    const { data: links } = await supabase
      .from("teachngo_class_students")
      .select("id, teachngo_student_id, enrollment_date, unenrollment_date, status")
      .eq("class_id", classId);

    if (links && links.length > 0) {
      const studentIds = (links as any[]).map((l: any) => l.teachngo_student_id);
      const { data: students } = await supabase
        .from("teachngo_students")
        .select("teachngo_id, full_name")
        .in("teachngo_id", studentIds);

      const nameMap = new Map((students || []).map((s: any) => [s.teachngo_id, s.full_name]));
      const enriched: ClassStudent[] = (links as any[]).map((l: any) => ({
        ...l,
        student_name: nameMap.get(l.teachngo_student_id) || l.teachngo_student_id,
      }));
      setStudentsMap(prev => ({ ...prev, [classId]: enriched }));
    } else {
      setStudentsMap(prev => ({ ...prev, [classId]: [] }));
    }
    setLoadingStudents(null);
  };

  const toggleExpand = (classId: string) => {
    if (expandedId === classId) {
      setExpandedId(null);
    } else {
      setExpandedId(classId);
      fetchStudents(classId);
    }
  };

  const getTeacherName = (c: TnGClass) => classTeacherMap[c.id] || c.teacher_name || "";

  const teachers = useMemo(() => {
    const names = classes.map(c => getTeacherName(c)).filter(Boolean);
    return [...new Set(names)].sort();
  }, [classes, classTeacherMap]);

  const programs = useMemo(() => {
    const names = classes.map(c => c.program).filter(Boolean) as string[];
    return [...new Set(names)].sort();
  }, [classes]);

  const usedLevels = useMemo(() => {
    const names = classes.map(c => c.level).filter(Boolean) as string[];
    return [...new Set(names)];
  }, [classes]);

  const activeClasses = classes.filter(c => c.status !== "ended");
  const endedClasses = classes.filter(c => c.status === "ended");
  const baseClasses = viewTab === "active" ? activeClasses : endedClasses;

  const filtered = baseClasses.filter(c => {
    const tName = getTeacherName(c);
    const planNames = (classPlansMap[c.id] || []).map(p => p.plan_name).join(" ");
    const matchesSearch =
      c.class_name.toLowerCase().includes(search.toLowerCase()) ||
      planNames.toLowerCase().includes(search.toLowerCase()) ||
      tName.toLowerCase().includes(search.toLowerCase());
    const matchesTeacher = teacherFilter === "all" || tName === teacherFilter;
    const matchesProgram = programFilters.size === 0 || programFilters.has(c.program || "");
    const matchesLevel = levelFilters.size === 0 || levelFilters.has(c.level || "");
    return matchesSearch && matchesTeacher && matchesProgram && matchesLevel;
  });

  const statusColor = (s: string | null) => {
    if (!s) return "secondary";
    if (s === "active") return "default";
    if (s === "ended") return "secondary";
    return "outline";
  };

  const statusLabel = (s: string | null) => {
    if (!s) return "N/A";
    if (s === "active") return "Đang học";
    if (s === "ended") return "Đã kết thúc";
    if (s === "scheduled") return "Sắp mở";
    return s;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats — active only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Lớp đang học", value: activeClasses.length, icon: BookOpen },
          { label: "Tổng học viên", value: activeClasses.reduce((s, c) => s + (studentCounts[c.id] || 0), 0), icon: Users },
          { label: "Giáo viên", value: new Set(activeClasses.map(c => getTeacherName(c)).filter(Boolean)).size, icon: GraduationCap },
          { label: "Program", value: new Set(activeClasses.map(c => c.program).filter(Boolean)).size, icon: Tags },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 border-b">
        <button
          onClick={() => { setViewTab("active"); setSelectedIds(new Set()); }}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            viewTab === "active"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
          Đang hoạt động ({activeClasses.length})
        </button>
        <button
          onClick={() => { setViewTab("ended"); setSelectedIds(new Set()); }}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            viewTab === "ended"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Archive className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
          Đã kết thúc ({endedClasses.length})
        </button>
      </div>

      {/* Chip filters */}
      <div className="space-y-2">
        {/* Top row: search + total + section toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Expandable search */}
          {showSearch ? (
            <div className="relative min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Tìm lớp, khóa học, giáo viên..."
                value={search}
                onChange={e => setSearch(e.target.value)}
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

          {/* Total chip */}
          <button
            onClick={() => { setLevelFilters(new Set()); setProgramFilters(new Set()); setTeacherFilter("all"); }}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
              levelFilters.size === 0 && programFilters.size === 0 && teacherFilter === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                : "bg-card border-border text-foreground hover:border-primary/40 hover:shadow-md"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Tất cả
            <span className={cn(
              "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
              levelFilters.size === 0 && programFilters.size === 0 && teacherFilter === "all"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {baseClasses.length}
            </span>
          </button>

          {/* Level toggle */}
          {(() => {
            const activeLevels = courseLevels.filter(l => usedLevels.includes(l.name));
            if (activeLevels.length <= 1) return null;
            return (
              <>
                <span className="h-5 w-px bg-border mx-0.5" />
                <button
                  onClick={() => setLevelExpanded(!levelExpanded)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                    levelFilters.size > 0
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  )}
                >
                  Level
                  {levelFilters.size > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                      {levelFilters.size}
                    </span>
                  )}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", levelExpanded && "rotate-180")} />
                </button>
              </>
            );
          })()}

          {/* Program toggle */}
          {programs.length > 1 && (
            <>
              <span className="h-5 w-px bg-border mx-0.5" />
              <button
                onClick={() => setProgramExpanded(!programExpanded)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                  programFilters.size > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                <Tags className="h-3.5 w-3.5" />
                Chương trình
                {programFilters.size > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {programFilters.size}
                  </span>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform", programExpanded && "rotate-180")} />
              </button>
            </>
          )}

          {/* Teacher filter dropdown */}
          {teachers.length > 1 && (
            <>
              <span className="h-5 w-px bg-border mx-0.5" />
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger className="w-[180px] h-9 rounded-full text-xs">
                  <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Giáo viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả giáo viên</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Level chips row (collapsible) */}
        {levelExpanded && (() => {
          const activeLevels = courseLevels.filter(l => usedLevels.includes(l.name));
          if (activeLevels.length <= 1) return null;
          return (
            <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
              {activeLevels.map(l => {
                const count = baseClasses.filter(c => c.level === l.name).length;
                const active = levelFilters.has(l.name);
                const lc = getLevelColorConfig(l.color_key || l.name);
                return (
                  <button
                    key={l.id}
                    onClick={() => toggleLevel(l.name)}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                      active
                        ? lc
                          ? `${lc.selected} ${lc.border} shadow-md scale-105 ring-1 ring-offset-1`
                          : "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105"
                        : lc
                          ? `${lc.bg} ${lc.text} ${lc.border} hover:shadow-md hover:scale-[1.02]`
                          : "bg-card border-border text-foreground hover:border-primary/40 hover:shadow-md"
                    )}
                  >
                    {l.name}
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                      active
                        ? lc ? `bg-white/40 ${lc.text}` : "bg-primary-foreground/20 text-primary-foreground"
                        : lc ? `bg-white/60 ${lc.text}` : "bg-muted text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Program chips row (collapsible) */}
        {programExpanded && programs.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {programs.map((program, i) => {
              const count = baseClasses.filter(c => c.program === program).length;
              const active = programFilters.has(program);
              const programColors = [
                { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", active: "bg-indigo-200 text-indigo-800 border-indigo-300", badge: "bg-indigo-100 text-indigo-700" },
                { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", active: "bg-rose-200 text-rose-800 border-rose-300", badge: "bg-rose-100 text-rose-700" },
                { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", active: "bg-amber-200 text-amber-800 border-amber-300", badge: "bg-amber-100 text-amber-700" },
                { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", active: "bg-teal-200 text-teal-800 border-teal-300", badge: "bg-teal-100 text-teal-700" },
              ];
              const pc = programColors[i % programColors.length];
              return (
                <button
                  key={program}
                  onClick={() => toggleProgram(program)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                    active
                      ? `${pc.active} shadow-md scale-105 ring-1 ring-offset-1`
                      : `${pc.bg} ${pc.text} ${pc.border} hover:shadow-md hover:scale-[1.02]`
                  )}
                >
                  <Tags className="h-3.5 w-3.5" />
                  {program}
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    active ? `bg-white/40 ${pc.text}` : pc.badge
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} lớp đã chọn</span>
          <Button size="sm" variant="default" className="ml-2" onClick={() => setBulkDialogOpen(true)}>
            <Tags className="h-3.5 w-3.5 mr-1.5" />
            Gán hàng loạt
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); }}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* Bulk assign dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Gán hàng loạt
            </DialogTitle>
            <DialogDescription>
              Áp dụng cho {selectedIds.size} lớp đã chọn
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{selectedIds.size} lớp</span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(filtered.map(c => c.id)))}
              className="text-xs text-primary hover:underline"
            >
              Chọn tất cả ({filtered.length})
            </button>
          </div>
          <div className="max-h-28 overflow-y-auto rounded-md border bg-muted/40 p-2 flex flex-wrap gap-1.5">
            {classes.filter(c => selectedIds.has(c.id)).map(c => (
              <Badge key={c.id} variant="secondary" className="text-xs font-normal flex items-center gap-1 pr-1">
                {c.class_name}
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(selectedIds);
                    next.delete(c.id);
                    setSelectedIds(next);
                    if (next.size === 0) setBulkDialogOpen(false);
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="space-y-4 pt-2">
            {/* Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Level</label>
              <div className="flex items-center gap-2">
                <Select value={bulkLevel} onValueChange={setBulkLevel}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Chọn level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Bỏ level —</SelectItem>
                    {courseLevels.map(l => (
                      <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={async () => { await handleBulkLevelAssign(); }} disabled={!bulkLevel || bulkSaving}>
                  {bulkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Gán"}
                </Button>
              </div>
            </div>

            {/* Program */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Program</label>
              <div className="flex items-center gap-2">
                <Select value={bulkProgram} onValueChange={setBulkProgram}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Chọn program..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Bỏ program —</SelectItem>
                    {programs.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={async () => { await handleBulkProgramAssign(); }} disabled={!bulkProgram || bulkSaving}>
                  {bulkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Gán"}
                </Button>
              </div>
            </div>

            {/* Giáo viên */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giáo viên</label>
              <div className="flex items-center gap-2">
                <Select value={bulkTeacher} onValueChange={setBulkTeacher}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Chọn giáo viên..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Bỏ giáo viên —</SelectItem>
                    {teacherOptions.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={async () => { await handleBulkTeacherAssign(); }} disabled={!bulkTeacher || bulkSaving}>
                  {bulkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Gán"}
                </Button>
              </div>
            </div>

            {/* Kế hoạch học tập */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kế hoạch học tập</label>
              <div className="flex items-center gap-2">
                <Select value={bulkStudyPlan} onValueChange={setBulkStudyPlan}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Chọn kế hoạch..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Chọn —</SelectItem>
                    {studyPlans.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={async () => { await handleBulkStudyPlanAssign(); }} disabled={!bulkStudyPlan || bulkSaving}>
                  {bulkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Gán"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Chưa có lớp học nào. Hãy đồng bộ Teach'n Go.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead>Tên lớp</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Kế hoạch</TableHead>
                <TableHead>Giáo viên</TableHead>
                <TableHead>Sĩ số</TableHead>
                <TableHead>Lịch học</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <Collapsible key={c.id} open={expandedId === c.id} onOpenChange={() => toggleExpand(c.id)} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(c.id)}
                            onCheckedChange={() => toggleSelect(c.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {expandedId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">{c.class_name}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Select
                            value={c.level || "__none__"}
                            onValueChange={(val) => handleLevelChange(c.id, val)}
                          >
                            <SelectTrigger className={`h-7 text-xs w-[130px] border ${c.level ? getLevelColor(c.level) : "border-dashed"}`}>
                              <SelectValue placeholder="Chọn level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Chưa gán —</SelectItem>
                              {courseLevels.map(l => (
                                <SelectItem key={l.id} value={l.name}>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getLevelColor(l.color_key || l.name)}`}>{l.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell onClick={e => { e.stopPropagation(); setEditingProgramId(c.id); setEditingProgramValue(c.program || ""); }}>
                          {editingProgramId === c.id ? (
                            <Input
                              value={editingProgramValue}
                              onChange={e => setEditingProgramValue(e.target.value)}
                              onBlur={() => handleProgramSave(c.id)}
                              onKeyDown={e => { if (e.key === "Enter") handleProgramSave(c.id); if (e.key === "Escape") setEditingProgramId(null); }}
                              className="h-7 text-xs w-24"
                              autoFocus
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm group/prog">
                              {c.program ? (
                                <Badge variant="outline" className={`text-xs ${getProgramColor(c.program)}`}>{c.program}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                              <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover/prog:opacity-100 transition-opacity" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center gap-1 min-w-[160px]">
                            {(classPlansMap[c.id] || []).map(p => (
                              <Badge key={p.id} variant="outline" className="text-[10px] gap-1 border-primary/30 bg-primary/5 text-primary">
                                <ClipboardList className="h-3 w-3" />
                                {p.plan_name}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStudyPlanRemove(c.id, p.id); }}
                                  className="ml-0.5 hover:text-destructive"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </Badge>
                            ))}
                            <Select value="__none__" onValueChange={(val) => handleStudyPlanChange(c.id, val)}>
                              <SelectTrigger className="h-6 text-[10px] w-[120px] border-dashed">
                                <SelectValue placeholder="+ Gán kế hoạch" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Chọn —</SelectItem>
                                {studyPlans
                                  .filter(p => !(classPlansMap[c.id] || []).some(cp => cp.id === p.id))
                                  .map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Select
                            value={c.teacher_id || "__none__"}
                            onValueChange={(val) => handleTeacherChange(c.id, val)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[150px]">
                              <SelectValue placeholder="Chọn GV" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Chưa gán —</SelectItem>
                              {teacherOptions.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {getTeacherName(c) && !c.teacher_id && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]">{getTeacherName(c)}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {studentCounts[c.id] || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.schedule || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(c.status) as any}>{statusLabel(c.status)}</Badge>
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={10} className="bg-muted/30 p-0">
                          <div className="px-6 py-4 space-y-4">
                            {/* Leaderboard toggle */}
                            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
                              <div>
                                <p className="text-sm font-medium">Bảng xếp hạng</p>
                                <p className="text-[10px] text-muted-foreground">Hiện bảng xếp hạng tuần cho học viên</p>
                              </div>
                              <Switch
                                checked={c.leaderboard_enabled !== false}
                                onCheckedChange={async (checked) => {
                                  await supabase.from("teachngo_classes").update({ leaderboard_enabled: checked, updated_at: new Date().toISOString() }).eq("id", c.id);
                                  setClasses(prev => prev.map(cl => cl.id === c.id ? { ...cl, leaderboard_enabled: checked } : cl));
                                }}
                              />
                            </div>

                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Danh sách học viên</p>
                            {loadingStudents === c.id ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                              </div>
                            ) : (studentsMap[c.id] || []).length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">Không có học viên nào trong lớp này.</p>
                            ) : (
                              <div className="grid gap-1.5">
                                {(studentsMap[c.id] || []).map(s => (
                                  <div key={s.id} className="flex items-center gap-3 text-sm px-3 py-2 rounded-lg bg-card border">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium">{s.student_name}</span>
                                    <Badge variant={s.status === "enrolled" ? "default" : "secondary"} className="text-[10px] ml-auto">
                                      {s.status === "enrolled" ? "Đang học" : "Đã rời"}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
