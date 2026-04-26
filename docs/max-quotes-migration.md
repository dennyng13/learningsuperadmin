# Max Quotes — Migration SQL

Paste vào **Lovable Cloud → SQL Editor → Run** (idempotent, an toàn chạy nhiều lần):

```sql
-- Bảng max_quotes — câu motivation mascot Max hiển thị Student Portal
create table if not exists public.max_quotes (
  id          uuid primary key default gen_random_uuid(),
  text        text not null check (length(btrim(text)) > 0),
  author      text,
  category    text not null default 'motivation'
              check (category in ('motivation','study','exam','celebration','empty','loading')),
  language    text not null default 'vi' check (language in ('vi','en')),
  is_active   boolean not null default true,
  weight      int not null default 1 check (weight between 1 and 10),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

create index if not exists idx_max_quotes_active   on public.max_quotes(is_active);
create index if not exists idx_max_quotes_category on public.max_quotes(category);
create index if not exists idx_max_quotes_language on public.max_quotes(language);

-- Trigger updated_at
create or replace function public.touch_max_quotes_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end$$;

drop trigger if exists trg_max_quotes_updated_at on public.max_quotes;
create trigger trg_max_quotes_updated_at
  before update on public.max_quotes
  for each row execute function public.touch_max_quotes_updated_at();

-- RLS — đọc public, write admin/super_admin
alter table public.max_quotes enable row level security;

drop policy if exists "max_quotes_read_all" on public.max_quotes;
create policy "max_quotes_read_all" on public.max_quotes for select using (true);

drop policy if exists "max_quotes_admin_write" on public.max_quotes;
create policy "max_quotes_admin_write" on public.max_quotes for all
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

-- Realtime — Student Portal subscribe để cập nhật quote ngay khi admin sửa
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='max_quotes'
  ) then
    alter publication supabase_realtime add table public.max_quotes;
  end if;
end$$;

-- Seed sample (lấy từ loading-spinner cũ)
insert into public.max_quotes (text, author, category, language) values
  ('Đang tải nè, chờ xíu nha!',                'Max', 'loading',     'vi'),
  ('Max đang chạy lấy dữ liệu cho bạn...',     'Max', 'loading',     'vi'),
  ('Kiên nhẫn là chìa khóa thành công!',       'Max', 'loading',     'vi'),
  ('Đừng bỏ cuộc, sắp xong rồi!',              'Max', 'motivation',  'vi'),
  ('Mỗi ngày một bước, band cao không xa!',    'Max', 'study',       'vi'),
  ('Cố lên, Max tin bạn làm được!',            'Max', 'motivation',  'vi'),
  ('Bạn giỏi lắm, tiếp tục nha!',              'Max', 'celebration', 'vi'),
  ('Ôn bài mỗi ngày, IELTS sẽ okay!',          'Max', 'study',       'vi'),
  ('Bạn đã rất nỗ lực rồi đó!',                'Max', 'celebration', 'vi'),
  ('Max tự hào về bạn lắm!',                   'Max', 'celebration', 'vi'),
  ('Thành công đến từ sự kiên trì!',           'Max', 'motivation',  'vi'),
  ('Hít thở sâu, làm bài thật bình tĩnh nha!', 'Max', 'exam',        'vi'),
  ('Bắt đầu hành trình IELTS thôi!',           'Max', 'empty',       'vi')
on conflict do nothing;
```

## Sau khi apply

- Mở `/brand-assets/quotes` (cần role `super_admin`).
- Card link nằm ngay trong `/brand-assets`.
- Edge function `generate-max-quotes` đã sẵn sàng — dùng nút **Generate bằng AI** trong page.

## Tích hợp Student / Teacher Portal

Copy hook đơn giản này sang 2 portal kia:

```ts
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Cat = "motivation"|"study"|"exam"|"celebration"|"empty"|"loading";

export function useMaxQuote(category: Cat, lang: "vi"|"en" = "vi") {
  const [quote, setQuote] = useState<string | null>(null);
  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase
        .from("max_quotes")
        .select("text,weight")
        .eq("category", category)
        .eq("language", lang)
        .eq("is_active", true);
      if (ignore || !data?.length) return;
      // weighted random
      const total = data.reduce((s, q) => s + Math.max(1, q.weight ?? 1), 0);
      let r = Math.random() * total;
      for (const q of data) {
        r -= Math.max(1, q.weight ?? 1);
        if (r <= 0) { setQuote(q.text); break; }
      }
    })();
    return () => { ignore = true; };
  }, [category, lang]);
  return quote;
}
```

Dùng:
```tsx
const quote = useMaxQuote("loading");
return <p>{quote ?? "Đang tải..."}</p>;
```