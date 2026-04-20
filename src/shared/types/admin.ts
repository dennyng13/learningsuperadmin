export type AdminRole = "super_admin" | "admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: string;
  isActive: boolean;
}

export type IELTSSkill = "reading" | "listening" | "writing" | "speaking";

export type ReadingQuestionType =
  | "r_multiple_choice"
  | "r_identifying_information"       // True/False/Not Given
  | "r_identifying_views"             // Yes/No/Not Given
  | "r_matching_information"
  | "r_matching_headings"
  | "r_matching_features"
  | "r_matching_sentence_endings"
  | "r_sentence_completion"
  | "r_summary_completion"            // Summary/note/table/flow-chart completion
  | "r_diagram_label_completion"
  | "r_short_answer";

export type ListeningQuestionType =
  | "l_multiple_choice"
  | "l_matching"
  | "l_plan_map_diagram"              // Plan/map/diagram labelling
  | "l_form_note_table_completion"    // Form/note/table/flow chart/summary completion
  | "l_sentence_completion"
  | "l_short_answer";

export const READING_QUESTION_TYPE_LABELS: Record<ReadingQuestionType, string> = {
  r_multiple_choice: "Multiple choice",
  r_identifying_information: "Identifying information (True/False/Not Given)",
  r_identifying_views: "Identifying writer's views/claims (Yes/No/Not Given)",
  r_matching_information: "Matching information",
  r_matching_headings: "Matching headings",
  r_matching_features: "Matching features",
  r_matching_sentence_endings: "Matching sentence endings",
  r_sentence_completion: "Sentence completion",
  r_summary_completion: "Summary/note/table/flow-chart completion",
  r_diagram_label_completion: "Diagram label completion",
  r_short_answer: "Short-answer questions",
};

export const LISTENING_QUESTION_TYPE_LABELS: Record<ListeningQuestionType, string> = {
  l_multiple_choice: "Multiple choice",
  l_matching: "Matching",
  l_plan_map_diagram: "Plan/map/diagram labelling",
  l_form_note_table_completion: "Form/note/table/flow chart/summary completion",
  l_sentence_completion: "Sentence completion",
  l_short_answer: "Short-answer questions",
};

export type WritingTaskType = "task1_academic" | "task1_general" | "task2";

export type SpeakingPartType = "part1" | "part2" | "part3";

export interface AdminTestDraft {
  id: string;
  name: string;
  bookName?: string;
  description?: string;
  skills: IELTSSkill[];
  status: "draft" | "published" | "archived";
  availableFrom?: string;
  availableTo?: string;
  duration?: number; // minutes
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
