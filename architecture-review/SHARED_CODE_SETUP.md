# Shared Code Strategy — Learning Plus

**Version**: 1.0
**Last updated**: 2026-04-21
**Target**: 3 Lovable projects (Student + Teacher + Admin) sharing 1 Supabase backend.

---

## Why this document exists

Hiện trạng: 3 repos có folder `src/shared/` chứa types + utils + hooks được **copy-paste** giữa các repos. Đã phát hiện drift thật sự:

- `shared/utils/availability.ts`: Admin 15KB vs Teacher 9KB (**BY DESIGN** — Admin có thêm slot-matching logic).
- `shared/utils/programColors.ts`: Student 6.5KB vs Admin 7.7KB (drift không rõ lý do).
- `shared/types/availability.ts`: Teacher 2.8KB vs Admin 2.9KB (minor drift).
- Student's types.ts là superset (96KB) vs Teacher/Admin (93KB bit-identical).
- QueryClient config: Teacher drift khỏi Student/Admin.
- Supabase client: Student dùng env vars, Teacher + Admin hardcode.

Constraint: **solo non-dev user + Lovable Pro + budget-limited**. Không afford:
- npm private package (maintenance overhead: versioning, publish, peer deps).
- Git submodule (Lovable không hỗ trợ).
- Monorepo (Lovable = 1 project : 1 repo).

Đề xuất strategy: **canonical-source + drift detection + manual sync**.

---

## Strategy: canonical-source pattern

### Rule 1 — Mỗi shared file có **1 canonical repo**

| File / Folder | Canonical repo | Reason |
|---|---|---|
| `src/integrations/supabase/types.ts` | **Student** (superset) | Student repo có tất cả tables; Teacher + Admin là subset. |
| `src/shared/utils/availability.ts` (Admin version) | **Admin** | Admin owns slot-matching logic. |
| `src/shared/utils/availability.ts` (Teacher version) | **Teacher** | Teacher-only subset. Khác BY DESIGN. |
| `src/shared/types/availability.ts` | **Teacher** | Teacher owns teacher_availability tables (xem SCHEMA-OWNERSHIP.md). |
| `src/shared/utils/answerComparison.ts` | **Student** | Grading logic dùng chung. |
| `src/shared/utils/scoreConversion.ts` | **Student** | IELTS band conversion. |
| `src/shared/utils/beep.ts`, `confetti.ts`, `formatTime.ts`, `levelColors.ts`, `performance.ts`, `progressTracking.ts`, `questionTypeMeta.ts`, `questionTypes.ts`, `skillColors.ts`, `studyPlanProgress.ts`, `studyPlanStatus.ts`, `workdriveSync.ts` | **Student** | Bit-identical với Admin hiện tại; Student là canonical. |
| `src/shared/utils/programColors.ts` | **Student** (cần quyết định drift) | Drift 1KB giữa Student + Admin — cần resolve. |
| `src/shared/utils/moduleColors.ts` | **Student** | Student-only hiện tại. |
| `src/shared/utils/feedbackPdf.ts` | **Student** | Student-only (jspdf dependency). |
| `src/shared/components/misc/ErrorBoundary.tsx` | **Admin** | Admin version có chunk-error recovery; Student dùng trực tiếp. Teacher cần clone. |
| `src/shared/hooks/useTeacherAvailability.ts` | **Admin** | Admin consumer. |
| `src/shared/hooks/useMockTests.ts` | **Student** | Student-only. |
| `src/lib/queryClient.ts` (nếu extract) | **Student** | Student + Admin equal; Teacher cần adopt. |
| Supabase client (`src/integrations/supabase/client.ts`) | **Student** | Env-var pattern — Teacher + Admin phải migrate. |

### Rule 2 — Non-canonical repo phải sync từ canonical

Quy trình sync được mô tả ở phần "Sync workflow" bên dưới.

### Rule 3 — Drift detection tự động

Script so sánh Git tree SHA các file shared giữa repos. Chạy trước mỗi deploy hoặc weekly.

---

## Sync workflow

### Khi sửa 1 shared file

**Bước 1**: Identify canonical repo (bảng trên).

