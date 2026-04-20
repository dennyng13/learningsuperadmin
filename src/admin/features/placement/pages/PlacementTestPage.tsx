import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import { FileText, Users, Plus, Copy, RotateCcw, Eye, EyeOff, Pencil, Trash2, Check, X, Search, MoreVertical, Loader2, ChevronDown, ChevronUp, BookOpen, Headphones, PenTool, Mic, Clock, MailWarning } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Card, CardContent } from "@shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Label } from "@shared/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@shared/lib/utils";
import ProspectFunnel from "@admin/features/placement/components/ProspectFunnel";

interface PlacementTest {
  id: string;
  name: string;
  description: string | null;
  skills: string[];
  status: string;
  show_results: boolean;
  allow_retake: boolean;
  link_expiry_hours: number | null;
  duration: number;
  level_thresholds: any[];
  created_at: string;
}

interface PlacementTestSection {
  id: string;
  placement_test_id: string;
  assessment_id: string;
  skill: string;
  sort_order: number;
}

interface Prospect {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  token: string;
  status: string;
  placement_test_id: string | null;
  suggested_level: string | null;
  admin_notes: string | null;
  expires_at: string | null;
  created_at: string;
}

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading", listening: "Listening", writing: "Writing", speaking: "Speaking",
};

const SKILL_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen className="h-3.5 w-3.5" />,
  listening: <Headphones className="h-3.5 w-3.5" />,
  writing: <PenTool className="h-3.5 w-3.5" />,
  speaking: <Mic className="h-3.5 w-3.5" />,
};

const statusLabels: Record<string, { label: string; className: string }> = {
  published: { label: "Xuất bản", className: "bg-primary/15 text-primary" },
  draft: { label: "Nháp", className: "bg-accent/15 text-accent" },
};

