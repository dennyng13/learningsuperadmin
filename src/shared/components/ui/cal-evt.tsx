import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

const calEvtVariants = cva(
  "relative w-full text-left rounded-pop border-[2px] border-lp-ink shadow-pop-xs px-2 py-1.5 transition-all duration-150 " +
    "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-coral focus-visible:ring-offset-1",
  {
    variants: {
      tone: {
        teal:   "bg-lp-teal text-white",
        coral:  "bg-lp-coral text-white",
        yellow: "bg-lp-yellow text-lp-ink",
        violet: "bg-lp-violet text-white",
        sky:    "bg-lp-sky text-lp-ink",
      },
      status: {
        scheduled:   "",
        cancelled:   "opacity-60 [&_.evt-title]:line-through",
        completed:   "opacity-75",
        in_progress: "",
      },
    },
    defaultVariants: { tone: "teal", status: "scheduled" },
  },
);

export interface CalEvtProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "title">,
    VariantProps<typeof calEvtVariants> {
  title: string;
  subtitle?: string;
  time?: string;
}

export function CalEvt({
  title,
  subtitle,
  time,
  tone,
  status,
  onClick,
  className,
  ...props
}: CalEvtProps) {
  const Element: any = onClick ? "button" : "div";
  const interactiveProps = onClick ? { type: "button" as const, onClick } : {};

  return (
    <Element
      className={cn(calEvtVariants({ tone, status }), !onClick && "cursor-default", className)}
      {...interactiveProps}
      {...props}
    >
      {status === "in_progress" && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 h-2 w-2 rounded-full bg-current animate-pulse-dot"
        />
      )}
      {status === "completed" && (
        <Check aria-hidden="true" className="absolute top-1 right-1 size-3.5" strokeWidth={3} />
      )}

      {time && (
        <div className="evt-time text-[10px] font-display font-bold opacity-90 leading-tight">
          {time}
        </div>
      )}
      <div className="evt-title text-xs font-bold leading-tight">{title}</div>
      {subtitle && <div className="text-[10px] opacity-80 leading-tight mt-0.5">{subtitle}</div>}
    </Element>
  );
}
