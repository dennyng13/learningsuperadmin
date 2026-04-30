import { cn } from "@shared/lib/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { HTMLAttributes } from "react";
import { CalDay } from "./cal-day";

export interface CalEvent {
  id: string;
  title: string;
  subtitle?: string;
  date: string;       // 'YYYY-MM-DD'
  startTime?: string; // 'HH:MM'
  endTime?: string;
  tone?: "teal" | "coral" | "yellow" | "violet" | "sky";
  status?: "scheduled" | "cancelled" | "completed" | "in_progress";
}

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export interface CalGridProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  month: Date;
  selected?: Date;
  onSelectDate?: (date: Date) => void;
  events?: Map<string, CalEvent[]>;
  tone?: "cream" | "white";
}

export function CalGrid({
  month,
  selected,
  onSelectDate,
  events,
  tone = "cream",
  className,
  ...props
}: CalGridProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  // Monday-first week
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div
      className={cn(
        "border-[2.5px] border-lp-ink rounded-pop-lg shadow-pop p-4",
        tone === "cream" ? "bg-lp-cream" : "bg-white",
        className,
      )}
      {...props}
    >
      <header className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-xl font-extrabold text-lp-ink">
          {format(month, "MMMM yyyy")}
        </h3>
      </header>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] font-display font-bold uppercase tracking-wider text-lp-body py-1"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          return (
            <CalDay
              key={key}
              date={day}
              isCurrentMonth={isSameMonth(day, month)}
              isToday={isToday(day)}
              isSelected={selected ? isSameDay(day, selected) : false}
              events={events?.get(key)}
              onClick={onSelectDate ? () => onSelectDate(day) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
