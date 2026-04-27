import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, CheckCircle2, Layers, Users, CalendarDays, ClipboardList,
  Pencil, Trash2, EyeOff, PlayCircle, Sparkles, Plus, Star,
  Wallet, Clock, UserCheck, Target,
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

  /** Format VND theo locale vi-VN, vd 3500000 -> "3.500.000 ₫". */
  const formattedPrice = useMemo(() => {
    if (course.price_vnd == null || course.price_vnd <= 0) return null;
    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(course.price_vnd);
    } catch {
      return `${course.price_vnd.toLocaleString("vi-VN")} ₫`;
    }
  }, [course.price_vnd]);

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
        "group relative rounded-2xl border bg-card overflow-hidden flex flex-col h-full",
        "transition-all duration-300 ease-out",
        "shadow-sm hover:shadow-xl hover:-translate-y-1",
        palette.accentBorder,
        isInactive && "opacity-70 grayscale-[0.3]",
      )}
    >
      {/* Top accent strip — đường nhấn theo program */}
      <div className={cn("h-1.5 w-full", palette.progressFill)} />
      {/* Soft tint banner — fade mượt, không over */}
      <div
        className={cn(
          "absolute inset-x-0 top-1.5 h-24 pointer-events-none bg-gradient-to-b",
          palette.bannerGradient,
        )}
        aria-hidden
      />
      {/* Decorative glow blob phải — rất nhạt, chỉ để có chiều sâu */}
      <div
        className={cn(
          "absolute -top-10 -right-10 h-32 w-32 rounded-full pointer-events-none blur-3xl opacity-20",
          palette.progressFill,
        )}
        aria-hidden
      />

      {/* Header */}
      <header className="relative p-4 pb-3 flex items-start gap-3">
        <div
          className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
            "shadow-md ring-1 ring-white/40 dark:ring-white/10",
            palette.progressFill,
          )}
        >
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-display font-extrabold text-base sm:text-[17px] leading-tight truncate tracking-tight text-foreground">
              {course.name}
            </h3>
            {isInactive && <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={cn(
              "inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
              palette.accentSoftBg, palette.accentText,
            )}>
              {programName}
            </span>
            {course.cefr_range && (
              <span className={cn(
                "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border",
                "bg-background/80 backdrop-blur-sm",
                palette.accentText, palette.accentBorder,
              )}>
                {course.cefr_range}
              </span>
            )}
          </div>
        </div>
        {/* Price chip — điểm nhấn chính, gradient đậm + chữ trắng */}
        {formattedPrice && (
          <div
            className={cn(
              "shrink-0 text-right rounded-xl px-3 py-1.5 text-white",
              "shadow-lg shadow-black/10 ring-1 ring-white/20",
              "bg-gradient-to-br",
              palette.progressFill, // base color đậm
            )}
            title={`Học phí: ${formattedPrice}`}
          >
            <p className="text-[9px] uppercase tracking-widest font-bold flex items-center justify-end gap-1 text-white/85">
              <Wallet className="h-2.5 w-2.5" />
              Học phí
            </p>
            <p className="text-sm font-display font-extrabold leading-tight tabular-nums whitespace-nowrap">
              {formattedPrice}
            </p>
          </div>
        )}
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
        {/* Quick facts strip — duration · sessions · hours · max students */}
        {(course.duration_label || course.total_sessions != null
          || course.hours_per_session != null || course.max_students != null) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {course.duration_label && (
              <Fact icon={<CalendarDays className="h-3 w-3" />} text={course.duration_label} tone={palette.iconText} />
            )}
            {course.total_sessions != null && (
              <Fact icon={<ClipboardList className="h-3 w-3" />} text={`${course.total_sessions} buổi`} tone={palette.iconText} />
            )}
            {course.hours_per_session != null && (
              <Fact icon={<Clock className="h-3 w-3" />} text={`${course.hours_per_session}h / buổi`} tone={palette.iconText} />
            )}
            {course.max_students != null && (
              <Fact icon={<Users className="h-3 w-3" />} text={`Tối đa ${course.max_students} HV`} tone={palette.iconText} />
            )}
          </div>
        )}
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

      {/* ─── 2b. Đối tượng phù hợp + Vấn đề giải quyết ─── */}
      {(course.target_audience || course.problem_solving) && (
        <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {course.target_audience && (
            <RichBlock
              icon={<UserCheck className={cn("h-3 w-3", palette.iconText)} />}
              label="Phù hợp với"
              text={course.target_audience}
              tone={palette}
            />
          )}
          {course.problem_solving && (
            <RichBlock
              icon={<Target className={cn("h-3 w-3", palette.iconText)} />}
              label="Khoá học giúp bạn"
              text={course.problem_solving}
              tone={palette}
            />
          )}
        </div>
      )}

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
          <div className="mt-2.5 flex flex-wrap gap-1">
            {linkedLevelNames.slice(0, 5).map((lv) => {
              const cfg = getLevelColorConfig(lv.color_key || lv.name);
              return (
                <span
                  key={lv.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border",
                    "transition-all hover:shadow-sm hover:-translate-y-0.5",
                    cfg
                      ? cn(cfg.bg, cfg.text, cfg.border)
                      : cn(palette.accentSoftBg, palette.accentText, palette.accentBorder),
                  )}
                  title={lv.target_score ? `${lv.name} • ${lv.target_score}` : lv.name}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0 ring-1 ring-white/70"
                    style={{ backgroundColor: cfg?.swatch ?? "currentColor" }}
                    aria-hidden
                  />
                  {lv.name}
                </span>
              );
            })}
            {linkedLevelNames.length > 5 && (
              <span className="text-[10px] font-semibold text-muted-foreground self-center px-1.5">
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
                    "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border max-w-[170px]",
                    "transition-all hover:-translate-y-0.5 hover:shadow-md",
                    idx === 0
                      ? cn(
                          "text-white shadow-md ring-1 ring-white/20 border-transparent font-bold",
                          "bg-gradient-to-r",
                          palette.bannerGradient,
                        )
                      : "bg-background hover:bg-muted",
                  )}
                  title={idx === 0 ? `${p.name} (mặc định)` : p.name}
                >
                  {idx === 0 && <Star className="h-3 w-3 fill-current text-yellow-300 drop-shadow shrink-0" />}
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

function Fact({ icon, text, tone }: { icon: React.ReactNode; text: string; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border bg-background/60",
      )}
    >
      <span className={tone}>{icon}</span>
      {text}
    </span>
  );
}

/**
 * Block giàu nội dung dùng cho `target_audience` và `problem_solving`.
 * Hỗ trợ multiline (whitespace-pre-line) và markdown nhẹ (xuống dòng tự nhiên).
 * Giới hạn 4 dòng + tooltip hiển thị toàn văn khi hover để giữ card đồng cao.
 */
function RichBlock({
  icon, label, text, tone,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  tone: { accentSoftBg: string; accentBorder: string; accentText: string };
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2 min-h-[4.5rem] flex flex-col",
        tone.accentSoftBg, tone.accentBorder,
      )}
      title={text}
    >
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", tone.accentText)}>
          {label}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-foreground/85 whitespace-pre-line line-clamp-4">
        {text}
      </p>
    </div>
  );
}