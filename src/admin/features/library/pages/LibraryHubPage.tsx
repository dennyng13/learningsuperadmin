import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, BookOpen, ClipboardList, ArrowRight, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@shared/components/layouts/PageHeader";
import { cn } from "@shared/lib/utils";
import { useBrandShapes } from "@shared/hooks/useBrandShapes";
import type { ShapePalette } from "@admin/features/brand-assets/types";
import { useMyModuleAccess, ADMIN_MODULE_KEYS, type AdminModuleKey } from "@shared/hooks/useUserModuleAccess";

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
  moduleKey: AdminModuleKey;
  /** Ưu tiên shape có asset_key chứa từ khoá này (vd "wave", "blob"). */
  preferredShape?: string;
  /** Danh sách keyword fallback theo thứ tự ưu tiên — nếu DB chưa có shape
   *  khớp `preferredShape`, picker thử lần lượt qua list này. */
  preferredShapeFallbacks?: string[];
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
    moduleKey: ADMIN_MODULE_KEYS.TESTS,
    // Card "đề thi" → shape KHỐI ĐẶC tròn đầy (blob/circle) — gợi sự
    // chắc chắn của ngân hàng nội dung.
    preferredShape: "blob",
    preferredShapeFallbacks: ["pebble", "oval", "circle", "bean"],
  },
  {
    id: "flashcards",
    title: "Flashcard",
    blurb: "Bộ thẻ từ vựng dùng chung cho học viên và các lớp học.",
    icon: BookOpen,
    route: "/flashcards",
    palette: "amber",
    moduleKey: ADMIN_MODULE_KEYS.FLASHCARDS,
    // Card "flashcard" → shape TIA / NGÔI SAO — gợi điểm sáng kiến
    // thức, khác hẳn blob đặc của card đề thi.
    preferredShape: "star",
    preferredShapeFallbacks: ["burst", "spark", "sun", "flower", "petal"],
  },
  {
    id: "study-plans",
    title: "Study Plans",
    blurb: "Lộ trình học chuẩn và template gán cho lớp hoặc học viên.",
    icon: ClipboardList,
    route: "/study-plans",
    palette: "coral",
    extraLinks: [{ label: "Mẫu lộ trình", route: "/study-plans/templates" }],
    moduleKey: ADMIN_MODULE_KEYS.STUDY_PLANS,
    // Card "lộ trình" → shape SÓNG / DÒNG CHẢY — gợi đường đi liên tục
    // qua các giai đoạn, khác hẳn 2 card trên.
    preferredShape: "wave",
    preferredShapeFallbacks: ["curve", "ribbon", "arc", "cloud", "drop"],
  },
];

export default function LibraryHubPage() {
  const { canAccess } = useMyModuleAccess();
  const visible = SECTIONS.filter((s) => canAccess(s.moduleKey));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-page-in">
      <PageHeader
        icon={Sparkles}
        title="Quản lý học liệu"
        subtitle="Tất cả nội dung học thuật ở một nơi: đề thi, flashcard và lộ trình học."
      />

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          Bạn chưa được cấp quyền vào bất kỳ mục nào trong Quản lý học liệu.
          <br />
          Liên hệ super admin để được mở quyền.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Track shapes đã dùng để mỗi card chọn shape khác nhau —
             tránh tình huống cả 3 card share cùng 1 asset khi DB ít shape. */}
          {(() => {
            const used: string[] = [];
            return visible.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                excludeUrls={used}
                onPicked={(u) => { if (u) used.push(u); }}
              />
            ));
          })()}
        </div>
      )}
    </div>
  );
}

/* ─────────── Card ─────────── */

const SectionCard = forwardRef<
  HTMLButtonElement,
  { section: LibrarySection; excludeUrls?: string[]; onPicked?: (url: string | null) => void }
