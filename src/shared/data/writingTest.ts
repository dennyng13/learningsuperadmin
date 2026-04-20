import { WritingAssessment } from "@shared/types/writing";

export const sampleWritingTest: WritingAssessment = {
  id: "cam-18-test-1-writing",
  name: "Academic Writing Test 1",
  bookName: "Cambridge IELTS 18",
  sectionType: "WRITING",
  duration: 60 * 60, // 60 minutes
  tasks: [
    {
      id: "writing-task-1",
      taskNumber: 1,
      title: "Writing Task 1",
      instruction: `The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
      stimulus: `<div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center;">
<h4 style="margin-bottom: 16px; font-weight: bold; color: #333;">Percentage of households in owned and rented accommodation in England and Wales</h4>
<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
<thead>
<tr style="background: hsl(215 80% 28%); color: white;">
  <th style="padding: 8px; border: 1px solid #ddd;">Year</th>
  <th style="padding: 8px; border: 1px solid #ddd;">Owned (%)</th>
  <th style="padding: 8px; border: 1px solid #ddd;">Rented (%)</th>
</tr>
</thead>
<tbody>
<tr><td style="padding: 8px; border: 1px solid #ddd;">1918</td><td style="padding: 8px; border: 1px solid #ddd;">23</td><td style="padding: 8px; border: 1px solid #ddd;">77</td></tr>
<tr style="background: #f9f9f9;"><td style="padding: 8px; border: 1px solid #ddd;">1939</td><td style="padding: 8px; border: 1px solid #ddd;">32</td><td style="padding: 8px; border: 1px solid #ddd;">68</td></tr>
<tr><td style="padding: 8px; border: 1px solid #ddd;">1953</td><td style="padding: 8px; border: 1px solid #ddd;">32</td><td style="padding: 8px; border: 1px solid #ddd;">68</td></tr>
<tr style="background: #f9f9f9;"><td style="padding: 8px; border: 1px solid #ddd;">1961</td><td style="padding: 8px; border: 1px solid #ddd;">43</td><td style="padding: 8px; border: 1px solid #ddd;">57</td></tr>
<tr><td style="padding: 8px; border: 1px solid #ddd;">1971</td><td style="padding: 8px; border: 1px solid #ddd;">51</td><td style="padding: 8px; border: 1px solid #ddd;">49</td></tr>
<tr style="background: #f9f9f9;"><td style="padding: 8px; border: 1px solid #ddd;">1981</td><td style="padding: 8px; border: 1px solid #ddd;">58</td><td style="padding: 8px; border: 1px solid #ddd;">42</td></tr>
<tr><td style="padding: 8px; border: 1px solid #ddd;">1991</td><td style="padding: 8px; border: 1px solid #ddd;">66</td><td style="padding: 8px; border: 1px solid #ddd;">34</td></tr>
<tr style="background: #f9f9f9;"><td style="padding: 8px; border: 1px solid #ddd;">2001</td><td style="padding: 8px; border: 1px solid #ddd;">69</td><td style="padding: 8px; border: 1px solid #ddd;">31</td></tr>
<tr><td style="padding: 8px; border: 1px solid #ddd;">2011</td><td style="padding: 8px; border: 1px solid #ddd;">64</td><td style="padding: 8px; border: 1px solid #ddd;">36</td></tr>
</tbody>
</table>
</div>`,
      stimulusType: "chart",
      minWords: 150,
      recommendedTime: 20,
    },
    {
      id: "writing-task-2",
      taskNumber: 2,
      title: "Writing Task 2",
      instruction: `Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations.

Discuss both these views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
      minWords: 250,
      recommendedTime: 40,
    },
  ],
};

export const allWritingAssessments = [sampleWritingTest];
