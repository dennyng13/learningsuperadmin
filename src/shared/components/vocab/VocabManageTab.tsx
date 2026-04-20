import { useState, useMemo, useEffect } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@shared/components/ui/dropdown-menu";
import { cn } from "@shared/lib/utils";
import {
  Plus, Trash2, Import, ChevronDown, Loader2, Layers, Clock,
  Star, StickyNote, Highlighter, Library, Download, Upload, FileText, PenLine,
  Search, Volume2, X, CheckCircle2,
} from "lucide-react";
import type { Flashcard } from "@shared/hooks/useFlashcards";
import { isDue } from "@shared/hooks/useFlashcards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SavedQuestion } from "@shared/components/exam/SavedQuestions";
import { RichTextEditor, AudioInput, AudioPlayButton } from "./VocabEditors";

function loadSavedItems(): SavedQuestion[] {
  try {
    const raw = JSON.parse(localStorage.getItem("savedQuestions") || "[]");
    return raw.filter((i: any) => i.type === "text" || i.type === "highlight" || i.type === "note");
  } catch { return []; }
}

type ManageSubTab = "add" | "saved" | "my-cards";

interface ManageTabProps {
  cards: Flashcard[];
  addCard: (front: string, back: string, extra?: { exampleSentence?: string; audioUrl?: string }) => Promise<Flashcard | null>;
  addMany: (items: { front: string; back: string }[]) => Promise<void>;
  updateCard: (id: string, fields: Partial<Pick<Flashcard, "front" | "back" | "exampleSentence" | "audioUrl">>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
}

export default function VocabManageTab({ cards, addCard, addMany, updateCard, removeCard }: ManageTabProps) {
  const [subTab, setSubTab] = useState<ManageSubTab>("my-cards");

  const subTabs: { key: ManageSubTab; label: string; icon: any; count?: number }[] = [
    { key: "my-cards", label: "Thẻ của tôi", icon: Layers, count: cards.length },
    { key: "add", label: "Tự thêm thẻ", icon: Plus },
    { key: "saved", label: "Import từ đã lưu", icon: Import },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl overflow-x-auto">
        {subTabs.map(st => (
          <button
            key={st.key}
            onClick={() => setSubTab(st.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              subTab === st.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <st.icon className="h-3.5 w-3.5" />
            {st.label}
            {st.count !== undefined && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", subTab === st.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {st.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {subTab === "add" && <ManageAddSection cards={cards} addCard={addCard} addMany={addMany} />}
      {subTab === "saved" && <ManageSavedSection cards={cards} addMany={addMany} />}
      {subTab === "my-cards" && <ManageMyCardsSection cards={cards} updateCard={updateCard} removeCard={removeCard} />}
    </div>
  );
}

function ManageAddSection({ cards, addCard, addMany }: {
  cards: Flashcard[];
  addCard: (front: string, back: string, extra?: { exampleSentence?: string; audioUrl?: string }) => Promise<Flashcard | null>;
  addMany: (items: { front: string; back: string }[]) => Promise<void>;
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!front.trim() || !back.trim()) return;
    setAdding(true);
    await addCard(front.trim(), back.trim(), { exampleSentence: exampleSentence.trim() || undefined, audioUrl: audioUrl.trim() || undefined });
    setFront(""); setBack(""); setExampleSentence(""); setAudioUrl(""); setShowAdvanced(false);
    setAdding(false);
  };

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4">
      <h3 className="font-display font-bold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Thêm flashcard mới</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Mặt trước (từ vựng)</label>
          <Input value={front} onChange={e => setFront(e.target.value)} placeholder="e.g. ubiquitous" onKeyDown={e => e.key === "Enter" && !showAdvanced && handleAdd()} />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Mặt sau (nghĩa / giải thích)</label>
          <Input value={back} onChange={e => setBack(e.target.value)} placeholder="e.g. có mặt ở khắp nơi" onKeyDown={e => e.key === "Enter" && !showAdvanced && handleAdd()} />
        </div>
      </div>
      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
        <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-180")} />
        {showAdvanced ? "Ẩn" : "Thêm"} câu ví dụ & audio
      </button>
      {showAdvanced && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Câu ví dụ (hỗ trợ <b>Bold</b>, <i>Italic</i>, <u>Underline</u>)</label>
            <RichTextEditor value={exampleSentence} onChange={setExampleSentence} placeholder="e.g. Technology has become ubiquitous in modern life." />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1"><Volume2 className="h-3 w-3" /> Audio phát âm (tùy chọn)</label>
            <AudioInput value={audioUrl} onChange={setAudioUrl} cardFront={front} />
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={handleAdd} disabled={!front.trim() || !back.trim() || adding}>
          {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Thêm
        </Button>
        <span className="text-muted-foreground text-xs">hoặc</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-1" /> Import file</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem asChild>
              <label className="cursor-pointer w-full">
                <Upload className="h-4 w-4 mr-2" /> Import file (.csv, .xlsx)
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const items: { front: string; back: string }[] = [];
                  if (file.name.endsWith(".csv")) {
                    const text = await file.text();
                    const lines = text.split(/\r?\n/).filter(l => l.trim());
                    if (lines.length < 2) { toast.error("File trống hoặc không đúng định dạng"); e.target.value = ""; return; }
                    for (let i = 1; i < lines.length; i++) {
                      const match = lines[i].match(/^"?([^"]*)"?\s*,\s*"?([^"]*)"?$/);
                      if (match) { const f = match[1].trim(); const b = match[2].trim(); if (f && b) items.push({ front: f, back: b }); }
                    }
                  } else {
                    try {
                      const XLSX = await import("xlsx");
                      const buffer = await file.arrayBuffer();
                      const wb = XLSX.read(buffer);
                      const ws = wb.Sheets[wb.SheetNames[0]];
                      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
                      if (rows.length < 2) { toast.error("File trống hoặc không đúng định dạng"); e.target.value = ""; return; }
                      for (let i = 1; i < rows.length; i++) { const f = String(rows[i]?.[0] || "").trim(); const b = String(rows[i]?.[1] || "").trim(); if (f && b) items.push({ front: f, back: b }); }
                    } catch { toast.error("Không thể đọc file"); e.target.value = ""; return; }
                  }
                  if (items.length === 0) toast.info("Không có từ mới để import");
                  else { const dupeCount = items.filter(i => cards.some(c => c.front === i.front)).length; await addMany(items); if (dupeCount > 0) toast(`${dupeCount} từ trùng đã được import lại`, { duration: 5000 }); }
                  e.target.value = "";
                }} />
              </label>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const bom = "\uFEFF"; const csv = bom + "front,back\nubiquitous,có mặt ở khắp nơi\nbenevolent,nhân từ\npragmatic,thực dụng\n";
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "flashcard_template.csv"; a.click(); URL.revokeObjectURL(url);
            }}><Download className="h-4 w-4 mr-2" /> Tải mẫu CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              const XLSX = await import("xlsx"); const wb = XLSX.utils.book_new();
              const ws = XLSX.utils.aoa_to_sheet([["front", "back"], ["ubiquitous", "có mặt ở khắp nơi"], ["benevolent", "nhân từ"], ["pragmatic", "thực dụng"]]);
              ws["!cols"] = [{ wch: 25 }, { wch: 35 }]; XLSX.utils.book_append_sheet(wb, ws, "Flashcards"); XLSX.writeFile(wb, "flashcard_template.xlsx");
            }}><Download className="h-4 w-4 mr-2" /> Tải mẫu Excel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ManageSavedSection({ cards, addMany }: { cards: Flashcard[]; addMany: (items: { front: string; back: string }[]) => Promise<void>; }) {
  const savedItems = useMemo(() => loadSavedItems(), []);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [translating, setTranslating] = useState(false);

  const toggleImport = (id: string) => { setSelectedImports(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }); };

  const importSelected = async () => {
    const selected = savedItems.filter(i => selectedImports.has(i.id)); if (selected.length === 0) return;
    const needTranslation = selected.filter(i => !i.annotation);
    const withAnnotation = selected.filter(i => !!i.annotation);
    let translationMap: Record<string, string> = {};
    if (needTranslation.length > 0) {
      setTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke("translate-vocab", { body: { words: needTranslation.map(i => i.questionText) } });
        if (error) throw error;
        if (data?.translations) { for (const t of data.translations) { translationMap[t.word] = t.meaning; } }
      } catch (e) { console.error("Auto-translate error:", e); toast.error("Không thể tự động dịch. Import với nghĩa trống."); } finally { setTranslating(false); }
    }
    const items = selected.map(item => ({ front: item.questionText, back: item.annotation || translationMap[item.questionText] || "(chưa có nghĩa – hãy chỉnh sửa)", sourceType: "saved" }));
    await addMany(items); setSelectedImports(new Set());
  };

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-4">
      <h3 className="font-display font-bold flex items-center gap-2"><Import className="h-4 w-4 text-accent" /> Import từ mục đã lưu</h3>
      <p className="text-sm text-muted-foreground">Chọn văn bản, highlight hoặc ghi chú đã lưu từ bài thi/bài tập để thêm vào flashcard</p>
      {savedItems.length === 0 ? (
        <div className="text-center py-6 space-y-3 border border-dashed rounded-xl bg-muted/20">
          <StickyNote className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Chưa có mục nào được lưu</p>
          <div className="text-xs text-muted-foreground/80 space-y-1 max-w-sm mx-auto">
            <p className="font-bold">Hướng dẫn lưu từ vựng:</p>
            <p>1. Mở bài thi thử hoặc bài luyện tập có đoạn văn</p>
            <p>2. <Highlighter className="h-3 w-3 inline text-yellow-600" /> <strong>Bôi đen</strong> từ/cụm từ → chọn "Highlight" hoặc "Lưu ghi chú"</p>
            <p>3. Quay lại đây để import vào flashcard</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {savedItems.map(item => {
              const alreadyImported = cards.some(c => c.front === item.questionText);
              return (
                <label key={item.id} className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all", alreadyImported && "opacity-50 cursor-not-allowed", selectedImports.has(item.id) && "border-primary bg-primary/5", !selectedImports.has(item.id) && !alreadyImported && "hover:border-primary/40")}>
                  <input type="checkbox" checked={selectedImports.has(item.id)} onChange={() => !alreadyImported && toggleImport(item.id)} disabled={alreadyImported} className="mt-1 accent-[hsl(var(--primary))]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.type === "highlight" ? <Highlighter className="h-3.5 w-3.5 text-yellow-600" /> : item.type === "note" ? <StickyNote className="h-3.5 w-3.5 text-emerald-600" /> : <FileText className="h-3.5 w-3.5 text-sky-600" />}
                      <span className="text-xs font-bold text-muted-foreground">{item.type === "highlight" ? "Highlight" : item.type === "note" ? "Ghi chú" : "Văn bản đã lưu"}</span>
                      {item.assessmentName && <span className="text-[10px] text-muted-foreground">· {item.assessmentName}</span>}
                      {alreadyImported && <span className="text-[10px] text-primary font-bold">Đã import</span>}
                    </div>
                    <p className="text-sm mt-0.5 line-clamp-2">{item.questionText}</p>
                    {item.annotation && <p className="text-xs text-muted-foreground mt-0.5 italic flex items-center gap-1"><FileText className="h-3 w-3" /> {item.annotation}</p>}
                  </div>
                </label>
              );
            })}
          </div>
          {selectedImports.size > 0 && (
            <Button size="sm" onClick={importSelected} disabled={translating}>
              {translating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Import className="h-4 w-4 mr-1" />}
              {translating ? "Đang dịch..." : `Import ${selectedImports.size} mục`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function ManageMyCardsSection({ cards, updateCard, removeCard }: {
  cards: Flashcard[];
  updateCard: (id: string, fields: Partial<Pick<Flashcard, "front" | "back" | "exampleSentence" | "audioUrl">>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "mastered" | "learning" | "due">("all");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["manual"]));
  const [setNames, setSetNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const setIds = [...new Set(cards.filter(c => c.sourceSetId).map(c => c.sourceSetId!))];
    if (setIds.length === 0) return;
    (async () => {
      const { data } = await supabase.from("flashcard_sets").select("id, title").in("id", setIds);
      if (data) { const map: Record<string, string> = {}; data.forEach(s => { map[s.id] = s.title; }); setSetNames(map); }
    })();
  }, [cards]);

  const formatNextReview = (card: Flashcard) => {
    const d = new Date(card.nextReview); const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Cần ôn ngay"; if (diffDays === 1) return "Ôn ngày mai"; return `Ôn sau ${diffDays} ngày`;
  };

  const toggleGroup = (key: string) => { setExpandedGroups(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; }); };

  const q = searchQuery.toLowerCase().trim();
  const filtered = cards.filter(card => {
    if (q && !card.front.toLowerCase().includes(q) && !card.back.toLowerCase().includes(q)) return false;
    if (filterStatus === "mastered") return card.mastered;
    if (filterStatus === "learning") return !card.mastered;
    if (filterStatus === "due") return isDue(card);
    return true;
  });

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; icon: string; cards: Flashcard[] }>();
    filtered.forEach(card => {
      let groupKey: string, label: string, icon: string;
      if (card.sourceType === "set" && card.sourceSetId) { groupKey = `set-${card.sourceSetId}`; label = setNames[card.sourceSetId] || "Bộ thẻ đã import"; icon = "library"; }
      else if (card.sourceType === "saved") { groupKey = "saved"; label = "Import từ mục đã lưu"; icon = "bookmark"; }
      else { groupKey = "manual"; label = "Tự thêm"; icon = "plus"; }
      const group = map.get(groupKey) || { label, icon, cards: [] }; group.cards.push(card); map.set(groupKey, group);
    });
    return Array.from(map.entries()).sort(([a], [b]) => { const order = (k: string) => k === "manual" ? 0 : k === "saved" ? 1 : 2; return order(a) - order(b); });
  }, [filtered, setNames]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Layers className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">Chưa có flashcard nào</p>
        <p className="text-xs text-muted-foreground">Thêm thẻ mới hoặc import từ Kho thẻ để bắt đầu</p>
      </div>
    );
  }

  const getGroupIcon = (icon: string) => { switch (icon) { case "library": return Library; case "bookmark": return Import; default: return Plus; } };

  const renderCard = (card: Flashcard) => (
    <div key={card.id} className="bg-muted/30 border rounded-xl group hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 p-3">
        <Star className={cn("h-4 w-4 shrink-0", card.mastered ? "text-primary fill-primary" : "text-muted-foreground/30")} />
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-2">
            <input className="text-sm font-medium bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none truncate w-full" defaultValue={card.front} placeholder="(nhập từ)" onBlur={(e) => { const val = e.target.value.trim(); if (val && val !== card.front) updateCard(card.id, { front: val }); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
            <input className="text-sm text-muted-foreground bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none truncate w-full" defaultValue={card.back} placeholder="(nhập nghĩa)" onBlur={(e) => { const val = e.target.value.trim(); if (val && val !== card.back) updateCard(card.id, { back: val }); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatNextReview(card)} · Lặp {card.repetitions}x</p>
            {card.exampleSentence && <span className="text-[10px] text-accent font-bold"> Ví dụ</span>}
            <AudioPlayButton url={card.audioUrl} text={card.front} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditingCardId(editingCardId === card.id ? null : card.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all" title="Chỉnh sửa chi tiết"><PenLine className="h-4 w-4" /></button>
          <button onClick={() => removeCard(card.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {editingCardId === card.id && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t animate-fade-in">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Câu ví dụ</label>
            <RichTextEditor value={card.exampleSentence || ""} onChange={(v) => updateCard(card.id, { exampleSentence: v || null })} placeholder="Nhập câu ví dụ..." />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1"><Volume2 className="h-3 w-3" /> Audio</label>
            <AudioInput value={card.audioUrl || ""} onChange={(v) => updateCard(card.id, { audioUrl: v || null })} cardFront={card.front} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {searchOpen ? (
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm từ vựng..." className="pl-8 pr-7 h-8 text-xs w-40 rounded-full" autoFocus onBlur={() => { if (!searchQuery) setSearchOpen(false); }} />
            <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0" title="Tìm kiếm"><Search className="h-3.5 w-3.5 text-muted-foreground" /></button>
        )}
        {([{ key: "all", label: "Tất cả" }, { key: "due", label: "Cần ôn" }, { key: "learning", label: "Đang học" }, { key: "mastered", label: "Đã thuộc" }] as const).map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)} className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-all border", filterStatus === f.key ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30")}>{f.label}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-8"><Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">{q ? `Không tìm thấy "${searchQuery}"` : "Không có flashcard nào phù hợp"}</p></div>
      ) : (
        <div className="space-y-3">
          {q || filterStatus !== "all" ? <p className="text-xs text-muted-foreground">Hiển thị {filtered.length} / {cards.length} thẻ</p> : null}
          {groups.map(([groupKey, group]) => {
            const GroupIcon = getGroupIcon(group.icon);
            const isExpanded = expandedGroups.has(groupKey);
            const masteredCount = group.cards.filter(c => c.mastered).length;
            return (
              <div key={groupKey} className="bg-card border rounded-2xl overflow-hidden">
                <button onClick={() => toggleGroup(groupKey)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><GroupIcon className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1 min-w-0"><h4 className="font-display font-bold text-sm truncate">{group.label}</h4><p className="text-[11px] text-muted-foreground">{group.cards.length} thẻ · {masteredCount} đã thuộc</p></div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </button>
                {isExpanded && <div className="px-4 pb-4 space-y-2 border-t pt-3 animate-fade-in">{group.cards.map(renderCard)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
