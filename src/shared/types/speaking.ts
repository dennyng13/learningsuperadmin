export interface SpeakingQuestion {
  id: string;
  text: string;
}

export interface SpeakingPart {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds for speaking
  prepTime?: number; // seconds for preparation (Part 2)
  questions: SpeakingQuestion[];
  cueCard?: {
    topic: string;
    bulletPoints: string[];
    followUp?: string;
  };
}

export interface SpeakingAssessment {
  id: string;
  name: string;
  bookName?: string;
  parts: SpeakingPart[];
  totalDuration: number; // total exam time in seconds
}

export interface SpeakingRecording {
  partId: string;
  audioUrl: string;
  duration: number;
}