**Bước 2**: Sửa trong canonical repo trước. Commit + push `main`. Lovable sync.

**Bước 3**: Sync sang non-canonical:

Cách A — **Manual copy qua Lovable chat** (recommended cho solo dev):

```
Prompt cho Lovable non-canonical repo:
---
Tôi vừa update file `src/shared/utils/<name>.ts` ở [canonical repo name]. 
Hãy sync file này từ canonical. Dùng copy sau:

[paste toàn bộ nội dung file từ canonical repo]

Không sửa gì — chỉ replace file hiện tại. Nếu có dependencies mới (import), cài đặt.
```

Cách B — **Script drift-sync.sh** (khi comfort với CLI):

```bash
# Clone 3 repos cùng parent dir (/projects/learning-plus/)
# Chạy từ root của canonical repo:
bash ../scripts/sync-shared.sh <filepath>
```

Xem file `scripts/sync-shared.sh` ở cuối doc này.

**Bước 4**: Verify non-canonical type check pass:
- Teacher repo: `bun run type-check` or `bunx tsc --noEmit`
- Student/Admin repo: same

**Bước 5**: Commit non-canonical với message reference canonical commit:

```
sync: shared/utils/availability.ts from ieltspractice-aa5eb78f@abc1234
```

### Khi regenerate types.ts (sau schema change)

**Bước 1**: Chạy Supabase CLI ở **Student repo** (canonical):

```bash
npx supabase gen types typescript --project-id jcavqutyfvalaugneash \
  > src/integrations/supabase/types.ts
```

**Bước 2**: Commit trong Student repo. Push `main`.

**Bước 3**: Sync sang Teacher + Admin. **Quan trọng**: Teacher + Admin có thể là subset của Student types (Student có table `flashcards`, `feedbackPdf` v.v. mà Teacher/Admin không query). 2 option:

- **Option 1 (đơn giản)**: Copy nguyên file từ Student. Teacher/Admin có thêm types không dùng — không hại, chỉ `types.ts` to hơn.
- **Option 2 (strict)**: Filter types Teacher/Admin cần. Phức tạp, không đáng cho 100 users.

Recommend **Option 1** đến khi DB vượt 100 tables.

### Khi Teacher cần feature đã có trong Student/Admin

Ví dụ: Teacher muốn adopt Student's `queryClient.ts` config.

**Bước 1**: Identify file ở canonical (Student in this case).

**Bước 2**: Prompt Lovable Teacher:
```
Tôi muốn Teacher repo's QueryClient config align với Student. 
Student's config hiện tại tại src/App.tsx:

  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

Hãy cập nhật src/App.tsx của Teacher repo với config này. Đừng thay đổi logic route hay provider stack.
```

**Bước 3**: Commit, push, verify.

---

## Drift detection script

Lưu file này vào `scripts/check-shared-drift.sh` trong **mỗi** repo (hoặc trong 1 repo "meta" riêng nếu có).

