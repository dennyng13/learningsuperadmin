import { useState } from "react";
import { MessageSquare, Send, Loader2, X } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Badge } from "@shared/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@shared/components/ui/drawer";
import { useAuth } from "@shared/hooks/useAuth";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AskTeacherContext {
  contextType: "exam_question" | "exercise" | "general" | "study_plan_entry";
  contextId?: string;
  contextDetail?: Record<string, any>;
  contextLabel?: string; // e.g. "Reading Test 1 — Q12" or "Buổi 3 — Listening"
}

interface AskTeacherButtonProps {
  context?: AskTeacherContext;
}

export default function AskTeacherButton({ context }: AskTeacherButtonProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề câu hỏi");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("student_questions").insert({
        student_id: user.id,
        title: title.trim(),
        body: body.trim() || null,
        context_type: context?.contextType || "general",
        context_id: context?.contextId || null,
        context_detail: context?.contextDetail || {},
      });
      if (error) throw error;
      toast.success("Đã gửi câu hỏi cho giáo viên!");
      setTitle("");
      setBody("");
      setOpen(false);
    } catch (err: any) {
      toast.error("Gửi thất bại: " + (err.message || "Lỗi không xác định"));
    } finally {
      setSending(false);
    }
  };

  const formContent = (
    <div className="space-y-4 px-1">
      {context?.contextLabel && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
             {context.contextLabel}
          </Badge>
        </div>
      )}
      <div>
        <label className="text-sm font-semibold mb-1.5 block">Tiêu đề *</label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ví dụ: Không hiểu câu 12 passage 2"
          className="text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-semibold mb-1.5 block">Chi tiết (tuỳ chọn)</label>
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Mô tả thêm vấn đề bạn gặp..."
          className="text-sm min-h-[100px]"
        />
      </div>
      <Button onClick={handleSubmit} disabled={sending} className="w-full">
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        Gửi câu hỏi
      </Button>
    </div>
  );

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-40 bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="Hỏi giáo viên"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {/* Mobile: Drawer, Desktop: Dialog */}
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-4 pb-6">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-lg font-extrabold">Hỏi giáo viên</DrawerTitle>
            </DrawerHeader>
            {formContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold">Hỏi giáo viên</DialogTitle>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
