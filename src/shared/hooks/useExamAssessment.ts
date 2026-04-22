import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Assessment, Part, QuestionGroup, Question, Choice } from "@shared/types/exam";
import { allAssessments } from "@shared/data/sampleTests";

/**
 * Fetches an assessment from the database and transforms it to the Assessment type.
 * Falls back to mock data if the assessment is not found in the DB.
 */
export function useExamAssessment(id: string | undefined) {
  return useQuery<Assessment | undefined>({
    queryKey: ["exam-assessment", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return undefined;

      // 1. Try to find in mock data first (for backward compatibility)
      const mockAssessment = allAssessments.find((a) => a.id === id);
      if (mockAssessment) return mockAssessment;

      // 2. Fetch from database
      const { data: dbAssessment, error: aErr } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .single();

      if (aErr || !dbAssessment) return undefined;

      // 3. Fetch parts
      const { data: dbParts } = await supabase
        .from("parts")
        .select("*")
        .eq("assessment_id", id)
        .order("order");

      if (!dbParts || dbParts.length === 0) {
        return {
          id: dbAssessment.id,
          name: dbAssessment.name,
          bookName: dbAssessment.book_name || undefined,
          imageCover: dbAssessment.image_cover || undefined,
          sectionType: dbAssessment.section_type as Assessment["sectionType"],
          totalQuestions: dbAssessment.total_questions,
          duration: dbAssessment.duration,
          parts: [],
        };
      }

      const partIds = dbParts.map((p) => p.id);

      // 4. Fetch passages, question_groups, questions in parallel
      const [passagesRes, qgRes] = await Promise.all([
        supabase.from("passages").select("*").in("part_id", partIds),
        supabase
          .from("question_groups")
          .select("*")
          .in("part_id", partIds)
          .order("start_question_number", { ascending: true }),
      ]);

      const dbPassages = passagesRes.data || [];
      const dbQGs = qgRes.data || [];

      const qgIds = dbQGs.map((qg) => qg.id);
      let dbQuestions: any[] = [];
      if (qgIds.length > 0) {
        // SECURITY: do NOT fetch correct_answer / explain / passage_evidence to client.
        // Grading happens server-side via the `grade-exam` edge function.
        // Answer keys are revealed only after submission via the `get-answer-key` edge function.
        // Use the `questions_safe` view which excludes correct_answer/explain/passage_evidence at the DB layer.
        const { data } = await supabase
          .from("questions_safe" as any)
          .select("id, question_group_id, question_number, title, text, choices")
          .in("question_group_id", qgIds)
          .order("question_number");
        dbQuestions = data || [];
      }

      // 5. Transform to Assessment type
      const parts: Part[] = dbParts.map((dbPart) => {
        const partPassages = dbPassages.filter((p) => p.part_id === dbPart.id);
        const passage = partPassages[0] || { id: dbPart.id, title: dbPart.title, content: "", description: "" };

        const partQGs = dbQGs.filter((qg) => qg.part_id === dbPart.id);
        const questionGroups: QuestionGroup[] = partQGs.map((qg) => {
          const qgQuestions = dbQuestions.filter((q) => q.question_group_id === qg.id);

          const questions: Question[] = qgQuestions.map((q) => {
            let choices: Choice[] | undefined;
            if (q.choices && Array.isArray(q.choices)) {
              choices = (q.choices as string[]).map((c, i) => ({
                id: `${q.id}-choice-${i}`,
                content: c,
                order: i,
              }));
            }

            return {
              id: q.id,
              questionNumber: q.question_number,
              // SECURITY: empty placeholder — real answer key fetched after submission
              correctAnswer: "",
              explain: undefined,
              passageEvidence: undefined,
              title: q.title || q.text || undefined,
              choices,
            };
          });

          // Map DB question_type to exam QuestionType
          // New r_*/l_* types pass through directly; old types mapped for backward compat
          const typeMap: Record<string, string> = {
            multiple_choice: "MULTIPLE_CHOICE_ONE_ANSWER",
            multiple_choice_pick2: "MULTIPLE_CHOICE_MORE_ANSWERS",
            true_false_not_given: "r_identifying_information",
            yes_no_not_given: "r_identifying_views",
            matching_headings: "r_matching_headings",
            matching_information: "r_matching_information",
            matching_features: "r_matching_features",
            matching: "r_matching_information",
            sentence_completion: "r_sentence_completion",
            summary_completion: "r_summary_completion",
            form_completion: "l_form_note_table_completion",
            note_completion: "l_form_note_table_completion",
            table_completion: "r_summary_completion",
            diagram_labeling: "r_diagram_label_completion",
            short_answer: "r_short_answer",
            plan_map_diagram: "l_plan_map_diagram",
          };

          // Group-level choices
          let groupChoices: Choice[] | undefined;
          if (qg.choices && Array.isArray(qg.choices)) {
            groupChoices = (qg.choices as string[]).map((c, i) => ({
              id: `${qg.id}-choice-${i}`,
              content: c,
              order: i,
            }));
          }

          // If type already starts with r_ or l_, use directly; otherwise map
          const rawType = qg.question_type;
          const mappedType = rawType.startsWith("r_") || rawType.startsWith("l_")
            ? rawType
            : (typeMap[rawType] || "r_sentence_completion");

          return {
            id: qg.id,
            title: qg.title,
            description: qg.description || undefined,
            startQuestionNumber: qg.start_question_number,
            endQuestionNumber: qg.end_question_number,
            type: mappedType as QuestionGroup["type"],
            questions,
            choices: groupChoices,
            completionParagraph: qg.completion_paragraph || undefined,
          };
        });

        return {
          id: dbPart.id,
          title: dbPart.title,
          description: dbPart.description || "",
          order: dbPart.order,
          passage: {
            id: passage.id,
            title: passage.title,
            content: passage.content,
            description: passage.description || undefined,
          },
          questionGroups,
          audioUrl: dbPart.audio_url || undefined,
        };
      });

      return {
        id: dbAssessment.id,
        name: dbAssessment.name,
        bookName: dbAssessment.book_name || undefined,
        imageCover: dbAssessment.image_cover || undefined,
        sectionType: dbAssessment.section_type as Assessment["sectionType"],
        totalQuestions: dbAssessment.total_questions,
        duration: dbAssessment.duration,
        parts,
      };
    },
  });
}
