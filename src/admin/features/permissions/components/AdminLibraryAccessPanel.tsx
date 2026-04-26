import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@shared/components/ui/switch";
import { Input } from "@shared/components/ui/input";
import { Loader2, Search, FileText, BookOpen, ClipboardList, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_MODULE_KEYS,
  useUserModuleAccessMatrix,
  type AdminModuleKey,
} from "@shared/hooks/useUserModuleAccess";

interface AdminUser {
  id: string;
  full_name: string;
  email: string | null;
  is_super_admin: boolean;
}

const MODULES: { key: AdminModuleKey; label: string; icon: typeof FileText }[] = [
  { key: ADMIN_MODULE_KEYS.TESTS,        label: "Ngân hàng đề", icon: FileText },
  { key: ADMIN_MODULE_KEYS.FLASHCARDS,   label: "Flashcard",    icon: BookOpen },
  { key: ADMIN_MODULE_KEYS.STUDY_PLANS,  label: "Study Plans",  icon: ClipboardList },
];

/**
 * Per-admin-user access matrix for the **Library Hub** sub-pages.
 *
 * Liệt kê tất cả user có role `admin` hoặc `super_admin`. Super admin luôn
 * mặc định BẬT (read-only) — UI khoá toggle cho row này. Mặc định nếu chưa
 * có row trong `user_module_access` → coi như BẬT (back-compat).
 */
export default function AdminLibraryAccessPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null); // `${userId}:${moduleKey}`
  const { isEnabled, setEnabled, loading: loadingMatrix } = useUserModuleAccessMatrix();

  useEffect(() => {
    (async () => {
      // Lấy user_id của admin + super_admin từ user_roles, sau đó join tay với
      // bảng profiles (Supabase JS không hỗ trợ join lồng auth.users).
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "super_admin"] as any);
      if (rolesErr) {
        toast.error("Không tải được danh sách admin");
        setLoadingUsers(false);
        return;
      }

      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      const superAdminIds = new Set(
        (roles ?? []).filter((r: any) => r.role === "super_admin").map((r: any) => r.user_id),
      );

      if (ids.length === 0) {
        setUsers([]);
        setLoadingUsers(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);

      const list: AdminUser[] = (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name ?? "(không rõ tên)",
        email: p.email ?? null,
        is_super_admin: superAdminIds.has(p.id),
      }));
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setUsers(list);
      setLoadingUsers(false);
    })();
  }, []);

  const handleToggle = async (userId: string, moduleKey: AdminModuleKey, current: boolean) => {
    const id = `${userId}:${moduleKey}`;
    setSaving(id);
    const { error } = await setEnabled(userId, moduleKey, !current);
    if (error) toast.error("Không cập nhật được quyền");
    else toast.success(`Đã ${!current ? "bật" : "tắt"} quyền`);
    setSaving(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  if (loadingUsers || loadingMatrix) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên hoặc email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 text-xs text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium min-w-[220px]">Admin</th>
              {MODULES.map((m) => (
                <th key={m.key} className="text-center px-4 py-3 font-medium min-w-[120px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <m.icon className="h-3.5 w-3.5" />
                    {m.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={1 + MODULES.length} className="text-center text-muted-foreground py-8">
                  Không tìm thấy admin nào
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="font-semibold">{u.full_name}</span>
                      {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                    </div>
                    {u.is_super_admin && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <ShieldCheck className="h-3 w-3" /> Super
                      </span>
                    )}
                  </div>
                </td>
                {MODULES.map((m) => {
                  const current = u.is_super_admin ? true : isEnabled(u.id, m.key);
                  const id = `${u.id}:${m.key}`;
                  return (
                    <td key={m.key} className="px-4 py-3 text-center">
                      <Switch
                        checked={current}
                        disabled={u.is_super_admin || saving === id}
                        onCheckedChange={() => handleToggle(u.id, m.key, current)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Super Admin luôn có quyền truy cập đầy đủ (không thể tắt). Mặc định mọi admin được bật quyền cho đến khi tắt thủ công.
      </p>
    </div>
  );
}
