import { Badge } from "@shared/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLevelColorConfig } from "@shared/utils/levelColors";
import { GraduationCap, School, Users } from "lucide-react";

interface PlanAssignmentInfoProps {
  assignedLevel?: string | null;
  classIds?: string[];
  studentIds?: string[];
  teachngoStudentId?: string | null;
}

/** Shared lookup hook — fetches class & student names once for the page */
export function useAssignmentLookups(plans: { class_ids?: string[]; student_ids?: string[]; teachngo_student_id?: string | null }[]) {
  const allClassIds = [...new Set(plans.flatMap(p => p.class_ids || []))];
  const allStudentIds = [...new Set([
    ...plans.flatMap(p => p.student_ids || []),
    ...plans.map(p => p.teachngo_student_id).filter(Boolean) as string[],
  ])];

  const classQuery = useQuery({
    queryKey: ["assignment-classes", allClassIds],
    enabled: allClassIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("classes" as any)
        .select("id, class_name")
        .in("id", allClassIds);
      return new Map((data || []).map(c => [c.id, c.class_name]));
    },
    staleTime: 5 * 60 * 1000,
  });

  const studentQuery = useQuery({
    queryKey: ["assignment-students", allStudentIds],
    enabled: allStudentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("synced_students" as any)
        .select("teachngo_id, full_name")
        .in("teachngo_id", allStudentIds);
      return new Map((data || []).map(s => [s.teachngo_id, s.full_name]));
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    classNames: classQuery.data || new Map<string, string>(),
    studentNames: studentQuery.data || new Map<string, string>(),
  };
}

export function PlanAssignmentInfo({
  assignedLevel,
  classIds = [],
  studentIds = [],
  teachngoStudentId,
  classNames,
  studentNames,
}: PlanAssignmentInfoProps & {
  classNames: Map<string, string>;
  studentNames: Map<string, string>;
}) {
  const hasAssignment = assignedLevel || classIds.length > 0 || studentIds.length > 0;
  if (!hasAssignment) return null;

  const levelColor = assignedLevel ? getLevelColorConfig(assignedLevel) : null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {assignedLevel && (
        <Badge variant="outline" className={`text-[9px] gap-0.5 ${levelColor ? `${levelColor.bg} ${levelColor.border} ${levelColor.text}` : ""}`}>
          <GraduationCap className="w-2.5 h-2.5" />
          {assignedLevel}
        </Badge>
      )}
      {classIds.length > 0 && (
        <Badge variant="outline" className="text-[9px] gap-0.5 bg-sky-50 text-sky-700 border-sky-200">
          <School className="w-2.5 h-2.5" />
          {classIds.length === 1
            ? (classNames.get(classIds[0]) || "1 lớp")
            : `${classIds.length} lớp`}
        </Badge>
      )}
      {studentIds.length > 0 && (
        <Badge variant="outline" className="text-[9px] gap-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
          <Users className="w-2.5 h-2.5" />
          {studentIds.length === 1
            ? (studentNames.get(studentIds[0]) || "1 HV")
            : `${studentIds.length} HV`}
        </Badge>
      )}
    </div>
  );
}
