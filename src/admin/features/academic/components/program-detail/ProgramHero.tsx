/**
 * ProgramHero — Hero card cho Program Detail
 * Match mockup pages-program-detail.jsx "pd-hero"
 *
 * Features:
 * - Large emoji sticker với rotate + shadow
 * - Gradient background theo program color
 * - Program code, status badge, level badge, bestseller tag
 * - 2x2 stat grid (Học viên, Lớp, Khóa, Band lift)
 * - Sub stats row (Học phí, Doanh thu, Hoàn thành, Hài lòng, Retention)
 * - Action buttons: Mở lớp, Duplicate, Sửa, Download
 */
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Plus, Copy, Pencil, Download } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface ProgramHeroProps {
  program: {
    code: string;
    name: string;
    tagline: string;
    level: string;
    emoji: string;
    color: "coral" | "teal" | "sky" | "violet" | "yellow";
    status: "active" | "draft" | "archived";
    desc: string;
    students: number;
    classes: number;
    courses: number;
    weeks: number;
    bandLiftAvg: number;
    pricing: { full: number; perWeek: number };
    revenue: number;
    target: number;
    completion: number;
    satisfaction: number;
    retention: number;
  };
  onOpenClass?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onDownload?: () => void;
}

const COLOR_MAP: Record<string, { bg: string; text: string; soft: string; deep: string }> = {
  coral: { bg: "bg-rose-500", text: "text-rose-600", soft: "bg-rose-50", deep: "text-rose-700" },
  teal: { bg: "bg-teal-500", text: "text-teal-600", soft: "bg-teal-50", deep: "text-teal-700" },
  sky: { bg: "bg-sky-500", text: "text-sky-600", soft: "bg-sky-50", deep: "text-sky-700" },
  violet: { bg: "bg-violet-500", text: "text-violet-600", soft: "bg-violet-50", deep: "text-violet-700" },
  yellow: { bg: "bg-amber-400", text: "text-amber-600", soft: "bg-amber-50", deep: "text-amber-700" },
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(0) + "T";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + "M";
  return (n / 1_000).toFixed(0) + "K";
}

export function ProgramHero({ program, onOpenClass, onDuplicate, onEdit, onDownload }: ProgramHeroProps) {
  const color = COLOR_MAP[program.color] || COLOR_MAP.coral;

  const mainStats = [
    { label: "Học viên", value: program.students, sub: "đang theo", color: "coral" as const },
    { label: "Lớp active", value: program.classes, sub: "+ 1 sắp mở", color: "teal" as const },
    { label: "Khoá", value: program.courses, sub: `${program.weeks} tuần`, color: "yellow" as const },
    { label: "Band lift", value: `+${program.bandLiftAvg}`, sub: "TB / cohort", color: "violet" as const },
  ];

  const subStats = [
    { label: "Học phí", value: formatCurrency(program.pricing.full), sub: `~${(program.pricing.perWeek / 1000).toFixed(0)}k/tuần` },
    { label: "Doanh thu QTD", value: formatCurrency(program.revenue), sub: `${Math.round((program.revenue / program.target) * 100)}% target` },
    { label: "Hoàn thành", value: program.completion + "%", sub: "> ngưỡng 75%" },
    { label: "Hài lòng", value: program.satisfaction + "%", sub: "feedback HV" },
    { label: "Retention", value: program.retention + "%", sub: "tuần 1 → kết thúc" },
  ];

  return (
    <Card className="overflow-hidden border-[2.5px] border-lp-ink shadow-pop">
      {/* Top gradient section */}
      <div className={cn("relative p-6 md:p-8", color.soft)} style={{
        background: `linear-gradient(135deg, var(--${program.color}-soft, #fef2f2) 0%, #fff 70%)`,
      }}>
        {/* Decorative dot grid */}
        <div className="absolute top-4 right-28 w-36 h-20 opacity-10 pointer-events-none hidden md:block"
          style={{
            background: "radial-gradient(circle, #000 1.2px, transparent 1.5px)",
            backgroundSize: "14px 14px",
          }}
        />

        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-start">
          {/* Left: Title block */}
          <div>
            {/* Emoji + badges row */}
            <div className="flex items-start gap-4 mb-3">
              {/* Big emoji sticker */}
              <div className="w-20 h-20 rounded-2xl bg-white border-[2.5px] border-lp-ink shadow-pop flex items-center justify-center text-4xl shrink-0"
                style={{ transform: "rotate(-4deg)" }}
              >
                {program.emoji}
              </div>

              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold text-lp-body tracking-wider uppercase">
                    {program.code}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    program.status === "active"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                      : "bg-slate-100 text-slate-600 border-slate-300"
                  )}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {program.status}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    color.bg,
                    program.color === "yellow" ? "text-lp-ink" : "text-white"
                  )}>
                    {program.level}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-300 text-lp-ink border-lp-ink">
                    ⭐ Bestseller
                  </span>
                </div>

                {/* Title */}
                <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight leading-none mb-2">
                  {program.name}
                </h1>
                <p className="text-sm md:text-base text-lp-body font-semibold">
                  {program.tagline}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-lp-ink leading-relaxed max-w-2xl mb-4">
              {program.desc}
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={onOpenClass} className="bg-rose-500 hover:bg-rose-600 text-white border-[2px] border-lp-ink shadow-pop-sm">
                <Plus className="h-4 w-4 mr-1" /> Mở lớp mới
              </Button>
              <Button variant="outline" onClick={onDuplicate} className="border-[2px] border-lp-ink shadow-pop-sm">
                <Copy className="h-4 w-4 mr-1" /> Duplicate
              </Button>
              <Button variant="outline" onClick={onEdit} className="border-[2px] border-lp-ink shadow-pop-sm">
                <Pencil className="h-4 w-4 mr-1" /> Sửa lộ trình
              </Button>
              <Button variant="outline" onClick={onDownload} className="bg-amber-300 hover:bg-amber-400 text-lp-ink border-[2px] border-lp-ink shadow-pop-sm">
                <Download className="h-4 w-4 mr-1" /> Brochure PDF
              </Button>
            </div>
          </div>

          {/* Right: Main stats grid */}
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            {mainStats.map((s) => (
              <div
                key={s.label}
                className="bg-white border-[2px] border-lp-ink rounded-xl p-3 shadow-pop-xs"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-lp-body mb-1">
                  {s.label}
                </div>
                <div className={cn("font-display text-2xl font-black leading-none", COLOR_MAP[s.color].text)}>
                  {s.value}
                </div>
                <div className="text-[10px] font-bold text-lp-body mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 border-t-2 border-lp-ink">
        {subStats.map((s, i, arr) => (
          <div
            key={s.label}
            className={cn(
              "px-4 py-3",
              i < arr.length - 1 && "border-r border-dashed border-lp-ink/30"
            )}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-lp-body mb-1">
              {s.label}
            </div>
            <div className="font-display text-xl font-black leading-none">{s.value}</div>
            <div className="text-[10px] font-bold text-lp-body mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
