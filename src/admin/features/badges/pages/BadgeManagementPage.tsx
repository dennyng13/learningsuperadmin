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
  color?: string; // badge display color (yellow, teal, coral, violet, sky)
  audience?: string; // student | teacher
  active?: boolean; // status flag for UI display
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
      {/* Header - matching mockup BadgeHero */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
            Người dùng · Badges & Achievements
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight">
            Huy hiệu & <span style={{ color: "#FA7D64" }}>vinh danh</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            {badges.length} huy hiệu · {activeCount} đang phát hành · {totalEarned.toLocaleString("vi-VN")} lượt nhận tới hôm nay · cập nhật realtime
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* pop-btn white */}
          <button 
            className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-white border-2 border-slate-800 hover:bg-slate-50 transition-colors"
            style={{ boxShadow: "2px 2px 0 0 #0f172a" }}
          >
            <Download className="h-3.5 w-3.5" /> Export thống kê
          </button>
          {/* pop-btn yellow */}
          <button 
            className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border-2 border-slate-800 transition-colors hover:brightness-95"
            style={{ 
              backgroundColor: "#FCD34D", 
              boxShadow: "2px 2px 0 0 #0f172a",
              color: "#0f172a"
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Trao thủ công
          </button>
          {/* pop-btn coral */}
          <button 
            className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border-2 border-slate-800 transition-colors hover:brightness-95"
            style={{ 
              backgroundColor: "#FA7D64", 
              boxShadow: "2px 2px 0 0 #0f172a",
              color: "#fff"
            }}
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5" /> Tạo huy hiệu
          </button>
        </div>
      </div>

      {/* KPI Stats - pop-card kpi style matching mockup exactly */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "Tổng huy hiệu", v: String(badges.length), sub: `${studentBadges} HV · ${teacherBadges} GV`, color: "coral", icon: Award },
          { l: "Lượt trao tháng", v: "4,182", sub: "+18% so với tháng trước", color: "teal", icon: Sparkles },
          { l: "Tỉ lệ active", v: "67%", sub: "HV nhận ≥1 badge / tuần", color: "yellow", icon: FlameIcon },
          { l: "Top streak", v: "184d", sub: "Phạm Tuấn Anh", color: "violet", icon: Star },
        ].map(k => {
          // Color config matching mockup CSS variables
          const colorConfig = {
            coral: { 
              bg: "#FA7D64", 
              soft: "#FEF2F2", 
              text: "#BE123C",
              border: "#FECDD3"
            },
            teal: { 
              bg: "#14B8A6", 
              soft: "#F0FDFA", 
              text: "#0F766E",
              border: "#99F6E4"
            },
            yellow: { 
              bg: "#FCD34D", 
              soft: "#FEFCE8", 
              text: "#A16207",
              border: "#FEF08A"
            },
            violet: { 
              bg: "#8B5CF6", 
              soft: "#FAF5FF", 
              text: "#6B21A8",
              border: "#E9D5FF"
            },
          }[k.color];
          const Icon = k.icon;
          return (
            <div
              key={k.l}
              className="rounded-xl border-2 border-slate-800 p-4 min-h-[130px] transition-transform hover:-translate-y-0.5"
              style={{ 
                backgroundColor: colorConfig.soft,
                boxShadow: "4px 4px 0 0 #0f172a"
              }}
            >
              <div className="flex justify-between items-start">
                <span 
                  className="text-[10px] font-extrabold uppercase tracking-wider"
                  style={{ color: colorConfig.text }}
                >
                  {k.l}
                </span>
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-slate-800"
                  style={{ 
                    backgroundColor: colorConfig.bg,
                    color: k.color === "yellow" ? "#0f172a" : "#fff"
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div 
                className="font-display text-[38px] font-black tracking-tight mt-3.5 leading-none"
                style={{ color: colorConfig.text }}
              >
                {k.v}
              </div>
              <div 
                className="text-[11px] font-bold mt-1.5"
                style={{ color: colorConfig.text, opacity: 0.85 }}
              >
                {k.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Audience Toggle + View Toggle - page-tabs style */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg border-2 border-slate-800 bg-white overflow-hidden shadow-[2px_2px_0_0_#0f172a]">
          <button
            className={cn(
              "px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors",
              audience === "student" 
                ? "bg-slate-800 text-white" 
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => setAudience("student")}
          >
            <Users className="h-3.5 w-3.5" /> Học viên ({studentBadges})
          </button>
          <div className="w-px bg-slate-800" />
          <button
            className={cn(
              "px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors",
              audience === "teacher" 
                ? "bg-slate-800 text-white" 
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => setAudience("teacher")}
          >
            <GraduationCap className="h-3.5 w-3.5" /> Giáo viên ({teacherBadges})
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex rounded-lg border-2 border-slate-800 bg-white overflow-hidden shadow-[2px_2px_0_0_#0f172a]">
          <button
            className={cn(
              "px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors",
              view === "grid" 
                ? "bg-slate-800 text-white" 
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Bộ sưu tập
          </button>
          <div className="w-px bg-slate-800" />
          <button
            className={cn(
              "px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors",
              view === "rules" 
                ? "bg-slate-800 text-white" 
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => setView("rules")}
          >
            <List className="h-3.5 w-3.5" /> Bảng rules
          </button>
        </div>
      </div>

      {/* Category Tabs + Search - table-toolbar style */}
      <div className="flex flex-wrap gap-2 items-center p-2 bg-white rounded-xl border-2 border-slate-800 shadow-[2px_2px_0_0_#0f172a]">
        {[
          { id: "all", label: "Tất cả" },
          ...Object.entries(CAT_META).map(([k, v]) => ({ id: k, label: v.label })),
          { id: "inactive", label: "Tạm tắt" },
        ].map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                isActive
                  ? "bg-slate-800 text-white shadow-[2px_2px_0_0_#0f172a]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {isActive && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  {filteredBadges.length}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Tìm huy hiệu…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs w-48 border-2 border-slate-200 focus:border-slate-800"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-amber-50/50 rounded-2xl border-2 border-slate-800 p-6 shadow-[4px_4px_0_0_#0f172a]">
        {badges.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center">
            <Award className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Chưa có huy hiệu nào</p>
            <Button 
              className="mt-4 bg-rose-500 hover:bg-rose-600 text-white border-2 border-rose-600 shadow-[2px_2px_0_0_#e11d48]" 
              onClick={openCreate}
            >
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
      </div>

      {/* Recent Awards & Hall of Fame */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-[18px]">
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

// Hard shadow style matching template
const HARD_SHADOW = "shadow-[4px_4px_0_0_#0f172a]";
const HARD_SHADOW_SM = "shadow-[2px_2px_0_0_#0f172a]";

// Color mapping for badge outer ring - matches mockup CAT_META colors
const BADGE_COLOR_MAP: Record<string, string> = {
  yellow: "#FCD34D", // amber-300
  teal: "#14B8A6",   // teal-500
  coral: "#FA7D64",  // coral/rose
  violet: "#8B5CF6", // violet-500
  sky: "#0EA5E9",    // sky-500
};

function getBadgeColor(badge: BadgeRow): string {
  // 1. Use explicit badge color if available
  if (badge.color && BADGE_COLOR_MAP[badge.color]) {
    return BADGE_COLOR_MAP[badge.color];
  }
  // 2. Infer from category
  const cat = inferCategory(badge);
  const catMeta = CAT_META[cat];
  if (catMeta?.color && BADGE_COLOR_MAP[catMeta.color]) {
    return BADGE_COLOR_MAP[catMeta.color];
  }
  // 3. Fallback based on icon
  if (badge.icon?.includes("flame") || badge.icon?.includes("fire")) return BADGE_COLOR_MAP.yellow;
  if (badge.icon?.includes("star") || badge.icon?.includes("award")) return BADGE_COLOR_MAP.coral;
  if (badge.icon?.includes("book") || badge.icon?.includes("check")) return BADGE_COLOR_MAP.teal;
  if (badge.icon?.includes("zap") || badge.icon?.includes("bolt")) return BADGE_COLOR_MAP.violet;
  return BADGE_COLOR_MAP.yellow;
}

function BadgeSticker({ badge, size = 88 }: { badge: BadgeRow; size?: number }) {
  const tier = TIER_META[badge.tier] || TIER_META.bronze;
  const Icon = ICON_MAP[badge.icon || "award"] || Award;
  const bgColor = getBadgeColor(badge);
  const rotation = ((badge.id.charCodeAt(0) % 7) - 3);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Outer ring - sticker style with thick border and hard shadow */}
      <div
        className="absolute inset-0 rounded-full border-[3px] border-slate-800 flex items-center justify-center"
        style={{ 
          backgroundColor: bgColor,
          boxShadow: "4px 4px 0 0 #0f172a",
          transform: `rotate(${rotation}deg)` 
        }}
      >
        {/* Inner dashed circle */}
        <div
          className="rounded-full bg-white border-[3px] border-dashed border-slate-800 flex items-center justify-center"
          style={{ width: size * 0.66, height: size * 0.66 }}
        >
          <Icon className="text-slate-800" style={{ width: size * 0.32, height: size * 0.32 }} />
        </div>
      </div>
      {/* Tier ribbon - small badge */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-white text-[9px] font-black uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border-[2px] border-slate-800"
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

// Category color mapping for badges
const CAT_COLOR_STYLES: Record<string, { bg: string; text: string }> = {
  coral: { bg: "#FEF2F2", text: "#BE123C" },
  yellow: { bg: "#FEFCE8", text: "#A16207" },
  teal: { bg: "#F0FDFA", text: "#0F766E" },
  violet: { bg: "#FAF5FF", text: "#6B21A8" },
  sky: { bg: "#F0F9FF", text: "#0369A1" },
  rose: { bg: "#FFF1F2", text: "#9F1239" },
  slate: { bg: "#F8FAFC", text: "#475569" },
};

function GridViewEnhanced({ badges, onEdit, onDelete }: {
  badges: BadgeRow[];
  onEdit: (b: BadgeRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[18px]">
      {badges.map((b) => {
        const cat = CAT_META[inferCategory(b)] || { label: "Khác", color: "slate" };
        const tier = TIER_META[b.tier] || TIER_META.bronze;
        const earned = Math.floor(Math.random() * 1000) + 10; // Mock - sẽ lấy từ API
        const badgeColor = getBadgeColor(b);
        const catColors = CAT_COLOR_STYLES[cat.color] || CAT_COLOR_STYLES.slate;

        return (
          <div
            key={b.id}
            className="relative bg-white rounded-[18px] p-5 pb-4 flex flex-col"
            style={{
              border: "2.5px solid #0f172a",
              boxShadow: "4px 4px 0 0 #0f172a",
              opacity: b.status !== "active" ? 0.55 : 1,
            }}
          >
            {!b.active && (
              <div 
                className="absolute top-2.5 right-2.5 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full z-10"
                style={{ background: "#0f172a", letterSpacing: "0.1em" }}
              >
                Tạm tắt
              </div>
            )}
            <div className="flex items-center gap-3.5 mb-3.5">
              <BadgeSticker badge={b} size={88} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg font-black tracking-tight leading-tight truncate">
                  {b.name}
                </div>
                <code className="font-mono text-[10px] text-slate-500">{b.id}</code>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span 
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: catColors.bg, 
                      color: catColors.text
                    }}
                  >
                    {cat.label}
                  </span>
                  <span 
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{ background: tier.soft, color: tier.ring }}
                  >
                    {tier.label}
                  </span>
                </div>
              </div>
            </div>
            <div 
              className="text-xs text-slate-600 leading-relaxed pb-3 mb-3 flex-1 line-clamp-2"
              style={{ 
                borderBottom: "1.5px dashed #0f172a",
                minHeight: 36
              }}
            >
              <span className="font-bold text-slate-900">Điều kiện:</span> {b.description || "—"}
            </div>
            <div className="flex items-center justify-between gap-2.5">
              <div>
                <div 
                  className="font-display text-lg font-black"
                  style={{ color: badgeColor }}
                >
                  {earned.toLocaleString("vi-VN")}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  lượt nhận
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  className="w-8 h-8 rounded-lg bg-white border-2 border-slate-800 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  style={{ boxShadow: "2px 2px 0 0 #0f172a" }}
                  onClick={() => onEdit(b)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  className="w-8 h-8 rounded-lg bg-white border-2 border-slate-800 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  style={{ boxShadow: "2px 2px 0 0 #0f172a" }}
                  onClick={() => onEdit(b)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
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
    <div className="bg-white rounded-xl border-2 border-slate-800 overflow-hidden shadow-[2px_2px_0_0_#0f172a]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-800 bg-slate-50">
            <th className="px-4 py-3 text-left font-extrabold text-xs uppercase tracking-wider">Huy hiệu</th>
            <th className="px-4 py-3 text-left font-extrabold text-xs uppercase tracking-wider">Loại</th>
            <th className="px-4 py-3 text-left font-extrabold text-xs uppercase tracking-wider">Tier</th>
            <th className="px-4 py-3 text-left font-extrabold text-xs uppercase tracking-wider">Điều kiện trao</th>
            <th className="px-4 py-3 text-right font-extrabold text-xs uppercase tracking-wider">Lượt nhận</th>
            <th className="px-4 py-3 text-center font-extrabold text-xs uppercase tracking-wider">Trạng thái</th>
            <th className="px-4 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {badges.map(b => {
            const cat = CAT_META[inferCategory(b)] || { label: "Khác", color: "slate" };
            const tier = TIER_META[b.tier] || TIER_META.bronze;
            const earned = Math.floor(Math.random() * 1000) + 10; // Mock
            const catColors = CAT_COLOR_STYLES[cat.color] || CAT_COLOR_STYLES.slate;

            return (
              <tr key={b.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <BadgeSticker badge={b} size={48} />
                    <div className="ml-1.5">
                      <div className="font-extrabold text-sm">{b.name}</div>
                      <code className="font-mono text-[10px] text-slate-500">{b.id}</code>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span 
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                    style={{ 
                      backgroundColor: catColors.bg, 
                      color: catColors.text
                    }}
                  >
                    {cat.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-full border"
                    style={{ background: tier.soft, color: tier.ring, borderColor: tier.ring }}
                  >
                    {tier.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-[340px] leading-relaxed">
                  {b.description || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-extrabold text-sm">{earned.toLocaleString("vi-VN")}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {b.active ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/> paused
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1.5 justify-end">
                    <button
                      className="w-[30px] h-[30px] rounded-lg bg-white border-2 border-slate-800 flex items-center justify-center hover:bg-slate-50 transition-colors"
                      style={{ boxShadow: "2px 2px 0 0 #0f172a" }}
                      onClick={() => onEdit(b)}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="w-[30px] h-[30px] rounded-lg bg-white border-2 border-slate-800 flex items-center justify-center hover:bg-slate-50 transition-colors"
                      style={{ boxShadow: "2px 2px 0 0 #0f172a" }}
                      onClick={() => onDelete(b.id)}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
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
    <div 
      className="lg:col-span-2 rounded-[18px] p-5"
      style={{ 
        background: "#fff",
        border: "2.5px solid #0f172a",
        boxShadow: "4px 4px 0 0 #0f172a"
      }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Hoạt động gần đây</p>
          <h3 className="font-display text-[22px] font-black tracking-tight leading-none mt-0.5">
            15 huy hiệu vừa được trao hôm nay
          </h3>
        </div>
        <button 
          className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-slate-800 bg-white hover:bg-slate-50 transition-colors"
          style={{ boxShadow: "2px 2px 0 0 #0f172a" }}
        >
          Xem tất cả
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {MOCK_RECENT_AWARDS.map((a, i) => {
          const badge = getBadgeById(a.badgeId);
          const badgeColor = getBadgeColor(badge);
          return (
            <div 
              key={i} 
              className="flex items-center gap-3.5 p-2.5 rounded-xl"
              style={{ 
                border: "1.5px solid #0f172a",
                backgroundColor: "#FFFBEB" // amber-50
              }}
            >
              <BadgeSticker badge={badge} size={44} />
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-bold">{a.who}</span>
                  <span className="text-slate-500 font-medium"> nhận </span>
                  <span className="font-bold" style={{ color: badgeColor }}>
                    {badge?.name || a.badgeId}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{a.role} · {a.when} · qua {a.via}</div>
              </div>
              <button
                className="w-[30px] h-[30px] rounded-lg bg-white border-2 border-slate-800 flex items-center justify-center hover:bg-slate-50 transition-colors"
                style={{ boxShadow: "2px 2px 0 0 #0f172a" }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HallOfFameSection() {
  return (
    <div 
      className="rounded-[18px] p-5"
      style={{ 
        background: "linear-gradient(135deg, #fef9c3 0%, #fff 70%)",
        border: "2.5px solid #0f172a",
        boxShadow: "4px 4px 0 0 #0f172a"
      }}
    >
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Top huy hiệu tháng</p>
      <h3 className="font-display text-xl font-black tracking-tight mb-3.5">Hall of Fame · 04/26</h3>
      <div className="flex flex-col">
        {MOCK_HALL_OF_FAME.map(t => (
          <div 
            key={t.rank} 
            className="flex items-center gap-3 py-2.5"
            style={{ borderBottom: t.rank < 5 ? "1.5px dashed #0f172a" : "none" }}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm font-black border-2 border-slate-800",
                COLOR_MAP[t.color] || "bg-slate-500",
                t.color === "amber" ? "text-slate-900" : "text-white"
              )}
            >
              {t.rank}
            </div>
            <div className="flex-1 font-bold text-sm truncate">{t.name}</div>
            <div className="font-mono font-black text-sm">
              {t.count} <span className="text-[10px] text-slate-500 font-bold">badges</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
