# Tích hợp Max Quotes vào Student Portal

Hướng dẫn copy-paste để Student Portal (và Teacher's Hub) hiển thị quote
từ bảng `max_quotes` — đồng bộ realtime khi Admin sửa.

## ⚠️ Yêu cầu trước khi bắt đầu

1. Project Student Portal phải **dùng chung Lovable Cloud** với project Admin
   (cùng `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`).
   - Kiểm tra: mở `src/integrations/supabase/client.ts` ở Student Portal,
     so sánh `SUPABASE_URL` với project Admin → phải giống.
   - Nếu khác → 2 project đang dùng 2 backend riêng, hook sẽ không thấy quotes.
2. Bảng `max_quotes` đã được tạo (file `docs/max-quotes-migration.md` ở Admin).
3. Student Portal đã có `@tanstack/react-query` (mặc định Lovable đã cài).

---

## Bước 1 — Tạo hook `useMaxQuote`

**File mới**: `src/hooks/useMaxQuote.ts` (hoặc `src/shared/hooks/...` tuỳ cấu trúc)

```ts
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
 * - Cache 60s, dùng React Query → nhiều component share 1 request.
 * - Subscribe realtime → admin sửa là portal cập nhật ngay (không cần F5).
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

  // Realtime: invalidate mọi cache max_quotes khi DB thay đổi.
  useEffect(() => {
    const channel = supabase
      .channel("max_quotes_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "max_quotes" },
        () => {
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Weighted random pick — tính lại khi data đổi.
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

  // Cố định 1 quote sau khi pick — tránh component re-render đổi quote liên tục.
  const [stable, setStable] = useState<string | null>(picked);
  useEffect(() => {
    if (picked) setStable(picked);
  }, [picked]);

  return stable;
}

/**
 * Variant trả về cả mảng để bạn tự chọn (vd: rotate quote mỗi 5s trong loading).
 */
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
      .channel("max_quotes_sync_list")
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

## Bước 2 — Gắn vào các vị trí trong Student Portal

### 2.1 Loading screen — thay messages hardcode cũ

Mở `LoadingSpinner` (thường ở `src/components/ui/loading-spinner.tsx` hoặc tương tự):

```tsx
import { useMaxQuote } from "@/hooks/useMaxQuote";

export function LoadingSpinner() {
  const quote = useMaxQuote("loading");
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">
        {quote ?? "Đang tải..."}
      </p>
    </div>
  );
}
```

### 2.2 Dashboard hero / banner — câu motivation đầu trang

```tsx
import { useMaxQuote } from "@/hooks/useMaxQuote";

export function DashboardHero() {
  const quote = useMaxQuote("motivation");
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6">
      <p className="font-display text-lg italic">"{quote ?? "Chào mừng quay lại!"}"</p>
      <p className="text-xs text-muted-foreground mt-1">— Max</p>
    </div>
  );
}
```

### 2.3 Sau khi nộp bài (celebration)

```tsx
import { useMaxQuote } from "@/hooks/useMaxQuote";

export function SubmitSuccessCard() {
  const quote = useMaxQuote("celebration");
  return (
    <div className="text-center p-8">
      <div className="text-4xl mb-2">🎉</div>
      <p className="font-display text-xl">{quote ?? "Hoàn thành!"}</p>
    </div>
  );
}
```

### 2.4 Empty state

```tsx
const quote = useMaxQuote("empty");
<EmptyState description={quote ?? "Chưa có gì ở đây."} />
```

### 2.5 Trước/trong khi làm test (exam)

```tsx
const quote = useMaxQuote("exam");
<div className="text-sm italic">{quote ?? "Bình tĩnh và làm bài thật tốt!"}</div>
```

---

## Bước 3 — Verify đồng bộ realtime

1. Mở Student Portal trong tab 1, F12 → Network → lọc `max_quotes` → thấy 1 request select.
2. Tab 2: vào Admin `/brand-assets/quotes` → sửa 1 quote `loading` → bấm Lưu.
3. Quay lại tab 1, refresh component dùng quote (vd reload trang) → quote đã đổi.
   - Nếu component đang mount sẵn → realtime sẽ tự invalidate, quote refresh
     mà không cần F5.

### Nếu không thấy realtime hoạt động:
- Kiểm tra Console: có dòng `subscribed to channel max_quotes_sync` không.
- Kiểm tra DB đã `alter publication supabase_realtime add table public.max_quotes` (đã làm trong migration).
- Đảm bảo cùng Lovable Cloud project (`SUPABASE_URL` giống nhau).

---

## Tóm tắt flow đồng bộ

```
Admin /brand-assets/quotes
   │ (insert/update/delete)
   ▼
max_quotes table  ──► supabase_realtime publication
                                │
                                ▼
                  postgres_changes event
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  Student Portal         Teacher's Hub           (any portal)
  invalidateQueries      invalidateQueries
        │                       │
        ▼                       ▼
   refetch & re-pick      refetch & re-pick
```

Hook đã expose 2 variant:
- `useMaxQuote(category)` — pick 1 câu cố định cho session.
- `useMaxQuoteList(category)` — trả mảng để bạn tự rotate (vd loading screen
  đổi quote mỗi vài giây).

Copy hệt qua Teacher's Hub là chạy.