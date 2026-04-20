/**
 * Check if a user answer matches the correct answer.
 * Supports alternative answers separated by "|".
 * e.g. correctAnswer = "photosynthesis|photo-synthesis"
 */
export function isCorrectAnswer(userAnswer: string | undefined, correctAnswer: string): boolean {
  if (!userAnswer || userAnswer.trim() === "") return false;
  const normalized = userAnswer.trim().toLowerCase();
  const alternatives = correctAnswer.split("|").map(a => a.trim().toLowerCase()).filter(Boolean);
  return alternatives.some(alt => normalized === alt);
}
