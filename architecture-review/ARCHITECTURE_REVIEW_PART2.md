# Architecture Review Part 2 — Consistency, Scale, Recommendations

Continuation of `ARCHITECTURE_REVIEW.md`. See that file for Exec Summary + Phase 1.1-1.4.

### 1.5 Consistency Check

Kiểm tra consistency giữa 3 repos trên 5 dimensions: TypeScript config, ESLint, dependency versions, path aliases, build config.

#### 1.5.1 TypeScript config

| File | Student | Teacher | Admin | Drift? |
|---|---|---|---|---|
| `tsconfig.json` strictness | `noImplicitAny: false`, `strictNullChecks: false` | Same | Same | ✅ Consistent |
| Path aliases `@/*` | ✅ | ✅ | ✅ | ✅ |
| Path aliases `@shared/*` | ❌ | ❌ | ❌ | 🔴 Không repo nào có |
| `baseUrl` | `.` | `.` | `.` | ✅ |
| `target` | `ES2020` | `ES2020` | `ES2020` | ✅ |

🔴 **Finding C1**: Không repo nào cấu hình path alias `@shared/*` — không thể tạo shared layer mà không đụng Vite + tsconfig cả 3 repos.

#### 1.5.2 ESLint config

| Rule | Student | Teacher | Admin |
|---|---|---|---|
| Base preset | `@eslint/js` recommended | Same | Same |
| React hooks | ✅ | ✅ | ✅ |
| `react-refresh/only-export-components` | warn | warn | warn |
| Custom rules | Không | Không | Không |
| `no-unused-vars` | off (default) | off | off |

✅ **ESLint uniform**. Tuy nhiên `no-unused-vars` off → dead code tích lũy.

#### 1.5.3 Dependency version drift (samples)

| Package | Student | Teacher | Admin | Impact |
|---|---|---|---|---|
| `@supabase/supabase-js` | 2.58.0 | 2.58.0 | 2.58.0 | ✅ |
| `react` | 18.3.1 | 18.3.1 | 18.3.1 | ✅ |
| `@tanstack/react-query` | 5.83.0 | 5.83.0 | 5.83.0 | ✅ |
| `vite` | 5.4.19 | 5.4.19 | 5.4.19 | ✅ |
| `tailwindcss` | 3.4.17 | 3.4.17 | 3.4.17 | ✅ |
| `zod` | 3.25.76 | 3.25.76 | 3.25.76 | ✅ |
| Radix UI packages | ~40 identical | ~40 identical | ~40 identical | ✅ |

🟢 **Dependency versions synchronized** — Lovable scaffolds same lock across 3 repos. **Risk**: Khi 1 repo upgrade (e.g. React 19), 2 repos còn lại drift → shared code break.

#### 1.5.4 Vite config

| Config | Student | Teacher | Admin |
|---|---|---|---|
| Port | 8080 | 8080 | 8080 |
| `@/*` alias | ✅ | ✅ | ✅ |
| `@shared/*` alias | ❌ | ❌ | ❌ |
| `lovable-tagger` plugin | ✅ | ✅ | ✅ |

#### 1.5.5 Coding conventions

| Convention | Student | Teacher | Admin |
|---|---|---|---|
| File naming | kebab-case | kebab-case + PascalCase mix | PascalCase |
| Hook pattern | `useXxx()` | `useXxx()` | `useXxx()` |
| Error toast | `sonner` toast | Same | Same |
| Query key naming | `['domain', 'action', ...params]` | Inconsistent | Inconsistent |
| Supabase import | `from '@/integrations/supabase/client'` | `from '@/lib/supabase'` (non-canonical) | `from '@/integrations/supabase/client'` |

🟡 **Finding C2**: Teacher import path khác 2 repos → shared code phải re-export từ 2 locations.

#### 1.5.6 Summary — Consistency score

| Dimension | Score |
|---|---|
| TypeScript | 9/10 |
| ESLint | 10/10 |
| Dependencies | 10/10 |
| Vite | 9/10 (thiếu `@shared`) |
| Conventions | 6/10 (file naming + import paths drift) |

**Overall**: **8.8/10**. Lovable scaffold keeps repos remarkably aligned. Main risks: (1) single-repo upgrade drift, (2) Teacher import-path ngoại lệ.

