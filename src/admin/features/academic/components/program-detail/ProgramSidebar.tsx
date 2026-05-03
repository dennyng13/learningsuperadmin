/**
 * ProgramSidebar — Side panels cho Program Detail
 * Match mockup pages-program-detail.jsx side panels
 *
 * Features:
 * - Outcomes cam kết (yellow card)
 * - Tài liệu & Đầu vào (materials)
 * - Lộ trình tiếp theo (next program teaser)
 */
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

interface Outcome {
  text: string;
}

interface Material {
  label: string;
  value: string;
}

interface NextProgram {
  emoji: string;
  name: string;
  stats: string;
}

interface ProgramSidebarProps {
  outcomes?: Outcome[];
  materials?: Material[];
  nextProgram?: NextProgram;
  onOpenLessonPlans?: () => void;
  onViewNextProgram?: () => void;
}

const DEFAULT_OUTCOMES: Outcome[] = [
  { text: "Đạt mục tiêu IELTS 6.0 với band tối thiểu 5.5 mỗi kỹ năng" },
  { text: "1,800+ từ vựng học thuật core" },
  { text: "3 mock test full với feedback chi tiết" },
  { text: "Mở khoá lên thẳng IELTS-INT 6.5+" },
];

const DEFAULT_MATERIALS: Material[] = [
  { label: "Yêu cầu đầu vào", value: "Test xếp lớp ≥ 3.5 / Pre-A2 hoàn tất" },
  { label: "Sách core", value: "Cambridge IELTS 17–19, Vocabulary for IELTS" },
  { label: "Lesson plans", value: "72 plans · 1,440 phút giảng" },
  { label: "Bài tập về nhà", value: "~3h/tuần (LMS auto-grade)" },
  { label: "Check-point", value: "Tuần 6, 12 (mid-term mock)" },
];

const DEFAULT_NEXT_PROGRAM: NextProgram = {
  emoji: "⚡",
  name: "IELTS Intensive 6.5+",
  stats: "8 tuần · 156M doanh thu QTD · 76% HV chuyển tiếp",
};

export function ProgramSidebar({
  outcomes = DEFAULT_OUTCOMES,
  materials = DEFAULT_MATERIALS,
  nextProgram = DEFAULT_NEXT_PROGRAM,
  onOpenLessonPlans,
  onViewNextProgram,
}: ProgramSidebarProps) {
  return (
    <div className="space-y-4">
      {/* Outcomes card */}
      <Card className="p-5 border-[2px] border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-pop">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-3">
          🎯 Outcomes cam kết
        </div>
        <ul className="space-y-3">
          {outcomes.map((o, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-300 border border-lp-ink flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="text-lp-ink font-medium">{o.text}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Materials card */}
      <Card className="p-5 border-[2px] border-lp-ink shadow-pop bg-white">
        <div className="text-[10px] font-bold uppercase tracking-wider text-lp-body mb-3">
          📚 Tài liệu & Đầu vào
        </div>
        <div className="space-y-2">
          {materials.map((m, i, arr) => (
            <div
              key={m.label}
              className={
                i < arr.length - 1 ? "pb-2 border-b border-dashed border-lp-ink/20" : ""
              }
            >
              <div className="text-[11px] font-bold text-lp-body mb-0.5">{m.label}</div>
              <div className="text-sm font-semibold text-lp-ink">{m.value}</div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenLessonPlans}
          className="w-full mt-4 border-[2px] border-lp-ink shadow-pop-xs"
        >
          <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Mở lesson plan kho
        </Button>
      </Card>

      {/* Next program card */}
      <Card className="p-5 border-[2px] border-teal-300 bg-teal-50 shadow-pop">
        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-3">
          🚀 Lộ trình tiếp theo
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border-[2px] border-lp-ink flex items-center justify-center text-2xl shadow-pop-xs"
            style={{ transform: "rotate(-3deg)" }}
          >
            {nextProgram.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-base font-bold leading-tight">
              {nextProgram.name}
            </div>
            <div className="text-[11px] text-lp-body font-semibold mt-0.5">
              {nextProgram.stats}
            </div>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={onViewNextProgram}
            className="h-8 w-8 border-[2px] border-lp-ink shadow-pop-xs shrink-0"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
