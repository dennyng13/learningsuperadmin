/**
 * ProgramDetailNew — Program detail view matching mockup
 * Thay thế ProgramDetailTab với UI từ pages-program-detail.jsx
 *
 * Layout:
 *   • ProgramHero: Emoji, stats, actions
 *   • Tabs: Curriculum | Classes | Cohorts | Funnel | Team
 *   • Tab content tương ứng
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ProgramHero,
  CurriculumTimeline,
  ProgramSidebar,
  ClassesTable,
  CohortsList,
} from "./program-detail";
import { Button } from "@shared/components/ui/button";
import { Search, MoreHorizontal } from "lucide-react";
import type { CourseProgram } from "@admin/features/academic/hooks/useCoursesAdmin";
import type { CourseLevel } from "@shared/hooks/useCourseLevels";
import { cn } from "@shared/lib/utils";

// Mock data matching the mockup
const MOCK_PROGRAM = {
  code: "IELTS-PRE",
  name: "Pre-IELTS Bridge",
  tagline: "B1 → 6.0 — phổ biến nhất",
  level: "A2 → B1",
  emoji: "🎯",
  color: "coral" as const,
  status: "active" as const,
  desc: "Cây cầu nối từ tiếng Anh tổng quát sang IELTS. Tập trung vocab học thuật + 4 kỹ năng song song. Học viên hoàn thành thường lên thẳng IELTS-INT 6.5+.",
  students: 102,
  classes: 6,
  courses: 6,
  weeks: 18,
  bandLiftAvg: 1.2,
  pricing: { full: 18_500_000, perWeek: 1_028_000 },
  revenue: 312_000_000,
  target: 320_000_000,
  completion: 84,
  satisfaction: 92,
  retention: 94,
};

const MOCK_COURSES = [
  { idx: 1, code: "PRE-01", name: "Foundation Refresh", weeks: 3, lessons: 12, focus: ["Grammar", "Vocab base"], band: "4.5 → 5.0", emoji: "🌱", state: "completed" as const },
  { idx: 2, code: "PRE-02", name: "Reading Mechanics", weeks: 3, lessons: 12, focus: ["Skim & Scan", "TFNG"], band: "5.0 → 5.5", emoji: "📖", state: "completed" as const },
  { idx: 3, code: "PRE-03", name: "Listening Bridge", weeks: 3, lessons: 12, focus: ["Note-taking", "Map"], band: "5.0 → 5.5", emoji: "🎧", state: "active" as const },
  { idx: 4, code: "PRE-04", name: "Writing Task 1 Basics", weeks: 3, lessons: 12, focus: ["Charts", "Process"], band: "5.0 → 5.5", emoji: "✍️", state: "active" as const },
  { idx: 5, code: "PRE-05", name: "Speaking Confidence", weeks: 3, lessons: 12, focus: ["Part 1-2", "Fluency"], band: "5.5 → 6.0", emoji: "🎙️", state: "upcoming" as const },
  { idx: 6, code: "PRE-06", name: "Mock & Polish", weeks: 3, lessons: 12, focus: ["Mock", "Strategy"], band: "5.5 → 6.0", emoji: "🏁", state: "upcoming" as const },
];

const MOCK_CLASSES = [
  { code: "PRE-A2-04", students: 18, cap: 20, teacher: "Ms. Linh", course: "PRE-03", day: "T2-4-6", time: "18:00", status: "running" as const, color: "coral" },
  { code: "PRE-A2-05", students: 16, cap: 18, teacher: "Ms. Linh", course: "PRE-03", day: "T3-5-7", time: "18:00", status: "running" as const, color: "coral" },
  { code: "PRE-B1-02", students: 20, cap: 20, teacher: "Ms. Dung", course: "PRE-04", day: "T2-4-6", time: "19:30", status: "running" as const, color: "violet" },
  { code: "PRE-B1-03", students: 17, cap: 20, teacher: "Ms. Dung", course: "PRE-04", day: "T3-5-7", time: "19:30", status: "running" as const, color: "violet" },
  { code: "PRE-A2-06", students: 14, cap: 18, teacher: "Mr. Tuấn", course: "PRE-02", day: "T2-4-6", time: "17:30", status: "running" as const, color: "sky" },
  { code: "PRE-A2-07", students: 17, cap: 20, teacher: "Mr. Khoa", course: "PRE-01", day: "T7-CN", time: "08:30", status: "starting" as const, color: "teal" },
];

const MOCK_COHORTS = [
  { name: "Cohort 24Q4", enrolled: 38, completed: 34, avgLift: 1.3, status: "graduated" as const },
  { name: "Cohort 25Q1", enrolled: 42, completed: 36, avgLift: 1.2, status: "graduated" as const },
  { name: "Cohort 25Q2", enrolled: 44, completed: 39, avgLift: 1.4, status: "graduated" as const },
  { name: "Cohort 25Q3", enrolled: 46, completed: 41, avgLift: 1.1, status: "graduated" as const },
  { name: "Cohort 25Q4", enrolled: 52, completed: 0, avgLift: 0, status: "active" as const },
  { name: "Cohort 26Q1", enrolled: 48, completed: 0, avgLift: 0, status: "active" as const },
];

const TABS = [
  { id: "curriculum", label: "Curriculum" },
  { id: "classes", label: "Classes" },
  { id: "cohorts", label: "Cohorts" },
  { id: "funnel", label: "Funnel · Doanh thu" },
  { id: "team", label: "Team" },
] as const;

interface Props {
  program: CourseProgram;
  levels: CourseLevel[];
  onChanged: () => void | Promise<void>;
}

type TabId = typeof TABS[number]["id"];

export default function ProgramDetailNew({ program, levels, onChanged }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("curriculum");
  const navigate = useNavigate();

  // TODO: Replace mock data with real data from program/levels
  const isMock = true; // Flag để biết đang dùng mock data

  return (
    <div className="space-y-5">
      {/* ─── HERO ─── */}
      <ProgramHero
        program={MOCK_PROGRAM}
        onOpenClass={() => navigate("/classes/new")}
        onDuplicate={() => {}}
        onEdit={() => {}}
        onDownload={() => {}}
      />

      {/* ─── TABS ─── */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                activeTab === t.id
                  ? "bg-background text-lp-ink shadow-sm border border-lp-ink/10"
                  : "text-muted-foreground hover:text-lp-ink hover:bg-muted"
              )}
            >
              {t.label}
              {t.id === "classes" && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px]">
                  {MOCK_CLASSES.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 border-[2px] border-lp-ink shadow-pop-xs">
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 border-[2px] border-lp-ink shadow-pop-xs">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      {activeTab === "curriculum" && (
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
          <CurriculumTimeline
            courses={MOCK_COURSES}
            duration="18 tuần · 4 buổi/tuần · 90 phút/buổi"
            programColor="coral"
          />
          <ProgramSidebar />
        </div>
      )}

      {activeTab === "classes" && (
        <ClassesTable
          classes={MOCK_CLASSES}
          onOpenClass={() => navigate("/classes/new")}
          onViewClass={(c) => navigate(`/classes/${c.code}`)}
        />
      )}

      {activeTab === "cohorts" && (
        <CohortsList cohorts={MOCK_COHORTS} />
      )}

      {activeTab === "funnel" && (
        <div className="p-12 text-center border-2 border-dashed border-lp-ink/20 rounded-xl bg-muted/20">
          <p className="text-muted-foreground">Funnel visualization — cần backend data</p>
        </div>
      )}

      {activeTab === "team" && (
        <div className="p-12 text-center border-2 border-dashed border-lp-ink/20 rounded-xl bg-muted/20">
          <p className="text-muted-foreground">Team/Teachers grid — cần backend data</p>
        </div>
      )}

      {/* Warning nếu đang dùng mock data */}
      {isMock && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <strong>⚠️ Đang hiển thị mock data</strong> — Backend chưa có đủ dữ liệu cho program detail view.
        </div>
      )}
    </div>
  );
}
