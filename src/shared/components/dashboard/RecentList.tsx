import SoftCard from "./SoftCard";
import { cn } from "@shared/lib/utils";

export interface RecentListItem {
  id: string;
  name: string;
  meta: string;
  badge?: { label: string; tone: "teal" | "coral" | "muted" };
}

interface RecentListProps {
  eyebrow?: string;
  title?: string;
  items: RecentListItem[];
  emptyLabel?: string;
  onItemClick?: (item: RecentListItem) => void;
  className?: string;
}

const AVATAR_GRADIENTS = [
  "from-primary/80 to-primary",
  "from-accent/80 to-accent",
  "from-primary/60 to-primary/90",
  "from-accent/60 to-accent/90",
];

const TONE: Record<NonNullable<RecentListItem["badge"]>["tone"], string> = {
  teal: "bg-primary/10 text-primary",
  coral: "bg-accent/10 text-accent",
  muted: "bg-muted text-muted-foreground",
};

/**
 * Generic "recent activity" / "top performers" list with circular avatar,
 * name, meta text and an optional status badge.
 */
export default function RecentList({
  eyebrow = "Hoạt động gần đây",
  title = "Nội dung mới",
  items,
  emptyLabel = "Chưa có dữ liệu",
  onItemClick,
  className,
}: RecentListProps) {
  return (
    <SoftCard eyebrow={eyebrow} title={title} className={className}>
      <ul className="space-y-3">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground py-6 text-center">{emptyLabel}</li>
        )}
        {items.map((item, i) => {
          const Comp: any = onItemClick ? "button" : "div";
          return (
            <li key={item.id}>
              <Comp
                type={onItemClick ? "button" : undefined}
                onClick={onItemClick ? () => onItemClick(item) : undefined}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-xl text-left",
                  onItemClick && "hover:bg-secondary/40 transition-colors",
                )}
              >
                <div className={cn(
                  "h-9 w-9 rounded-full bg-gradient-to-br text-white font-display font-bold text-xs flex items-center justify-center shadow-sm shrink-0",
                  AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
                )}>
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.meta}</p>
                </div>
                {item.badge && (
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                    TONE[item.badge.tone],
                  )}>
                    {item.badge.label}
                  </span>
                )}
              </Comp>
            </li>
          );
        })}
      </ul>
    </SoftCard>
  );
}