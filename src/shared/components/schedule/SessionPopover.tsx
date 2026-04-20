import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@shared/lib/utils";
import {
  Clock, MapPin, Hash, Timer, GraduationCap, Layers,
  FileText, Library, ChevronRight, Pencil, User, Users,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@shared/components/ui/drawer";
import { useIsMobile } from "@shared/hooks/use-mobile";

export interface SessionPopoverClassInfo {
  id?: string;
  class_name: string;
  class_type: string;
  level?: string | null;
  teacher_name?: string | null;
  room?: string | null;
  total_sessions: number;
  done_sessions?: number;
}

export interface SessionPopoverEntry {
  id: string;
  entry_date: string;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  session_number?: number | null;
  homework?: string | null;
  plan_status?: string | null;
  exercise_ids?: any[] | null;
  assessment_ids?: any[] | null;
  flashcard_set_ids?: any[] | null;
}

interface SessionPopoverProps {
  session: SessionPopoverEntry;
  classInfo: SessionPopoverClassInfo;
  /** "teacher" shows edit button; "student" shows exercise button */
  role?: "teacher" | "student";
  children: React.ReactNode;
}

function fmtTime(t: string | null | undefined) {
  if (!t) return "—:—";
  return t.slice(0, 5);
}

function durationStr(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}` : `${h.toString().padStart(2, "0")}:00`;
}

function totalHoursStr(total: number, doneCount: number, startTime: string | null | undefined, endTime: string | null | undefined) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const sessionMins = (eh * 60 + em) - (sh * 60 + sm);
  if (sessionMins <= 0) return null;
  const doneMins = doneCount * sessionMins;
  const totalMins = total * sessionMins;
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r > 0 ? `${h.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}` : `${h.toString().padStart(2, "0")}:00`;
  };
  return `${fmt(doneMins)} / ${fmt(totalMins)} hrs`;
}

const DAY_LABELS: Record<number, string> = { 0: "Chủ nhật", 1: "Thứ 2", 2: "Thứ 3", 3: "Thứ 4", 4: "Thứ 5", 5: "Thứ 6", 6: "Thứ 7" };

function PopoverBody({ session, classInfo, role, onNavigate }: {
  session: SessionPopoverEntry;
  classInfo: SessionPopoverClassInfo;
  role: "teacher" | "student";
  onNavigate: (path: string) => void;
}) {
  const isPrivate = classInfo.class_type === "private";
  const entryDate = new Date(session.entry_date + "T00:00:00");
  const exCount = Array.isArray(session.exercise_ids) ? session.exercise_ids.length : 0;
  const assCount = Array.isArray(session.assessment_ids) ? session.assessment_ids.length : 0;
  const fsCount = Array.isArray(session.flashcard_set_ids) ? session.flashcard_set_ids.length : 0;
  const progressPct = classInfo.total_sessions > 0 && session.session_number
    ? Math.round(((session.session_number) / classInfo.total_sessions) * 100)
    : 0;
  const room = session.room || classInfo.room;
  const dur = durationStr(session.start_time, session.end_time);
  const hours = totalHoursStr(
    classInfo.total_sessions,
    classInfo.done_sessions || 0,
    session.start_time,
    session.end_time,
  );

  const handleDetail = () => {
    onNavigate(`/study-plan?session=${session.id}`);
  };

  const handleExercises = () => {
    onNavigate(`/study-plan?session=${session.id}`);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <span className={cn(
          "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
          isPrivate ? "bg-destructive" : "bg-emerald-500",
        )} />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-sm leading-tight truncate">
            {classInfo.class_name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {classInfo.level && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{classInfo.level}</Badge>
            )}
            <Badge variant="outline" className={cn(
              "text-[9px] px-1.5 py-0 h-4",
              isPrivate ? "border-destructive/30 text-destructive" : "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
            )}>
              {isPrivate ? "1-1" : "Nhóm"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5">
        {/* Time */}
        <div className="flex items-center gap-2 text-xs">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span>{fmtTime(session.start_time)} - {fmtTime(session.end_time)}</span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-3.5" />
          <span>{DAY_LABELS[entryDate.getDay()]}, {format(entryDate, "dd/MM/yyyy")}</span>
        </div>

        {/* Room */}
        {room && (
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{room}</span>
          </div>
        )}

        {/* Session number + progress ring */}
        {session.session_number != null && session.session_number > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>Buổi {session.session_number} / {classInfo.total_sessions}</span>
            {/* Mini progress ring */}
            <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
              <circle cx="9" cy="9" r="7" fill="none" strokeWidth="2" className="stroke-muted" />
              <circle
                cx="9" cy="9" r="7" fill="none" strokeWidth="2"
                className="stroke-primary"
                strokeDasharray={`${2 * Math.PI * 7}`}
                strokeDashoffset={`${2 * Math.PI * 7 * (1 - progressPct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 9 9)"
              />
            </svg>
            <span className="text-[10px] text-muted-foreground">{progressPct}%</span>
          </div>
        )}

        {/* Hours */}
        {hours && (
          <div className="flex items-center gap-2 text-xs">
            <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{hours}</span>
          </div>
        )}

        {/* Teacher */}
        {classInfo.teacher_name && (
          <div className="flex items-center gap-2 text-xs">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{classInfo.teacher_name}</span>
          </div>
        )}
      </div>

      {/* Content / homework */}
      {session.homework && (
        <div className="pt-1 border-t">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5"> Nội dung:</p>
          <p className="text-xs">{session.homework}</p>
        </div>
      )}

      {/* Assigned content counts */}
      {(exCount > 0 || assCount > 0 || fsCount > 0) && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {exCount > 0 && (
            <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {exCount} bài tập</span>
          )}
          {assCount > 0 && (
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {assCount} bài thi</span>
          )}
          {fsCount > 0 && (
            <span className="flex items-center gap-1"><Library className="h-3 w-3" /> {fsCount} từ vựng</span>
          )}
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex items-center gap-2 pt-1 border-t">
        <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleDetail}>
          Xem chi tiết <ChevronRight className="h-3 w-3" />
        </Button>
        {role === "teacher" && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleDetail}>
            <Pencil className="h-3 w-3" /> Chỉnh sửa
          </Button>
        )}
        {role === "student" && exCount > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleExercises}>
            <Layers className="h-3 w-3" /> Làm bài tập
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SessionPopover({
  session,
  classInfo,
  role = "teacher",
  children,
}: SessionPopoverProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  if (isMobile) {
    return (
      <>
        <div onClick={() => setOpen(true)}>{children}</div>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Chi tiết buổi học</DrawerTitle>
              <DrawerDescription>Thông tin buổi học</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 pt-2">
              <PopoverBody session={session} classInfo={classInfo} role={role} onNavigate={handleNavigate} />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start" side="right">
        <PopoverBody session={session} classInfo={classInfo} role={role} onNavigate={handleNavigate} />
      </PopoverContent>
    </Popover>
  );
}
