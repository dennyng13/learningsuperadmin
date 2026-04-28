# AUDIT — learningsuperadmin (Super Admin Portal)

**Phạm vi**: chỉ các vấn đề **NỘI BỘ** repo này. Vấn đề chéo repo (drift types, edge function trùng tên, shared code copy-paste) đã có ở `~/Projects/AUDIT.md` và `~/Projects/CROSS_REPO_AUDIT.md`.
**Ngày audit**: 2026-04-29.

## Tổng quan sức khỏe

Repo Admin là phần "đẹp" nhất trong 3 repo về tổ chức code: `src/admin/features/` chia rạch ròi theo 28 domain (academic, contracts, payroll, timesheet, …), guards/layouts tách biệt, có docs trong `architecture-review/` và `mem/`. Code chạy được, có sản phẩm thật, có pattern guards (`ProtectedAdminRoute`, `SuperAdminRoute`, `ModuleAccessRoute`) chuẩn.

3 rủi ro nội bộ lớn nhất khi mở rộng:

1. **Tất cả 50+ page eager-load** trong `AdminRoutes.tsx` — `<Suspense>` có nhưng 0 `React.lazy()`. Mỗi feature mới phình initial bundle thêm.
2. **Migration & edge function trong repo này vi phạm CLAUDE.md** (15 SQL + 4 functions); riêng `programs` có 3 migration cùng ngày (04-27) lần lượt ghi đè nhau — dấu hiệu vibe-loop chưa stabilize, nguy cơ apply sai thứ tự.
3. **God components không quản nổi**: `TestEditorPage` 2553 LOC + `SyncedUsersTab` 1571 LOC + `SharedPlanEditor` 1722 LOC + `PracticeExercisesPage` 1835 LOC — thêm tab/dialog mới vào 1 trong 4 file này = đọc lại 1500+ dòng.

---

## 1. Điểm mạnh hiện tại (đừng phá)

### 1.1. Tổ chức `features/` rạch ròi
28 domain trong `src/admin/features/` (academic, attendance, auth, availability-drafts, badges, brand-assets, classes, compensation, contracts, dashboard, …). Mỗi feature có cấu trúc lặp lại: `pages/`, `components/`, đôi khi `hooks/`, `utils/`, `types.ts`. Pattern này đúng — code mới copy theo dễ.

### 1.2. Guards + RBAC layered
`src/admin/guards/{ProtectedAdminRoute, SuperAdminRoute, ModuleAccessRoute}.tsx` cho phép ép quyền ở 3 mức độ ngay tại router. `ADMIN_MODULE_KEYS` trong `useUserModuleAccess.ts` (Tests, Flashcards, StudyPlans, …) cho admin granular permission qua `user_module_access` table. Pattern này tốt — mở rộng module mới chỉ cần thêm 1 key.

### 1.3. Vite manual chunking đã được tinh chỉnh
`vite.config.ts:46-73` chia vendor chunk theo lib (router, query, icons, supabase, date, motion, xlsx, pdf) + comment giải thích vì sao **không** tách react/radix khỏi default graph (tránh circular bootstrap). Đây là kiến thức quý — đừng đụng nếu chưa hiểu.

### 1.4. `createSafeStorage()` cho Supabase auth
`src/integrations/supabase/client.ts:16-41` fallback về in-memory khi `localStorage` bị block (private browsing, iframe). Tránh được class bug "user không login được trên Safari Private". Đáng port sang Student/Teacher.

### 1.5. Docs nội bộ tốt
- `architecture-review/SHARED_CODE_SETUP.md` đã tự nhận diện vấn đề copy-paste-drift, đề xuất canonical-source pattern.
- `architecture-review/MIGRATION_TEMPLATE.md`, `architecture-review/AUDIT_SQL.sql`, `architecture-review/ARCHITECTURE_REVIEW_PART2/3.md` ghi lại quá trình thiết kế.
- `mem/index.md` + `mem/features/admin/{...}.md` ghi lịch sử các feature lớn (Brand Assets Manager, Library Hub, Classes List, Class detail schema, Max Quotes Manager).
- → Đừng xoá. Đây là source-of-truth cho ý đồ thiết kế.

