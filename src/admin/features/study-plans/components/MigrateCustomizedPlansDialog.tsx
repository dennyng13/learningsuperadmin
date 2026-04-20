import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Loader2, ArrowRight, UserCheck } from "lucide-react";

interface CustomPlan {
  id: string;
  plan_name: string | null;
  teachngo_student_id: string | null;
  student_ids: string[] | null;
  program: string | null;
  assigned_level: string | null;
  total_sessions: number | null;
  schedule_pattern: any;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  studentName: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMigrated?: () => void;
}

export default function MigrateCustomizedPlansDialog({ open, onOpenChange, onMigrated }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [migratedIds, setMigratedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      // Get customized plans without a class
      const { data: plansData } = await supabase
        .from("study_plans")
        .select("id, plan_name, teachngo_student_id, student_ids, program, assigned_level, total_sessions, schedule_pattern, start_date, end_date, created_by, class_ids")
        .eq("plan_type", "customized");

      // Filter out plans that already have class_ids
      const unlinked = (plansData || []).filter((p: any) => {
        const cids = Array.isArray(p.class_ids) ? p.class_ids : [];
        return cids.length === 0;
      });

      // Get student names
      const studentIds = unlinked
        .map((p: any) => p.teachngo_student_id)
        .filter(Boolean);
      
      let studentMap: Record<string, string> = {};
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from("teachngo_students")
          .select("teachngo_id, full_name")
          .in("teachngo_id", studentIds);
        if (students) {
          for (const s of students) studentMap[s.teachngo_id] = s.full_name;
        }
      }

      setPlans(unlinked.map((p: any) => ({
        ...p,
        student_ids: Array.isArray(p.student_ids) ? p.student_ids : [],
        studentName: p.teachngo_student_id ? (studentMap[p.teachngo_student_id] || p.teachngo_student_id) : null,
      })));
      setSelected(new Set(unlinked.map((p: any) => p.id)));
      setLoading(false);
    })();
  }, [open]);

  const handleMigrate = async () => {
    const toMigrate = plans.filter(p => selected.has(p.id));
    if (toMigrate.length === 0) return;

    setMigrating(true);
    let successCount = 0;

    for (const plan of toMigrate) {
      try {
        const className = plan.studentName
          ? `Private — ${plan.studentName}`
          : plan.plan_name || `Private class`;

        // Create private class
        const { data: newClass, error } = await supabase
          .from("teachngo_classes")
          .insert({
            teachngo_class_id: `LP-MIG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            class_name: className,
            class_type: "private",
            data_source: "manual",
            max_students: 1,
            program: plan.program,
            level: plan.assigned_level,
            start_date: plan.start_date,
            end_date: plan.end_date,
            status: "active",
            study_plan_id: plan.id,
          } as any)
          .select("id")
          .single();

        if (error) throw error;

        // Enroll student
        if (plan.teachngo_student_id && newClass) {
          await supabase.from("teachngo_class_students").insert({
            class_id: newClass.id,
            teachngo_student_id: plan.teachngo_student_id,
            status: "enrolled",
          });
        }

        // Link plan → class
        if (newClass) {
          await supabase
            .from("study_plans")
            .update({ class_ids: [newClass.id], plan_type: "structured" } as any)
            .eq("id", plan.id);
        }

        setMigratedIds(prev => new Set([...prev, plan.id]));
        successCount++;
      } catch (err: any) {
        console.error(`Failed to migrate plan ${plan.id}:`, err);
      }
    }

    toast.success(`Đã chuyển đổi ${successCount}/${toMigrate.length} kế hoạch sang format lớp mới`);
    setMigrating(false);
    if (successCount > 0) onMigrated?.();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const unmigrated = plans.filter(p => !migratedIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Chuyển đổi kế hoạch cá nhân</DialogTitle>
          <DialogDescription>
            Chuyển các kế hoạch "Customized" cũ sang format lớp Private mới. Mỗi kế hoạch sẽ được tạo 1 lớp Private tương ứng.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : unmigrated.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {plans.length > 0 && migratedIds.size > 0
              ?"Tất cả kế hoạch đã được chuyển đổi!"
              : "Không có kế hoạch Customized nào cần chuyển đổi."}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{unmigrated.length} kế hoạch cần chuyển đổi</span>
              <button
                onClick={() => {
                  if (selected.size === unmigrated.length) setSelected(new Set());
                  else setSelected(new Set(unmigrated.map(p => p.id)));
                }}
                className="text-primary hover:underline"
              >
                {selected.size === unmigrated.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {unmigrated.map(plan => (
                <label
                  key={plan.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(plan.id)}
                    onCheckedChange={() => toggleSelect(plan.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{plan.plan_name || "Kế hoạch không tên"}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {plan.studentName && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <UserCheck className="h-3 w-3" />
                          {plan.studentName}
                        </Badge>
                      )}
                      {plan.program && <Badge variant="outline" className="text-[10px]">{plan.program}</Badge>}
                      {plan.assigned_level && <Badge variant="outline" className="text-[10px]">{plan.assigned_level}</Badge>}
                      {plan.total_sessions && <span className="text-[10px] text-muted-foreground">{plan.total_sessions} buổi</span>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <span className="text-[10px] text-primary font-medium shrink-0 mt-1">Lớp Private</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button
                onClick={handleMigrate}
                disabled={migrating || selected.size === 0}
              >
                {migrating && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Chuyển đổi {selected.size} kế hoạch
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
