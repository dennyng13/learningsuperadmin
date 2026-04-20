/**
 * useWritingAssessment — load a Writing assessment from DB and shape it
 * into the WritingAssessment / WritingTask format used by WritingExamPage.
 *
 * Each `parts` row = 1 Writing task. Per-task config lives in `parts.task_metadata`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WritingAssessment, WritingTask, WritingTaskType } from "@shared/types/writing";

interface TaskMetadata {
  ielts_task_type?: WritingTaskType;
  stimulus_image_url?: string;
  min_words?: number;
  max_words?: number;
}

const DEFAULT_MIN: Record<WritingTaskType, number> = {
  task1_academic: 150,
  task1_general: 150,
  task2_essay: 250,
  custom: 100,
};

export function useWritingAssessment(id: string | undefined) {
  return useQuery({
    queryKey: ["writing-assessment", id],
    enabled: !!id,
    queryFn: async (): Promise<WritingAssessment | null> => {
      if (!id) return null;

      const { data: assessment, error: aErr } = await supabase
        .from("assessments")
        .select("id, name, book_name, section_type, duration")
        .eq("id", id)
        .eq("section_type", "WRITING")
        .maybeSingle();
      if (aErr || !assessment) return null;

      const { data: parts, error: pErr } = await supabase
        .from("parts")
        .select("id, title, description, order, task_metadata")
        .eq("assessment_id", id)
        .order("order", { ascending: true });
      if (pErr || !parts) return null;

      // Each part has at most 1 question_group with 1 question (the prompt).
      const partIds = parts.map(p => p.id);
      const { data: qgs } = await supabase
        .from("question_groups")
        .select("id, part_id")
        .in("part_id", partIds);
      const qgIds = (qgs || []).map(g => g.id);
      const { data: questions } = qgIds.length
        ? await supabase.from("questions_safe" as any).select("question_group_id, text").in("question_group_id", qgIds)
        : { data: [] as any[] };

      const promptByPart = new Map<string, string>();
      (qgs || []).forEach(g => {
        const q = (questions || []).find(qq => qq.question_group_id === g.id);
        if (q?.text) promptByPart.set(g.part_id, q.text);
      });

      const tasks: WritingTask[] = parts.map((p, idx) => {
        const meta = ((p as any).task_metadata as TaskMetadata) || {};
        const taskType = meta.ielts_task_type || "custom";
        const minWords = meta.min_words ?? DEFAULT_MIN[taskType];
        const promptText = promptByPart.get(p.id) || p.description || "";
        return {
          id: p.id,
          taskNumber: (idx === 0 ? 1 : 2) as 1 | 2,
          title: p.title || `Task ${idx + 1}`,
          instruction: promptText,
          stimulusImageUrl: meta.stimulus_image_url,
          ieltsTaskType: taskType,
          minWords,
          maxWords: meta.max_words,
          recommendedTime: idx === 0 ? 20 : 40,
        };
      });

      return {
        id: assessment.id,
        name: assessment.name,
        bookName: assessment.book_name || undefined,
        sectionType: "WRITING",
        duration: assessment.duration || 3600,
        tasks,
      };
    },
  });
}
