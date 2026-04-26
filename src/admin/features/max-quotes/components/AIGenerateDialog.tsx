import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { toast } from "@shared/components/ui/sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  QUOTE_CATEGORIES, QUOTE_LANGUAGES,
  type MaxQuoteCategory, type MaxQuoteLanguage,
} from "../types";
import { useBulkImportQuotes } from "../hooks/useMaxQuotes";

interface Props { open: boolean; onClose: () => void }

export default function AIGenerateDialog({ open, onClose }: Props) {
  const [category, setCategory] = useState<MaxQuoteCategory>("motivation");
  const [language, setLanguage] = useState<MaxQuoteLanguage>("vi");
  const [count, setCount] = useState(8);
  const [vibe, setVibe] = useState("");
  const [generated, setGenerated] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);

  const importMut = useBulkImportQuotes();

  const generate = async () => {
    setGenerating(true);
    setGenerated([]);
    setPicked(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("generate-max-quotes", {
        body: { category, language, count, vibe },
      });
      if (error) throw error;
      const quotes: string[] = (data as any)?.quotes ?? [];
      if (quotes.length === 0) throw new Error("AI không sinh được quote nào — thử lại nhé.");
      setGenerated(quotes);
      setPicked(new Set(quotes.map((_, i) => i))); // chọn tất cả mặc định
    } catch (e: any) {
      toast.error(e.message ?? "Generate thất bại");
    } finally {
      setGenerating(false);
    }
  };

  const importPicked = async () => {
    const lines = generated.filter((_, i) => picked.has(i));
    if (lines.length === 0) {
      toast.error("Chọn ít nhất 1 quote");
      return;
    }
    try {
      const { inserted } = await importMut.mutateAsync({ lines, category, language, author: "Max" });
      toast.success(`Đã thêm ${inserted} quote vào thư viện`);
      onClose();
      setGenerated([]);
    } catch (e: any) {
      toast.error(e.message ?? "Import thất bại");
    }
  };

  const toggle = (i: number) =>
    setPicked((p) => {
      const next = new Set(p);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Generate quotes bằng AI
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as MaxQuoteCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUOTE_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ngôn ngữ</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as MaxQuoteLanguage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUOTE_LANGUAGES.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Số lượng (1–20)</Label>
              <Input
                type="number" min={1} max={20} value={count}
                onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Vibe / yêu cầu thêm (tuỳ chọn)</Label>
            <Input
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="VD: dí dỏm, chèn câu nói nổi tiếng, dùng emoji ẩn dụ…"
            />
          </div>
          <Button onClick={generate} disabled={generating} className="w-full gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Max đang nghĩ…" : "Generate"}
          </Button>

          {generated.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                Tick những câu bạn muốn lưu ({picked.size}/{generated.length}):
              </p>
              {generated.map((q, i) => (
                <label key={i} className="flex items-start gap-2 p-2 rounded hover:bg-muted/40 cursor-pointer">
                  <Checkbox checked={picked.has(i)} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                  <span className="text-sm leading-relaxed">{q}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importMut.isPending}>Đóng</Button>
          <Button
            onClick={importPicked}
            disabled={generated.length === 0 || picked.size === 0 || importMut.isPending}
          >
            {importMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Lưu {picked.size > 0 && `${picked.size} quote`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}