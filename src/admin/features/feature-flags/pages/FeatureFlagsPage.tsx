/**
 * Admin page: Feature Flags
 * CRUD flag + toggle enabled + rollout % + quản lý user overrides.
 * Realtime: flag list tự refresh khi có thay đổi.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Flag, Plus, Trash2, Users, Loader2, Search, RefreshCw } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import { Badge } from "@shared/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@shared/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@shared/components/ui/dialog";
import { toast } from "@shared/hooks/use-toast";
import { cn } from "@shared/lib/utils";

type AppKey = "ielts" | "teacher" | "shared";

interface FeatureFlag {
  id: string;
  key: string;
  app_key: AppKey;
  label: string;
  description: string | null;
  enabled: boolean;
  rollout_pct: number;
  created_at: string;
  updated_at: string;
}

interface Override {
  id: string;
  flag_id: string;
  user_id: string;
  enabled: boolean;
  note: string | null;
  created_at: string;
}

const APP_META: Record<AppKey, { label: string; className: string }> = {
  ielts:   { label: "IELTS Practice", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  teacher: { label: "Teacher's Hub",  className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  shared:  { label: "Shared",         className: "bg-muted text-foreground border-border" },
};

export default function FeatureFlagsPage() {
  const qc = useQueryClient();
  const [appFilter, setAppFilter] = useState<"all" | AppKey>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);

  const { data: flags, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags" as any)
        .select("*")
        .order("app_key", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FeatureFlag[];
    },
  });

  // Realtime — bất cứ ai thay đổi flag đều refresh
  useEffect(() => {
    const ch = supabase
      .channel("admin-feature-flags")
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, () => {
        qc.invalidateQueries({ queryKey: ["feature-flags"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flag_overrides" }, () => {
        qc.invalidateQueries({ queryKey: ["feature-flag-overrides"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("feature_flags" as any).update({ enabled } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feature-flags"] }),
    onError: (e: any) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updateRollout = useMutation({
    mutationFn: async ({ id, pct }: { id: string; pct: number }) => {
      const { error } = await supabase.from("feature_flags" as any).update({ rollout_pct: pct } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feature-flags"] }),
  });

  const deleteFlag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feature_flags" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
      toast({ title: "Đã xoá flag" });
    },
  });

  const filtered = useMemo(() => {
    return (flags || []).filter((f) => {
      if (appFilter !== "all" && f.app_key !== appFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return f.key.toLowerCase().includes(s) || f.label.toLowerCase().includes(s);
      }
      return true;
    });
  }, [flags, appFilter, search]);

  const counts = useMemo(() => {
    const total = flags?.length ?? 0;
    const enabled = flags?.filter((f) => f.enabled).length ?? 0;
    return { total, enabled };
  }, [flags]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Feature Flags
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Bật/tắt tính năng realtime cho IELTS Practice & Teacher's Hub. Thay đổi có hiệu lực ngay, không cần deploy.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Flag mới</Button>
          </DialogTrigger>
          <CreateFlagDialog onClose={() => setCreateOpen(false)} />
        </Dialog>
      </header>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 text-xs">
          {(["all", "ielts", "teacher", "shared"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setAppFilter(k)}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors",
                appFilter === k ? "bg-card shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {k === "all" ? "Tất cả" : APP_META[k].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm theo key hoặc label…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {counts.enabled}/{counts.total} flag đang bật
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
          {flags?.length === 0 ? "Chưa có flag nào. Nhấn 'Flag mới' để tạo." : "Không có flag khớp bộ lọc."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((flag) => (
            <FlagRow
              key={flag.id}
              flag={flag}
              onToggle={(v) => toggleEnabled.mutate({ id: flag.id, enabled: v })}
              onRollout={(pct) => updateRollout.mutate({ id: flag.id, pct })}
              onDelete={() => {
                if (confirm(`Xoá flag "${flag.label}"? Hành động này không thể hoàn tác.`)) {
                  deleteFlag.mutate(flag.id);
                }
              }}
              onManageOverrides={() => setSelectedFlag(flag)}
            />
          ))}
        </div>
      )}

      {/* ── Overrides drawer ── */}
      {selectedFlag && (
        <OverridesDialog flag={selectedFlag} onClose={() => setSelectedFlag(null)} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── */

function FlagRow({
  flag, onToggle, onRollout, onDelete, onManageOverrides,
}: {
  flag: FeatureFlag;
  onToggle: (v: boolean) => void;
  onRollout: (pct: number) => void;
  onDelete: () => void;
  onManageOverrides: () => void;
}) {
  const [localPct, setLocalPct] = useState(flag.rollout_pct);
  useEffect(() => setLocalPct(flag.rollout_pct), [flag.rollout_pct]);

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px] font-semibold", APP_META[flag.app_key].className)}>
            {APP_META[flag.app_key].label}
          </Badge>
          <h3 className="font-semibold text-sm truncate">{flag.label}</h3>
          <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{flag.key}</code>
        </div>
        {flag.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{flag.description}</p>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-center gap-0.5">
          <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Rollout</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={100}
              value={localPct}
              onChange={(e) => setLocalPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              onBlur={() => localPct !== flag.rollout_pct && onRollout(localPct)}
              className="h-7 w-16 text-xs text-center"
              disabled={!flag.enabled}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Trạng thái</Label>
          <Switch checked={flag.enabled} onCheckedChange={onToggle} />
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onManageOverrides} title="Quản lý user overrides">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Xoá flag">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */

function CreateFlagDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    key: "",
    label: "",
    app_key: "shared" as AppKey,
    description: "",
    enabled: false,
    rollout_pct: 100,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.key.trim() || !form.label.trim()) {
      toast({ title: "Thiếu thông tin", description: "Key và Label bắt buộc.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("feature_flags" as any).insert(form as any);
    setSaving(false);
    if (error) {
      toast({ title: "Lỗi tạo flag", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["feature-flags"] });
    toast({ title: "Đã tạo flag", description: form.label });
    onClose();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Tạo Feature Flag</DialogTitle>
        <DialogDescription>Flag mới mặc định tắt. Bật sau khi đã kiểm tra ở dev/staging.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Key (duy nhất, dùng trong code)</Label>
          <Input
            placeholder="vd: new_speaking_ui"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
            className="font-mono text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Label (hiển thị)</Label>
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">App</Label>
          <Select value={form.app_key} onValueChange={(v) => setForm({ ...form, app_key: v as AppKey })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="shared">Shared (cả 2 app)</SelectItem>
              <SelectItem value="ielts">IELTS Practice</SelectItem>
              <SelectItem value="teacher">Teacher's Hub</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Mô tả</Label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Tác dụng của flag này…"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Huỷ</Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Tạo flag
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ─────────────────────────────────────────── */

function OverridesDialog({ flag, onClose }: { flag: FeatureFlag; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: overrides, isLoading } = useQuery({
    queryKey: ["feature-flag-overrides", flag.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flag_overrides" as any)
        .select("*")
        .eq("flag_id", flag.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Override[];
    },
  });

  // Map user_id → full_name (profiles table không có email column)
  const userIds = (overrides || []).map((o) => o.user_id);
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-overrides", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      return (data || []) as Array<{ id: string; full_name: string | null }>;
    },
  });
  const profMap = useMemo(() => {
    const m: Record<string, { full_name: string | null }> = {};
    (profiles || []).forEach((p) => { m[p.id] = { full_name: p.full_name }; });
    return m;
  }, [profiles]);

  const addOverride = async () => {
    if (!email.trim()) return;
    setAdding(true);
    // Lookup user bằng email qua teachngo_students.email (app đang dùng bảng này)
    const { data: stu } = await (supabase as any)
      .from("synced_students")
      .select("linked_user_id")
      .eq("email", email.trim())
      .not("linked_user_id", "is", null)
      .maybeSingle();
    const userId = stu?.linked_user_id;
    if (!userId) {
      toast({ title: "Không tìm thấy user", description: `Email ${email} chưa liên kết với tài khoản.`, variant: "destructive" });
      setAdding(false);
      return;
    }
    const { error } = await supabase.from("feature_flag_overrides" as any).upsert(
      { flag_id: flag.id, user_id: userId, enabled, note: note || null } as any,
      { onConflict: "flag_id,user_id" } as any
    );
    setAdding(false);
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["feature-flag-overrides", flag.id] });
    setEmail(""); setNote("");
    toast({ title: "Đã thêm override", description: email });
  };

  const removeOverride = async (id: string) => {
    const { error } = await supabase.from("feature_flag_overrides" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["feature-flag-overrides", flag.id] });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Overrides · {flag.label}
          </DialogTitle>
          <DialogDescription>
            Pin bật/tắt flag cho user cụ thể, ghi đè global setting. Ví dụ: bật beta cho 1 số tester.
          </DialogDescription>
        </DialogHeader>

        {/* Add form */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Email user…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 text-sm"
            />
            <div className="flex items-center gap-1.5 px-2 rounded-md border bg-card">
              <span className="text-xs text-muted-foreground">Bật</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ghi chú (tuỳ chọn)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 text-xs"
            />
            <Button size="sm" onClick={addOverride} disabled={adding || !email.trim()}>
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Thêm
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[320px] overflow-y-auto space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (overrides || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chưa có override nào.</p>
          ) : (
            (overrides || []).map((o) => {
              const p = profMap[o.user_id];
              return (
                <div key={o.id} className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{p?.full_name || o.user_id.slice(0, 8)}</span>
                      <Badge variant={o.enabled ? "default" : "outline"} className="text-[10px]">
                        {o.enabled ? "BẬT" : "TẮT"}
                      </Badge>
                    </div>
                    {o.note && <p className="text-[11px] text-muted-foreground italic mt-0.5">{o.note}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeOverride(o.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
