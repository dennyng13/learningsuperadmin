# Placeholder route ledger

Tracks all routes currently rendered by `PlaceholderPage` (`src/admin/features/placeholder/PlaceholderPage.tsx`). Each entry corresponds to a sidebar item in the Admin Portal IA that doesn't yet have a real implementation.

When a real page ships:
1. Replace the entry's usage in `src/admin/routes/AdminRoutes.tsx` (remove from the `PLACEHOLDER_ROUTES.map` block, add a real `<Route>` with the actual page component).
2. Remove the entry from `src/admin/features/placeholder/placeholders.ts`.
3. Strike through the row in this table.

Source of truth for page metadata (title / icon / scope / ETA): `src/admin/features/placeholder/placeholders.ts`.

| Date added | Path | IA section | Status | Backend dependency | ETA |
|------------|------|-----------|--------|--------------------|-----|
| 2026-05-02 | `/tasks` | 1.2 Hub + Tasks | NEW UI placeholder | Task inbox table + RPC for dispatch | TBD |
| 2026-05-02 | `/users/invoices` | 2.1.1 Student Invoices | NEW UI placeholder | `app_invoices` table + payment integration | TBD |
| 2026-05-02 | `/teachers/signatures` | 2.2.3 Signature requests | NEW UI placeholder | Reuse contract signature pipeline scoped to teacher | TBD |
| 2026-05-02 | `/facility` | 4.1 Facility hub | NEW UI placeholder | `facilities` + `facility_assets` tables (TBD) | TBD |
| 2026-05-02 | `/facility/materials` | 4.1.2 Physical materials | NEW UI placeholder | `physical_materials` inventory table (TBD) | TBD |
| 2026-05-02 | `/maintenance` | 4.2 Maintenance log | NEW UI placeholder | `maintenance_logs` table + assignee FK | TBD |
| 2026-05-02 | `/performance` | 5.1 Performance hub | NEW UI placeholder | KPI aggregation views (multi-table) | TBD |
| 2026-05-02 | `/performance/kpis` | 5.1.1 Teacher KPIs | NEW UI placeholder | `teacher_kpi_definitions` + materialized view | TBD |
| 2026-05-02 | `/performance/observations` | 5.1.2 Observations | NEW UI placeholder | `teacher_observations` table + rubric schema | TBD |
| 2026-05-02 | `/performance/feedback` | 5.1.3 Student feedback | NEW UI placeholder | Reuse `student_feedback` table (existing?) — schema audit needed | TBD |
| 2026-05-02 | `/revenue/tuition` | 6.1.1 Tuition revenue | NEW UI placeholder | `app_invoices` + `payments` views | TBD |
| 2026-05-02 | `/expenses` | 6.2.2 Other expenses | NEW UI placeholder | `expenses` table + categories | TBD |
| 2026-05-02 | `/documents` | 7.1 Documents | NEW UI placeholder | Storage bucket + `documents` metadata table | TBD |

## Mock data placeholders (rendered inline, not separate routes)

These are visible UI elements that show "Mock" labels because their backend data sources don't exist yet.

| Date added | Component / Page | What's mocked | Backend dependency | Real data status |
|------------|------------------|---------------|--------------------|------------------|
| 2026-05-03 | ProgramDetailPage KPI strip | "Doanh thu (ước)" KPI card | Aggregation view: `revenue_by_program` (sum payments / class enrollment per program) | TBD |
| 2026-05-03 | ProgramDetailPage KPI strip | "Hoàn thành (ước)" KPI card | Cohort tracking + completion percentage materialized view | TBD |

Real data on same KPI strip: classes count + students count (from `classes` table query, scoped by `program` key).

## Cross-portal URL contract — Class identifier resolution (Day 7)

Route `/classes/:id` accepts EITHER UUID or `class_code` value:
- If `:id` matches RFC 4122 v4 UUID regex → looked up via `eq("id", :id)` first.
- Otherwise → treated as `class_code`, looked up via `eq("class_code", :id)` first, with defensive UUID fallback.
- Resolution checks `v_class_full` view first, then falls back to `classes` shim.
- Canonical UUID (`cls.id`) is used for ALL downstream sub-queries (sessions, invitations, plan progress) regardless of which identifier was in the URL.

**Teacher Portal (teachingwithlearningplus) MUST mirror this contract** so URLs like `/classes/IE-CB-A19-260501` work consistently across both portals when admins or teachers share links. Implementation pattern:

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = UUID_RE.test(idFromUrl);
const lookupCol = isUuid ? "id" : "class_code";
// ... query using lookupCol
```

Trade-offs:
- ✅ Pros: human-readable URLs (e.g. `/classes/IE-CB-A19-260501`); UUIDs continue to work; no migration required.
- ⚠️ Cons: `class_code` is mutable (admin can rename) → external links break if code changes. UUID-based URLs remain immutable. Recommend admins use UUID URLs for permanent bookmarks; code URLs for casual sharing within Vietnamese context.

Internal `navigate()` calls in admin portal continue to use UUIDs (stable). Code-based URLs must be typed manually or shared externally.

## Aliases (not placeholders, just redirects)

| Alias path | Target | Reason |
|------------|--------|--------|
| `/invitations` | `/classes/invitations` | IA naming preference |
| `/students` | `/users` | IA naming preference |
| `/schedules` | `/schedule` | IA naming preference |
| `/classes/create` | `/classes/new` | IA naming preference |
| `/programs` | `/courses/programs` | IA naming preference |

## "Đang xem xét" (modules dư) — not placeholders

These routes are real and functional but weren't called out in the user IA. They live under the `review` group in the sidebar with muted styling pending user review:

- `/library` (+ `/tests`, `/flashcards`, `/practice`)
- `/my-plans` (F3.5 UOP marketplace)
- `/placement`, `/placement/:id`
- `/attendance`, `/attendance/monitor`
- `/availability-drafts`
- `/rooms`
- `/band-descriptors`
- `/feedback-templates`
- `/badges`

User direction: "những module nào dư thì không xoá mà tạm để ở dưới để xem xét". Move out of `review` group when admin confirms keep/remove.
