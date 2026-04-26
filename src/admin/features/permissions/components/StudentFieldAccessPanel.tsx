import React from "react";
import { useState } from "react";
import { FIELD_GROUP_LABELS, type StudentFieldGroup } from "@shared/types/student";
import { Switch } from "@shared/components/ui/switch";
import {
  Loader2, User, Phone, CreditCard, Users, GraduationCap, Wallet, StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { useStudentFieldAccess } from "@shared/hooks/useStudentFieldAccess";

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

/**
 * Matrix Xem/Sửa cho mỗi (role × field_group). Dùng `useStudentFieldAccess`
 * — toàn bộ logic query/mutate/cache nằm trong hook, panel chỉ render.
 */
export default function StudentFieldAccessPanel() {
  const { rows, loading, canView, canEdit, toggleAccess } = useStudentFieldAccess();
  const [saving, setSaving] = useState<string | null>(null);

  const handleToggle = async (
    role: string,
    group: string,
    field: "can_view" | "can_edit",
    current: boolean,
  ) => {
    const key = `${role}-${group}-${field}`;
    setSaving(key);
    const { error } = await toggleAccess(role, group, field, !current);
    if (error) {
      toast.error("Không thể cập nhật quyền");
    } else {
      toast.success("Đã cập nhật quyền");
    }
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
            <th className="text-center px-4 py-3 font-medium" colSpan={2}>Super Admin</th>
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
                  const cv = canView(role.key as any, group);
                  const ce = canEdit(role.key as any, group);
                  const viewSaving = saving === `${role.key}-${group}-can_view`;
                  const editSaving = saving === `${role.key}-${group}-can_edit`;
                  return (
                    <React.Fragment key={role.key}>
                      <td className="px-2 py-3 text-center">
                        {viewSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                        ) : (
                          <Switch
                            checked={cv}
                            onCheckedChange={() => handleToggle(role.key, group, "can_view", cv)}
                          />
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {editSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                        ) : (
                          <Switch
                            checked={ce}
                            disabled={!cv}
                            onCheckedChange={() => handleToggle(role.key, group, "can_edit", ce)}
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
      {/* Suppress unused warning for rows (debug aid: matrix sẽ dùng count) */}
      <span className="hidden">{rows.length}</span>
    </div>
  );
}
