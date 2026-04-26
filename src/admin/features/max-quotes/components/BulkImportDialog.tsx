import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { toast } from "@shared/components/ui/sonner";
import { Loader2, Upload } from "lucide-react";
import {
  QUOTE_CATEGORIES, QUOTE_LANGUAGES,
  type MaxQuoteCategory, type MaxQuoteLanguage,
} from "../types";
import { useBulkImportQuotes } from "../hooks/useMaxQuotes";

interface Props { open: boolean; onClose: () => void }

export default function BulkImportDialog({ open, onClose }: Props) {
  const [raw, setRaw] = useState("");
  const [category, setCategory] = useState<MaxQuoteCategory>("motivation");
  const [language, setLanguage] = useState<MaxQuoteLanguage>("vi");
  const [author, setAuthor] = useState("Max");

  const mut = useBulkImportQuotes();
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  const submit = async () => {
    if (lines.length === 0) {
      toast.error("Paste ít nhất 1 dòng");
      return;
    }
    try {
      const { inserted } = await mut.mutateAsync({ lines, category, language, author });
      toast.success(`Đã import ${inserted} quote`);
      setRaw("");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Import thất bại");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Bulk import quotes
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
              <Label>Tác giả</Label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mỗi dòng = 1 quote</Label>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              placeholder={"Bạn làm được mà!\nMỗi ngày một bước, band cao không xa!\n…"}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              {lines.length} dòng hợp lệ — dòng trắng sẽ bị bỏ qua.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Huỷ</Button>
          <Button onClick={submit} disabled={mut.isPending || lines.length === 0}>
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Import {lines.length > 0 && `(${lines.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}