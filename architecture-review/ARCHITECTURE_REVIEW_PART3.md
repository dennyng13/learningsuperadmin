# Architecture Review Part 3 — Refactor Plan + Appendices

Continuation of `ARCHITECTURE_REVIEW_PART2.md`. See earlier files for Phases 1-2.

## PHASE 3 — REFACTOR PLAN

Sprint cadence: 1 sprint = 1 tuần. Launch 1/5/2026. Mỗi task có **Lovable prompt** ready-to-paste.

### Sprint 0 — PRE-LAUNCH (21/4 → 1/5) — BLOCKER ONLY

Mục tiêu: Fix 8 pre-launch security blockers + 2 bottleneck critical. KHÔNG refactor architecture.

#### Task 0.1 — Fix privilege escalation `create-external-account` (🔴 HIGH)

**Repo**: Admin (`learningsuperadmin`)  
**File**: `supabase/functions/create-external-account/index.ts`  
**Lovable prompt**:
```
Fix privilege escalation in edge function create-external-account. 
Whitelist role param to ['user', 'teacher'] only. 
If role is 'admin' or 'super_admin', require caller.role === 'super_admin' else return 403.
Add test curl snippet in comments showing rejected case.
```

#### Task 0.2 — Fix answer-peek `grade-practice` (🔴 HIGH)

**Repo**: Student  
**File**: `supabase/functions/grade-practice/index.ts`  
**Lovable prompt**:
```
In grade-practice edge function, when save_result=false, omit correct_answer and explain 
from per_question array. Return only {question_id, user_answer, is_correct, score_delta}.
When save_result=true, keep full response.
```

#### Task 0.3 — Secure `reset-student-password` (🔴 HIGH)

**Repo**: Admin  
**File**: `supabase/functions/reset-student-password/index.ts`  
**Lovable prompt**:
```
Rewrite reset-student-password edge function:
1. Generate random 12-char password (upper+lower+digit+symbol)
2. Update user password via supabase admin API
3. Send email to user with new password via existing send-email function
4. Return only {success: true, email_sent: true} — no password in response
5. Add rate limit: max 5 requests/minute per admin (use memory Map keyed by admin user_id)
```

#### Task 0.4 — Validate `submit-placement-result` (🔴 HIGH)

**Repo**: Student  
**File**: `supabase/functions/submit-placement-result/index.ts`  
**Lovable prompt**:
```
Harden submit-placement-result:
1. Add expires_at check (24h from issue). Reject if expired.
2. Create table placement_tokens_used (token PK, used_at) and insert row on use — reject duplicates
3. Validate body: score 0-100, section_type in ('listening','reading','writing','speaking')
4. Migration SQL to add expires_at column + placement_tokens_used table
```

#### Task 0.5 — Fix `get-answer-key` status check (🔴 HIGH)

**Repo**: Student  
**File**: `supabase/functions/get-answer-key/index.ts`  
**Lovable prompt**:
```
In get-answer-key, change SELECT from test_results to include status='submitted' filter.
Reject with 403 if test_results row exists but status is not 'submitted'.
```

#### Task 0.6 — Complete `delete-user` cleanup (🔴 HIGH)

**Repo**: Admin  
**File**: `supabase/functions/delete-user/index.ts`  
**Lovable prompt**:
```
Extend delete-user edge function to clean up these tables (use Promise.all in parallel):
- writing_submissions (set teacher_id=null if teacher, delete rows if student)
- practice_results (delete)
- placement_results (delete)
- notifications (delete where user_id matches)
Add audit_log entry with action='user_deleted', payload={deleted_user_id, cleanup_tables:[...]}
```

#### Task 0.7 — Rate limit `ai-grade-writing` (🔴 HIGH)

**Repo**: Student  
**File**: `supabase/functions/ai-grade-writing/index.ts`  
**Lovable prompt**:
```
Add rate limit to ai-grade-writing: max 10 req/min per user_id (caller).
Use in-memory Map<userId, timestamps[]>. Return 429 if exceeded.
Also add max_budget check: if cost_this_month > $10 for caller, return 402 Payment Required.
```

