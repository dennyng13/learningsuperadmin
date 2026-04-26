import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Calendar, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@shared/lib/utils";
import { DayTooltip, type DaySkillData } from "@shared/components/misc/DayTooltip";
import WidgetRefreshButton from "./WidgetRefreshButton";

const WEEKDAYS = ["T2","T3","T4","T5","T6","T7","CN"];
const MONTH_NAMES = ["01","02","03","04","05","06","07","08","09","10","11","12"];

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  return { startDow, daysInMonth };
}

function getStreak(map: Map<string, DaySkillData>): number {
  const dates = new Set(map.keys());
  if (dates.size === 0) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  let check = new Date(today);
  const todayStr = check.toISOString().split("T")[0];
  if (!dates.has(todayStr)) check.setDate(check.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if (dates.has(check.toISOString().split("T")[0])) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else break;
  }
  return streak;
}

export default function AdminActivityCalendar() {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [activityMap, setActivityMap] = useState<Map<string, DaySkillData>>(new Map());
  const [slideDir, setSlideDir] = useState<"left"|"right"|null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const touchStartX = useRef<number|null>(null);
  const touchStartY = useRef<number|null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const loadActivity = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("activity_log")
        .select("activity_date, time_minutes, reading, listening, writing, speaking")
        .eq("user_id", user.id);
      if (data) {
        const m = new Map<string, DaySkillData>();
        for (const d of data) m.set(d.activity_date, {
          total: d.time_minutes, reading: d.reading, listening: d.listening,
          writing: d.writing, speaking: d.speaking,
        });
        setActivityMap(m);
      }
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const streak = useMemo(() => getStreak(activityMap), [activityMap]);

  const navMonth = useCallback((dir: number) => {
    setSlideDir(dir > 0 ? "right" : "left");
    setTimeout(() => {
      setCalMonth(m => {
        let nm = m + dir;
        if (nm < 0) { setCalYear(y => y - 1); return 11; }
        if (nm > 11) { setCalYear(y => y + 1); return 0; }
        return nm;
      });
      setSlideDir(null);
    }, 200);
  }, []);

  const { startDow, daysInMonth } = getMonthData(calYear, calMonth);

  const calendarCells = useMemo(() => {
    const cells: { day: number | null; dateStr: string }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ day: null, dateStr: "" });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [calYear, calMonth, startDow, daysInMonth]);

  const activeDaysThisMonth = calendarCells.filter(c => c.day && activityMap.has(c.dateStr)).length;
  const totalDaysInMonth = calendarCells.filter(c => c.day).length;
  const MAX_MINUTES = 180;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null; touchStartY.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) navMonth(dx < 0 ? 1 : -1);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" /> Lịch đăng nhập
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-accent" />
            <span className="font-bold text-accent">{streak}</span>
            <span className="text-muted-foreground">streak</span>
          </span>
          <span className="text-muted-foreground">
            {activeDaysThisMonth}/{totalDaysInMonth} ngày
          </span>
          <WidgetRefreshButton
            onClick={() => void loadActivity()}
            refreshing={isFetching}
            title="Tải lại lịch hoạt động"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          Tháng {MONTH_NAMES[calMonth]} / {calYear}
        </span>
        <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="touch-pan-y select-none">
        <style>{`
          @keyframes adm-slide-l { 0%{opacity:1;transform:translateX(0)} 100%{opacity:0;transform:translateX(-40px)} }
          @keyframes adm-slide-r { 0%{opacity:1;transform:translateX(0)} 100%{opacity:0;transform:translateX(40px)} }
          @keyframes adm-enter { 0%{opacity:0;transform:scale(.97)} 100%{opacity:1;transform:scale(1)} }
          @keyframes bar-grow { 0%{transform:scaleY(0)} 100%{transform:scaleY(1)} }
          .adm-slide-l{animation:adm-slide-l 200ms ease-in forwards}
          .adm-slide-r{animation:adm-slide-r 200ms ease-in forwards}
          .adm-enter{animation:adm-enter 200ms ease-out}
        `}</style>

        <div key={`${calYear}-${calMonth}`} className={slideDir === "right" ? "adm-slide-l" : slideDir === "left" ? "adm-slide-r" : "adm-enter"}>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, i) => {
              if (!cell.day) return <div key={`e-${i}`} />;
              const isToday = cell.dateStr === todayStr;
              const dayData = activityMap.get(cell.dateStr);
              const minutes = dayData?.total || 0;
              const hasAct = !!dayData;
              const barPct = hasAct ? Math.min(100, Math.round((minutes / MAX_MINUTES) * 100)) : 0;
              const el = (
                <div
                  className={cn(
                    "aspect-square rounded-lg text-xs font-medium flex items-end justify-center relative overflow-hidden",
                    isToday && "ring-2 ring-primary",
                    !hasAct && "text-muted-foreground"
                  )}
                >
                  {hasAct && (
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-b-lg origin-bottom"
                      style={{
                        height: `${barPct}%`,
                        background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.4))`,
                        animation: `bar-grow 0.5s ease-out ${i * 20}ms both`,
                      }}
                    />
                  )}
                  <span className={cn(
                    "relative z-10 pb-0.5",
                    hasAct && barPct > 50 ? "text-primary-foreground font-bold" : hasAct ? "text-foreground font-semibold" : ""
                  )}>
                    {cell.day}
                  </span>
                </div>
              );
              if (hasAct && dayData) {
                return <DayTooltip key={cell.dateStr} data={dayData}>{el}</DayTooltip>;
              }
              return <div key={cell.dateStr}>{el}</div>;
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-border relative overflow-hidden">
            <span className="absolute inset-x-0 bottom-0 h-[30%] rounded-b" style={{ background: 'linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.4))' }} />
          </span>
          Ít
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-border relative overflow-hidden">
            <span className="absolute inset-x-0 bottom-0 h-full rounded-b" style={{ background: 'linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.4))' }} />
          </span>
          ≥3h
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-3 h-3 rounded ring-2 ring-primary inline-block" /> Hôm nay
        </span>
      </div>
    </div>
  );
}
