/**
 * TimePicker — 24h hour/minute selector (Phase F3.7).
 *
 * Popover + scrollable hours + minutes columns. Replaces native <input type="time">
 * which has same browser inconsistencies as native date input (#C10 lessons —
 * jank on first open, auto-close on tab navigation, locale-dependent format).
 *
 * Pattern parallels Step1ClassInfo's date Popover+Calendar (commit ab89efc).
 *
 * Format: HH:MM 24h (per Day 6 user mandate).
 *
 * Usage:
 *   <TimePicker value="19:00" onChange={(v) => setStart(v)} />
 *   <TimePicker value={time} onChange={setTime} step={15} placeholder="..." />
 */

import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { cn } from "@shared/lib/utils";
import { formatTime24h } from "@shared/utils/dateFormat";

export interface TimePickerProps {
  /** "HH:MM" 24h string. Empty/null/undefined = no selection. */
  value: string | null | undefined;
  /** Receives "HH:MM" 24h string. */
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Minute step (5/10/15/30). Default 5. */
  step?: number;
  /** Min hour shown (default 0 = full 24h). */
  minHour?: number;
  /** Max hour shown (default 23). */
  maxHour?: number;
  className?: string;
}

export function TimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Chọn giờ",
  step = 5,
  minHour = 0,
  maxHour = 23,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);

  const parsed = value && /^\d{2}:\d{2}/.test(value)
    ? value.split(":").map(Number)
    : [null, null];
  const [hours, minutes] = parsed as [number | null, number | null];

  const setHour = (h: number) => {
    const m = minutes ?? 0;
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const setMinute = (m: number) => {
    const h = hours ?? 0;
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    setOpen(false);
  };

  const hourOptions: number[] = [];
  for (let h = minHour; h <= maxHour; h++) hourOptions.push(h);
  const minuteOptions: number[] = [];
  for (let m = 0; m < 60; m += step) minuteOptions.push(m);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center gap-2 transition-colors",
            "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="h-4 w-4 opacity-70 shrink-0" />
          {value ? formatTime24h(value) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <ScrollArea className="h-60 w-16 border-r">
            <div className="p-1">
              <p className="text-[10px] text-muted-foreground text-center mb-1 font-semibold uppercase tracking-wider">Giờ</p>
              {hourOptions.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour(h)}
                  className={cn(
                    "w-full px-2 py-1.5 rounded text-sm tabular-nums hover:bg-accent transition-colors",
                    hours === h && "bg-primary text-primary-foreground font-bold",
                  )}
                >
                  {String(h).padStart(2, "0")}
                </button>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="h-60 w-16">
            <div className="p-1">
              <p className="text-[10px] text-muted-foreground text-center mb-1 font-semibold uppercase tracking-wider">Phút</p>
              {minuteOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinute(m)}
                  className={cn(
                    "w-full px-2 py-1.5 rounded text-sm tabular-nums hover:bg-accent transition-colors",
                    minutes === m && "bg-primary text-primary-foreground font-bold",
                  )}
                >
                  {String(m).padStart(2, "0")}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
