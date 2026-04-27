import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, CheckCircle2, Layers, Users, CalendarDays, ClipboardList,
  Pencil, Trash2, EyeOff, PlayCircle, Sparkles, Plus, Star,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@shared/components/ui/alert-dialog";
import { cn } from "@shared/lib/utils";
import { getProgramPalette } from "@shared/utils/programColors";
import { getLevelColorConfig } from "@shared/utils/levelColors";
import type { Course, CourseStats } from "@admin/features/academic/hooks/useCourses";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";

interface Props {
  course: Course;
  programKey: string;
  programName: string;
  stats: CourseStats;
  /** Tất cả levels (để resolve tên hiển thị) */
  levels: CourseLevel[];
  /** Tên study plan templates đã link (đã resolve sẵn ở hook). */
  studyPlans?: Array<{ id: string; name: string }>;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CourseCard({
  course, programKey, programName, stats, levels, studyPlans, onEdit, onDelete,
}: Props) {
  const palette = getProgramPalette(programKey);
  const isInactive = course.status === "inactive";

  const linkedLevelNames = useMemo(() => {
    const map = new Map(levels.map((l) => [l.id, l]));
    return course.level_ids
      .map((id) => map.get(id))
      .filter(Boolean) as CourseLevel[];
  }, [course.level_ids, levels]);

  const plans = studyPlans ?? course.study_plan_ids.map((id) => ({ id, name: "Plan" }));
  const planCount = plans.length;

  return (
    <article
      className={cn(
        "group rounded-2xl border bg-card overflow-hidden flex flex-col h-full transition-all",
        "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30",
        isInactive && "opacity-70",
      )}
    >
      {/* Top accent strip + soft tint */}
      <div className={cn("h-1.5 w-full", palette.progressFill)} />
      <div
        className={cn(
          "absolute inset-x-0 top-1.5 h-16 pointer-events-none bg-gradient-to-b to-transparent",
          palette.bannerGradient,
        )}
        aria-hidden
      />

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

      {/* ─── 1. Mô tả khoá học (cố định 2 dòng để đồng cao) ─── */}
      <Section
        icon={<Sparkles className={cn("h-3 w-3", palette.iconText)} />}
        label="Mô tả khoá học"
      >
        <p className="text-xs text-foreground/80 line-clamp-2 min-h-[2rem] leading-relaxed">
          {course.description || (
            <span className="italic text-muted-foreground/60">Chưa có mô tả ngắn.</span>
          )}
        </p>
      </Section>

      {/* ─── 2. Đầu ra khoá học (cố định 3 dòng) ─── */}
      <Section
        icon={<CheckCircle2 className={cn("h-3 w-3", palette.iconText)} />}
        label={`Đầu ra khoá học (${course.outcomes.length})`}
      >
        <div className="rounded-lg bg-muted/40 p-2.5 min-h-[5.25rem]">
          {course.outcomes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/60 italic">Chưa có đầu ra nào.</p>
          ) : (
            <ul className="space-y-1">
              {course.outcomes.slice(0, 3).map((o, i) => (
                <li
                  key={i}
                  className="text-[11px] text-foreground/85 leading-snug flex items-start gap-1.5"
                >
                  <span className={cn("mt-1 h-1 w-1 rounded-full shrink-0", palette.progressFill)} />
                  <span className="truncate">{o}</span>
                </li>
              ))}
              {course.outcomes.length > 3 && (
                <li className="text-[10px] text-muted-foreground italic pl-3">
                  +{course.outcomes.length - 3} đầu ra khác
                </li>
              )}
            </ul>
          )}
        </div>
      </Section>

      {/* ─── 3. Thống kê (4 ô đồng đều) ─── */}
      <Section
        icon={<Layers className={cn("h-3 w-3", palette.iconText)} />}
        label="Thống kê"
      >
        <div className="grid grid-cols-4 gap-1.5">
          <BigStat
            icon={<Layers className="h-3 w-3" />}
            value={course.level_ids.length}
            label="Cấp độ"
            tone={palette.iconText}
          />
          <BigStat
            icon={<CalendarDays className="h-3 w-3" />}
            value={stats.totalClasses}
            label="Lớp"
            tone={palette.iconText}
          />
          <BigStat
            icon={<PlayCircle className="h-3 w-3" />}
            value={stats.activeClasses}
            label="Đang chạy"
            tone={palette.iconText}
            highlight
          />
          <BigStat
            icon={<Users className="h-3 w-3" />}
            value={stats.uniqueStudents}
            label="Học viên"
            tone={palette.iconText}
          />
        </div>

        {/* Linked levels chips dưới stats */}
        {linkedLevelNames.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {linkedLevelNames.slice(0, 5).map((n, i) => (
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
            {linkedLevelNames.length > 5 && (
              <span className="text-[10px] text-muted-foreground self-center">
                +{linkedLevelNames.length - 5}
              </span>
            )}
          </div>
        )}
      </Section>

      {/* ─── 4. Study plans đang gán (cố định min-height) ─── */}
      <Section
        icon={<ClipboardList className={cn("h-3 w-3", palette.iconText)} />}
        label={`Study plan đang gán (${planCount})`}
      >
        <div className="min-h-[2.25rem]">
          {planCount === 0 ? (
            <Link
              to="/study-plans/templates"
              className={cn(
                "flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-md border border-dashed",
                "text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors",
              )}
            >
              <Plus className="h-3 w-3" />
              Chưa gán plan — tạo / chọn study plan
            </Link>
          ) : (
            <div className="flex flex-wrap gap-1">
              {plans.slice(0, 3).map((p, idx) => (
                <Link
                  key={p.id}
                  to={`/study-plans/templates`}
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
                    "bg-background hover:bg-muted transition-colors max-w-[160px]",
                    idx === 0 && "border-primary/40 bg-primary/5",
                  )}
                  title={idx === 0 ? `${p.name} (mặc định)` : p.name}
                >
                  {idx === 0 && <Star className="h-2.5 w-2.5 fill-current text-primary shrink-0" />}
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}
              {plans.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{plans.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Section>

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

/* ─────────────────────────── Sub-components ─────────────────────────── */

function Section({
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function BigStat({
  icon, value, label, tone, highlight,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  tone: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md px-1.5 py-1.5 text-center transition-colors",
        highlight ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted/30",
      )}
    >
      <div className={cn("flex items-center justify-center", tone)}>
        {icon}
      </div>
      <p className="text-base font-display font-extrabold leading-none mt-1">
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 truncate">
        {label}
      </p>
    </div>
  );
}