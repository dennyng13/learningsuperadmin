import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Loader2, Layers, ArrowLeft, AlertTriangle, Search, GripVertical,
  Sparkles, Target,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { COLOR_PRESETS, getLevelColor } from "@shared/utils/levelColors";
import { cn } from "@shared/lib/utils";
import { useCoursesAdmin, type CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels, type CourseLevel } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import LevelEditorDialog from "@admin/features/academic/components/LevelEditorDialog";

/**
 * /courses/levels — Trang quản lý "Khoá học (Cấp độ)" tập trung.
 *
 * Mỗi cấp độ = 1 hàng, hiển thị: tên + chương trình thuộc về (single) +
 * điểm mục tiêu + CEFR + template gắn kèm. Tạo/sửa qua `LevelEditorDialog`
 * (form đầy đủ trường: outcomes, mô tả dài, study plan template).
 *
 * Cấp độ thuộc ĐÚNG 1 chương trình (UI ép + DB UNIQUE sau migration
 * `20260427052737_course_levels_extend.sql`). Schema vẫn many-to-many
 * (program_levels) để dễ rollback nếu cần.
 */

export default function CourseLevelsPage() {
  const { programs, loading: programsLoading, refetch: refetchPrograms } = useCoursesAdmin();
  const { levels, loading: levelsLoading, refetch: refetchLevels } = useCourseLevels({ includeOrphans: true });
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");

  const [query, setQuery] = useState("");
  const [filterProgramId, setFilterProgramId] = useState<string>("");

  /** levelId → program (single) */
  const programByLevel = useMemo(() => {
    const m = new Map<string, CourseProgram>();
    for (const p of programs) {
      for (const lid of p.level_ids) m.set(lid, p);
    }
    return m;
  }, [programs]);

  /**
   * Sắp xếp theo (program.sort_order, program_levels.sort_order trong mỗi
   * program). Vì `levels` từ `useCourseLevels` đã order theo
   * `course_levels.sort_order` (global), ta cần group lại theo program để
   * drag-and-drop chỉ thay đổi `program_levels.sort_order` của program đó.
   */
  const orderedLevels = useMemo(() => {
    // Map levelId → vị trí trong program.level_ids (đã đúng order theo program_levels.sort_order)
    const posByLevel = new Map<string, { programOrder: number; idxInProgram: number }>();
    for (const p of programs) {
      p.level_ids.forEach((lid, idx) => {
        posByLevel.set(lid, { programOrder: p.sort_order ?? 0, idxInProgram: idx });
      });
    }
    return [...levels].sort((a, b) => {
      const pa = posByLevel.get(a.id);
      const pb = posByLevel.get(b.id);
      // Orphan (không thuộc program) đẩy xuống cuối
      if (!pa && !pb) return a.sort_order - b.sort_order;
      if (!pa) return 1;
      if (!pb) return -1;
      if (pa.programOrder !== pb.programOrder) return pa.programOrder - pb.programOrder;
      return pa.idxInProgram - pb.idxInProgram;
    });
  }, [levels, programs]);

  const filteredLevels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderedLevels.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q)) return false;
      if (filterProgramId) {
        const p = programByLevel.get(l.id);
        if (!p || p.id !== filterProgramId) return false;
      }
      return true;
    });
  }, [orderedLevels, query, filterProgramId, programByLevel]);

  /* ─── Drag & drop sort (chỉ trong cùng 1 program) ─── */
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Optimistic override: programId → ordered levelIds (chỉ render trong khi đang lưu)
  const [optimistic, setOptimistic] = useState<Record<string, string[]>>({});
  const savingRef = useRef(false);

  const displayLevels = useMemo(() => {
    if (Object.keys(optimistic).length === 0) return filteredLevels;
    // Áp optimistic order: với mỗi program có override, sắp xếp lại các level
    // của program đó trong filteredLevels theo thứ tự override.
    const byProgram = new Map<string, CourseLevel[]>();
    const orphans: CourseLevel[] = [];
    for (const l of filteredLevels) {
      const p = programByLevel.get(l.id);
      if (!p) { orphans.push(l); continue; }
      const arr = byProgram.get(p.id) ?? [];
      arr.push(l);
      byProgram.set(p.id, arr);
    }
    const result: CourseLevel[] = [];
    // Giữ thứ tự program theo lần xuất hiện đầu tiên trong filteredLevels
    const seen = new Set<string>();
    for (const l of filteredLevels) {
      const p = programByLevel.get(l.id);
      if (!p) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const list = byProgram.get(p.id) ?? [];
      const override = optimistic[p.id];
      if (override) {
        const map = new Map(list.map((x) => [x.id, x]));
        for (const id of override) {
          const item = map.get(id);
          if (item) result.push(item);
        }
      } else {
        result.push(...list);
      }
    }
    result.push(...orphans);
    return result;
  }, [filteredLevels, optimistic, programByLevel]);

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!dragId || dragId === id) return;
    setOverId(id);
  };
  const handleDragEnd = () => { setDragId(null); setOverId(null); };

  const persistOrder = async (programId: string, orderedIds: string[]) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      // Xoá hết link của program rồi insert lại theo thứ tự mới (đơn giản,
      // tránh race trên UNIQUE(level_id) khi update từng dòng).
      const { error: delErr } = await (supabase as any)
        .from("program_levels")
        .delete()
        .eq("program_id", programId);
      if (delErr) throw delErr;
      const rows = orderedIds.map((level_id, idx) => ({
        program_id: programId, level_id, sort_order: idx,
      }));
      if (rows.length > 0) {
        const { error: insErr } = await (supabase as any).from("program_levels").insert(rows);
        if (insErr) throw insErr;
      }
      toast.success("Đã lưu thứ tự");
      await Promise.all([refetchLevels(), refetchPrograms()]);
    } catch (err: any) {
      toast.error(`Lỗi lưu thứ tự: ${err.message ?? "Unknown"}`);
      await Promise.all([refetchLevels(), refetchPrograms()]);
    } finally {
      savingRef.current = false;
      setOptimistic({});
    }
  };

  const handleDrop = async (e: React.DragEvent, dropId: string) => {
    e.preventDefault();
    const draggedId = dragId;
    handleDragEnd();
    if (!draggedId || draggedId === dropId) return;

    const dragProgram = programByLevel.get(draggedId);
    const dropProgram = programByLevel.get(dropId);
    if (!dragProgram) {
      toast.error("Cấp độ chưa thuộc chương trình — gán chương trình trước.");
      return;
    }
    if (!dropProgram || dropProgram.id !== dragProgram.id) {
      toast.error(`Chỉ kéo thả trong cùng 1 chương trình. Để chuyển sang chương trình khác, sửa cấp độ.`);
      return;
    }

    // Build new order cho program này
    const currentIds = [...dragProgram.level_ids];
    const fromIdx = currentIds.indexOf(draggedId);
    const toIdx = currentIds.indexOf(dropId);
    if (fromIdx < 0 || toIdx < 0) return;
    currentIds.splice(fromIdx, 1);
    currentIds.splice(toIdx, 0, draggedId);

    setOptimistic({ [dragProgram.id]: currentIds });
    await persistOrder(dragProgram.id, currentIds);
  };

  /* ─── Editor dialog ─── */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<CourseLevel | null>(null);
  const focusedRef = useRef(false);

  const openCreate = () => {
    setEditingLevel(null);
    setEditorOpen(true);
  };
  const openEdit = (l: CourseLevel) => {
    setEditingLevel(l);
    setEditorOpen(true);
  };

  // Auto-open editor cho ?focus=
  useEffect(() => {
    if (focusedRef.current) return;
    if (!focusId || levelsLoading || programsLoading) return;
    const target = levels.find((l) => l.id === focusId);
    if (!target) return;
    focusedRef.current = true;
    openEdit(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, levels, levelsLoading, programsLoading]);

  /* ─── Delete ─── */
  const [deleteTarget, setDeleteTarget] = useState<CourseLevel | null>(null);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("course_levels").delete().eq("id", deleteTarget.id);
    if (error) toast.error(`Lỗi xoá: ${error.message}`);
    else {
      toast.success(`Đã xoá "${deleteTarget.name}"`);
      await Promise.all([refetchLevels(), refetchPrograms()]);
    }
    setDeleteTarget(null);
  };

  const handleSaved = async () => {
    await Promise.all([refetchLevels(), refetchPrograms()]);
  };

  const loading = programsLoading || levelsLoading;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs -ml-2 mb-2 text-muted-foreground">
            <Link to="/courses">
              <ArrowLeft className="h-3 w-3 mr-1" /> Quay lại danh sách khoá
            </Link>
          </Button>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <Layers className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Khoá học (Cấp độ)
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Mỗi <strong>cấp độ</strong> thuộc <strong>đúng 1 chương trình</strong>.
            Mô tả đầu ra, điểm mục tiêu, CEFR, và Study Plan Template được khai báo ở đây.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="h-8 gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Tạo cấp độ
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm cấp độ…"
            className="h-9 text-sm pl-8"
          />
        </div>
        <select
          value={filterProgramId}
          onChange={(e) => setFilterProgramId(e.target.value)}
          className="h-9 text-sm px-3 rounded-md border bg-background"
        >
          <option value="">Tất cả chương trình</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-display font-bold text-sm">
              Tất cả cấp độ ({filteredLevels.length}/{levels.length})
            </h3>
          </div>

          {displayLevels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 italic">
              {levels.length === 0 ? "Chưa có cấp độ nào." : "Không có cấp độ khớp bộ lọc."}
            </p>
          ) : (
            <div className="divide-y">
              {displayLevels.map((l) => {
                const owner = programByLevel.get(l.id);
                const Icon = owner ? getProgramIcon(owner.key) : null;
                const palette = owner ? getProgramPalette(owner.key) : null;
                const draggable = !!owner;
                const isDragging = dragId === l.id;
                const isOver = overId === l.id && dragId !== null && dragId !== l.id;
                const dragOwner = dragId ? programByLevel.get(dragId) : null;
                const sameProgram = dragOwner && owner && dragOwner.id === owner.id;
                return (
                  <div
                    key={l.id}
                    draggable={draggable}
                    onDragStart={() => handleDragStart(l.id)}
                    onDragOver={(e) => handleDragOver(e, l.id)}
                    onDrop={(e) => handleDrop(e, l.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "px-4 py-3 flex items-center gap-3 transition-colors select-none",
                      isDragging && "opacity-40",
                      isOver && sameProgram && "bg-primary/10",
                      isOver && !sameProgram && "bg-destructive/5",
                      dragId === null && "hover:bg-muted/20",
                    )}
                  >
                    <GripVertical
                      className={cn(
                        "h-4 w-4 shrink-0",
                        draggable
                          ? "text-muted-foreground/50 cursor-grab"
                          : "text-muted-foreground/20 cursor-not-allowed",
                      )}
                    />
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full border shrink-0",
                        l.color_key ? "" : "border-dashed border-muted-foreground/40",
                      )}
                      style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                    />
                    <span className={cn(
                      "font-medium text-sm px-2 py-0.5 rounded shrink-0",
                      getLevelColor(l.color_key || l.name),
                    )}>
                      {l.name}
                    </span>

                    <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                      {owner && Icon && palette ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                            palette.iconBg, palette.iconText,
                          )}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {owner.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Chưa thuộc chương trình
                        </span>
                      )}

                      {l.cefr && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          CEFR {l.cefr}
                        </span>
                      )}
                      {l.target_score && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Target className="h-2.5 w-2.5" /> {l.target_score}
                        </span>
                      )}
                      {l.study_plan_template_id && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary" title="Có Study Plan Template">
                          <Sparkles className="h-2.5 w-2.5" /> Template
                        </span>
                      )}
                      {Array.isArray(l.outcomes) && l.outcomes.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {l.outcomes.length} đầu ra
                        </span>
                      )}
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      title="Sửa cấp độ"
                      onClick={() => openEdit(l)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      title="Xoá cấp độ"
                      onClick={() => setDeleteTarget(l)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <p className="text-[11px] text-muted-foreground -mt-2">
        Kéo <GripVertical className="inline h-3 w-3" /> để sắp xếp cấp độ trong cùng 1 chương trình.
        Chuyển cấp độ sang chương trình khác qua nút <Pencil className="inline h-3 w-3" /> Sửa.
      </p>

      <LevelEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        level={editingLevel}
        programs={programs}
        initialProgramId={filterProgramId || null}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá cấp độ "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (() => {
                const owner = programByLevel.get(deleteTarget.id);
                return owner ? (
                  <>
                    Cấp độ đang thuộc <strong>{owner.name}</strong> và sẽ bị gỡ khỏi chương trình.
                    Lớp/bài tập đã gán cấp độ này sẽ giữ giá trị cũ nhưng có thể không hiển thị màu/tên đúng nữa.
                  </>
                ) : (
                  <>Cấp độ này hiện không thuộc chương trình nào — sẽ bị xoá hoàn toàn.</>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoá vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
