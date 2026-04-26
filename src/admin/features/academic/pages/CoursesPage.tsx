import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, Plus, Pencil, Trash2, Loader2, EyeOff, CheckCircle2, Layers, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { useCoursesAdmin, type CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import ProgramEditorDialog from "@admin/features/academic/components/ProgramEditorDialog";
import CourseLevelManager from "@admin/features/settings/components/CourseLevelManager";
import ProgramLevelsMatrix from "@admin/features/academic/components/ProgramLevelsMatrix";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { COLOR_PRESETS } from "@shared/utils/levelColors";
import { cn } from "@shared/lib/utils";

/**
 * Module Quản lý Khóa học — gom mọi thiết lập về "program" vào một chỗ:
 *   • Tab "Khóa học": CRUD programs (IELTS / WRE / Customized…) — gồm
 *     mô tả, cấp độ liên kết, đầu ra (outcomes).
 *   • Tab "Cấp độ":  CRUD course_levels (chuyển từ trang Lớp học cũ).
 *
 * Yêu cầu DB: chạy migration `docs/migrations/2026-04-26-courses-module.sql`
 * để thêm cột `programs.outcomes / long_description` và bảng `program_levels`.
 */
export default function CoursesPage() {
  const { programs, loading, refetch, create, update, remove, setProgramLevels } = useCoursesAdmin();
  const { levels } = useCourseLevels();
  const navigate = useNavigate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CourseProgram | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => navigate("/courses/new");
  const handleEdit = (p: CourseProgram) => navigate(`/courses/${p.id}/edit`);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      toast.success("Đã xóa khóa học");
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Học thuật
          </p>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Quản lý Khóa học
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Cấu hình các chương trình học (IELTS, WRE, Customized…) cùng cấp độ và đầu ra.
          </p>
        </div>
      </header>

      <Tabs defaultValue="programs" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="programs" className="text-xs gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Khóa học
            <span className="ml-1 px-1.5 rounded bg-muted text-[10px] font-mono">{programs.length}</span>
          </TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Gán cấp độ
          </TabsTrigger>
          <TabsTrigger value="levels" className="text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Cấp độ
            <span className="ml-1 px-1.5 rounded bg-muted text-[10px] font-mono">{levels.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab Khóa học ─── */}
        <TabsContent value="programs" className="mt-4 space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={handleCreate} size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Tạo khóa học
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
              <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Chưa có khóa học nào</p>
              <Button onClick={handleCreate} size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5 mr-1" /> Tạo khóa học đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {programs.map((p) => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  levels={levels}
                  onEdit={() => handleEdit(p)}
                  onDelete={() => setDeleteId(p.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab Gán cấp độ (Matrix) ─── */}
        <TabsContent value="matrix" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ProgramLevelsMatrix
              programs={programs}
              levels={levels}
              onSave={setProgramLevels}
            />
          )}
        </TabsContent>

        {/* ─── Tab Cấp độ ─── */}
        <TabsContent value="levels" className="mt-4">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div>
              <h2 className="font-display font-bold text-base">Danh sách cấp độ</h2>
              <p className="text-xs text-muted-foreground">
                Thêm, sửa, xóa cấp độ. Đồng bộ với bộ lọc trong Lớp học, Kho bài tập và Khóa học.
              </p>
            </div>
            <CourseLevelManager />
          </div>
        </TabsContent>
      </Tabs>

      <ProgramEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        onSubmit={async (input) => {
          if (editing) await update(editing.id, input);
          else await create(input);
          await refetch();
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khóa học này?</AlertDialogTitle>
            <AlertDialogDescription>
              Liên kết level sẽ bị xóa theo. Lớp/bài tập đã gán khóa này sẽ giữ lại giá trị cũ
              nhưng có thể không hiển thị màu/tên đúng nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ───────────────────────── Program card ───────────────────────── */
function ProgramCard({
  program,
  levels,
  onEdit,
  onDelete,
}: {
  program: CourseProgram;
  levels: { id: string; name: string; color_key: string | null }[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = getProgramIcon(program.key);
  const palette = getProgramPalette(program.key);
  const linked = program.level_ids
    .map((id) => levels.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => !!l);
  const isInactive = program.status === "inactive";

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md",
        isInactive && "opacity-60",
      )}
    >
      {/* Accent bar */}
      <div className={cn("h-1 w-full", palette.progressFill)} />

      <div className="p-4 space-y-3">
        {/* Header: icon + name + actions */}
        <div className="flex items-start gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", palette.iconBg)}>
            <Icon className={cn("h-5 w-5", palette.iconText)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base truncate">{program.name}</h3>
              {isInactive && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                  <EyeOff className="h-3 w-3" /> Ẩn
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">{program.key}</p>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {program.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {program.description}
          </p>
        )}

        {/* Levels */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Cấp độ ({linked.length})
          </p>
          {linked.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 italic">Chưa gán level</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {linked.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-muted/30 text-[10px] font-medium"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: l.color_key ? COLOR_PRESETS[l.color_key]?.swatch : "#d1d5db" }}
                  />
                  {l.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Outcomes */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Đầu ra ({program.outcomes.length})
          </p>
          {program.outcomes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 italic">Chưa có outcome</p>
          ) : (
            <ul className="space-y-0.5">
              {program.outcomes.slice(0, 3).map((o, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug">
                  <CheckCircle2 className={cn("h-3 w-3 shrink-0 mt-0.5", palette.iconText)} />
                  <span className="text-foreground/80">{o}</span>
                </li>
              ))}
              {program.outcomes.length > 3 && (
                <li className="text-[10px] text-muted-foreground pl-4.5">
                  +{program.outcomes.length - 3} mục khác
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}