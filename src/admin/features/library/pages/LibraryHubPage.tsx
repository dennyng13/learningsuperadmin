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

interface LibrarySection {
  id: string;
  title: string;
  blurb: string;          // 2-line marketing blurb (như "See what's happening at your company!")
  icon: LucideIcon;
  route: string;
  palette: ShapePalette;  // dùng để lookup shapes trong DB
  /** Hiển thị badge "Chính" — nhấn nhẹ thay vì đổ màu nền cả card. */
  featured?: boolean;
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
    featured: true,
    extraLinks: [{ label: "Nhập đề từ file", route: "/tests/import" }],
  },
  {
    id: "flashcards",
    title: "Flashcard",
    blurb: "Bộ thẻ từ vựng dùng chung cho học viên và các lớp học.",
    icon: BookOpen,
    route: "/flashcards",
    palette: "amber",
  },
  {
    id: "study-plans",
    title: "Study Plans",
    blurb: "Lộ trình học chuẩn và template gán cho lớp hoặc học viên.",
    icon: ClipboardList,
    route: "/study-plans",
    palette: "indigo",
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
  const featured = !!section.featured;

  return (
    <button
      onClick={() => navigate(section.route)}
      className={cn(
        "group relative h-44 overflow-hidden rounded-2xl text-left bg-card text-card-foreground",
        "border transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        featured
          ? "border-primary/30 ring-1 ring-primary/10 hover:border-primary/50"
          : "border-border/70 hover:border-primary/30",
      )}
    >
      {/* Single brand geometric shape — bottom-right accent (very subtle). */}
      <BrandShapeAccent url={urls[0] ?? null} featured={featured} />

      {/* Layout: 5 / icon-top, title+blurb, footer (arrow + links) */}
      <div className="relative z-10 h-full p-5 flex flex-col">
        {/* Top row: icon + featured badge */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              featured ? "bg-primary/10 text-primary" : "bg-muted text-foreground/70",
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </div>
          {featured && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary">
              Chính
            </span>
          )}
        </div>

        {/* Title + blurb */}
        <div className="mt-3">
          <h3 className="font-display text-base font-extrabold tracking-tight leading-tight">
            {section.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2 max-w-[22rem]">
            {section.blurb}
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer: arrow + extra links */}
        <div className="flex items-center justify-between gap-2">
          <ArrowRight
            className={cn(
              "h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5",
              featured ? "text-primary" : "text-foreground/60",
            )}
            strokeWidth={2.5}
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
                  className="cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-medium border border-border/70 bg-background/70 text-foreground/70 hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  {l.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─────────── Brand shape accent ───────────
   Chỉ DUY NHẤT 1 shape ở góc dưới phải, rất mờ — đóng vai trò hoa văn nền,
   không phải đối tượng chính. Fallback: blob gradient mềm khi DB chưa có asset.
*/
function BrandShapeAccent({ url, featured }: { url: string | null; featured: boolean }) {
  if (!url) {
    return (
      <div
        aria-hidden
        className={cn(
          "absolute -bottom-12 -right-12 h-36 w-36 rounded-full pointer-events-none",
          featured ? "bg-primary/10 blur-3xl" : "bg-primary/5 blur-3xl",
        )}
      />
    );
  }

  return (
    <img
      aria-hidden
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn(
        "pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 object-contain",
        "opacity-20 transition-opacity duration-500 group-hover:opacity-30",
      )}
    />
  );
}