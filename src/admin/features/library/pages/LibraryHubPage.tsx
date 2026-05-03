import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, BookOpen, ClipboardList, ArrowRight, Sparkles,
  ScrollText, MessageSquareQuote, Plus, Upload, Zap,
  Clock, Pin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  blurb: string;
  icon: LucideIcon;
  route: string;
  palette: ShapePalette;
  bg: string;
  accent: string;
  stats: { label: string; v: string }[];
  extras: string[];
  cta: string;
  extraLinks?: { label: string; route: string }[];
  moduleKey?: AdminModuleKey;
  preferredShape?: string;
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
    bg: "var(--lp-teal-soft, #E6F7F6)",
    accent: "var(--lp-teal, #2DD4BF)",
    stats: [{ label: "Đề thi", v: "284" }, { label: "Skill", v: "4" }, { label: "Đã chạy", v: "1.2k" }],
    extras: ["Reading", "Listening", "Writing", "Speaking"],
    cta: "Mở ngân hàng đề",
    extraLinks: [{ label: "Nhập đề từ file", route: "/tests/import" }],
    moduleKey: ADMIN_MODULE_KEYS.TESTS,
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
    bg: "var(--lp-yellow-soft, #FFFBEB)",
    accent: "var(--lp-yellow, #F59E0B)",
    stats: [{ label: "Bộ thẻ", v: "42" }, { label: "Cards", v: "3.8k" }, { label: "Active", v: "38" }],
    extras: ["IELTS", "TOEIC", "Foundation", "Business"],
    cta: "Vào Flashcard",
    moduleKey: ADMIN_MODULE_KEYS.FLASHCARDS,
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
    bg: "var(--lp-coral-soft, #FFF1EF)",
    accent: "var(--lp-coral, #FA7D64)",
    stats: [{ label: "Templates", v: "18" }, { label: "Active", v: "156" }, { label: "Hoàn thành", v: "72%" }],
    extras: ["8-week", "12-week", "16-week", "Custom"],
    cta: "Quản lý lộ trình",
    extraLinks: [
      { label: "Mẫu lộ trình", route: "/study-plans/templates" },
      { label: "Plans của tôi", route: "/my-plans" },
    ],
    moduleKey: ADMIN_MODULE_KEYS.STUDY_PLANS,
    preferredShape: "wave",
    preferredShapeFallbacks: ["curve", "ribbon", "arc", "cloud", "drop"],
  },
  {
    id: "band-descriptors",
    title: "Band Descriptor",
    blurb: "Bảng tiêu chí chấm điểm theo skill (Writing/Speaking) chuẩn IELTS.",
    icon: ScrollText,
    route: "/band-descriptors",
    palette: "indigo",
    bg: "#EEF2FF",
    accent: "#6366F1",
    stats: [{ label: "Skills", v: "4" }, { label: "Criteria", v: "16" }, { label: "Bands", v: "9" }],
    extras: ["Writing", "Speaking", "Reading", "Listening"],
    cta: "Xem tiêu chí",
    preferredShape: "ribbon",
    preferredShapeFallbacks: ["wave", "arc", "curve"],
  },
  {
    id: "feedback-templates",
    title: "Mẫu nhận xét",
    blurb: "Thư viện mẫu phản hồi giáo viên dùng khi chấm bài và nhận xét lớp.",
    icon: MessageSquareQuote,
    route: "/feedback-templates",
    palette: "slate",
    bg: "#F1F5F9",
    accent: "#64748B",
    stats: [{ label: "Mẫu", v: "38" }, { label: "Skill", v: "4" }, { label: "Đang dùng", v: "24" }],
    extras: ["Writing", "Speaking", "Tổng quát", "Mock"],
    cta: "Quản lý mẫu",
    preferredShape: "petal",
    preferredShapeFallbacks: ["flower", "blob", "pebble"],
  },
];

const RECENT_ITEMS = [
  { kind: "test",      label: "IELTS Reading Practice 12",  when: "2 giờ trước",   author: "Cô Linh",  Icon: FileText },
  { kind: "flashcard", label: "TOEIC Vocab — Office Daily",  when: "5 giờ trước",   author: "Thầy Khoa", Icon: BookOpen },
  { kind: "plan",      label: "IELTS 8-week Foundation",     when: "Hôm qua",        author: "Cô Linh",  Icon: ClipboardList },
  { kind: "practice",  label: "Speaking Part 2 — Hometown", when: "2 ngày trước",  author: "Thầy Long", Icon: MessageSquareQuote },
];

