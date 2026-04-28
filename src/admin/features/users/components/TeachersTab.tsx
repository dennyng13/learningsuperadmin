import { useState, useEffect, useMemo, useRef } from "react";
import { SyncPreviewDialog, SyncPreviewData } from "@admin/features/tests/components/SyncPreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Textarea } from "@shared/components/ui/textarea";
import { Checkbox } from "@shared/components/ui/checkbox";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@shared/components/ui/tooltip";
import {
  Search, Plus, Pencil, Trash2, Link2, Unlink, ChevronLeft, ChevronRight, ArrowUpDown, RefreshCw, Loader2, Check, X, Copy, ExternalLink, Users, Clock, Shield, ShieldCheck, UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  subjects: string | null;
  classes: string | null;
  notes: string | null;
  status: string;
  linked_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type SortCol = "full_name" | "status" | "email";
type SortDir = "asc" | "desc";
type LinkedAccountRole = "super_admin" | "admin" | "teacher" | "user" | "guest";

const PAGE_SIZE = 20;

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  subjects: "",
  classes: "",
  notes: "",
  status: "active",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingLegacyLinkRpc(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const combined = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return combined.includes("self-link-as-teacher")
    || combined.includes("2026-04-20-self-link-as-teacher-rpc")
    || combined.includes("chưa apply migration rpc")
    || combined.includes("function") && combined.includes("auto_link_teachers");
}

export default function TeachersTab() {
  const navigate = useNavigate();
  const [allClasses, setAllClasses] = useState<{ id: string; class_name: string; teacher_id: string | null; status: string | null }[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [classSearch, setClassSearch] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [linkedRoleMap, setLinkedRoleMap] = useState<Record<string, LinkedAccountRole | null>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<SyncPreviewData | null>(null);
  const [syncPreviewOpen, setSyncPreviewOpen] = useState(false);
  const [syncConfirming, setSyncConfirming] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [linkFilter, setLinkFilter] = useState<"all" | "linked" | "unlinked">("all");
  const [sortCol, setSortCol] = useState<SortCol>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Inline email editing
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState("");

  // Link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkTeacherId, setLinkTeacherId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkAccountId, setLinkAccountId] = useState("");
  const [linking, setLinking] = useState(false);

  // P5a: sync-teachngo-staff edge function archived. Sync feature disabled.
  const syncStaff = async () => {
    toast.info("Tính năng đồng bộ Teach'n Go đã bị vô hiệu hoá (P5).");
  };

  // P5a: sync-teachngo-staff edge function archived.
  const confirmSyncStaff = async () => {
    toast.info("Tính năng đồng bộ Teach'n Go đã bị vô hiệu hoá (P5).");
    setSyncConfirming(false);
    setSyncPreviewOpen(false);
    setSyncPreview(null);
  };

  const autoLinkTeachers = async () => {
    setAutoLinking(true);
    try {
      const { data, error } = await supabase.rpc("auto_link_teachers");
      if (error) throw error;
      const matched = (data as any)?.matched ?? 0;
      if (matched > 0) {
        toast.success(`Đã liên kết ${matched} giáo viên theo email`);
        await fetchTeachers();
      } else {
        toast.info("Không tìm thấy giáo viên nào để liên kết tự động");
      }
    } catch (err: any) {
      if (isMissingLegacyLinkRpc(err)) {
        toast.info("RPC auto-link cũ chưa có; vẫn có thể liên kết thủ công bằng Account ID.");
      } else {
        toast.error(`Lỗi liên kết: ${err.message}`);
      }
    }
    setAutoLinking(false);
  };

  const fetchTeachers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Lỗi tải danh sách giáo viên");
    } else {
      const nextTeachers = data || [];
      setTeachers(nextTeachers);

      const linkedUserIds = nextTeachers
        .map((teacher) => teacher.linked_user_id)
        .filter((id): id is string => Boolean(id));

      if (linkedUserIds.length === 0) {
        setLinkedRoleMap({});
      } else {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", linkedUserIds);

        const rolePriority: LinkedAccountRole[] = ["super_admin", "admin", "teacher", "user", "guest"];
        const nextRoleMap = linkedUserIds.reduce<Record<string, LinkedAccountRole | null>>((acc, userId) => {
          const roles = ((roleRows || []) as { user_id: string; role: LinkedAccountRole }[])
            .filter((row) => row.user_id === userId)
            .map((row) => row.role);
          acc[userId] = rolePriority.find((role) => roles.includes(role)) ?? null;
          return acc;
        }, {});

        setLinkedRoleMap(nextRoleMap);
      }
    }
    setLoading(false);
  };

  const getLinkedRoleBadge = (role: LinkedAccountRole | null) => {
    switch (role) {
      case "super_admin":
        return <Badge variant="secondary" className="text-[10px] gap-1"><ShieldCheck className="h-3 w-3" />Super Admin</Badge>;
      case "admin":
        return <Badge variant="secondary" className="text-[10px] gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
      case "teacher":
        return <Badge variant="outline" className="text-[10px] gap-1"><UserCog className="h-3 w-3" />Giáo viên</Badge>;
      default:
        return null;
    }
  };

  const fetchClasses = async () => {
    const { data } = await (supabase as any)
      .from("classes")
      .select("id, class_name, teacher_id, status")
      .order("class_name");
    setAllClasses(data || []);
  };

  useEffect(() => { fetchTeachers(); fetchClasses(); }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter, linkFilter, sortCol, sortDir]);

  const filtered = useMemo(() => {
    let list = [...teachers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.full_name.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.phone && t.phone.includes(q))
      );
    }
    if (statusFilter !== "all") {
      list = list.filter(t => t.status === statusFilter);
    }
    if (linkFilter === "linked") {
      list = list.filter(t => t.linked_user_id);
    } else if (linkFilter === "unlinked") {
      list = list.filter(t => !t.linked_user_id);
    }
    list.sort((a, b) => {
      const av = (a[sortCol] ?? "").toString().toLowerCase();
      const bv = (b[sortCol] ?? "").toString().toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [teachers, search, statusFilter, linkFilter, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedClassIds(new Set());
    setClassSearch("");
    setDialogOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditingId(t.id);
    setForm({
      full_name: t.full_name,
      email: t.email || "",
      phone: t.phone || "",
      subjects: t.subjects || "",
      classes: t.classes || "",
      notes: t.notes || "",
      status: t.status,
    });
    // Populate selected classes for this teacher
    const assigned = allClasses.filter(c => c.teacher_id === t.id && c.status === "active").map(c => c.id);
    setSelectedClassIds(new Set(assigned));
    setClassSearch("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Vui lòng nhập tên giáo viên");
      return;
    }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      subjects: form.subjects.trim() || null,
      classes: form.classes.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    let teacherId = editingId;
    if (editingId) {
      const { error } = await supabase.from("teachers").update(payload).eq("id", editingId);
      if (error) { toast.error("Lỗi cập nhật"); setSaving(false); return; }
      else toast.success("Đã cập nhật giáo viên");
    } else {
      const { data, error } = await supabase.from("teachers").insert(payload).select("id").single();
      if (error) { toast.error("Lỗi thêm giáo viên"); setSaving(false); return; }
      else { toast.success("Đã thêm giáo viên"); teacherId = data.id; }
    }

    // Update class assignments
    if (teacherId) {
      // Remove this teacher from classes no longer selected
      const prevAssigned = allClasses.filter(c => c.teacher_id === teacherId).map(c => c.id);
      const toRemove = prevAssigned.filter(id => !selectedClassIds.has(id));
      const toAdd = [...selectedClassIds].filter(id => !prevAssigned.includes(id));

      if (toRemove.length > 0) {
        await (supabase as any).from("classes" as any)
          .update({ teacher_id: null, updated_at: new Date().toISOString() })
          .in("id", toRemove);
      }
      if (toAdd.length > 0) {
        await (supabase as any).from("classes" as any)
          .update({ teacher_id: teacherId, updated_at: new Date().toISOString() })
          .in("id", toAdd);
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchTeachers();
    fetchClasses();
  };

  const saveInlineEmail = async (teacherId: string) => {
    const email = editingEmailValue.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email không hợp lệ");
      return;
    }
    const { error } = await supabase
      .from("teachers")
      .update({ email: email || null, updated_at: new Date().toISOString() })
      .eq("id", teacherId);
    if (error) { toast.error("Lỗi cập nhật email"); return; }
    setEditingEmailId(null);
    toast.success("Đã cập nhật email");
    await fetchTeachers();
    // Auto-link after email update
    if (email) {
      const { data, error } = await supabase.rpc("auto_link_teachers");
      if (!error) {
        const matched = (data as any)?.matched ?? 0;
        if (matched > 0) toast.success(`Đã tự động liên kết ${matched} giáo viên`);
      } else if (isMissingLegacyLinkRpc(error)) {
        toast.info("Đã lưu email; nếu là tài khoản super admin, hãy dán Account ID để liên kết trực tiếp.");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa giáo viên này?")) return;
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) toast.error("Lỗi xóa");
    else { toast.success("Đã xóa"); fetchTeachers(); }
  };

  const openLink = (t: Teacher) => {
    setLinkTeacherId(t.id);
    setLinkEmail(t.email || "");
    setLinkAccountId("");
    setLinkDialogOpen(true);
  };

  const handleLink = async () => {
    if ((!linkEmail.trim() && !linkAccountId.trim()) || !linkTeacherId) return;
    setLinking(true);
    const email = linkEmail.trim();
    const accountId = linkAccountId.trim();

    if (accountId && !UUID_RE.test(accountId)) {
      toast.error("Account ID không đúng định dạng UUID");
      setLinking(false);
      return;
    }

    const updatePayload = {
      linked_user_id: accountId || null,
      email: email || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("teachers")
      .update(updatePayload)
      .eq("id", linkTeacherId);

    if (error) {
      toast.error("Lỗi cập nhật liên kết");
      setLinking(false);
      return;
    }

    if (accountId) {
      toast.success("Đã liên kết trực tiếp bằng Account ID");
      setLinking(false);
      setLinkDialogOpen(false);
      fetchTeachers();
      return;
    }

    const { data, error: autoLinkError } = await supabase.rpc("auto_link_teachers");
    if (!autoLinkError) {
      const matched = (data as any)?.matched ?? 0;
      toast.success(matched > 0 ? `Đã tự động liên kết ${matched} giáo viên` : "Đã lưu email để chờ auto-link");
    } else if (isMissingLegacyLinkRpc(autoLinkError)) {
      toast.info("Đã lưu email; với tài khoản super admin hãy nhập Account ID để liên kết trực tiếp.");
    } else {
      toast.error(`Lỗi liên kết: ${autoLinkError.message}`);
    }

    setLinking(false);
    setLinkDialogOpen(false);
    fetchTeachers();
  };

  const handleUnlink = async (id: string) => {
    const { error } = await supabase
      .from("teachers")
      .update({ linked_user_id: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Lỗi hủy liên kết");
    else { toast.success("Đã hủy liên kết"); fetchTeachers(); }
  };




  return (
    <div className="space-y-4">
      {/* Compact Stats + Filters Toolbar */}
      <div className="bg-card border rounded-xl p-3 space-y-2.5">
        {/* Row 1: Stats chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{filtered.length}</span>
            <span className="text-muted-foreground font-normal">tổng</span>
          </div>
          <span className="h-3.5 w-px bg-border" />
          <button onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", statusFilter === "active" ? "bg-emerald-600 text-white border-emerald-600 font-bold" : "bg-muted/60 border-border text-foreground hover:bg-emerald-600 hover:text-white hover:border-emerald-600")}>
            {teachers.filter(t => t.status === "active").length} đang dạy
          </button>
          <button onClick={() => setStatusFilter(statusFilter === "inactive" ? "all" : "inactive")} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", statusFilter === "inactive" ? "bg-muted-foreground text-white border-muted-foreground font-bold" : "bg-muted/60 border-border text-foreground hover:bg-muted-foreground hover:text-white hover:border-muted-foreground")}>
            {teachers.filter(t => t.status === "inactive").length} nghỉ
          </button>
          <span className="h-3.5 w-px bg-border" />
          <button onClick={() => setLinkFilter(linkFilter === "linked" ? "all" : "linked")} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", linkFilter === "linked" ? "bg-emerald-600 text-white border-emerald-600 font-bold" : "bg-muted/60 border-border text-foreground hover:bg-emerald-600 hover:text-white hover:border-emerald-600")}>
            <Link2 className="h-3 w-3" />{teachers.filter(t => t.linked_user_id).length} liên kết
          </button>
          {teachers.filter(t => !t.linked_user_id).length > 0 && (
            <button onClick={() => setLinkFilter(linkFilter === "unlinked" ? "all" : "unlinked")} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", linkFilter === "unlinked" ? "bg-rose-600 text-white border-rose-600 font-bold" : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-400")}>
              <Unlink className="h-3 w-3" />{teachers.filter(t => !t.linked_user_id).length} chưa TK
            </button>
          )}
          {(statusFilter !== "all" || linkFilter !== "all") && (
            <button onClick={() => { setStatusFilter("all"); setLinkFilter("all"); }} className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1">
              Bỏ lọc
            </button>
          )}
        </div>

        {/* Row 2: Search + Actions */}
        <div className="flex gap-2 flex-wrap items-center">
          {search || searchOpen ? (
            <div className="relative flex-1 min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)} onBlur={() => { if (!search) setSearchOpen(false); }} placeholder="Tìm tên, email, SĐT..." className="h-8 pl-8 pr-7 text-xs" autoFocus />
              <button onClick={() => { setSearch(""); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSearchOpen(true)}>
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button onClick={autoLinkTeachers} disabled={autoLinking} size="sm" variant="outline" className="h-8 text-xs px-3 text-amber-600 border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-600 dark:hover:text-white dark:hover:border-amber-600 transition-colors">
            {autoLinking ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}Tự động liên kết
          </Button>
          <Button size="sm" onClick={openCreate} className="h-8 text-xs px-3 gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Thêm giáo viên
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-dark text-dark-foreground text-left text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("full_name")}>
                  <span className="inline-flex items-center gap-1">Họ tên <ArrowUpDown className={`h-3 w-3 ${sortCol === "full_name" ? "text-white" : "opacity-40"}`} /></span>
                </th>
                <th className="px-4 py-3 font-semibold w-24">Account ID</th>
                <th className="px-4 py-3 font-semibold cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("email")}>
                  <span className="inline-flex items-center gap-1">Email <ArrowUpDown className={`h-3 w-3 ${sortCol === "email" ? "text-white" : "opacity-40"}`} /></span>
                </th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">SĐT</th>
                <th className="px-4 py-3 font-semibold">Lớp đang dạy</th>
                <th className="px-4 py-3 font-semibold w-24 text-center cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  <span className="inline-flex items-center gap-1 justify-center">Trạng thái <ArrowUpDown className={`h-3 w-3 ${sortCol === "status" ? "text-white" : "opacity-40"}`} /></span>
                </th>
                <th className="px-4 py-3 font-semibold w-28 text-center">Liên kết</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Không tìm thấy giáo viên</td></tr>
              ) : paged.map((t, idx) => (
                <tr key={t.id} className={cn("transition-colors group", idx % 2 === 0 ? "bg-card" : "bg-muted/20", "hover:bg-primary/8")}>
                  <td className="px-4 py-2.5 font-semibold text-[13px]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/teachers/${t.id}`)}
                        className="text-left hover:text-primary transition-colors"
                      >
                        {t.full_name}
                      </button>
                      {(() => {
                        const count = allClasses.filter(c => c.teacher_id === t.id && c.status === "active").length;
                        return count > 0 ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">{count} lớp</Badge>
                        ) : null;
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {t.linked_user_id ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                            onClick={() => {
                              navigator.clipboard.writeText(t.linked_user_id!);
                              toast.success("Đã copy Account ID");
                            }}
                          >
                            {t.linked_user_id.substring(0, 8)}…
                            <Copy className="inline h-2.5 w-2.5 ml-1 opacity-50" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px]">
                          <p className="font-mono">{t.linked_user_id}</p>
                          <p className="text-muted-foreground">Click để copy</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 italic">Chưa có</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    {editingEmailId === t.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingEmailValue}
                          onChange={e => setEditingEmailValue(e.target.value)}
                          placeholder="email@example.com"
                          className="h-7 text-xs w-40"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") saveInlineEmail(t.id);
                            if (e.key === "Escape") setEditingEmailId(null);
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => saveInlineEmail(t.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingEmailId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors text-left text-[13px]"
                        onClick={() => { setEditingEmailId(t.id); setEditingEmailValue(t.email || ""); }}
                        title="Click để sửa email"
                      >
                        {t.email || <span className="italic text-muted-foreground/50">Nhập email...</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-[13px] hidden lg:table-cell">{t.phone || "—"}</td>
                  <td className="px-4 py-2.5 max-w-[280px]">
                    {(() => {
                      const assigned = allClasses.filter(c => c.teacher_id === t.id && c.status === "active");
                      if (assigned.length === 0) return <span className="text-muted-foreground/50 text-[11px] italic">Chưa gán lớp</span>;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {assigned.map(c => (
                            <Badge
                              key={c.id}
                              variant="outline"
                              className="text-[10px] font-normal truncate max-w-[160px] cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors gap-1"
                              onClick={() => navigate(`/classes`)}
                            >
                              <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" />
                              {c.class_name}
                            </Badge>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={t.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {t.status === "active" ? "Đang dạy" : "Nghỉ"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {t.linked_user_id ? (
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30">
                          <Link2 className="h-3 w-3" /> Đã liên kết
                        </Badge>
                        {getLinkedRoleBadge(linkedRoleMap[t.linked_user_id] ?? null)}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Chưa</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/teachers/${t.id}`)} title="Xem hồ sơ">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} title="Sửa">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {t.linked_user_id ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleUnlink(t.id)} title="Hủy liên kết">
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLink(t)} title="Liên kết tài khoản">
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)} title="Xóa">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                typeof p === "string" ? (
                  <span key={`e${i}`} className="px-1">…</span>
                ) : (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                )
              )}
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Sửa giáo viên" : "Thêm giáo viên"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Họ tên *</label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">SĐT</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Môn dạy</label>
              <Input value={form.subjects} onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))} placeholder="VD: Reading, Writing" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Lớp phụ trách ({selectedClassIds.size} lớp)</label>
              <Input
                placeholder="Tìm lớp..."
                value={classSearch}
                onChange={e => setClassSearch(e.target.value)}
                className="h-8 text-xs mb-2"
              />
              <ScrollArea className="h-36 rounded-md border p-2">
                {allClasses
                  .filter(c => c.status === "active")
                  .filter(c => c.class_name.toLowerCase().includes(classSearch.toLowerCase()))
                  .map(c => {
                    const otherTeacher = c.teacher_id && c.teacher_id !== editingId;
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs ${otherTeacher ? "opacity-40" : ""}`}
                      >
                        <Checkbox
                          checked={selectedClassIds.has(c.id)}
                          disabled={!!otherTeacher}
                          onCheckedChange={(checked) => {
                            setSelectedClassIds(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(c.id);
                              else next.delete(c.id);
                              return next;
                            });
                          }}
                        />
                        <span className="truncate">{c.class_name}</span>
                        {otherTeacher && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">Đã gán GV khác</span>}
                      </label>
                    );
                  })}
              </ScrollArea>
            </div>
            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Trạng thái</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang dạy</SelectItem>
                  <SelectItem value="inactive">Nghỉ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Liên kết tài khoản</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Nhập email để auto-link, hoặc dán Account ID để liên kết trực tiếp với tài khoản super admin/admin.</p>
            <Input
              placeholder="email@example.com"
              value={linkEmail}
              onChange={e => setLinkEmail(e.target.value)}
            />
            <Input
              placeholder="Account ID (UUID)"
              value={linkAccountId}
              onChange={e => setLinkAccountId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleLink} disabled={linking}>{linking ? "Đang liên kết..." : "Liên kết"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SyncPreviewDialog
        open={syncPreviewOpen}
        onOpenChange={setSyncPreviewOpen}
        preview={syncPreview}
        onConfirm={confirmSyncStaff}
        confirming={syncConfirming}
        entityLabel="giáo viên"
      />
    </div>
  );
}