### 1.6. Có script `sync:types` + page `/schema-health`
`package.json` có `npm run sync:types` regen `types.ts` từ Supabase project. `src/admin/features/schema-health/` có page tự probe schema. Đây là tooling nội bộ, đừng bỏ.

---

## 2. Nợ kỹ thuật thực sự

### 2.1. AdminRoutes.tsx eager-load 50+ page (KHÔNG dùng `React.lazy`)
- **File/vị trí**: `src/admin/routes/AdminRoutes.tsx:1-66` — tất cả page import trực tiếp.
- **Mô tả**: 50+ `import` ở đầu file, không có call nào tới `React.lazy()`. `<Suspense>` ở line 78 vô nghĩa nếu component không lazy. Verified: `grep -c "React.lazy\|lazy(" AdminRoutes.tsx → 0`.
- **Tại sao là vấn đề**: mỗi page mới (vd: `payroll/PayrollListPage`, `contracts/AddendumTemplateEditorPage`, …) tăng initial JS bundle. Module `tiptap` (rich-text editor, dùng trong contracts) tự nó ~150KB — đang load ngay lúc user chỉ vào dashboard. First paint chậm trên máy yếu / 3G.
- **Ưu tiên**: **Cao** (nền tảng sẽ thêm nhiều module enterprise).
- **Rủi ro khi sửa**: **Thấp** — đổi `import X from "..."` thành `const X = lazy(() => import("..."))` từng dòng. Test deep-link sau khi đổi.

### 2.2. 15 migrations + 4 edge functions trong repo Admin (CLAUDE.md cấm)
- **File/vị trí**: `supabase/migrations/` (15 file `.sql`) + `supabase/functions/{generate-max-quotes, list-sync-type-runs, send-class-invitations, trigger-sync-types}/`
- **Mô tả**: CLAUDE.md line 18 ghi rõ "KHÔNG được sửa schema database, RLS policies, edge functions, hoặc migrations — những việc đó tôi sẽ làm bên repo ieltspractice". Nhưng repo có sẵn 15 migrations. Đáng chú ý: `20260427041806_keep_only_three_programs.sql` → `20260427060952_reset_programs_to_ielts_only.sql` → `20260427061436_keep_three_programs_only.sql` là 3 migration trên cùng 1 ngày (04-27) lần lượt ghi đè nhau. Đây là dấu hiệu vibe-loop: Lovable sinh migration, không đúng, sinh tiếp migration sửa, không đúng, sinh tiếp.
- **Tại sao là vấn đề**: nếu Lovable apply 3 migration này theo đúng thứ tự thì OK; nếu 1 trong 3 fail half-way (vd: timeout) state DB sẽ ở giữa chừng, không deterministic. Edge function `send-class-invitations` cũng có 2 phiên bản (Student + Admin) — đã được flag là drift 372 dòng trong audit cũ.
- **Ưu tiên**: **Cao** (rủi ro vỡ schema khi mở rộng).
- **Rủi ro khi sửa**: **Cao** — phải audit từng migration: đã apply chưa, có conflict với Student không, có move sang Student được không. Không phải dọn 1 bữa được. Đề xuất: viết script kiểm tra checksum định kỳ; quy ước "migration mới chỉ tạo trong Student".

### 2.3. God component: TestEditorPage 2553, PracticeExercisesPage 1835, SyncedUsersTab 1571, SharedPlanEditor 1722
- **File/vị trí**:
  - `src/admin/features/tests/pages/TestEditorPage.tsx` — 2553 LOC
  - `src/admin/features/practice/pages/PracticeExercisesPage.tsx` — 1835 LOC (xem 3.1: dead code)
  - `src/shared/components/study-plan/SharedPlanEditor.tsx` — 1722 LOC (cũng tồn tại ở Student/Teacher với drift)
  - `src/admin/features/users/components/SyncedUsersTab.tsx` — 1571 LOC
  - `src/admin/features/schedule/pages/AdminSchedulePage.tsx` — 1204 LOC
  - `src/admin/features/users/components/SyncedClassesTab.tsx` — 1153 LOC
  - `src/admin/features/performance/pages/StudentPerformancePage.tsx` — 1149 LOC
  - `src/admin/features/flashcards/pages/FlashcardSetsPage.tsx` — 1087 LOC
