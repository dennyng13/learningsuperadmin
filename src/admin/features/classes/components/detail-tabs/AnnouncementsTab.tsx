import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pin, Trash2, Pencil, Megaphone, Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { formatDateTimeDDMMYYYY } from "@shared/utils/dateFormat";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Tab "Thông báo" — CRUD bảng `class_announcements`. Admin tự bookend trên
 * teacher_id = current user. Sort: pinned trước, rồi theo updated_at desc.
 */
export function AnnouncementsTab({ classId }: { classId: string }) {
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["class-announcements", classId],
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from("class_announcements")
        .select("id,title,content,pinned,created_at,updated_at")
        .eq("class_id", classId)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });

  const [editing, setEditing] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftPinned, setDraftPinned] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraftTitle("");
    setDraftContent("");
    setDraftPinned(false);
    setOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setDraftTitle(a.title);
    setDraftContent(a.content ?? "");
    setDraftPinned(a.pinned);
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const title = draftTitle.trim();
      if (title.length < 2) throw new Error("Tiêu đề tối thiểu 2 ký tự");
      const { data: userRes } = await supabase.auth.getUser();
      const teacherId = userRes.user?.id;
      if (!teacherId) throw new Error("Bạn cần đăng nhập lại.");

      if (editing) {
        const { error } = await supabase
          .from("class_announcements")
          .update({ title, content: draftContent, pinned: draftPinned })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("class_announcements")
          .insert({
            class_id: classId,
            title,
            content: draftContent,
            pinned: draftPinned,
            teacher_id: teacherId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Đã cập nhật thông báo" : "Đã tạo thông báo");
      qc.invalidateQueries({ queryKey: ["class-announcements", classId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xoá thông báo");
      qc.invalidateQueries({ queryKey: ["class-announcements", classId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePinMut = useMutation({
    mutationFn: async (a: Announcement) => {
      const { error } = await supabase
        .from("class_announcements")
        .update({ pinned: !a.pinned })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["class-announcements", classId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Thông báo lớp</h3>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tạo thông báo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center space-y-2">
          <Megaphone className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chưa có thông báo nào.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border bg-card p-3 sm:p-4 flex gap-3 items-start"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.pinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
                      <Pin className="h-2.5 w-2.5" /> Ghim
                    </span>
                  )}
                  <h4 className="font-semibold text-sm truncate">{a.title}</h4>
                </div>
                {a.content && (
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                    {a.content}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Cập nhật {formatDateTimeDDMMYYYY(a.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => togglePinMut.mutate(a)}
                  aria-label="Ghim/Bỏ ghim"
                >
                  <Pin className={`h-3.5 w-3.5 ${a.pinned ? "fill-current" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(a)}
                  aria-label="Sửa"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Xoá thông báo này?")) deleteMut.mutate(a.id);
                  }}
                  aria-label="Xoá"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa thông báo" : "Tạo thông báo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Tiêu đề"
              autoFocus
            />
            <Textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Nội dung thông báo…"
              rows={5}
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={draftPinned}
                onChange={(e) => setDraftPinned(e.target.checked)}
                className="rounded"
              />
              Ghim lên đầu danh sách
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Đang lưu…" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
