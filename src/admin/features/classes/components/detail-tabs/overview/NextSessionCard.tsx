/**
 * NextSessionCard — Featured card lớn cho buổi học tiếp theo
 * Match mockup pages-class-detail.jsx "Next session featured"
 *
 * Features:
 * - Date block (MON / day / DOW)
 * - Topic chip
 * - Session number
 * - Time, room, confirmation count
 * - Prep checklist
 * - Action buttons
 */
import { Clock, MapPin, Users, Calendar, Check, Circle } from "lucide-react";
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";

export interface PrepItem {
  text: string;
  done: boolean;
}

export interface NextSessionInfo {
  sessionNumber: number;
  totalSessions: number;
  date: {
    month: string;
    day: string;
    dayOfWeek: string;
  };
  topic: string;
  topicColor: string;
  title: string;
  timeRange: string;
  room: string;
  branch?: string;
  confirmedCount: number;
  totalStudents: number;
  prepItems: PrepItem[];
}

interface NextSessionCardProps {
  session?: NextSessionInfo;
  loading?: boolean;
  onOpenSession?: () => void;
  onOpenLessonPlan?: () => void;
  onPreAttendance?: () => void;
}

const DEFAULT_SESSION: NextSessionInfo = {
  sessionNumber: 13,
  totalSessions: 36,
  date: { month: "APR", day: "29", dayOfWeek: "Thứ 4" },
  topic: "Reading",
  topicColor: "#38B6AB",
  title: "Reading: Skimming techniques & quick scan",
  timeRange: "18:00 → 20:00",
  room: "Room 3",
  branch: "HBT",
  confirmedCount: 18,
  totalStudents: 18,
  prepItems: [
    { text: "Reading Pack #5 — đã upload", done: true },
    { text: "Vocabulary list 12 (50 từ)", done: true },
    { text: "Quick quiz 10 câu — đang chờ Mr. Khoa", done: false },
  ],
};

export function NextSessionCard({
  session = DEFAULT_SESSION,
  loading = false,
  onOpenSession,
  onOpenLessonPlan,
  onPreAttendance,
}: NextSessionCardProps) {
  if (loading) {
    return (
      <Card className="p-6 h-64 animate-pulse bg-muted border-[2.5px] border-lp-ink/10">
        <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-4" />
        <div className="grid grid-cols-[auto_1fr_auto] gap-4">
          <div className="h-20 w-16 bg-muted-foreground/20 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
            <div className="h-6 w-48 bg-muted-foreground/20 rounded" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-[2.5px] border-lp-ink shadow-pop bg-white">
      {/* Pulse indicator tag */}
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-50 to-transparent border-b border-rose-100">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
        </span>
        <span className="text-xs font-semibold text-rose-700">
          Buổi tiếp theo · trong 2 ngày
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5">
        {/* Date block */}
        <div className="flex flex-col items-center justify-center px-4 py-3 bg-gradient-to-b from-rose-500 to-rose-600 text-white rounded-xl border-[2px] border-lp-ink shadow-pop-sm min-w-[80px]">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
            {session.date.month}
          </span>
          <span className="font-display text-3xl font-extrabold leading-none my-1">
            {session.date.day}
          </span>
          <span className="text-xs font-semibold opacity-90">
            {session.date.dayOfWeek}
          </span>
        </div>

        {/* Main content */}
        <div className="space-y-3 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold text-lp-body uppercase tracking-wider">
              BUỔI {session.sessionNumber} / {session.totalSessions}
            </span>
            {/* Topic chip */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border"
              style={{
                background: `${session.topicColor}33`,
                borderColor: session.topicColor,
                color: "var(--lp-ink)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: session.topicColor }}
              />
              {session.topic}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-display text-lg md:text-xl font-bold text-lp-ink leading-snug">
            {session.title}
          </h3>

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-lp-body">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.timeRange}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {session.room} · {session.branch}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {session.confirmedCount} / {session.totalStudents} đã xác nhận
            </span>
          </div>

          {/* Prep checklist */}
          <div className="mt-3 pt-3 border-t border-dashed border-lp-ink/15">
            <p className="text-[10px] font-bold uppercase tracking-wider text-lp-body mb-2">
              Chuẩn bị trước buổi
            </p>
            <ul className="space-y-1.5">
              {session.prepItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  {item.done ? (
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-50 text-amber-500 border border-amber-200">
                      <Circle className="h-2.5 w-2.5" strokeWidth={2} />
                    </span>
                  )}
                  <span className={cn(item.done ? "text-lp-body" : "text-amber-700")}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 min-w-[140px]">
          <Button
            onClick={onOpenSession}
            className="bg-rose-500 hover:bg-rose-600 text-white border-[2px] border-lp-ink shadow-pop-sm hover:shadow-pop transition-all font-display font-bold text-xs h-9"
          >
            Mở session live
          </Button>
          <Button
            variant="outline"
            onClick={onOpenLessonPlan}
            className="border-[2px] border-lp-ink/30 hover:border-lp-ink/60 font-display font-bold text-xs h-9"
          >
            Lesson plan
          </Button>
          <Button
            variant="outline"
            onClick={onPreAttendance}
            className="border-[2px] border-lp-ink/30 hover:border-lp-ink/60 font-display font-bold text-xs h-9"
          >
            Điểm danh trước
          </Button>
        </div>
      </div>
    </Card>
  );
}