- **Mô tả**: 8 file ≥1000 LOC. `TestEditorPage` import 30+ thứ ở đầu, có `QUESTION_TYPE_META` hardcoded ngay trong file (file `shared/utils/questionTypeMeta.ts` đã tồn tại sẵn để dùng — bị bypass). Mỗi file = nhiều chục `useState`, dialog, fetch, helper.
- **Tại sao là vấn đề**: thêm tab/dialog/feature mới = đọc lại 1500+ LOC, dễ bỏ sót side-effect (closure capture, useEffect deps). Khi 2 người sửa song song → conflict cao. Debug stack trace cũng khó.
- **Ưu tiên**: **Cao** cho 4 file >1500 LOC; **TB** cho file 1000-1500 LOC.
- **Rủi ro khi sửa**: **Cao** — refactor god-component thường vỡ silent. Đề xuất: tách dần theo dialog/section, không big-bang. Bắt đầu từ `TestEditorPage` (lớn nhất + được dùng nhiều).

### 2.4. Hardcoded Supabase URL + anon key
- **File/vị trí**: `src/integrations/supabase/client.ts:6-8`
- **Mô tả**: `SUPABASE_URL = "https://jcavqutyfvalaugneash.supabase.co"` + `SUPABASE_PUBLISHABLE_KEY = "eyJ..."` viết thẳng trong code. Anon key là public nên không phải lỗ hổng bảo mật, nhưng không thể swap project mà không sửa code.
- **Tại sao là vấn đề**: chặn workflow staging/preview. Khi muốn test 1 migration lớn trên Supabase staging riêng trước khi push prod, phải sửa file (rồi nhớ revert). Teacher đã có pattern hybrid (`VITE_*` env có ưu tiên hơn fallback hardcoded).
- **Ưu tiên**: **TB**
- **Rủi ro khi sửa**: **Thấp** — copy pattern Teacher: `const URL = import.meta.env.VITE_SUPABASE_URL ?? "https://jcavqutyfvalaugneash.supabase.co"`.

### 2.5. TypeScript `strict: false` + 208 chỗ `(supabase as any)`
- **File/vị trí**: `tsconfig.json:4-15` (`noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`); rải khắp `src/` 208 chỗ `(supabase as any)` + 639 chỗ `as any` tổng.
- **Mô tả**: types.ts trong repo này là 3215 LOC (Student là 8384 LOC) → schema thiếu một nửa, nên Lovable đã tự learn cách workaround bằng `as any` mọi nơi. TS compiler không bắt được `null undefined`, không bắt được unused locals.
- **Tại sao là vấn đề**: kết hợp với refactor god-component (mục 2.3) → không có safety net. Mỗi feature mới sẽ thừa kế gánh `as any`. Bug runtime chỉ phát hiện trên prod.
- **Ưu tiên**: **TB-Cao** (chiến lược dài hạn).
- **Rủi ro khi sửa**: **Cao** — bật strict sẽ ra hàng nghìn lỗi compile. Đề xuất: chạy `npm run sync:types` trước (regen types từ Student schema), rồi bật `strictNullChecks` riêng → fix dần. Không bật `noImplicitAny` trước khi types đầy đủ.

### 2.6. Test coverage gần như 0%
- **File/vị trí**: `src/test/` — 3 file: `example.test.ts`, `setup.ts`, `admin-routes.test.ts`. Tổng repo 84k LOC.
- **Mô tả**: `vitest` đã wired (`vitest.config.ts`, `package.json` có `test` + `test:watch`), nhưng chưa được dùng. CLAUDE.md không mention test rule.
- **Tại sao là vấn đề**: refactor god-component (mục 2.3), bật strict TS (mục 2.5), regen types (mục 2.2) đều rất nguy hiểm vì không có safety net. Mỗi feature mới sẽ tăng gánh hồi quy thủ công.
- **Ưu tiên**: **TB** (chiến lược) — không phải để backfill toàn bộ, mà là rule mới: "feature mới phải có 1 test happy path".
- **Rủi ro khi sửa**: **Thấp** — viết test mới không vỡ gì.

---

## 3. Code chết / không dùng

Đã verify bằng `grep -rln <name>` trừ self-reference. Liệt kê chỉ các trường hợp 0 consumer thực sự, có thể xoá an toàn:

