import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Pencil, Trash2, Upload, Award, Trophy, Star, Zap, Target, Shield,
  Crown, Medal, Flame, Heart, BookOpen, CheckCircle2, Loader2, X, Image,
  Users, GraduationCap, LayoutGrid, List, Sparkles, Eye, MoreHorizontal,
  Download, Search, Flame as FlameIcon,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/components/ui/dialog";
import { Label } from "@shared/components/ui/label";
import { Badge } from "@shared/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { cn } from "@shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { toast } from "sonner";

/* ─── Enhanced UI Constants (from mockup) ─── */

const CAT_META: Record<string, { label: string; color: string }> = {
  milestone: { label: "Cột mốc", color: "rose" },
  streak: { label: "Streak", color: "amber" },
  skill: { label: "Kỹ năng", color: "teal" },
  game: { label: "Trò chơi", color: "violet" },
  recognition: { label: "Vinh danh", color: "rose" },
  behaviour: { label: "Hành vi", color: "sky" },
};

const TIER_META: Record<string, { label: string; ring: string; soft: string }> = {
  bronze: { label: "Bronze", ring: "#C97A3F", soft: "#FBE9D9" },
  silver: { label: "Silver", ring: "#94A0B0", soft: "#EEF1F5" },
  gold: { label: "Gold", ring: "#D9A300", soft: "#FFF1B8" },
  platinum: { label: "Platinum", ring: "#7C3AED", soft: "#EDE6FE" },
};

const COLOR_MAP: Record<string, string> = {
  yellow: "bg-amber-400",
  teal: "bg-teal-500",
  coral: "bg-rose-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
};

// Mock data cho recent awards và hall of fame
const MOCK_RECENT_AWARDS = [
  { who: "Phạm Tuấn Anh", role: "Học viên", badgeId: "B-007", when: "2 phút trước", via: "auto" },
  { who: "Hoàng Minh Phúc", role: "Học viên", badgeId: "B-008", when: "14 phút trước", via: "auto" },
  { who: "Ms. Linh Trần", role: "Giáo viên", badgeId: "B-103", when: "1 giờ trước", via: "admin: Captain Minh" },
  { who: "Vũ Hà Anh", role: "Học viên", badgeId: "B-005", when: "2 giờ trước", via: "auto" },
  { who: "Trần Bảo Trân", role: "Học viên", badgeId: "B-009", when: "3 giờ trước", via: "auto" },
];

const MOCK_HALL_OF_FAME = [
  { rank: 1, name: "Phạm Tuấn Anh", count: 24, color: "rose" },
  { rank: 2, name: "Hoàng Minh Phúc", count: 21, color: "teal" },
  { rank: 3, name: "Trần Bảo Trân", count: 18, color: "amber" },
  { rank: 4, name: "Vũ Hà Anh", count: 16, color: "violet" },
  { rank: 5, name: "Lê Phương Thảo", count: 14, color: "sky" },
];

/* ─── Icon Picker ─── */
const ICON_OPTIONS = [
  { name: "award", icon: Award },
  { name: "trophy", icon: Trophy },
  { name: "star", icon: Star },
  { name: "zap", icon: Zap },
  { name: "target", icon: Target },
  { name: "shield", icon: Shield },
  { name: "crown", icon: Crown },
  { name: "medal", icon: Medal },
  { name: "flame", icon: Flame },
  { name: "heart", icon: Heart },
  { name: "book-open", icon: BookOpen },
  { name: "check-circle", icon: CheckCircle2 },
];

const ICON_MAP: Record<string, any> = Object.fromEntries(ICON_OPTIONS.map(i => [i.name, i.icon]));

const TIER_OPTIONS = [
  { value: "none", label: "Không phân cấp", color: "text-muted-foreground" },
  { value: "bronze", label: "Đồng", color: "text-amber-700" },
  { value: "silver", label: "Bạc", color: "text-slate-400" },
  { value: "gold", label: "Vàng", color: "text-yellow-500" },
];

