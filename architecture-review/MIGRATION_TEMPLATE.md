# Migration Template — Learning Plus

**Version**: 1.0
**Last updated**: 2026-04-21
**Source of truth**: Supabase DB. Migration files = historical record + onboarding aid.

---

## When to use template này

Áp dụng mỗi khi có **schema change** ảnh hưởng DB: thêm/sửa/xóa bảng, column, RPC, RLS policy, trigger, index, realtime publication, enum. Kể cả khi bạn apply trực tiếp qua Supabase SQL Editor — vẫn phải viết file migration để lưu lại.

## Canonical location

- **Schema migrations**: `dennyng13/ieltspractice-aa5eb78f/supabase/migrations/` (Student repo)
- **Đặc thù teacher_availability**: có thể viết ở Teacher repo `supabase-migrations/` nếu chỉ động tới 4 teacher tables — xem `SCHEMA-OWNERSHIP.md`. Mọi schema change khác phải ở Student repo.
- **Admin repo**: DO NOT add new migration files. Cái đã có là legacy (1 file `20260420120000_teacher_availability_rls.sql` duplicate với Teacher's bridge).

## Naming convention

```
YYYY-MM-DD-<verb>-<subject>.sql          (Teacher repo, hiện có)
YYYYMMDDhhmmss_<verb>_<subject>.sql      (Supabase CLI default, Student repo nên dùng)
```

Chọn 1 convention và stick với nó. Recommend: Supabase CLI default (timestamp numeric) để `supabase db push` order đúng.

---

## Migration file template

Copy template bên dưới, rename thành `<timestamp>_<verb>_<subject>.sql`, điền 8 sections:

```sql
-- ============================================================================
-- Migration: <concise description>
-- ============================================================================
-- Date:     YYYY-MM-DD
-- Author:   <github handle>
-- Related:  <issue/PR link, optional>
-- Scope:    <tables/rpcs/policies affected>
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PREREQUISITES (guard clauses — migration is IDEMPOTENT)
-- ----------------------------------------------------------------------------
-- Why: nếu migration đã apply rồi (manually qua SQL Editor), re-run không crash.
-- Pattern: IF NOT EXISTS, CREATE OR REPLACE, DROP ... IF EXISTS.

-- Example:
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='foo') THEN
--     CREATE TABLE public.foo (...);
--   END IF;
-- END $$;

-- ----------------------------------------------------------------------------
-- 2. SCHEMA CHANGES (tables, columns, enums, types)
-- ----------------------------------------------------------------------------

-- CREATE TABLE IF NOT EXISTS public.<name> ( ... );
-- ALTER TABLE public.<name> ADD COLUMN IF NOT EXISTS <col> <type>;
-- CREATE TYPE public.<enum> AS ENUM (...);   -- no "IF NOT EXISTS" in Postgres; wrap in DO block

-- ----------------------------------------------------------------------------
-- 3. INDEXES (performance)
-- ----------------------------------------------------------------------------
-- Always add index for: FK columns, WHERE clause hot paths, ORDER BY columns.
-- Use CONCURRENTLY cho production (non-blocking) — nhưng cần chạy ngoài transaction.

-- CREATE INDEX IF NOT EXISTS idx_<table>_<cols> ON public.<table>(<cols>);

-- ----------------------------------------------------------------------------
-- 4. CONSTRAINTS (UNIQUE, CHECK, FK)
-- ----------------------------------------------------------------------------

-- ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS ...;
-- Note: PG doesn't support IF NOT EXISTS on constraints natively — wrap in DO block.

-- ----------------------------------------------------------------------------
-- 5. RPC / FUNCTIONS (business logic in DB)
-- ----------------------------------------------------------------------------
-- Rules:
--   - SECURITY DEFINER functions PHẢI set search_path (tránh search_path injection)
--   - Mark STABLE / IMMUTABLE / VOLATILE chính xác
--   - REVOKE từ anon nếu không cần public access
--   - GRANT EXECUTE cho authenticated role nếu caller là user

-- CREATE OR REPLACE FUNCTION public.<name>(args) RETURNS <type>
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- STABLE
-- SET search_path = public
-- AS $$
-- BEGIN
--   -- body
-- END $$;

-- REVOKE ALL ON FUNCTION public.<name>(args) FROM anon;
-- GRANT EXECUTE ON FUNCTION public.<name>(args) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. RLS POLICIES
-- ----------------------------------------------------------------------------
-- Rules:
--   - Enable RLS trên mọi bảng public: ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--   - Drop + recreate pattern cho idempotent:
--       DROP POLICY IF EXISTS <name> ON public.<table>;
--       CREATE POLICY <name> ON ... USING (...);
--   - Dùng canonical helpers: public.is_admin_user(), public.current_teacher_id()
--   - Split policy theo operation (SELECT/INSERT/UPDATE/DELETE)

-- ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "<name>" ON public.<table>;
-- CREATE POLICY "<name>"
--   ON public.<table>
--   FOR <SELECT|INSERT|UPDATE|DELETE|ALL>
--   TO <authenticated|anon|public>
--   USING (<condition>)           -- for SELECT/UPDATE/DELETE
--   WITH CHECK (<condition>);     -- for INSERT/UPDATE

-- ----------------------------------------------------------------------------
-- 7. REALTIME PUBLICATION (nếu frontend cần subscribe)
-- ----------------------------------------------------------------------------
-- Cần wrap trong DO block vì ALTER PUBLICATION không có IF NOT EXISTS:

-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_publication_tables
--     WHERE pubname = 'supabase_realtime' AND tablename = '<table>'
--   ) THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE public.<table>;
--   END IF;
-- END $$;

-- ----------------------------------------------------------------------------
-- 8. SEED / DATA MIGRATION (optional)
-- ----------------------------------------------------------------------------
-- Nếu cần backfill:
-- UPDATE public.<table> SET <col> = <default> WHERE <col> IS NULL;

-- ============================================================================
-- ROLLBACK NOTES (không phải migration file chính thức, chỉ note)
-- ============================================================================
-- Để rollback migration này, chạy:
--   DROP TABLE IF EXISTS public.<name>;
--   DROP FUNCTION IF EXISTS public.<name>(args);
--   DROP POLICY IF EXISTS "<name>" ON public.<table>;
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.<table>;
-- ============================================================================
```

---

## Deployment workflow

### Step 1 — Write migration file locally

Trong Lovable hoặc local: tạo file theo template trên tại `supabase/migrations/` (Student repo).

### Step 2 — Dry-run bằng SQL Editor

Copy-paste toàn bộ SQL vào Supabase Dashboard → SQL Editor → **không click Run**, click **Format** để check syntax. Đọc lại policy conditions.

### Step 3 — Apply to DEV project (nếu có)

Nếu chưa tách DEV/PROD: skip. Nếu có: apply qua `supabase db push --linked` hoặc manual paste SQL Editor.

### Step 4 — Smoke test

Checklist:
- [ ] Query bảng mới: `SELECT * FROM public.<table> LIMIT 1;`
- [ ] Test RLS: login as student/teacher/admin, try SELECT/INSERT — đúng permission?
- [ ] Realtime: subscribe từ client browser, insert row → client nhận event?
- [ ] Rollback test (trên DEV): chạy rollback SQL, verify bảng/policy bị xóa.

### Step 5 — Apply to PROD

Supabase Dashboard → SQL Editor → paste → **Run**.

### Step 6 — Commit + sync

```bash
git add supabase/migrations/<file>.sql
git commit -m "feat(db): <subject>"
git push origin main    # Lovable sẽ sync từ main
```

### Step 7 — Regenerate types (nếu schema change)

Nếu thay đổi table/column mà frontend query:

```bash
# From Student repo
supabase gen types typescript --project-id jcavqutyfvalaugneash > src/integrations/supabase/types.ts

# Sync types.ts sang Teacher + Admin:
# - Teacher: src/integrations/supabase/types.ts
# - Admin:   src/integrations/supabase/types.ts
# (các bảng teacher-owned có trong cả 3 file; Student's types.ts là superset)
```

Xem `SHARED_CODE_SETUP.md` về cách sync types.ts cross-repo.

---

## Anti-patterns — đừng làm

1. **Manual change via SQL Editor without migration file**
   → DB drifts với git history. Sau 6 tháng không ai biết schema thật.

2. **RPC không set `search_path`**
   → Search path injection. Hacker CREATE schema + shadow function → SECURITY DEFINER chạy code của attacker.

3. **Policy không drop-then-create**
   → Re-apply migration → `CREATE POLICY` fails với "already exists" → migration stops mid-way.

4. **Realtime publication không idempotent**
   → Re-apply migration → `ALTER PUBLICATION ... ADD TABLE` crash.

5. **RLS enabled nhưng không có policy**
   → DEFAULT DENY — mọi query fail. Tệ hơn no RLS (silent deny thay vì visible error).

6. **`DROP COLUMN` không check usage**
   → Breaks frontend tại chỗ. Luôn grep codebase trước: `grep -r "column_name" src/`

7. **Xóa migration file cũ**
   → Khác team mate clone repo sẽ không reproduce DB. Chỉ add, không delete migration files.

---

## Reference: canonical helper functions (đã tồn tại)

Khi viết policy, dùng các helpers sau thay vì inline logic:

```sql
-- Check admin/super_admin role
SELECT public.is_admin_user();      -- returns boolean

-- Get teacher_id của user hiện tại (NULL nếu không phải teacher)
SELECT public.current_teacher_id(); -- returns uuid

-- Alias backward compat (equivalent to is_admin_user)
SELECT public.is_admin_or_super();
```

Tất cả các helper trên:
- `SECURITY DEFINER`, `STABLE`, `set search_path = public`
- Defined trong migration `2026-04-20-bootstrap-teacher-hub.sql` + `2026-04-20-alias-is-admin-functions.sql`

---

## Quick reference: common patterns

### Add a new table with RLS + realtime

```sql
CREATE TABLE IF NOT EXISTS public.my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_my_table_user_id ON public.my_table(user_id);

ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own my_table" ON public.my_table;
CREATE POLICY "users read own my_table"
  ON public.my_table FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "users insert own my_table" ON public.my_table;
CREATE POLICY "users insert own my_table"
  ON public.my_table FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'my_table'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.my_table;
  END IF;
END $$;
```

### Add a SECURITY DEFINER RPC

```sql
CREATE OR REPLACE FUNCTION public.do_thing(p_arg uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- caller must be admin
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin required';
  END IF;

  -- business logic
  UPDATE public.some_table SET ... WHERE id = p_arg;
END $$;

REVOKE ALL ON FUNCTION public.do_thing(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.do_thing(uuid) TO authenticated;
```

---

**Questions?** Xem `ARCHITECTURE_REVIEW.md` section 2.3 "Migration protocol" và `SCHEMA-OWNERSHIP.md` (Teacher repo).
