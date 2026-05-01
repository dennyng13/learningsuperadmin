import { useState, useEffect, useRef } from "react";
import { SyncPreviewDialog, SyncPreviewData } from "@admin/features/tests/components/SyncPreviewDialog";
import AddStudentDialog from "./AddStudentDialog";
import ComposeEmailDialog from "@shared/components/teacher-shared/ComposeEmailDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeTeachngoLinkStudents } from "@shared/lib/teachngoLinkStudents";
import { useAuth } from "@shared/hooks/useAuth";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { toast } from "sonner";
import {
  RefreshCw, Loader2, Search, Users, Mail, Phone, Clock, Link2, Unlink, Eye, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpDown, UserPlus, Trash2, BarChart3, BookOpen, KeyRound, ShieldCheck, Shield, UserX, UserCog, GraduationCap, Pencil, Check, MailWarning, Settings2, Download, Send,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import { formatDateDDMMYYYY } from "@shared/utils/dateFormat";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Badge } from "@shared/components/ui/badge";
import { Checkbox } from "@shared/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@shared/components/ui/popover";
import { Switch } from "@shared/components/ui/switch";

interface UnifiedUser {
  id: string;
  teachngo_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  course_names: string | null;
  synced_at: string;
  linked_user_id: string | null;
  source: "tng" | "system";
  date_of_birth?: string | null;
  city?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  current_level?: string | null;
  enrollment_date?: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface TestResult {
  id: string;
  assessment_name: string;
  section_type: string;
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  time_spent: number;
  created_at: string;
  book_name: string | null;
}

const ALL_ROLES = [
  { value: "user", label: "Học viên", icon: GraduationCap },
  { value: "teacher", label: "Giáo viên", icon: UserCog },
  { value: "guest", label: "Khách", icon: Users },
  { value: "admin", label: "Admin", icon: Shield },
  { value: "super_admin", label: "Super Admin", icon: ShieldCheck },
];

type RoleCategory = "students" | "admins" | "teachers";

const ROLE_CATEGORY_ROLES: Record<RoleCategory, string[]> = {
  students: ["user", "guest"],
  admins: ["admin", "super_admin"],
  teachers: ["teacher"],
};

export default function SyncedUsersTab({ roleCategory = "students" }: { roleCategory?: RoleCategory }) {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [students, setStudents] = useState<UnifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<SyncPreviewData | null>(null);
  const [syncPreviewOpen, setSyncPreviewOpen] = useState(false);
  const [syncConfirming, setSyncConfirming] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [linkFilter, setLinkFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "tng" | "system">("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortCol, setSortCol] = useState<"name" | "status" | "linked">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetResults, setResetResults] = useState<{ name: string; password: string }[]>([]);
  const [resetResultsDialog, setResetResultsDialog] = useState(false);
  const [restoringAccess, setRestoringAccess] = useState(false);
  const [creatingForId, setCreatingForId] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<{ name: string; last_activity: string | null }[] | null>(null);
  const [cleanupResult, setCleanupResult] = useState<{ purged_count: number; purged_names: string[] } | null>(null);
  const [cleanupResultDialog, setCleanupResultDialog] = useState(false);
  const [bulkCreateDialogOpen, setBulkCreateDialogOpen] = useState(false);
  const [createRole, setCreateRole] = useState("user");

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingStudent, setLinkingStudent] = useState<UnifiedUser | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [resultsStudent, setResultsStudent] = useState<UnifiedUser | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [createdAccountsDialog, setCreatedAccountsDialog] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<{ name: string; email: string; password: string }[]>([]);

  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [studentClassesMap, setStudentClassesMap] = useState<Record<string, { class_name: string; status: string | null }[]>>({});
  const [loadingClasses, setLoadingClasses] = useState<string | null>(null);
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string>>({});
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
  const [lastActivityMap, setLastActivityMap] = useState<Record<string, string | null>>({});

  // Role edit dialog (for system users / super admin)
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UnifiedUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  // Delete system user
  const [deleteSystemDialogOpen, setDeleteSystemDialogOpen] = useState(false);
  const [deletingSystemUser, setDeletingSystemUser] = useState<UnifiedUser | null>(null);
  const [deletingSystem, setDeletingSystem] = useState(false);

  // Create external account
  const [createExternalDialogOpen, setCreateExternalDialogOpen] = useState(false);
  const defaultRole = roleCategory === "admins" ? "admin" : roleCategory === "teachers" ? "teacher" : "guest";
  const [externalForm, setExternalForm] = useState({ full_name: "", email: "", password: "", role: defaultRole, send_email: false });
  const [creatingExternal, setCreatingExternal] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [composeEmailOpen, setComposeEmailOpen] = useState(false);

  // Column visibility
  type ColKey = "phone" | "email" | "level" | "dob" | "city" | "guardian" | "enrollment";
  const DEFAULT_COLS: ColKey[] = ["phone", "email", "level"];
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_COLS));
  const ALL_COLS: { key: ColKey; label: string }[] = [
    { key: "phone", label: "SĐT" },
    { key: "email", label: "Email" },
    { key: "level", label: "Level" },
    { key: "dob", label: "Ngày sinh" },
    { key: "city", label: "Thành phố" },
    { key: "guardian", label: "Phụ huynh" },
    { key: "enrollment", label: "Ngày nhập học" },
  ];
  const toggleCol = (key: ColKey) => setVisibleCols(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const fetchStudentClasses = async (teachngoId: string) => {
    if (studentClassesMap[teachngoId]) return;
    setLoadingClasses(teachngoId);
    const { data: links } = await (supabase as any)
      .from("class_students")
      .select("class_id, status")
      .eq("teachngo_student_id", teachngoId);
    if (links && links.length > 0) {
      const classIds = (links as any[]).map((l: any) => l.class_id);
      const { data:  classes } = await (supabase as any)
        .from("classes")
        .select("id, class_name, status")
        .in("id", classIds) as any;
      const classMap = new Map<string, any>(((classes || []) as any[]).map((c: any) => [c.id, c]));
      const result = (links as any[]).map((l: any) => ({
        class_name: (classMap.get(l.class_id) as any)?.class_name || "Unknown",
        status: l.status,
      }));
      setStudentClassesMap(prev => ({ ...prev, [teachngoId]: result }));
    } else {
      setStudentClassesMap(prev => ({ ...prev, [teachngoId]: [] }));
    }
    setLoadingClasses(null);
  };

  const toggleStudentExpand = (teachngoId: string) => {
    if (expandedStudentId === teachngoId) {
      setExpandedStudentId(null);
    } else {
      setExpandedStudentId(teachngoId);
      fetchStudentClasses(teachngoId);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);

    // Fetch TnG students
    const { data: tngData, error: tngError } = await (supabase as any)
      .from("synced_students")
      .select("id, teachngo_id, full_name, email, phone, status, course_names, synced_at, linked_user_id, date_of_birth, city, guardian_name, guardian_phone, current_level, enrollment_date")
      .order("full_name", { ascending: true });

    const tngStudents: UnifiedUser[] = [];
    const tngLinkedUserIds = new Set<string>();

    if (!tngError && tngData) {
      for (const s of tngData as any[]) {
        tngStudents.push({ ...s, source: "tng" });
        if (s.linked_user_id) tngLinkedUserIds.add(s.linked_user_id);
      }
      if (tngStudents.length > 0) setLastSync(tngStudents[0].synced_at);
    }

    // Fetch all profiles to find non-TnG users
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, created_at");
    const systemUsers: UnifiedUser[] = [];
    const systemUserIds: string[] = [];
    if (profiles) {
      for (const p of profiles) {
        if (!tngLinkedUserIds.has(p.id)) {
          systemUserIds.push(p.id);
          systemUsers.push({
            id: `sys_${p.id}`,
            teachngo_id: "",
            full_name: p.full_name || "Chưa có tên",
            email: null,
            phone: p.phone || null,
            status: null,
            course_names: null,
            synced_at: p.created_at,
            linked_user_id: p.id,
            source: "system",
          });
        }
      }
    }

    // Fetch emails for system users from auth
    if (systemUserIds.length > 0) {
      const { data: emailData } = await supabase.rpc("get_user_emails", { user_ids: systemUserIds });
      if (emailData) {
        const emailMap = new Map<string, string>();
        for (const e of emailData as any[]) {
          emailMap.set(e.user_id, e.email);
        }
        for (const su of systemUsers) {
          if (su.linked_user_id && emailMap.has(su.linked_user_id)) {
            su.email = emailMap.get(su.linked_user_id) || null;
          }
        }
      }
    }

    const allStudents = [...tngStudents, ...systemUsers];
    setStudents(allStudents);

    // Fetch roles and last activity for linked users
    setTimeout(() => {
      fetchRoles(allStudents);
      fetchLastActivity(allStudents);
    }, 100);

    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name");
    if (data) setAllUsers(data.map((p: any) => ({ id: p.id, email: "", full_name: p.full_name })));
  };

  const fetchRoles = async (studentList: UnifiedUser[]) => {
    const linkedIds = Array.from(new Set(studentList.filter(s => s.linked_user_id).map(s => s.linked_user_id!)));
    if (linkedIds.length === 0) return;
    try {
      const { data: roleRows, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", linkedIds);

      if (error) throw error;

      const map: Record<string, string> = {};
      const priority: Record<string, number> = { super_admin: 5, admin: 4, teacher: 3, user: 2, guest: 1 };

      for (const row of (roleRows || []) as { user_id: string; role: string }[]) {
        const current = map[row.user_id];
        if (!current || (priority[row.role] || 0) > (priority[current] || 0)) {
          map[row.user_id] = row.role;
        }
      }

      setUserRolesMap(map);
    } catch {}
  };

  const fetchLastActivity = async (studentList: UnifiedUser[]) => {
    const linkedIds = studentList.filter(s => s.linked_user_id).map(s => s.linked_user_id!);
    if (linkedIds.length === 0) {
      setLastActivityMap({});
      return;
    }

    setLastActivityMap({});
  };

  const changeRole = async (userId: string, newRole: string) => {
    setChangingRoleFor(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setChangingRoleFor(null); return; }
      const res = await invokeTeachngoLinkStudents(session.access_token, { action: "change_role", user_id: userId, role: newRole });
      if (res.error) toast.error(`Lỗi: ${res.error}`);
      else {
        toast.success(`Đã đổi vai trò thành ${newRole === "user" ? "Học viên" : newRole === "guest" ? "Khách" : "Giáo viên"}`);
        setUserRolesMap(prev => ({ ...prev, [userId]: newRole }));
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setChangingRoleFor(null);
  };

  // Role edit dialog (multi-role, for super admin)
  const openEditRoleDialog = (user: UnifiedUser) => {
    setEditingUser(user);
    const userId = user.linked_user_id || "";
    const currentRole = userRolesMap[userId];
    setSelectedRoles(currentRole ? [currentRole] : []);
    setEditRoleDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const saveRoles = async () => {
    if (!editingUser?.linked_user_id) return;
    setSavingRoles(true);
    try {
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", editingUser.linked_user_id);
      if (deleteError) throw deleteError;
      if (selectedRoles.length > 0) {
        const inserts = selectedRoles.map(role => ({ user_id: editingUser.linked_user_id!, role: role as any }));
        const { error: insertError } = await supabase.from("user_roles").insert(inserts);
        if (insertError) throw insertError;
      }
      toast.success(`Đã cập nhật vai trò cho ${editingUser.full_name}`);
      setEditRoleDialogOpen(false);
      // Update local state
      const highestRole = selectedRoles.length > 0
        ? selectedRoles.reduce((a, b) => {
            const p: Record<string, number> = { super_admin: 5, admin: 4, teacher: 3, user: 2, guest: 1 };
            return (p[a] || 0) >= (p[b] || 0) ? a : b;
          })
        : "";
      if (highestRole) {
        setUserRolesMap(prev => ({ ...prev, [editingUser.linked_user_id!]: highestRole }));
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setSavingRoles(false);
  };

  // Delete system user
  const handleDeleteSystemUser = async () => {
    if (!deletingSystemUser?.linked_user_id) return;
    setDeletingSystem(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setDeletingSystem(false); return; }
      const res = await supabase.functions.invoke("delete-user", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { user_id: deletingSystemUser.linked_user_id },
      });
      if (res.error) toast.error(`Lỗi: ${res.error.message}`);
      else if (res.data?.error) toast.error(res.data.error);
      else {
        toast.success(`Đã xóa tài khoản ${deletingSystemUser.full_name}`);
        setDeleteSystemDialogOpen(false);
        await fetchStudents();
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setDeletingSystem(false);
  };

  useEffect(() => {
    fetchStudents();
    fetchUsers();
  }, []);

  // P5a: sync-teachngo-students edge function archived. Sync feature disabled.
  const syncStudents = async () => {
    toast.info("Tính năng đồng bộ Teach'n Go đã bị vô hiệu hoá (P5).");
  };

  // P5a: sync-teachngo-students edge function archived.
  const confirmSync = async () => {
    toast.info("Tính năng đồng bộ Teach'n Go đã bị vô hiệu hoá (P5).");
    setSyncConfirming(false);
    setSyncPreviewOpen(false);
    setSyncPreview(null);
  };

  // P5a: invite-teachngo-students edge function archived.
  const createAccountsForStudents = async () => {
    toast.info("Tính năng mời hàng loạt qua Teach'n Go đã bị vô hiệu hoá (P5).");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(s => s.id)));
  };

  // P5a: invite-teachngo-students edge function archived.
  const createSelectedAccounts = async () => {
    toast.info("Tính năng tạo tài khoản hàng loạt qua Teach'n Go đã bị vô hiệu hoá (P5).");
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) { toast.info("Chọn người dùng cần xóa"); return; }
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSelected = async () => {
    setDeleteDialogOpen(false);
    setDeleting(true);
    const tngIds = Array.from(selectedIds).filter(id => !id.startsWith("sys_"));
    const sysIds = Array.from(selectedIds).filter(id => id.startsWith("sys_")).map(id => id.replace("sys_", ""));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setDeleting(false); return; }

      // P5a: delete-teachngo-students edge function archived.
      if (tngIds.length > 0) {
        toast.info(`Tính năng xóa học viên Teach'n Go đã bị vô hiệu hoá (P5). Bỏ qua ${tngIds.length} học viên.`);
      }

      // Delete system users
      for (const uid of sysIds) {
        const res = await supabase.functions.invoke("delete-user", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { user_id: uid },
        });
        if (res.error || res.data?.error) toast.error(`Lỗi xóa user: ${res.error?.message || res.data?.error}`);
      }
      if (sysIds.length > 0) toast.success(`Đã xóa ${sysIds.length} tài khoản hệ thống`);

      setSelectedIds(new Set());
      await fetchStudents();
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setDeleting(false);
  };

  const resetSelectedPasswords = () => {
    const linkedSelected = students.filter(s => selectedIds.has(s.id) && s.linked_user_id);
    if (linkedSelected.length === 0) { toast.info("Chọn người dùng đã có tài khoản"); return; }
    setResetDialogOpen(true);
  };

  const confirmResetPasswords = async () => {
    setResetDialogOpen(false);
    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setResettingPassword(false); return; }
      // Only TnG student IDs for reset (the edge function expects student_ids)
      const tngIds = Array.from(selectedIds).filter(id => !id.startsWith("sys_"));
      if (tngIds.length === 0) { toast.info("Chỉ hỗ trợ reset MK cho học viên TnG"); setResettingPassword(false); return; }
      const res = await supabase.functions.invoke("reset-student-password", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { student_ids: tngIds },
      });
      if (res.error) toast.error(`Lỗi: ${res.error.message}`);
      else {
        const { reset, errors, reset_accounts } = res.data;
        if (reset > 0) {
          toast.success(`Đã reset mật khẩu ${reset} tài khoản`);
          if (reset_accounts?.length > 0) { setResetResults(reset_accounts); setResetResultsDialog(true); }
        } else toast.info("Không có tài khoản nào được reset");
        if (errors?.length > 0) toast.warning(`${errors.length} lỗi: ${errors[0]}`);
        setSelectedIds(new Set());
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setResettingPassword(false);
  };

  const restoreAccessForSelected = async () => {
    const linkedSelected = students.filter(s => selectedIds.has(s.id) && s.linked_user_id);
    if (linkedSelected.length === 0) { toast.info("Chọn người dùng đã có tài khoản"); return; }
    setRestoringAccess(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setRestoringAccess(false); return; }
      const tngIds = Array.from(selectedIds).filter(id => !id.startsWith("sys_"));
      if (tngIds.length === 0) { toast.info("Chỉ hỗ trợ cho học viên TnG"); setRestoringAccess(false); return; }
      const res = await invokeTeachngoLinkStudents<{ restored: number; restored_names?: string[] }>(session.access_token, { action: "restore_access", student_ids: tngIds });
      if (res.error) toast.error(`Lỗi: ${res.error}`);
      else {
        const { restored, restored_names } = res.data || { restored: 0, restored_names: [] };
        if (restored > 0) {
          const names = restored_names?.join(", ") || `${restored} học viên`;
          toast.success(` Đã cấp lại quyền truy cập: ${names}`, { duration: 8000 });
        } else toast.info("Không có học viên nào cần cấp lại quyền");
        setSelectedIds(new Set());
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setRestoringAccess(false);
  };

  // P5a: invite-teachngo-students edge function archived.
  const quickCreateAccount = async (_student: UnifiedUser) => {
    toast.info("Tính năng tạo tài khoản nhanh qua Teach'n Go đã bị vô hiệu hoá (P5).");
  };

  const createExternalAccount = async () => {
    if (!externalForm.full_name || !externalForm.email) { toast.error("Vui lòng nhập tên và email"); return; }
    setCreatingExternal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setCreatingExternal(false); return; }
      const res = await supabase.functions.invoke("create-external-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: externalForm,
      });
      if (res.error) toast.error(`Lỗi: ${res.error.message}`);
      else if (res.data?.error) toast.error(res.data.error);
      else {
        toast.success(`Đã tạo tài khoản cho ${res.data.full_name}`);
        setCreatedAccounts([{ name: res.data.full_name, email: res.data.email, password: res.data.password }]);
        setCreatedAccountsDialog(true);
        setCreateExternalDialogOpen(false);
        setExternalForm({ full_name: "", email: "", password: "", role: defaultRole, send_email: false });
        await fetchStudents();
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setCreatingExternal(false);
  };

  const previewCleanup = async () => {
    setCleaningUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setCleaningUp(false); return; }
      const res = await supabase.functions.invoke("cleanup-inactive-accounts", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { dry_run: true },
      });
      if (res.error) { toast.error(`Lỗi: ${res.error.message}`); setCleaningUp(false); return; }
      if (res.data?.inactive_count === 0) {
        toast.info("Không có tài khoản nào không hoạt động quá 2 tháng");
      } else {
        setCleanupPreview(res.data.inactive_users || []);
        setCleanupDialogOpen(true);
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setCleaningUp(false);
  };

