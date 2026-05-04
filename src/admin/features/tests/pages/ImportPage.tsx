/**
 * /tests/import — Wizard 4 bước tạo đề mới (replace cũ).
 * Implement design `pages-test-create.jsx` từ Claude Design bundle.
 * Step 0: Skill · Step 1: Purpose+Source · Step 2: Meta+Cấu trúc+Quy tắc · Step 3: Review.
 * Final submit insert assessment + redirect /tests/:id (editor).
 * 'Soạn thủ công' source mở editor ngay sau khi tạo skeleton.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, Copy, FileText, Gauge,
  Headphones, Library, Loader2, Mic, PenLine, Pencil, Plus, Sparkles, Upload,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";

type SkillId = "READING" | "LISTENING" | "WRITING" | "SPEAKING";
type SourceId = "word" | "paste" | "ai" | "manual" | "cambridge" | "duplicate";
type PurposeId = "practice" | "mock" | "placement" | "homework";

interface SkillDef {
  id: SkillId;
  label: string;
  emoji: string;
  bg: string;
  soft: string;
  ink: string;
  desc: string;
  bestFor: string;
  duration: number;
  parts: number;
  qCount: number;
  qTypes: string[];
  Icon: any;
}

const SKILLS: SkillDef[] = [
  {
    id: "READING", label: "Reading", emoji: "📖", Icon: BookOpen,
    bg: "var(--lp-teal)", soft: "var(--lp-teal-soft)", ink: "#fff",
    desc: "Bài đọc + 40 câu hỏi đa dạng. Lý tưởng cho IELTS Academic.",
    bestFor: "Foundation → Band 8",
    duration: 60, parts: 3, qCount: 40,
    qTypes: ["Multiple Choice", "True/False/NG", "Matching Headings", "Sentence Completion", "Summary", "Short Answer"],
  },
  {
    id: "LISTENING", label: "Listening", emoji: "🎧", Icon: Headphones,
    bg: "var(--lp-violet)", soft: "var(--lp-violet-soft)", ink: "#fff",
    desc: "Nghe đoạn hội thoại / bài giảng + 40 câu. Có audio + transcript.",
    bestFor: "Tất cả các level",
    duration: 30, parts: 4, qCount: 40,
    qTypes: ["Form Completion", "Note Completion", "Multiple Choice", "Matching", "Map Labeling", "Diagram Labeling"],
  },
  {
    id: "WRITING", label: "Writing", emoji: "✍️", Icon: PenLine,
    bg: "var(--lp-coral)", soft: "var(--lp-coral-soft)", ink: "#fff",
    desc: "Task 1 (báo cáo dữ liệu) + Task 2 (essay). AI chấm và feedback chi tiết.",
    bestFor: "B1 → C1",
    duration: 60, parts: 2, qCount: 2,
    qTypes: ["Task 1 — Graph/Chart", "Task 1 — Letter (GT)", "Task 2 — Opinion Essay", "Task 2 — Discussion"],
  },
  {
    id: "SPEAKING", label: "Speaking", emoji: "🎙️", Icon: Mic,
    bg: "var(--lp-yellow)", soft: "var(--lp-yellow-soft)", ink: "var(--lp-ink)",
    desc: "Phỏng vấn 3 phần. Học viên tự ghi âm, AI phân tích phát âm + flow.",
    bestFor: "A2 → C1",
    duration: 14, parts: 3, qCount: 12,
    qTypes: ["Part 1 — Interview", "Part 2 — Cue Card", "Part 3 — Discussion"],
  },
];

const PURPOSES: { id: PurposeId; Icon: any; label: string; desc: string }[] = [
  { id: "practice",  Icon: BookOpen,  label: "Bài tập luyện", desc: "Học viên làm trong khoá, không chấm điểm" },
  { id: "mock",      Icon: Sparkles,  label: "Mock test",      desc: "Mô phỏng đề thật, có band score" },
  { id: "placement", Icon: Gauge,     label: "Đề xếp lớp",     desc: "Chấm tự động → đề xuất lộ trình" },
  { id: "homework",  Icon: Pencil,    label: "Bài về nhà",     desc: "Deadline + tự động đóng" },
];

const SOURCES: { id: SourceId; Icon: any; label: string; desc: string; tag?: string; tagClass?: string }[] = [
  { id: "word",      Icon: Upload,   label: "Import từ Word",       desc: "Upload .docx, AI bóc tách câu hỏi", tag: "Phổ biến", tagClass: "bg-lp-yellow" },
  { id: "paste",     Icon: Pencil,   label: "Dán văn bản",          desc: "Copy-paste nội dung, AI tự nhận diện", tag: "~12 credits", tagClass: "bg-lp-teal-soft text-lp-teal-deep" },
  { id: "ai",        Icon: Sparkles, label: "AI Generate",          desc: "Sinh đề mới từ topic + level", tag: "BETA", tagClass: "bg-lp-coral text-white" },
  { id: "manual",    Icon: Plus,     label: "Soạn thủ công",        desc: "Mở editor, gõ từng câu một", tag: "Free" },
  { id: "cambridge", Icon: BookOpen, label: "Cambridge book",       desc: "Chọn từ kho 18 quyển có sẵn", tag: "1,284 đề", tagClass: "bg-lp-violet-soft text-[#4C1D95]" },
  { id: "duplicate", Icon: Copy,     label: "Nhân bản đề có sẵn",   desc: "Copy đề cũ rồi sửa", tag: "Nhanh" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Foundation", "Pre-IELTS", "IELTS 5.5", "IELTS 6.5", "IELTS 7.0+"];

interface MetaState {
  name: string;
  book: string;
  description: string;
  instructions: string;
  level: string;
  duration: number;
  parts: number;
  qCount: number;
  autoGrade: boolean;
  randomize: boolean;
  showAnswers: "never" | "after" | "review";
  visibility: "private" | "workspace" | "public";
  tags: string[];
}

const DEFAULT_META: MetaState = {
  name: "", book: "", description: "", instructions: "",
  level: "B1", duration: 60, parts: 3, qCount: 40,
  autoGrade: true, randomize: false, showAnswers: "after",
  visibility: "workspace", tags: ["IELTS", "Academic"],
};

export default function ImportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [skill, setSkill] = useState<SkillId | null>(null);
  const [purpose, setPurpose] = useState<PurposeId>("practice");
  const [source, setSource] = useState<SourceId | null>(null);
  const [meta, setMeta] = useState<MetaState>(DEFAULT_META);
  const [submitting, setSubmitting] = useState(false);

  const skillData = useMemo(() => SKILLS.find(s => s.id === skill) ?? null, [skill]);

  const pickSkill = (id: SkillId) => {
    const s = SKILLS.find(x => x.id === id)!;
    setSkill(id);
    setMeta(m => ({ ...m, duration: s.duration, parts: s.parts, qCount: s.qCount }));
  };

  const steps = [
    { id: 0, label: "Kỹ năng" },
    { id: 1, label: "Nguồn nội dung" },
    { id: 2, label: "Cấu hình" },
    { id: 3, label: "Xem lại" },
  ];

  const canNext = useMemo(() => {
    if (step === 0) return !!skill;
    if (step === 1) return !!source;
    if (step === 2) return meta.name.trim().length > 2;
    return true;
  }, [step, skill, source, meta.name]);

  const next = () => { if (canNext) setStep(s => Math.min(3, s + 1)); };
  const prev = () => step === 0 ? navigate("/tests") : setStep(s => s - 1);

  const submit = async (status: "draft" | "published") => {
    if (!skill) return;
    setSubmitting(true);
    try {
      const contentType = purpose === "practice" || purpose === "homework" ? "exercise" : "test";
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          name: meta.name.trim(),
          book_name: meta.book.trim() || null,
          section_type: skill,
          duration: meta.duration,
          total_questions: meta.qCount,
          status,
          content_type: contentType,
          difficulty: "medium",
          scoring_mode: "ielts_band",
          timer_enabled: true,
          program: "ielts",
          question_types: [],
          description: meta.description || null,
          course_level: meta.level || null,
          created_by: user?.id ?? null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      toast.success(status === "draft" ? "Đã lưu nháp" : "Đã tạo & publish");
      navigate(`/tests/${data.id}`);
    } catch (err: any) {
      toast.error("Lỗi tạo đề: " + (err?.message || "unknown"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-32">
      {/* ─── Hero stripe ─── */}
      <div className="relative overflow-hidden rounded-[22px] border-[2.5px] border-lp-ink shadow-pop p-6 md:p-8 mb-7"
           style={{ background: "linear-gradient(120deg, var(--lp-cream) 0%, #FFF 50%, var(--lp-yellow-soft) 100%)" }}>
        <button
          onClick={() => navigate("/tests")}
          className="inline-flex items-center gap-1.5 bg-white border-2 border-lp-ink rounded-full px-3 py-1 font-display font-extrabold text-[11px] uppercase tracking-widest shadow-pop-xs hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-sm transition-all mb-4"
        >
          <ChevronLeft className="h-3 w-3" /> Library · Tests
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <div className="inline-flex items-center gap-2 font-display font-extrabold text-[11px] tracking-widest uppercase text-lp-coral-deep mb-1.5">
              <span className="text-lp-yellow text-sm">✦</span> Tạo đề mới · Bước {step + 1} / 4
            </div>
            <h1 className="font-display font-black text-[34px] md:text-[44px] leading-[1.02] tracking-tight text-lp-ink m-0 mb-2.5 max-w-[720px]">
              {step === 0 && <>Chọn <Accent>kỹ năng</Accent> em muốn dạy</>}
              {step === 1 && <>Nội dung lấy từ <Accent>đâu</Accent>?</>}
              {step === 2 && <>Đặt <Accent>tên</Accent> và cấu hình</>}
              {step === 3 && <>Xem lại — sẵn sàng <Accent>đóng tàu</Accent> 🚢</>}
            </h1>
            <p className="text-[14.5px] text-lp-body max-w-[620px] leading-[1.55] m-0">
              {step === 0 && "Mỗi kỹ năng có cấu trúc câu hỏi và thời gian khác nhau. Em chọn 1 cái để bắt đầu nhé."}
              {step === 1 && "Có 6 cách để mang nội dung vào hệ thống. AI sẽ giúp em với hầu hết các cách này."}
              {step === 2 && "Đặt tên dễ tìm, set duration & quy tắc chấm. Có thể đổi sau khi save."}
              {step === 3 && "Đảm bảo mọi thứ ổn rồi mới publish. Em vẫn có thể save draft để hoàn thiện sau."}
            </p>
          </div>

          {/* Progress sticker */}
          <div className="flex flex-col gap-2.5 bg-white border-2 border-lp-ink rounded-2xl p-3 min-w-[200px] shadow-pop-sm">
            {steps.map((st, i) => {
              const state = i < step ? "done" : i === step ? "current" : "pending";
              return (
                <button
                  key={st.id}
                  onClick={() => i <= step && setStep(i)}
                  disabled={i > step}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] font-display font-bold text-[12.5px] text-left transition-all border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                    state === "current" && "bg-lp-ink text-white",
                    state !== "current" && "bg-transparent text-lp-body",
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full grid place-items-center text-[11px] font-display font-black border-[1.5px]",
                    state === "done" && "bg-lp-teal text-white border-lp-ink",
                    state === "current" && "bg-lp-yellow text-lp-ink border-lp-yellow",
                    state === "pending" && "bg-lp-line/40 text-lp-body border-lp-line",
                  )}>
                    {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn(state === "done" && "text-lp-ink")}>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <span className="absolute top-2 right-20 text-[80px] font-display font-black text-lp-coral opacity-[0.18] pointer-events-none select-none rotate-[-12deg] hidden md:block">⌜</span>
        <span className="absolute -bottom-5 left-[40%] text-[72px] font-display font-black text-lp-yellow opacity-[0.18] pointer-events-none select-none hidden md:block">✦</span>
      </div>

      {/* ─── Stage ─── */}
      <div className="min-h-[460px] animate-in fade-in slide-in-from-bottom-2 duration-200" key={step}>
        {step === 0 && <Step0Skill skill={skill} onPick={pickSkill} />}
        {step === 1 && <Step1Source source={source} setSource={setSource} purpose={purpose} setPurpose={setPurpose} />}
        {step === 2 && <Step2Meta meta={meta} setMeta={setMeta} skill={skillData} />}
        {step === 3 && <Step3Review skill={skillData} source={source} purpose={purpose} meta={meta} />}
      </div>

      {/* ─── Footer (sticky inside page) ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-[2.5px] border-lp-ink px-4 md:px-8 py-3 flex items-center gap-3 z-40 md:ml-[var(--admin-sidebar-w,0)]">
        <PopBtn variant="white" onClick={prev} disabled={submitting}>
          <ChevronLeft className="h-3.5 w-3.5" /> {step === 0 ? "Huỷ" : "Quay lại"}
        </PopBtn>

        <div className="flex-1 flex gap-1.5 items-center justify-center flex-wrap">
          {skillData && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-display font-bold text-[11px] border-[1.5px] border-lp-line"
                  style={{ background: skillData.soft }}>
              <span>{skillData.emoji}</span> {skillData.label}
            </span>
          )}
          {meta.name && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full font-display font-bold text-[11px] bg-lp-ink text-white border-[1.5px] border-lp-ink">
              "{meta.name.length > 24 ? meta.name.slice(0, 24) + "…" : meta.name}"
            </span>
          )}
          {source && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full font-display font-bold text-[11px] bg-lp-cream border-[1.5px] border-lp-line">
              {SOURCES.find(s => s.id === source)?.label}
            </span>
          )}
        </div>

        {step < 3 ? (
          <PopBtn variant="coral" onClick={next} disabled={!canNext}>
            Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
          </PopBtn>
        ) : (
          <div className="flex gap-2">
            <PopBtn variant="white" onClick={() => submit("draft")} disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save draft
            </PopBtn>
            <PopBtn variant="coral" onClick={() => source === "manual" ? submit("draft") : submit("published")} disabled={submitting}>
              {source === "manual"
                ? (<><Pencil className="h-3.5 w-3.5" /> Mở editor soạn đề</>)
                : (<><Sparkles className="h-3.5 w-3.5" /> Publish ngay</>)}
            </PopBtn>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── shared bits ──────────────── */
function Accent({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-lp-coral bg-lp-yellow-soft px-2 rounded-lg shadow-pop-xs -rotate-1">
      {children}
    </span>
  );
}

function PopBtn({ variant, children, ...rest }: { variant: "white" | "coral" | "yellow" | "ink"; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    white:  "bg-white text-lp-ink",
    coral:  "bg-lp-coral text-white",
    yellow: "bg-lp-yellow text-lp-ink",
    ink:    "bg-lp-ink text-white",
  };
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 border-2 border-lp-ink rounded-xl px-4 py-2 font-display font-extrabold text-[13px] shadow-pop-xs transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-sm active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
      )}
    >
      {children}
    </button>
  );
}