>(function SectionCard(
  { section, excludeUrls = [], onPicked },
  ref,
) {
  const Icon = section.icon;
  const navigate = useNavigate();
  const { urls, isLoading } = useBrandShapes(section.palette);

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
  // `excludeUrls` đảm bảo mỗi card chọn shape khác nhau ngay cả khi
  // các card share palette hoặc DB chỉ có vài shape.
  const shapeUrl = pickStableShape(
    urls,
    section.id,
    section.preferredShape,
    section.preferredShapeFallbacks,
    excludeUrls,
  );
  // Notify parent (sync, trong render — chỉ push string vào array, idempotent).
  onPicked?.(shapeUrl);

  // Debug helper — log một lần khi không tìm được shape, để dễ phát hiện
  // palette nào chưa upload asset trong /brand-assets.
  if (typeof window !== "undefined" && !isLoading && !shapeUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      `[LibraryHub] Không có brand shape nào cho palette "${section.palette}" (card "${section.id}"). ` +
        `Hãy upload shape vào /brand-assets với asset_key dạng "shape-${section.palette}-{name}".`,
    );
  }

  return (
    <button
      ref={ref}
      onClick={() => navigate(section.route)}
      className={cn(
        "group relative flex flex-col h-32 sm:h-36 md:h-40 overflow-hidden rounded-2xl text-left bg-card text-card-foreground",
        "border border-border/60 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18),0_2px_6px_-2px_hsl(var(--foreground)/0.08)]",
        "transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_hsl(var(--primary)/0.35),0_8px_16px_-8px_hsl(var(--foreground)/0.18)] hover:border-primary/40",
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
          className={cn("h-7 w-7 sm:h-8 sm:w-8 shrink-0", ICON_TONE[section.palette])}
          strokeWidth={1.75}
        />
      </div>

      {/* ─── Spacer đẩy bottom row xuống đáy ─── */}
      <div className="flex-1" />

      {/* ─── Bottom row: arrow + extra links — pr lớn để chừa chỗ cho shape ─── */}
      <div className="relative z-10 flex items-center gap-2 p-4 sm:p-5 pr-[42%]">
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

function pickStableShape(
  urls: string[],
  seed: string,
  preferred?: string,
  fallbacks?: string[],
  excludeUrls: string[] = [],
): string | null {
  if (urls.length === 0) return null;
  const available = urls.filter((u) => !excludeUrls.includes(u));
  // Nếu loại trừ hết → đành dùng pool gốc (chấp nhận trùng còn hơn không có).
  const baseUrls = available.length > 0 ? available : urls;
  // 1. Ưu tiên explicit keyword (preferred → fallbacks theo thứ tự).
  const keywords = [preferred, ...(fallbacks ?? [])].filter(Boolean) as string[];
  for (const kw of keywords) {
    const match = baseUrls.find((u) => u.toLowerCase().includes(kw.toLowerCase()));
    if (match) return match;
  }
  const soft = baseUrls.filter((u) => SOFT_SHAPE_KEYWORDS.some((k) => u.toLowerCase().includes(k)));
  const safe = (soft.length > 0 ? soft : baseUrls).filter(
    (u) => !HARSH_SHAPE_KEYWORDS.some((k) => u.toLowerCase().includes(k)),
  );
  const pool = safe.length > 0 ? safe : baseUrls;
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
          "absolute -bottom-8 -right-8 h-[110%] w-[55%] pointer-events-none",
          "bg-gradient-to-tl rounded-tl-[100%] opacity-80 transition-all duration-500",
          "group-hover:opacity-100 group-hover:scale-105 origin-bottom-right",
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
      // Shape là decoration ở góc dưới-phải. Cards "nhỏ" (h-32→h-40), nên
      // shape phải tràn vượt cả chiều cao card (h-[120%]) + lấn ra ngoài
      // (-bottom/-right negative) để không trông như bị cắt vuông.
      // Tailwind v3 dùng `object-right-bottom` (KHÔNG phải `object-bottom-right`).
      className={cn(
        "pointer-events-none absolute -bottom-4 -right-4",
        "h-[120%] w-auto max-w-[55%] object-contain object-right-bottom",
        "opacity-85 saturate-100 transition-all duration-500 ease-out",
        "group-hover:opacity-100 group-hover:scale-[1.08]",
        "origin-bottom-right",
      )}
    />
  );
}