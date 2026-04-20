import { supabase } from "@/integrations/supabase/client";

/* ───── Types ───── */
export interface SaveResultParams {
  assessmentId: string;
  assessmentName: string;
  bookName?: string;
  sectionType: "READING" | "LISTENING" | "WRITING" | "SPEAKING";
  score?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  timeSpent: number;
  answers?: Record<number, string>;
  partsData?: any;
  writingTasks?: any;
  speakingParts?: any;
}

export interface TestResultRow {
  id: string;
  assessment_id: string;
  assessment_name: string;
  book_name: string | null;
  section_type: string;
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  time_spent: number;
  answers: any;
  parts_data: any;
  writing_tasks: any;
  speaking_parts: any;
  created_at: string;
}

export interface ActivityRow {
  activity_date: string;
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
  time_minutes: number;
}

export interface UserSettingsRow {
  target_overall: string | null;
  target_reading: string | null;
  target_listening: string | null;
  target_writing: string | null;
  target_speaking: string | null;
  exam_date: string | null;
}

/* ───── Save test result + update activity log ───── */
export async function saveTestResult(params: SaveResultParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Insert test result
  const { data, error } = await supabase.from("test_results" as any).insert({
    user_id: user.id,
    assessment_id: params.assessmentId,
    assessment_name: params.assessmentName,
    book_name: params.bookName || null,
    section_type: params.sectionType,
    score: params.score ?? null,
    correct_answers: params.correctAnswers ?? null,
    total_questions: params.totalQuestions ?? null,
    time_spent: params.timeSpent,
    answers: params.answers ?? null,
    parts_data: params.partsData ?? null,
    writing_tasks: params.writingTasks ?? null,
    speaking_parts: params.speakingParts ?? null,
  } as any).select().single();

  if (error) console.error("Error saving test result:", error);

  // 2. Update activity log for today
  const today = new Date().toISOString().split("T")[0];
  const skillKey = params.sectionType.toLowerCase();
  const timeMinutes = Math.ceil(params.timeSpent / 60);

  // Try upsert
  const { data: existing } = await supabase
    .from("activity_log" as any)
    .select("*")
    .eq("user_id", user.id)
    .eq("activity_date", today)
    .single() as any;

  if (existing) {
    await supabase.from("activity_log" as any).update({
      [skillKey]: (existing[skillKey] || 0) + 1,
      time_minutes: (existing.time_minutes || 0) + timeMinutes,
    } as any).eq("user_id", user.id).eq("activity_date", today);
  } else {
    await supabase.from("activity_log" as any).insert({
      user_id: user.id,
      activity_date: today,
      [skillKey]: 1,
      time_minutes: timeMinutes,
    } as any);
  }

  // 3. Check for auto-badge awards
  try {
    const { checkBadgesForUser } = await import("@shared/hooks/useAutoBadges");
    checkBadgesForUser(user.id);
  } catch { /* silent */ }

  return data;
}

/* ───── Fetch all results for current user ───── */
export async function fetchTestResults(): Promise<TestResultRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("test_results" as any)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as any;

  if (error) { console.error("Error fetching results:", error); return []; }
  return (data || []) as TestResultRow[];
}

/* ───── Fetch latest result per section type ───── */
export async function fetchLatestResults(): Promise<Record<string, TestResultRow | null>> {
  const results = await fetchTestResults();
  const latest: Record<string, TestResultRow | null> = {
    READING: null, LISTENING: null, WRITING: null, SPEAKING: null,
  };
  for (const r of results) {
    if (!latest[r.section_type]) {
      latest[r.section_type] = r;
    }
  }
  return latest;
}

/* ───── Fetch activity log ───── */
export async function fetchActivityLog(): Promise<ActivityRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("activity_log" as any)
    .select("activity_date, reading, listening, writing, speaking, time_minutes")
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false }) as any;

  if (error) { console.error("Error fetching activity:", error); return []; }
  return (data || []) as ActivityRow[];
}

/* ───── User settings (targets + exam date) ───── */
export async function fetchUserSettings(): Promise<UserSettingsRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_settings" as any)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle() as any;

  return data as UserSettingsRow | null;
}

export async function saveUserSettings(settings: Partial<UserSettingsRow>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("user_settings" as any)
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle() as any;

  if (existing) {
    await supabase.from("user_settings" as any).update({
      ...settings,
      updated_at: new Date().toISOString(),
    } as any).eq("user_id", user.id);
  } else {
    await supabase.from("user_settings" as any).insert({
      user_id: user.id,
      ...settings,
    } as any);
  }
}
