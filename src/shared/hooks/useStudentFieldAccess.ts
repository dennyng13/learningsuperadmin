import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { StudentFieldGroup } from "@shared/types/student";

interface FieldAccess {
  field_group: StudentFieldGroup;
  can_view: boolean;
  can_edit: boolean;
}

export function useStudentFieldAccess() {
  const { primaryRole } = useAuth();

  const { data: accessRules = [] } = useQuery({
    queryKey: ["student-field-access", primaryRole],
    enabled: !!primaryRole && primaryRole !== "user" && primaryRole !== "guest",
    queryFn: async () => {
      const { data } = await supabase
        .from("student_field_access")
        .select("field_group, can_view, can_edit")
        .eq("role", primaryRole!);
      return (data || []) as FieldAccess[];
    },
  });

  const canView = (group: StudentFieldGroup): boolean => {
    if (primaryRole === "super_admin") return true;
    return accessRules.find(r => r.field_group === group)?.can_view ?? false;
  };

  const canEdit = (group: StudentFieldGroup): boolean => {
    if (primaryRole === "super_admin") return true;
    return accessRules.find(r => r.field_group === group)?.can_edit ?? false;
  };

  return { canView, canEdit, accessRules };
}
