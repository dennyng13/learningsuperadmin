import { useState, useMemo } from "react";
import { useStudyPlanTemplates, useTemplateMutations, type StudyPlanTemplate } from "@shared/hooks/useStudyPlanTemplates";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Skeleton } from "@shared/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@shared/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Search, BookOpen, GraduationCap, Sparkles, Layers, FileStack } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { TemplateEditor } from "./TemplateEditor";
import { CloneTemplateDialog } from "./CloneTemplateDialog";

const PROGRAMS = [
  { value: "all", label: "Tất cả", icon: <Layers className="h-3.5 w-3.5" /> },
  { value: "ielts", label: "IELTS", icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { value: "wre", label: "WRE", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: "customized", label: "Customized", icon: <Sparkles className="h-3.5 w-3.5" /> },
];

const PROGRAM_STYLE: Record<string, { gradient: string; badge: string; border: string }> = {
  ielts: { gradient: "bg-gradient-to-br from-sky-500 to-blue-600", badge: "bg-sky-50 text-sky-700 border-sky-200", border: "border-l-sky-200" },
  wre: { gradient: "bg-gradient-to-br from-violet-500 to-purple-600", badge: "bg-violet-50 text-violet-700 border-violet-200", border: "border-l-violet-200" },
  customized: { gradient: "bg-gradient-to-br from-amber-500 to-orange-600", badge: "bg-amber-50 text-amber-700 border-amber-200", border: "border-l-amber-200" },
};

interface Props {
  teacherMode?: boolean;
}

export function TemplateList({ teacherMode = false }: Props) {
  const { data: templates, isLoading } = useStudyPlanTemplates();
  const { deleteTemplate } = useTemplateMutations();
  const [editTarget, setEditTarget] = useState<Partial<StudyPlanTemplate> | null | "new">(null);
  const [cloneTarget, setCloneTarget] = useState<StudyPlanTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StudyPlanTemplate | null>(null);
  const [filterProgram, setFilterProgram] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!templates) return [];
    let r = templates;
    if (filterProgram !== "all") r = r.filter(t => (t.program || "").toLowerCase() === filterProgram);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(t =>
        (t.template_name || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [templates, filterProgram, search]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTemplate.mutateAsync(deleteConfirm.id);
      toast.success("Đã xoá mẫu");
    } catch (e: any) {
      toast.error(e.message);
    }
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <FileStack className="w-6 h-6 text-primary" />
            Mẫu kế hoạch (Templates)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {templates?.length || 0} mẫu · Tạo mẫu một lần, gán cho nhiều lớp/học viên
          </p>
        </div>
        <Button onClick={() => setEditTarget("new")}>
          <Plus className="w-4 h-4 mr-1" /> Tạo mẫu mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm mẫu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 w-48 rounded-full text-sm"
          />
        </div>
        {PROGRAMS.map(p => {
          const active = filterProgram === p.value;
          const cfg = PROGRAM_STYLE[p.value];
          const count = p.value === "all" ? templates?.length || 0 : (templates || []).filter(t => (t.program || "").toLowerCase() === p.value).length;
          return (
            <button
              key={p.value}
              onClick={() => setFilterProgram(p.value)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all",
                active
                  ? cfg ? `${cfg.badge} ring-1 ring-offset-1 ring-current` : "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/40"
              )}
            >
              {p.icon}
              {p.label}
              <span className={cn("ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                active ? (cfg ? "opacity-70" : "bg-primary-foreground/20") : "bg-muted text-muted-foreground"
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map(tpl => {
          const cfg = PROGRAM_STYLE[(tpl.program || "").toLowerCase()];
          return (
            <Card key={tpl.id} className={cn("hover:shadow-md transition-shadow border-l-4", cfg?.border || "border-l-muted")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0",
                      cfg?.gradient || "bg-gradient-to-br from-primary to-primary/70"
                    )}>
                      <FileStack className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{tpl.template_name}</p>
                        {tpl.program && (
                          <Badge variant="outline" className={cn("text-[10px]", cfg?.badge)}>
                            {PROGRAMS.find(p => p.value === (tpl.program || "").toLowerCase())?.label || tpl.program}
                          </Badge>
                        )}
                        {tpl.assigned_level && (
                          <Badge variant="outline" className="text-[10px] bg-muted/50">{tpl.assigned_level}</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] bg-muted/50">
                          {tpl.total_sessions} buổi × {tpl.session_duration}′
                        </Badge>
                      </div>
                      {tpl.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{tpl.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" className="h-8" onClick={() => setCloneTarget(tpl)}>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Gán
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(tpl)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(tpl)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileStack className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có mẫu nào</p>
            <p className="text-sm">Tạo mẫu để tái sử dụng cho nhiều lớp/học viên</p>
          </div>
        )}
      </div>

      {editTarget !== null && (
        <TemplateEditor
          template={editTarget === "new" ? {} : editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {cloneTarget && (
        <CloneTemplateDialog
          template={cloneTarget}
          teacherMode={teacherMode}
          onClose={() => setCloneTarget(null)}
        />
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá mẫu?</AlertDialogTitle>
            <AlertDialogDescription>
              Xoá mẫu <strong>{deleteConfirm?.template_name}</strong>? Các kế hoạch đã gán từ mẫu này không bị ảnh hưởng.
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
    </div>
  );
}
