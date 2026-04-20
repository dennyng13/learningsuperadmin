/** Returns the effective display status of a study plan entry.
 *  If the entry date has passed and the student hasn't marked it "done",
 *  it is automatically considered "delayed". */
export function getEffectiveStatus(entryDate: string, planStatus: string | null): "done" | "delayed" | null {
  if (planStatus === "done") return "done";
  if (planStatus === "delayed") return "delayed";
  // If date is in the past and not done → auto-delayed
  const todayStr = new Date().toISOString().split("T")[0];
  if (entryDate < todayStr) return "delayed";
  return null;
}