```bash
#!/usr/bin/env bash
# check-shared-drift.sh — verify shared files across 3 repos are in sync
# Usage: bash scripts/check-shared-drift.sh
# Exits 0 if in sync, 1 if drift detected.

set -euo pipefail

STUDENT_REPO="${STUDENT_REPO:-../ieltspractice-aa5eb78f}"
TEACHER_REPO="${TEACHER_REPO:-../teachingwithlearningplus}"
ADMIN_REPO="${ADMIN_REPO:-../learningsuperadmin}"

# Files expected bit-identical giữa Student + Admin
BIT_IDENTICAL_SA=(
  "src/shared/utils/answerComparison.ts"
  "src/shared/utils/beep.ts"
  "src/shared/utils/confetti.ts"
  "src/shared/utils/formatTime.ts"
  "src/shared/utils/levelColors.ts"
  "src/shared/utils/performance.ts"
  "src/shared/utils/progressTracking.ts"
  "src/shared/utils/questionTypeMeta.ts"
  "src/shared/utils/questionTypes.ts"
  "src/shared/utils/scoreConversion.ts"
  "src/shared/utils/skillColors.ts"
  "src/shared/utils/studyPlanProgress.ts"
  "src/shared/utils/studyPlanStatus.ts"
  "src/shared/utils/workdriveSync.ts"
)

DRIFT=0

for f in "${BIT_IDENTICAL_SA[@]}"; do
  if [ -f "$STUDENT_REPO/$f" ] && [ -f "$ADMIN_REPO/$f" ]; then
    if ! diff -q "$STUDENT_REPO/$f" "$ADMIN_REPO/$f" > /dev/null; then
      echo "DRIFT: $f differs between Student and Admin"
      DRIFT=1
    fi
  else
    echo "MISSING: $f not in both Student and Admin"
    DRIFT=1
  fi
done

# types.ts: Admin + Teacher must match (bit-identical currently).
if ! diff -q "$ADMIN_REPO/src/integrations/supabase/types.ts" \
              "$TEACHER_REPO/src/integrations/supabase/types.ts" > /dev/null; then
  echo "DRIFT: types.ts differs between Admin and Teacher"
  DRIFT=1
fi

# Student types.ts should be SUPERSET of Admin/Teacher — check size only
STUDENT_SIZE=$(wc -c < "$STUDENT_REPO/src/integrations/supabase/types.ts")
ADMIN_SIZE=$(wc -c < "$ADMIN_REPO/src/integrations/supabase/types.ts")
if [ "$STUDENT_SIZE" -lt "$ADMIN_SIZE" ]; then
  echo "WARNING: Student types.ts ($STUDENT_SIZE) smaller than Admin ($ADMIN_SIZE) — unexpected"
  DRIFT=1
fi

if [ $DRIFT -eq 0 ]; then
  echo "OK — all shared files in sync"
  exit 0
else
  echo ""
  echo "Run sync workflow (see SHARED_CODE_SETUP.md) to fix drift."
  exit 1
fi
```

Chạy mỗi khi:
- Trước khi deploy Lovable (thủ công).
- Weekly (nếu có máy để chạy cron).
- Sau mỗi lần sửa shared file.

---

## Sync script (optional, advanced)

File `scripts/sync-shared.sh`:

```bash
#!/usr/bin/env bash
# sync-shared.sh — copy 1 shared file from canonical to other repos
# Usage: bash scripts/sync-shared.sh <relative-path-from-repo-root>
# Example: bash scripts/sync-shared.sh src/shared/utils/scoreConversion.ts

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <relative-path>"
  exit 1
fi

FILE="$1"
STUDENT_REPO="${STUDENT_REPO:-../ieltspractice-aa5eb78f}"
TEACHER_REPO="${TEACHER_REPO:-../teachingwithlearningplus}"
ADMIN_REPO="${ADMIN_REPO:-../learningsuperadmin}"

# Determine canonical repo based on file
declare -A CANONICAL_MAP=(
  ["src/shared/utils/availability.ts"]="admin"   # Admin owns Admin version; Teacher is different
  ["src/integrations/supabase/types.ts"]="student"
  ["src/shared/components/misc/ErrorBoundary.tsx"]="admin"
)

# Default canonical = student
CANONICAL="${CANONICAL_MAP[$FILE]:-student}"

case "$CANONICAL" in
  student) SRC="$STUDENT_REPO/$FILE" ;;
  teacher) SRC="$TEACHER_REPO/$FILE" ;;
  admin)   SRC="$ADMIN_REPO/$FILE" ;;
esac

if [ ! -f "$SRC" ]; then
  echo "Canonical source not found: $SRC"
  exit 1
fi

echo "Canonical: $CANONICAL ($SRC)"

# Copy sang 2 repos còn lại (trừ Teacher nếu file là availability.ts do Teacher có version riêng)
for TARGET in student teacher admin; do
  if [ "$TARGET" = "$CANONICAL" ]; then continue; fi
  
  # Skip availability.ts cho Teacher nếu copy từ Admin (Teacher có version riêng)
  if [ "$FILE" = "src/shared/utils/availability.ts" ] && [ "$TARGET" = "teacher" ]; then
    echo "SKIP: teacher has own version of availability.ts (by design)"
    continue
  fi

  case "$TARGET" in
    student) DST="$STUDENT_REPO/$FILE" ;;
    teacher) DST="$TEACHER_REPO/$FILE" ;;
    admin)   DST="$ADMIN_REPO/$FILE" ;;
  esac

  if [ -f "$DST" ]; then
    cp "$SRC" "$DST"
    echo "Synced → $DST"
  else
    echo "SKIP: target not present: $DST"
  fi
done

echo "Done. Run 'bun run type-check' in each affected repo to verify."
```

