import { useState, useCallback, useRef, useEffect } from "react";
import { Bookmark, X, Trash2, Navigation } from "lucide-react";
import { cn } from "@shared/lib/utils";

export type SavedItemType = "question" | "text" | "highlight" | "note";

export interface SavedQuestion {
  id: string;
  questionNumber: number; // 0 for text snippets/highlights/notes
  questionText: string;
  assessmentId: string;
  assessmentName: string;
  savedAt: string;
  type: SavedItemType;
  annotation?: string; // for notes
}

interface SavedQuestionsProps {
  assessmentId: string;
  assessmentName: string;
  currentSaved: SavedQuestion[];
  removeSaved: (id: string) => void;
  className?: string;
}

const STORAGE_KEY = "savedQuestions";

function loadSaved(): SavedQuestion[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Migrate old items without type
    return raw.map((item: any) => ({
      ...item,
      type: item.type || "question",
    }));
  } catch {
    return [];
  }
}

function persistSaved(items: SavedQuestion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Async cloud sync — fire and forget
  import("@/integrations/supabase/client").then(async ({ supabase }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("saved_questions").upsert(
      { user_id: user.id, data: items as any, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }).catch(() => { /* offline fallback */ });
}

export function useSavedQuestions(assessmentId: string) {
  const [saved, setSaved] = useState<SavedQuestion[]>(loadSaved);

  // Cloud sync
  useEffect(() => {
    let cancelled = false;
    import("@shared/hooks/useCloudSavedQuestions").then(({ useCloudSavedQuestions: _ }) => {
      // We use a simpler approach: just sync on mount
      import("@/integrations/supabase/client").then(async ({ supabase }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase.from("saved_questions").select("data").eq("user_id", user.id).maybeSingle();
        const cloudItems: SavedQuestion[] = Array.isArray(data?.data) ? (data.data as any) : [];
        const localItems = loadSaved();
        const map = new Map<string, SavedQuestion>();
        cloudItems.forEach((item: any) => map.set(item.id, item));
        localItems.forEach((item) => { if (!map.has(item.id)) map.set(item.id, item); });
        const merged = Array.from(map.values());
        if (!cancelled) {
          persistSaved(merged);
          setSaved(merged);
          // Push merged back
          if (merged.length !== cloudItems.length) {
            await supabase.from("saved_questions").upsert(
              { user_id: user.id, data: merged as any, updated_at: new Date().toISOString() },
              { onConflict: "user_id" }
            );
          }
        }
      });
    });
    return () => { cancelled = true; };
  }, []);

  const isSaved = useCallback(
    (questionNumber: number) =>
      saved.some(
        (s) =>
          s.assessmentId === assessmentId &&
          s.questionNumber === questionNumber &&
          s.type === "question"
      ),
    [saved, assessmentId]
  );

  const toggleSave = useCallback(
    (questionNumber: number, questionText: string, assessmentName: string) => {
      setSaved((prev) => {
        const exists = prev.find(
          (s) =>
            s.assessmentId === assessmentId &&
            s.questionNumber === questionNumber &&
            s.type === "question"
        );
        let next: SavedQuestion[];
        if (exists) {
          next = prev.filter((s) => s.id !== exists.id);
        } else {
          next = [
            ...prev,
            {
              id: `${assessmentId}-q${questionNumber}-${Date.now()}`,
              questionNumber,
              questionText,
              assessmentId,
              assessmentName,
              savedAt: new Date().toISOString(),
              type: "question",
            },
          ];
        }
        persistSaved(next);
        return next;
      });
    },
    [assessmentId]
  );

  const saveText = useCallback(
    (text: string, assessmentName: string) => {
      setSaved((prev) => {
        const next = [
          ...prev,
          {
            id: `${assessmentId}-text-${Date.now()}`,
            questionNumber: 0,
            questionText: text,
            assessmentId,
            assessmentName,
            savedAt: new Date().toISOString(),
            type: "text" as const,
          },
        ];
        persistSaved(next);
        return next;
      });
    },
    [assessmentId]
  );

  const saveHighlight = useCallback(
    (text: string, assessmentName: string) => {
      setSaved((prev) => {
        const next = [
          ...prev,
          {
            id: `${assessmentId}-hl-${Date.now()}`,
            questionNumber: 0,
            questionText: text,
            assessmentId,
            assessmentName,
            savedAt: new Date().toISOString(),
            type: "highlight" as const,
          },
        ];
        persistSaved(next);
        return next;
      });
    },
    [assessmentId]
  );

  const saveNote = useCallback(
    (sourceText: string, annotation: string, assessmentName: string) => {
      setSaved((prev) => {
        const next = [
          ...prev,
          {
            id: `${assessmentId}-note-${Date.now()}`,
            questionNumber: 0,
            questionText: sourceText,
            assessmentId,
            assessmentName,
            savedAt: new Date().toISOString(),
            type: "note" as const,
            annotation,
          },
        ];
        persistSaved(next);
        return next;
      });
    },
    [assessmentId]
  );

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSaved(next);
      return next;
    });
  }, []);

  const currentSaved = saved.filter((s) => s.assessmentId === assessmentId);

  return { saved, currentSaved, isSaved, toggleSave, saveText, saveHighlight, saveNote, removeSaved };
}

