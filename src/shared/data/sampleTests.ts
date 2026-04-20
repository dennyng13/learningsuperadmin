import { Assessment } from "@shared/types/exam";
import { sampleListeningTest } from "./listeningTest";

export const sampleReadingTest: Assessment = {
  id: "cam-18-test-1-reading",
  name: "Academic Reading Test 1",
  bookName: "Cambridge IELTS 18",
  sectionType: "READING",
  totalQuestions: 13,
  duration: 60 * 60, // 60 minutes
  parts: [
    {
      id: "part-1",
      title: "Part 1",
      description: "Read the passage and answer Questions 1–13.",
      order: 1,
      passage: {
        id: "passage-1",
        title: "Urban Farming",
        content: `<p><strong>Urban farming</strong> is the practice of cultivating, processing, and distributing food in or around urban areas. It has grown significantly in recent years as cities around the world seek sustainable food sources and greener communities.</p>

<p>The concept is not entirely new. During World War II, 'victory gardens' were planted in urban areas across the United States and United Kingdom to supplement food supplies. Today, the motivations have shifted toward sustainability, food security, and community building.</p>

<p><strong>A. The rise of vertical farming</strong></p>
<p>One of the most innovative approaches to urban farming is vertical farming — growing crops in vertically stacked layers, often in controlled indoor environments. These facilities use LED lighting and hydroponic or aeroponic systems to grow produce year-round, regardless of weather conditions. Vertical farms can produce up to 350 times more food per square metre than traditional farms while using 95% less water.</p>

<p><strong>B. Community gardens and social impact</strong></p>
<p>Community gardens have become vital social spaces in many cities. Research from the University of Pennsylvania found that neighborhoods with community gardens experienced a 28% decrease in crime rates compared to those without. These spaces also promote physical activity, improve mental health, and foster social connections among diverse community members.</p>

<p><strong>C. Economic considerations</strong></p>
<p>While the benefits of urban farming are substantial, the economic challenges remain significant. The initial investment for vertical farming facilities can exceed $10 million, and operating costs — particularly energy for lighting — are considerably higher than traditional agriculture. However, reduced transportation costs and the premium prices that locally grown produce can command help offset these expenses.</p>

<p><strong>D. Environmental benefits</strong></p>
<p>Urban farms contribute to environmental sustainability in multiple ways. They reduce the carbon footprint associated with food transportation, decrease urban heat island effects through vegetation, and can improve air quality. Some urban farms also incorporate composting programs that divert organic waste from landfills, creating a circular economy within the city.</p>

<p><strong>E. Technology and innovation</strong></p>
<p>Advances in agricultural technology have made urban farming increasingly viable. Sensors monitor plant health, automated systems control nutrient delivery, and artificial intelligence optimizes growing conditions. These technologies enable urban farmers to achieve consistent yields while minimizing resource waste. Some companies are even experimenting with robotic harvesting systems that could further reduce labor costs.</p>

<p><strong>F. Challenges and future outlook</strong></p>
<p>Despite its promise, urban farming faces several hurdles. Limited space, high real estate costs in cities, and regulatory frameworks that were not designed for agricultural activities in urban settings all present obstacles. Nevertheless, as global population growth drives demand for food production closer to consumers, urban farming is expected to play an increasingly important role in the world's food systems.</p>`,
      },
      questionGroups: [
        {
          id: "qg-1",
          title: "Questions 1–5",
          description:
            "Do the following statements agree with the information given in the passage? Write TRUE, FALSE, or NOT GIVEN.",
          startQuestionNumber: 1,
          endQuestionNumber: 5,
          type: "IDENTIFYING_INFORMATION",
          questions: [
            {
              id: "q1",
              questionNumber: 1,
              title: "Urban farming is a completely modern concept with no historical precedent.",
              correctAnswer: "FALSE",
            },
            {
              id: "q2",
              questionNumber: 2,
              title: "Vertical farms use more water than traditional farming methods.",
              correctAnswer: "FALSE",
            },
            {
              id: "q3",
              questionNumber: 3,
              title: "Community gardens have been shown to reduce crime rates in neighborhoods.",
              correctAnswer: "TRUE",
            },
            {
              id: "q4",
              questionNumber: 4,
              title: "The initial investment for vertical farming is relatively low.",
              correctAnswer: "FALSE",
            },
            {
              id: "q5",
              questionNumber: 5,
              title: "Urban farms have been proven to completely eliminate urban heat island effects.",
              correctAnswer: "NOT_GIVEN",
            },
          ],
        },
        {
          id: "qg-2",
          title: "Questions 6–9",
          description:
            "Choose the correct letter, A, B, C, or D.",
          startQuestionNumber: 6,
          endQuestionNumber: 9,
          type: "MULTIPLE_CHOICE_ONE_ANSWER",
          questions: [
            {
              id: "q6",
              questionNumber: 6,
              title: "What is the main advantage of vertical farming mentioned in the passage?",
              correctAnswer: "B",
              choices: [
                { id: "q6a", content: "It requires no technology", order: 1 },
                { id: "q6b", content: "It can produce significantly more food per square metre", order: 2 },
                { id: "q6c", content: "It is cheaper than traditional farming", order: 3 },
                { id: "q6d", content: "It only works in warm climates", order: 4 },
              ],
            },
            {
              id: "q7",
              questionNumber: 7,
              title: "According to the passage, community gardens help neighborhoods by:",
              correctAnswer: "D",
              choices: [
                { id: "q7a", content: "Increasing property taxes", order: 1 },
                { id: "q7b", content: "Reducing the need for public parks", order: 2 },
                { id: "q7c", content: "Eliminating the need for grocery stores", order: 3 },
                { id: "q7d", content: "Reducing crime and improving social connections", order: 4 },
              ],
            },
            {
              id: "q8",
              questionNumber: 8,
              title: "What helps offset the high costs of urban farming?",
              correctAnswer: "C",
              choices: [
                { id: "q8a", content: "Government subsidies", order: 1 },
                { id: "q8b", content: "Volunteer labor", order: 2 },
                { id: "q8c", content: "Lower transportation costs and premium pricing", order: 3 },
                { id: "q8d", content: "Reduced taxation for urban farmers", order: 4 },
              ],
            },
            {
              id: "q9",
              questionNumber: 9,
              title: "What role does artificial intelligence play in urban farming?",
              correctAnswer: "A",
              choices: [
                { id: "q9a", content: "It optimizes growing conditions", order: 1 },
                { id: "q9b", content: "It replaces all human workers", order: 2 },
                { id: "q9c", content: "It designs new plant species", order: 3 },
                { id: "q9d", content: "It manages the financial aspects of farming", order: 4 },
              ],
            },
          ],
        },
        {
          id: "qg-3",
          title: "Questions 10–13",
          description:
            "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
          startQuestionNumber: 10,
          endQuestionNumber: 13,
          type: "COMPLETION",
          completionParagraph: "Fill in the blanks with words from the passage.",
          questions: [
            {
              id: "q10",
              questionNumber: 10,
              title: "During WWII, _______ were planted to supplement food supplies.",
              correctAnswer: "victory gardens",
            },
            {
              id: "q11",
              questionNumber: 11,
              title: "Vertical farms use LED lighting and _______ systems to grow produce.",
              correctAnswer: "hydroponic",
            },
            {
              id: "q12",
              questionNumber: 12,
              title: "Some urban farms incorporate _______ programs to divert waste from landfills.",
              correctAnswer: "composting",
            },
            {
              id: "q13",
              questionNumber: 13,
              title: "_______ monitor plant health in technologically advanced urban farms.",
              correctAnswer: "sensors",
            },
          ],
        },
      ],
    },
  ],
};

export const allAssessments: Assessment[] = [sampleReadingTest, sampleListeningTest];
