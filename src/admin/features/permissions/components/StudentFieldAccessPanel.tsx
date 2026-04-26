import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FIELD_GROUP_LABELS, type StudentFieldGroup } from "@shared/types/student";
import { Switch } from "@shared/components/ui/switch";
import {
  Loader2, User, Phone, CreditCard, Users, GraduationCap, Wallet, StickyNote,
} from "lucide-react";
import { toast } from "sonner";

const ICON_MAP: Record<StudentFieldGroup, React.ElementType> = {
  basic: User, contact: Phone, personal: CreditCard, guardian: Users,
  academic: GraduationCap, financial: Wallet, admin_notes: StickyNote,
};

const GROUPS: StudentFieldGroup[] = [
  "basic", "contact", "personal", "guardian", "academic", "financial", "admin_notes",
];
const EDITABLE_ROLES = [
  { key: "teacher", label: "Giáo viên" },
  { key: "admin",   label: "Admin" },
];

interface AccessRow {
  id?: string;
  role: string;
  field_group: string;
  can_view: boolean;
  can_edit: boolean;
}

/**
 * Matrix Xem/Sửa cho mỗi (role × field_group) của hồ sơ học viên.
 * Tắt "Xem" sẽ tự tắt "Sửa". Super Admin luôn bật cả 2 (read-only).
 */
export default function StudentFieldAccessPanel() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    const { data } = await supabase.from("student_field_access").select("*");
    setRows((data || []) as AccessRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getAccess = (role: string, group: string) =>
    rows.find((r) => r.role === role && r.field_group === group);

  const handleToggle = async (
    role: string,
    group: string,
    field: "can_view" | "can_edit",
    current: boolean,
  ) => {
    const key = `${role}-${group}-${field}`;
    setSaving(key);

    const existing = getAccess(role, group);
    const newVal = !current;
    const updates: Partial<AccessRow> = { [field]: newVal };
    if (field === "can_view" && !newVal) updates.can_edit = false;

    if (existing?.id) {
      await supabase.from("student_field_access").update(updates).eq("id", existing.id);
    } else {
      await supabase.from("student_field_access").insert({
        role,
        field_group: group,
        can_view: field === "can_view" ? newVal : false,
        can_edit: field === "can_edit" ? newVal : false,
        ...updates,
      });
    }

    toast.success("Đã cập nhật quyền");
    await fetchData();
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 text-xs text-muted-foreground">
            <th className="text-left px-4 py-3 font-medium w-[200px]">Nhóm thông tin</th>
            {EDITABLE_ROLES.map((r) => (
              <th key={r.key} className="text-center px-4 py-3 font-medium" colSpan={2}>
                {r.label}
              </th>
            ))}
            <th className="text-center px-4 py-3 font-medium" colSpan={2}>
              Super Admin
            </th>
          </tr>
          <tr className="bg-muted/20 text-[10px] text-muted-foreground uppercase tracking-wider">
            <th />
            {EDITABLE_ROLES.map((r) => (
              <React.Fragment key={r.key}>
                <th className="px-2 py-1.5 text-center font-medium">Xem</th>
                <th className="px-2 py-1.5 text-center font-medium">Sửa</th>
              </React.Fragment>
            ))}
            <th className="px-2 py-1.5 text-center font-medium">Xem</th>
            <th className="px-2 py-1.5 text-center font-medium">Sửa</th>
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((group) => {
            const Icon = ICON_MAP[group];
            return (
              <tr key={group} className="border-t hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{FIELD_GROUP_LABELS[group]}</span>
                  </div>
                </td>
                {EDITABLE_ROLES.map((role) => {
                  const access = getAccess(role.key, group);
                  const canView = access?.can_view ?? false;
                  const canEdit = access?.can_edit ?? false;
                  const viewSaving = saving === `${role.key}-${group}-can_view`;
                  const editSaving = saving === `${role.key}-${group}-can_edit`;
                  return (
                    <React.Fragment key={role.key}>
                      <td className="px-2 py-3 text-center">
                        {viewSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                        ) : (
                          <Switch
                            checked={canView}
                            onCheckedChange={() => handleToggle(role.key, group, "can_view", canView)}
                          />
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {editSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                        ) : (
                          <Switch
                            checked={canEdit}
                            disabled={!canView}
                            onCheckedChange={() => handleToggle(role.key, group, "can_edit", canEdit)}
                          />
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="px-2 py-3 text-center">
                  <Switch checked disabled className="opacity-60" />
                </td>
                <td className="px-2 py-3 text-center">
                  <Switch checked disabled className="opacity-60" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}