/**
 * DurationPicker — hours/minutes duration input (Phase F3.7).
 *
 * Popover + numeric inputs (hours 0-23, minutes 0-59).
 * Stores total in MINUTES (single source); displays as "Xh Ym" / "Xh" / "Ym".
 *
 * Used trong Plan editor + wizard slot duration.
 *
 * Format: 24h-style hour count (no AM/PM). Per Day 6 user mandate.
 *
 * Usage:
 *   <DurationPicker value={120} onChange={setMinutes} />
 *   // 120 → display "2h"; user picks 2h 30m → onChange(150)
 */

import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { cn } from "@shared/lib/utils";

export interface DurationPickerProps {
  /** Total duration in MINUTES (canonical). */
  value: number;
  /** Receives total minutes. */
  onChange: (minutes: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/** "2h 30m" / "2h" / "30m" / "—". */
export function formatDurationDisplay(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function DurationPicker({
  value,
  onChange,
  disabled,
  placeholder = "Chọn thời lượng",
  className,
}: DurationPickerProps) {
  const [open, setOpen] = useState(false);
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
  const hours = Math.floor(safeValue / 60);
  const minutes = safeValue % 60;

  const setHours = (h: number) => {
    const clamped = Math.max(0, Math.min(23, Number(h) || 0));
    onChange(clamped * 60 + minutes);
  };
  const setMinutes = (m: number) => {
    const clamped = Math.max(0, Math.min(59, Number(m) || 0));
    onChange(hours * 60 + clamped);
  };

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
            safeValue === 0 && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="h-4 w-4 opacity-70 shrink-0" />
          {safeValue > 0 ? formatDurationDisplay(safeValue) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Giờ</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-20 tabular-nums"
            />
          </div>
          <span className="pb-2.5 text-muted-foreground">:</span>
          <div className="space-y-1">
            <Label className="text-xs">Phút</Label>
            <Input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-20 tabular-nums"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Tổng: <strong className="text-foreground tabular-nums">{formatDurationDisplay(safeValue)}</strong>
          {" · "}
          {safeValue} phút
        </p>
      </PopoverContent>
    </Popover>
  );
}
