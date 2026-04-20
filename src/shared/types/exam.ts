export type SectionType = "READING" | "LISTENING";

export type QuestionType =
  | "MULTIPLE_CHOICE_ONE_ANSWER"
  | "MULTIPLE_CHOICE_MORE_ANSWERS"
  | "IDENTIFYING_INFORMATION"
  | "COMPLETION"
  | "MATCHING"
  // Reading-specific types
  | "r_multiple_choice"
  | "r_identifying_information"
  | "r_identifying_views"
  | "r_matching_information"
  | "r_matching_headings"
  | "r_matching_features"
  | "r_matching_sentence_endings"
  | "r_sentence_completion"
  | "r_summary_completion"
  | "r_diagram_label_completion"
  | "r_short_answer"
  // Listening-specific types
  | "l_multiple_choice"
  | "l_matching"
  | "l_plan_map_diagram"
  | "l_form_note_table_completion"
  | "l_sentence_completion"
  | "l_short_answer";

export type IdentifyChoice = "TRUE" | "FALSE" | "NOT_GIVEN";

export interface Assessment {
  id: string;
  name: string;
  bookName?: string;
  imageCover?: string;
  sectionType: SectionType;
  totalQuestions: number;
  duration: number; // in seconds
  parts: Part[];
}

export interface Part {
  id: string;
  title: string;
  description: string;
  order: number;
  passage: Passage;
  questionGroups: QuestionGroup[];
  audioUrl?: string; // for listening parts
}

export interface Passage {
  id: string;
  title: string;
  content: string;
  description?: string;
}

export interface QuestionGroup {
  id: string;
  title: string;
  description?: string;
  startQuestionNumber: number;
  endQuestionNumber: number;
  type: QuestionType;
  questions: Question[];
  choices?: Choice[]; // for MCQ
  completionParagraph?: string; // for completion
}

export interface Question {
  id: string;
  questionNumber: number;
  correctAnswer: string;
  explain?: string;
  passageEvidence?: string; // relevant text from passage for highlight in review
  title?: string; // for MCQ / identifying info
  choices?: Choice[];
}

export interface Choice {
  id: string;
  content: string;
  order: number;
}

export interface UserAnswers {
  [questionNumber: number]: string;
}

export interface ExamResult {
  assessmentId: string;
  assessmentName: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number; // band score
  timeSpent: number; // in seconds
  answers: UserAnswers;
  parts: Part[];
}
