import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Badge } from "@shared/components/ui/badge";
import { BookOpen, ChevronDown } from "lucide-react";
import LoadingSpinner from "@shared/components/ui/loading-spinner";
import { cn } from "@shared/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";

const DESCRIPTOR_SKILLS = [
  {
    key: "writing",
    label: "Writing",
    taskTypes: [
      { key: "task1", label: "Task 1" },
      { key: "task2", label: "Task 2" },
    ],
    criteria: [
      { key: "task_achievement", label: "Task Achievement", short: "TA" },
      { key: "coherence_cohesion", label: "Coherence & Cohesion", short: "CC" },
      { key: "lexical_resource", label: "Lexical Resource", short: "LR" },
      { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA" },
    ],
  },
  {
    key: "speaking",
    label: "Speaking",
    taskTypes: [{ key: "general", label: "All Parts" }],
    criteria: [
      { key: "fluency_coherence", label: "Fluency & Coherence", short: "FC" },
      { key: "lexical_resource", label: "Lexical Resource", short: "LR" },
      { key: "grammar_accuracy", label: "Grammatical Range & Accuracy", short: "GRA" },
      { key: "pronunciation", label: "Pronunciation", short: "P" },
    ],
  },
];

const SCORE_SKILLS = ["listening", "reading"] as const;

const ALL_TABS = [
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
  { key: "speaking", label: "Speaking" },
];

const BANDS = [9, 8, 7, 6, 5, 4, 3, 2, 1];

const BAND_COLORS: Record<number, string> = {
  9: "bg-emerald-500", 8: "bg-teal-500", 7: "bg-sky-500",
  6: "bg-blue-500", 5: "bg-amber-500", 4: "bg-orange-500",
  3: "bg-red-400", 2: "bg-red-500", 1: "bg-red-600",
};

const BAND_TEXT_COLORS: Record<number, string> = {
  9: "text-emerald-600", 8: "text-teal-600", 7: "text-sky-600",
  6: "text-blue-600", 5: "text-amber-600", 4: "text-orange-600",
  3: "text-red-400", 2: "text-red-500", 1: "text-red-600",
};

interface ScoreRow {
  band_score: number;
  min_marks: number;
  max_marks: number;
}

export default function BandDescriptorViewer() {
  const [skill, setSkill] = useState("listening");
  const [taskType, setTaskType] = useState("task1");
  const [descriptors, setDescriptors] = useState<Record<string, string>>({});
  const [scoreConversion, setScoreConversion] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBands, setOpenBands] = useState<Record<number, boolean>>({ 9: true, 8: true, 7: true });

  const isScoreSkill = SCORE_SKILLS.includes(skill as any);
  const currentDescriptorSkill = DESCRIPTOR_SKILLS.find(s => s.key === skill);

  // Load score conversion for listening/reading
  const loadScoreConversion = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("score_conversion")
      .select("band_score,min_marks,max_marks")
      .eq("skill", skill)
      .order("band_score", { ascending: false });

    if (data) {
      setScoreConversion(data as ScoreRow[]);
    }
    setLoading(false);
  }, [skill]);

  // Load band descriptors for writing/speaking
  const loadDescriptors = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("band_descriptors" as any)
      .select("criteria,band,description")
      .eq("skill", skill)
      .eq("task_type", taskType) as any;

    if (data) {
      const map: Record<string, string> = {};
      for (const d of data) map[`${d.criteria}:${d.band}`] = d.description;
      setDescriptors(map);
    }
    setLoading(false);
  }, [skill, taskType]);

  useEffect(() => {
    if (isScoreSkill) {
      loadScoreConversion();
    } else {
      loadDescriptors();
    }
  }, [isScoreSkill, loadScoreConversion, loadDescriptors]);

  useEffect(() => {
    const s = DESCRIPTOR_SKILLS.find(s => s.key === skill);
    if (s) setTaskType(s.taskTypes[0].key);
  }, [skill]);

  const toggleBand = (band: number) => {
    setOpenBands(prev => ({ ...prev, [band]: !prev[band] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="font-display text-base font-bold">Band Descriptors & Score Ranges</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Mô tả chi tiết tiêu chí chấm điểm IELTS cho từng band. Tham khảo để hiểu rõ yêu cầu của từng mức điểm.
      </p>

      {/* Skill selector */}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={skill} onValueChange={v => setSkill(v)}>
          <TabsList className="bg-muted/60 rounded-lg h-9">
            {ALL_TABS.map(s => (
              <TabsTrigger key={s.key} value={s.key} className="text-xs font-semibold rounded-md px-3 md:px-4">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {currentDescriptorSkill && currentDescriptorSkill.taskTypes.length > 1 && (
          <Tabs value={taskType} onValueChange={v => setTaskType(v)}>
            <TabsList className="bg-muted/40 rounded-lg h-9">
              {currentDescriptorSkill.taskTypes.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="text-xs font-semibold rounded-md px-3">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {loading ? (
        <LoadingSpinner size="sm" className="py-12" />
      ) : isScoreSkill ? (
        /* Score conversion table for Listening / Reading */
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Bảng quy đổi số câu đúng (trên 40 câu) sang band score cho {skill === "listening" ? "Listening" : "Reading"}.
          </p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground">Band Score</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs text-muted-foreground">Số câu đúng</th>
                </tr>
              </thead>
              <tbody>
                {scoreConversion.map((row, i) => {
                  const band = row.band_score;
                  const colorClass = BAND_COLORS[Math.round(band)] || "bg-muted";
                  const textColor = BAND_TEXT_COLORS[Math.round(band)] || "text-foreground";
                  const rangeText = row.min_marks === row.max_marks
                    ? `${row.min_marks}`
                    : `${row.min_marks} – ${row.max_marks}`;

                  return (
                    <tr key={i} className={cn("border-t", i % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                            colorClass
                          )}>
                            {band % 1 === 0 ? band : band.toFixed(1)}
                          </div>
                          <span className={cn("font-bold text-sm", textColor)}>
                            Band {band % 1 === 0 ? band : band.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-foreground">{rangeText}</span>
                        <span className="text-muted-foreground text-xs ml-1">/ 40</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {scoreConversion.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Chưa có dữ liệu quy đổi điểm cho {skill === "listening" ? "Listening" : "Reading"}.
            </p>
          )}
        </div>
      ) : currentDescriptorSkill ? (
        /* Band descriptors for Writing / Speaking */
        <div className="space-y-3">
          {BANDS.map(band => {
            const hasAny = currentDescriptorSkill.criteria.some(c => descriptors[`${c.key}:${band}`]?.trim());
            if (!hasAny) return null;
            const isOpen = openBands[band] ?? false;

            return (
              <Collapsible key={band} open={isOpen} onOpenChange={() => toggleBand(band)}>
                <CollapsibleTrigger className="w-full">
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer",
                    isOpen ? "bg-primary/5 border-primary/20" : "bg-card hover:bg-muted/30"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0",
                      BAND_COLORS[band]
                    )}>
                      {band}
                    </div>
                    <span className="text-sm font-bold flex-1 text-left">Band {band}</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {currentDescriptorSkill.criteria.map(c => {
                      const desc = descriptors[`${c.key}:${band}`];
                      if (!desc?.trim()) return null;
                      const bullets = desc.split("\n").filter(l => l.trim());

                      return (
                        <div key={c.key} className="bg-card border rounded-lg p-3 space-y-2">
                          <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">
                            {c.short}
                          </Badge>
                          <p className="text-[11px] font-semibold text-muted-foreground">{c.label}</p>
                          <ul className="space-y-1">
                            {bullets.map((b, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80 leading-relaxed">
                                <span className="text-primary mt-0.5 shrink-0">•</span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
