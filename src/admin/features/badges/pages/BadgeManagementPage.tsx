import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, Upload, Award, Trophy, Star, Zap, Target, Shield,
  Crown, Medal, Flame, Heart, BookOpen, CheckCircle2, Loader2, X, Image,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/components/ui/dialog";
import { Label } from "@shared/components/ui/label";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { toast } from "sonner";

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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Quản lý huy hiệu</h1>
          <p className="text-sm text-muted-foreground mt-1">Tạo và quản lý huy hiệu thành tích cho học viên</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Tạo huy hiệu
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Tổng huy hiệu", value: badges.length, icon: Award },
          { label: "Đang dùng", value: badges.filter(b => b.status === "active").length, icon: Trophy },
          { label: "Tự động", value: badges.filter(b => b.criteria_type !== "manual").length, icon: Zap },
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

      {badges.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <Award className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Chưa có huy hiệu nào</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Tạo huy hiệu đầu tiên
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark text-dark-foreground text-left">
                <th className="px-4 py-3 font-medium">Huy hiệu</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Mô tả</th>
                <th className="px-4 py-3 font-medium">Cấp độ</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Điều kiện</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {badges.map(badge => (
                <tr key={badge.id} className="border-t hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {renderBadgeIcon(badge)}
                      <span className="font-medium">{badge.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                    {badge.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {getTierBadge(badge.tier) || <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {CRITERIA_TYPES.find(c => c.value === badge.criteria_type)?.label || badge.criteria_type}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      badge.status === "active" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"
                    )}>
                      {badge.status === "active" ? "Active" : "Tắt"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(badge)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(badge.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
