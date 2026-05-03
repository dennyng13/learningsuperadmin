import { useState, useEffect, useRef } from "react";
import { useMemo } from "react";
import { PopButton } from "@shared/components/ui/pop-button";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { cn } from "@shared/lib/utils";
import { toast } from "sonner";
import {
  Plus, Trash2, Loader2, Sparkles, Upload, Eye, EyeOff, Save, Layers, ArrowLeft, FileUp, Image, X, Link2,
  Search, ChevronDown, Tags, BookOpen, GraduationCap,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@shared/components/ui/tabs";
import UnsavedChangesDialog from "@admin/features/tests/components/UnsavedChangesDialog";
import { CourseAssignmentPanel } from "@shared/components/study-plan/CourseAssignmentPanel";
import { ResourceFilterBar } from "@shared/components/resources/ResourceFilterBar";
import { useResourceList } from "@shared/hooks/useResourceList";
import { BulkCourseAssignDialog } from "@shared/components/resources/BulkCourseAssignDialog";
import { useBulkSelection } from "@shared/hooks/useBulkSelection";
import { Checkbox } from "@shared/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";


interface FlashcardItem {
  id?: string;
  front: string;
  back: string;
  image_url?: string;
  order: number;
}

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  linked_assessment_id: string | null;
  linked_exercise_id: string | null;
  itemCount?: number;
}

interface AssessmentOption { id: string; name: string; section_type: string; }
interface ExerciseOption { id: string; title: string; skill: string; program?: string | null; }

