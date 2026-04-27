import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, CheckCircle2, Layers, Users, CalendarDays, ClipboardList,
  Pencil, Trash2, EyeOff,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@shared/components/ui/alert-dialog";
import { cn } from "@shared/lib/utils";
import { getProgramPalette } from "@shared/utils/programColors";
import type { Course, CourseStats } from "@admin/features/academic/hooks/useCourses";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";

interface Props {
  course: Course;
  programKey: string;
  programName: string;
  stats: CourseStats;
  /** Tất cả levels (để resolve tên hiển thị) */
  levels: CourseLevel[];
  studyPlanCount?: number;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CourseCard({
  course, programKey, programName, stats, levels, studyPlanCount, onEdit, onDelete,
}: Props) {
  const palette = getProgramPalette(programKey);
  const isInactive = course.status === "inactive";

  const linkedLevelNames = useMemo(() => {
    const map = new Map(levels.map((l) => [l.id, l.name]));
    return course.level_ids.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [course.level_ids, levels]);

  const planCount = studyPlanCount ?? course.study_plan_ids.length;

  return (
    <article
      className={cn(
        "group rounded-2xl border bg-card overflow-hidden flex flex-col h-full transition-all",
        "hover:shadow-md hover:border-primary/30",
        isInactive && "opacity-70",
      )}
    >
      {/* Top accent strip */}
      <div className={cn("h-1 w-full", palette.progressFill)} />

      {/* Header */}
      <header className="p-4 pb-2 flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", palette.iconBg)}>
          <BookOpen className={cn("h-5 w-5", palette.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-display font-bold text-base leading-tight truncate">
              {course.name}
            </h3>
            {isInactive && <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
            {programName}
          </p>
        </div>
      </header>

      {/* Description (fixed height to align cards) */}
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem] leading-relaxed">
          {course.description || (
            <span className="italic text-muted-foreground/60">Chưa có mô tả ngắn.</span>
          )}
        </p>
      </div>

      {/* Outcomes preview */}
      <div className="px-4 pb-3">
        <div className="rounded-lg bg-muted/40 p-2.5 min-h-[4.5rem]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className={cn("h-3 w-3", palette.iconText)} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Đầu ra ({course.outcomes.length})
            </span>
          </div>
          {course.outcomes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 italic">Chưa có đầu ra nào.</p>
          ) : (
            <ul className="space-y-0.5">
              {course.outcomes.slice(0, 2).map((o, i) => (
                <li key={i} className="text-[11px] text-foreground/80 truncate flex items-start gap-1">
                  <span className="text-muted-foreground/60 shrink-0">•</span>
                  <span className="truncate">{o}</span>
                </li>
              ))}
              {course.outcomes.length > 2 && (
                <li className="text-[10px] text-muted-foreground italic">
                  +{course.outcomes.length - 2} đầu ra khác
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 pb-3 grid grid-cols-4 gap-1.5">
        <Stat icon={<Layers className="h-3 w-3" />} value={course.level_ids.length} label="Cấp độ" tone={palette.iconText} />
        <Stat icon={<CalendarDays className="h-3 w-3" />} value={stats.activeClasses} label="Lớp" sub={`/${stats.totalClasses}`} tone={palette.iconText} />
        <Stat icon={<Users className="h-3 w-3" />} value={stats.uniqueStudents} label="HV" tone={palette.iconText} />
        <Stat icon={<ClipboardList className="h-3 w-3" />} value={planCount} label="Plan" tone={palette.iconText} />
      </div>

      {/* Linked levels chips */}
      {linkedLevelNames.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {linkedLevelNames.slice(0, 4).map((n, i) => (
            <span
              key={i}
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                palette.accentSoftBg,
                palette.accentText,
              )}
            >
              {n}
            </span>
          ))}
          {linkedLevelNames.length > 4 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{linkedLevelNames.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer actions */}
      <footer className="mt-auto border-t bg-muted/20 px-3 py-2 flex items-center gap-1.5">
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs flex-1 justify-start">
          <Link to={`/classes/list?program=${encodeURIComponent(programKey)}`}>
            Xem lớp
          </Link>
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit} aria-label="Sửa">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" aria-label="Xoá">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xoá khoá học "{course.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể hoàn tác. Liên kết với cấp độ và study plan sẽ bị xoá.
                Lớp đang dùng các cấp độ này KHÔNG bị ảnh hưởng.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Xoá
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </footer>
    </article>
  );
}

function Stat({
  icon, value, label, sub, tone,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className="rounded-md bg-muted/30 px-1.5 py-1 text-center">
      <div className={cn("flex items-center justify-center gap-0.5", tone)}>
        {icon}
      </div>
      <p className="text-sm font-display font-extrabold leading-none mt-0.5">
        {value}
        {sub && <span className="text-[9px] font-normal text-muted-foreground ml-0.5">{sub}</span>}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}