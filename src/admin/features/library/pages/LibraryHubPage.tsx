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
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-page-in">
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
        "group relative aspect-square overflow-hidden rounded-2xl text-left bg-card text-card-foreground",
        "border border-border/70 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
    >
      {/* ─── Icon: top-right, mảnh, không có nền ─── */}
      <div className="absolute top-5 right-5 z-10">
        <Icon className={cn("h-6 w-6", ICON_TONE[section.palette])} strokeWidth={1.75} />
      </div>

      {/* ─── Title + blurb: top-left, padding nội dung 5 ─── */}
      <div className="relative z-10 p-5 pr-14 max-w-[85%]">
        <h3 className="font-display text-lg font-extrabold tracking-tight leading-tight text-foreground">
          {section.title}
        </h3>
        <p className="text-[13px] text-muted-foreground mt-1.5 leading-snug line-clamp-2">
          {section.blurb}
        </p>
      </div>

      {/* ─── Brand shape: nhân vật chính, tràn sát góc dưới-phải ─── */}
      <BrandShapeFigure url={shapeUrl} palette={section.palette} />

      {/* ─── Arrow: bottom-left, đứng riêng, mảnh ─── */}
      <div className="absolute bottom-5 left-5 z-10">
        <ArrowRight
          className="h-5 w-5 text-foreground/80 transition-transform duration-300 group-hover:translate-x-1"
          strokeWidth={1.75}
        />
      </div>

      {/* ─── Extra links: nếu có, đặt cạnh arrow ở dưới-trái ─── */}
      {section.extraLinks && section.extraLinks.length > 0 && (
        <div className="absolute bottom-5 left-14 z-10 flex flex-wrap gap-1.5">
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
              className="cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-medium border border-border/70 bg-background/80 text-foreground/70 hover:border-primary/40 hover:text-foreground transition-colors"
            >
              {l.label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
});

/* ─────────── Stable shape picker ───────────
   Hash section.id để chọn 1 url cố định trong danh sách urls — đảm bảo cùng
   1 card luôn hiển thị cùng 1 shape, nhưng các card khác nhau ưu tiên các
   shape khác nhau trong cùng palette.
*/
function pickStableShape(urls: string[], seed: string): string | null {
  if (urls.length === 0) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return urls[h % urls.length];
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
          "absolute -bottom-4 -right-4 h-[60%] w-[60%] pointer-events-none",
          "bg-gradient-to-tl rounded-tl-[100%]",
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
      // Set kích thước cố định bằng % so với card (parent có aspect-square nên
      // % chiều cao tính được). Một phần shape tràn ra ngoài góc bằng negative
      // offset để gãy cảm giác "đóng khung". `object-contain` giữ tỉ lệ gốc
      // của file PNG (vuông / ngang / dọc đều OK).
      className={cn(
        "pointer-events-none absolute -bottom-3 -right-3",
        "h-[58%] w-[58%] object-contain object-bottom-right",
        "transition-transform duration-500 group-hover:scale-[1.04] origin-bottom-right",
      )}
    />
  );
}