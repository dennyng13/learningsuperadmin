import { cn } from "@shared/lib/utils";
import { getQuestionTypeMeta } from "@shared/utils/questionTypeMeta";

interface Props {
  type: string;
  /** Filled (selected) styling instead of soft pill. */
  active?: boolean;
  /** Size variant. */
  size?: "xs" | "sm" | "md";
  /** Show icon (default true). */
  showIcon?: boolean;
  /** Render as button (clickable) vs span. */
  onClick?: () => void;
  className?: string;
}

const SIZE_STYLES = {
  xs: { pad: "px-1.5 py-0.5 text-[10px]",  icon: "h-3 w-3",   gap: "gap-1" },
  sm: { pad: "px-2.5 py-1 text-[11px]",    icon: "h-3.5 w-3.5", gap: "gap-1.5" },
  md: { pad: "px-3 py-1.5 text-xs",        icon: "h-4 w-4",   gap: "gap-1.5" },
} as const;

/**
 * Unified question-type chip used across student `/practice` and admin
 * exercise/test management. Picks label + icon + color from the central
 * `QUESTION_TYPE_META` map so all surfaces stay in sync.
 */
export default function QuestionTypeBadge({
  type, active = false, size = "sm", showIcon = true, onClick, className,
}: Props) {
  const meta = getQuestionTypeMeta(type);
  const Icon = meta.icon;
  const sz = SIZE_STYLES[size];
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center font-semibold rounded-full border whitespace-nowrap transition-colors",
        sz.pad, sz.gap,
        active ? meta.colors.solid : meta.colors.pill,
        onClick && "cursor-pointer",
        className,
      )}
    >
      {showIcon && <Icon className={cn(sz.icon, "shrink-0")} />}
      <span>{meta.label}</span>
    </Tag>
  );
}