### 3.1. `PracticeExercisesPage.tsx` — 1835 LOC
- **File**: `src/admin/features/practice/pages/PracticeExercisesPage.tsx`
- **Bằng chứng**: `grep "PracticeExercisesPage"` chỉ ra 2 file: chính nó (export) + `shared/components/resources/ResourceFilterBar.tsx` line 10 (1 comment "theo phong cách của PracticeExercisesPage"). KHÔNG có route nào trong `AdminRoutes.tsx` import nó. Route `practice/:exerciseId/stats` dùng `PracticeExerciseDetailPage` (singular).
- **Tại sao là vấn đề**: 1835 LOC zombie. Vẫn import `ResourceTagManager`, `useCourses`, `uploadToWorkDrive`, ... — kéo theo dependency graph cho lib. Vẫn được TS compile.
- **Ưu tiên**: **Cao** (file lớn nhất repo có thể xoá ngay).
- **Rủi ro khi sửa**: **Thấp** — xoá file. Search lại `PracticeExercisesPage` toàn repo trước khi xoá.

### 3.2. `useAvailableTeachers.ts` (v1) — 56 LOC
- **File**: `src/shared/hooks/useAvailableTeachers.ts`
- **Bằng chứng**: chỉ V2 (`useAvailableTeachersV2.ts`) reference v1 trong **comment** ("same all-of semantics as v1's useAvailableTeachers"). 0 import thực. Wizard `Step2Schedule.tsx` đã dùng V2.
- **Tại sao là vấn đề**: Lovable hoặc dev mới có thể vô tình import v1 thay vì V2 → chạy RPC cũ thiếu scoring fields.
- **Ưu tiên**: **TB**
- **Rủi ro khi sửa**: **Thấp** — xoá file + sửa comment trong V2 thành "previous version was deleted".

### 3.3. Settings tab không được mount
- `src/admin/features/settings/components/AdminContractsTab.tsx` — 0 consumer (verified: chỉ self-reference)
- `src/admin/features/settings/components/AdminGitHubSyncTab.tsx` — 0 consumer
- **Bằng chứng**: `AdminSettingsPage.tsx:12-18` chỉ import 7 tab (Backup, Storage, General, Notifications, Email, SyncTypes, BrandAssets). 2 tab trên không được tham chiếu.
- **Tại sao là vấn đề**: dead config UI gây nhầm lẫn. Có thể là code cũ trước khi tab "Contracts" chuyển ra trang riêng `/contracts`, "GitHub Sync" chuyển sang Lovable.
- **Ưu tiên**: **TB**
- **Rủi ro khi sửa**: **Thấp** — xoá 2 file. Đảm bảo không có route legacy nào cần redirect.

### 3.4. Component shared 0 consumer
- `src/shared/components/misc/AIWritingFeedback.tsx` — 0 consumer
- `src/shared/components/ui/loading-spinner.tsx` — 0 consumer (cả app dùng `<Loader2 />` từ lucide hoặc `<TabSkeleton />`).
- `src/shared/components/exam/SavedQuestions.tsx` exports `useSavedQuestions` + `SavedQuestionsPanel` — 0 external consumer (chỉ `useCloudSavedQuestions.ts` import `type SavedQuestion` cho type).
- **Tại sao là vấn đề**: kéo theo `useCloudSavedQuestions.ts` cũng có thể là dead path, cần check kỹ.
- **Ưu tiên**: **TB**
- **Rủi ro khi sửa**: **Thấp**.

### 3.5. Util shared 0 consumer (đã document trong SHARED_CODE_SETUP)
- `src/shared/utils/confetti.ts` — 0 consumer ở repo này.
- `src/shared/utils/beep.ts` — 0 consumer ở repo này.
- **Bằng chứng**: SHARED_CODE_SETUP.md đã ghi 2 file này là canonical-sync với Student. Có thể Student vẫn dùng. **Đừng xoá riêng repo này** — phải đồng bộ với Student. Liệt kê để biết Admin không cần.
- **Ưu tiên**: **Thấp** (chỉ là "không cần" chứ không gây hại).
- **Rủi ro khi sửa**: **TB** — phụ thuộc cross-repo.

---