const CRITERIA_TYPES = [
  { value: "manual", label: "Trao thủ công" },
  { value: "game_score", label: "Điểm game" },
  { value: "activity_streak", label: "Chuỗi hoạt động" },
  { value: "test_count", label: "Số bài thi hoàn thành" },
  { value: "exercise_count", label: "Số bài tập hoàn thành" },
  { value: "study_time", label: "Số thời gian học" },
  { value: "flashcard_mastery", label: "Số flashcard đã thuộc" },
];

const GAME_MODE_OPTIONS = [
  { value: "challenge", label: "Thách đấu" },
  { value: "shooting", label: "Bắn từ" },
  { value: "shark", label: "Cá mập" },
];

interface BadgeRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  tier: string;
  criteria_type: string;
  criteria_config: any;
  status: string;
  created_by: string;
  created_at: string;
}

interface BadgeForm {
  name: string;
  description: string;
  icon: string;
  image_url: string;
  tier: string;
  criteria_type: string;
  criteria_config: {
    game_mode?: string;
    min_score?: number;
    min_streak?: number;
    min_tests?: number;
    min_exercises?: number;
    min_study_minutes?: number;
    min_mastered?: number;
  };
  status: string;
}

const emptyForm: BadgeForm = {
  name: "", description: "", icon: "award", image_url: "", tier: "none",
  criteria_type: "manual", criteria_config: {}, status: "active",
};

