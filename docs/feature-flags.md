# Feature Flags — Setup & Integration

Runtime toggle cho **IELTS Practice** & **Teacher's Hub**. Admin bật/tắt tính năng ở `/feature-flags`, 2 app kia nhận update **tức thì** qua Supabase Realtime.

## 1. Chạy migration (1 lần, trên Supabase SQL editor)

Paste toàn bộ SQL dưới vào **Supabase Dashboard → SQL Editor → Run**:

```sql
-- Enum app_key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_flag_app') THEN
    CREATE TYPE public.feature_flag_app AS ENUM ('ielts', 'teacher', 'shared');
  END IF;
END$$;

-- Bảng flag chính
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,
  app_key      public.feature_flag_app NOT NULL DEFAULT 'shared',
  label        text NOT NULL,
  description  text,
  enabled      boolean NOT NULL DEFAULT false,
  rollout_pct  int NOT NULL DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_feature_flags_app ON public.feature_flags(app_key);

-- Override theo user
CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id      uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled      boolean NOT NULL,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (flag_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ffo_user ON public.feature_flag_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_ffo_flag ON public.feature_flag_overrides(flag_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_feature_flags_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END$$;
DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_feature_flags_updated_at();

-- RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_read_all" ON public.feature_flags;
CREATE POLICY "feature_flags_read_all" ON public.feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS "feature_flags_admin_write" ON public.feature_flags;
CREATE POLICY "feature_flags_admin_write" ON public.feature_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "ffo_read_own" ON public.feature_flag_overrides;
CREATE POLICY "ffo_read_own" ON public.feature_flag_overrides FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "ffo_admin_write" ON public.feature_flag_overrides;
CREATE POLICY "ffo_admin_write" ON public.feature_flag_overrides FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='feature_flags') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='feature_flag_overrides') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flag_overrides;
  END IF;
END$$;

-- Seed vài flag mẫu
INSERT INTO public.feature_flags (key, app_key, label, description, enabled) VALUES
  ('ai_grading_v2',    'ielts',   'AI Grading v2',       'Chấm writing/speaking bằng model mới', false),
  ('new_speaking_ui',  'ielts',   'Speaking UI mới',     'Giao diện phòng thu mới với waveform', false),
  ('teacher_ai_notes', 'teacher', 'AI Notes cho GV',     'Gợi ý nhận xét bằng AI',                false),
  ('realtime_chat',    'shared',  'Chat realtime',       'Chat giữa GV và học viên',             false)
ON CONFLICT (key) DO NOTHING;
```

## 2. Tích hợp vào IELTS Practice / Teacher's Hub

Copy file `src/shared/hooks/useFeatureFlag.ts` sang 2 project kia (đã cùng Supabase client).

### Dùng trong component:

```tsx
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

function SpeakingRoom() {
  const newUi = useFeatureFlag("new_speaking_ui");
  return newUi ? <SpeakingRoomV2 /> : <SpeakingRoomV1 />;
}
```

Flag thay đổi ở admin → component re-render ngay (không reload). Logic:
1. Có override cho user hiện tại → dùng override
2. Không có override → dùng `flag.enabled` global
3. `rollout_pct < 100` → hash(userId + key) % 100 để quyết định

## 3. Quản lý ở admin

- `/feature-flags` — CRUD flag, filter theo app, toggle enabled, chỉnh rollout %.
- Click 1 flag → xem + add/remove user overrides.
