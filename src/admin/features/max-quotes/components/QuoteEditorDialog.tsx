import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { toast } from "@shared/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { type MaxQuote, QUOTE_CATEGORIES, QUOTE_LANGUAGES, type MaxQuoteCategory, type MaxQuoteLanguage } from "../types";
import { useCreateQuote, useUpdateQuote } from "../hooks/useMaxQuotes";

interface Props {
  open: boolean;
  onClose: () => void;
  quote?: MaxQuote | null;
}

export default function QuoteEditorDialog({ open, onClose, quote }: Props) {
  const isEdit = !!quote;
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("Max");
  const [category, setCategory] = useState<MaxQuoteCategory>("motivation");
  const [language, setLanguage] = useState<MaxQuoteLanguage>("vi");
  const [isActive, setIsActive] = useState(true);
  const [weight, setWeight] = useState(1);

  const createMut = useCreateQuote();
  const updateMut = useUpdateQuote();
  const busy = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      setText(quote?.text ?? "");
      setAuthor(quote?.author ?? "Max");
      setCategory(quote?.category ?? "motivation");
      setLanguage(quote?.language ?? "vi");
      setIsActive(quote?.is_active ?? true);
      setWeight(quote?.weight ?? 1);
    }
  }, [open, quote]);

  const submit = async () => {
    if (!text.trim()) {
      toast.error("Quote không được để trống");
      return;
    }
    try {
      if (isEdit && quote) {
        await updateMut.mutateAsync({
          id: quote.id,
          patch: { text, author, category, language, is_active: isActive, weight },
        });
        toast.success("Đã cập nhật quote");
      } else {
        await createMut.mutateAsync({ text, author, category, language, is_active: isActive, weight });
        toast.success("Đã thêm quote mới");
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Có lỗi xảy ra");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa quote" : "Thêm quote mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="text">Nội dung *</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="VD: Cố lên, Max tin bạn làm được!"
              rows={3}
              maxLength={300}
            />
            <p className="text-[10px] text-muted-foreground text-right">{text.length}/300</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="author">Tác giả</Label>
              <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Max" />
            </div>
            <div className="space-y-1.5">
              <Label>Ngôn ngữ</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as MaxQuoteLanguage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUOTE_LANGUAGES.map((l) => (
                    <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as MaxQuoteCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUOTE_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {QUOTE_CATEGORIES.find((c) => c.key === category)?.hint}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">Độ ưu tiên (1–10)</Label>
              <Input
                id="weight"
                type="number"
                min={1}
                max={10}
                value={weight}
                onChange={(e) => setWeight(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              />
              <p className="text-[10px] text-muted-foreground">Cao = xuất hiện thường xuyên hơn.</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="active">Đang hoạt động</Label>
              <p className="text-[11px] text-muted-foreground">Tắt để tạm ẩn khỏi student portal.</p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {isEdit ? "Lưu thay đổi" : "Thêm quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}