#### Task 0.8 — Env vars Supabase client (🔴 HIGH)

**Repo**: Teacher + Admin  
**Lovable prompt cho Teacher**:
```
In src/lib/supabase.ts, replace hardcoded URL and anon key with:
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
Delete the hardcoded constants. Add .env.example with these two keys.
Match student repo's pattern in src/integrations/supabase/client.ts.
```

**Lovable prompt cho Admin**:
```
In src/integrations/supabase/client.ts, replace hardcoded SUPABASE_URL and 
SUPABASE_PUBLISHABLE_KEY with import.meta.env.VITE_SUPABASE_URL and 
import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY. Keep SafeStorage fallback. 
Add .env.example.
```

#### Task 0.9 — Add critical indexes (🔴 HIGH)

**Repo**: Student (canonical DB migration)  
**Lovable prompt**:
```
Create migration supabase/migrations/20260422_add_performance_indexes.sql:
create index concurrently if not exists idx_writing_submissions_teacher_status 
  on writing_submissions(teacher_id, status, submitted_at desc);
create index concurrently if not exists idx_practice_results_user_created 
  on practice_results(user_id, created_at desc);
create index concurrently if not exists idx_class_sessions_class_scheduled 
  on class_sessions(class_id, scheduled_at);
Copy same file to teacher + admin repos supabase/migrations/.
```

#### Task 0.10 — Realtime for writing_submissions (🟡 MEDIUM but pre-launch)

**Repo**: Student (DB) + Teacher (client)  
**Lovable prompt Student**:
```
Migration: alter publication supabase_realtime add table writing_submissions; 
alter table writing_submissions replica identity full;
```
**Lovable prompt Teacher**:
```
In teacher dashboard page, subscribe to channel teacher:{currentTeacherId}:submissions 
on writing_submissions INSERT + UPDATE where teacher_id=currentTeacherId. 
On event → invalidate ['submissions', 'pending'] query key. Replace existing 30s polling.
```

### Sprint 1 (POST-LAUNCH week 1-2)

Tập trung: observability + shared code foundation.

| Task | Repo | Effort | Priority |
|---|---|---|---|
| 1.1 Setup `@shared/*` path alias 3 repos | All | 2h | HIGH |
| 1.2 Adopt `check-shared-drift.sh` GitHub Action weekly | All | 3h | HIGH |
| 1.3 Move supabase client → canonical (Student) + sync Admin, Teacher | All | 4h | HIGH |
| 1.4 Add Sentry free tier 3 repos | All | 2h | MEDIUM |
| 1.5 Supabase alerts email setup (CPU, auth fail, error rate) | Dashboard | 30min | HIGH |
| 1.6 Audit log severity column | Student (DB) | 1h | MEDIUM |

### Sprint 2 (week 3-4)

Tập trung: Flow A (writing) hardening.

| Task | Effort | Priority |
|---|---|---|
| 2.1 RPC `submit_writing_and_notify(user_id, content)` transactional (insert + PGMQ email) | 4h | HIGH |
| 2.2 RPC `claim_submission_for_grading(submission_id, teacher_id)` — atomic lock (`UPDATE ... WHERE status='pending' RETURNING`) → fix race condition teacher double-grade | 3h | HIGH |
| 2.3 AI grading result persisted to `ai_suggestions` table (decouple from edge function response) | 3h | MEDIUM |
| 2.4 Teacher grading form — draft autosave every 30s | 2h | LOW |

### Sprint 3 (week 5-6)

Tập trung: Flow B (class create) hardening.

| Task | Effort | Priority |
|---|---|---|
| 3.1 RPC `create_class_with_members(class, member_ids[])` — single transaction (class + members + initial sessions) | 5h | HIGH |
| 3.2 Rename `teachngo_*` columns → `external_*` (prep for TeachNGo phase-out Feb 2027). Migration + 3-repo codegen update | 4h | MEDIUM |
| 3.3 `class_sessions.schedule` string → JSONB với schema validation | 3h | LOW |
| 3.4 Admin notification to teacher on class assign (PGMQ → email + in-app) | 2h | MEDIUM |

