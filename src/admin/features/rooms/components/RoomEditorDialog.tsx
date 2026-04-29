import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  useRoomMutations, type Room, type RoomCreateInput,
} from "@shared/hooks/useRooms";

/**
 * RoomEditorDialog — Phase F1 Step 3. Create + edit room form.
 *
 * Conditional fields theo `mode`:
 *   - onsite → address required, meeting_link hidden
 *   - online → meeting_link required, address hidden
 *   - hybrid → cả 2 required
 *
 * Backend RPCs (admin_create_room/admin_update_room) enforce cùng validation
 * + cleanup (clear meeting_link khi mode='onsite', clear address khi
 * mode='online'). Frontend validate trước để UX feedback ngay.
 */

type RoomMode = Room["mode"];
type RoomStatus = Room["status"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null = create; else = edit */
  room: Room | null;
  onSaved?: () => void | Promise<void>;
}

export default function RoomEditorDialog({ open, onOpenChange, room, onSaved }: Props) {
  const isEdit = !!room;
  const { create, update } = useRoomMutations();

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<RoomMode>("onsite");
  const [capacity, setCapacity] = useState<number>(20);
  const [address, setAddress] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [status, setStatus] = useState<RoomStatus>("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset/preload when open changes or different room
  useEffect(() => {
    if (!open) return;
    if (room) {
      setCode(room.code);
      setName(room.name);
      setMode(room.mode);
      setCapacity(room.capacity);
      setAddress(room.address ?? "");
      setMeetingLink(room.meeting_link ?? "");
      setStatus(room.status);
      setNotes(room.notes ?? "");
    } else {
      setCode("");
      setName("");
      setMode("onsite");
      setCapacity(20);
      setAddress("");
      setMeetingLink("");
      setStatus("active");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room?.id]);

  const showAddress = mode === "onsite" || mode === "hybrid";
  const showMeetingLink = mode === "online" || mode === "hybrid";

  const isValid = useMemo(() => {
    if (!code.trim() || !name.trim()) return false;
    if (!Number.isFinite(capacity) || capacity < 1) return false;
    if ((mode === "onsite" || mode === "hybrid") && !address.trim()) return false;
    if ((mode === "online" || mode === "hybrid") && !meetingLink.trim()) return false;
    return true;
  }, [code, name, mode, capacity, address, meetingLink]);

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const input: RoomCreateInput = {
        code: code.trim(),
        name: name.trim(),
        mode,
        capacity,
        address: showAddress ? (address.trim() || null) : null,
        meeting_link: showMeetingLink ? (meetingLink.trim() || null) : null,
        status,
        notes: notes.trim() || null,
      };
      if (isEdit && room) {
        await update.mutateAsync({ id: room.id, ...input });
      } else {
        await create.mutateAsync(input);
      }
      await onSaved?.();
      onOpenChange(false);
    } catch (e) {
      // onError of mutation already toasts; keep dialog open so user can retry.
      void e;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Sửa phòng "${room?.code}"` : "Tạo phòng học"}
          </DialogTitle>
          <DialogDescription>
            Phòng học (onsite / online / hybrid) dùng để gán cho lớp + buổi học.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Mã phòng <span className="text-destructive">*</span>
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: P101 / ONLINE-1"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">
                Tên phòng <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Phòng tầng 1 / Zoom Pro"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Hình thức <span className="text-destructive">*</span>
              </Label>
              <Select value={mode} onValueChange={(v) => setMode(v as RoomMode)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">Onsite (cơ sở vật lý)</SelectItem>
                  <SelectItem value="online">Online (link meeting)</SelectItem>
                  <SelectItem value="hybrid">Hybrid (cả 2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                Sĩ số tối đa <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={Number.isFinite(capacity) ? capacity : ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setCapacity(Number.isFinite(n) ? n : 0);
                }}
                className="h-9 tabular-nums"
              />
            </div>
          </div>

          {showAddress && (
            <div>
              <Label className="text-xs">
                Địa chỉ <span className="text-destructive">*</span>
              </Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: 123 Nguyễn Trãi, P.Bến Thành, Q.1"
                className="h-9"
              />
            </div>
          )}

          {showMeetingLink && (
            <div>
              <Label className="text-xs">
                Link meeting <span className="text-destructive">*</span>
              </Label>
              <Input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/…"
                className="h-9"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Trạng thái</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RoomStatus)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="under_maintenance">Bảo trì</SelectItem>
                <SelectItem value="archived">Đã lưu trữ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Ghi chú</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thông tin thêm về phòng (tuỳ chọn)…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Lưu thay đổi" : "Tạo phòng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