---

## Migration path từ current state

Task list thứ tự để đưa về canonical-source pattern:

### Week 1 (pre-launch)
- [ ] Fix Teacher `src/lib/supabase.ts` — replace hardcoded creds bằng `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Fix Admin `src/integrations/supabase/client.ts` — same.
- [ ] Add `.env` vào `.gitignore` của Student repo.
- [ ] Rotate Supabase anon key (Supabase Dashboard → Settings → API → "Reset").

### Week 2-3 (post-launch stabilize)
- [ ] Extract Student's QueryClient config thành file riêng `src/lib/queryClient.ts` (hoặc `src/shared/lib/queryClient.ts`).
- [ ] Sync sang Teacher + Admin (copy file + update imports ở App.tsx).
- [ ] Copy Admin's `ErrorBoundary.tsx` sang Teacher (current Teacher version thiếu chunk-error recovery).

### Month 2 (consolidation)
- [ ] Resolve `programColors.ts` drift giữa Student + Admin — decide canonical, sync.
- [ ] Extract Supabase client thành `src/shared/integrations/supabase/client.ts` nếu có thể, hoặc keep separate per-repo nhưng với cùng pattern (env var driven).
- [ ] Commit `scripts/check-shared-drift.sh` + `scripts/sync-shared.sh` vào 1 repo (Student recommended).

### Quarter 2 (optional, nếu cần)
- [ ] Reconsider npm package (chỉ khi: có 4+ repos, có 2+ devs, codebase ổn định).

---

## What NOT to do

1. **Đừng tạo shared repo rồi git submodule** — Lovable không handle submodule, sẽ break sync.
2. **Đừng monorepo hóa** — mỗi Lovable project phải tự có repo.
3. **Đừng tự động sync qua GitHub Actions cross-repo** — complex, dễ race condition, user không debug được.
4. **Đừng keep 3 bản khác nhau và "fix khi thấy"** — đó là hiện trạng đang gây drift.
5. **Đừng publish npm private package cho 3 repos** — maintenance overhead > lợi ích với scale hiện tại (solo dev, 100 users).

---

## FAQ

**Q: Tôi edit file shared ở Lovable canonical repo xong, phải làm gì để sync?**
A: Sync qua chat với Lovable ở 2 repo non-canonical như mô tả "Sync workflow" Bước 3. Hoặc nếu bạn thoải mái CLI: `bash sync-shared.sh <file>`.

**Q: Lovable autosync `main` giữa GitHub ↔ Lovable — có ảnh hưởng gì không?**
A: Không. Canonical-source pattern chỉ quyết định "file nào được edit ở đâu" — Lovable sync không biết gì về pattern này. Khi bạn sửa ở canonical repo qua Lovable, nó push về GitHub `main`, vẫn là của canonical repo. Rule chỉ là: đừng sửa shared file ở non-canonical repo.

**Q: Nếu tôi lỡ sửa shared file ở non-canonical repo?**
A: Chạy `check-shared-drift.sh` → sẽ flag. Copy lại từ canonical, hoặc upgrade canonical nếu thay đổi là improvement.

**Q: types.ts có thể auto-sync không?**
A: Có, qua GitHub Actions trigger khi Student repo push migration mới. Nhưng complex — không recommend cho đến khi có dev. Thay vào đó: mỗi lần Student apply migration, user mở 2 Lovable tabs khác (Teacher + Admin), paste types.ts mới.

**Q: Có thể dùng Supabase `supabase_migrations` schema làm ground truth thay file?**
A: Đó là ý tưởng lâu dài tốt. Hiện tại migration files chỉ là backup + onboarding aid. DB vẫn là source of truth.
