import { useState, useMemo, useEffect } from "react";
import LoadingSpinner from "@shared/components/ui/loading-spinner";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@shared/components/ui/alert-dialog";
import { cn } from "@shared/lib/utils";
import {
  Plus, Trash2, ChevronDown, Loader2, Library, Search, X, CheckCircle2,
} from "lucide-react";
import type { Flashcard } from "@shared/hooks/useFlashcards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { getLevelColorConfig } from "@shared/utils/levelColors";

interface Props {
  addMany: (items: { front: string; back: string; sourceType?: string; sourceSetId?: string }[]) => Promise<void>;
  existingCards: Flashcard[];
  removeBySet: (setId: string) => Promise<void>;
}

export default function BrowseSets({ addMany, existingCards, removeBySet }: Props) {
  const [sets, setSets] = useState<any[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [expandedSet, setExpandedSet] = useState<string | null>(null);
  const [setItems, setSetItems] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [levelFilters, setLevelFilters] = useState<string[]>([]);
  const [programFilters, setProgramFilters] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ type: "import" | "unimport"; setId: string; setTitle: string; count: number } | null>(null);
  const { levels: courseLevels } = useCourseLevels();

  const toggleFilter = (arr: string[], val: string) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "import") await importSet(confirmAction.setId);
    else await removeBySet(confirmAction.setId);
    setConfirmAction(null);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("flashcard_sets").select("*").eq("status", "published").order("created_at", { ascending: false });
      setSets(data || []);
      setLoadingSets(false);
    })();
  }, []);

  const toggleExpand = async (setId: string) => {
    if (expandedSet === setId) { setExpandedSet(null); return; }
    setExpandedSet(setId);
    const { data } = await supabase.from("flashcard_set_items").select("*").eq("set_id", setId).order("order");
    setSetItems(data || []);
  };

  const importSet = async (setId: string) => {
    setImporting(true);
    const { data } = await supabase.from("flashcard_set_items").select("*").eq("set_id", setId).order("order");
    const allSetItems = data || [];
    const duplicates = allSetItems.filter(d => existingCards.some(c => c.front === d.front));
    const itemsToImport = allSetItems.map(d => ({ front: d.front, back: d.back, sourceType: "set", sourceSetId: setId }));
    if (itemsToImport.length === 0) toast.info("Không có thẻ nào để import");
    else {
      await addMany(itemsToImport);
      if (duplicates.length > 0) {
        toast(
          <div className="space-y-1.5">
            <p className="font-bold text-sm">Đã import {itemsToImport.length} thẻ</p>
            <p className="text-xs text-muted-foreground">{duplicates.length} từ trùng đã được import lại:</p>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {duplicates.map((d, i) => <p key={i} className="text-xs text-muted-foreground">• {d.front}</p>)}
            </div>
          </div>,
          { duration: 8000 }
        );
      }
    }
    setImporting(false);
  };

  const programs = useMemo(() => { const p = new Set<string>(); sets.forEach(s => { if (s.program) p.add(s.program); }); return Array.from(p).sort(); }, [sets]);

  const filteredSets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sets.filter(s => {
      if (q && !s.title.toLowerCase().includes(q) && !(s.description || "").toLowerCase().includes(q)) return false;
      if (levelFilters.length > 0 && (!s.course_level || !levelFilters.includes(s.course_level))) return false;
      if (programFilters.length > 0 && (!s.program || !programFilters.includes(s.program))) return false;
      return true;
    });
  }, [sets, searchQuery, levelFilters, programFilters]);

  if (loadingSets) return <LoadingSpinner />;
  if (sets.length === 0) return <div className="text-center py-16"><Library className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" /><p className="text-muted-foreground font-medium">Chưa có bộ flashcard nào từ giáo viên</p></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Bộ flashcard từ giáo viên – nhấn để xem và import vào bộ của bạn</p>
      <div className="flex gap-2 flex-wrap items-center">
        {searchOpen ? (
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm..." className="pl-8 pr-7 h-8 text-xs w-40 rounded-full" autoFocus onBlur={() => { if (!searchQuery) setSearchOpen(false); }} />
            <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors shrink-0" title="Tìm kiếm"><Search className="h-3.5 w-3.5 text-muted-foreground" /></button>
        )}
        {courseLevels.length > 0 && (
          <>
            <div className="w-px h-5 bg-border shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              Khoá
              {levelFilters.length > 0 && <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">{levelFilters.length}</span>}
            </span>
            <button onClick={() => setLevelFilters([])} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", levelFilters.length === 0 ? "bg-accent text-accent-foreground" : "bg-card border text-muted-foreground hover:text-foreground")}>Tất cả</button>
            {courseLevels.map(cl => {
              const lc = getLevelColorConfig(cl.color_key || cl.name);
              const isActive = levelFilters.includes(cl.name);
              return (
                <button key={cl.id} onClick={() => setLevelFilters(prev => toggleFilter(prev, cl.name))}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    isActive ? (lc ? lc.selected : "bg-accent text-accent-foreground") : (lc ? `${lc.bg} ${lc.text} ${lc.border} hover:opacity-80` : "bg-card border text-muted-foreground hover:text-foreground")
                  )}>{cl.name}</button>
              );
            })}
          </>
        )}
      </div>
      {programs.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            Chương trình
            {programFilters.length > 0 && <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{programFilters.length}</span>}
          </span>
          <button onClick={() => setProgramFilters([])} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all", programFilters.length === 0 ? "bg-primary text-primary-foreground" : "bg-card border text-muted-foreground hover:text-foreground")}>Tất cả</button>
          {programs.map(p => (
            <button key={p} onClick={() => setProgramFilters(prev => toggleFilter(prev, p))} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border", programFilters.includes(p) ? "bg-primary text-primary-foreground" : "bg-card border text-muted-foreground hover:text-foreground")}>{p}</button>
          ))}
        </div>
      )}
      {filteredSets.length === 0 ? (
        <div className="text-center py-12"><Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">Không tìm thấy bộ thẻ phù hợp</p></div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filteredSets.length} bộ thẻ</p>
          {filteredSets.map(set => {
            const importedCards = existingCards.filter(c => c.sourceSetId === set.id);
            const isImported = importedCards.length > 0;
            return (
              <div key={set.id} className={cn("border rounded-xl overflow-hidden transition-all", isImported ? "bg-primary/5 border-primary/30" : "bg-card")}>
                <button onClick={() => toggleExpand(set.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-all">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isImported ? "bg-primary/20" : "bg-primary/10")}>
                    {isImported ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Library className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">{set.title}</h3>
                      {isImported && <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Đã import</span>}
                    </div>
                    {set.description && <p className="text-xs text-muted-foreground truncate">{set.description}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {set.course_level && (() => { const lc = getLevelColorConfig(set.course_level); return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", lc ? `${lc.bg} ${lc.text} ${lc.border}` : "bg-primary/10 text-primary")}>{set.course_level}</span>; })()}
                      {set.program && <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{set.program}</span>}
                      {isImported && <span className="text-[10px] text-muted-foreground">{importedCards.length} thẻ đã lưu</span>}
                    </div>
                  </div>
                  {isImported ? (
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0" onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "unimport", setId: set.id, setTitle: set.title, count: importedCards.length }); }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Bỏ
                    </Button>
                  ) : (
                    <Button size="sm" className="shrink-0" onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: "import", setId: set.id, setTitle: set.title, count: 0 }); }} disabled={importing}>
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Import
                    </Button>
                  )}
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", expandedSet === set.id && "rotate-180")} />
                </button>
                {expandedSet === set.id && setItems.length > 0 && (
                  <div className="border-t px-4 py-3 space-y-1.5 max-h-64 overflow-y-auto bg-muted/20">
                    {setItems.map((item, i) => {
                      const alreadyImported = existingCards.some(c => c.front === item.front && c.sourceSetId === set.id);
                      return (
                        <div key={item.id} className={cn("flex gap-2 text-sm", alreadyImported && "opacity-50")}>
                          <span className="text-[10px] font-bold text-muted-foreground w-5 pt-0.5">{i + 1}</span>
                          <span className="font-medium">{item.front}</span>
                          <span className="text-muted-foreground">– {item.back}</span>
                          {alreadyImported && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog open={!!confirmAction} onOpenChange={open => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.type === "import" ? "Xác nhận Import" : "Xác nhận xóa bộ thẻ"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "import"
                ? <>Bạn muốn import tất cả thẻ từ bộ <strong>{confirmAction?.setTitle}</strong> vào kho của mình?</>
                : <>Bạn có chắc muốn xóa <strong>{confirmAction?.count} thẻ</strong> từ bộ <strong>{confirmAction?.setTitle}</strong> khỏi kho? Tiến độ học sẽ bị mất.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedAction} className={confirmAction?.type === "unimport" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              {confirmAction?.type === "import" ? "Import" : "Xóa bộ thẻ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
