import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, BookOpen, ClipboardList, ArrowRight, Sparkles,
  ScrollText, MessageSquareQuote, Plus, Upload, Zap,
  Clock, Pin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/utils";
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
  bg: string;
  accent: string;
  stats: { label: string; v: string }[];
  extras: string[];
  cta: string;
  extraLinks?: { label: string; route: string }[];
  moduleKey?: AdminModuleKey;
}

const SECTIONS: LibrarySection[] = [
  {
    id: "tests",
    title: "Ngân hàng đề",
    blurb: "Quản lý đề thi và bài luyện cho học viên trên toàn hệ thống.",
    icon: FileText,
    route: "/tests",
    bg: "var(--lp-teal-soft, #E6F7F6)",
    accent: "var(--lp-teal, #2DD4BF)",
    stats: [{ label: "Đề thi", v: "284" }, { label: "Skill", v: "4" }, { label: "Đã chạy", v: "1.2k" }],
    extras: ["Reading", "Listening", "Writing", "Speaking"],
    cta: "Mở ngân hàng đề",
    extraLinks: [{ label: "Nhập đề từ file", route: "/tests/import" }],
    moduleKey: ADMIN_MODULE_KEYS.TESTS,
  },
  {
    id: "flashcards",
    title: "Flashcard",
    blurb: "Bộ thẻ từ vựng dùng chung cho học viên và các lớp học.",
    icon: BookOpen,
    route: "/flashcards",
    bg: "var(--lp-yellow-soft, #FFFBEB)",
    accent: "var(--lp-yellow, #F59E0B)",
    stats: [{ label: "Bộ thẻ", v: "42" }, { label: "Cards", v: "3.8k" }, { label: "Active", v: "38" }],
    extras: ["IELTS", "TOEIC", "Foundation", "Business"],
    cta: "Vào Flashcard",
    moduleKey: ADMIN_MODULE_KEYS.FLASHCARDS,
  },
  {
    id: "study-plans",
    title: "Study Plans",
    blurb: "Lộ trình học chuẩn và template gán cho lớp hoặc học viên.",
    icon: ClipboardList,
    route: "/study-plans",
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
  },
  {
    id: "band-descriptors",
    title: "Band Descriptor",
    blurb: "Bảng tiêu chí chấm điểm theo skill (Writing/Speaking) chuẩn IELTS.",
    icon: ScrollText,
    route: "/band-descriptors",
    bg: "#EEF2FF",
    accent: "#6366F1",
    stats: [{ label: "Skills", v: "4" }, { label: "Criteria", v: "16" }, { label: "Bands", v: "9" }],
    extras: ["Writing", "Speaking", "Reading", "Listening"],
    cta: "Xem tiêu chí",
  },
  {
    id: "feedback-templates",
    title: "Mẫu nhận xét",
    blurb: "Thư viện mẫu phản hồi giáo viên dùng khi chấm bài và nhận xét lớp.",
    icon: MessageSquareQuote,
    route: "/feedback-templates",
    bg: "#F1F5F9",
    accent: "#64748B",
    stats: [{ label: "Mẫu", v: "38" }, { label: "Skill", v: "4" }, { label: "Đang dùng", v: "24" }],
    extras: ["Writing", "Speaking", "Tổng quát", "Mock"],
    cta: "Quản lý mẫu",
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
          {visible.map((s) => (
            <SectionCard key={s.id} section={s} />
          ))}
        </div>
      )}

      {/* ── Bottom two-column: Recent + Pinned ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }} className="max-sm:grid-cols-1">

        {/* Recent activity — prominent ink card */}
        <div style={{
          background: "var(--lp-ink, #0B0C0E)",
          border: "2.5px solid var(--lp-ink, #0B0C0E)",
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "6px 6px 0 0 rgba(11,12,14,0.35)",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "18px 22px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1.5px solid rgba(255,255,255,0.1)",
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>ACTIVITY</div>
              <h3 style={{ margin: 0, fontFamily: "var(--ff-display, inherit)", fontSize: 20, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Clock style={{ width: 17, height: 17, color: "var(--lp-teal, #2DD4BF)" }} /> Hoạt động gần đây
              </h3>
            </div>
            <button style={{
              fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 99,
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              color: "#fff", cursor: "pointer", letterSpacing: "0.03em",
            }}>Xem tất cả →</button>
          </div>
          {/* Items */}
          <div style={{ padding: "14px 22px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {RECENT_ITEMS.map((r, i) => {
              const ks = KIND_STYLE[r.kind] ?? KIND_STYLE.test;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 14px", borderRadius: 14,
                  background: "rgba(255,255,255,0.07)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  cursor: "pointer", transition: "all .15s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.13)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: ks.bg,
                    border: `2px solid ${ks.border}`,
                    display: "grid", placeItems: "center", flexShrink: 0,
                    color: ks.color,
                  }}>
                    <r.Icon style={{ width: 16, height: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{r.author} · {r.when}</div>
                  </div>
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, padding: "4px 10px", borderRadius: 99,
                    textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
                    background: ks.bg, color: ks.color,
                    border: `1.5px solid ${ks.border}`,
                  }}>{r.kind}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pinned — yellow pop-card, bigger & bolder */}
        <div style={{
          background: "var(--lp-yellow, #F59E0B)",
          border: "2.5px solid var(--lp-ink, #0B0C0E)",
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "6px 6px 0 0 var(--lp-ink, #0B0C0E)",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "18px 22px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1.5px solid rgba(11,12,14,0.15)",
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(11,12,14,0.5)", marginBottom: 3 }}>PINNED</div>
              <h3 style={{ margin: 0, fontFamily: "var(--ff-display, inherit)", fontSize: 20, fontWeight: 900, color: "var(--lp-ink, #0B0C0E)", display: "flex", alignItems: "center", gap: 8 }}>
                <Pin style={{ width: 17, height: 17 }} /> Đánh dấu
              </h3>
            </div>
            <button style={{
              fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 99,
              background: "rgba(11,12,14,0.1)",
              border: "1.5px solid rgba(11,12,14,0.25)",
              color: "var(--lp-ink, #0B0C0E)", cursor: "pointer",
            }}>+ Pin</button>
          </div>
          {/* Items */}
          <div style={{ padding: "14px 22px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {PINNED_ITEMS.map((p, i) => (
              <div key={i} style={{
                padding: "14px 16px", borderRadius: 14,
                background: "#fff",
                border: "2px solid var(--lp-ink, #0B0C0E)",
                boxShadow: "3px 3px 0 0 var(--lp-ink)",
                cursor: "pointer", transition: "all .15s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 0 var(--lp-ink)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 0 var(--lp-ink)"; }}
              >
                <div style={{ fontSize: 9.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: ACCENT_COLOR[p.accent] ?? "var(--lp-coral)", marginBottom: 3 }}>{p.tag}</div>
                <div style={{ fontWeight: 900, fontSize: 15, color: "var(--lp-ink)", fontFamily: "var(--ff-display, inherit)", margin: "2px 0 4px" }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "var(--lp-body)", fontWeight: 700 }}>{p.count.toLocaleString()} items</div>
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
  { section: LibrarySection }
>(function SectionCard(
  { section },
  ref,
) {
  const Icon = section.icon;
  const navigate = useNavigate();

  return (
    <button
      ref={ref}
      onClick={() => navigate(section.route)}
      className={cn(
        "group flex flex-col text-left",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      )}
      style={{
        background: section.bg,
        border: "2.5px solid var(--lp-ink, #0B0C0E)",
        borderRadius: 22,
        padding: 22,
        minHeight: 260,
        boxShadow: "6px 6px 0 0 var(--lp-ink, #0B0C0E)",
        transition: "transform .2s, box-shadow .2s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-3px,-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "9px 9px 0 0 var(--lp-ink, #0B0C0E)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "6px 6px 0 0 var(--lp-ink, #0B0C0E)"; }}
    >

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
