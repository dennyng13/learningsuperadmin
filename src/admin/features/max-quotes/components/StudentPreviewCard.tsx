import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Trophy, FileQuestion, Inbox, Sparkles, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import type { MaxQuote, MaxQuoteCategory } from "../types";
import { QUOTE_CATEGORIES } from "../types";

const CATEGORY_ICONS: Record<MaxQuoteCategory, React.ComponentType<{ className?: string }>> = {
  loading:     Loader2,
  motivation:  Sparkles,
  study:       BookOpen,
  exam:        GraduationCap,
  celebration: Trophy,
  empty:       Inbox,
};

/** Mô phỏng cách quote sẽ xuất hiện trên Student Portal. */
export default function StudentPreviewCard({ quotes }: { quotes: MaxQuote[] }) {
  const active = quotes.filter((q) => q.is_active);
  const [tick, setTick] = useState(0);

  // Random một quote mỗi lần tick — weighted theo trường `weight`
  const pick = (cat: MaxQuoteCategory): MaxQuote | null => {
    const pool = active.filter((q) => q.category === cat);
    if (pool.length === 0) return null;
    const total = pool.reduce((s, q) => s + Math.max(1, q.weight), 0);
    let r = Math.random() * total;
    for (const q of pool) {
      r -= Math.max(1, q.weight);
      if (r <= 0) return q;
    }
    return pool[0];
  };

  const [samples, setSamples] = useState<Record<MaxQuoteCategory, MaxQuote | null>>({
    loading: null, motivation: null, study: null, exam: null, celebration: null, empty: null,
  });

  useEffect(() => {
    setSamples({
      loading:     pick("loading"),
      motivation:  pick("motivation"),
      study:       pick("study"),
      exam:        pick("exam"),
      celebration: pick("celebration"),
      empty:       pick("empty"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, quotes.length]);

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
            <FileQuestion className="h-4 w-4 text-primary" />
            Preview — Student Portal sẽ thấy thế này
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Mỗi lần refresh sẽ chọn ngẫu nhiên (weighted) trong các quote đang hoạt động.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Random lại
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {QUOTE_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.key];
          const q = samples[c.key];
          return (
            <div
              key={c.key}
              className="rounded-xl border bg-card p-3 flex items-start gap-2.5 min-h-[72px]"
            >
              <div className="rounded-full bg-primary/10 text-primary p-1.5 mt-0.5 shrink-0">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="text-[9px] mb-1">{c.label}</Badge>
                {q ? (
                  <p className="text-sm leading-snug">"{q.text}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Chưa có quote nào trong nhóm này.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}