### 1.6 Scale Bottlenecks (10 → 100 users)

Phân tích performance ceiling giả định scale 10x users (100 students + 10 teachers + 3 admins).

#### 1.6.1 Database — hot tables ước lượng

| Table | Rows @ 10 users | Rows @ 100 users | Hot? | Index gap |
|---|---|---|---|---|
| `writing_submissions` | ~200 | ~2,000 | 🔴 High | Missing `(teacher_id, status, submitted_at)` |
| `practice_results` | ~1,000 | ~10,000 | 🔴 High | Missing `(user_id, created_at DESC)` |
| `class_sessions` | ~300 | ~3,000 | 🟡 Medium | `(class_id, scheduled_at)` OK |
| `ielts_class_members` | ~50 | ~500 | 🟢 Low | OK |
| `teacher_availability_rules` | ~30 | ~80 | 🟢 Low | OK |
| `notifications_queue` (PGMQ) | ~500/day | ~5,000/day | 🟡 Medium | Archive > 30 days |
| `audit_logs` | ~1,000/day | ~10,000/day | 🔴 High | Partition by month |

🔴 **Finding S1**: Thiếu index trên `writing_submissions(teacher_id, status)` — teacher dashboard query sẽ slow (~500ms @ 2k rows).

🔴 **Finding S2**: `practice_results` không có index trên `(user_id, created_at DESC)` — student history page slow.

🟡 **Finding S3**: `audit_logs` không partition → 10k rows/day = 3M rows/year → dashboard queries slow.

#### 1.6.2 Realtime channels

Hiện tại chỉ Flow F dùng realtime (availability). Các flows khác polling.

| Flow | Pattern | @ 10 users | @ 100 users |
|---|---|---|---|
| A Writing | Polling 30s (teacher dashboard) | 20 req/min | 200 req/min |
| B Class create | No realtime | 0 | 0 |
| F Availability | Realtime subscribe | ~3 channels | ~15 channels |
| Admin dashboards | Polling 60s | 3 req/min | 30 req/min |

🟡 **Finding S4**: Polling 30s × 100 users = 200 req/min chỉ cho dashboard. Khi submit rate tăng → Supabase quota warning.

#### 1.6.3 Edge Function cold start

| Function | Invocation freq | Cold start impact |
|---|---|---|
| `ai-grade-writing` | Low (~5/day) | 2-3s cold → UX OK |
| `grade-practice` | High (~100/day) | 2-3s cold → UX BAD |
| `send-email` | High (~200/day) | Background → OK |

🟡 **Finding S5**: `grade-practice` cold start ảnh hưởng UX. Student ấn submit đợi 2-3s.

#### 1.6.4 Auth / session

- `supabase.auth.getSession()` gọi trên mọi route change (3 repos)
- Không có session cache shared giữa tabs
- JWT refresh tự động (OK)

🟢 **Auth scale OK** đến 500 users.

#### 1.6.5 Top 5 bottlenecks priority

| # | Bottleneck | Impact @ 100 users | Fix cost |
|---|---|---|---|
| 1 | Missing indexes `writing_submissions`, `practice_results` | Dashboard 500ms+ | 5 min (SQL) |
| 2 | No realtime Flow A | Teacher miss new submissions 30s | 1 day |
| 3 | Edge function cold start | Student wait 2-3s submit | 1 day (keepalive cron) |
| 4 | `audit_logs` no partition | Admin dashboard slow | 1 day |
| 5 | Polling dashboards | 200 req/min waste | 2 days (realtime migrate) |

---

## PHASE 2 — ARCHITECTURE RECOMMENDATIONS

### 2.1 Shared Code Strategy

Xem chi tiết `SHARED_CODE_SETUP.md`. Tóm tắt quyết định kiến trúc:

#### Canonical-source approach (recommended cho solo dev)

- **Student repo** giữ canonical version của `supabase/client.ts`, Supabase types, domain hooks (writing, practice).
- **Admin repo** giữ canonical version của `admin/*` hooks (class, scheduling).
- **Teacher repo** là consumer. Khi cần file từ Student/Admin → copy + flag `@shared-from:<repo>`.
- Sync thông qua:
  - Manual: Lovable chat "sync file X from repo Y"
  - Automated: `sync-shared.sh` chạy local (chi tiết trong `SHARED_CODE_SETUP.md`)