  const confirmCleanup = async () => {
    setCleanupDialogOpen(false);
    setCleaningUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setCleaningUp(false); return; }
      const res = await supabase.functions.invoke("cleanup-inactive-accounts", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { dry_run: false },
      });
      if (res.error) toast.error(`Lỗi: ${res.error.message}`);
      else {
        const { purged_count, purged_names } = res.data;
        if (purged_count > 0) {
          setCleanupResult({ purged_count, purged_names });
          setCleanupResultDialog(true);
          toast.success(`Đã xử lý ${purged_count} tài khoản không hoạt động`);
          await fetchStudents();
        } else toast.info("Không có tài khoản nào cần xử lý");
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setCleaningUp(false);
  };

  const openLinkDialog = (student: UnifiedUser) => {
    setLinkingStudent(student);
    setSelectedUserId(student.linked_user_id || "");
    setUserSearch("");
    setLinkDialogOpen(true);
  };

  const handleManualLink = async () => {
    if (!linkingStudent) return;
    setLinkingLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setLinkingLoading(false); return; }
      const res = await invokeTeachngoLinkStudents(session.access_token, { action: "manual_link", student_id: linkingStudent.id, user_id: selectedUserId || null });
      if (res.error) toast.error(`Lỗi: ${res.error}`);
      else {
        toast.success(selectedUserId ? "Đã liên kết thành công" : "Đã hủy liên kết");
        setLinkDialogOpen(false);
        await fetchStudents();
      }
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setLinkingLoading(false);
  };

  const openResultsDialog = async (student: UnifiedUser) => {
    if (!student.linked_user_id) return;
    setResultsStudent(student);
    setResultsDialogOpen(true);
    setResultsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Bạn cần đăng nhập"); setResultsLoading(false); return; }
      const res = await invokeTeachngoLinkStudents<{ results?: TestResult[] }>(session.access_token, { action: "get_results", user_id: student.linked_user_id });
      if (res.error) toast.error(`Lỗi: ${res.error}`);
      else setResults(res.data?.results || []);
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`); }
    setResultsLoading(false);
  };

  const toggleSort = (col: "name" | "status" | "linked") => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: "name" | "status" | "linked" }) => {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const categoryRoles = ROLE_CATEGORY_ROLES[roleCategory];

  const filtered = students.filter(s => {
    // Pre-filter by role category
    const userRole = s.linked_user_id ? (userRolesMap[s.linked_user_id] || "user") : "user";
    if (roleCategory === "admins") {
      // Only show users with admin/super_admin roles (must have linked account)
      if (!s.linked_user_id || !categoryRoles.includes(userRole)) return false;
    } else if (roleCategory === "teachers") {
      if (!s.linked_user_id || !categoryRoles.includes(userRole)) return false;
    } else {
      // students: exclude admin/super_admin/teacher
      if (s.linked_user_id && ["admin", "super_admin", "teacher"].includes(userRole)) return false;
    }
    const q = search.toLowerCase();
    const matchSearch = !q || s.full_name.toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q) || (s.phone || "").includes(q) || (s.city || "").toLowerCase().includes(q) || (s.guardian_name || "").toLowerCase().includes(q);
    const matchLink = linkFilter === "all" || (linkFilter === "linked" && s.linked_user_id) || (linkFilter === "unlinked" && !s.linked_user_id);
    const matchStatus = statusFilter === "all" || (s.source === "system" && statusFilter === "all") || (s.status || "no_courses") === statusFilter;
    const matchSource = sourceFilter === "all" || s.source === sourceFilter;
    const matchRole = roleFilter === "all" || (s.linked_user_id && userRolesMap[s.linked_user_id] === roleFilter);
    return matchSearch && matchLink && matchStatus && matchSource && matchRole;
  }).sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "name") return a.full_name.localeCompare(b.full_name, "vi") * dir;
    if (sortCol === "status") return ((a.status || "").localeCompare(b.status || "")) * dir;
    if (sortCol === "linked") return ((a.linked_user_id ? 1 : 0) - (b.linked_user_id ? 1 : 0)) * dir;
    return 0;
  });

  useEffect(() => { setPage(1); }, [search, linkFilter, statusFilter, sourceFilter, roleFilter, sortCol, sortDir, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const tngCount = students.filter(s => s.source === "tng").length;
  const systemCount = students.filter(s => s.source === "system").length;
  const linkedCount = students.filter(s => s.linked_user_id).length;
  const filteredUsers = allUsers.filter(u => (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()) || u.id.includes(userSearch));

  const getLatestScores = (testResults: TestResult[]) => {
    const sections = ["reading", "listening", "writing", "speaking"];
    return sections.map(s => {
      const latest = testResults.find(r => r.section_type === s);
      return { section: s, score: latest?.score ?? null };
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin": return <Badge className="text-[10px] bg-accent/15 text-accent border-0 gap-1"><ShieldCheck className="h-3 w-3" />Super Admin</Badge>;
      case "admin": return <Badge className="text-[10px] bg-primary/15 text-primary border-0 gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
      case "teacher": return <Badge className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0 gap-1"><UserCog className="h-3 w-3" />Giáo viên</Badge>;
      case "user": return <Badge variant="secondary" className="text-[10px] gap-1"><GraduationCap className="h-3 w-3" />Học viên</Badge>;
      case "guest": return <Badge variant="outline" className="text-[10px] gap-1"><Users className="h-3 w-3" />Khách</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{role}</Badge>;
    }
  };

  const exportCSV = () => {
    const rows = (selectedIds.size > 0 ? filtered.filter(s => selectedIds.has(s.id)) : filtered);
    if (rows.length === 0) { toast.info("Không có dữ liệu để xuất"); return; }
    const headers = ["Họ tên", "Email", "SĐT", "Trạng thái", "Lớp", "Level", "Ngày sinh", "Thành phố", "Phụ huynh", "SĐT PH", "Ngày nhập học"];
    const csvRows = rows.map(s => [
      s.full_name, s.email || "", s.phone || "", s.status || "", s.course_names || "",
      s.current_level || "", s.date_of_birth || "", s.city || "", s.guardian_name || "", s.guardian_phone || "", s.enrollment_date || "",
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers.join(","), ...csvRows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hoc-vien-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${rows.length} học viên`);
  };

  const openComposeEmail = () => {
    const rows = selectedIds.size > 0 ? filtered.filter(s => selectedIds.has(s.id)) : [];
    const withEmail = rows.filter(s => s.email);
    if (withEmail.length === 0) { toast.info("Chọn học viên có email"); return; }
    setComposeEmailOpen(true);
  };
  const emailRecipients = (selectedIds.size > 0 ? filtered.filter(s => selectedIds.has(s.id) && s.email) : []).map(s => ({ email: s.email!, name: s.full_name }));

  const activeCount = filtered.filter(s => s.linked_user_id && userRolesMap[s.linked_user_id] === "user").length;
  const guestCount = filtered.filter(s => s.linked_user_id && userRolesMap[s.linked_user_id] === "guest").length;
  const teacherCount = filtered.filter(s => s.linked_user_id && userRolesMap[s.linked_user_id] === "teacher").length;
  const adminCount = filtered.filter(s => s.linked_user_id && userRolesMap[s.linked_user_id] === "admin").length;
  const superAdminCount = filtered.filter(s => s.linked_user_id && userRolesMap[s.linked_user_id] === "super_admin").length;
  const noAccountCount = filtered.filter(s => !s.linked_user_id).length;

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
          {roleCategory === "students" && (
            <>
               <button onClick={() => { setRoleFilter(roleFilter === "user" ? "all" : "user"); }} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", roleFilter === "user" ? "bg-primary text-primary-foreground border-primary font-bold" : "bg-muted/60 border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary")}>
                <GraduationCap className="h-3 w-3" />{activeCount} học viên
              </button>
              <button onClick={() => { setRoleFilter(roleFilter === "guest" ? "all" : "guest"); }} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", roleFilter === "guest" ? "bg-primary text-primary-foreground border-primary font-bold" : "bg-muted/60 border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary")}>
                <Users className="h-3 w-3" />{guestCount} khách
              </button>
              <span className="h-3.5 w-px bg-border" />
              <button onClick={() => { setSourceFilter(sourceFilter === "tng" ? "all" : "tng"); }} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", sourceFilter === "tng" ? "bg-sky-600 text-white border-sky-600 font-bold" : "bg-muted/60 border-border text-foreground hover:bg-sky-600 hover:text-white hover:border-sky-600")}>
                TnG {filtered.filter(s => s.source === "tng").length}
              </button>
              <button onClick={() => { setSourceFilter(sourceFilter === "system" ? "all" : "system"); }} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", sourceFilter === "system" ? "bg-violet-600 text-white border-violet-600 font-bold" : "bg-muted/60 border-border text-foreground hover:bg-violet-600 hover:text-white hover:border-violet-600")}>
                Ngoài {filtered.filter(s => s.source === "system").length}
              </button>
              <span className="h-3.5 w-px bg-border" />
              <button onClick={() => { setLinkFilter(linkFilter === "linked" ? "all" : "linked"); }} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", linkFilter === "linked" ? "bg-emerald-600 text-white border-emerald-600 font-bold" : "bg-muted/60 border-border text-foreground hover:bg-emerald-600 hover:text-white hover:border-emerald-600")}>
                <Link2 className="h-3 w-3" />{filtered.filter(s => s.linked_user_id).length} liên kết
              </button>
              {noAccountCount > 0 && (
                <button onClick={() => { setLinkFilter(linkFilter === "unlinked" ? "all" : "unlinked"); }} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", linkFilter === "unlinked" ? "bg-rose-600 text-white border-rose-600 font-bold" : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-400")}>
                  <Unlink className="h-3 w-3" />{noAccountCount} chưa TK
                </button>
              )}
            </>
          )}
          {roleCategory === "admins" && (
            <>
              <button onClick={() => { setRoleFilter(roleFilter === "super_admin" ? "all" : "super_admin"); }} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", roleFilter === "super_admin" ? "bg-accent text-accent-foreground border-accent font-bold" : "bg-muted/60 border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent")}>
                <ShieldCheck className="h-3 w-3" />{superAdminCount} Super Admin
              </button>
              <button onClick={() => { setRoleFilter(roleFilter === "admin" ? "all" : "admin"); }} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors cursor-pointer", roleFilter === "admin" ? "bg-primary text-primary-foreground border-primary font-bold" : "bg-muted/60 border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary")}>
                <Shield className="h-3 w-3" />{adminCount} Admin
              </button>
            </>
          )}
          {roleCategory === "teachers" && (
            <>
              <span className="flex items-center gap-1 px-2 py-0.5">
                <UserCog className="h-3 w-3" />{teacherCount} giáo viên
              </span>
            </>
          )}
          {(roleFilter !== "all" || sourceFilter !== "all" || linkFilter !== "all" || statusFilter !== "all") && (
            <button onClick={() => { setRoleFilter("all"); setSourceFilter("all"); setLinkFilter("all"); setStatusFilter("all"); }} className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1">
              Bỏ lọc
            </button>
          )}
          {lastSync && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              {formatDateDDMMYYYY(lastSync)}
            </span>
          )}
        </div>

        {/* Row 2: Search + Actions */}
        <div className="flex gap-2 flex-wrap items-center">
          {search || searchOpen ? (
            <div className="relative flex-1 min-w-[180px] max-w-xs animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)} onBlur={() => { if (!search) setSearchOpen(false); }} placeholder="Tìm tên, SĐT, email, TP, phụ huynh..." className="h-8 pl-8 pr-7 text-xs" autoFocus />
              <button onClick={() => { setSearch(""); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSearchOpen(true)}>
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}
          
          <Button onClick={() => setCreateExternalDialogOpen(true)} size="sm" variant="outline" className="gap-1 h-8 text-xs px-3 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-600 dark:hover:text-white dark:hover:border-emerald-600 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />Tạo TK
          </Button>
          {roleCategory === "students" && (
            <Button onClick={() => setAddStudentOpen(true)} size="sm" variant="outline" className="gap-1 h-8 text-xs px-3 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors">
              <UserPlus className="h-3.5 w-3.5" />Thêm HV
            </Button>
          )}
          <Button onClick={syncStudents} disabled={syncing} size="sm" variant="outline" className="h-8 text-xs px-3 text-sky-600 border-sky-200 hover:bg-sky-600 hover:text-white hover:border-sky-600 dark:text-sky-400 dark:border-sky-800 dark:hover:bg-sky-600 dark:hover:text-white dark:hover:border-sky-600 transition-colors">
            {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}Đồng bộ
          </Button>
          <Button onClick={() => {
            const unlinkedWithEmail = students.filter(s => s.source === "tng" && !s.linked_user_id && s.email);
            if (unlinkedWithEmail.length === 0) { toast.info("Không có học viên nào cần tạo TK"); return; }
            setBulkCreateDialogOpen(true);
          }} disabled={inviting} size="sm" variant="outline" className="h-8 text-xs px-3 text-amber-600 border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-600 dark:hover:text-white dark:hover:border-amber-600 transition-colors">
            {inviting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
            Hàng loạt ({students.filter(s => s.source === "tng" && !s.linked_user_id && s.email).length})
          </Button>
          <Button onClick={previewCleanup} disabled={cleaningUp} size="sm" variant="outline" className="h-8 text-xs px-3 text-rose-600 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-600 dark:hover:text-white dark:hover:border-rose-600 transition-colors">
            {cleaningUp ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserX className="h-3.5 w-3.5 mr-1" />}Dọn
          </Button>
          <span className="h-5 w-px bg-border" />
          <Button onClick={exportCSV} size="sm" variant="outline" className="h-8 text-xs px-3 gap-1">
            <Download className="h-3.5 w-3.5" />Export{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Button>
          {selectedIds.size > 0 && (
            <Button onClick={openComposeEmail} size="sm" variant="outline" className="h-8 text-xs px-3 gap-1 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Send className="h-3.5 w-3.5" />Email ({emailRecipients.length})
            </Button>
          )}
          {!isMobile && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Settings2 className="h-3.5 w-3.5" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Cột hiển thị</p>
                {ALL_COLS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                    <Switch checked={visibleCols.has(col.key)} onCheckedChange={() => toggleCol(col.key)} />
                    <span className="text-xs">{col.label}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground/60 mt-1 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Tự động đồng bộ mỗi ngày lúc 00:00
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{students.length === 0 ? 'Chưa có dữ liệu. Bấm "Đồng bộ TnG" để bắt đầu.' : "Không tìm thấy người dùng phù hợp"}</p>
        </div>
      ) : isMobile ? (
        /* ── Mobile Card View ── */
        <div className="space-y-2">
          {paged.map(s => {
            const isExpanded = expandedStudentId === (s.teachngo_id || s.id);
            const role = s.linked_user_id ? (userRolesMap[s.linked_user_id] || "user") : null;
            return (
              <div key={s.id} className={cn("bg-card border rounded-xl overflow-hidden transition-colors", selectedIds.has(s.id) && "ring-1 ring-primary")}>
                <div className="flex items-center gap-3 p-3" onClick={() => toggleStudentExpand(s.teachngo_id || s.id)}>
                  <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} onClick={e => e.stopPropagation()} />
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary uppercase">{(s.full_name || "?")[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {s.current_level && <Badge variant="secondary" className="text-[9px] h-4">{s.current_level}</Badge>}
                      {s.status && <Badge variant={s.status === "active" ? "default" : "outline"} className="text-[9px] h-4">{s.status === "active" ? "Active" : s.status}</Badge>}
                      {role && getRoleBadge(role)}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {s.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" />{s.phone}</div>}
                      {s.email && <div className="flex items-center gap-1.5 text-muted-foreground truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{s.email}</span></div>}
                      {s.course_names && <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground"><BookOpen className="h-3 w-3 shrink-0" /><span className="truncate">{s.course_names}</span></div>}
                      {s.guardian_name && <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3 w-3" />{s.guardian_name}</div>}
                      {s.guardian_phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3 w-3" />{s.guardian_phone}</div>}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      {s.linked_user_id && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => navigate(`/users/${s.linked_user_id}/performance`)}>
                          <BarChart3 className="h-3 w-3" />Chi tiết
                        </Button>
                      )}
                      {s.source === "tng" && !s.linked_user_id && s.email && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => quickCreateAccount(s)} disabled={creatingForId === s.id}>
                          {creatingForId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}Tạo TK
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Desktop Table View ── */
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-dark text-dark-foreground text-left text-xs uppercase tracking-wider">
                  <th className="px-3 py-3 w-10">
                    <Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} />
                  </th>
                  <th className="px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="inline-flex items-center gap-1">Tên <SortIcon col="name" /></span>
                  </th>
                  {visibleCols.has("phone") && <th className="px-3 py-3 font-semibold w-28">SĐT</th>}
                  {visibleCols.has("email") && <th className="px-3 py-3 font-semibold">Email</th>}
                  {visibleCols.has("level") && <th className="px-3 py-3 font-semibold w-24 text-center">Level</th>}
                  <th className="px-4 py-3 font-semibold w-20 text-center">Nguồn</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    <span className="inline-flex items-center gap-1 justify-center">Trạng thái <SortIcon col="status" /></span>
                  </th>
                  <th className="px-4 py-3 font-semibold w-28 text-center">Vai trò</th>
                  {visibleCols.has("dob") && <th className="px-3 py-3 font-semibold w-24">Ngày sinh</th>}
                  {visibleCols.has("city") && <th className="px-3 py-3 font-semibold w-24">TP</th>}
                  {visibleCols.has("guardian") && <th className="px-3 py-3 font-semibold w-28">Phụ huynh</th>}
                  {visibleCols.has("enrollment") && <th className="px-3 py-3 font-semibold w-24">Nhập học</th>}
                  <th className="px-4 py-3 font-semibold w-28 text-center hidden xl:table-cell">Hoạt động cuối</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((s, idx) => (
                  <>
                    <tr key={s.id} className={cn("transition-colors", selectedIds.has(s.id) ? "bg-primary/5" : idx % 2 === 0 ? "bg-card" : "bg-muted/20", "hover:bg-primary/8")}>
                      <td className="px-3 py-2.5"><Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/80 shrink-0"
                            onClick={() => toggleStudentExpand(s.teachngo_id || s.id)}
                            title="Xem chi tiết"
                          >
                            {expandedStudentId === (s.teachngo_id || s.id) ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                          <div className="flex items-center gap-1">
                            <button className={cn("font-semibold text-left text-[13px] leading-tight", s.linked_user_id ? "hover:text-primary hover:underline cursor-pointer" : "cursor-default text-foreground/70")}
                              onClick={() => s.linked_user_id && navigate(`/users/${s.linked_user_id}/performance`)} disabled={!s.linked_user_id}>
                              {s.full_name}
                            </button>
                            {!s.email && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <MailWarning className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">Chưa có email</p></TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </td>
                      {visibleCols.has("phone") && <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{s.phone || "—"}</td>}
                      {visibleCols.has("email") && <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[180px]">{s.email || "—"}</td>}
                      {visibleCols.has("level") && <td className="px-3 py-2.5 text-center">{s.current_level ? <Badge variant="secondary" className="text-[10px]">{s.current_level}</Badge> : <span className="text-muted-foreground/40 text-[10px]">—</span>}</td>}
                      <td className="px-4 py-2.5 text-center">
                        {s.source === "tng" ? (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <GraduationCap className="h-3 w-3" />TnG
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Users className="h-3 w-3" />HT
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {s.source === "tng" ? (
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full",
                            s.status === "active" && "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
                            s.status === "inactive" && "bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400",
                            s.status === "no_courses" && "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
                            !s.status && "bg-muted text-muted-foreground ring-1 ring-border"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full",
                              s.status === "active" && "bg-emerald-500",
                              s.status === "inactive" && "bg-rose-500",
                              s.status === "no_courses" && "bg-amber-500",
                              !s.status && "bg-muted-foreground/50"
                            )} />
                            {s.status === "active" ? "Active" : s.status === "inactive" ? "Inactive" : s.status === "no_courses" ? "No courses" : "N/A"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {s.linked_user_id ? (
                          <div className="flex items-center justify-center gap-1">
                            {getRoleBadge(userRolesMap[s.linked_user_id] || "user")}
                            <button onClick={() => openEditRoleDialog(s)} className="p-0.5 rounded hover:bg-muted transition-all text-muted-foreground hover:text-foreground" title="Chỉnh sửa vai trò">
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </td>
                      {visibleCols.has("dob") && <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.date_of_birth || "—"}</td>}
                      {visibleCols.has("city") && <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.city || "—"}</td>}
                      {visibleCols.has("guardian") && <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.guardian_name || "—"}</td>}
                      {visibleCols.has("enrollment") && <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.enrollment_date || "—"}</td>}
                      <td className="px-4 py-2.5 text-center hidden xl:table-cell">
                        {s.linked_user_id && lastActivityMap[s.linked_user_id] ? (
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {formatDateDDMMYYYY(lastActivityMap[s.linked_user_id]!)}
                          </span>
                        ) : s.linked_user_id ? (
                          <span className="text-muted-foreground/40 text-[10px]">Chưa có</span>
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          {s.source === "tng" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openLinkDialog(s)} title="Liên kết"><Link2 className="h-3.5 w-3.5" /></Button>
                              {!s.linked_user_id && (
                                <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-[11px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20" onClick={() => quickCreateAccount(s)} disabled={creatingForId === s.id || !s.email} title={s.email ? "Tạo tài khoản nhanh" : "Chưa có email"}>
                                  {creatingForId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                                  Tạo TK
                                </Button>
                              )}
                            </>
                          )}
                          {s.linked_user_id && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary" onClick={() => navigate(`/users/${s.linked_user_id}/performance`)} title="Performance"><BarChart3 className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openResultsDialog(s)} title="Kết quả"><Eye className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                          {s.source === "system" && isSuperAdmin && (
                            <button onClick={() => { setDeletingSystemUser(s); setDeleteSystemDialogOpen(true); }} className="p-1 rounded-md hover:bg-destructive/10 transition-all text-muted-foreground hover:text-destructive" title="Xóa tài khoản">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedStudentId === (s.teachngo_id || s.id) && (
                      <tr key={`${s.id}-detail`} className="bg-muted/20">
                        <td colSpan={7} className="px-6 py-3">
                          {/* Contact info */}
                          <div className="flex flex-wrap gap-x-6 gap-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {s.email ? <span>{s.email}</span> : <span className="italic text-muted-foreground/50">Chưa có email</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {s.phone ? <span className="tabular-nums">{s.phone}</span> : <span className="italic text-muted-foreground/50">Chưa có SĐT</span>}
                            </div>
                          </div>
                          {/* Classes */}
                          {s.source === "tng" && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex items-center gap-2 mb-1.5">
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lớp học</span>
                                {(studentClassesMap[s.teachngo_id] || []).length > 0 && (
                                  <span className="text-[10px] text-muted-foreground/60">({(studentClassesMap[s.teachngo_id] || []).length})</span>
                                )}
                              </div>
                              {loadingClasses === s.teachngo_id ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải...
                                </div>
                              ) : (studentClassesMap[s.teachngo_id] || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">Không có lớp nào.</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {(studentClassesMap[s.teachngo_id] || []).map((c, i) => (
                                    <span key={i} className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity",
                                      c.status === "enrolled" ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-muted text-muted-foreground ring-1 ring-border"
                                    )} onClick={() => navigate(`/classes?search=${encodeURIComponent(c.class_name)}`)}>
                                      {c.class_name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span>Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} / {filtered.length}</span>
              <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                <SelectTrigger className="h-6 w-[70px] text-[11px] border-0 bg-transparent px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}/trang</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1]) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`e${i}`} className="px-1">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p as number)} className={cn("h-7 min-w-[28px] rounded-md text-[11px] font-medium transition-colors", page === p ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        {p}
                      </button>
                    )
                  )}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Liên kết tài khoản: {linkingStudent?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Chọn tài khoản hệ thống để liên kết với học viên này:</p>
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Tìm tài khoản..." className="mb-2" />
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                <div className={cn("px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground italic", !selectedUserId && "bg-primary/5 text-primary font-medium")} onClick={() => setSelectedUserId("")}>
                  — Hủy liên kết —
                </div>
                {filteredUsers.map(u => (
                  <div key={u.id} className={cn("px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm border-t", selectedUserId === u.id && "bg-primary/5 text-primary font-medium")} onClick={() => setSelectedUserId(u.id)}>
                    {u.full_name || "Chưa có tên"} <span className="text-muted-foreground text-xs ml-1">({u.id.slice(0, 8)}...)</span>
                  </div>
                ))}
                {filteredUsers.length === 0 && <p className="px-3 py-4 text-center text-xs text-muted-foreground">Không tìm thấy tài khoản</p>}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(false)}>Hủy</Button>
              <Button size="sm" onClick={handleManualLink} disabled={linkingLoading}>
                {linkingLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{selectedUserId ? "Liên kết" : "Hủy liên kết"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Kết quả IELTS: {resultsStudent?.full_name}</DialogTitle></DialogHeader>
          {resultsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : results.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Chưa có kết quả thi nào.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {getLatestScores(results).map(({ section, score }) => (
                  <div key={section} className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">{section}</p>
                    <p className="text-xl font-bold text-primary">{score !== null ? score : "—"}</p>
                  </div>
                ))}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Bài thi</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Kỹ năng</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Điểm</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Ngày</th>
                  </tr></thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{r.assessment_name}</td>
                        <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px] capitalize">{r.section_type}</Badge></td>
                        <td className="px-3 py-2 font-bold text-primary">{r.score !== null ? r.score : `${r.correct_answers}/${r.total_questions}`}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{formatDateDDMMYYYY(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Created Accounts Dialog */}
      <Dialog open={createdAccountsDialog} onOpenChange={setCreatedAccountsDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tài khoản đã tạo ({createdAccounts.length})</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground"><p className="text-sm text-muted-foreground">Mật khẩu mặc định là <strong>123456</strong>. Học viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.</p></p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tên</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Mật khẩu</th>
              </tr></thead>
              <tbody>
                {createdAccounts.map((a, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.email}</td>
                    <td className="px-3 py-2 font-mono font-bold text-primary">{a.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation (TnG + mixed) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa người dùng đã chọn</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const tngSel = Array.from(selectedIds).filter(id => !id.startsWith("sys_")).length;
                const sysSel = Array.from(selectedIds).filter(id => id.startsWith("sys_")).length;
                const parts = [];
                if (tngSel > 0) parts.push(`${tngSel} học viên TnG`);
                if (sysSel > 0) parts.push(`${sysSel} tài khoản hệ thống`);
                return `Bạn có chắc muốn xóa ${parts.join(" và ")}? Hành động này không thể hoàn tác.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelected} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete System User Confirmation */}
      <AlertDialog open={deleteSystemDialogOpen} onOpenChange={setDeleteSystemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài khoản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa tài khoản <strong>{deletingSystemUser?.full_name}</strong>? Tất cả dữ liệu sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSystem}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSystemUser} disabled={deletingSystem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingSystem && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset mật khẩu học viên</AlertDialogTitle>
            <AlertDialogDescription>
              Mật khẩu sẽ được đặt lại về <strong>123456</strong>. Bạn có chắc muốn tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetPasswords} disabled={resettingPassword}>
              {resettingPassword && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Reset mật khẩu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Results Dialog */}
      <Dialog open={resetResultsDialog} onOpenChange={setResetResultsDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Đã reset mật khẩu ({resetResults.length})</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Mật khẩu đã được đặt lại về <strong>123456</strong>. Học viên nên đổi mật khẩu sau khi đăng nhập lần đầu.</p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tên</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Mật khẩu mới</th>
              </tr></thead>
              <tbody>
                {resetResults.map((a, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 font-mono font-bold text-primary">{a.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cleanup Preview Dialog */}
      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Xử lý tài khoản không hoạt động</AlertDialogTitle>
            <AlertDialogDescription>
              Tìm thấy <strong>{cleanupPreview?.length || 0}</strong> tài khoản không đăng nhập và không nộp bài trong 2 tháng.
              Dữ liệu sẽ bị xóa: kết quả thi, kết quả luyện tập, flashcards, nhật ký hoạt động. Vai trò sẽ chuyển thành Khách.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cleanupPreview && cleanupPreview.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50 sticky top-0">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tên</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Hoạt động cuối</th>
                </tr></thead>
                <tbody>
                  {cleanupPreview.map((u, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5 text-[13px] font-medium">{u.name}</td>
                      <td className="px-3 py-1.5 text-[12px] text-muted-foreground">{u.last_activity ? formatDateDDMMYYYY(u.last_activity) : "Chưa bao giờ"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cleaningUp && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Xử lý {cleanupPreview?.length || 0} tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cleanup Result Dialog */}
      <Dialog open={cleanupResultDialog} onOpenChange={setCleanupResultDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Đã xử lý tài khoản không hoạt động</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Đã chuyển <strong>{cleanupResult?.purged_count || 0}</strong> tài khoản sang vai trò Khách và xóa dữ liệu liên quan.
          </p>
          {cleanupResult?.purged_names && cleanupResult.purged_names.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto p-3">
              <ul className="space-y-1 text-sm">
                {cleanupResult.purged_names.map((name, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <UserX className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Create Confirmation Dialog */}
      <AlertDialog open={bulkCreateDialogOpen} onOpenChange={setBulkCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tạo tài khoản hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              Sẽ tạo tài khoản cho <strong>{students.filter(s => s.source === "tng" && !s.linked_user_id && s.email).length}</strong> học viên chưa liên kết có email. Mật khẩu mặc định: <code className="bg-muted px-1 rounded">123456</code>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Vai trò</label>
              <Select value={createRole} onValueChange={setCreateRole}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Học viên</SelectItem>
                  <SelectItem value="teacher">Giáo viên</SelectItem>
                  <SelectItem value="guest">Khách</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg max-h-48 overflow-y-auto p-3">
              <ul className="space-y-1 text-sm">
                {students.filter(s => s.source === "tng" && !s.linked_user_id && s.email).map(s => (
                  <li key={s.id} className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{s.full_name}</span>
                    <span className="text-muted-foreground text-xs">({s.email})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setBulkCreateDialogOpen(false); createAccountsForStudents(); }}>
              {inviting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Tạo {students.filter(s => s.source === "tng" && !s.linked_user_id && s.email).length} tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Edit Dialog (multi-role, super admin) */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Vai trò: {editingUser?.full_name || "Người dùng"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {ALL_ROLES.map(({ value, label, icon: Icon }) => {
              const isSelected = selectedRoles.includes(value);
              return (
                <button key={value} type="button" onClick={() => toggleRole(value)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all text-left ${
                    isSelected ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}>
                  <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : ""}`} />
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
            {selectedRoles.length === 0 && <p className="text-xs text-destructive px-1"> Người dùng sẽ không có vai trò nào</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditRoleDialogOpen(false)}>Hủy</Button>
            <Button size="sm" onClick={saveRoles} disabled={savingRoles}>
              {savingRoles ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create External Account Dialog */}
      <Dialog open={createExternalDialogOpen} onOpenChange={setCreateExternalDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Tạo tài khoản mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Họ tên *</label>
              <Input value={externalForm.full_name} onChange={e => setExternalForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Email *</label>
              <Input type="email" value={externalForm.email} onChange={e => setExternalForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Mật khẩu <span className="text-muted-foreground font-normal">(mặc định: 123456)</span></label>
              <Input value={externalForm.password} onChange={e => setExternalForm(f => ({ ...f, password: e.target.value }))} placeholder="123456" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Vai trò</label>
              <Select value={externalForm.role} onValueChange={v => setExternalForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleCategory === "students" && (
                    <>
                      <SelectItem value="guest">Khách</SelectItem>
                      <SelectItem value="user">Học viên</SelectItem>
                    </>
                  )}
                  {roleCategory === "teachers" && (
                    <SelectItem value="teacher">Giáo viên</SelectItem>
                  )}
                  {roleCategory === "admins" && (
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={externalForm.send_email} onChange={e => setExternalForm(f => ({ ...f, send_email: e.target.checked }))} className="rounded border-input" />
              <span className="text-xs text-muted-foreground">Gửi email thông báo tài khoản cho người dùng</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateExternalDialogOpen(false)}>Hủy</Button>
            <Button size="sm" onClick={createExternalAccount} disabled={creatingExternal || !externalForm.full_name || !externalForm.email}>
              {creatingExternal ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SyncPreviewDialog
        open={syncPreviewOpen}
        onOpenChange={setSyncPreviewOpen}
        preview={syncPreview}
        onConfirm={confirmSync}
        confirming={syncConfirming}
        entityLabel="học viên"
      />
      <AddStudentDialog open={addStudentOpen} onOpenChange={setAddStudentOpen} onCreated={fetchStudents} />
      <ComposeEmailDialog open={composeEmailOpen} onOpenChange={setComposeEmailOpen} recipients={emailRecipients} />
    </div>
  );
}
