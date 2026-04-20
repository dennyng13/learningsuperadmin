import {
  READING_QUESTION_TYPE_LABELS,
  LISTENING_QUESTION_TYPE_LABELS,
} from "@shared/types/admin";

/**
 * Centralized question type label maps and analysis utilities.
 *
 * Instead of defining QUESTION_TYPE_LABELS in every page/component,
 * import from here.
 */

/* ───── Vietnamese labels for legacy question types ───── */
export const QUESTION_TYPE_LABELS_VI: Record<string, string> = {
  MULTIPLE_CHOICE_ONE_ANSWER: "Trắc nghiệm",
  MULTIPLE_CHOICE_MORE_ANSWERS: "Chọn 2 đáp án",
  MULTIPLE_CHOICE_MULTIPLE_ANSWER: "Chọn nhiều đáp án",
  TRUE_FALSE_NOT_GIVEN: "T/F/NG",
  YES_NO_NOT_GIVEN: "Y/N/NG",
  MATCHING_HEADINGS: "Nối tiêu đề",
  MATCHING_INFORMATION: "Nối thông tin",
  MATCHING_FEATURES: "Nối đặc điểm",
  MATCHING_SENTENCE_ENDINGS: "Nối câu",
  COMPLETION: "Điền từ",
  SENTENCE_COMPLETION: "Hoàn thành câu",
  NOTE_COMPLETION: "Hoàn thành ghi chú",
  SUMMARY_COMPLETION: "Hoàn thành tóm tắt",
  TABLE_COMPLETION: "Hoàn thành bảng",
  FLOW_CHART_COMPLETION: "Hoàn thành sơ đồ",
  DIAGRAM_LABELLING: "Ghi nhãn sơ đồ",
  SHORT_ANSWER: "Trả lời ngắn",
  MAP_LABELLING: "Ghi nhãn bản đồ",
  PLAN_LABELLING: "Ghi nhãn mặt bằng",
};

/* ───── Merged English label map (old generic + new r_/l_ types) ───── */
export const ALL_TYPE_LABELS_EN: Record<string, string> = {
  MULTIPLE_CHOICE_ONE_ANSWER: "Multiple Choice",
  MULTIPLE_CHOICE_MORE_ANSWERS: "Multiple Choice (Multi)",
  IDENTIFYING_INFORMATION: "True / False / Not Given",
  COMPLETION: "Completion / Gap Filling",
  MATCHING: "Matching",
  ...READING_QUESTION_TYPE_LABELS,
  ...LISTENING_QUESTION_TYPE_LABELS,
};

/** Get a human-readable English label for any question type key. */
export function getTypeLabelEn(type: string): string {
  return ALL_TYPE_LABELS_EN[type] || type.replace(/^[rl]_/, "").replace(/_/g, " ");
}

/** Get a human-readable Vietnamese label for any question type key. */
export function getTypeLabelVi(type: string): string {
  return QUESTION_TYPE_LABELS_VI[type] || type.replace(/_/g, " ").toLowerCase();
}

/** Short label suitable for radar chart axes. */
export function getShortTypeLabel(type: string): string {
  const short: Record<string, string> = {
    r_multiple_choice: "MC", l_multiple_choice: "MC",
    r_identifying_information: "T/F/NG",
    r_identifying_views: "Y/N/NG",
    r_matching_information: "Match Info",
    r_matching_headings: "Headings",
    r_matching_features: "Features",
    r_matching_sentence_endings: "Sent. End",
    r_sentence_completion: "Sent. Comp",
    r_summary_completion: "Summary",
    r_diagram_label_completion: "Diagram",
    r_short_answer: "Short Ans",
    l_matching: "Matching",
    l_plan_map_diagram: "Map/Diagram",
    l_form_note_table_completion: "Form/Note",
    l_sentence_completion: "Sent. Comp",
    l_short_answer: "Short Ans",
    MULTIPLE_CHOICE_ONE_ANSWER: "MC",
    MULTIPLE_CHOICE_MORE_ANSWERS: "MC (2)",
    IDENTIFYING_INFORMATION: "T/F/NG",
    COMPLETION: "Completion",
    MATCHING: "Matching",
  };
  return short[type] || type.replace(/^[rl]_/, "").slice(0, 10);
}