- Drift detection: `check-shared-drift.sh` chạy weekly via GitHub Actions cron.

#### Không chọn monorepo/submodule

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Monorepo (pnpm workspaces) | True shared code | Lovable không support | ❌ |
| Git submodules | Versioned shared | Lovable không sync | ❌ |
| npm private package | Clean | Publish overhead, solo dev | ❌ |
| Canonical-source + sync | Lovable-compatible | Manual drift risk | ✅ |

#### Ownership matrix

Xem bảng chi tiết trong `SHARED_CODE_SETUP.md` section "Ownership". Tóm tắt:
- Supabase client + types → Student (canonical)
- Auth context, role utils → Admin (canonical, most complete)
- Writing domain → Student
- Class + scheduling → Admin
- Availability → Admin (4 admin-only functions) + Teacher (lightweight subset)

#### Tracking drift

- Weekly GitHub Action chạy `check-shared-drift.sh` → file GH Issue nếu drift.
- Manual weekly: `diff` 3 versions của `client.ts`, `auth-context.tsx`.

### 2.2 Realtime Strategy

Hiện tại chỉ Flow F dùng realtime. Đề xuất mở rộng có chọn lọc.

#### Decision matrix

| Flow/table | Realtime? | Rationale |
|---|---|---|
| `writing_submissions` (status update) | ✅ YES | Teacher dashboard cần instant notify. Polling 30s UX kém. |
| `teacher_availability_rules` | ✅ YES (đã có) | Admin thấy teacher update ngay. |
| `class_sessions` | ⚠️ SELECTIVE | Realtime cho teacher view (upcoming sessions). Admin dashboard vẫn query. |
| `ielts_class_members` | ❌ NO | Low mutation rate. Query on-demand. |
| `notifications` | ✅ YES | Toast notification realtime. |
| `practice_results` | ❌ NO | Self-view only, fetch on submit. |
| `audit_logs` | ❌ NO | Admin dashboard, query-on-view đủ. |

#### Publication config

```sql
-- Pre-launch: add writing_submissions + notifications + class_sessions
alter publication supabase_realtime add table writing_submissions;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table class_sessions;

-- Set REPLICA IDENTITY để payload có full row
alter table writing_submissions replica identity full;
alter table notifications replica identity full;
alter table class_sessions replica identity full;
```

#### Channel naming convention

- Private per-user: `user:{userId}:notifications`
- Per-teacher queue: `teacher:{teacherId}:submissions`
- Broadcast admin: `admin:broadcast:availability`
- Filter qua RLS (channel subscribe respect RLS tự động).

#### Anti-patterns to avoid

- ❌ Subscribe toàn bảng không filter → scale 100 users = storm events.
- ❌ Mix realtime + polling cùng data → double fetch.
- ❌ Subscribe trong component không cleanup → memory leak.

### 2.3 Migration Protocol

Xem chi tiết `MIGRATION_TEMPLATE.md`. Tóm tắt workflow:

1. **Design**: Update DB schema trực tiếp trên Supabase Studio (source of truth).
2. **Capture**: Dump schema changes thành SQL → commit vào `supabase/migrations/YYYYMMDD_description.sql` ở **canonical repo** (Student).
3. **Sync**: Copy migration file sang Teacher + Admin repos.
4. **Verify**: Chạy `supabase db diff` local check drift. Chạy queries trong `AUDIT_SQL.sql` để verify.
5. **Deploy**: Lovable tự pick up migration khi push main.

#### Required SQL patterns

- Tất cả SECURITY DEFINER functions: `SET search_path = public`
- Tất cả table mutations: explicit RLS policy
- Foreign keys: `ON DELETE` rule phải explicit (`CASCADE`, `SET NULL`, `RESTRICT`)
- Indexes: Phải có nếu column dùng trong WHERE/ORDER BY dashboard queries

### 2.4 Security Hardening

Priority ordered (pre-launch blockers first):

#### 🔴 Pre-launch blockers (FIX trước 1/5)

