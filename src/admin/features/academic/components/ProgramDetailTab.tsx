import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, EyeOff, Info, Loader2, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import type { CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";
import { getProgramIcon, getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";
import { useCourses, type Course, type CourseInput } from "@admin/features/academic/hooks/useCourses";
import CourseCard from "@admin/features/academic/components/CourseCard";
import CourseEditorDialog from "@admin/features/academic/components/CourseEditorDialog";

/**
 * Tab nội dung cho 1 program (vd. IELTS / WRE / Customized).
 *
 * Layout:
 *   • Hero: icon + tên + mô tả ngắn + nút "Sửa".
 *   • Stats strip: số level, số class đang chạy, số học viên (unique).
 *   • Mô tả chi tiết (long_description).
 *   • Outcomes list.
 *   • Cấp độ thuộc program (đã sắp xếp theo program_levels.sort_order).
 *   • Lớp học đang chạy (active/upcoming, link → /classes/:id).
 */

interface Props {
  program: CourseProgram;
  levels: CourseLevel[];
  onChanged: () => void | Promise<void>;
}

interface ClassRow {
  id: string;
  name: string | null;
  class_name: string | null;
  class_code: string | null;
  level: string | null;
  start_date: string | null;
  end_date: string | null;
  student_count: number | null;
  lifecycle_status: string | null;
  student_ids: any;
}

export default function ProgramDetailTab({ program, levels, onChanged: _onChanged }: Props) {
  const Icon = getProgramIcon(program.key);
  const palette = getProgramPalette(program.key);
  const isInactive = program.status === "inactive";

  /* ─── Courses của program ─── */
  const { courses, loading, getStats, create, update, remove } = useCourses({
    programId: program.id,
    withStats: true,
  });

  /* ─── Levels chỉ trong program này (để dialog & card resolve tên) ─── */
  const programLevels = useMemo(() => {
    const set = new Set(program.level_ids);
    return levels.filter((l) => set.has(l.id));
  }, [program.level_ids, levels]);

  /* ─── Editor ─── */
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

  return (
    <div className={cn("space-y-5", isInactive && "opacity-80")}>
      {/* ─── Hero rút gọn (chi tiết đầy đủ ở /courses/programs/:key) ─── */}
      <section className="rounded-2xl border bg-card overflow-hidden">
        <div className={cn("h-1 w-full", palette.progressFill)} />
        <div className="p-4 md:p-5 flex items-start gap-3 md:gap-4">
          <div className={cn("h-12 w-12 md:h-14 md:w-14 rounded-xl flex items-center justify-center shrink-0", palette.iconBg)}>
            <Icon className={cn("h-6 w-6 md:h-7 md:w-7", palette.iconText)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-lg md:text-xl font-extrabold truncate">{program.name}</h2>
              <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{program.key}</code>
              {isInactive && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                  <EyeOff className="h-3 w-3" /> Đã ẩn
                </span>
              )}
            </div>
            {program.description && (
              <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{program.description}</p>
            )}
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
            <Link to={`/courses/programs/${program.key}`}>
              <Info className="h-3.5 w-3.5" /> Chi tiết
            </Link>
          </Button>
        </div>
      </section>

      {/* ─── Toolbar khoá học ─── */}
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className={cn("h-4 w-4", palette.iconText)} />
          <h3 className="font-display font-bold text-sm">
            Khoá học của {program.name} ({courses.length})
          </h3>
        </div>
        <Button onClick={openCreate} size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Thêm khoá học
        </Button>
      </section>

      {/* ─── Grid khoá học ─── */}
      {loading ? (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <CourseSkeleton key={i} />)}
        </div>
      ) : courses.length === 0 ? (
        <section className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Chưa có khoá học nào trong chương trình {program.name}.
          </p>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Tạo khoá học đầu tiên
          </Button>
        </section>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              programKey={program.key}
              programName={program.name}
              stats={getStats(c.id)}
              levels={levels}
              onEdit={() => openEdit(c)}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      {/* Footer link */}
      <div className="flex justify-end">
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
          <Link to={`/classes/list?program=${encodeURIComponent(program.key)}`}>
            Xem tất cả lớp đang dùng {program.name} <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>

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
    </div>
  );
}

/* ───────────── Skeleton card (đồng cao với CourseCard) ───────────── */
function CourseSkeleton() {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden flex flex-col">
      <div className="h-1 w-full bg-muted" />
      <div className="p-4 pb-2 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="px-4 pb-2">
        <div className="h-8 w-full rounded bg-muted/60 animate-pulse" />
      </div>
      <div className="px-4 pb-3">
        <div className="h-[4.5rem] w-full rounded-lg bg-muted/40 animate-pulse" />
      </div>
      <div className="px-4 pb-3 grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-md bg-muted/30 animate-pulse" />
        ))}
      </div>
      <div className="mt-auto border-t bg-muted/20 px-3 py-2 flex items-center gap-2">
        <div className="h-5 flex-1 rounded bg-muted animate-pulse" />
        <div className="h-5 w-5 rounded bg-muted animate-pulse" />
        <div className="h-5 w-5 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}