/* ───── Exam type → practice URL mapping ───── */
const EXAM_TO_PRACTICE_TYPE: Record<string, string> = {
  r_multiple_choice: "multiple_choice",
  r_identifying_information: "tfng",
  r_identifying_views: "ynng",
  r_matching_headings: "matching_headings",
  r_matching_information: "matching_information",
  r_matching_features: "matching_features",
  r_matching_sentence_endings: "matching_sentence_endings",
  r_sentence_completion: "sentence_completion",
  r_summary_completion: "summary_completion",
  r_diagram_label_completion: "diagram_labeling",
  r_short_answer: "short_answer",
  l_multiple_choice: "multiple_choice",
  l_matching: "multiple_choice",
  l_plan_map_diagram: "diagram_labeling",
  l_form_note_table_completion: "form_completion",
  l_sentence_completion: "sentence_completion",
  l_short_answer: "short_answer",
  MULTIPLE_CHOICE_ONE_ANSWER: "multiple_choice",
  MULTIPLE_CHOICE_MORE_ANSWERS: "multiple_choice",
  IDENTIFYING_INFORMATION: "tfng",
  COMPLETION: "sentence_completion",
  MATCHING: "matching_information",
};

export function examTypeToSkill(type: string): string {
  if (type.startsWith("r_") || ["MULTIPLE_CHOICE_ONE_ANSWER", "MULTIPLE_CHOICE_MORE_ANSWERS", "IDENTIFYING_INFORMATION", "COMPLETION", "MATCHING"].includes(type)) return "reading";
  if (type.startsWith("l_")) return "listening";
  return "reading";
}

export function getPracticeUrl(examType: string): string {
  const skill = examTypeToSkill(examType);
  const practiceType = EXAM_TO_PRACTICE_TYPE[examType];
  const params = new URLSearchParams({ skill });
  if (practiceType) params.set("type", practiceType);
  return `/practice?${params.toString()}`;
}

/* ───── Question type analysis (previously in StudentPerformancePage) ───── */
export interface WeakQuestionType {
  type: string;
  label: string;
  wrongCount: number;
  totalCount: number;
  wrongRate: number;
}

interface AnalyzableResult {
  section_type: string;
  answers: Record<string, string> | null;
  parts_data: any[] | null;
}

/**
 * Analyze per-question-type accuracy from test results.
 * Works for both single-student and class-wide analysis.
 */
export function analyzeAllQuestionTypes(
  testResults: AnalyzableResult[],
  sectionType: string,
): WeakQuestionType[] {
  const typeStats: Record<string, { wrong: number; total: number }> = {};
  const skillResults = testResults.filter(r => r.section_type === sectionType);

  for (const result of skillResults) {
    const answers = result.answers;
    const parts = result.parts_data;
    if (!answers || !parts || typeof answers !== "object" || Object.keys(answers).length === 0) continue;

    for (const part of parts) {
      const groups = part.questionGroups || part.question_groups || [];
      for (const group of groups) {
        const qType = group.type || group.question_type || "UNKNOWN";
        const questions = group.questions || [];
        for (const q of questions) {
          const qId = q.id || `q${q.questionNumber || q.question_number}`;
          const studentAnswer = answers[qId] || answers[String(q.questionNumber || q.question_number)];
          if (studentAnswer === undefined || studentAnswer === null || studentAnswer === "") continue;

          if (!typeStats[qType]) typeStats[qType] = { wrong: 0, total: 0 };
          typeStats[qType].total++;

          const correct = (q.correctAnswer || q.correct_answer || "").trim();
          const alts = correct.split("|").map(a => a.trim().toLowerCase()).filter(Boolean);
          const student = String(studentAnswer).trim().toLowerCase();
          if (!alts.some(a => student === a)) {
            typeStats[qType].wrong++;
          }
        }
      }
    }
  }

  return Object.entries(typeStats)
    .filter(([, s]) => s.total >= 1)
    .map(([type, s]) => ({
      type,
      label: QUESTION_TYPE_LABELS_VI[type] || type.replace(/_/g, " ").toLowerCase(),
      wrongCount: s.wrong,
      totalCount: s.total,
      wrongRate: s.wrong / s.total,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate);
}

/** Top 3 weakest question types (≥2 attempts, >30% wrong). */
export function analyzeWeakQuestionTypes(
  testResults: AnalyzableResult[],
  sectionType: string,
): WeakQuestionType[] {
  return analyzeAllQuestionTypes(testResults, sectionType)
    .filter(w => w.totalCount >= 2 && w.wrongRate > 0.3)
    .slice(0, 3);
}