## 4. Điểm bất nhất

### 4.1. 2 toast system mounted song song
- **File/vị trí**: `src/App.tsx:33-34` mount cả `<Toaster />` (shadcn ui) + `<Sonner />` (sonner).
- **Mô tả**: 110 file dùng `import { toast } from "sonner"`, 4 file dùng `import { toast/useToast } from "@shared/hooks/use-toast"`. 2 hệ thống style khác nhau, animation khác nhau, thread trùng có thể bắn 2 toast cho cùng 1 sự kiện.
- **Bằng chứng**: `grep -c 'from "sonner"' → 110`; `grep -rn "use-toast"` → 4 file (`OfflineFallback`, `FeatureFlagsPage`, …).
- **Tại sao là vấn đề**: bug visual khó debug ("toast hiện ra 2 lần"). Mỗi feature mới phải quyết định dùng cái nào → drift tăng.
- **Ưu tiên**: **TB**
- **Rủi ro khi sửa**: **Thấp** — chọn 1 hệ thống (recommend sonner vì đã >100 file dùng). Migrate 4 file kia. Xoá `<Toaster />` (shadcn) khỏi App.tsx.

### 4.2. Import path: `@/integrations/...` vs `@shared/...` vs `@admin/...`
- **File/vị trí**: cả `tsconfig.json` + `vite.config.ts` đều khai 4 alias: `@`, `@shared`, `@student`, `@admin`, `@teacher`.
- **Mô tả**: 143 file dùng `@/integrations/supabase/client` (alias `@`), 1205 file dùng `@shared/...`, 184 file dùng `@admin/...`. Có file lai: `PracticeExercisesPage.tsx:43` dùng `@/admin/features/academic/hooks/useCourses` (alias `@`) thay vì `@admin/features/...` (alias `@admin`). `BulkCourseAssignDialog.tsx`, `ResourceFilterBar.tsx`, `CourseAssignmentPanel.tsx`, `TemplateEditor.tsx` cũng vậy.
- **Tại sao là vấn đề**: search/refactor khó (phải grep cả 2 dạng). Tooling auto-import của IDE không biết chọn alias nào → drift tự nhiên.
- **Ưu tiên**: **TB-Thấp**
- **Rủi ro khi sửa**: **Thấp** — chuẩn hoá: dùng `@admin/`, `@shared/` cho cross-folder, không dùng `@/` cho code trong `src/admin/...` hoặc `src/shared/...`. `@/integrations/supabase/client` thì giữ vì là cross-cutting infra. Hoặc đơn giản: regex replace.

### 4.3. Migration naming không có convention
- **File/vị trí**: `supabase/migrations/`
- **Mô tả**: 3 file cùng ngày 2026-04-27 mục đích chồng chéo:
  - `20260427041806_keep_only_three_programs.sql`
  - `20260427060952_reset_programs_to_ielts_only.sql`
  - `20260427061436_keep_three_programs_only.sql`
  Tên gần giống, mục đích đảo ngược nhau (reset vs keep). Không có pattern "down" / "rollback".
- **Tại sao là vấn đề**: khi chạy migration mới mà state DB không sạch (vd: Lovable đã apply file 1, fail file 2), sửa lỗi rồi rerun có thể skip / re-apply sai. Khó kiểm toán.
- **Ưu tiên**: **TB**
- **Rủi ro khi sửa**: **Cao** — không xoá được migration đã apply. Rule mới: tên migration phải mô tả "ý đồ cuối cùng", không tạo migration siêu hẹp rồi sửa.

### 4.4. RPC call có 3 pattern
- `(supabase.rpc as any)("name", params)` (vd: `useAvailableTeachers.ts:39`)
- `supabase.rpc("name" as any)` (vd: `ClassManagementPage.tsx:24`)
- `supabase.rpc("name", params)` (typed — rất ít, vd: `TeachersTab.tsx:103`)
- **Tại sao là vấn đề**: search RPC name khó (phải grep 3 dạng). Khi types.ts cập nhật và RPC trở thành typed, không biết file nào còn cần `as any`.
- **Ưu tiên**: **Thấp** (chỉ ăn theo mục 2.5).
- **Rủi ro khi sửa**: **Thấp**.

---

