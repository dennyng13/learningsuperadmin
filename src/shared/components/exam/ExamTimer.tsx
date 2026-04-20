import { Clock } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface ExamTimerProps {
  formattedTime: string;
  isWarning: boolean;
  isCritical: boolean;
}

export function ExamTimer({ formattedTime, isWarning, isCritical }: ExamTimerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-md font-display text-sm md:text-lg font-semibold tracking-wider transition-colors",
        isCritical && "bg-destructive text-destructive-foreground animate-pulse-soft",
        isWarning && !isCritical && "bg-warning text-warning-foreground",
        !isWarning && !isCritical && "bg-primary/10 text-primary"
      )}
    >
      <Clock className="h-3.5 w-3.5 md:h-5 md:w-5" />
      <span>{formattedTime}</span>
    </div>
  );
}
