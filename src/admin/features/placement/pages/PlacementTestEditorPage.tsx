import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { Badge } from "@shared/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  ArrowLeft, Save, Loader2, BookOpen, Headphones, PenTool, Mic, Plus, Trash2, ExternalLink, Edit, CheckCircle2, Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UnsavedChangesDialog from "@admin/features/tests/components/UnsavedChangesDialog";

const SKILL_OPTIONS = ["reading", "listening", "writing", "speaking"] as const;
const SKILL_LABELS: Record<string, string> = {
  reading: "Reading", listening: "Listening", writing: "Writing", speaking: "Speaking",
};
const SKILL_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen className="h-4 w-4" />,
  listening: <Headphones className="h-4 w-4" />,
  writing: <PenTool className="h-4 w-4" />,
  speaking: <Mic className="h-4 w-4" />,
};

interface Assessment {
  id: string;
  name: string;
  section_type: string;
  book_name: string | null;
  total_questions: number;
  duration: number;
  status: string;
}

interface SectionDraft {
  skill: string;
  assessment_id: string;
}

export default function PlacementTestEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [skills, setSkills] = useState<string[]>(["reading", "listening"]);
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [allowRetake, setAllowRetake] = useState(false);
  const [linkExpiryHours, setLinkExpiryHours] = useState<number | null>(null);
  const [status, setStatus] = useState("draft");
  const [activeTab, setActiveTab] = useState("settings");

  const [isDirty, setIsDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) { loadedRef.current = true; return; }
    setIsDirty(true);
  }, [name, description, duration, skills, sections, showResults, allowRetake, linkExpiryHours, status]);

  // Browser beforeunload warning
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Load assessments
  useEffect(() => {
    supabase.from("assessments").select("id, name, section_type, book_name, total_questions, duration, status")
      .then(({ data }) => setAssessments((data as any[]) || []));
  }, []);

  // Load existing test
  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      const [testRes, sectionsRes] = await Promise.all([
        supabase.from("placement_tests").select("*").eq("id", id!).single(),
        supabase.from("placement_test_sections").select("*").eq("placement_test_id", id!).order("sort_order"),
      ]);
      if (testRes.data) {
        const t = testRes.data as any;
        setName(t.name);
        setDescription(t.description || "");
        setDuration(Math.round(t.duration / 60));
        setSkills(Array.isArray(t.skills) ? t.skills : ["reading", "listening"]);
        setShowResults(t.show_results);
        setAllowRetake(t.allow_retake);
        setLinkExpiryHours(t.link_expiry_hours);
        setStatus(t.status);
      }
      if (sectionsRes.data) {
        setSections((sectionsRes.data as any[]).map(s => ({ skill: s.skill, assessment_id: s.assessment_id })));
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  const toggleSkill = (skill: string) => {
    setSkills(prev => {
      if (prev.includes(skill)) {
        setSections(s => s.filter(sec => sec.skill !== skill));
        return prev.filter(s => s !== skill);
      }
      return [...prev, skill];
    });
  };


  const removeSection = (skill: string) => {
    setSections(prev => prev.filter(s => s.skill !== skill));
  };

  const handleBack = () => {
    if (isDirty) {
      setShowExitDialog(true);
    } else {
      navigate("/placement");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Tên đề thi là bắt buộc"); return; }
    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      skills,
      status,
      show_results: showResults,
      allow_retake: allowRetake,
      link_expiry_hours: linkExpiryHours,
      duration: duration * 60,
    };

    let testId = isNew ? null : id;

    if (testId) {
      const { error } = await supabase.from("placement_tests").update(payload as any).eq("id", testId);
      if (error) { toast.error("Lỗi cập nhật"); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("placement_tests").insert(payload as any).select("id").single();
      if (error || !data) { toast.error("Lỗi tạo mới"); setSaving(false); return; }
      testId = (data as any).id;
    }

    // Update sections
    await supabase.from("placement_test_sections").delete().eq("placement_test_id", testId as any);
    if (sections.length > 0) {
      const rows = sections.map((s, i) => ({
        placement_test_id: testId,
        assessment_id: s.assessment_id,
        skill: s.skill,
        sort_order: i,
      }));
      await supabase.from("placement_test_sections").insert(rows as any);
    }

    toast.success("Đã lưu đề thi");
    setSaving(false);
    setIsDirty(false);

    if (isNew && testId) {
      navigate(`/placement/${testId}`, { replace: true });
    }
  };

  const handleSaveAndExit = async () => {
    setShowExitDialog(false);
    await handleSave();
    navigate("/placement");
  };

  const handleDiscard = () => {
    setShowExitDialog(false);
    setIsDirty(false);
    navigate("/placement");
  };


  const getAssessmentInfo = (assessmentId: string) => {
    return assessments.find(a => a.id === assessmentId);
  };

  const handleCreateAssessmentForSkill = async (skill: string) => {
    // Auto-save placement test first if new
    let testId = isNew ? null : id;
    if (!testId) {
      if (!name.trim()) { toast.error("Vui lòng nhập tên đề thi trước"); return; }
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        skills, status,
        show_results: showResults,
        allow_retake: allowRetake,
        link_expiry_hours: linkExpiryHours,
        duration: duration * 60,
      };
      const { data, error } = await supabase.from("placement_tests").insert(payload as any).select("id").single();
      setSaving(false);
      if (error || !data) { toast.error("Lỗi tạo đề thi"); return; }
      testId = (data as any).id;
      setIsDirty(false);
      // Update URL to the new ID
      navigate(`/placement/${testId}`, { replace: true });
    }
    const sectionType = skill.toUpperCase();
    const returnUrl = `/placement/${testId}`;
    navigate(`/tests/new?placementId=${testId}&skill=${skill}&sectionType=${sectionType}&returnTo=${encodeURIComponent(returnUrl)}`);
  };

  const navigateToEditAssessment = (assessmentId: string, skill: string) => {
    const returnUrl = `/placement/${id}`;
    navigate(`/tests/${assessmentId}?placementId=${id}&skill=${skill}&returnTo=${encodeURIComponent(returnUrl)}`);
  };

  const totalQuestions = sections.reduce((sum, s) => sum + (getAssessmentInfo(s.assessment_id)?.total_questions || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header — matching TestEditorPage */}
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-extrabold flex items-center gap-2">
            {isNew ? "Tạo đề thi sắp lớp" : "Chỉnh sửa đề thi sắp lớp"}
            {totalQuestions > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                {totalQuestions} câu hỏi
              </span>
            )}
          </h1>
          {!isNew && name && (
            <p className="text-sm text-muted-foreground mt-0.5">{name}</p>
          )}
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-28 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="published">Xuất bản</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-2 rounded-xl" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="settings" className="gap-1.5 rounded-lg">
            <Settings2 className="h-3.5 w-3.5" /> Cài đặt
          </TabsTrigger>
          {skills.map(skill => (
            <TabsTrigger key={skill} value={skill} className="gap-1.5 rounded-lg capitalize">
              {SKILL_ICONS[skill]}
              {SKILL_LABELS[skill]}
              {sections.find(s => s.skill === skill) && (
                <CheckCircle2 className="h-3 w-3 text-green-500 ml-0.5" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {/* Basic Info */}
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <h2 className="font-bold text-sm">Thông tin cơ bản</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tên đề thi *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Placement Test - Tháng 4" className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Mô tả</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả ngắn..." className="rounded-xl" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Thời gian (phút)</label>
                <Input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value || "60"))} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Hạn link (giờ)</label>
                <Input
                  type="number"
                  value={linkExpiryHours || ""}
                  onChange={e => setLinkExpiryHours(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Để trống = vô hạn"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <h2 className="font-bold text-sm">Tùy chọn</h2>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={showResults} onCheckedChange={setShowResults} />
                <Label className="text-sm">Hiện kết quả cho prospect</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={allowRetake} onCheckedChange={setAllowRetake} />
                <Label className="text-sm">Cho phép thi lại</Label>
              </div>
            </div>
          </div>

          {/* Skills Selection */}
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <div>
              <h2 className="font-bold text-sm">Kỹ năng kiểm tra</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Chọn các kỹ năng cần đánh giá. Mỗi kỹ năng sẽ có một tab riêng để gắn đề thi.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {SKILL_OPTIONS.map(skill => {
                const selected = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {SKILL_ICONS[skill]}
                    {SKILL_LABELS[skill]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {sections.length > 0 && (
            <div className="bg-card rounded-xl border p-5 space-y-3">
              <h2 className="font-bold text-sm">Tóm tắt đề thi</h2>
              {sections.map((sec, i) => {
                const assessment = getAssessmentInfo(sec.assessment_id);
                return (
                  <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      {SKILL_ICONS[sec.skill]}
                      <span className="font-medium text-sm">{SKILL_LABELS[sec.skill]}</span>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{assessment?.name || "—"}</p>
                      {assessment && (
                        <p className="text-xs text-muted-foreground">
                          {assessment.total_questions} câu • {Math.floor(assessment.duration / 60)} phút
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t text-sm font-semibold">
                <span>Tổng cộng</span>
                <span>
                  {totalQuestions} câu
                  {" • "}
                  {sections.reduce((sum, s) => sum + Math.floor((getAssessmentInfo(s.assessment_id)?.duration || 0) / 60), 0)} phút
                </span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Skill Tabs */}
        {skills.map(skill => {
          const currentSection = sections.find(s => s.skill === skill);
          const selectedAssessment = currentSection ? getAssessmentInfo(currentSection.assessment_id) : null;

          return (
            <TabsContent key={skill} value={skill} className="space-y-4 mt-4">
              <div className="bg-card rounded-xl border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    {SKILL_ICONS[skill]}
                    Đề thi {SKILL_LABELS[skill]}
                  </h2>
                </div>

                {/* Current linked assessment */}
                {selectedAssessment ? (
                  <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{selectedAssessment.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedAssessment.total_questions} câu hỏi • {Math.floor(selectedAssessment.duration / 60)} phút
                          {selectedAssessment.book_name && ` • ${selectedAssessment.book_name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={selectedAssessment.status === "published" ? "default" : "secondary"} className="text-xs">
                          {selectedAssessment.status === "published" ? "Published" : "Draft"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => navigateToEditAssessment(selectedAssessment.id, skill)}
                          title="Chỉnh sửa đề thi"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => removeSection(skill)}
                          title="Xóa đề thi"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-4">
                    <div className="flex justify-center text-muted-foreground">
                      {SKILL_ICONS[skill]}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chưa có đề thi nào cho {SKILL_LABELS[skill]}
                    </p>
                    <Button
                      className="gap-2 rounded-xl"
                      onClick={() => handleCreateAssessmentForSkill(skill)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Tạo đề thi mới
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <UnsavedChangesDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onSaveAndExit={handleSaveAndExit}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