## 5. Mã lặp lại nội bộ repo

### 5.1. `formatDate` / `formatDateTime` — 11 implementation
- **File/vị trí** (mỗi file có function riêng):
  - `src/admin/features/contracts/components/PartyTablesView.tsx`
  - `src/admin/features/contracts/components/AuditLogTab.tsx`
  - `src/admin/features/contracts/components/AddendumsTab.tsx`
  - `src/admin/features/contracts/components/SignaturesTab.tsx`
  - `src/admin/features/contracts/pages/AddendumEditorPage.tsx`
  - `src/admin/features/contracts/pages/ContractDetailPage.tsx`
  - `src/admin/features/contracts/pages/ContractsListPage.tsx`
  - `src/admin/features/timesheet/pages/TimesheetPeriodsPage.tsx`
  - `src/admin/features/timesheet/pages/TimesheetPeriodDetailPage.tsx`
  - `src/admin/features/classes/components/ClassInfoCard.tsx`
  - `src/admin/features/payroll/utils/format.ts`
- **Mô tả**: tất cả đều cùng pattern `${dd}/${mm}/${yyyy}` hoặc `${dd}/${mm}/${yyyy} ${HH}:${MM}`, tự xử lý null + isNaN. `package.json` đã có `date-fns: ^3.6.0` — đáng dùng `format(d, 'dd/MM/yyyy')`.
- **Tại sao là vấn đề**: thay đổi format ngày (vd: muốn hiển thị "27 Apr 2026") = sửa 11 file. Lovable rất dễ tạo file thứ 12 vì không thấy helper sẵn.
- **Ưu tiên**: **TB**
- **Rủi ro khi sửa**: **Thấp** — tạo `src/shared/utils/formatDate.ts` export 2 hàm. Replace 11 file.

### 5.2. `formatVND` / `formatVnd` / `formatVNDCompact` / `formatVndSigned` — 7 implementation
- **File/vị trí**:
  - `src/admin/features/classes/components/ClassInfoCard.tsx:60` — `formatVND`
  - `src/admin/features/classes/components/detail-tabs/OverviewTab.tsx:6` — `formatVNDCompact`
  - `src/admin/features/contracts/components/AddendumPayRatesEditor.tsx:51` — `formatVnd`
  - `src/admin/features/contracts/components/PayRatesTab.tsx:30` — `formatVnd`
  - `src/admin/features/users/components/TeacherIncomeTab.tsx:43` — `formatVND`
  - `src/admin/features/payroll/utils/format.ts:1` — `formatVnd` + `formatVndSigned` (đã đúng chỗ — là util)
- **Mô tả**: 4 cách viết hoa khác nhau (`VND` / `Vnd`), behavior tương tự (`new Intl.NumberFormat("vi-VN", ...)` hoặc `toLocaleString("vi-VN")`). CLAUDE.md ở Student định nghĩa "VND money là integer với suffix `_vnd`" — đáng có 1 helper canonical.
- **Tại sao là vấn đề**: payroll/contracts là module enterprise lõi sẽ mở rộng. Mỗi tab/dialog mới sẽ phải re-import hoặc tạo lại helper. Sai 1 chỗ (vd: thiếu `Math.round`) bug khó phát hiện.
- **Ưu tiên**: **Cao** (đụng tiền).
- **Rủi ro khi sửa**: **Thấp** — promote `payroll/utils/format.ts` thành `shared/utils/money.ts`, replace 6 file kia. Test: snapshot vài giá trị (1000000 → "1.000.000 ₫").

### 5.3. `QUESTION_TYPE_META` định nghĩa 4 lần
- **File/vị trí**:
  - `src/shared/utils/questionTypeMeta.ts` (canonical, 200+ LOC, có icon + palette + label)
  - `src/admin/features/tests/pages/TestEditorPage.tsx:38-58` (object literal hardcoded)
  - `src/admin/features/tests/pages/ImportExercisePage.tsx`
  - `src/admin/features/practice/pages/PracticeExercisesPage.tsx` (đã dead — xem 3.1)
  - `src/admin/features/dashboard/components/ContentAnalytics.tsx`