export default function FlashcardSetsPage() {
  const { user } = useAuth();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSet, setEditingSet] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<FlashcardItem[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // AI generation
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("20");
  const [generating, setGenerating] = useState(false);

  // Bulk import
  const [bulkText, setBulkText] = useState("");

  // Linking
  const [linkedAssessmentId, setLinkedAssessmentId] = useState<string | null>(null);
  const [linkedExerciseId, setLinkedExerciseId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);

  // Image uploading
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  // Dirty tracking & unsaved changes dialog
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const initialSnapshot = useRef<string>("");

  // Program & Level
  const [editProgram, setEditProgram] = useState<string | null>(null);
  const [editLevel, setEditLevel] = useState<string | null>(null);
  const [courseLevels, setCourseLevels] = useState<{ id: string; name: string }[]>([]);

  // Delete from editor
  const [deleteFromEditorId, setDeleteFromEditorId] = useState<string | null>(null);

  // List filters
  const [listSearch, setListSearch] = useState("");
  const [showListSearch, setShowListSearch] = useState(false);
  const [filterPrograms, setFilterPrograms] = useState<Set<string>>(new Set());
  const [filterCourses, setFilterCourses] = useState<Set<string>>(new Set());
  const [filterLevels, setFilterLevels] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [programExpanded, setProgramExpanded] = useState(false);
  const [courseExpanded, setCourseExpanded] = useState(false);
  const [levelExpanded, setLevelExpanded] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);

  const fetchSets = async () => {
    const { data, error } = await supabase
      .from("flashcard_sets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Error loading sets"); return; }

    // Get item counts
    const setsWithCount = await Promise.all(
      (data || []).map(async (s) => {
        const { count } = await supabase
          .from("flashcard_set_items")
          .select("*", { count: "exact", head: true })
          .eq("set_id", s.id);
        return { ...s, itemCount: count || 0 };
      })
    );
    setSets(setsWithCount);
    setLoading(false);
  };

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const init = async () => {
      await fetchSets();
      // Load assessments and exercises for linking
      supabase.from("assessments").select("id, name, section_type").order("name").then(({ data }) => {
        if (data) setAssessments(data as AssessmentOption[]);
      });
      supabase.from("practice_exercises").select("id, title, skill, program").order("title").then(({ data }) => {
        if (data) setExercises(data as ExerciseOption[]);
      });
      // Chỉ tải levels thuộc program ACTIVE — đồng bộ với danh sách 3 chương trình hiện hành.
      (async () => {
        const [{ data: progRows }, { data: linkRows }, { data: lvlRows }] = await Promise.all([
          (supabase as any).from("programs").select("id").eq("status", "active"),
          (supabase as any).from("program_levels").select("level_id, program_id"),
          supabase.from("course_levels").select("id, name").order("sort_order"),
        ]);
        const activeIds = new Set((progRows ?? []).map((p: any) => p.id));
        const allowed = new Set<string>(
          (linkRows ?? [])
            .filter((r: any) => activeIds.has(r.program_id))
            .map((r: any) => r.level_id),
        );
        if (lvlRows) setCourseLevels((lvlRows as any[]).filter((l) => allowed.has(l.id)));
      })();
      // Auto-open editor if ?edit= param
      const editId = searchParams.get("edit");
      if (editId) {
        setSearchParams({}, { replace: true });
        // Small delay to let sets load
        setTimeout(() => openEditor(editId), 300);
      }
    };
    init();
  }, []);

  const createNewSet = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("flashcard_sets")
      .insert({ title: "Bộ flashcard mới", created_by: user.id })
      .select()
      .single();
    if (error) { toast.error("Error creating set"); return; }
    toast.success("Đã tạo bộ mới");
    await fetchSets();
    openEditor(data.id);
  };

  const openEditor = async (setId: string) => {
    let set = sets.find(s => s.id === setId);
    if (!set) {
      const { data } = await supabase.from("flashcard_sets").select("*").eq("id", setId).single();
      if (data) set = data as any;
    }
    let title = "", desc = "", assessId: string | null = null, exerId: string | null = null, prog: string | null = null, level: string | null = null;
    if (set) {
      title = set.title;
      desc = set.description || "";
      assessId = (set as any).linked_assessment_id || null;
      exerId = (set as any).linked_exercise_id || null;
      prog = (set as any).program || null;
      level = (set as any).course_level || null;
      // Auto-detect program from linked exercise if not set
      if (!prog && exerId) {
        const ex = exercises.find(e => e.id === exerId);
        prog = ex?.program || null;
      }
    }
    setEditTitle(title);
    setEditDesc(desc);
    setLinkedAssessmentId(assessId);
    setLinkedExerciseId(exerId);
    setEditProgram(prog);
    setEditLevel(level);

    const { data } = await supabase
      .from("flashcard_set_items")
      .select("*")
      .eq("set_id", setId)
      .order("order");
    const items = (data || []).map((d: any) => ({ id: d.id, front: d.front, back: d.back, image_url: d.image_url || undefined, order: d.order }));
    setEditItems(items);
    setEditingSet(setId);

    // Capture snapshot for dirty tracking
    const snap = JSON.stringify({ title, desc, assessId, exerId, prog, level, items });
    initialSnapshot.current = snap;
    setIsDirty(false);
  };

  // Track dirty state
  useEffect(() => {
    if (!editingSet) return;
    const current = JSON.stringify({
      title: editTitle, desc: editDesc, assessId: linkedAssessmentId,
      exerId: linkedExerciseId, prog: editProgram, level: editLevel, items: editItems,
    });
    setIsDirty(current !== initialSnapshot.current);
  }, [editTitle, editDesc, linkedAssessmentId, linkedExerciseId, editProgram, editLevel, editItems, editingSet]);

  // Auto-assign program when linked exercise changes
  useEffect(() => {
    if (linkedExerciseId) {
      const ex = exercises.find(e => e.id === linkedExerciseId);
      if (ex?.program) setEditProgram(ex.program);
    }
  }, [linkedExerciseId, exercises]);

  const handleBackClick = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      setEditingSet(null);
    }
  };

  const handleSaveAndExit = async () => {
    await saveSet();
    setShowUnsavedDialog(false);
    setEditingSet(null);
  };

  const handleDiscard = () => {
    setShowUnsavedDialog(false);
    setIsDirty(false);
    setEditingSet(null);
  };

  const confirmDeleteFromEditor = async () => {
    if (!deleteFromEditorId) return;
    const { error } = await supabase.from("flashcard_sets").delete().eq("id", deleteFromEditorId);
    if (error) { toast.error("Error deleting"); return; }
    toast.success("Đã xóa bộ flashcard");
    setDeleteFromEditorId(null);
    setEditingSet(null);
    await fetchSets();
  };

  const saveSet = async () => {
    if (!editingSet) return;
    setSaving(true);

    // Update set metadata + linking
    const { error: setError } = await supabase
      .from("flashcard_sets")
      .update({
        title: editTitle,
        description: editDesc || null,
        linked_assessment_id: linkedAssessmentId || null,
        linked_exercise_id: linkedExerciseId || null,
        program: editProgram || null,
        course_level: editLevel || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", editingSet);
    if (setError) { toast.error("Error saving"); setSaving(false); return; }

    // Delete old items and insert new
    await supabase.from("flashcard_set_items").delete().eq("set_id", editingSet);

    if (editItems.length > 0) {
      const rows = editItems.map((item, i) => ({
        set_id: editingSet,
        front: item.front,
        back: item.back,
        image_url: item.image_url || null,
        order: i,
      }));
      const { error: itemError } = await supabase.from("flashcard_set_items").insert(rows as any);
      if (itemError) { toast.error("Error saving items"); setSaving(false); return; }
    }

    toast.success("Đã lưu!");
    setSaving(false);
    await fetchSets();
  };

  const togglePublish = async (setId: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("flashcard_sets")
      .update({ status: newStatus })
      .eq("id", setId);
    if (error) { toast.error("Error"); return; }
    toast.success(newStatus === "published" ? "Đã xuất bản" : "Đã ẩn");
    await fetchSets();
  };

  // Delete dialog
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);

  const confirmDeleteSet = async () => {
    if (!deleteSetId) return;
    const { error } = await supabase.from("flashcard_sets").delete().eq("id", deleteSetId);
    if (error) { toast.error("Error deleting"); return; }
    toast.success("Đã xóa");
    if (editingSet === deleteSetId) setEditingSet(null);
    setDeleteSetId(null);
    await fetchSets();
  };

  // Import dialog state (list view)
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importTitle, setImportTitle] = useState("");
  const [importDesc, setImportDesc] = useState("");
  const [importText, setImportText] = useState("");

  const handleImportFromDialog = async () => {
    if (!user) return;
    const lines = importText.trim().split("\n").filter(l => l.includes("|") || l.includes("\t"));
    if (lines.length === 0) { toast.error("Không tìm thấy dữ liệu. Dùng format: từ | nghĩa"); return; }

    setSaving(true);
    const { data, error } = await supabase
      .from("flashcard_sets")
      .insert({ title: importTitle.trim() || "Bộ import mới", description: importDesc.trim() || null, created_by: user.id })
      .select()
      .single();
    if (error) { toast.error("Lỗi tạo bộ"); setSaving(false); return; }

    const rows = lines.map((line, i) => {
      const sep = line.includes("\t") ? "\t" : "|";
      const [front, ...rest] = line.split(sep);
      return { set_id: data.id, front: front.trim(), back: rest.join(sep).trim(), order: i };
    });
    const { error: itemError } = await supabase.from("flashcard_set_items").insert(rows);
    if (itemError) { toast.error("Lỗi import thẻ"); setSaving(false); return; }

    toast.success(`Đã import ${rows.length} flashcard`);
    setImportDialogOpen(false);
    setImportTitle(""); setImportDesc(""); setImportText("");
    setSaving(false);
    await fetchSets();
  };

  // AI Generation
  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { topic: aiTopic.trim(), count: parseInt(aiCount) || 20 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newItems: FlashcardItem[] = (data.flashcards || []).map((f: any, i: number) => ({
        front: f.front,
        back: f.back,
        order: editItems.length + i,
      }));
      setEditItems(prev => [...prev, ...newItems]);
      toast.success(`Đã tạo ${newItems.length} flashcard bằng AI`);
      setAiTopic("");
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    }
    setGenerating(false);
  };

  // Bulk import (format: front | back, one per line)
  const handleBulkImport = () => {
    const lines = bulkText.trim().split("\n").filter(l => l.includes("|") || l.includes("\t"));
    if (lines.length === 0) { toast.error("Không tìm thấy dữ liệu. Dùng format: từ | nghĩa"); return; }
    const newItems: FlashcardItem[] = lines.map((line, i) => {
      const sep = line.includes("\t") ? "\t" : "|";
      const [front, ...rest] = line.split(sep);
      return { front: front.trim(), back: rest.join(sep).trim(), order: editItems.length + i };
    });
    setEditItems(prev => [...prev, ...newItems]);
    toast.success(`Đã import ${newItems.length} flashcard`);
    setBulkText("");
  };

  const addBlankItem = () => {
    setEditItems(prev => [...prev, { front: "", back: "", order: prev.length }]);
  };

  const updateItem = (idx: number, field: "front" | "back" | "image_url", value: string) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemImageUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    const ext = file.name.split(".").pop();
    const path = `items/${Date.now()}_${idx}.${ext}`;
    const { error } = await supabase.storage.from("flashcard-images").upload(path, file);
    if (error) { toast.error("Lỗi upload ảnh"); setUploadingIdx(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("flashcard-images").getPublicUrl(path);
    updateItem(idx, "image_url", publicUrl);
    setUploadingIdx(null);
  };

  // Editor view
  const [editorTab, setEditorTab] = useState<"cards" | "meta" | "link" | "tools">("cards");

  if (editingSet) {
    return (
      <div
        style={{
          display: "flex", flexDirection: "column",
          height: "calc(100vh - 56px)",
          background: "var(--lp-cream, #F9F8F4)",
        }}
      >
        {/* ── Topbar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 20px",
          background: "#fff",
          borderBottom: "2px solid var(--lp-ink, #0B0C0E)",
          flexShrink: 0,
        }}>
          <button
            onClick={handleBackClick}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "2px solid var(--lp-line, #E5E7EB)",
              borderRadius: 8, padding: "5px 10px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              color: "var(--lp-ink, #0B0C0E)",
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Tên bộ flashcard..."
              style={{
                fontFamily: "var(--ff-display, inherit)",
                fontWeight: 900, fontSize: 18,
                border: "none", background: "transparent",
                padding: 0, height: "auto", outline: "none",
                boxShadow: "none",
              }}
              className="focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div style={{ fontSize: 11, color: "var(--lp-body, #6B7280)", marginTop: 1 }}>
              {editItems.length} thẻ
              {editProgram && <> · <span style={{ fontWeight: 700 }}>{editProgram.toUpperCase()}</span></>}
              {editLevel && <> · {editLevel}</>}
              {isDirty && <span style={{ color: "var(--lp-coral, #FA7D64)", marginLeft: 4 }}>● chưa lưu</span>}
            </div>
          </div>

          {/* Tab pills */}
          <div style={{
            display: "flex", gap: 0,
            background: "var(--lp-cream, #F9F8F4)",
            border: "2px solid var(--lp-ink, #0B0C0E)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {(["cards", "meta", "link", "tools"] as const).map((tab) => {
              const labels: Record<string, string> = { cards: "Thẻ", meta: "Thông tin", link: "Liên kết", tools: "Công cụ" };
              return (
                <button
                  key={tab}
                  onClick={() => setEditorTab(tab)}
                  style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 700,
                    background: editorTab === tab ? "var(--lp-ink, #0B0C0E)" : "transparent",
                    color: editorTab === tab ? "#fff" : "var(--lp-ink, #0B0C0E)",
                    border: "none", cursor: "pointer", transition: "all .1s",
                    borderRight: "1.5px solid var(--lp-line, #E5E7EB)",
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setDeleteFromEditorId(editingSet)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "2px solid var(--lp-line, #E5E7EB)",
              borderRadius: 8, padding: "5px 10px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              color: "#EF4444",
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <PopButton tone="coral" size="sm" onClick={saveSet} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Lưu
          </PopButton>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* ── TAB: Cards ── */}
          {editorTab === "cards" && (
            <div style={{ maxWidth: 860, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontWeight: 800, fontSize: 14, color: "var(--lp-ink)" }}>{editItems.length} flashcard</p>
                <PopButton tone="teal" size="sm" onClick={addBlankItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Thêm thẻ
                </PopButton>
              </div>

              {editItems.length === 0 && (
                <div style={{
                  textAlign: "center", padding: "48px 20px",
                  border: "2px dashed var(--lp-line, #E5E7EB)", borderRadius: 16,
                  color: "var(--lp-body, #6B7280)",
                }}>
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-25" />
                  <p style={{ fontWeight: 700, fontSize: 15 }}>Bộ trống</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Thêm thẻ thủ công hoặc dùng tab Công cụ để import / tạo AI</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {editItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr 1fr auto",
                      gap: 8, alignItems: "center",
                      padding: "10px 12px",
                      background: "#fff",
                      border: "2px solid var(--lp-line, #E5E7EB)",
                      borderRadius: 12,
                      transition: "border-color .1s",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--lp-body, #6B7280)", textAlign: "center" }}>{idx + 1}</span>
                    <Input
                      value={item.front}
                      onChange={e => updateItem(idx, "front", e.target.value)}
                      placeholder="Mặt trước"
                      style={{ height: 36, fontSize: 13 }}
                    />
                    <Input
                      value={item.back}
                      onChange={e => updateItem(idx, "back", e.target.value)}
                      placeholder="Mặt sau"
                      style={{ height: 36, fontSize: 13 }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                      {item.image_url ? (
                        <div style={{ position: "relative" }}>
                          <img src={item.image_url} alt="" style={{ height: 36, width: 36, borderRadius: 6, objectFit: "cover", border: "1.5px solid var(--lp-line)" }} />
                          <button
                            onClick={() => updateItem(idx, "image_url", "")}
                            style={{
                              position: "absolute", top: -6, right: -6,
                              background: "#EF4444", border: "none", borderRadius: "50%",
                              width: 14, height: 14, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <X className="h-2 w-2 text-white" />
                          </button>
                        </div>
                      ) : (
                        <label style={{ cursor: "pointer", color: "var(--lp-body, #6B7280)", display: "flex", alignItems: "center" }}>
                          {uploadingIdx === idx
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Image className="h-4 w-4" />
                          }
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleItemImageUpload(idx, e.target.files[0])} />
                        </label>
                      )}
                      <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", display: "flex" }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Meta ── */}
          {editorTab === "meta" && (
            <div style={{ maxWidth: 600, margin: "0 auto" }} className="space-y-5">
              <div style={{
                padding: "16px",
                background: "#fff",
                border: "2px solid var(--lp-ink, #0B0C0E)",
                borderRadius: 14,
                boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--lp-coral, #FA7D64)", marginBottom: 12 }}>✦ Thông tin bộ</div>
                <div className="space-y-4">
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--lp-body)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tên bộ</label>
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="e.g. IELTS Environment" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--lp-body)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mô tả</label>
                    <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Từ vựng về môi trường" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--lp-body)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Chương trình</label>
                      <Select value={editProgram || "none"} onValueChange={v => setEditProgram(v === "none" ? null : v)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Chung" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Chung</SelectItem>
                          <SelectItem value="ielts">IELTS</SelectItem>
                          <SelectItem value="wre">WRE</SelectItem>
                          <SelectItem value="customized">Customized</SelectItem>
                          <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                      {linkedExerciseId && editProgram && (
                        <p className="text-[10px] text-muted-foreground mt-1">Tự động gán từ bài tập liên kết</p>
                      )}
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--lp-body)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Level</label>
                      <Select value={editLevel || "none"} onValueChange={v => setEditLevel(v === "none" ? null : v)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tất cả</SelectItem>
                          {courseLevels.map(l => (
                            <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {editingSet && (
                <div style={{
                  padding: "16px",
                  background: "#fff",
                  border: "2px solid var(--lp-line, #E5E7EB)",
                  borderRadius: 14,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--lp-body)", marginBottom: 12 }}>Khoá học</div>
                  <CourseAssignmentPanel kind="flashcard_set" resourceId={editingSet} />
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Link ── */}
          {editorTab === "link" && (
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div style={{
                padding: "16px",
                background: "#fff",
                border: "2px solid var(--lp-ink, #0B0C0E)",
                borderRadius: 14,
                boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
              }} className="space-y-4">
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--lp-coral, #FA7D64)", marginBottom: 4 }}>✦ Liên kết tài nguyên</div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--lp-body)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bài thi (Assessment)</label>
                  <Select value={linkedAssessmentId || "none"} onValueChange={v => setLinkedAssessmentId(v === "none" ? null : v)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Chung" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chung</SelectItem>
                      {assessments.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.section_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--lp-body)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bài tập (Exercise)</label>
                  <Select value={linkedExerciseId || "none"} onValueChange={v => setLinkedExerciseId(v === "none" ? null : v)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Chung" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chung</SelectItem>
                      {exercises.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.title} ({e.skill})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Tools ── */}
          {editorTab === "tools" && (
            <div style={{ maxWidth: 640, margin: "0 auto" }} className="space-y-5">
              {/* AI Generation */}
              <div style={{
                background: "var(--lp-teal-soft, #E6F7F6)",
                border: "2px solid var(--lp-ink, #0B0C0E)",
                borderRadius: 14,
                boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
                padding: "18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Sparkles className="h-4 w-4" style={{ color: "var(--lp-ink)" }} />
                  <span style={{ fontWeight: 900, fontSize: 15, color: "var(--lp-ink)" }}>Tạo bằng AI</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 800,
                    padding: "2px 8px", background: "var(--lp-ink)", color: "#fff",
                    borderRadius: 20, letterSpacing: "0.06em",
                  }}>AI ✦</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="Chủ đề: Environment, Education..."
                    style={{ flex: 1 }}
                    onKeyDown={e => e.key === "Enter" && handleAIGenerate()}
                  />
                  <Input
                    value={aiCount}
                    onChange={e => setAiCount(e.target.value)}
                    placeholder="SL"
                    style={{ width: 70 }}
                    type="number" min={5} max={50}
                  />
                  <PopButton tone="ink" size="sm" onClick={handleAIGenerate} disabled={generating || !aiTopic.trim()}>
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  </PopButton>
                </div>
              </div>

              {/* Bulk Import */}
              <div style={{
                background: "#fff",
                border: "2px solid var(--lp-ink, #0B0C0E)",
                borderRadius: 14,
                boxShadow: "4px 4px 0 0 var(--lp-ink, #0B0C0E)",
                padding: "18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Upload className="h-4 w-4" />
                  <span style={{ fontWeight: 900, fontSize: 15, color: "var(--lp-ink)" }}>Import hàng loạt</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--lp-body)", marginBottom: 8 }}>Mỗi dòng: <code>từ | nghĩa</code> hoặc dùng Tab</p>
                <Textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={"ubiquitous | Có mặt ở khắp nơi\nmitigate | Giảm nhẹ, làm dịu\nsustainable | Bền vững"}
                  rows={5}
                />
                {bulkText.trim() && (
                  <p style={{ fontSize: 11, color: "var(--lp-body)", marginTop: 4 }}>
                    {bulkText.trim().split("\n").filter(l => l.includes("|") || l.includes("\t")).length} dòng nhận dạng
                  </p>
                )}
                <div style={{ marginTop: 10 }}>
                  <PopButton tone="teal" size="sm" onClick={handleBulkImport} disabled={!bulkText.trim()}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Import
                  </PopButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unsaved changes dialog */}
        <UnsavedChangesDialog
          open={showUnsavedDialog}
          onOpenChange={setShowUnsavedDialog}
          onSaveAndExit={handleSaveAndExit}
          onDiscard={handleDiscard}
          saving={saving}
        />

        {/* Delete from editor dialog */}
        <AlertDialog open={!!deleteFromEditorId} onOpenChange={() => setDeleteFromEditorId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa bộ flashcard</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc muốn xóa bộ flashcard này? Tất cả thẻ trong bộ sẽ bị xóa vĩnh viễn.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteFromEditor} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // List view
  const publishedCount = sets.filter(s => s.status === "published").length;
  const totalCards = sets.reduce((sum, s) => sum + (s.itemCount || 0), 0);

  // Filter helpers
  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const usedPrograms = [...new Set(sets.map(s => (s as any).program).filter(Boolean))];
  const usedLevels = [...new Set(sets.map(s => (s as any).course_level).filter(Boolean))];
  const hasFilters = filterPrograms.size > 0 || filterCourses.size > 0 || filterLevels.size > 0 || filterStatuses.size > 0 || listSearch.trim().length > 0;

  const clearFilters = () => {
    setFilterPrograms(new Set());
    setFilterCourses(new Set());
    setFilterLevels(new Set());
    setFilterStatuses(new Set());
    setListSearch("");
    setShowListSearch(false);
  };

  // Stage 1: filter Program + Course qua pivot resource_courses
  const {
    filtered: programCourseFiltered,
    matched: matchedToCourse,
    untagged: untaggedItems,
  } = useResourceList("flashcard_set", sets as any, {
    programIds: filterPrograms,
    courseIds: filterCourses,
    includeUntagged: true,
  });

  // Stage 2: search/level/status
  const filteredSets = (programCourseFiltered as typeof sets).filter(s => {
    if (listSearch.trim() && !s.title.toLowerCase().includes(listSearch.trim().toLowerCase())) return false;
    if (filterLevels.size > 0 && !filterLevels.has((s as any).course_level || "")) return false;
    if (filterStatuses.size > 0 && !filterStatuses.has(s.status)) return false;
    return true;
  });

  const getLevelColor = (name: string) => {
    const cl = courseLevels.find(l => l.name === name);
    return cl ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border";
  };

  // Bulk selection
  const visibleIds = useMemo(() => filteredSets.map((s) => s.id), [filteredSets]);
  const bulkSel = useBulkSelection(visibleIds);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Bộ Flashcard</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý các bộ flashcard từ vựng cho học viên</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}><FileUp className="h-4 w-4 mr-2" /> Import</Button>
          <Button onClick={createNewSet}><Plus className="h-4 w-4 mr-2" /> Tạo bộ mới</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Tổng bộ", value: sets.length, icon: Layers, color: "text-primary" },
          { label: "Đã xuất bản", value: publishedCount, icon: Eye, color: "text-primary" },
          { label: "Tổng thẻ", value: totalCards, icon: Layers, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chip-based filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          {showListSearch ? (
            <div className="relative min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Tìm flashcard..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm rounded-full"
              />
              <button onClick={() => { setListSearch(""); setShowListSearch(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowListSearch(true)}
              className="flex items-center justify-center h-9 w-9 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {/* All chip */}
          <button
            onClick={clearFilters}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
              !hasFilters
                ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                : "bg-card border-border text-foreground hover:border-primary/40 hover:shadow-md"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Tất cả
            <span className={cn(
              "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
              !hasFilters ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {sets.length}
            </span>
          </button>

          {/* Program + Course (cascading, dùng chung component) */}
          <span className="h-5 w-px bg-border mx-0.5" />
          <ResourceFilterBar
            programIds={filterPrograms}
            courseIds={filterCourses}
            onProgramsChange={(next) => {
              setFilterPrograms(next);
              if (next.size === 0) setFilterCourses(new Set());
            }}
            onCoursesChange={setFilterCourses}
            programExpanded={programExpanded}
            courseExpanded={courseExpanded}
            onToggleProgram={() => setProgramExpanded(!programExpanded)}
            onToggleCourse={() => setCourseExpanded(!courseExpanded)}
            matchedCount={matchedToCourse.length}
            untaggedCount={untaggedItems.length}
          />

          {/* Level toggle */}
          {usedLevels.length > 0 && (
            <>
              <span className="h-5 w-px bg-border mx-0.5" />
              <button
                onClick={() => setLevelExpanded(!levelExpanded)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
                  filterLevels.size > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Level
                {filterLevels.size > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{filterLevels.size}</span>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform", levelExpanded && "rotate-180")} />
              </button>
            </>
          )}

          {/* Status toggle */}
          <span className="h-5 w-px bg-border mx-0.5" />
          <button
            onClick={() => setStatusExpanded(!statusExpanded)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm",
              filterStatuses.size > 0
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            Trạng thái
            {filterStatuses.size > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{filterStatuses.size}</span>
            )}
            <ChevronDown className={cn("h-3 w-3 transition-transform", statusExpanded && "rotate-180")} />
          </button>

          <span className="text-xs text-muted-foreground ml-auto">{filteredSets.length} / {sets.length} bộ</span>

          {bulkSel.count > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90 transition-colors">
                  <Tags className="h-3.5 w-3.5" />
                  Hành động ({bulkSel.count})
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setBulkDialogOpen(true)}>
                  <GraduationCap className="h-4 w-4 mr-2" /> Gán khoá học...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={bulkSel.clear}>
                  <X className="h-4 w-4 mr-2" /> Bỏ chọn tất cả
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Level chips */}
        {levelExpanded && usedLevels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {usedLevels.map(lvl => {
              const count = sets.filter(s => (s as any).course_level === lvl).length;
              const active = filterLevels.has(lvl);
              return (
                <button key={lvl} onClick={() => toggleFilter(setFilterLevels, lvl)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all",
                    active ? getLevelColor(lvl) : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {lvl} <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Status chips */}
        {statusExpanded && (
          <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200 pl-1">
            {["draft", "published"].map(st => {
              const count = sets.filter(s => s.status === st).length;
              const active = filterStatuses.has(st);
              return (
                <button key={st} onClick={() => toggleFilter(setFilterStatuses, st)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all",
                    active ? "bg-primary/15 text-primary border-primary/30" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {st === "published" ? "Published" : "Nháp"} <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : sets.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Chưa có bộ flashcard nào</p>
          <Button className="mt-4" onClick={createNewSet}><Plus className="h-4 w-4 mr-2" /> Tạo bộ đầu tiên</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-x-auto">
           <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-dark text-dark-foreground text-left">
                <th className="px-3 py-3 w-8">
                  <Checkbox
                    checked={bulkSel.allSelected}
                    onCheckedChange={() => bulkSel.toggleAll()}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Tên bộ</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Mô tả</th>
                <th className="px-4 py-3 font-medium">Số thẻ</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Liên kết</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSets.map(set => {
                const linkedAssessment = (set as any).linked_assessment_id
                  ? assessments.find(a => a.id === (set as any).linked_assessment_id)
                  : null;
                const linkedExercise = (set as any).linked_exercise_id
                  ? exercises.find(e => e.id === (set as any).linked_exercise_id)
                  : null;
                return (
                <tr
                  key={set.id}
                  className={cn(
                    "border-t hover:bg-muted/30 transition-colors",
                    bulkSel.isSelected(set.id) && "bg-primary/5",
                  )}
                >
                  <td className="px-3 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={bulkSel.isSelected(set.id)}
                      onCheckedChange={() => bulkSel.toggle(set.id)}
                      aria-label={`Chọn ${set.title}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{set.title}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {set.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{set.itemCount} thẻ</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                      {linkedAssessment && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium w-fit">
                          <Link2 className="h-3 w-3" />
                          {linkedAssessment.name}
                        </span>
                      )}
                      {linkedExercise && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-md font-medium w-fit">
                          <Layers className="h-3 w-3" />
                          {linkedExercise.title}
                        </span>
                      )}
                      {!linkedAssessment && !linkedExercise && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium w-fit">Chung</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      set.status === "published" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"
                    )}>
                      {set.status === "published" ? "Published" : "Nháp"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEditor(set.id)}>Sửa</Button>
                      <Button size="sm" variant="ghost" onClick={() => togglePublish(set.id, set.status)}>
                        {set.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteSetId(set.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Tên bộ</label>
              <Input value={importTitle} onChange={e => setImportTitle(e.target.value)} placeholder="e.g. IELTS Environment" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Mô tả (tùy chọn)</label>
              <Input value={importDesc} onChange={e => setImportDesc(e.target.value)} placeholder="Từ vựng về môi trường" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Dán dữ liệu (mỗi dòng: từ | nghĩa hoặc từ&#9;nghĩa)</label>
              <Textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={"ubiquitous | Có mặt ở khắp nơi\nmitigate | Giảm nhẹ\nsustainable | Bền vững"}
                rows={8}
              />
              {importText.trim() && (
                <p className="text-xs text-muted-foreground mt-1">
                  {importText.trim().split("\n").filter(l => l.includes("|") || l.includes("\t")).length} thẻ được nhận dạng
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleImportFromDialog} disabled={saving || !importText.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileUp className="h-4 w-4 mr-1" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSetId} onOpenChange={() => setDeleteSetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bộ flashcard</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa bộ flashcard này? Tất cả thẻ trong bộ sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSet} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkCourseAssignDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        kind="flashcard_set"
        resourceIds={bulkSel.selectedIds}
        resourceLabel="bộ flashcard"
        onDone={() => bulkSel.clear()}
      />
    </div>
  );
}
