import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";

export interface TeacherAccessScope {
  teacherId: string | null;
  teacherName: string | null;
  canViewAllClasses: boolean;
}

async function loadTeacherAccessScope(userId: string, canViewAllClasses: boolean): Promise<TeacherAccessScope> {
  const { data: teacher, error } = await supabase
    .from("teachers")
    .select("id, full_name")
    .eq("linked_user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return {
    teacherId: teacher?.id ?? null,
    teacherName: teacher?.full_name ?? null,
    canViewAllClasses,
  };
}

export function useTeacherAccessScope() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const canViewAllClasses = isAdmin || isSuperAdmin;

  return useQuery({
    queryKey: ["teacher-access-scope", user?.id, canViewAllClasses],
    enabled: !!user?.id,
    staleTime: 300_000,
    queryFn: () => loadTeacherAccessScope(user!.id, canViewAllClasses),
  });
}