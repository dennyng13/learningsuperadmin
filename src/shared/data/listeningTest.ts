import { Assessment } from "@shared/types/exam";

// Demo audio URLs (free CC0 audio for demo purposes)
const DEMO_AUDIO_PART1 = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const DEMO_AUDIO_PART2 = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3";

export const sampleListeningTest: Assessment = {
  id: "cam-18-test-1-listening",
  name: "Academic Listening Test 1",
  bookName: "Cambridge IELTS 18",
  sectionType: "LISTENING",
  totalQuestions: 10,
  duration: 30 * 60, // 30 minutes
  parts: [
    {
      id: "listening-part-1",
      title: "Section 1",
      description: "Listen to a conversation between two people making arrangements for a trip.",
      order: 1,
      audioUrl: DEMO_AUDIO_PART1,
      passage: {
        id: "lp-1",
        title: "Section 1 — Trip Arrangements",
        content: `<p><strong>Questions 1–5:</strong> Complete the notes below. Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer.</p>
<div style="background: hsl(210 20% 96%); padding: 16px; border-radius: 8px; margin: 12px 0;">
<p style="font-weight: bold; margin-bottom: 8px;">Trip Booking Notes</p>
<p>Destination: _______ (Q1)</p>
<p>Number of travellers: _______ (Q2)</p>
<p>Departure date: _______ (Q3)</p>
<p>Type of accommodation: _______ (Q4)</p>
<p>Total cost per person: £_______ (Q5)</p>
</div>

<p><strong>Questions 6–7:</strong> Choose the correct letter, A, B, or C.</p>`,
      },
      questionGroups: [
        {
          id: "lqg-1",
          title: "Questions 1–5",
          description: "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.",
          startQuestionNumber: 1,
          endQuestionNumber: 5,
          type: "COMPLETION",
          questions: [
            { id: "lq1", questionNumber: 1, title: "Destination: _______", correctAnswer: "Barcelona" },
            { id: "lq2", questionNumber: 2, title: "Number of travellers: _______", correctAnswer: "4" },
            { id: "lq3", questionNumber: 3, title: "Departure date: _______", correctAnswer: "15 March" },
            { id: "lq4", questionNumber: 4, title: "Type of accommodation: _______", correctAnswer: "hotel" },
            { id: "lq5", questionNumber: 5, title: "Total cost per person: £_______", correctAnswer: "450" },
          ],
        },
        {
          id: "lqg-2",
          title: "Questions 6–7",
          description: "Choose the correct letter, A, B, or C.",
          startQuestionNumber: 6,
          endQuestionNumber: 7,
          type: "MULTIPLE_CHOICE_ONE_ANSWER",
          questions: [
            {
              id: "lq6",
              questionNumber: 6,
              title: "Why does the woman prefer flying in the morning?",
              correctAnswer: "B",
              choices: [
                { id: "lq6a", content: "The tickets are cheaper", order: 1 },
                { id: "lq6b", content: "They will have more time at the destination", order: 2 },
                { id: "lq6c", content: "There is less traffic to the airport", order: 3 },
              ],
            },
            {
              id: "lq7",
              questionNumber: 7,
              title: "What will they do on the first day?",
              correctAnswer: "A",
              choices: [
                { id: "lq7a", content: "Visit a museum", order: 1 },
                { id: "lq7b", content: "Go to the beach", order: 2 },
                { id: "lq7c", content: "Take a guided tour of the city", order: 3 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "listening-part-2",
      title: "Section 2",
      description: "Listen to a talk about a new community centre.",
      order: 2,
      audioUrl: DEMO_AUDIO_PART2,
      passage: {
        id: "lp-2",
        title: "Section 2 — Community Centre",
        content: `<p><strong>Questions 8–10:</strong> Choose the correct letter, A, B, or C.</p>
<p>You will hear a talk about a new community centre that is opening in the local area.</p>`,
      },
      questionGroups: [
        {
          id: "lqg-3",
          title: "Questions 8–10",
          description: "Choose the correct letter, A, B, or C.",
          startQuestionNumber: 8,
          endQuestionNumber: 10,
          type: "MULTIPLE_CHOICE_ONE_ANSWER",
          questions: [
            {
              id: "lq8",
              questionNumber: 8,
              title: "When will the community centre open?",
              correctAnswer: "C",
              choices: [
                { id: "lq8a", content: "Next Monday", order: 1 },
                { id: "lq8b", content: "Next Friday", order: 2 },
                { id: "lq8c", content: "Next Saturday", order: 3 },
              ],
            },
            {
              id: "lq9",
              questionNumber: 9,
              title: "What facility is on the ground floor?",
              correctAnswer: "A",
              choices: [
                { id: "lq9a", content: "A swimming pool", order: 1 },
                { id: "lq9b", content: "A library", order: 2 },
                { id: "lq9c", content: "A café", order: 3 },
              ],
            },
            {
              id: "lq10",
              questionNumber: 10,
              title: "Membership costs £______ per year for adults.",
              correctAnswer: "B",
              choices: [
                { id: "lq10a", content: "£50", order: 1 },
                { id: "lq10b", content: "£75", order: 2 },
                { id: "lq10c", content: "£100", order: 3 },
              ],
            },
          ],
        },
      ],
    },
  ],
};
