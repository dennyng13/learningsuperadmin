import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { toast } from "sonner";

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  exampleSentence: string | null;
  audioUrl: string | null;
  createdAt: string;
  mastered: boolean;
  nextReview: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  sourceType: string;
  sourceSetId: string | null;
}

/* ─── SM-2 Algorithm ─── */
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = complete blackout, 1 = wrong but remembered after seeing answer
// 2 = wrong, 3 = correct with difficulty, 4 = correct, 5 = perfect

export function sm2(card: Flashcard, quality: ReviewQuality) {
  let { easeFactor, repetitions, intervalDays } = card;

  if (quality >= 3) {
    // Correct
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions++;
  } else {
    // Incorrect – reset
    repetitions = 0;
    intervalDays = 1;
  }

  // Update ease factor (min 1.3)
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  const mastered = repetitions >= 5 && easeFactor >= 2.5;

  return { easeFactor, repetitions, intervalDays, nextReview: nextReview.toISOString(), mastered };
}

export function isDue(card: Flashcard): boolean {
  return new Date(card.nextReview) <= new Date();
}

export function useFlashcards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  const mapRow = (r: any): Flashcard => ({
    id: r.id,
    front: r.front,
    back: r.back,
    exampleSentence: r.example_sentence || null,
    audioUrl: r.audio_url || null,
    createdAt: r.created_at,
    mastered: r.mastered,
    nextReview: r.next_review,
    intervalDays: r.interval_days,
    easeFactor: Number(r.ease_factor),
    repetitions: r.repetitions,
    sourceType: r.source_type || "manual",
    sourceSetId: r.source_set_id || null,
  });

  // Fetch
  const fetchCards = useCallback(async () => {
    if (!user) { setCards([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) { console.error(error); toast.error("Lỗi tải flashcard"); }
    else setCards((data || []).map(mapRow));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  // Add
  const addCard = useCallback(async (front: string, back: string, extra?: { exampleSentence?: string; audioUrl?: string; sourceType?: string; sourceSetId?: string }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("flashcards")
      .insert({
        user_id: user.id,
        front,
        back,
        example_sentence: extra?.exampleSentence || null,
        audio_url: extra?.audioUrl || null,
        source_type: extra?.sourceType || "manual",
        source_set_id: extra?.sourceSetId || null,
      })
      .select()
      .single();
    if (error) { toast.error("Lỗi thêm flashcard"); return null; }
    const card = mapRow(data);
    setCards(prev => [...prev, card]);
    return card;
  }, [user]);

  // Add many
  const addMany = useCallback(async (items: { front: string; back: string; sourceType?: string; sourceSetId?: string }[]) => {
    if (!user || items.length === 0) return;
    const rows = items.map(i => ({
      user_id: user.id,
      front: i.front,
      back: i.back,
      source_type: i.sourceType || "manual",
      source_set_id: i.sourceSetId || null,
    }));
    const { data, error } = await supabase.from("flashcards").insert(rows).select();
    if (error) { toast.error("Lỗi import flashcard"); return; }
    setCards(prev => [...prev, ...(data || []).map(mapRow)]);
    toast.success(`Đã import ${data?.length || 0} flashcard`);
  }, [user]);

  // Update
  const updateCard = useCallback(async (id: string, fields: Partial<Pick<Flashcard, "front" | "back" | "exampleSentence" | "audioUrl">>) => {
    const update: any = {};
    if (fields.front !== undefined) update.front = fields.front;
    if (fields.back !== undefined) update.back = fields.back;
    if (fields.exampleSentence !== undefined) update.example_sentence = fields.exampleSentence;
    if (fields.audioUrl !== undefined) update.audio_url = fields.audioUrl;
    const { error } = await supabase.from("flashcards").update(update).eq("id", id);
    if (error) { toast.error("Lỗi cập nhật"); return; }
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  }, []);

  // Remove
  const removeCard = useCallback(async (id: string) => {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) { toast.error("Lỗi xóa flashcard"); return; }
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  // Remove all cards from a specific set
  const removeBySet = useCallback(async (setId: string) => {
    if (!user) return;
    const { error } = await supabase.from("flashcards").delete().eq("user_id", user.id).eq("source_set_id", setId);
    if (error) { toast.error("Lỗi xóa bộ flashcard"); return; }
    setCards(prev => prev.filter(c => c.sourceSetId !== setId));
    toast.success("Đã xóa bộ thẻ khỏi kho của bạn");
  }, [user]);

  // Review
  const reviewCard = useCallback(async (id: string, quality: ReviewQuality) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const result = sm2(card, quality);
    const { error } = await supabase.from("flashcards").update({
      ease_factor: result.easeFactor,
      repetitions: result.repetitions,
      interval_days: result.intervalDays,
      next_review: result.nextReview,
      mastered: result.mastered,
    }).eq("id", id);
    if (error) { toast.error("Lỗi cập nhật"); return; }
    setCards(prev => prev.map(c => c.id === id ? {
      ...c,
      easeFactor: result.easeFactor,
      repetitions: result.repetitions,
      intervalDays: result.intervalDays,
      nextReview: result.nextReview,
      mastered: result.mastered,
    } : c));
  }, [cards]);

  // Legacy toggle (keep for game/manage)
  const toggleMaster = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const newVal = !card.mastered;
    const { error } = await supabase.from("flashcards").update({ mastered: newVal }).eq("id", id);
    if (error) { toast.error("Lỗi cập nhật"); return; }
    setCards(prev => prev.map(c => c.id === id ? { ...c, mastered: newVal } : c));
  }, [cards]);

  return { cards, loading, addCard, addMany, updateCard, removeCard, removeBySet, toggleMaster, reviewCard };
}