function SectionHead({ num, title, desc }: { num: string; title: string; desc?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3.5">
      <span className="font-display font-black text-[22px] text-lp-coral tracking-tight">{num}</span>
      <h3 className="font-display font-black text-[20px] tracking-tight m-0">{title}</h3>
      {desc && <span className="text-[13px] text-lp-body ml-auto hidden sm:inline">{desc}</span>}
    </div>
  );
}

/* ──────────────── STEP 0 ──────────────── */
function Step0Skill({ skill, onPick }: { skill: SkillId | null; onPick: (id: SkillId) => void }) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SKILLS.map(s => {
          const selected = skill === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className={cn(
                "relative text-left bg-white border-[2.5px] border-lp-ink rounded-[20px] p-6 shadow-pop-sm overflow-hidden transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pop",
                selected && "-translate-x-1 -translate-y-1 shadow-pop",
              )}
              style={selected ? { background: s.bg, color: s.ink } : undefined}
            >
              <span className="absolute top-3 right-3 bg-lp-yellow text-lp-ink border-[1.5px] border-lp-ink px-2 py-0.5 rounded-full font-display font-extrabold text-[9.5px] uppercase tracking-wider shadow-pop-xs rotate-2">
                {s.bestFor}
              </span>
              <div className="flex items-center justify-between mb-3.5">
                <div className="font-display font-black text-[28px] tracking-tight">{s.label}</div>
                <div
                  className="w-14 h-14 rounded-2xl border-2 border-lp-ink grid place-items-center text-[28px] shadow-pop-xs"
                  style={{ background: selected ? "rgba(255,255,255,0.2)" : s.soft, borderColor: selected ? "#fff" : "var(--lp-ink)" }}
                >
                  {s.emoji}
                </div>
              </div>
              <div className={cn("text-[13.5px] leading-[1.5] mb-3.5", selected ? "text-white/90" : "text-lp-body")}>{s.desc}</div>
              <div className={cn("flex gap-4 text-[11.5px] font-bold pt-3 mb-3 border-t-[1.5px] border-dashed", selected ? "text-white/85 border-white/30" : "text-lp-body border-lp-line")}>
                <div><div className={cn("font-display font-black text-[15px] tracking-tight", selected ? "text-white" : "text-lp-ink")}>{s.duration}m</div>thời lượng</div>
                <div><div className={cn("font-display font-black text-[15px]", selected ? "text-white" : "text-lp-ink")}>{s.parts}</div>parts</div>
                <div><div className={cn("font-display font-black text-[15px]", selected ? "text-white" : "text-lp-ink")}>{s.qCount}</div>câu hỏi</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.qTypes.slice(0, 4).map(t => (
                  <span key={t} className={cn(
                    "px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold border-[1.5px]",
                    selected ? "bg-white/20 text-white border-white/30" : "bg-lp-cream text-lp-body border-lp-line",
                  )}>{t}</span>
                ))}
                {s.qTypes.length > 4 && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold border-[1.5px]",
                    selected ? "bg-white/20 text-white border-white/30" : "bg-lp-cream text-lp-body border-lp-line",
                  )}>+{s.qTypes.length - 4} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 bg-white border-2 border-dashed border-lp-coral rounded-2xl p-4 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-lp-coral-soft border-2 border-lp-ink grid place-items-center text-[22px] shrink-0 shadow-pop-xs">💡</div>
        <div>
          <div className="font-display font-black text-[13px] text-lp-ink">Em chưa chắc chọn cái nào?</div>
          <div className="text-[12.5px] text-lp-body mt-0.5">Reading + Listening là 2 kỹ năng có cấu trúc cố định, dễ chấm tự động. Writing + Speaking cần AI hoặc giáo viên review — phù hợp nếu em đã có rubric sẵn.</div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── STEP 1 ──────────────── */
