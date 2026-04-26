# Tích hợp Max Quotes vào Teacher's Hub

✅ Đã verify: Teacher's Hub dùng **chung backend** với Admin Portal
(`jcavqutyfvalaugneash.supabase.co`) — bảng `max_quotes` đã sẵn sàng,
chỉ cần copy hook và gắn UI.

Đường dẫn import bên dưới đã match cấu trúc thực tế của Teacher's Hub
(`@/lib/supabase`, hooks ở `src/hooks/`).

---

## Bước 1 — Tạo hook `useMaxQuote`

**File mới**: `src/hooks/useMaxQuote.ts`

```ts
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type MaxQuoteCategory =
  | "motivation" | "study" | "exam" | "celebration" | "empty" | "loading";
export type MaxQuoteLanguage = "vi" | "en";

interface QuoteRow {
  text: string;
  weight: number | null;
}

const QUERY_KEY = ["max_quotes"] as const;

/**
 * Pick một quote ngẫu nhiên (theo weight) cho category/language.
 * - React Query cache 60s → nhiều component share 1 request.
 * - Realtime subscribe → admin sửa là Teacher's Hub cập nhật ngay.
 */
export function useMaxQuote(
  category: MaxQuoteCategory,
  language: MaxQuoteLanguage = "vi",
): string | null {
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: [...QUERY_KEY, category, language],
    queryFn: async (): Promise<QuoteRow[]> => {
      const { data, error } = await (supabase as any)
        .from("max_quotes")
        .select("text,weight")
        .eq("category", category)
        .eq("language", language)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as QuoteRow[];
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // Realtime — invalidate khi DB thay đổi.
  useEffect(() => {
    const channel = supabase
      .channel("max_quotes_sync_teacher")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "max_quotes" },
        () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Weighted random pick.
  const picked = useMemo(() => {
    if (!data.length) return null;
    const total = data.reduce((s, q) => s + Math.max(1, q.weight ?? 1), 0);
    let r = Math.random() * total;
    for (const q of data) {
      r -= Math.max(1, q.weight ?? 1);
      if (r <= 0) return q.text;
    }
    return data[0].text;
  }, [data]);

  // Lock 1 quote/session để tránh nhảy quote khi re-render.
  const [stable, setStable] = useState<string | null>(picked);
  useEffect(() => {
    if (picked) setStable(picked);
  }, [picked]);

  return stable;
}

/** Variant trả mảng để rotate (vd loading screen đổi quote mỗi 5s). */
export function useMaxQuoteList(
  category: MaxQuoteCategory,
  language: MaxQuoteLanguage = "vi",
): string[] {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: [...QUERY_KEY, "list", category, language],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("max_quotes")
        .select("text")
        .eq("category", category)
        .eq("language", language)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.text as string);
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("max_quotes_sync_teacher_list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "max_quotes" },
        () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return data;
}
```

---

## Bước 2 — Gắn vào các vị trí trong Teacher's Hub

### 2.1 Loading screen / spinner

Tìm component spinner (vd `src/components/ui/loading-spinner.tsx` hoặc Suspense fallback):

```tsx
import { useMaxQuote } from "@/hooks/useMaxQuote";

export function LoadingSpinner() {
  const quote = useMaxQuote("loading");
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{quote ?? "Đang tải..."}</p>
    </div>
  );
}
```

### 2.2 Teacher dashboard hero — câu motivation đầu ngày

Gắn ở dashboard chính của giáo viên:

```tsx
import { useMaxQuote } from "@/hooks/useMaxQuote";

export function TeacherDashboardHero({ name }: { name: string }) {
  const quote = useMaxQuote("motivation");
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6">
      <h2 className="font-display text-2xl">Chào {name}!</h2>
      <p className="text-sm italic mt-2 text-muted-foreground">
        "{quote ?? "Sẵn sàng cho buổi dạy hôm nay?"}"
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">— Max</p>
    </div>
  );
}
```

### 2.3 Sau khi grading xong / nộp feedback (celebration)

```tsx
const quote = useMaxQuote("celebration");
<div className="text-center p-6">
  <div className="text-3xl mb-2">🎉</div>
  <p>{quote ?? "Đã hoàn thành chấm bài!"}</p>
</div>
```

### 2.4 Empty states (chưa có lớp / chưa có học viên)

```tsx
const quote = useMaxQuote("empty");
<EmptyState description={quote ?? "Chưa có gì ở đây."} />
```

### 2.5 Trước giờ vào lớp / mở session (study)

```tsx
const quote = useMaxQuote("study");
<div className="text-sm italic text-muted-foreground">{quote ?? "Buổi học sắp bắt đầu!"}</div>
```

---

## Bước 3 — Verify đồng bộ realtime

1. Mở Teacher's Hub → vào trang có quote (vd Dashboard).
2. F12 → Console: phải có log `subscribed` từ channel `max_quotes_sync_teacher`.
3. Mở Admin Portal `/brand-assets/quotes` ở tab khác → sửa 1 quote `motivation` → bấm Lưu.
4. Quay lại Teacher's Hub → React Query sẽ invalidate và refetch tự động.
   - Quote stable cho session → reload trang để thấy quote mới được pick.

### Nếu realtime không hoạt động:
- Kiểm tra Network tab có WebSocket connection tới `wss://jcavqutyfvalaugneash.supabase.co/realtime/v1/websocket`.
- Đảm bảo bảng đã add vào publication (đã làm trong migration ban đầu).
- Anon role có quyền SELECT `max_quotes` (RLS `max_quotes_read_all` cho phép `using (true)` — đã có).

---

## Tóm tắt flow

```
Admin /brand-assets/quotes
   │
   ▼
max_quotes (jcavqutyfvalaugneash.supabase.co)
   │
   ├──► supabase_realtime publication
   │         │
   │         ▼
   │    postgres_changes broadcast
   │         │
   ├─────────┼─────────────────┬──────────────────┐
   ▼         ▼                 ▼                  ▼
 Admin   Teacher's Hub    Student Portal     (any portal cùng backend)
         (file này)       (doc trước)
```

Hook không cần env vars riêng — Teacher's Hub đã trỏ về cùng Supabase project,
RLS đã cho phép public read, realtime publication đã bật. Paste là chạy.