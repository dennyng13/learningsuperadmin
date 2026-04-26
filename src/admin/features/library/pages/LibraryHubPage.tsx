import { useNavigate } from "react-router-dom";
import { FileText, BookOpen, ClipboardList, ArrowRight, Sparkles } from "lucide-react";
import { PageHeader } from "@shared/components/layouts/PageHeader";
import { cn } from "@shared/lib/utils";

/* ═══════════════════════════════════════════
   LIBRARY HUB — "Quản lý học liệu"
   Gom 3 trang nội dung học thuật vào một entry duy nhất:
   · Ngân hàng đề  → /tests
   · Flashcard     → /flashcards
   · Study Plans   → /study-plans
   Hub chỉ là "shortcut grid" + mô tả ngắn — không sao chép logic.
   ═══════════════════════════════════════════ */

type LibrarySection = {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  route: string;
  /** Tailwind classes cho nền & icon — dùng semantic tokens */
  tone: {
    bg: string;
    iconBg: string;
    iconText: string;
    accent: string;
  };
  /** Phụ đề hành động phụ (vd link tới sub-page) */
  extraLinks?: { label: string; route: string }[];
};

const SECTIONS: LibrarySection[] = [
  {
    id: "tests",
    title: "Ngân hàng đề",
    description: "Quản lý đề thi, bài luyện kỹ năng & nhập đề từ Word.",
    icon: FileText,
    route: "/tests",
    tone: {
      bg: "from-primary/8 to-primary/0",
      iconBg: "bg-primary/10",
      iconText: "text-primary",
      accent: "text-primary",
    },
    extraLinks: [{ label: "Nhập đề từ file", route: "/tests/import" }],
  },
  {
    id: "flashcards",
    title: "Flashcard",
    description: "Bộ thẻ từ vựng dùng chung cho học viên & lớp học.",
    icon: BookOpen,
    route: "/flashcards",
    tone: {
      bg: "from-amber-500/8 to-amber-500/0",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-600",
      accent: "text-amber-600",
    },
  },
  {
    id: "study-plans",
    title: "Study Plans",
    description: "Lộ trình học chuẩn & template gán cho lớp / học viên.",
    icon: ClipboardList,
    route: "/study-plans",
    tone: {
      bg: "from-emerald-500/8 to-emerald-500/0",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-600",
      accent: "text-emerald-600",
    },
    extraLinks: [{ label: "Mẫu lộ trình", route: "/study-plans/templates" }],
  },
];

export default function LibraryHubPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-page-in">
      <PageHeader
        icon={Sparkles}
        title="Quản lý học liệu"
        subtitle="Tất cả nội dung học thuật ở một nơi: đề thi, flashcard và lộ trình học."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <SectionCard key={s.id} section={s} onOpen={() => navigate(s.route)} />
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  onOpen,
}: {
  section: LibrarySection;
  onOpen: () => void;
}) {
  const Icon = section.icon;
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card",
        "transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-70 pointer-events-none",
          section.tone.bg,
        )}
      />

      {/* Main click target */}
      <button
        onClick={onOpen}
        className="relative z-10 w-full text-left p-5 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              section.tone.iconBg,
            )}
          >
            <Icon className={cn("h-5 w-5", section.tone.iconText)} />
          </div>
          <ArrowRight
            className={cn(
              "h-4 w-4 opacity-0 -translate-x-1 transition-all",
              "group-hover:opacity-100 group-hover:translate-x-0",
              section.tone.accent,
            )}
          />
        </div>

        <div>
          <h3 className="font-display text-base font-extrabold tracking-tight">
            {section.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {section.description}
          </p>
        </div>
      </button>

      {/* Extra links (sub-pages) */}
      {section.extraLinks && section.extraLinks.length > 0 && (
        <div className="relative z-10 px-5 pb-4 flex flex-wrap gap-1.5">
          {section.extraLinks.map((l) => (
            <button
              key={l.route}
              onClick={(e) => {
                e.stopPropagation();
                navigate(l.route);
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border border-border/60 bg-background/60",
                "hover:bg-background hover:border-primary/40 transition-colors",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}