export function SavedQuestionsPanel({
  assessmentId,
  assessmentName,
  currentSaved,
  removeSaved,
  className,
}: SavedQuestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalCount = currentSaved.length;

  const scrollToQuestion = useCallback((num: number) => {
    if (num === 0) return; // text snippets don't have a question to scroll to
    const el = document.getElementById(`question-${num}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("exam-note-flash");
      setTimeout(() => el.classList.remove("exam-note-flash"), 1500);
    }
  }, []);

  return (
    <div
      onMouseEnter={() => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => {
          setIsOpen(true);
          setIsMinimized(false);
        }, 300);
      }}
      onMouseLeave={() => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => setIsMinimized(true), 400);
      }}
      className={cn(
        "fixed z-40 transition-all duration-300 ease-in-out flex flex-col",
        isOpen && !isMinimized
          ? "bottom-4 right-16 w-80 sm:w-96 h-80 sm:h-96 bg-card border rounded-xl shadow-2xl"
          : "bottom-4 right-16 w-11 h-11",
        className
      )}
    >
      {/* Collapsed: just the icon */}
      {(!isOpen || isMinimized) && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={cn(
            "w-11 h-11 rounded-full bg-secondary text-primary",
            "flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200",
            "hover:scale-105 active:scale-95"
          )}
          title="Saved questions"
        >
          <Bookmark className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {totalCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded */}
      {isOpen && !isMinimized && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 rounded-t-xl shrink-0">
            <div className="flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-display font-semibold">
                Đã lưu
              </span>
              {totalCount > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                  {totalCount}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {currentSaved.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 p-4">
                <Bookmark className="h-8 w-8 opacity-30" />
                <p>Click trên câu hỏi hoặc chọn văn bản để lưu</p>
                <p className="text-[10px]">Câu hỏi & văn bản sẽ được lưu để ôn tập sau</p>
              </div>
            ) : (
              <div className="divide-y">
                {currentSaved.map((item) => (
                  <div
                    key={item.id}
                    className="group px-3 py-2.5 hover:bg-muted/30 transition-colors duration-200"
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        "shrink-0 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center mt-0.5",
                        item.type === "question"
                          ? "text-primary bg-primary/10"
                          : "text-accent bg-accent/10"
                      )}>
                        {item.type === "question" ? item.questionNumber : "T"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs text-foreground/80 line-clamp-2 transition-colors duration-200",
                            item.type === "question" && "cursor-pointer hover:text-primary"
                          )}
                          onClick={() => item.type === "question" && scrollToQuestion(item.questionNumber)}
                        >
                          {item.questionText || `Question ${item.questionNumber}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.type ==="text"?"Văn bản":`Câu ${item.questionNumber}`}
                          {" · "}
                          {new Date(item.savedAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {item.type === "question" && (
                          <button
                            onClick={() => scrollToQuestion(item.questionNumber)}
                            className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                            title="Đi đến câu hỏi"
                          >
                            <Navigation className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => removeSaved(item.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
