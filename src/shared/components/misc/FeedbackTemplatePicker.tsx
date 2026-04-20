import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { BookTemplate, Loader2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";

interface Template {
  id: string;
  criteria: string;
  band_range: string;
  template_text: string;
  skill: string;
  is_global: boolean;
}

interface FeedbackTemplatePickerProps {
  skill: "writing" | "speaking";
  /** For writing: current criteria key (e.g. 'task_achievement'). For speaking: 'general' */
  criteria?: string;
  /** Current band score to filter templates */
  bandScore?: string;
  /** Called when user picks a template */
  onSelect: (text: string) => void;
}

const BAND_RANGES = ["band_3-4", "band_5", "band_6", "band_7-8"];

function bandLabel(b: string) {
  return b.replace("band_", "Band ").replace("-", "–");
}

const CRITERIA_LABELS: Record<string, string> = {
  task_achievement: "Task Achievement",
  coherence_cohesion: "Coherence & Cohesion",
  lexical_resource: "Lexical Resource",
  grammar_accuracy: "Grammar Accuracy",
  general: "Chung",
};

export default function FeedbackTemplatePicker({ skill, criteria, bandScore, onSelect }: FeedbackTemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState(criteria || "");
  const [selectedBand, setSelectedBand] = useState(bandScore || "");

  useEffect(() => {
    if (criteria) setSelectedCriteria(criteria);
  }, [criteria]);

  useEffect(() => {
    if (bandScore) {
      const n = Number(bandScore);
      if (n <= 4) setSelectedBand("band_3-4");
      else if (n <= 5) setSelectedBand("band_5");
      else if (n <= 6) setSelectedBand("band_6");
      else setSelectedBand("band_7-8");
    }
  }, [bandScore]);

  const fetchTemplates = async () => {
    setLoading(true);
    let query = supabase
      .from("feedback_templates")
      .select("*")
      .eq("skill", skill);

    if (selectedCriteria) query = query.eq("criteria", selectedCriteria);
    if (selectedBand) query = query.eq("band_range", selectedBand);

    const { data } = await query.order("criteria").order("band_range");
    setTemplates((data || []) as Template[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open, selectedCriteria, selectedBand, skill]);

  const criteriaOptions = skill === "writing"
    ? ["task_achievement", "coherence_cohesion", "lexical_resource", "grammar_accuracy"]
    : ["general"];

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <BookTemplate className="h-3.5 w-3.5" />
        Mẫu nhận xét
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex gap-2">
            <Select value={selectedCriteria} onValueChange={setSelectedCriteria}>
              <SelectTrigger className="h-7 text-xs rounded-lg flex-1">
                <SelectValue placeholder="Tiêu chí" />
              </SelectTrigger>
              <SelectContent>
                {criteriaOptions.map(c => (
                  <SelectItem key={c} value={c}>{CRITERIA_LABELS[c] || c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedBand} onValueChange={setSelectedBand}>
              <SelectTrigger className="h-7 text-xs rounded-lg w-28">
                <SelectValue placeholder="Band" />
              </SelectTrigger>
              <SelectContent>
                {BAND_RANGES.map(b => (
                  <SelectItem key={b} value={b}>{bandLabel(b)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">Không có mẫu phù hợp</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onSelect(t.template_text); setOpen(false); }}
                  className="w-full text-left text-xs p-2 rounded-lg bg-background hover:bg-primary/5 border transition-colors line-clamp-3"
                >
                  <span className="text-muted-foreground font-medium">
                    [{CRITERIA_LABELS[t.criteria] || t.criteria} · {bandLabel(t.band_range)}]
                  </span>{" "}
                  {t.template_text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Save custom template button ── */
export function SaveTemplateButton({ skill, comment }: { skill: "writing" | "speaking"; comment: string }) {
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [criteria, setCriteria] = useState("general");
  const [bandRange, setBandRange] = useState("band_5");

  const handleSave = async () => {
    if (!comment.trim()) { toast.error("Chưa có nội dung nhận xét"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("feedback_templates").insert({
      skill,
      criteria,
      band_range: bandRange,
      template_text: comment.trim(),
      is_global: false,
      created_by: user.id,
    });

    if (error) toast.error(error.message);
    else { toast.success("Đã lưu mẫu nhận xét!"); setShowForm(false); }
    setSaving(false);
  };

  const criteriaOptions = skill === "writing"
    ? ["task_achievement", "coherence_cohesion", "lexical_resource", "grammar_accuracy", "general"]
    : ["general"];

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
      >
        <Save className="h-3 w-3" /> Lưu làm mẫu
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={criteria} onValueChange={setCriteria}>
        <SelectTrigger className="h-6 text-[10px] rounded w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {criteriaOptions.map(c => (
            <SelectItem key={c} value={c}>{CRITERIA_LABELS[c] || c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={bandRange} onValueChange={setBandRange}>
        <SelectTrigger className="h-6 text-[10px] rounded w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BAND_RANGES.map(b => (
            <SelectItem key={b} value={b}>{bandLabel(b)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
      </Button>
      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setShowForm(false)}>Huỷ</Button>
    </div>
  );
}