function Step1Source({ source, setSource, purpose, setPurpose }: {
  source: SourceId | null; setSource: (s: SourceId) => void;
  purpose: PurposeId; setPurpose: (p: PurposeId) => void;
}) {
  return (
    <div>
      <SectionHead num="①" title="Đề này dùng để làm gì?" desc="Quyết định cách chấm điểm & visibility" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-7">
        {PURPOSES.map(p => {
          const active = purpose === p.id;
          const Icon = p.Icon;
          return (
            <button
              key={p.id}
              onClick={() => setPurpose(p.id)}
              className={cn(
                "flex gap-2.5 items-start text-left bg-white border-2 border-lp-ink rounded-[14px] p-3 shadow-pop-xs transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-sm",
                active && "bg-lp-ink text-white",
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-[9px] border-[1.5px] border-lp-ink grid place-items-center shrink-0",
                active ? "bg-lp-yellow text-lp-ink" : "bg-lp-yellow-soft text-lp-ink",
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display font-black text-[13px] tracking-tight">{p.label}</div>
                <div className={cn("text-[11px] mt-0.5 leading-snug", active ? "text-white/75" : "text-lp-body")}>{p.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <SectionHead num="②" title="Nguồn nội dung" desc="Chọn 1 cách — em có thể trộn nhiều nguồn sau khi tạo" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SOURCES.map(s => {
          const Icon = s.Icon;
          const active = source === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={cn(
                "relative text-left bg-white border-2 border-lp-ink rounded-2xl p-4 pb-3.5 shadow-pop-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop overflow-hidden",
                active && "bg-lp-cream border-[3px] -translate-x-0.5 -translate-y-0.5 shadow-pop",
              )}
            >
              {s.tag && !active && (
                <span className={cn(
                  "absolute top-3 right-3 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full border-[1.5px] border-lp-ink uppercase tracking-wider bg-white",
                  s.tagClass,
                )}>{s.tag}</span>
              )}
              {active && (
                <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-lp-teal text-white grid place-items-center border-2 border-lp-ink shadow-pop-xs">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              )}
              <div className="w-11 h-11 rounded-xl bg-lp-yellow-soft border-2 border-lp-ink grid place-items-center mb-3 shadow-pop-xs">
                <Icon className="h-5 w-5 text-lp-ink" />
              </div>
              <div className="font-display font-black text-base tracking-tight mb-1">{s.label}</div>
              <div className="text-[12.5px] text-lp-body leading-snug">{s.desc}</div>
            </button>
          );
        })}
      </div>

      {source === "word" && (
        <SourceHint icon="📄" title="Kéo .docx vào đây hoặc click để chọn file" body="AI sẽ bóc tách câu hỏi, đáp án và lựa chọn. Hỗ trợ Cambridge, Macmillan, IDP format. Tốn ~12 credits cho 1 file 40 câu." cta={<><Upload className="h-3 w-3" /> Chọn file</>} ctaVariant="coral" />
      )}
      {source === "ai" && (
        <SourceHint icon="✨" title="AI sẽ sinh đề từ topic em chọn" body="Nhập topic (vd: 'Climate change'), độ khó và số câu. AI lấy reference từ Cambridge corpus + viết câu hỏi mới. ~28 credits/đề." cta={<><Sparkles className="h-3 w-3" /> Mở AI studio</>} ctaVariant="ink" borderColor="var(--lp-violet)" />
      )}
      {source === "cambridge" && (
        <SourceHint icon="📚" title="Chọn từ thư viện Cambridge" body="1,284 đề có sẵn từ Cambridge IELTS 1–18, Mindset for IELTS, Road to IELTS. Đã có lượt làm bài, band trung bình + analytics." cta={<>Browse <ArrowRight className="h-3 w-3" /></>} ctaVariant="white" borderColor="var(--lp-teal)" />
      )}
      {source === "manual" && (
        <SourceHint icon="✏️" title="Bạn sẽ vào editor sau khi bấm 'Tiếp tục' tới Review → 'Mở editor soạn đề'" body="Hệ thống tạo skeleton trống và mở editor cho bạn gõ từng câu hỏi." cta={null} ctaVariant="white" borderColor="var(--lp-ink)" />
      )}
    </div>
  );
}

function SourceHint({ icon, title, body, cta, ctaVariant, borderColor }: {
  icon: string; title: string; body: string;
  cta: React.ReactNode; ctaVariant: "white" | "coral" | "yellow" | "ink";
  borderColor?: string;
}) {
  return (
    <div
      className="mt-5 bg-white border-[2.5px] border-dashed rounded-2xl p-5 grid grid-cols-[auto_1fr_auto] gap-4 items-center"
      style={{ borderColor: borderColor ?? "var(--lp-coral)" }}
    >
      <div className="w-14 h-14 rounded-2xl bg-lp-coral-soft border-2 border-lp-ink grid place-items-center text-[26px] shadow-pop-xs">{icon}</div>
      <div>
        <h4 className="font-display font-black text-base tracking-tight m-0 mb-1">{title}</h4>
        <p className="text-[12.5px] text-lp-body m-0 leading-[1.5]">{body}</p>
      </div>
      {cta && <PopBtn variant={ctaVariant}>{cta}</PopBtn>}
    </div>
  );
}

/* ──────────────── STEP 2 ──────────────── */
function Step2Meta({ meta, setMeta, skill }: { meta: MetaState; setMeta: React.Dispatch<React.SetStateAction<MetaState>>; skill: SkillDef | null }) {
  const upd = <K extends keyof MetaState>(k: K, v: MetaState[K]) => setMeta(m => ({ ...m, [k]: v }));
  const fieldInput = "w-full bg-lp-cream border-2 border-lp-ink rounded-[10px] px-3.5 py-2.5 text-sm text-lp-ink transition-all focus:outline-none focus:bg-white focus:shadow-pop-xs focus:-translate-x-px focus:-translate-y-px";
  const labelCls = "flex items-center gap-2 font-display font-bold text-[11px] text-lp-ink uppercase tracking-widest mb-1.5";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
      <div className="space-y-5">
        <FormCard num={1} title="Định danh đề thi" desc={`Đặt tên rõ ràng để giáo viên khác và bản thân em dễ tìm sau này.`}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Tên đề thi *</label>
              <input type="text" placeholder={`VD: ${skill?.label ?? "Reading"} Practice — IELTS Cambridge 18 Test 2`} value={meta.name} onChange={e => upd("name", e.target.value)} className={fieldInput} />
              <div className="text-[11px] text-lp-body mt-1">{meta.name.length}/120 ký tự · Tên này hiển thị trong list đề</div>
            </div>
            <div>
              <label className={labelCls}>Book reference / Nguồn gốc</label>
              <input type="text" placeholder="VD: Cambridge IELTS 18 · Academic · Test 2" value={meta.book} onChange={e => upd("book", e.target.value)} className={fieldInput} />
            </div>
            <div>
              <label className={labelCls}>Mô tả ngắn (cho học viên)</label>
              <textarea placeholder="VD: Bộ đề Reading band 6.5+, gồm 3 passages chủ đề khoa học..." value={meta.description} onChange={e => upd("description", e.target.value)} rows={3} className={cn(fieldInput, "min-h-[70px] resize-y")} />
              <div className="text-[11px] text-lp-body mt-1">{meta.description.length}/400 · Hiển thị trong card đề + landing page</div>
            </div>
            <div>
              <label className={labelCls}>Hướng dẫn làm bài</label>
              <textarea placeholder="Các quy tắc và lưu ý khi làm bài..." value={meta.instructions} onChange={e => upd("instructions", e.target.value)} rows={5} className={cn(fieldInput, "min-h-[100px] resize-y")} />
              <div className="text-[11px] text-lp-body mt-1">Hiển thị trong popup trước khi học viên bắt đầu</div>
            </div>
            <div>
              <label className={labelCls}>Level đề xuất</label>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map(lv => (
                  <button
                    key={lv}
                    onClick={() => upd("level", lv)}
                    className={cn(
                      "bg-white border-[1.5px] border-lp-ink rounded-full px-3 py-1 font-display font-bold text-[12px] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-xs",
                      meta.level === lv && "bg-lp-ink text-white shadow-[2px_2px_0_0_var(--lp-coral)]",
                    )}
                  >{lv}</button>
                ))}
              </div>
            </div>
          </div>
        </FormCard>

        <FormCard num={2} title="Cấu trúc & thời lượng" desc="Mặc định lấy theo IELTS chuẩn của kỹ năng đã chọn — em có thể tuỳ chỉnh.">
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className={labelCls}>Thời lượng</label>
              <div className="relative">
                <input type="number" value={meta.duration} onChange={e => upd("duration", +e.target.value)} className={fieldInput} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] font-bold text-lp-body pointer-events-none">phút</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Số parts</label>
              <input type="number" value={meta.parts} onChange={e => upd("parts", +e.target.value)} min={1} max={10} className={fieldInput} />
            </div>
            <div>
              <label className={labelCls}>Số câu</label>
              <input type="number" value={meta.qCount} onChange={e => upd("qCount", +e.target.value)} min={1} className={fieldInput} />
            </div>
          </div>
        </FormCard>
      </div>

      <div>
        <FormCard num={3} title="Quy tắc làm bài" desc="Áp dụng khi học viên làm — có thể đổi sau.">
          <RuleRow label="Tự động chấm" hint="Áp dụng cho R/L. AI cho W/S." on={meta.autoGrade} onToggle={() => upd("autoGrade", !meta.autoGrade)} />
          <RuleRow label="Trộn câu hỏi" hint="Mỗi học viên thấy thứ tự khác nhau" on={meta.randomize} onToggle={() => upd("randomize", !meta.randomize)} />
          <div className="mt-4">
            <label className={labelCls}>Hiện đáp án</label>
            <RadioRow value={meta.showAnswers} onChange={(v) => upd("showAnswers", v as MetaState["showAnswers"])}
              options={[{ v: "never", l: "Không" }, { v: "after", l: "Sau khi nộp" }, { v: "review", l: "Khi GV duyệt" }]} />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Visibility</label>
            <RadioRow value={meta.visibility} onChange={(v) => upd("visibility", v as MetaState["visibility"])}
              options={[{ v: "private", l: "Riêng em" }, { v: "workspace", l: "Workspace" }, { v: "public", l: "Public" }]} />
          </div>
        </FormCard>
      </div>
    </div>
  );
}

function FormCard({ num, title, desc, children }: { num: number; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border-2 border-lp-ink rounded-[18px] p-5 md:p-6 shadow-pop-sm">
      <h3 className="font-display font-black text-[18px] tracking-tight m-0 mb-1 flex items-center gap-2.5">
        <span className="bg-lp-coral text-white font-mono text-[10px] font-bold w-[22px] h-[22px] rounded-full grid place-items-center border-[1.5px] border-lp-ink">{num}</span>
        {title}
      </h3>
      {desc && <div className="text-[12px] text-lp-body mb-4">{desc}</div>}
      {children}
    </div>
  );
}

function RuleRow({ label, hint, on, onToggle }: { label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-lp-cream border-[1.5px] border-lp-line rounded-[10px] mb-2">
      <div>
        <div className="font-display font-extrabold text-[13px]">{label}</div>
        <div className="text-[11.5px] text-lp-body mt-0.5">{hint}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative w-[42px] h-[22px] rounded-full border-2 border-lp-ink shrink-0 transition-colors",
          on ? "bg-lp-teal" : "bg-lp-line/60",
        )}
      >
        <span className={cn(
          "absolute top-px left-px w-4 h-4 rounded-full bg-white border-[1.5px] border-lp-ink transition-transform",
          on && "translate-x-5",
        )} />
      </button>
    </div>
  );
}

function RadioRow({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="flex gap-2">
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "flex-1 px-3 py-2.5 bg-white border-2 border-lp-ink rounded-[10px] font-display font-bold text-[12px] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-xs",
            value === o.v && "bg-lp-yellow shadow-pop-xs",
          )}
        >{o.l}</button>
      ))}
    </div>
  );
}

