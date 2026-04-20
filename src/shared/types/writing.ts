export type WritingTaskType = "task1_academic" | "task1_general" | "task2_essay" | "custom";

export interface WritingTask {
  id: string;
  taskNumber: 1 | 2;
  title: string;
  instruction: string;
  stimulus?: string; // legacy: HTML stimulus (chart/table HTML)
  stimulusImageUrl?: string; // uploaded image URL (preferred for new content)
  stimulusType?: "chart" | "diagram" | "table" | "map" | "process";
  ieltsTaskType?: WritingTaskType;
  minWords: number;
  maxWords?: number;
  recommendedTime: number; // in minutes
}

export interface WritingAssessment {
  id: string;
  name: string;
  bookName?: string;
  sectionType: "WRITING";
  duration: number; // in seconds
  tasks: WritingTask[];
}

export interface WritingAnswers {
  [taskId: string]: string;
}

export interface WritingResult {
  assessmentId: string;
  assessmentName: string;
  bookName?: string;
  timeSpent: number;
  tasks: {
    taskId: string;
    taskNumber: number;
    title: string;
    response: string;
    wordCount: number;
    minWords: number;
  }[];
}
