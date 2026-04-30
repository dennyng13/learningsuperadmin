import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import { format } from "date-fns";
import type { ButtonHTMLAttributes } from "react";
import type { CalEvent } from "./cal-grid";

const calDayVariants = cva(
  "relative aspect-square min-h-[64px] flex flex-col items-stretch p-1.5 rounded-pop transition-all duration-150 text-left " +
    "border-[2px] border-lp-ink " +
    "hover:-translate-y-0.5 hover:shadow-pop-xs " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-coral focus-visible:ring-offset-2",
  {
    variants: {
      state: {
        default:  "bg-white text-lp-ink",
        today:    "bg-lp-teal text-white border-[2.5px]",
        selected: "bg-lp-coral text-white shadow-pop-xs",
        outside:  "bg-white/40 text-lp-ink/40 border-lp-ink/30",
      },
    },
    defaultVariants: { state: "default" },
  },
);

const toneDotMap: Record<NonNullable<CalEvent["tone"]>, string> = {
  teal:   "bg-lp-teal",
  coral:  "bg-lp-coral",
  yellow: "bg-lp-yellow",
  violet: "bg-lp-violet",
  sky:    "bg-lp-sky",
};

export interface CalDayProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    VariantProps<typeof calDayVariants> {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events?: CalEvent[];
}

export function CalDay({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  events,
  onClick,
  className,
  ...props
}: CalDayProps) {
  const state = isSelected ? "selected" : isToday ? "today" : !isCurrentMonth ? "outside" : "default";

  // Render up to 3 dots, with "+N" if more
  const visible = events?.slice(0, 3) ?? [];
  const overflow = events && events.length > 3 ? events.length - 3 : 0;

  const Element = onClick ? "button" : "div";
  const interactiveProps = onClick ? { type: "button" as const, onClick } : {};

  return (
    <Element
      className={cn(calDayVariants({ state }), !onClick && "cursor-default", className)}
      aria-label={format(date, "PPPP")}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      {...interactiveProps}
      {...props}
    >
      <span
        className={cn(
          "font-display text-sm font-bold leading-none self-start",
          state === "today" &&
            "inline-flex items-center justify-center h-6 w-6 rounded-full bg-lp-yellow text-lp-ink border-[1.5px] border-lp-ink",
        )}
      >
        {format(date, "d")}
      </span>

      {events && events.length > 0 && (
        <div className="mt-auto flex items-center gap-0.5 flex-wrap">
          {visible.map((evt) => (
            <span
              key={evt.id}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                toneDotMap[evt.tone ?? "teal"],
                state === "selected" && "ring-1 ring-white",
              )}
              aria-label={evt.title}
            />
          ))}
          {overflow > 0 && (
            <span
              className={cn(
                "text-[9px] font-bold leading-none",
                state === "selected" ? "text-white/90" : "text-lp-body",
              )}
            >
              +{overflow}
            </span>
          )}
        </div>
      )}
    </Element>
  );
}
