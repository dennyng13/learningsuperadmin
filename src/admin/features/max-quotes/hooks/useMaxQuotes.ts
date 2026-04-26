import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MaxQuote, MaxQuoteCategory, MaxQuoteLanguage } from "../types";

export const MAX_QUOTES_QUERY_KEY = ["max-quotes"] as const;

export type NewQuote = {
  text: string;
  author?: string | null;
  category: MaxQuoteCategory;
  language: MaxQuoteLanguage;
  is_active?: boolean;
  weight?: number;
};

/* ─────────── List ─────────── */
export function useMaxQuotes() {
  return useQuery({
    queryKey: MAX_QUOTES_QUERY_KEY,
    queryFn: async (): Promise<MaxQuote[]> => {
      const { data, error } = await (supabase as any)
        .from("max_quotes")
        .select("*")
        .order("category", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MaxQuote[];
    },
    staleTime: 30_000,
  });
}

/* ─────────── Create ─────────── */
export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewQuote) => {
      const { data, error } = await (supabase as any)
        .from("max_quotes")
        .insert({
          text: input.text.trim(),
          author: input.author?.trim() || null,
          category: input.category,
          language: input.language,
          is_active: input.is_active ?? true,
          weight: input.weight ?? 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MaxQuote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MAX_QUOTES_QUERY_KEY }),
  });
}

/* ─────────── Update ─────────── */
export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NewQuote> }) => {
      const { data, error } = await (supabase as any)
        .from("max_quotes")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MaxQuote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MAX_QUOTES_QUERY_KEY }),
  });
}

/* ─────────── Toggle active ─────────── */
export function useToggleQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("max_quotes")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MAX_QUOTES_QUERY_KEY }),
  });
}

/* ─────────── Delete ─────────── */
export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("max_quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MAX_QUOTES_QUERY_KEY }),
  });
}

/* ─────────── Bulk import (paste nhiều dòng) ─────────── */
export function useBulkImportQuotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lines: string[];
      category: MaxQuoteCategory;
      language: MaxQuoteLanguage;
      author?: string | null;
    }) => {
      const rows = input.lines
        .map((l) => l.trim())
        .filter(Boolean)
        .map((text) => ({
          text,
          author: input.author?.trim() || null,
          category: input.category,
          language: input.language,
          is_active: true,
          weight: 1,
        }));
      if (rows.length === 0) return { inserted: 0 };
      const { error, count } = await (supabase as any)
        .from("max_quotes")
        .insert(rows, { count: "exact" });
      if (error) throw error;
      return { inserted: count ?? rows.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MAX_QUOTES_QUERY_KEY }),
  });
}