const PINNED_ITEMS = [
  { label: "Cambridge IELTS 18",       tag: "Books",      count: 24,   accent: "teal" },
  { label: "Bộ thẻ 1000 từ IELTS 7+", tag: "Flashcards", count: 1042, accent: "yellow" },
  { label: "Foundation 0-A2 Plan",     tag: "Plan",       count: 8,    accent: "coral" },
];

const KIND_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  test:      { bg: "var(--lp-teal-soft, #E6F7F6)",   color: "#0D6A5E", border: "var(--lp-teal, #2DD4BF)" },
  flashcard: { bg: "var(--lp-yellow-soft, #FFFBEB)", color: "#8a6500", border: "var(--lp-yellow, #F59E0B)" },
  plan:      { bg: "var(--lp-coral-soft, #FFF1EF)",  color: "#C43B1E", border: "var(--lp-coral, #FA7D64)" },
  practice:  { bg: "#EAE0FF",                         color: "#5B2DBA", border: "#8B5CF6" },
};

const ACCENT_COLOR: Record<string, string> = {
  teal:   "var(--lp-teal, #2DD4BF)",
  yellow: "var(--lp-yellow, #F59E0B)",
  coral:  "var(--lp-coral, #FA7D64)",
  violet: "#8B5CF6",
};