- **Mô tả**: file canonical ở `shared/utils/` nhưng 4 file lớn không dùng — define lại metadata. Khi thêm question type mới (vd: `multiple_choice_pick3`), phải sửa 4 chỗ + canonical.
- **Tại sao là vấn đề**: mở rộng IELTS với question type mới (sắp có Reading "matching paragraphs", Listening "diagram with multiple zones") = sửa nhiều chỗ → drift chắc chắn xảy ra.
- **Ưu tiên**: **Cao**
- **Rủi ro khi sửa**: **TB** — replace từng file, test render badge / chip vẫn đúng. Phụ thuộc canonical đầy đủ chưa.

### 5.4. Mỗi settings tab có pattern fetch + save riêng
- **File/vị trí**: 12 file trong `src/admin/features/settings/components/Admin*Tab.tsx` — mỗi cái implement own state, own `useEffect` fetch, own save button, own toast. Không có abstraction `<SettingsTab fetcher={...} saver={...} />`.
- **Mô tả**: ví dụ `AdminGeneralTab`, `AdminEmailTab`, `AdminNotificationsTab` đều: load config từ table, hiển thị form, submit save. Không có hook `useSettingTab(key)` hay component `<SettingForm />`.
- **Tại sao là vấn đề**: thêm setting mới = copy 1 tab cũ rồi sửa. Sửa pattern (vd: thêm "auto-save", "diff trước save") = sửa 12 file.
- **Ưu tiên**: **Thấp-TB**
- **Rủi ro khi sửa**: **TB** — extract `useSettingTab` cần test cẩn thận.

---

## Đề xuất ưu tiên (5 việc nên làm trước, theo thứ tự)

1. **Lazy-load AdminRoutes** (mục 2.1). Thấp risk, tác động lớn lên UX. ~30 dòng đổi.
2. **Xoá dead code lớn** (mục 3.1, 3.2, 3.3, 3.4). Trước khi refactor god-component, dọn 1835 LOC `PracticeExercisesPage` + 2 settings tab + `useAvailableTeachers` v1 + `AIWritingFeedback` + `loading-spinner` + `SavedQuestions`. ~3500 LOC bớt khỏi codebase = bớt distraction cho mọi việc về sau.
3. **Promote `formatVND` + `formatDate` thành shared util** (mục 5.1, 5.2). Đụng tiền + ngày hiển thị → bug ở đây nguy hiểm. Promote `payroll/utils/format.ts` lên `shared/utils/money.ts` + tạo `shared/utils/formatDate.ts`, replace ~18 file.
4. **Thống nhất 1 toast system + dọn import alias `@/admin/*`** (mục 4.1, 4.2). Sửa 4 file dùng shadcn toast → sonner. Xoá `<Toaster />` shadcn khỏi App.tsx. Regex replace `@/admin/` → `@admin/` ở các file đã liệt kê.
5. **Tách `TestEditorPage` 2553 LOC** (mục 2.3 — chỉ làm file này trước). Áp dụng pattern: 1 page → component lớn → tách dialog ra file riêng → tách helper ra hook. Đừng đụng `SyncedUsersTab` / `SharedPlanEditor` / `PracticeExercisesPage` (đã dead) cho đến khi xong file 1.

**KHÔNG làm vội** (cần plan + cross-repo context):
- Migration cleanup (mục 2.2) — phải thống nhất với Lovable workflow ở Student trước.
- Bật TS strict (mục 2.5) — phải sync types từ Student trước.
- Refactor settings tab abstraction (mục 5.4) — chờ thấy pattern thứ 13 mới làm.

---

## Phụ lục: vấn đề thẩm mỹ (bỏ qua)

Các điểm dưới đây tôi đã thấy nhưng **không đáng sửa** — chỉ ghi để bạn yên tâm là đã xem xét:
- Comment tiếng Việt + tiếng Anh xen kẽ — không ảnh hưởng runtime.
- 18 lần `import.*from "date-fns"` chưa cùng style (`format` vs `formatDistance` riêng lẻ vs gộp 1 dòng) — IDE auto-fix được.
- `console.warn` rải rác (~20 chỗ) — đa số là legitimate debug logs, không phải `console.log` rác.
- 3 path alias `@student`, `@teacher` được khai trong `tsconfig.json` mà repo này không dùng — vô hại, để vậy đỡ churn nếu sau này merge / share code.