export default function PlacementTestPage() {
  const [tab, setTab] = useState("tests");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-extrabold">Bài thi sắp lớp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý đề thi sắp lớp và danh sách khách tiềm năng
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto gap-1 w-max md:w-auto">
            <TabsTrigger value="tests" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Đề thi
            </TabsTrigger>
            <TabsTrigger value="prospects" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Prospects
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tests" className="mt-6">
          <TabSkeleton><PlacementTestsTab /></TabSkeleton>
        </TabsContent>
        <TabsContent value="prospects" className="mt-6">
          <TabSkeleton><ProspectsTab /></TabSkeleton>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ======================== Tests Tab ======================== */
function PlacementTestsTab() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<PlacementTest[]>([]);
  const [sections, setSections] = useState<PlacementTestSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [testsRes, sectionsRes] = await Promise.all([
      supabase.from("placement_tests").select("*").order("created_at", { ascending: false }),
      supabase.from("placement_test_sections").select("*"),
    ]);
    setTests((testsRes.data as any[]) ?? []);
    setSections((sectionsRes.data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFilter = (value: string) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("placement_test_sections").delete().eq("placement_test_id", id);
    await supabase.from("placement_tests").delete().eq("id", id);
    toast.success("Đã xóa đề thi");
    setDeleteId(null);
    fetchData();
  };

  const toggleStatus = async (test: PlacementTest) => {
    const newStatus = test.status === "published" ? "draft" : "published";
    await supabase.from("placement_tests").update({ status: newStatus } as any).eq("id", test.id);
    toast.success(newStatus === "published" ? "Đã xuất bản" : "Đã chuyển về nháp");
    fetchData();
  };

  const hasFilters = statusFilters.size > 0 || search.trim().length > 0;
  const clearFilters = () => { setStatusFilters(new Set()); setSearch(""); setShowSearch(false); };

  const filtered = tests.filter(t => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      if (!t.name.toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q)) return false;
    }
    if (statusFilters.size > 0 && !statusFilters.has(t.status)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          {showSearch ? (
            <div className="relative min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Tìm đề thi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm rounded-full"
                onBlur={() => { if (!search) setShowSearch(false); }}
              />
              <button onClick={() => { setSearch(""); setShowSearch(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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

          {/* All chip */}
          <button
            onClick={clearFilters}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
              !hasFilters
                ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                : "bg-card border-border text-foreground hover:border-primary/40 hover:shadow-md"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Tất cả
            <span className={cn(
              "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
              !hasFilters ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {tests.length}
            </span>
          </button>

          {/* Status toggle */}
          <span className="h-5 w-px bg-border mx-0.5" />
          <button
            onClick={() => setStatusExpanded(!statusExpanded)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
              statusFilters.size > 0
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            Trạng thái
            {statusFilters.size > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{statusFilters.size}</span>
            )}
            <ChevronDown className={cn("h-3 w-3 transition-transform", statusExpanded && "rotate-180")} />
          </button>

          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} / {tests.length} đề thi</span>
        </div>

        <Button onClick={() => navigate("/placement/new")} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" /> Tạo đề mới
        </Button>
      </div>

      {/* Status chips row */}
      {statusExpanded && (
        <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
          {[
            { value: "published", label: "Xuất bản", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", active: "bg-emerald-200 text-emerald-800 border-emerald-300" },
            { value: "draft", label: "Nháp", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", active: "bg-gray-200 text-gray-700 border-gray-300" },
          ].map(st => {
            const count = tests.filter(t => t.status === st.value).length;
            if (count === 0) return null;
            const active = statusFilters.has(st.value);
            return (
              <button
                key={st.value}
                onClick={() => toggleFilter(st.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                  active ? `${st.active} shadow-md scale-105 ring-1 ring-offset-1` : `${st.bg} ${st.text} ${st.border} hover:shadow-md hover:scale-[1.02]`
                )}
              >
                {st.label}
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", active ? `bg-white/40 ${st.text}` : `bg-white/60 ${st.text}`)}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Test cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Chưa có đề thi sắp lớp nào</p>
          <p className="text-sm mt-1">Bấm "Tạo đề mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(test => {
            const skills = Array.isArray(test.skills) ? test.skills : [];
            const st = statusLabels[test.status] || statusLabels.draft;
            const testSections = sections.filter(s => s.placement_test_id === test.id);

            return (
              <div
                key={test.id}
                className="bg-card rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-dark flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{test.name}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.className}`}>
                      {st.label}
                    </span>
                  </div>
                  {test.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{test.description}</p>}
                  <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                    {skills.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-medium">
                        {SKILL_ICONS[s]} {SKILL_LABELS[s] || s}
                      </span>
                    ))}
                    <span className="text-[10px] text-muted-foreground">
                      {Math.floor(test.duration / 60)} phút
                    </span>
                    {test.show_results && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                        <Eye className="h-3 w-3" /> Hiện KQ
                      </span>
                    )}
                    {test.allow_retake && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 font-medium">
                        <RotateCcw className="h-3 w-3" /> Thi lại
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {testSections.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {testSections.length} assessment gắn
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/placement/${test.id}`)}>
                      <Pencil className="h-4 w-4 mr-2" /> Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleStatus(test)}>
                      {test.status === "published" ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {test.status === "published" ? "Chuyển nháp" : "Xuất bản"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(test.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đề thi sắp lớp?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn đề thi và các section liên quan. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ======================== Prospects Tab ======================== */
function ProspectsTab() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [tests, setTests] = useState<PlacementTest[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [createDialog, setCreateDialog] = useState(false);
  const [newProspect, setNewProspect] = useState({ full_name: "", email: "", phone: "", placement_test_id: "" });
  const [detailDialog, setDetailDialog] = useState<Prospect | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<"name" | "status" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProspect, setDeletingProspect] = useState<Prospect | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, tRes, rRes] = await Promise.all([
      supabase.from("prospects").select("*").order("created_at", { ascending: false }),
      supabase.from("placement_tests").select("id, name, status, allow_retake"),
      supabase.from("prospect_results").select("*"),
    ]);
    setProspects((pRes.data as any[]) ?? []);
    setTests((tRes.data as any[]) ?? []);
    setResults((rRes.data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!newProspect.full_name.trim()) { toast.error("Tên là bắt buộc"); return; }
    const { error } = await supabase.from("prospects").insert({
      full_name: newProspect.full_name.trim(),
      email: newProspect.email.trim() || null,
      phone: newProspect.phone.trim() || null,
      placement_test_id: newProspect.placement_test_id || null,
      source: "manual",
    } as any).select("*").single();

    if (error) { toast.error("Lỗi tạo prospect"); return; }
    toast.success("Đã tạo prospect");
    setCreateDialog(false);
    setNewProspect({ full_name: "", email: "", phone: "", placement_test_id: "" });
    fetchData();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/placement/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Đã copy link bài thi");
  };

  const resetProspect = async (prospect: Prospect) => {
    await supabase.from("prospect_results").delete().eq("prospect_id", prospect.id);
    await supabase.from("prospects").update({ status: "pending" } as any).eq("id", prospect.id);
    toast.success("Đã reset, prospect có thể thi lại");
    fetchData();
  };

  const handleDelete = async () => {
    if (!deletingProspect) return;
    await supabase.from("prospect_results").delete().eq("prospect_id", deletingProspect.id);
    await supabase.from("prospects").delete().eq("id", deletingProspect.id);
    toast.success("Đã xóa prospect");
    setDeleteDialogOpen(false);
    setDeletingProspect(null);
    fetchData();
  };

  const toggleSort = (col: "name" | "status" | "date") => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const filtered = prospects.filter((p) => {
    const matchSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || (p.email || "").toLowerCase().includes(search.toLowerCase()) || (p.phone || "").includes(search);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "name") return a.full_name.localeCompare(b.full_name, "vi") * dir;
    if (sortCol === "status") return (a.status || "").localeCompare(b.status || "") * dir;
    if (sortCol === "date") return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    return 0;
  });

  const getTestName = (id: string | null) => {
    if (!id) return "—";
    return tests.find(t => t.id === id)?.name || "—";
  };

  const prospectResults = (prospectId: string) => results.filter(r => r.prospect_id === prospectId);

  const pendingCount = prospects.filter(p => p.status === "pending").length;
  const inProgressCount = prospects.filter(p => p.status === "in_progress").length;
  const completedCount = prospects.filter(p => p.status === "completed").length;

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Funnel */}
      <ProspectFunnel
        stages={[
          { label: "Chưa thi", count: pendingCount },
          { label: "Đang thi", count: inProgressCount },
          { label: "Hoàn thành", count: completedCount },
        ]}
        className="mb-2"
      />

      <div className="bg-card border rounded-xl p-3 space-y-2.5">
        {/* Row 1: Stats chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{filtered.length}</span>
            <span className="text-muted-foreground font-normal">tổng</span>
          </div>
          <span className="h-3.5 w-px bg-border" />
          <button onClick={() => setFilterStatus(filterStatus === "pending" ? "all" : "pending")} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", filterStatus === "pending" ? "bg-amber-600 text-white border-amber-600 font-bold" : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white hover:border-amber-600 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400")}>
            <Clock className="h-3 w-3" />{pendingCount} chưa thi
          </button>
          <button onClick={() => setFilterStatus(filterStatus === "in_progress" ? "all" : "in_progress")} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", filterStatus === "in_progress" ? "bg-sky-600 text-white border-sky-600 font-bold" : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-600 hover:text-white hover:border-sky-600 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-400")}>
            <Loader2 className="h-3 w-3" />{inProgressCount} đang thi
          </button>
          <button onClick={() => setFilterStatus(filterStatus === "completed" ? "all" : "completed")} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", filterStatus === "completed" ? "bg-emerald-600 text-white border-emerald-600 font-bold" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400")}>
            <Check className="h-3 w-3" />{completedCount} đã thi
          </button>
          {filterStatus !== "all" && (
            <button onClick={() => setFilterStatus("all")} className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1">
              Bỏ lọc
            </button>
          )}
        </div>

        {/* Row 2: Search + Actions */}
        <div className="flex gap-2 flex-wrap items-center">
          {search || searchOpen ? (
            <div className="relative flex-1 min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} onBlur={() => { if (!search) setSearchOpen(false); }} placeholder="Tìm tên, email, SĐT..." className="h-8 pl-8 pr-7 text-xs" autoFocus />
              <button onClick={() => { setSearch(""); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSearchOpen(true)}>
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button onClick={() => setCreateDialog(true)} size="sm" variant="outline" className="gap-1 h-8 text-xs px-3 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-600 dark:hover:text-white dark:hover:border-emerald-600 transition-colors">
            <Plus className="h-3.5 w-3.5" />Tạo prospect
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{prospects.length === 0 ? "Chưa có prospect nào" : "Không tìm thấy prospect phù hợp"}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-dark text-dark-foreground text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="inline-flex items-center gap-1">Tên <SortIcon col="name" /></span>
                  </th>
                  <th className="px-4 py-3 font-semibold w-40 hidden lg:table-cell">Đề thi</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    <span className="inline-flex items-center gap-1 justify-center">Trạng thái <SortIcon col="status" /></span>
                  </th>
                  <th className="px-4 py-3 font-semibold w-24 text-center hidden md:table-cell">Điểm</th>
                  <th className="px-4 py-3 font-semibold w-28 text-center hidden xl:table-cell cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    <span className="inline-flex items-center gap-1 justify-center">Ngày tạo <SortIcon col="date" /></span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p, idx) => {
                  const pResults = prospectResults(p.id);
                  const avgScore = pResults.length > 0 ? (pResults.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / pResults.length).toFixed(1) : null;
                  const isExpanded = expandedId === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={cn("transition-colors", idx % 2 === 0 ? "bg-card" : "bg-muted/20", "hover:bg-primary/8")}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/80 shrink-0"
                              onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                            <div>
                              <span className="font-semibold text-[13px] leading-tight">{p.full_name}</span>
                              {!p.email && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <MailWarning className="inline h-3.5 w-3.5 text-amber-500 ml-1" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p className="text-xs">Chưa có email</p></TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{getTestName(p.placement_test_id)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full",
                            p.status === "completed" && "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
                            p.status === "in_progress" && "bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400",
                            p.status === "pending" && "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full",
                              p.status === "completed" && "bg-emerald-500",
                              p.status === "in_progress" && "bg-sky-500",
                              p.status === "pending" && "bg-amber-500",
                            )} />
                            {p.status === "completed" ? "Đã thi" : p.status === "in_progress" ? "Đang thi" : "Chưa thi"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center hidden md:table-cell">
                          {avgScore ? (
                            <span className="font-bold text-sm">{avgScore}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center hidden xl:table-cell text-xs text-muted-foreground">
                          {format(new Date(p.created_at), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex gap-0.5 justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(p.token)}><Copy className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">Copy link thi</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resetProspect(p)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">Reset cho thi lại</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeletingProspect(p); setDeleteDialogOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">Xóa prospect</p></TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded row */}
                      {isExpanded && (
                        <tr className="bg-muted/30">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground block mb-0.5">Email</span>
                                <span className="font-medium">{p.email || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-0.5">SĐT</span>
                                <span className="font-medium">{p.phone || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-0.5">Nguồn</span>
                                <Badge variant="secondary" className="text-[10px]">{p.source}</Badge>
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-0.5">Đề thi</span>
                                <span className="font-medium">{getTestName(p.placement_test_id)}</span>
                              </div>
                              {p.suggested_level && (
                                <div>
                                  <span className="text-muted-foreground block mb-0.5">Gợi ý level</span>
                                  <Badge className="text-[10px]">{p.suggested_level}</Badge>
                                </div>
                              )}
                            </div>

                            {pResults.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <span className="text-xs font-semibold mb-2 block">Kết quả thi</span>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {pResults.map((r: any) => (
                                    <div key={r.id} className="bg-card border rounded-lg p-2.5">
                                      <span className="text-[10px] text-muted-foreground capitalize block">{r.section_type}</span>
                                      <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className="text-lg font-bold">{r.score ?? "—"}</span>
                                        <span className="text-[10px] text-muted-foreground">({r.correct_answers}/{r.total_questions})</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t flex gap-2">
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => copyLink(p.token)}>
                                <Copy className="h-3 w-3" /> Copy link
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => resetProspect(p)}>
                                <RotateCcw className="h-3 w-3" /> Reset
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo prospect mới</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Họ tên *</Label><Input value={newProspect.full_name} onChange={e => setNewProspect(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={newProspect.email} onChange={e => setNewProspect(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>SĐT</Label><Input value={newProspect.phone} onChange={e => setNewProspect(p => ({ ...p, phone: e.target.value }))} /></div>
            <div>
              <Label>Đề thi sắp lớp</Label>
              <Select value={newProspect.placement_test_id} onValueChange={v => setNewProspect(p => ({ ...p, placement_test_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn đề thi..." /></SelectTrigger>
                <SelectContent>
                  {tests.filter(t => (t as any).status === "published").map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Hủy</Button>
            <Button onClick={handleCreate}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setDeletingProspect(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa prospect?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa <strong>{deletingProspect?.full_name}</strong> và tất cả kết quả thi liên quan. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}