export default function LibraryHubPage() {
  const { canAccess } = useMyModuleAccess();
  const visible = SECTIONS.filter((s) => !s.moduleKey || canAccess(s.moduleKey));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-page-in space-y-6">

      {/* ── Hero banner ── */}
      <div style={{
        background: "linear-gradient(120deg, var(--lp-teal, #2DD4BF) 0%, #0D9488 100%)",
        border: "2.5px solid var(--lp-ink, #0B0C0E)",
        borderRadius: 22,
        padding: "28px 32px",
        boxShadow: "6px 6px 0 0 var(--lp-ink, #0B0C0E)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Eyebrow */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.2)",
          border: "1.5px solid rgba(255,255,255,0.5)",
          color: "#fff", fontWeight: 800,
          padding: "5px 12px", borderRadius: 99,
          fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
          marginBottom: 12,
        }}>
          <Sparkles style={{ width: 11, height: 11 }} /> Học liệu · Library Hub
        </div>
        <h1 style={{
          fontFamily: "var(--ff-display, inherit)", fontWeight: 900,
          fontSize: "clamp(24px, 3vw, 34px)", letterSpacing: "-0.02em",
          color: "#fff", margin: "0 0 8px", maxWidth: 500,
        }}>
          Tất cả nội dung học thuật ở{" "}
          <span style={{ background: "linear-gradient(to top, var(--lp-yellow, #F59E0B) 30%, transparent 30%)", padding: "0 4px" }}>một nơi</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 13.5, maxWidth: 480, margin: "0 0 18px" }}>
          Đề thi · Flashcard · Lộ trình · Band Descriptors. Tất cả được tổ chức và đồng bộ với lớp học.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {visible.length > 0 && (
            <button
              onClick={() => {}}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800,
                background: "var(--lp-coral, #FA7D64)",
                border: "2px solid var(--lp-ink, #0B0C0E)",
                boxShadow: "3px 3px 0 0 var(--lp-ink)",
                color: "#fff", cursor: "pointer",
              }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Tạo đề mới
            </button>
          )}
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800,
            background: "var(--lp-yellow, #F59E0B)",
            border: "2px solid var(--lp-ink, #0B0C0E)",
            boxShadow: "3px 3px 0 0 var(--lp-ink)",
            color: "var(--lp-ink, #0B0C0E)", cursor: "pointer",
          }}>
            <Zap style={{ width: 14, height: 14 }} /> AI Generate
          </button>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800,
            background: "rgba(255,255,255,0.9)",
            border: "2px solid var(--lp-ink, #0B0C0E)",
            boxShadow: "3px 3px 0 0 var(--lp-ink)",
            color: "var(--lp-ink, #0B0C0E)", cursor: "pointer",
          }}>
            <Upload style={{ width: 14, height: 14 }} /> Import .docx
          </button>
        </div>
        {/* Decorative circle */}
        <div style={{
          position: "absolute", right: -40, top: -40,
          width: 220, height: 220, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          pointerEvents: "none",
        }} />
      </div>

      {/* ── Section grid ── */}
      {visible.length === 0 ? (
        <div style={{
          border: "2px dashed var(--lp-line, #E5E7EB)",
          borderRadius: 18, padding: "40px 0",
          textAlign: "center", color: "var(--lp-body)", fontSize: 13,
        }}>
          Bạn chưa được cấp quyền vào bất kỳ mục nào trong Quản lý học liệu.
          <br />Liên hệ super admin để được mở quyền.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
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

      {/* ── Bottom two-column: Recent + Pinned ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }} className="max-sm:grid-cols-1">

        {/* Recent activity */}
        <div style={{
          background: "#fff",
          border: "2.5px solid var(--lp-ink, #0B0C0E)",
          borderRadius: 18, padding: "18px 20px",
          boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontFamily: "var(--ff-display, inherit)", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", gap: 7 }}>
              <Clock style={{ width: 15, height: 15, color: "var(--lp-body)" }} /> Hoạt động gần đây
            </h3>
            <button style={{
              fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8,
              background: "var(--lp-cream, #F9F8F4)",
              border: "1.5px solid var(--lp-ink, #0B0C0E)",
              cursor: "pointer",
            }}>Xem tất cả</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {RECENT_ITEMS.map((r, i) => {
              const ks = KIND_STYLE[r.kind] ?? KIND_STYLE.test;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 12,
                  border: "1.5px solid var(--lp-line, #E5E7EB)", background: "#fff",
                  cursor: "pointer", transition: "all .12s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--lp-ink)"; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0 0 var(--lp-ink)"; (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--lp-line, #E5E7EB)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "var(--lp-cream, #F9F8F4)",
                    border: "1.5px solid var(--lp-ink, #0B0C0E)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                    color: "var(--lp-ink)",
                  }}>
                    <r.Icon style={{ width: 14, height: 14 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--lp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--lp-body)" }}>{r.author} · {r.when}</div>
                  </div>
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, padding: "3px 8px", borderRadius: 99,
                    textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
                    background: ks.bg, color: ks.color,
                    border: `1px solid ${ks.border}`,
                  }}>{r.kind}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pinned */}
        <div style={{
          background: "var(--lp-yellow-soft, #FFFBEB)",
          border: "2.5px solid var(--lp-ink, #0B0C0E)",
          borderRadius: 18, padding: "18px 20px",
          boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontFamily: "var(--ff-display, inherit)", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", gap: 7 }}>
              <Pin style={{ width: 14, height: 14, color: "var(--lp-body)" }} /> Pinned
            </h3>
            <button style={{
              fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8,
              background: "rgba(255,255,255,0.8)",
              border: "1.5px solid var(--lp-ink, #0B0C0E)",
              cursor: "pointer",
            }}>+ Pin</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PINNED_ITEMS.map((p, i) => (
              <div key={i} style={{
                padding: "10px 12px", borderRadius: 12,
                background: "#fff",
                border: "2px solid var(--lp-ink, #0B0C0E)",
                boxShadow: "2px 2px 0 0 var(--lp-ink)",
                cursor: "pointer", transition: "all .12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 0 var(--lp-ink)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0 0 var(--lp-ink)"; }}
              >
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: ACCENT_COLOR[p.accent] ?? "var(--lp-coral)", marginBottom: 2 }}>{p.tag}</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--lp-ink)", margin: "2px 0" }}>{p.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--lp-body)" }}>{p.count.toLocaleString()} item</div>
              </div>
            ))}
          </div>
        </div>

      </div>
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
        "group relative flex flex-col text-left overflow-hidden",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      )}
      style={{
        background: section.bg,
        border: "2.5px solid var(--lp-ink, #0B0C0E)",
        borderRadius: 22,
        padding: 20,
        minHeight: 260,
        boxShadow: "6px 6px 0 0 var(--lp-ink, #0B0C0E)",
        transition: "transform .2s, box-shadow .2s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-3px,-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "9px 9px 0 0 var(--lp-ink, #0B0C0E)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "6px 6px 0 0 var(--lp-ink, #0B0C0E)"; }}
    >
      {/* Brand shape — decorative background layer */}
      <BrandShapeFigure url={shapeUrl} palette={section.palette} />

      {/* Icon badge */}
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: section.accent,
        border: "2px solid var(--lp-ink, #0B0C0E)",
        boxShadow: "3px 3px 0 0 var(--lp-ink, #0B0C0E)",
        display: "grid", placeItems: "center",
        marginBottom: 14, flexShrink: 0, position: "relative", zIndex: 1,
      }}>
        <Icon style={{ width: 22, height: 22, color: "#fff" }} strokeWidth={1.85} />
      </div>

      {/* Title + blurb */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 14 }}>
        <h3 style={{
          fontFamily: "var(--ff-display, inherit)", fontSize: 22, fontWeight: 900,
          letterSpacing: "-0.02em", margin: "0 0 5px", lineHeight: 1.1,
          color: "var(--lp-ink, #0B0C0E)",
        }}>{section.title}</h3>
        <p style={{ fontSize: 13, color: "var(--lp-body, #6B7280)", lineHeight: 1.4, margin: 0 }}>
          {section.blurb}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, position: "relative", zIndex: 1 }}>
        {section.stats.map(st => (
          <span key={st.label} style={{ fontSize: 11.5, color: "var(--lp-body, #6B7280)" }}>
            <b style={{ fontFamily: "var(--ff-display, inherit)", fontWeight: 900, fontSize: 16, display: "block", lineHeight: 1.1, color: "var(--lp-ink, #0B0C0E)" }}>{st.v}</b>
            {st.label}
          </span>
        ))}
      </div>

      {/* Extras tags */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14, position: "relative", zIndex: 1 }}>
        {section.extras.map(e => (
          <span key={e} style={{
            fontSize: 10.5, fontWeight: 700,
            padding: "3px 9px", borderRadius: 99,
            background: "rgba(255,255,255,0.7)",
            border: "1.5px solid var(--lp-ink, #0B0C0E)",
          }}>{e}</span>
        ))}
      </div>

      {/* CTA footer */}
      <div style={{
        marginTop: "auto",
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: "var(--ff-display, inherit)", fontWeight: 800, fontSize: 13.5,
        color: "var(--lp-ink, #0B0C0E)",
        paddingTop: 8,
        borderTop: "1.5px dashed rgba(11,12,14,0.18)",
        position: "relative", zIndex: 1, width: "100%",
      }}>
        {section.cta}
        <ArrowRight
          style={{ width: 14, height: 14, transition: "transform .2s" }}
          className="group-hover:translate-x-1"
        />
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

  return (
    <div
      aria-hidden
      // `pointer-events-none` ở root + `select-none` đảm bảo decoration KHÔNG
      // bao giờ bắt click/hover/drag — toàn bộ tương tác thuộc về card button.
      // `overflow-hidden` cắt mọi tràn của ảnh/gradient con để shape KHÔNG
      // lén leo qua vùng icon hoặc text dù asset SVG có viewBox sai.
      // Chiều cao chốt 55% (xem comment cũ về phép tính bbox icon).
      className={cn(
        "pointer-events-none select-none absolute z-0 overflow-hidden",
        "-bottom-4 -right-4 sm:-bottom-5 sm:-right-5 md:-bottom-6 md:-right-6",
        // Shape decoration to hơn để nổi bật — icon nằm top-right
        // (~h-9 / 36px) nên giữ chiều cao ≤ 70% vẫn còn safe zone đủ cho icon.
        "h-[68%] w-[62%] sm:h-[70%] sm:w-[66%] md:h-[72%] md:w-[70%]",
        "opacity-95 transition-transform duration-500 ease-out group-hover:scale-[1.06]",
        "origin-bottom-right",
      )}
    >
      {/* Fallback gradient — luôn render, ngồi dưới ảnh. Bo `rounded-tl` để
         vẫn có cảm giác "blob" mềm khi ảnh thật chưa load. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-tl-[999px] bg-gradient-to-tl",
          "shadow-[inset_0_1px_0_hsl(var(--background)/0.45)]",
          FALLBACK_TONE[palette],
        )}
      />
      {url && (
        <img
          src={url}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          draggable={false}
          // `pointer-events-none` lặp lại trên img để chắc chắn ngay cả khi
          // browser CSS reset bất thường vẫn không bắt event.
          // `object-contain object-right-bottom` neo shape vào góc; ảnh
          // KHÔNG vượt quá bbox của container vì parent đã `overflow-hidden`.
          className={cn(
            "pointer-events-none select-none absolute inset-0 h-full w-full",
            "object-contain object-right-bottom",
            "opacity-100 saturate-125",
            "drop-shadow-[0_10px_18px_hsl(var(--foreground)/0.16)]",
          )}
        />
      )}
    </div>
  );
}