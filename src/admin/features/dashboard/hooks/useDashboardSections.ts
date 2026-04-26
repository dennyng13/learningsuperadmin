/**
 * Centralised "should this widget render?" logic for the admin dashboard.
 *
 * Each widget on the dashboard has subtly different empty/loading rules.
 * Keeping them inline in the page caused duplicated checks and made it
 * easy to render two widgets that show the same "no data" state.
 *
 * This hook returns a single `visible` map that the page consumes to decide
 * what to mount. It guarantees:
 *   - Hero KPIs only render when at least one stat is non-zero.
 *   - "Today" section is hidden entirely when neither schedule nor exercises
 *     have data (no empty placeholder + no duplicate banners).
 *   - Analytics widgets only render when their underlying dataset is non-empty.
 */

export interface DashboardVisibilityInput {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalTests: number;
    totalExercises: number;
    publishedExercises: number;
    recentResults7d: number;
    recentPractice7d: number;
  } | null;
  recentItems: Array<unknown>;
  todaySchedule: { count: number; conflicts: number; firstTime: string | null } | null | undefined;
  activityTrend: Array<{ tests: number; practices: number }>;
  testResultsForAnalysis: Array<unknown>;
  practiceResultsForAnalysis: Array<unknown>;
  prospects: Array<unknown>;
}

export interface DashboardVisibility {
  /** Hero block (KPI grid + calendar + perf chart). */
  hero: boolean;
  /** "Recent items" list inside hero. */
  heroRecent: boolean;

  /** Wrapper for the whole "Lịch hôm nay" section. */
  todaySection: boolean;
  /** Today's schedule banner — populated state. */
  scheduleBanner: boolean;
  /** Today's schedule banner — empty placeholder. */
  scheduleEmptyBanner: boolean;
  /** Practice exercises KPI banner. */
  exercisesBanner: boolean;

  /** Wrapper for the analytics section. */
  analyticsSection: boolean;
  activityTrendChart: boolean;
  questionTypeStats: boolean;
  practiceErrorStats: boolean;
  prospectFunnel: boolean;
}

export function useDashboardSections(input: DashboardVisibilityInput): DashboardVisibility {
  const { stats, recentItems, todaySchedule, activityTrend,
    testResultsForAnalysis, practiceResultsForAnalysis, prospects } = input;

  // Hero: render only if stats exist AND at least one of the headline metrics is non-zero.
  const hasAnyHeroStat = !!stats && (
    stats.totalStudents > 0 ||
    stats.totalTeachers > 0 ||
    stats.totalClasses > 0 ||
    stats.totalTests > 0
  );

  const hasSchedule = !!todaySchedule && todaySchedule.count > 0;
  const hasExercises = !!stats && stats.totalExercises > 0;

  const hasActivityTrend = activityTrend.some(d => d.tests > 0 || d.practices > 0);
  const hasQuestionTypeStats = testResultsForAnalysis.length > 0;
  const hasPracticeErrors = practiceResultsForAnalysis.length > 0;
  const hasProspects = prospects.length > 0;

  return {
    hero: hasAnyHeroStat,
    heroRecent: recentItems.length > 0,

    // Show the whole "today" section only if at least one banner has data.
    // Otherwise hide entirely (avoids an empty placeholder duplicating the
    // "no activity" message we already show in the hero/empty state).
    todaySection: hasSchedule || hasExercises,
    scheduleBanner: hasSchedule,
    // Empty placeholder is only useful when the OTHER banner exists (so the
    // section has at least one populated card next to it). If neither has
    // data the whole section is hidden via `todaySection`.
    scheduleEmptyBanner: !hasSchedule && hasExercises,
    exercisesBanner: hasExercises,

    analyticsSection: hasActivityTrend || hasQuestionTypeStats || hasPracticeErrors || hasProspects,
    activityTrendChart: hasActivityTrend,
    questionTypeStats: hasQuestionTypeStats,
    practiceErrorStats: hasPracticeErrors,
    prospectFunnel: hasProspects,
  };
}