export default function BadgeManagementPage() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  /* ─── Enhanced UI State ─── */
  const [tab, setTab] = useState("all");
  const [audience, setAudience] = useState<"student" | "teacher">("student");
  const [view, setView] = useState<"grid" | "rules">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BadgeForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); toast.error("Lỗi tải danh sách huy hiệu"); }
    else setBadges((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (badge: BadgeRow) => {
    setEditingId(badge.id);
    setForm({
      name: badge.name,
      description: badge.description || "",
      icon: badge.icon || "award",
      image_url: badge.image_url || "",
      tier: badge.tier,
      criteria_type: badge.criteria_type,
      criteria_config: (badge.criteria_config as any) || {},
      status: badge.status,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `badges/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("badge-images").upload(path, file);
    if (error) { toast.error("Lỗi upload ảnh"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("badge-images").getPublicUrl(path);
    setForm(prev => ({ ...prev, image_url: publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Vui lòng nhập tên huy hiệu"); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      icon: form.icon || null,
      image_url: form.image_url || null,
      tier: form.tier,
      criteria_type: form.criteria_type,
      criteria_config: form.criteria_config,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from("badges").update(payload).eq("id", editingId);
      if (error) { toast.error("Lỗi cập nhật"); setSaving(false); return; }
      toast.success("Đã cập nhật huy hiệu");
    } else {
      const { error } = await supabase.from("badges").insert({ ...payload, created_by: user!.id });
      if (error) { toast.error("Lỗi tạo huy hiệu"); setSaving(false); return; }
      toast.success("Đã tạo huy hiệu mới");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchBadges();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa huy hiệu"); return; }
    toast.success("Đã xóa huy hiệu");
    setDeleteConfirm(null);
    fetchBadges();
  };

  const getTierBadge = (tier: string) => {
    const t = TIER_OPTIONS.find(o => o.value === tier);
    if (!t || tier === "none") return null;
    return <Badge variant="outline" className={cn("text-[10px]", t.color)}>{t.label}</Badge>;
  };

  const renderBadgeIcon = (badge: BadgeRow) => {
    if (badge.image_url) {
      return <img src={badge.image_url} alt={badge.name} className="h-10 w-10 rounded-lg object-cover" />;
    }
    const Icon = ICON_MAP[badge.icon || "award"] || Award;
    const tierColor = badge.tier === "gold" ? "text-yellow-500" : badge.tier === "silver" ? "text-slate-400" : badge.tier === "bronze" ? "text-amber-700" : "text-primary";
    return (
      <div className={cn("h-10 w-10 rounded-lg bg-muted flex items-center justify-center", tierColor)}>
        <Icon className="h-5 w-5" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Enhanced filters
  const filteredBadges = badges.filter(b => {
    if (b.criteria_type === "manual" && b.audience !== audience) return false;
    if (tab === "all") return true;
    if (tab === "inactive") return b.status !== "active";
    // Try to infer category from criteria_type or icon
    const cat = inferCategory(b);
    return cat === tab;
  }).filter(b => {
    if (!searchQuery.trim()) return true;
    return b.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalEarned = 4182; // Mock - sẽ lấy từ API
  const activeCount = badges.filter(b => b.status === "active").length;
  const studentBadges = badges.filter(b => b.criteria_type === "manual" || b.audience === "student").length;
  const teacherBadges = badges.filter(b => b.audience === "teacher").length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Người dùng · Badges & Achievements
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold">
            Huy hiệu & <span className="text-rose-500">vinh danh</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {badges.length} huy hiệu · {activeCount} đang phát hành · {totalEarned.toLocaleString("vi-VN")} lượt nhận · cập nhật realtime
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Trao thủ công
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Tạo huy hiệu
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCardEnhanced
          label="Tổng huy hiệu"
          value={String(badges.length)}
          sub={`${studentBadges} HV · ${teacherBadges} GV`}
          color="rose"
          icon={Award}
        />
        <StatCardEnhanced
          label="Lượt trao tháng"
          value="4,182"
          sub="+18% so với tháng trước"
          color="teal"
          icon={Sparkles}
        />
        <StatCardEnhanced
          label="Tỉ lệ active"
          value="67%"
          sub="HV nhận ≥1 badge / tuần"
          color="amber"
          icon={FlameIcon}
        />
        <StatCardEnhanced
          label="Top streak"
          value="184d"
          sub="Phạm Tuấn Anh"
          color="violet"
          icon={Star}
        />
      </div>

      {/* Audience Toggle + View Toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <Button
            variant={audience === "student" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setAudience("student")}
          >
            <Users className="h-3.5 w-3.5" /> Học viên ({studentBadges})
          </Button>
          <Button
            variant={audience === "teacher" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setAudience("teacher")}
          >
            <GraduationCap className="h-3.5 w-3.5" /> Giáo viên ({teacherBadges})
          </Button>
        </div>
        <div className="flex-1" />
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Bộ sưu tập
          </Button>
          <Button
            variant={view === "rules" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setView("rules")}
          >
            <List className="h-3.5 w-3.5" /> Bảng rules
          </Button>
        </div>
      </div>

      {/* Category Tabs + Search */}
      <div className="flex flex-wrap gap-2 items-center">
        {[
          { id: "all", label: "Tất cả" },
          ...Object.entries(CAT_META).map(([k, v]) => ({ id: k, label: v.label })),
          { id: "inactive", label: "Tạm tắt" },
        ].map(t => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {tab === t.id && <span className="ml-1.5 text-[10px]">({filteredBadges.length})</span>}
          </Button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm huy hiệu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs w-48"
          />
        </div>
      </div>

      {/* Content */}
      {badges.length === 0 ? (
        <div className="bg-card rounded-xl border-2 p-12 text-center">
          <Award className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Chưa có huy hiệu nào</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Tạo huy hiệu đầu tiên
          </Button>
        </div>
      ) : view === "grid" ? (
        <GridViewEnhanced 
          badges={filteredBadges} 
          onEdit={openEdit} 
          onDelete={(id) => setDeleteConfirm(id)} 
        />
      ) : (
        <RulesViewEnhanced 
          badges={filteredBadges} 
          onEdit={openEdit} 
          onDelete={(id) => setDeleteConfirm(id)} 
        />
      )}

      {/* Recent Awards & Hall of Fame */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentAwardsSection badges={badges} />
        <HallOfFameSection />
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Chỉnh sửa huy hiệu" : "Tạo huy hiệu mới"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label>Tên huy hiệu *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="VD: Chiến binh từ vựng" />
            </div>

            {/* Description */}
            <div>
              <Label>Mô tả</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả điều kiện nhận huy hiệu..." rows={2} />
            </div>

            {/* Icon picker */}
            <div>
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ICON_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, icon: opt.name }))}
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center border-2 transition-all",
                        form.icon === opt.name ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-muted text-muted-foreground hover:border-muted-foreground/30"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image upload */}
            <div>
              <Label>Ảnh huy hiệu (tuỳ chọn)</Label>
              {form.image_url ? (
                <div className="mt-1 flex items-center gap-3">
                  <img src={form.image_url} alt="Badge" className="h-14 w-14 rounded-lg object-cover border" />
                  <Button size="sm" variant="outline" onClick={() => setForm(p => ({ ...p, image_url: "" }))}>
                    <X className="h-3 w-3 mr-1" /> Xóa ảnh
                  </Button>
                </div>
              ) : (
                <label className="mt-1 flex items-center gap-2 cursor-pointer">
                  <Button size="sm" variant="outline" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Image className="h-4 w-4 mr-1" />}
                      {uploading ? "Đang upload..." : "Upload ảnh"}
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </label>
              )}
            </div>

            {/* Tier */}
            <div>
              <Label>Cấp độ</Label>
              <Select value={form.tier} onValueChange={v => setForm(p => ({ ...p, tier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className={t.color}>{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criteria type */}
            <div>
              <Label>Điều kiện nhận</Label>
              <Select value={form.criteria_type} onValueChange={v => setForm(p => ({ ...p, criteria_type: v, criteria_config: {} }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRITERIA_TYPES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criteria config — dynamic fields */}
            {form.criteria_type === "game_score" && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-xl">
                <div>
                  <Label className="text-xs">Game</Label>
                  <Select
                    value={form.criteria_config.game_mode || ""}
                    onValueChange={v => setForm(p => ({ ...p, criteria_config: { ...p.criteria_config, game_mode: v } }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Chọn game" /></SelectTrigger>
                    <SelectContent>
                      {GAME_MODE_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Điểm tối thiểu</Label>
                  <Input
                    type="number" min={1}
                    value={form.criteria_config.min_score || ""}
                    onChange={e => setForm(p => ({ ...p, criteria_config: { ...p.criteria_config, min_score: Number(e.target.value) } }))}
                    placeholder="VD: 20"
                  />
                </div>
              </div>
            )}

            {form.criteria_type === "activity_streak" && (
              <div className="p-3 bg-muted/50 rounded-xl">
                <Label className="text-xs">Số ngày liên tiếp tối thiểu</Label>
                <Input
                  type="number" min={1}
                  value={form.criteria_config.min_streak || ""}
                  onChange={e => setForm(p => ({ ...p, criteria_config: { ...p.criteria_config, min_streak: Number(e.target.value) } }))}
                  placeholder="VD: 7"
                />
              </div>
            )}

            {form.criteria_type === "test_count" && (
              <div className="p-3 bg-muted/50 rounded-xl">
                <Label className="text-xs">Số bài thi hoàn thành tối thiểu</Label>
                <Input
                  type="number" min={1}
                  value={form.criteria_config.min_tests || ""}
                  onChange={e => setForm(p => ({ ...p, criteria_config: { ...p.criteria_config, min_tests: Number(e.target.value) } }))}
                  placeholder="VD: 10"
                />
              </div>
            )}

            {form.criteria_type === "exercise_count" && (
              <div className="p-3 bg-muted/50 rounded-xl">
                <Label className="text-xs">Số bài tập hoàn thành tối thiểu</Label>
                <Input
                  type="number" min={1}
                  value={form.criteria_config.min_exercises || ""}
                  onChange={e => setForm(p => ({ ...p, criteria_config: { ...p.criteria_config, min_exercises: Number(e.target.value) } }))}
                  placeholder="VD: 30"
                />
              </div>
            )}

            {form.criteria_type === "study_time" && (
              <div className="p-3 bg-muted/50 rounded-xl">
                <Label className="text-xs">Số phút học tối thiểu</Label>
                <Input
                  type="number" min={1}
                  value={form.criteria_config.min_study_minutes || ""}
                  onChange={e => setForm(p => ({ ...p, criteria_config: { ...p.criteria_config, min_study_minutes: Number(e.target.value) } }))}
                  placeholder="VD: 600 (= 10 giờ)"
                />
                {form.criteria_config.min_study_minutes && form.criteria_config.min_study_minutes > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    = {Math.floor(form.criteria_config.min_study_minutes / 60)} giờ {form.criteria_config.min_study_minutes % 60} phút
                  </p>
                )}
              </div>
            )}

            {form.criteria_type === "flashcard_mastery" && (
              <div className="p-3 bg-muted/50 rounded-xl">
                <Label className="text-xs">Số flashcard đã thuộc tối thiểu</Label>
                <Input
                  type="number" min={1}
                  value={form.criteria_config.min_mastered || ""}
                  onChange={e => setForm(p => ({ ...p, criteria_config: { ...p.criteria_config, min_mastered: Number(e.target.value) } }))}
                  placeholder="VD: 50"
                />
              </div>
            )}

            {/* Status */}
            <div>
              <Label>Trạng thái</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang dùng</SelectItem>
                  <SelectItem value="inactive">Tắt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Cập nhật" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa huy hiệu?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Huy hiệu sẽ bị xóa vĩnh viễn, kể cả các huy hiệu đã trao cho học viên.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Helper Components ─── */

function inferCategory(badge: BadgeRow): string {
  const criteria = badge.criteria_type;
  const icon = badge.icon || "";
  if (criteria === "activity_streak") return "streak";
  if (criteria === "game_score") return "game";
  if (criteria === "test_count" || criteria === "exercise_count" || criteria === "flashcard_mastery") return "skill";
  if (icon.includes("flame") || icon.includes("fire")) return "streak";
  if (icon.includes("star") || icon.includes("award")) return "milestone";
  return "milestone";
}

function BadgeSticker({ badge, size = 72 }: { badge: BadgeRow; size?: number }) {
  const tier = TIER_META[badge.tier] || TIER_META.bronze;
  const Icon = ICON_MAP[badge.icon || "award"] || Award;
  const colorKey = inferColorKey(badge);
  const bgColor = COLOR_MAP[colorKey] || "bg-slate-500";
  const rotation = ((badge.id.charCodeAt(0) % 7) - 3);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Outer ring */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 border-slate-800 shadow-md flex items-center justify-center",
          bgColor
        )}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div
          className="rounded-full bg-white border-2 border-dashed border-slate-800 flex items-center justify-center"
          style={{ width: size * 0.6, height: size * 0.6 }}
        >
          <Icon className="h-5 w-5 text-slate-800" />
        </div>
      </div>
      {/* Tier ribbon */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-800"
        style={{ background: tier.ring }}
      >
        {tier.label}
      </div>
    </div>
  );
}

function inferColorKey(badge: BadgeRow): string {
  if (badge.icon?.includes("flame") || badge.icon?.includes("fire")) return "yellow";
  if (badge.icon?.includes("star") || badge.icon?.includes("award")) return "coral";
  if (badge.icon?.includes("book")) return "teal";
  if (badge.icon?.includes("zap") || badge.icon?.includes("bolt")) return "violet";
  return "yellow";
}

function StatCardEnhanced({ label, value, sub, color, icon: Icon }: {
  label: string;
  value: string;
  sub: string;
  color: "rose" | "teal" | "amber" | "violet";
  icon: typeof Award;
}) {
  const colorMap = {
    rose: "bg-rose-50 border-rose-200 text-rose-600",
    teal: "bg-teal-50 border-teal-200 text-teal-600",
    amber: "bg-amber-50 border-amber-200 text-amber-600",
    violet: "bg-violet-50 border-violet-200 text-violet-600",
  };

  return (
    <div className={cn("rounded-xl border-2 p-4", colorMap[color])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="font-display text-3xl font-extrabold">{value}</div>
      <div className="text-xs font-medium mt-1 opacity-80">{sub}</div>
    </div>
  );
}

function GridViewEnhanced({ badges, onEdit, onDelete }: {
  badges: BadgeRow[];
  onEdit: (b: BadgeRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {badges.map(b => {
        const cat = CAT_META[inferCategory(b)] || { label: "Khác", color: "slate" };
        const tier = TIER_META[b.tier] || TIER_META.bronze;
        const earned = Math.floor(Math.random() * 1000) + 10; // Mock - sẽ lấy từ API

        return (
          <div
            key={b.id}
            className={cn(
              "rounded-xl border-2 bg-card p-4 flex flex-col",
              b.status !== "active" && "opacity-55"
            )}
          >
            {b.status !== "active" && (
              <div className="absolute top-2 right-2 bg-slate-800 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                Tạm tắt
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <BadgeSticker badge={b} size={56} />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm truncate">{b.name}</div>
                <code className="text-[10px] text-muted-foreground">{b.id.slice(0, 6)}</code>
                <div className="flex gap-1 mt-1">
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", `bg-${cat.color}-100 text-${cat.color}-700 border-${cat.color}-200`)}>
                    {cat.label}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                    style={{ background: tier.soft, color: tier.ring, borderColor: tier.ring }}
                  >
                    {tier.label}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3 flex-1 line-clamp-2">
              <span className="font-semibold text-foreground">Điều kiện:</span> {b.description || "—"}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-dashed">
              <div>
                <div className="font-display font-bold text-lg">{earned.toLocaleString("vi-VN")}</div>
                <div className="text-[9px] font-bold uppercase text-muted-foreground">lượt nhận</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onEdit(b)}>
                  <Eye className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onEdit(b)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RulesViewEnhanced({ badges, onEdit, onDelete }: {
  badges: BadgeRow[];
  onEdit: (b: BadgeRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border-2 bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left">Huy hiệu</th>
            <th className="px-4 py-3 text-left">Loại</th>
            <th className="px-4 py-3 text-left">Tier</th>
            <th className="px-4 py-3 text-left">Điều kiện</th>
            <th className="px-4 py-3 text-right">Lượt nhận</th>
            <th className="px-4 py-3 text-center">Trạng thái</th>
            <th className="px-4 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {badges.map(b => {
            const cat = CAT_META[inferCategory(b)] || { label: "Khác", color: "slate" };
            const tier = TIER_META[b.tier] || TIER_META.bronze;
            const earned = Math.floor(Math.random() * 1000) + 10; // Mock

            return (
              <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <BadgeSticker badge={b} size={40} />
                    <div>
                      <div className="font-bold text-sm">{b.name}</div>
                      <code className="text-[10px] text-muted-foreground">{b.id.slice(0, 6)}</code>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", `bg-${cat.color}-100 text-${cat.color}-700`)}>
                    {cat.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ background: tier.soft, color: tier.ring, borderColor: tier.ring }}
                  >
                    {tier.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[300px] truncate">
                  {b.description || "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold">{earned.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                    b.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {b.status === "active" ? "active" : "paused"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(b)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(b.id)}>
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecentAwardsSection({ badges }: { badges: BadgeRow[] }) {
  const getBadgeById = (id: string) => badges.find(b => b.id.startsWith(id)) || badges[0];

  return (
    <div className="lg:col-span-2 rounded-xl border-2 bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hoạt động gần đây</p>
          <h3 className="font-display text-lg font-bold">15 huy hiệu vừa được trao hôm nay</h3>
        </div>
        <Button variant="outline" size="sm">Xem tất cả</Button>
      </div>
      <div className="space-y-2">
        {MOCK_RECENT_AWARDS.map((a, i) => {
          const badge = getBadgeById(a.badgeId);
          const colorKey = inferColorKey(badge);
          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
              <BadgeSticker badge={badge} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-bold">{a.who}</span>
                  <span className="text-muted-foreground"> nhận </span>
                  <span className={cn("font-bold", `text-${colorKey}-600`)}>{badge?.name || a.badgeId}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{a.role} · {a.when} · qua {a.via}</div>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HallOfFameSection() {
  return (
    <div className="rounded-xl border-2 bg-gradient-to-br from-amber-50 to-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top huy hiệu tháng</p>
      <h3 className="font-display text-base font-bold mb-3">Hall of Fame · 04/26</h3>
      <div className="space-y-2">
        {MOCK_HALL_OF_FAME.map(t => (
          <div key={t.rank} className="flex items-center gap-3 py-2 border-b border-dashed last:border-0">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border border-slate-800 text-white",
                COLOR_MAP[t.color] || "bg-slate-500"
              )}
            >
              {t.rank}
            </div>
            <div className="flex-1 font-bold text-sm truncate">{t.name}</div>
            <div className="font-mono font-bold">{t.count} <span className="text-[10px] text-muted-foreground">badges</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
