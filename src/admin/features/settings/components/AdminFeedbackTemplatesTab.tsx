import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Plus, Trash2, Loader2, BookTemplate, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";

interface Template {
  id: string;
  criteria: string;
  band_range: string;
  template_text: string;
  skill: string;
  is_global: boolean;
  created_at: string;
}

const CRITERIA_LABELS: Record<string, string> = {
  task_achievement: "Task Achievement",
  coherence_cohesion: "Coherence & Cohesion",
  lexical_resource: "Lexical Resource",
  grammar_accuracy: "Grammar Accuracy",
  general: "Chung",
};
const BAND_RANGES = ["band_3-4", "band_5", "band_6", "band_7-8"];
const SKILLS = ["writing", "speaking"];

function bandLabel(b: string) {
  return b.replace("band_", "Band ").replace("-", "–");
}

interface AdminFeedbackTemplatesTabProps {
  /** Optional: bubble template count up to parent header */
  onCountChange?: (count: number) => void;
}

export default function AdminFeedbackTemplatesTab({ onCountChange }: AdminFeedbackTemplatesTabProps = {}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSkill, setFilterSkill] = useState("all");
  const [filterCriteria, setFilterCriteria] = useState("all");

  // New template form
  const [showAdd, setShowAdd] = useState(false);
  const [newSkill, setNewSkill] = useState("writing");
  const [newCriteria, setNewCriteria] = useState("task_achievement");
  const [newBand, setNewBand] = useState("band_5");
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    let q = supabase.from("feedback_templates").select("*").eq("is_global", true).order("skill").order("criteria").order("band_range");
    const { data } = await q;
    setTemplates((data || []) as Template[]);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  useEffect(() => {
    onCountChange?.(templates.length);
  }, [templates.length, onCountChange]);

  const handleAdd = async () => {
    if (!newText.trim()) { toast.error("Vui lòng nhập nội dung mẫu"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("feedback_templates").insert({
      skill: newSkill,
      criteria: newCriteria,
      band_range: newBand,
      template_text: newText.trim(),
      is_global: true,
      created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Đã thêm mẫu!"); setNewText(""); setShowAdd(false); fetchTemplates(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa mẫu nhận xét này?")) return;
    const { error } = await supabase.from("feedback_templates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Đã xóa!"); setTemplates(prev => prev.filter(t => t.id !== id)); }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from("feedback_templates").update({ template_text: editText.trim() }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã cập nhật!");
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, template_text: editText.trim() } : t));
      setEditId(null);
    }
  };

  const filtered = templates.filter(t => {
    if (filterSkill !== "all" && t.skill !== filterSkill) return false;
    if (filterCriteria !== "all" && t.criteria !== filterCriteria) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Thêm mẫu
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Select value={newSkill} onValueChange={setNewSkill}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SKILLS.map(s => <SelectItem key={s} value={s}>{s === "writing" ? "Writing" : "Speaking"}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newCriteria} onValueChange={setNewCriteria}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CRITERIA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newBand} onValueChange={setNewBand}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BAND_RANGES.map(b => <SelectItem key={b} value={b}>{bandLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Nội dung mẫu nhận xét..." className="text-xs min-h-[80px]" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Huỷ</Button>
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Lưu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterSkill} onValueChange={setFilterSkill}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Kỹ năng" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="writing">Writing</SelectItem>
            <SelectItem value="speaking">Speaking</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCriteria} onValueChange={setFilterCriteria}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Tiêu chí" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {Object.entries(CRITERIA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Chưa có mẫu nhận xét nào</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <Card key={t.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {t.skill === "writing" ? "Writing" : "Speaking"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">
                        {CRITERIA_LABELS[t.criteria] || t.criteria}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-medium">
                        {bandLabel(t.band_range)}
                      </span>
                    </div>
                    {editId === t.id ? (
                      <div className="space-y-2">
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="text-xs min-h-[60px]" />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-[10px]" onClick={() => handleSaveEdit(t.id)}>
                            <Check className="h-3 w-3 mr-1" /> Lưu
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-foreground/80">{t.template_text}</p>
                    )}
                  </div>
                  {editId !== t.id && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditId(t.id); setEditText(t.template_text); }} className="p-1 rounded hover:bg-muted transition-colors">
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
