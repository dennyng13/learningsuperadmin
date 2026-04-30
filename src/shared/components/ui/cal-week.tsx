import { cn } from "@shared/lib/utils";
import { addDays, format, isSameDay, isToday, startOfWeek } from "date-fns";
import type { HTMLAttributes } from "react";
import type { CalEvent } from "./cal-grid";
import { CalEvt } from "./cal-evt";

const HOUR_HEIGHT_PX = 56;
const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export interface CalWeekProps extends HTMLAttributes<HTMLDivElement> {
  weekStart: Date;
  events: CalEvent[];
  hourRange?: [number, number];
  onEventClick?: (event: CalEvent) => void;
}

interface PositionedEvent extends CalEvent {
  top: number;
  height: number;
  dayIndex: number;
}

function parseHourMin(value: string | undefined): { h: number; m: number } | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

function positionEvent(
  evt: CalEvent,
  weekStart: Date,
  hourRange: [number, number],
): PositionedEvent | null {
  const start = parseHourMin(evt.startTime);
  const end = parseHourMin(evt.endTime);
  if (!start) return null;

  const eventDate = new Date(`${evt.date}T00:00:00`);
  let dayIndex = -1;
  for (let i = 0; i < 7; i++) {
    if (isSameDay(addDays(weekStart, i), eventDate)) {
      dayIndex = i;
      break;
    }
  }
  if (dayIndex < 0) return null;

  const startMinFromBase = (start.h - hourRange[0]) * 60 + start.m;
  const endMinFromBase = end ? (end.h - hourRange[0]) * 60 + end.m : startMinFromBase + 60;
  const top = (startMinFromBase / 60) * HOUR_HEIGHT_PX;
  const height = Math.max(28, ((endMinFromBase - startMinFromBase) / 60) * HOUR_HEIGHT_PX - 4);

  return { ...evt, top, height, dayIndex };
}

export function CalWeek({
  weekStart,
  events,
  hourRange = [7, 22],
  onEventClick,
  className,
  ...props
}: CalWeekProps) {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const hours = Array.from(
    { length: hourRange[1] - hourRange[0] + 1 },
    (_, i) => hourRange[0] + i,
  );

  const positioned = events
    .map((e) => positionEvent(e, monday, hourRange))
    .filter((e): e is PositionedEvent => e !== null);

  return (
    <div
      className={cn(
        "border-[2.5px] border-lp-ink rounded-pop-lg shadow-pop bg-white overflow-hidden",
        className,
      )}
      {...props}
    >
      {/* Header row */}
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b-[2px] border-lp-ink bg-lp-cream">
        <div />
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "py-2 px-2 text-center border-l-[2px] border-lp-ink/60 flex flex-col items-center gap-1",
                today && "bg-lp-teal text-white",
              )}
            >
              <div
                className={cn(
                  "text-[10px] font-display font-bold uppercase tracking-wider",
                  today ? "text-white/90" : "text-lp-body",
                )}
              >
                {WEEKDAY_LABELS[i]}
              </div>
              <div
                className={cn(
                  "font-display text-base font-extrabold leading-none",
                  today
                    ? "inline-flex items-center justify-center h-7 w-7 rounded-full bg-lp-yellow text-lp-ink border-[2px] border-lp-ink"
                    : "text-lp-ink",
                )}
                aria-current={today ? "date" : undefined}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div
        className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]"
        style={{ height: hours.length * HOUR_HEIGHT_PX }}
      >
        {/* Hour labels column */}
        <div>
          {hours.map((h) => (
            <div
              key={h}
              className="text-[10px] font-display font-bold text-lp-body text-right pr-2 pt-1 border-t-[1.5px] border-lp-ink/15"
              style={{ height: HOUR_HEIGHT_PX }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* 7 day columns */}
        {days.map((day, dayIndex) => (
          <div
            key={day.toISOString()}
            className="relative border-l-[2px] border-lp-ink/60"
          >
            {hours.map((h) => (
              <div
                key={h}
                className="border-t-[1.5px] border-lp-ink/15"
                style={{ height: HOUR_HEIGHT_PX }}
              />
            ))}

            {/* Events for this day */}
            {positioned
              .filter((e) => e.dayIndex === dayIndex)
              .map((e) => (
                <div
                  key={e.id}
                  className="absolute left-1 right-1 z-10"
                  style={{ top: e.top, height: e.height }}
                >
                  <CalEvt
                    title={e.title}
                    subtitle={e.subtitle}
                    time={e.startTime && e.endTime ? `${e.startTime}-${e.endTime}` : e.startTime}
                    tone={e.tone}
                    status={e.status}
                    onClick={onEventClick ? () => onEventClick(e) : undefined}
                    className="h-full"
                  />
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
