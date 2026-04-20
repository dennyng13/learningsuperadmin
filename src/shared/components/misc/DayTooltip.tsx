import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { BookOpen, Headphones, PenLine, Mic, Clock } from "lucide-react";

export interface DaySkillData {
  total: number;
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
}

const SKILL_CFG = [
  { key: "reading", label: "Reading", icon: BookOpen, color: "text-blue-500" },
  { key: "listening", label: "Listening", icon: Headphones, color: "text-emerald-500" },
  { key: "writing", label: "Writing", icon: PenLine, color: "text-amber-500" },
  { key: "speaking", label: "Speaking", icon: Mic, color: "text-rose-500" },
] as const;

export function DayTooltip({ data, children }: { data: DaySkillData; children: React.ReactNode }) {
  const skills = SKILL_CFG.filter(s => data[s.key] > 0);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="p-2.5 max-w-[180px]">
          <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-bold">{data.total} phút</span>
          </div>
          {skills.length > 0 ? (
            <div className="space-y-1">
              {skills.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center gap-1.5 text-[11px]">
                    <Icon className={`h-3 w-3 ${s.color}`} />
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="ml-auto font-semibold">{data[s.key]}′</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">Đã đăng nhập</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
