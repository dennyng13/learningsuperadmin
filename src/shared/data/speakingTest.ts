import { SpeakingAssessment } from "@shared/types/speaking";

export const sampleSpeakingTest: SpeakingAssessment = {
  id: "speaking-cam18-t1",
  name: "Speaking Test 1",
  bookName: "Cambridge IELTS 18",
  totalDuration: 840, // ~14 minutes
  parts: [
    {
      id: "part-1",
      title: "Part 1 — Introduction & Interview",
      description: "The examiner will ask you general questions about yourself and familiar topics such as home, family, work, studies, and interests.",
      duration: 300, // 5 minutes
      questions: [
        { id: "p1q1", text: "Where are you from?" },
        { id: "p1q2", text: "Do you work or are you a student?" },
        { id: "p1q3", text: "What do you like about your job/studies?" },
        { id: "p1q4", text: "Do you enjoy reading books? Why or why not?" },
        { id: "p1q5", text: "What kind of books do you prefer?" },
        { id: "p1q6", text: "How often do you read?" },
        { id: "p1q7", text: "Do you prefer reading physical books or e-books?" },
      ],
    },
    {
      id: "part-2",
      title: "Part 2 — Individual Long Turn",
      description: "You will be given a cue card with a topic. You have 1 minute to prepare, then speak for 1–2 minutes.",
      duration: 120, // 2 minutes speaking
      prepTime: 60, // 1 minute preparation
      questions: [
        { id: "p2q1", text: "Speak about the topic on the cue card." },
      ],
      cueCard: {
        topic: "Describe a book that you enjoyed reading recently",
        bulletPoints: [
          "What the book was about",
          "Why you decided to read it",
          "How long it took you to read it",
          "And explain why you enjoyed reading this book",
        ],
        followUp: "Do you often recommend books to other people?",
      },
    },
    {
      id: "part-3",
      title: "Part 3 — Two-way Discussion",
      description: "The examiner will ask deeper questions related to the topic in Part 2.",
      duration: 300, // 5 minutes
      questions: [
        { id: "p3q1", text: "Do you think reading is important in today's world?" },
        { id: "p3q2", text: "How has technology changed the way people read?" },
        { id: "p3q3", text: "Why do some people prefer watching movies to reading books?" },
        { id: "p3q4", text: "Do you think schools should encourage students to read more? How?" },
        { id: "p3q5", text: "What role do libraries play in modern society?" },
      ],
    },
  ],
};

export const allSpeakingAssessments: SpeakingAssessment[] = [sampleSpeakingTest];
