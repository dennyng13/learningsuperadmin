import { useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, EyeOff, Layers, Loader2, Pencil, Plus,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import {
  useCoursesAdmin,
  type CourseProgramInput,
} from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { useCourses, type Course, type CourseInput } from "@admin/features/academic/hooks/useCourses";
import ProgramLevelManager from "@admin/features/academic/components/ProgramLevelManager";
import CourseCard from "@admin/features/academic/components/CourseCard";
import CourseEditorDialog from "@admin/features/academic/components/CourseEditorDialog";
import ProgramEditorDialog from "@admin/features/academic/components/ProgramEditorDialog";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

/**
 * /courses/programs/:key — chi tiết 1 chương trình (mô tả, đầu ra, cấp độ, khoá học gắn).
 * Dùng khi user click "Chi tiết" trong tab program ở /courses, hoặc gõ trực tiếp URL.
 */
export default function ProgramDetailPage() {
  const { key = "" } = useParams<{ key: string }>();
  const { programs, loading: programsLoading, refetch, update: updateProgram } = useCoursesAdmin();
  const { levels, refetch: refetchLevels } = useCourseLevels({ includeOrphans: true });

  const program = useMemo(
    () => programs.find((p) => p.key.toLowerCase() === key.toLowerCase()),
    [programs, key],
  );
  const {
    courses, loading: coursesLoading,
    getStats, getStudyPlanNames, create, update, remove, updateStudyPlans,
  } = useCourses({ programId: program?.id, withStats: true });

  /* ─── Program editor (inline) ─── */
  const [programEditorOpen, setProgramEditorOpen] = useState(false);
  const handleProgramSubmit = async (input: CourseProgramInput) => {
    if (!program) return;
    await updateProgram(program.id, input);
    await refetch();
  };

  /* ─── Course editor ─── */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (c: Course) => { setEditing(c); setEditorOpen(true); };

  const handleSubmit = async (input: CourseInput) => {
    if (editing) await update(editing.id, input);
    else await create(input);
  };

  const handleDelete = async (c: Course) => {
    try {
      await remove(c.id);
      toast.success(`Đã xoá khoá học "${c.name}".`);
    } catch (e: any) {
      toast.error(`Lỗi xoá: ${e?.message ?? "không rõ"}`);
    }
  };

  /* ─── Levels chỉ trong program (cho dialog resolve tên) ─── */
  const programLevels = useMemo(() => {
    if (!program) return [];
    const set = new Set(program.level_ids);
    return levels.filter((l) => set.has(l.id));
  }, [program, levels]);

  if (programsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!program) return <Navigate to="/courses" replace />;

  const Icon = getProgramIcon(program.key);
  const palette = getProgramPalette(program.key);
  const isInactive = program.status === "inactive";

  const onChanged = async () => {
    await Promise.all([refetch(), refetchLevels()]);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <Button asChild size="sm" variant="ghost" className="h-8 -ml-2 gap-1.5 text-xs text-muted-foreground">
        <Link to="/courses">
          <ArrowLeft className="h-3.5 w-3.5" /> Tất cả chương trình
        </Link>
      </Button>

      {/* Hero */}
      <section className={cn("rounded-2xl border bg-card overflow-hidden", isInactive && "opacity-80")}>
        <div className={cn("h-1.5 w-full", palette.progressFill)} />
        <div className="p-5 md:p-6 flex items-start gap-4">
          <div className={cn("h-16 w-16 rounded-xl flex items-center justify-center shrink-0", palette.iconBg)}>
            <Icon className={cn("h-8 w-8", palette.iconText)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Chương trình</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl md:text-3xl font-extrabold truncate">{program.name}</h1>
              <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {program.key}
              </code>
              {isInactive && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                  <EyeOff className="h-3 w-3" /> Đã ẩn
                </span>
              )}
            </div>
            {program.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{program.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => setProgramEditorOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Sửa chương trình
          </Button>
        </div>
      </section>

      {/* Note: Program chỉ giữ phạm vi (key/name/description ngắn).
          Mô tả chi tiết + đầu ra giờ thuộc về Course bên dưới. */}

      {/* Cấp độ thuộc chương trình */}
      <ProgramLevelManager program={program} allLevels={levels} onChanged={onChanged} />

      {/* Khoá học gắn vào chương trình — quản lý đầy đủ inline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className={cn("h-4 w-4", palette.iconText)} />
            <h2 className="font-display font-bold text-sm">
              Khoá học của {program.name} ({courses.length})
            </h2>
          </div>
          <Button onClick={openCreate} size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Thêm khoá học
          </Button>
        </div>

        {coursesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Chưa có khoá học nào trong chương trình {program.name}.
            </p>
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Tạo khoá học đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {courses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                programKey={program.key}
                programName={program.name}
                stats={getStats(c.id)}
                levels={levels}
                studyPlans={getStudyPlanNames(c.study_plan_ids)}
                onEdit={() => openEdit(c)}
                onDelete={() => handleDelete(c)}
                onAssignStudyPlans={(ids) => updateStudyPlans(c.id, ids)}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
            <Link to={`/classes/list?program=${encodeURIComponent(program.key)}`}>
              <Layers className="h-3 w-3 mr-1" />
              Xem tất cả lớp đang dùng {program.name}
            </Link>
          </Button>
        </div>
      </section>

      <CourseEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        programId={program.id}
        programKey={program.key}
        programName={program.name}
        levels={programLevels}
        course={editing}
        onSubmit={handleSubmit}
      />

      <ProgramEditorDialog
        open={programEditorOpen}
        onOpenChange={setProgramEditorOpen}
        initial={program}
        onSubmit={handleProgramSubmit}
      />
    </div>
  );
}