### Sprint 4 (week 7-8)

Tập trung: Flow F polish + availability.

| Task | Effort | Priority |
|---|---|---|
| 4.1 RPC `approve_and_apply_availability(teacher_id, rules[])` — replace client orchestration | 3h | HIGH |
| 4.2 Move `lead_time_days` validation constant to DB config table `system_settings` | 2h | LOW |
| 4.3 Teacher workload dashboard (uses `getTeacherWorkload` function) | 3h | LOW |

### Sprint 5+ (post-launch month 2-3)

- Q2: Partition `audit_logs` by month
- Q2: Edge function keepalive cron (pre-warm cold start)
- Q2: Batch PGMQ email worker (reduce invocation cost)
- Q2: Admin dashboard realtime migrate (polling → channels)
- Q2: 2FA admin + session timeout
- Q3: TeachNGo phase-out prep (Feb 2027 target)

### Risk register (top 5)

| Risk | Mitigation | Owner |
|---|---|---|
| Solo dev burnout launch + refactor concurrent | Strict Sprint 0 scope = blockers only | You |
| Lovable AI cost overrun | Task 0.7 rate limit + budget alert | Edge fn |
| DB drift 3 repos migration | MIGRATION_TEMPLATE.md + canonical Student | Migration discipline |
| Realtime channel storm @ 100 users | Selective subscribe + RLS filter | Sprint 2 |
| Shared code drift | Weekly cron + `check-shared-drift.sh` | GH Action |

---

## APPENDICES

### A — Glossary

- **Canonical repo**: Repo chứa source-of-truth cho một file/module. Các repos khác sync từ đây.
- **Drift**: 2+ copies của cùng file trở nên khác nhau theo thời gian.
- **PGMQ**: Postgres Message Queue extension — queue notifications, emails.
- **RLS**: Row Level Security — Supabase/Postgres row-level authorization.
- **SECURITY DEFINER**: Postgres function chạy với quyền của creator (thường `postgres` role).
- **Edge function**: Supabase serverless Deno runtime.
- **Realtime publication**: Postgres logical replication stream Supabase dùng để push events.

### B — Useful Supabase CLI commands

```bash
# Dump schema
supabase db dump -f schema.sql

# Diff local vs remote
supabase db diff

# Apply migration
supabase db push

# Query via CLI
supabase db psql -c "select count(*) from writing_submissions"

# Tail edge function logs
supabase functions logs ai-grade-writing --tail
```

### C — File index (deliverables)

| File | Location | Purpose |
|---|---|---|
| `ARCHITECTURE_REVIEW.md` | This file | Full 3-phase review |
| `AUDIT_SQL.sql` | Same folder | 12 SELECT queries for DB health audit |
| `SHARED_CODE_SETUP.md` | Same folder | Canonical-source strategy + sync scripts |
| `MIGRATION_TEMPLATE.md` | Same folder | Standard migration SQL template |

### D — Quick action checklist (copy vào issue tracker)

**Pre-launch (21/4 → 1/5):**
- [ ] 0.1 `create-external-account` role whitelist
- [ ] 0.2 `grade-practice` answer-peek fix
- [ ] 0.3 `reset-student-password` random + rate limit
- [ ] 0.4 `submit-placement-result` token expiry + single-use
- [ ] 0.5 `get-answer-key` status check
- [ ] 0.6 `delete-user` cleanup complete
- [ ] 0.7 `ai-grade-writing` rate limit
- [ ] 0.8 Env vars Supabase client (Teacher + Admin)
- [ ] 0.9 Critical indexes migration
- [ ] 0.10 Realtime writing_submissions

**Sprint 1 (post-launch week 1-2):**
- [ ] 1.1-1.6 see Sprint 1 table

**Sprint 2-4:** Xem từng sprint.

---

**End of ARCHITECTURE_REVIEW.md**  
Generated 2026-04-21 by Claude Code for @dennyng13. Review + iterate as codebase evolves.
