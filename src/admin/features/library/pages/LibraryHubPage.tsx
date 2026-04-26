import { forwardRef } from "react";
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
    palette: "coral",
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <SectionCard key={s.id} section={s} />
        ))}
      </div>
    </div>
  );
}

/* ─────────── Card ─────────── */

const SectionCard = forwardRef<HTMLButtonElement, { section: LibrarySection }>(function SectionCard(
  { section },
  ref,
) {
  const Icon = section.icon;
  const navigate = useNavigate();
  const { urls } = useBrandShapes(section.palette);

  // Tone class theo palette — chỉ ảnh hưởng icon top-right (subtle).
  const ICON_TONE: Record<ShapePalette, string> = {
    teal:   "text-primary",
    amber:  "text-amber-600",
    indigo: "text-indigo-600",
    coral:  "text-rose-600",
    slate:  "text-slate-600",
  };

  // Pick a stable shape from the palette using section.id as seed —
  // tránh render khác nhau giữa các lần re-mount (sẽ nhấp nháy).
  const shapeUrl = pickStableShape(urls, section.id);

  return (
    <button
      ref={ref}
      onClick={() => navigate(section.route)}
      className={cn(
        "group relative flex flex-col h-40 sm:h-44 md:h-48 overflow-hidden rounded-2xl text-left bg-card text-card-foreground",
        "border border-border/70 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
    >
      {/* ─── Brand shape: layer nền, không chiếm chỗ trong flow ─── */}
      <BrandShapeFigure url={shapeUrl} palette={section.palette} />

      {/* ─── Top row: title + blurb (trái) | icon (phải) ─── */}
      <div className="relative z-10 flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base sm:text-lg font-extrabold tracking-tight leading-tight text-foreground">
            {section.title}
          </h3>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-1 sm:mt-1.5 leading-snug line-clamp-2">
            {section.blurb}
          </p>
        </div>
        <Icon
          className={cn("h-5 w-5 sm:h-6 sm:w-6 shrink-0", ICON_TONE[section.palette])}
          strokeWidth={1.75}
        />
      </div>

      {/* ─── Spacer đẩy bottom row xuống đáy ─── */}
      <div className="flex-1" />

      {/* ─── Bottom row: arrow + extra links — pr lớn để chừa chỗ cho shape ─── */}
      <div className="relative z-10 flex items-center gap-2 p-4 sm:p-5 pr-[45%]">
        <ArrowRight
          className="h-5 w-5 shrink-0 text-foreground/80 transition-transform duration-300 group-hover:translate-x-1"
          strokeWidth={1.75}
        />
        {section.extraLinks && section.extraLinks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 min-w-0">
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
                className="cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-medium border border-border/70 bg-background/80 text-foreground/70 hover:border-primary/40 hover:text-foreground transition-colors truncate"
              >
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
});

/* ─────────── Stable shape picker ───────────
   Ưu tiên các shape "mềm" (blob, wave, curve, drop, circle, leaf, petal,
   cloud) — tránh các shape góc cạnh (stairs, chevron, arrow, zigzag, grid)
   vì chúng trông như icon thay vì decoration. Nếu không có shape nào trong
   whitelist, fallback hash ổn định để vẫn deterministic.
*/
const SOFT_SHAPE_KEYWORDS = ["blob", "wave", "curve", "drop", "circle", "oval", "leaf", "petal", "cloud", "moon", "pebble", "bean"];
const HARSH_SHAPE_KEYWORDS = ["stair", "chevron", "arrow", "zigzag", "grid", "cross", "plus", "triangle", "square", "rect"];

function pickStableShape(urls: string[], seed: string): string | null {
  if (urls.length === 0) return null;
  const soft = urls.filter((u) => SOFT_SHAPE_KEYWORDS.some((k) => u.toLowerCase().includes(k)));
  const safe = (soft.length > 0 ? soft : urls).filter(
    (u) => !HARSH_SHAPE_KEYWORDS.some((k) => u.toLowerCase().includes(k)),
  );
  const pool = safe.length > 0 ? safe : urls;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[h % pool.length];
}

/* ─────────── Brand shape figure ───────────
   Shape là NHÂN VẬT CHÍNH ở góc dưới-phải. Để tránh cảm giác "đóng khung":
   - Không giới hạn bởi bbox vuông cứng — cho phép tràn 1 phần ra ngoài card
     (negative offset) để shape không có viền vuông giả.
   - Bỏ scale max-w cứng — dùng `min(60% chiều rộng, 70% chiều cao)`.
   - Giữ object-bottom-right để shape "neo" vào góc tự nhiên.
   Fallback: blob gradient theo palette nếu DB chưa upload asset.
*/
function BrandShapeFigure({ url, palette }: { url: string | null; palette: ShapePalette }) {
  const FALLBACK_TONE: Record<ShapePalette, string> = {
    teal:   "from-primary/40 to-primary/10",
    amber:  "from-amber-500/40 to-amber-500/10",
    indigo: "from-indigo-500/40 to-indigo-500/10",
    coral:  "from-rose-500/40 to-rose-500/10",
    slate:  "from-slate-500/40 to-slate-500/10",
  };

  if (!url) {
    return (
      <div
        aria-hidden
        className={cn(
          "absolute -bottom-6 -right-6 h-[55%] w-[40%] pointer-events-none",
          "bg-gradient-to-tl rounded-tl-[100%] opacity-40 transition-opacity duration-500 group-hover:opacity-70",
          FALLBACK_TONE[palette],
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
      // Shape nhỏ hơn (~38% chiều cao card chữ nhật), neo góc dưới-phải, tràn
      // 1 phần ra ngoài để không "đóng khung". Mặc định mờ (opacity 35%), khi
      // hover lên card sẽ rõ dần (opacity 90%) + scale nhẹ. Filter saturate
      // tăng nhẹ khi hover để màu thêm sống động.
      className={cn(
        "pointer-events-none absolute -bottom-4 -right-4",
        "h-[60%] w-auto max-w-[40%] object-contain object-bottom-right",
        "opacity-35 saturate-75 transition-all duration-500 ease-out",
        "group-hover:opacity-90 group-hover:saturate-100 group-hover:scale-[1.06]",
        "origin-bottom-right",
      )}
    />
  );
}