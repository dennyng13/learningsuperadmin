import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AssessmentRow {
  id: string;
  name: string;
  book_name: string | null;
  section_type: string;
  status: string;
  duration: number;
  total_questions: number;
  image_cover: string | null;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Exercise-specific fields
  content_type: string;
  difficulty: string;
  scoring_mode: string;
  timer_enabled: boolean;
  program: string | null;
  question_types: string[] | null;
  description: string | null;
  course_level: string | null;
}

export function useAssessments(statusFilter?: string, contentTypeFilter?: string) {
  return useQuery({
    queryKey: ["assessments", statusFilter, contentTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from("assessments")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (contentTypeFilter && contentTypeFilter !== "all") {
        query = query.eq("content_type", contentTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AssessmentRow[];
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete in order: questions → question_groups → passages → parts → assessment
      const { data: parts } = await supabase.from("parts").select("id").eq("assessment_id", id);
      const partIds = parts?.map((p) => p.id) || [];

      if (partIds.length > 0) {
        const { data: qgs } = await supabase.from("question_groups").select("id").in("part_id", partIds);
        const qgIds = qgs?.map((q) => q.id) || [];

        if (qgIds.length > 0) {
          await supabase.from("questions").delete().in("question_group_id", qgIds);
        }
        await supabase.from("question_groups").delete().in("part_id", partIds);
        await supabase.from("passages").delete().in("part_id", partIds);
        await supabase.from("parts").delete().eq("assessment_id", id);
      }

      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Đã xóa");
    },
    onError: (err: Error) => {
      toast.error("Lỗi xóa: " + err.message);
    },
  });
}

export function useDuplicateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data: src, error: srcErr } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", sourceId)
        .single();
      if (srcErr || !src) throw srcErr || new Error("Not found");

      const { data: newAssessment, error: aErr } = await supabase
        .from("assessments")
        .insert({
          name: src.name + " (Copy)",
          book_name: src.book_name,
          section_type: src.section_type,
          duration: src.duration,
          total_questions: src.total_questions,
          image_cover: src.image_cover,
          status: "draft",
          content_type: (src as any).content_type || "test",
          difficulty: (src as any).difficulty || "medium",
          scoring_mode: (src as any).scoring_mode || "ielts_band",
          timer_enabled: (src as any).timer_enabled || false,
          program: (src as any).program || null,
          question_types: (src as any).question_types || [],
          description: (src as any).description || null,
          course_level: (src as any).course_level || null,
        } as any)
        .select()
        .single();
      if (aErr || !newAssessment) throw aErr || new Error("Insert failed");

      // Duplicate parts
      const { data: parts } = await supabase.from("parts").select("*").eq("assessment_id", sourceId).order("order");
      for (const part of parts || []) {
        const { data: newPart } = await supabase
          .from("parts")
          .insert({
            assessment_id: newAssessment.id,
            title: part.title,
            description: part.description,
            order: part.order,
            audio_url: part.audio_url,
            prep_time: part.prep_time,
            duration: part.duration,
            cue_card: part.cue_card,
          })
          .select()
          .single();
        if (!newPart) continue;

        const { data: passages } = await supabase.from("passages").select("*").eq("part_id", part.id);
        for (const passage of passages || []) {
          await supabase.from("passages").insert({
            part_id: newPart.id,
            title: passage.title,
            content: passage.content,
            description: passage.description,
          });
        }

        const { data: qgs } = await supabase.from("question_groups").select("*").eq("part_id", part.id);
        for (const qg of qgs || []) {
          const { data: newQg } = await supabase
            .from("question_groups")
            .insert({
              part_id: newPart.id,
              title: qg.title,
              description: qg.description,
              question_type: qg.question_type,
              start_question_number: qg.start_question_number,
              end_question_number: qg.end_question_number,
              choices: qg.choices,
              completion_paragraph: qg.completion_paragraph,
            })
            .select()
            .single();
          if (!newQg) continue;

          const { data: questions } = await supabase.from("questions").select("*").eq("question_group_id", qg.id);
          for (const q of questions || []) {
            await supabase.from("questions").insert({
              question_group_id: newQg.id,
              question_number: q.question_number,
              title: q.title,
              text: q.text,
              choices: q.choices,
              correct_answer: q.correct_answer,
              explain: q.explain,
            });
          }
        }
      }

      return newAssessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Đã nhân bản");
    },
    onError: (err: Error) => {
      toast.error("Lỗi nhân bản: " + err.message);
    },
  });
}

export function useAssessmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["assessment-detail", id],
    enabled: !!id && id !== "new",
    queryFn: async () => {
      const { data: assessment, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;

      const { data: parts } = await supabase
        .from("parts")
        .select("*")
        .eq("assessment_id", id!)
        .order("order");

      const partIds = parts?.map((p) => p.id) || [];

      let passages: any[] = [];
      let questionGroups: any[] = [];
      let questions: any[] = [];

      if (partIds.length > 0) {
        const [pRes, qgRes] = await Promise.all([
          // Order passages by created_at so admin sees them in the same
          // sequence they were added (Passage 1, Passage 2, ...). Without
          // this Postgres returns rows in arbitrary heap order, which
          // caused "edit blank in Passage 2 jumps to Passage 1" — the
          // visually-Passage-2 card was rendering Passage 1's content.
          supabase
            .from("passages")
            .select("*")
            .in("part_id", partIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("question_groups")
            .select("*")
            .in("part_id", partIds)
            .order("start_question_number", { ascending: true }),
        ]);
        passages = pRes.data || [];
        questionGroups = qgRes.data || [];

        const qgIds = questionGroups.map((qg: any) => qg.id);
        if (qgIds.length > 0) {
          const { data } = await supabase
            .from("questions")
            .select("*")
            .in("question_group_id", qgIds)
            .order("question_number");
          questions = data || [];
        }
      }

      return { assessment, parts: parts || [], passages, questionGroups, questions };
    },
  });
}

export function useSaveAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      name: string;
      bookName: string;
      sectionType: string;
      duration: number;
      status: string;
      availableFrom?: string;
      availableUntil?: string;
      // New fields
      contentType?: string;
      difficulty?: string;
      scoringMode?: string;
      timerEnabled?: boolean;
      program?: string;
      questionTypes?: string[];
      description?: string;
      courseLevel?: string;
      allowRetake?: boolean;
    }) => {
      const record: any = {
        name: payload.name,
        book_name: payload.bookName || null,
        section_type: payload.sectionType,
        duration: payload.duration,
        status: payload.status,
        available_from: payload.availableFrom || null,
        available_until: payload.availableUntil || null,
      };

      // Include new fields if provided
      if (payload.contentType !== undefined) record.content_type = payload.contentType;
      if (payload.difficulty !== undefined) record.difficulty = payload.difficulty;
      if (payload.scoringMode !== undefined) record.scoring_mode = payload.scoringMode;
      if (payload.timerEnabled !== undefined) record.timer_enabled = payload.timerEnabled;
      if (payload.program !== undefined) record.program = payload.program || null;
      if (payload.questionTypes !== undefined) record.question_types = payload.questionTypes;
      if (payload.description !== undefined) record.description = payload.description || null;
      if (payload.courseLevel !== undefined) record.course_level = payload.courseLevel || null;
      if (payload.allowRetake !== undefined) record.allow_retake = payload.allowRetake;

      if (payload.id) {
        const { data, error } = await supabase
          .from("assessments")
          .update({ ...record, updated_at: new Date().toISOString() })
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("assessments")
          .insert(record)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Đã lưu");
    },
    onError: (err: Error) => {
      toast.error("Lỗi lưu: " + err.message);
    },
  });
}
