import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@shared/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AIWritingFeedbackProps {
  writingResponse: string;
  taskPrompt?: string;
  onResult: (scores: {
    task_achievement: string;
    coherence_cohesion: string;
    lexical_resource: string;
    grammar_accuracy: string;
  }, comment: string) => void;
}

export default function AIWritingFeedback({ writingResponse, taskPrompt, onResult }: AIWritingFeedbackProps) {
  const { user, isSuperAdmin, isAdmin, isTeacher } = useAuth();
  const [loading, setLoading] = useState(false);

  // Check if user has AI grading permission
  const { data: canUseAI } = useQuery({
    queryKey: ["ai-grading-permission", user?.id],
    enabled: !!user,
    staleTime: 60000,
    queryFn: async () => {
      if (isSuperAdmin) return true;

      if (isAdmin) {
        const { data } = await supabase
          .from("user_settings")
          .select("ai_grading_enabled")
          .eq("user_id", user!.id)
          .maybeSingle();
        return (data as any)?.ai_grading_enabled === true;
      }

      if (isTeacher) {
        const { data } = await supabase
          .from("teachers")
          .select("can_use_ai_grading")
          .eq("linked_user_id", user!.id)
          .maybeSingle();
        return data?.can_use_ai_grading === true;
      }

      return false;
    },
  });

  if (!canUseAI) return null;

  const handleAIGrade = async () => {
    if (!writingResponse?.trim()) {
      toast.error("Không có bài viết để chấm");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("ai-grade-writing", {
        body: {
          writing_response: writingResponse,
          task_prompt: taskPrompt || undefined,
        },
      });

      if (response.error) throw new Error(response.error.message || "AI error");

      const result = response.data;
      if (!result || result.error) throw new Error(result?.error || "Invalid response");

      onResult(
        {
          task_achievement: String(Math.round(result.ta)),
          coherence_cohesion: String(Math.round(result.cc)),
          lexical_resource: String(Math.round(result.lr)),
          grammar_accuracy: String(Math.round(result.gra)),
        },
        result.feedback_vi || ""
      );

      toast.success("AI đã chấm xong! Bạn có thể xem lại và chỉnh sửa trước khi lưu.");
    } catch (err: any) {
      console.error("AI grading error:", err);
      toast.error(err.message || "Lỗi khi chấm bằng AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
      onClick={handleAIGrade}
      disabled={loading || !writingResponse?.trim()}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {loading ? "Đang chấm..." : "Chấm bằng AI"}
    </Button>
  );
}
