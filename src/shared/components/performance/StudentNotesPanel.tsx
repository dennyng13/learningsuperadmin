/**
 * StudentNotesPanel — long-term notes that follow the student across classes.
 * Visible to: admin (all), teacher (own + students in their classes), student (only is_public).
 */
import { useState } from "react";
import { useStudentNotes, useUpsertStudentNote, useDeleteStudentNote, NOTE_CATEGORY_LABELS, type NoteCategory, type StudentNote } from "@shared/hooks/usePerformance";
import { useAuth } from "@shared/hooks/useAuth";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Textarea } from "@shared/components/ui/textarea";
import { Input } from "@shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Switch } from "@shared/components/ui/switch";
import { Label } from "@shared/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/components/ui/dialog";
import { Loader2, Plus, Pin, Eye, EyeOff, Pencil, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { toast } from "sonner";

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  general: "bg-muted text-muted-foreground",
  academic: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  behavior: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  parent_meeting: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

interface Props {
  studentId: string;
  /** "student" view shows only public notes & no edit controls */
  mode?: "staff" | "student";
}

export default function StudentNotesPanel({ studentId, mode = "staff" }: Props) {
  const { isAdmin, isSuperAdmin, isTeacher, user } = useAuth();
  const canEdit = mode === "staff" && (isAdmin || isSuperAdmin || isTeacher);
  const role: StudentNote["author_role"] = isSuperAdmin ? "super_admin" : isAdmin ? "admin" : "teacher";

  const { data: notes, isLoading } = useStudentNotes(studentId, { onlyPublic: mode === "student" });
  const upsert = useUpsertStudentNote();
  const del = useDeleteStudentNote();

  const [editing, setEditing] = useState<Partial<StudentNote> | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ student_id: studentId, body: "", category: "general", is_public: false, pinned: false });
    setOpen(true);
  };
  const openEdit = (n: StudentNote) => {
    setEditing(n);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.body?.trim()) {
      toast.error("Vui lòng nhập nội dung ghi chú");
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editing.id,
        student_id: studentId,
        title: editing.title || null,
        body: editing.body!,
        category: (editing.category as NoteCategory) || "general",
        is_public: editing.is_public ?? false,
        pinned: editing.pinned ?? false,
        author_role: role,
      });
      toast.success(editing.id ? "Đã cập nhật ghi chú" : "Đã tạo ghi chú");
      setOpen(false);
    } catch (e: any) {
      toast.error("Không lưu được: " + e.message);
    }
  };

  const handleDelete = async (n: StudentNote) => {
    if (!confirm("Xoá ghi chú này?")) return;
    try {
      await del.mutateAsync({ id: n.id, student_id: studentId });
      toast.success("Đã xoá");
    } catch (e: any) {
      toast.error("Không xoá được: " + e.message);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            {mode === "student" ? "Ghi chú từ giáo viên" : "Ghi chú học viên"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {mode === "student"
              ? "Chỉ hiển thị các ghi chú giáo viên/QTV chia sẻ với bạn."
              : "Ghi chú dài hạn theo học viên, đi suốt qua các lớp."}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Thêm ghi chú
          </Button>
        )}
      </div>

      {(!notes || notes.length === 0) ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Chưa có ghi chú nào.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id} className={cn(n.pinned && "border-primary/50 bg-primary/5")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {n.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                    {n.title && <span className="font-bold text-sm">{n.title}</span>}
                    <Badge variant="outline" className={cn("text-[10px] border-0", CATEGORY_COLORS[n.category])}>
                      {NOTE_CATEGORY_LABELS[n.category]}
                    </Badge>
                    {mode === "staff" && (
                      <Badge variant="outline" className="text-[10px]">
                        {n.is_public ? <><Eye className="h-3 w-3 mr-1" />Công khai</> : <><EyeOff className="h-3 w-3 mr-1" />Riêng tư</>}
                      </Badge>
                    )}
                  </div>
                  {canEdit && (n.author_id === user?.id || isAdmin || isSuperAdmin) && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(n)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(n)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(n.created_at).toLocaleString("vi-VN")} · vai trò: {n.author_role}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa ghi chú" : "Ghi chú mới"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Phân loại</Label>
                  <Select
                    value={editing.category as string}
                    onValueChange={(v) => setEditing({ ...editing, category: v as NoteCategory })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(NOTE_CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tiêu đề (tuỳ chọn)</Label>
                  <Input
                    value={editing.title || ""}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Nội dung</Label>
                <Textarea
                  rows={5}
                  value={editing.body || ""}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is-public"
                    checked={editing.is_public ?? false}
                    onCheckedChange={(c) => setEditing({ ...editing, is_public: c })}
                  />
                  <Label htmlFor="is-public" className="text-xs">Học viên xem được</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="pinned"
                    checked={editing.pinned ?? false}
                    onCheckedChange={(c) => setEditing({ ...editing, pinned: c })}
                  />
                  <Label htmlFor="pinned" className="text-xs">Ghim lên đầu</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