1. **`create-external-account` privilege escalation**: Whitelist `role` param `['user','teacher']`. Từ chối `admin`, `super_admin` trừ khi caller là super_admin.
   ```ts
   const ALLOWED_ROLES = ['user', 'teacher'];
   if (!ALLOWED_ROLES.includes(role) && !callerIsSuperAdmin) {
     return new Response('Forbidden role', { status: 403 });
   }
   ```

2. **`grade-practice` answer-peek**: Nếu `save_result=false`, KHÔNG return `correct_answer` + `explain`. Chỉ return score.

3. **`reset-student-password`**: Generate random 12-char password, email cho user. Đừng return plaintext trong HTTP response. Thêm rate limit 5/min/admin.

4. **`submit-placement-result` token**: Add `expires_at` (24h). Single-use (insert row to `placement_tokens_used`). Validate `score` range 0-100, `section_type` enum.

5. **`get-answer-key`**: Check `test_results.status = 'submitted'` (không chỉ row exists).

6. **`delete-user` cleanup**: Add missing tables `writing_submissions`, `practice_results`, `placement_results`, `notifications`, `audit_logs` (soft-delete preferred — set `user_id = null` với archive log).

7. **`ai-grade-writing` rate limit**: 10 req/min/teacher (kể cả admin). Prevent cost blowup.

8. **Remove hardcoded Supabase URL + key** (Teacher `src/lib/supabase.ts`, Admin `src/integrations/supabase/client.ts`): Migrate to `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` env vars như Student.

#### 🟡 Sprint 1 (post-launch 2 tuần)

9. **SECURITY DEFINER audit**: Chạy `AUDIT_SQL.sql` section 2 → đảm bảo all functions có `SET search_path = public`.

10. **RLS coverage**: Chạy `AUDIT_SQL.sql` section 1 → enforce RLS trên mọi table có user data.

11. **PII masking trong logs**: `console.log(user.email)` trong edge functions → mask thành `us***@domain.com`.

12. **CORS lockdown**: Edge functions hiện `Access-Control-Allow-Origin: *` → whitelist domain 3 apps.

#### 🟢 Sprint 2+ (quý sau)

13. **2FA admin login** (Supabase Auth MFA).
14. **Session timeout** admin 8h, teacher 24h, student 7 ngày.
15. **Audit log retention**: Archive > 90 days thành cold storage.
16. **Secrets rotation**: Lovable AI Gateway key, TeachNGo API key — rotate quý.

### 2.5 Monitoring & Observability

Solo dev + budget-limited → maximize Supabase built-in, không dùng paid tools.

#### Layer 1 — Supabase dashboard (free)

- **Database health**: Studio → Reports → Query performance. Check weekly.
- **Auth events**: Studio → Authentication → Logs. Alert on failed login spike.
- **Edge functions**: Studio → Edge Functions → Logs + Metrics. Watch p95 latency.
- **Realtime**: Studio → Realtime → Inspector. Check channel count.

#### Layer 2 — Custom audit table (đã có)

- `audit_logs` table + `log_audit_event(action, entity, payload)` function.
- Admin dashboard page `/admin/audit` query recent events.
- **Add**: Severity level (`info`, `warn`, `error`, `critical`).

#### Layer 3 — GitHub Actions scheduled health check (free)

- Weekly cron: chạy `AUDIT_SQL.sql` via `supabase db psql` → post kết quả lên GitHub Issue.
- Metrics tracked: row counts hot tables, slow query count, RLS drift.

#### Layer 4 — Client-side error tracking (free tier)

- Sentry free plan (5k events/month) hoặc Supabase `_analytics` table custom.
- Capture unhandled exception + route + user_id.

#### Dashboards to build

| Dashboard | Owner | Frequency | Purpose |
|---|---|---|---|
| DB health weekly | You | Weekly | Index drift, row count spikes |
| Teacher SLA | Admin app | Daily | Submissions pending > 48h |
| Student activity | Student app | On-demand | Personal analytics |
| Edge function latency | You | Weekly | Cold start regression |

#### Alerts pre-launch (email-based, free)

- Supabase project → Settings → Integrations → Set email alert:
  - Database CPU > 80%
  - Failed auth > 50/hour
  - Edge function error rate > 5%

---

