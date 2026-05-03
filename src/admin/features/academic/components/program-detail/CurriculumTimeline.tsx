/**
 * CurriculumTimeline — Lộ trình các khóa học trong chương trình
 * Match mockup pages-program-detail.jsx "Course timeline"
 *
 * Features:
 * - Vertical spine với numbered bullets
 * - Course cards với emoji, state badges (completed/active/upcoming)
 * - Focus tags
 * - Band progression
 */
import { Card } from "@shared/components/ui/card";
import { cn } from "@shared/lib/utils";

interface Course {
  idx: number;
  code: string;
  name: string;
  weeks: number;
  lessons: number;
  focus: string[];
  band: string;
  emoji: string;
  state: "completed" | "active" | "upcoming";
}

interface CurriculumTimelineProps {
  courses: Course[];
  duration: string;
  programColor: string;
}

const STATE_CONFIG = {
  completed: { color: "teal", label: "✓ Xong", bg: "bg-teal-500" },
  active: { color: "coral", label: "● Đang chạy", bg: "bg-rose-500" },
  upcoming: { color: "sky", label: "◯ Sắp tới", bg: "bg-sky-100" },
};

const COLOR_SOFT: Record<string, string> = {
  teal: "bg-teal-50",
  coral: "bg-rose-50",
  sky: "bg-sky-50",
  violet: "bg-violet-50",
  yellow: "bg-amber-50",
};

export function CurriculumTimeline({ courses, duration, programColor }: CurriculumTimelineProps) {
  return (
    <Card className="p-5 md:p-6 border-[2.5px] border-lp-ink shadow-pop bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-lp-ink text-white text-[10px] font-bold">
            01
          </span>
          <h2 className="font-display text-lg md:text-xl font-bold">
            Lộ trình <span className={cn("text-rose-600")}>6 khoá</span>
          </h2>
        </div>
        <div className="text-xs text-lp-body font-semibold">{duration}</div>
      </div>

      {/* Timeline */}
      <div className="relative pl-7">
        {/* Spine */}
        <div className="absolute left-[11px] top-3.5 bottom-3.5 w-[3px] bg-lp-ink rounded-full" />

        {/* Course items */}
        <div className="space-y-4">
          {courses.map((c, i) => {
            const state = STATE_CONFIG[c.state];
            const isLast = i === courses.length - 1;
            const isActive = c.state === "active";

            return (
              <div
                key={c.code}
                className={cn(
                  "relative rounded-xl border-[2px] border-lp-ink p-4 transition-shadow",
                  isActive ? "bg-rose-50 shadow-pop" : "bg-white shadow-pop-xs"
                )}
              >
                {/* Bullet */}
                <div
                  className={cn(
                    "absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-[2.5px] border-lp-ink flex items-center justify-center font-display text-[11px] font-black",
                    c.state === "upcoming" ? "bg-white text-lp-ink" : "text-white",
                    state.bg
                  )}
                >
                  {c.idx}
                </div>

                <div className="flex items-center gap-3">
                  {/* Emoji box */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl border-[2px] border-lp-ink flex items-center justify-center text-2xl shrink-0",
                      COLOR_SOFT[state.color] || "bg-slate-50"
                    )}
                  >
                    {c.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Code + State badge */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] font-bold text-lp-body tracking-wider">
                        {c.code}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                          state.bg,
                          c.state === "upcoming" ? "text-lp-ink" : "text-white"
                        )}
                      >
                        {state.label}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="font-display text-base font-bold leading-tight mb-1">
                      {c.name}
                    </div>

                    {/* Focus tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {c.focus.map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-lp-ink/20"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Band + duration */}
                  <div className="text-right shrink-0">
                    <div className="font-display text-sm font-bold text-rose-600">
                      {c.band}
                    </div>
                    <div className="text-[10px] font-bold text-lp-body">
                      {c.weeks}t · {c.lessons} bài
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
