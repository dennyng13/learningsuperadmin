import { useNavigate } from "react-router-dom";
import { FileText, BookOpen, ClipboardList, ArrowRight, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@shared/components/layouts/PageHeader";
import { cn } from "@shared/lib/utils";
import { useBrandShapes } from "@shared/hooks/useBrandShapes";
import type { ShapePalette } from "@admin/features/brand-assets/types";

/* ═══════════════════════════════════════════
   LIBRARY HUB — "Quản lý học liệu"
   Card-style hub gom 3 trang nội dung học thuật:
   · Ngân hàng đề  → /tests       (featured, palette: teal/primary)
   · Flashcard     → /flashcards   (palette: amber)
   · Study Plans   → /study-plans  (palette: indigo)
   Mỗi card có brand "geometric shape" lấy từ DB (brand_assets,
   asset_type=shape) ở góc dưới phải — đồng bộ visual với toàn bộ portal.
   ═══════════════════════════════════════════ */

type Tone = "featured" | "soft";

interface LibrarySection {
  id: string;
  title: string;
  blurb: string;          // 2-line marketing blurb (như "See what's happening at your company!")
  icon: LucideIcon;
  route: string;
  palette: ShapePalette;  // dùng để lookup shapes trong DB
  tone: Tone;
  extraLinks?: { label: string; route: string }[];
}

const SECTIONS: LibrarySection[] = [
  {
    id: "tests",
    title: "Ngân hàng đề",
    blurb: "Quản lý đề thi và bài luyện cho học viên trên toàn hệ thống.",
    icon: FileText,
    route: "/tests",
    palette: "teal",
    tone: "featured",
    extraLinks: [{ label: "Nhập đề từ file", route: "/tests/import" }],
  },
  {
    id: "flashcards",
    title: "Flashcard",
    blurb: "Bộ thẻ từ vựng dùng chung cho học viên và các lớp học.",
    icon: BookOpen,
    route: "/flashcards",
    palette: "amber",
    tone: "soft",
  },
  {
    id: "study-plans",
    title: "Study Plans",
    blurb: "Lộ trình học chuẩn và template gán cho lớp hoặc học viên.",
    icon: ClipboardList,
    route: "/study-plans",
    palette: "indigo",
    tone: "soft",
    extraLinks: [{ label: "Mẫu lộ trình", route: "/study-plans/templates" }],
  },
];

export default function LibraryHubPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-page-in">
      <PageHeader
        icon={Sparkles}
        title="Quản lý học liệu"
        subtitle="Tất cả nội dung học thuật ở một nơi: đề thi, flashcard và lộ trình học."
      />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <SectionCard key={s.id} section={s} />
        ))}
      </div>
    </div>
  );
}

/* ─────────── Card ─────────── */

function SectionCard({ section }: { section: LibrarySection }) {
  const Icon = section.icon;
  const navigate = useNavigate();
  const { urls } = useBrandShapes(section.palette);
  const featured = section.tone === "featured";

  return (
    <button
      onClick={() => navigate(section.route)}
      className={cn(
        "group relative aspect-[5/4] overflow-hidden rounded-3xl text-left",
        "border transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        featured
          ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20"
          : "bg-card text-card-foreground border-border/70 hover:border-primary/30",
      )}
    >
      {/* Brand geometric shapes — bottom-right corner. */}
      <BrandShapeCluster urls={urls} featured={featured} />

      {/* Top: Icon */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div
          className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center backdrop-blur-sm",
            featured
              ? "bg-primary-foreground/15 text-primary-foreground"
              : "bg-muted text-foreground/80",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      </div>

      {/* Middle: title + blurb */}
      <div className="relative z-10 px-6">
        <h3 className="font-display text-xl font-extrabold tracking-tight leading-tight">
          {section.title}
        </h3>
        <p
          className={cn(
            "text-sm mt-1.5 leading-snug max-w-[18rem]",
            featured ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          {section.blurb}
        </p>
      </div>

      {/* Bottom: arrow + extra links */}
      <div className="absolute z-10 inset-x-0 bottom-0 p-6 flex items-end justify-between gap-3">
        <ArrowRight
          className={cn(
            "h-5 w-5 transition-transform duration-300 group-hover:translate-x-1",
            featured ? "text-primary-foreground" : "text-foreground/70",
          )}
          strokeWidth={2.25}
        />
        {section.extraLinks && section.extraLinks.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {section.extraLinks.map((l) => (
              <span
                key={l.route}
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(l.route);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    navigate(l.route);
                  }
                }}
                className={cn(
                  "cursor-pointer px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                  featured
                    ? "bg-primary-foreground/15 border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/25"
                    : "bg-background/70 border-border/70 text-foreground/80 hover:border-primary/40",
                )}
              >
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/* ─────────── Brand shape cluster ───────────
   Lấy tối đa 3 shape từ palette của card và đặt ở góc dưới phải, mỗi shape
   xoay/ kích thước hơi khác để tạo "cluster" giống ảnh tham chiếu. Nếu DB
   chưa có shape thì fallback về vòng tròn CSS gradient để card không trống.
*/
function BrandShapeCluster({ urls, featured }: { urls: string[]; featured: boolean }) {
  const picks = urls.slice(0, 3);

  if (picks.length === 0) {
    return (
      <div
        aria-hidden
        className={cn(
          "absolute -bottom-10 -right-10 h-40 w-40 rounded-full pointer-events-none",
          featured
            ? "bg-primary-foreground/10 blur-2xl"
            : "bg-primary/10 blur-2xl",
        )}
      />
    );
  }

  // Vị trí tương đối cho tối đa 3 shape — sắp tạo cảm giác "rơi vào góc".
  const positions = [
    "bottom-3 right-3 h-28 w-28 rotate-[-6deg]",
    "bottom-10 right-20 h-16 w-16 rotate-[18deg] opacity-90",
    "bottom-20 right-2 h-12 w-12 -rotate-12 opacity-80",
  ];

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {picks.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "absolute object-contain drop-shadow-sm transition-transform duration-500",
            "group-hover:scale-105",
            positions[i],
            // Featured card có nền tối — shape sáng có thể "biến mất"; thêm
            // contrast nhẹ bằng mix-blend khi cần.
            featured && "mix-blend-screen",
          )}
        />
      ))}
    </div>
  );
}