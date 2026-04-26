import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { startOfDay, endOfDay, startOfMonth, subDays, format, isValid, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarRange, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Calendar } from "@shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

export type AnalyticsRangePreset = "today" | "7d" | "30d" | "this-month" | "custom";

export interface AnalyticsRange {
  preset: AnalyticsRangePreset;
  /** Inclusive start (00:00:00 local). */
  from: Date;
  /** Inclusive end (23:59:59.999 local). */
  to: Date;
}

export const PRESET_LABELS: Record<AnalyticsRangePreset, string> = {
  today: "Hôm nay",
  "7d": "7 ngày qua",
  "30d": "30 ngày qua",
  "this-month": "Tháng này",
  custom: "Tùy chỉnh",
};

export function buildPresetRange(preset: Exclude<AnalyticsRangePreset, "custom">): AnalyticsRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { preset, from: startOfDay(now), to: endOfDay(now) };
    case "7d":
      return { preset, from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30d":
      return { preset, from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "this-month":
      return { preset, from: startOfMonth(now), to: endOfDay(now) };
  }
}

export const DEFAULT_RANGE: AnalyticsRange = buildPresetRange("30d");

/** Days inclusive (ceil). */
export function rangeDays(range: AnalyticsRange): number {
  const ms = range.to.getTime() - range.from.getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

export function formatRangeLabel(range: AnalyticsRange): string {
  if (range.preset !== "custom") return PRESET_LABELS[range.preset];
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const fmt = sameYear ? "dd/MM" : "dd/MM/yyyy";
  return `${format(range.from, fmt, { locale: vi })} – ${format(range.to, fmt, { locale: vi })}`;
}

/* ─── Context ─── */

interface AnalyticsRangeContextValue {
  range: AnalyticsRange;
  setRange: (range: AnalyticsRange) => void;
}

const AnalyticsRangeContext = createContext<AnalyticsRangeContextValue | null>(null);

export function AnalyticsRangeProvider({
  children,
  initialRange = DEFAULT_RANGE,
}: {
  children: ReactNode;
  initialRange?: AnalyticsRange;
}) {
  const [range, setRange] = useState<AnalyticsRange>(initialRange);
  const value = useMemo(() => ({ range, setRange }), [range]);
  return (
    <AnalyticsRangeContext.Provider value={value}>{children}</AnalyticsRangeContext.Provider>
  );
}

/** Returns shared range or DEFAULT_RANGE when not wrapped in provider. */
export function useAnalyticsRange(): AnalyticsRangeContextValue {
  const ctx = useContext(AnalyticsRangeContext);
  if (ctx) return ctx;
  // Fallback so widgets can be used standalone without provider.
  return { range: DEFAULT_RANGE, setRange: () => {} };
}

/* ─── Selector UI ─── */

const PRESET_ORDER: Exclude<AnalyticsRangePreset, "custom">[] = [
  "today",
  "7d",
  "30d",
  "this-month",
];

export function AnalyticsRangeSelector({ className }: { className?: string }) {
  const { range, setRange } = useAnalyticsRange();
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(range.from);
  const [draftTo, setDraftTo] = useState<Date | undefined>(range.to);

  const applyPreset = (preset: Exclude<AnalyticsRangePreset, "custom">) => {
    setRange(buildPresetRange(preset));
  };

  const applyCustom = () => {
    if (!draftFrom || !draftTo) return;
    const from = startOfDay(draftFrom <= draftTo ? draftFrom : draftTo);
    const to = endOfDay(draftFrom <= draftTo ? draftTo : draftFrom);
    setRange({ preset: "custom", from, to });
    setCustomOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Desktop: pill buttons */}
      <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-muted/40">
        {PRESET_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => applyPreset(p)}
            className={cn(
              "px-3 py-1.5 text-xs font-display font-semibold rounded-lg transition-all",
              range.preset === p
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "px-3 py-1.5 text-xs font-display font-semibold rounded-lg transition-all flex items-center gap-1.5",
                range.preset === "custom"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              {range.preset === "custom" ? formatRangeLabel(range) : "Tùy chỉnh"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: draftFrom, to: draftTo }}
              onSelect={(r) => {
                setDraftFrom(r?.from);
                setDraftTo(r?.to);
              }}
              numberOfMonths={2}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="flex items-center justify-end gap-2 p-3 border-t">
              <Button size="sm" variant="ghost" onClick={() => setCustomOpen(false)}>
                Hủy
              </Button>
              <Button size="sm" onClick={applyCustom} disabled={!draftFrom || !draftTo}>
                Áp dụng
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile: dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="md:hidden">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-display">
            <CalendarRange className="h-3.5 w-3.5" />
            {formatRangeLabel(range)}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {PRESET_ORDER.map((p) => (
            <DropdownMenuItem key={p} onClick={() => applyPreset(p)}>
              {PRESET_LABELS[p]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => setCustomOpen(true)}>
            Tùy chỉnh…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Small inline badge widgets can render to indicate active range. */
export function AnalyticsRangeBadge({
  range,
  className,
}: {
  range?: AnalyticsRange;
  className?: string;
}) {
  const ctx = useAnalyticsRange();
  const r = range ?? ctx.range;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/40 rounded-md px-2 py-0.5",
        className,
      )}
    >
      <CalendarRange className="h-3 w-3" />
      {formatRangeLabel(r)}
    </span>
  );
}