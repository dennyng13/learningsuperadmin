import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Quote, Plus, Search, Loader2, Pencil, Trash2, Upload, Sparkles, ArrowLeft,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Switch } from "@shared/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@shared/components/ui/alert-dialog";
import { toast } from "@shared/components/ui/sonner";
import EmptyState from "@shared/components/EmptyState";
import {
  useMaxQuotes, useDeleteQuote, useToggleQuote,
} from "../hooks/useMaxQuotes";
import {
  QUOTE_CATEGORIES, QUOTE_LANGUAGES,
  type MaxQuote, type MaxQuoteCategory, type MaxQuoteLanguage,
} from "../types";
import QuoteEditorDialog from "../components/QuoteEditorDialog";
import BulkImportDialog from "../components/BulkImportDialog";
import AIGenerateDialog from "../components/AIGenerateDialog";
import StudentPreviewCard from "../components/StudentPreviewCard";

export default function MaxQuotesPage() {
  const { data: quotes = [], isLoading, error } = useMaxQuotes();
  const deleteMut = useDeleteQuote();
  const toggleMut = useToggleQuote();

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<MaxQuoteCategory | "all">("all");
  const [langFilter, setLangFilter] = useState<MaxQuoteLanguage | "all">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "hidden">("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MaxQuote | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((row) => {
      if (q && !row.text.toLowerCase().includes(q) && !(row.author ?? "").toLowerCase().includes(q)) return false;
      if (catFilter !== "all" && row.category !== catFilter) return false;
      if (langFilter !== "all" && row.language !== langFilter) return false;
      if (activeFilter === "active" && !row.is_active) return false;
      if (activeFilter === "hidden" && row.is_active) return false;
      return true;
    });
  }, [quotes, search, catFilter, langFilter, activeFilter]);

  const counts = useMemo(() => {
    const map: Record<MaxQuoteCategory, number> = {
      motivation: 0, study: 0, exam: 0, celebration: 0, empty: 0, loading: 0,
    };
    quotes.filter((q) => q.is_active).forEach((q) => { map[q.category] += 1; });
    return map;
  }, [quotes]);

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (q: MaxQuote) => { setEditing(q); setEditorOpen(true); };

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Đã xoá quote");
    } catch (e: any) { toast.error(e.message ?? "Xoá thất bại"); }
  };

  const handleToggle = async (q: MaxQuote) => {
    try {
      await toggleMut.mutateAsync({ id: q.id, is_active: !q.is_active });
    } catch (e: any) { toast.error(e.message ?? "Có lỗi"); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-2">
          <Link to="/brand-assets"><ArrowLeft className="h-3.5 w-3.5" /> Brand Assets</Link>
        </Button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Quote className="h-6 w-6 text-primary" />
              Max Quotes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Câu truyền động lực mascot Max sẽ hiển thị trong Student Portal
              (loading screens, dashboard hero, sau khi hoàn thành bài, empty states).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" /> Bulk import
            </Button>
            <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Generate bằng AI
            </Button>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Thêm quote
            </Button>
          </div>
        </div>
      </div>

      {/* Category counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {QUOTE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCatFilter(catFilter === c.key ? "all" : c.key)}
            className={`rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 ${
              catFilter === c.key ? "border-primary bg-primary/5" : ""
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="font-display text-xl font-bold">{counts[c.key]}</p>
            <p className="text-[10px] text-muted-foreground">đang hoạt động</p>
          </button>
        ))}
      </div>

      {/* Live preview */}
      {!isLoading && !error && quotes.length > 0 && <StudentPreviewCard quotes={quotes} />}

      {/* Filters */}
      <div className="rounded-2xl bg-card p-3 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo nội dung hoặc tác giả…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v as any)}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả category</SelectItem>
            {QUOTE_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={langFilter} onValueChange={(v) => setLangFilter(v as any)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi ngôn ngữ</SelectItem>
            {QUOTE_LANGUAGES.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="hidden">Đã ẩn</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-[10px]">
          {filtered.length} / {quotes.length}
        </Badge>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được quotes: {(error as Error).message}
          <p className="mt-2 text-xs text-muted-foreground">
            Bảng <code>max_quotes</code> có thể chưa được tạo trên DB. Chạy migration trong SQL Editor.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Quote}
          title="Chưa có quote nào"
          description="Thêm quote thủ công, paste hàng loạt, hoặc generate bằng AI để Max có gì nói với học viên."
          action={
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Thêm quote đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44%]">Nội dung</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Lang</TableHead>
                <TableHead className="text-center">Weight</TableHead>
                <TableHead className="text-center">Hoạt động</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow key={q.id} className={!q.is_active ? "opacity-60" : ""}>
                  <TableCell>
                    <p className="text-sm leading-snug">"{q.text}"</p>
                    {q.author && <p className="text-[11px] text-muted-foreground mt-0.5">— {q.author}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {QUOTE_CATEGORIES.find((c) => c.key === q.category)?.label ?? q.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] uppercase">{q.language}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums">{q.weight}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={q.is_active} onCheckedChange={() => handleToggle(q)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xoá quote này?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Hành động không thể hoàn tác. Học viên sẽ không còn thấy câu này nữa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Huỷ</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(q.id)}>Xoá</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <QuoteEditorDialog open={editorOpen} onClose={() => setEditorOpen(false)} quote={editing} />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
      <AIGenerateDialog open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}