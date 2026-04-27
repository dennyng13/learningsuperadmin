import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useStudyPlanTemplates, useTemplateMutations, type StudyPlanTemplate } from "@shared/hooks/useStudyPlanTemplates";
import { usePrograms } from "@shared/hooks/usePrograms";
import { getProgramPalette, getProgramIcon } from "@shared/utils/programColors";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Skeleton } from "@shared/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@shared/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Search, Layers, FileStack } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { TemplateEditor } from "./TemplateEditor";
import { CloneTemplateDialog } from "./CloneTemplateDialog";

interface Props {
  teacherMode?: boolean;
}

export function TemplateList({ teacherMode = false }: Props) {
  const { data: templates, isLoading } = useStudyPlanTemplates();
  const { deleteTemplate } = useTemplateMutations();
  const { programs } = usePrograms();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editTarget, setEditTarget] = useState<Partial<StudyPlanTemplate> | null | "new">(null);
  const [cloneTarget, setCloneTarget] = useState<StudyPlanTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<StudyPlanTemplate | null>(null);
  const initialProgram = (searchParams.get("program") || "all").toLowerCase();
  const [filterProgram, setFilterProgram] = useState(initialProgram);
  const [search, setSearch] = useState("");

  /** Programs filter chips: "all" + dynamic programs from DB. */
  const programChips = useMemo(
    () => [
      { key: "all", label: "Tất cả", colorKey: null as string | null },
      ...programs.map((p) => ({ key: p.key.toLowerCase(), label: p.name, colorKey: p.color_key })),
    ],
    [programs],
  );

  /**
   * Auto-open the editor when arriving via `?program=XYZ&new=1` deep link
   * (used by CourseEditor "Tạo study plan đầu tiên" button).
   */
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const programKey = (searchParams.get("program") || "").toLowerCase();
      setEditTarget(programKey ? ({ program: programKey } as any) : "new");
      // Clear the `new` flag so refresh doesn't re-open the dialog.
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <Button
          onClick={() => {
            // Prefill the program from the current filter when admin clicks "Tạo mẫu mới"
            // while a specific program is selected.
            setEditTarget(filterProgram !== "all" ? ({ program: filterProgram } as any) : "new");
          }}
        >
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
        {programChips.map((p) => {
          const active = filterProgram === p.key;
          const palette = p.key === "all" ? null : getProgramPalette(p.key);
          const Icon = p.key === "all" ? Layers : getProgramIcon(p.key);
          const count =
            p.key === "all"
              ? templates?.length || 0
              : (templates || []).filter((t) => (t.program || "").toLowerCase() === p.key).length;
          return (
            <button
              key={p.key}
              onClick={() => {
                setFilterProgram(p.key);
                const next = new URLSearchParams(searchParams);
                if (p.key === "all") next.delete("program");
                else next.set("program", p.key);
                setSearchParams(next, { replace: true });
              }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all",
                active
                  ? "ring-1 ring-offset-1"
                  : "bg-card border-border hover:border-primary/40 text-foreground",
              )}
              style={
                active && palette
                  ? { backgroundColor: palette.tint, borderColor: palette.solid, color: palette.solid }
                  : active
                    ? undefined
                    : undefined
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {p.label}
              <span
                className={cn(
                  "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  active ? "bg-background/60" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((tpl) => {
          const programKey = (tpl.program || "").toLowerCase();
          const palette = programKey ? getProgramPalette(programKey) : null;
          const programLabel = programs.find((p) => p.key.toLowerCase() === programKey)?.name || tpl.program;
          return (
            <Card
              key={tpl.id}
              className="hover:shadow-md transition-shadow border-l-4"
              style={palette ? { borderLeftColor: palette.solid } : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={
                        palette
                          ? { background: `linear-gradient(135deg, ${palette.solid}, ${palette.gradientTo})` }
                          : { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }
                      }
                    >
                      <FileStack className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate">{tpl.template_name}</p>
                        {tpl.program && (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={
                              palette
                                ? { backgroundColor: palette.tint, color: palette.solid, borderColor: palette.solid }
                                : undefined
                            }
                          >
                            {programLabel}
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