/* ──────────────── STEP 3 ──────────────── */
function Step3Review({ skill, source, purpose, meta }: { skill: SkillDef | null; source: SourceId | null; purpose: PurposeId; meta: MetaState }) {
  const sourceData = SOURCES.find(s => s.id === source);
  const purposeData = PURPOSES.find(p => p.id === purpose);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="relative bg-white border-[2.5px] border-lp-ink rounded-[22px] p-7 md:p-8 shadow-pop overflow-hidden">
        <span className="absolute top-0 left-0 right-0 h-2" style={{ background: skill?.bg }} />
        <div className="flex items-center gap-3.5">
          <div
            className="w-16 h-16 rounded-2xl border-[2.5px] border-lp-ink grid place-items-center text-[32px] shadow-pop-sm -rotate-3"
            style={{ background: skill?.soft }}
          >{skill?.emoji}</div>
          <div>
            <div className="font-display font-extrabold text-[11px] uppercase tracking-widest text-lp-coral-deep">
              {skill?.label} · {meta.level} · {purposeData?.label}
            </div>
            <h2 className="font-display font-black text-[28px] tracking-tight m-0 mt-1">{meta.name || "Đề thi chưa đặt tên"}</h2>
            {meta.book && <div className="text-[13px] text-lp-body mt-1">📚 {meta.book}</div>}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <ReviewRow k="Cấu trúc"   v={<><strong>{meta.parts}</strong> parts · <strong>{meta.qCount}</strong> câu hỏi · <strong>{meta.duration}</strong> phút</>} />
          <ReviewRow k="Nguồn"      v={<><strong>{sourceData?.label}</strong> — {sourceData?.desc}</>} />
          <ReviewRow k="Chấm điểm"  v={`${meta.autoGrade ? "✓ Tự động" : "✗ Thủ công"} · Đáp án: ${meta.showAnswers === "after" ? "sau khi nộp" : meta.showAnswers === "review" ? "khi GV duyệt" : "không hiện"}`} />
          <ReviewRow k="Trộn câu"   v={meta.randomize ? "Có" : "Không"} />
          <ReviewRow k="Visibility" v={
            meta.visibility === "workspace" ? "Workspace — mọi giáo viên trong tổ chức xem được"
              : meta.visibility === "private" ? "Riêng tư — chỉ em xem được"
              : "Public — chia sẻ ra bên ngoài"} />
          <ReviewRow k="Tags" v={
            <div className="flex gap-1.5 flex-wrap">
              {meta.tags.map(t => <span key={t} className="px-2 py-0.5 bg-lp-cream border-[1.5px] border-lp-line rounded-full text-[11px] font-display font-bold">{t}</span>)}
            </div>
          } />
        </div>
      </div>

      <div className="space-y-3.5">
        <SideCard accent="bg-lp-yellow-soft border-lp-ink" eyebrow="⚡ Bước tiếp theo" title="Sau khi tạo, em sẽ">
          <ul className="m-0 mt-2 p-0 list-none text-[12px] text-lp-ink space-y-1">
            <li className="flex gap-2 items-center"><Check className="h-3 w-3 text-lp-teal-deep" /> Soạn / import nội dung câu hỏi</li>
            <li className="flex gap-2 items-center"><Check className="h-3 w-3 text-lp-teal-deep" /> Preview như học viên</li>
            <li className="flex gap-2 items-center"><Check className="h-3 w-3 text-lp-teal-deep" /> Gắn vào lớp học hoặc khoá</li>
            <li className="flex gap-2 items-center"><Check className="h-3 w-3 text-lp-teal-deep" /> Theo dõi attempts + analytics</li>
          </ul>
        </SideCard>
        <SideCard accent="bg-lp-teal-soft border-lp-ink" eyebrow="💰 Chi phí" title={`~${source === "ai" ? 28 : (source === "word" || source === "paste") ? 12 : 0} credits`}>
          <p className="text-[12.5px] text-lp-body m-0 leading-[1.5]">Workspace của em còn <strong>1,847 credits</strong>.</p>
        </SideCard>
        <SideCard accent="bg-lp-coral-soft border-lp-ink" eyebrow="⚠ Lưu ý" title="">
          <p className="text-[12.5px] text-lp-body m-0 leading-[1.5]">Đề <strong>{meta.visibility}</strong> sẽ xuất hiện trong test bank cho {meta.visibility === "public" ? "tất cả người dùng" : "mọi giáo viên trong tổ chức"}. Em có thể đổi sau khi tạo.</p>
        </SideCard>
      </div>
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-dashed border-lp-line last:border-0">
      <div className="font-display font-bold text-[11px] uppercase tracking-widest text-lp-body w-[110px] shrink-0 pt-0.5">{k}</div>
      <div className="text-[13px] text-lp-ink">{v}</div>
    </div>
  );
}

function SideCard({ accent, eyebrow, title, children }: { accent: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className={cn("border-2 rounded-[18px] p-4 shadow-pop-xs", accent)}>
      <div className="font-display font-extrabold text-[10.5px] uppercase tracking-widest text-lp-coral-deep">{eyebrow}</div>
      {title && <h4 className="font-display font-black text-base tracking-tight m-0 mt-1 mb-1">{title}</h4>}
      {children}
    </div>
  );
}
