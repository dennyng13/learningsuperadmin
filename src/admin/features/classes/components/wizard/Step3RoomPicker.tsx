import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  MapPin, Building2, Wifi, Layers, AlertTriangle, CheckCircle2, Loader2, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Label } from "@shared/components/ui/label";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  useRooms, checkRoomConflictBatch,
  type Room, type RoomConflictBatchResult,
} from "@shared/hooks/useRooms";
import { cn } from "@shared/lib/utils";
import type { DraftSession, WizardClassInfo, WizardSlot } from "./wizardTypes";

/* Step3RoomPicker — Phase F1 wizard step. Auto-suggests rooms by:
   1. Mode match (onsite/online/hybrid)
   2. Capacity ≥ max_students (if set)
   3. Availability (batch conflict check via admin_check_room_conflict_batch)

   Sort: 0-conflict rooms first, then by capacity asc (tighter fit). User can
   skip ("— Không gán —") to fall back to legacy free-text room flow. Force
   confirm AlertDialog when user picks a room with conflicts. */

interface Props {
  value: WizardClassInfo;
  onChange: (next: WizardClassInfo) => void;
  slot: WizardSlot;
  sessions: DraftSession[];
  errors: Record<string, string>;
}

const MODE_META: Record<Room["mode"], { label: string; icon: typeof Building2; cls: string }> = {
  onsite: { label: "Onsite", icon: Building2, cls: "border-sky-500/30 text-sky-700 dark:text-sky-400" },
  online: { label: "Online", icon: Wifi, cls: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
  hybrid: { label: "Hybrid", icon: Layers, cls: "border-violet-500/30 text-violet-700 dark:text-violet-400" },
};

/** Returns true if a room of `roomMode` can host a class with `slotMode`. */
function modeCompatible(roomMode: Room["mode"], slotMode: string | null): boolean {
  if (!slotMode) return true;
  if (slotMode === "onsite") return roomMode === "onsite" || roomMode === "hybrid";
  if (slotMode === "online") return roomMode === "online" || roomMode === "hybrid";
  if (slotMode === "hybrid") return roomMode === "hybrid";
  return true;
}

const WD_LABEL: Record<number, string> = { 0: "CN", 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };

export default function Step3RoomPicker({ value, onChange, slot, sessions }: Props) {
  // Source of truth = slot.mode (Step 2). Step 3 read-only — không override
  // để tránh divergence giữa filter rooms và session mode persist.
  const effectiveMode = slot.mode ?? "onsite";
  const { data: allRooms = [], isLoading } = useRooms({ includeArchived: false });

  // Active sessions (not cancelled) for batch conflict check.
  const activeSessions = useMemo(
    () => sessions.filter((s) => !s.cancelled),
    [sessions],
  );
  const sessionsForCheck = useMemo(
    () => activeSessions.map((s) => ({
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
    })),
    [activeSessions],
  );
  const sessionsHash = useMemo(
    () => sessionsForCheck.map((s) => `${s.session_date}|${s.start_time}|${s.end_time}`).join(","),
    [sessionsForCheck],
  );

  // Filter rooms by mode + capacity (client-side).
  const candidateRooms = useMemo(() => {
    const minCap = value.max_students ?? 0;
    return allRooms.filter((r) => {
      if (!modeCompatible(r.mode, effectiveMode)) return false;
      if (minCap > 0 && r.capacity < minCap) return false;
      return true;
    });
  }, [allRooms, effectiveMode, value.max_students]);

  // Per-room batch conflict check (one query per candidate room).
  const conflictQueries = useQueries({
    queries: candidateRooms.map((room) => ({
      queryKey: ["wizard-room-conflicts", room.id, sessionsHash],
      enabled: sessionsForCheck.length > 0,
      queryFn: async (): Promise<RoomConflictBatchResult> =>
        checkRoomConflictBatch({ room_id: room.id, sessions: sessionsForCheck }),
      staleTime: 30_000,
    })),
  });

  // Map roomId → conflict result for quick lookup.
  const conflictByRoom = useMemo(() => {
    const m = new Map<string, { count: number; result: RoomConflictBatchResult | null; loading: boolean }>();
    candidateRooms.forEach((room, idx) => {
      const q = conflictQueries[idx];
      const result = q?.data ?? null;
      const count = result
        ? result.conflicts.reduce((acc, e) => acc + e.conflicting_sessions.length, 0)
        : 0;
      m.set(room.id, { count, result, loading: !!q?.isFetching });
    });
    return m;
  }, [candidateRooms, conflictQueries]);

  // Sort: 0-conflict first, then capacity asc (tighter fit first).
  const sortedRooms = useMemo(() => {
    return [...candidateRooms].sort((a, b) => {
      const ca = conflictByRoom.get(a.id)?.count ?? 0;
      const cb = conflictByRoom.get(b.id)?.count ?? 0;
      if (ca !== cb) return ca - cb;
      return a.capacity - b.capacity;
    });
  }, [candidateRooms, conflictByRoom]);

  // Force confirm dialog state.
  const [forceTarget, setForceTarget] = useState<{ room: Room; result: RoomConflictBatchResult } | null>(null);

  const handlePickRoom = (room: Room) => {
    const info = conflictByRoom.get(room.id);
    if (info && info.count > 0 && info.result) {
      // Open force confirm dialog
      setForceTarget({ room, result: info.result });
      return;
    }
    onChange({ ...value, room_id: room.id, room_force_conflict: false });
  };

  const handleSkipRoom = () => {
    onChange({ ...value, room_id: null, room_force_conflict: false });
  };

  const handleConfirmForce = () => {
    if (!forceTarget) return;
    onChange({ ...value, room_id: forceTarget.room.id, room_force_conflict: true });
    setForceTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-1.5 text-sm">
        <h3 className="font-semibold text-foreground inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Phòng học
        </h3>
        <p className="text-xs text-muted-foreground">
          Hệ thống gợi ý phòng phù hợp với:
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 ml-1">
          <li>• Sĩ số: <strong className="text-foreground">{value.max_students ?? "—"}</strong> học viên</li>
          <li>• Hình thức: <strong className="text-foreground">{effectiveMode}</strong></li>
          <li>
            • Lịch:{" "}
            <strong className="text-foreground">
              {slot.weekdays.length > 0
                ? slot.weekdays.map((wd) => WD_LABEL[wd]).join(", ")
                : "(chưa chọn thứ)"}
            </strong>{" "}
            {slot.start_time && slot.end_time && (
              <span>· {slot.start_time}–{slot.end_time}</span>
            )}
          </li>
          <li>• Tổng: <strong className="text-foreground">{activeSessions.length}</strong> buổi học</li>
        </ul>
      </div>

      {/* Mode display — read-only, single source of truth = slot.mode (Step 2) */}
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs">Hình thức:</Label>
        <Badge variant="outline" className="text-xs">{effectiveMode}</Badge>
        <span className="text-xs text-muted-foreground">
          (Đổi ở Step 2 Lịch &amp; Giáo viên)
        </span>
      </div>

      {/* Room list */}
      <div className="space-y-2">
        <Label className="text-xs">Phòng được đề xuất</Label>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : sortedRooms.length === 0 ? (
          <EmptyRooms />
        ) : (
          <ul className="rounded-xl border bg-card divide-y overflow-hidden">
            {sortedRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                selected={value.room_id === room.id}
                conflictInfo={conflictByRoom.get(room.id)}
                onPick={() => handlePickRoom(room)}
              />
            ))}
            <SkipRow selected={value.room_id === null} onPick={handleSkipRoom} />
          </ul>
        )}
      </div>

      {/* Force confirm dialog */}
      <AlertDialog open={!!forceTarget} onOpenChange={(o) => !o && setForceTarget(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Phòng "{forceTarget?.room.code}" có {forceTarget?.result.conflicts.reduce((acc, e) => acc + e.conflicting_sessions.length, 0)} buổi conflict
            </AlertDialogTitle>
            <AlertDialogDescription>
              Phòng đã được gán cho buổi học khác trùng giờ. Bạn vẫn muốn chọn phòng này?
              Buổi conflict cụ thể:
            </AlertDialogDescription>
          </AlertDialogHeader>
          {forceTarget && (
            <div className="rounded-md border bg-muted/30 p-2 max-h-48 overflow-y-auto space-y-1">
              {forceTarget.result.conflicts.flatMap((entry) =>
                entry.conflicting_sessions.map((c) => (
                  <div key={c.session_id} className="text-xs">
                    <span className="font-medium">{c.class_name}</span>
                    {c.class_code && <span className="text-muted-foreground"> · {c.class_code}</span>}
                    <span className="text-muted-foreground"> — {c.session_date} {c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}</span>
                  </div>
                )),
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmForce}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Vẫn chọn phòng này
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function RoomRow({
  room, selected, conflictInfo, onPick,
}: {
  room: Room;
  selected: boolean;
  conflictInfo: { count: number; loading: boolean } | undefined;
  onPick: () => void;
}) {
  const modeMeta = MODE_META[room.mode];
  const ModeIcon = modeMeta.icon;
  const conflictCount = conflictInfo?.count ?? 0;
  const loading = !!conflictInfo?.loading;

  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/40",
          selected && "bg-primary/5",
        )}
      >
        <div className={cn(
          "h-4 w-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30",
        )}>
          {selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{room.code}</span>
            <span className="text-xs text-muted-foreground truncate">{room.name}</span>
            <Badge variant="outline" className={cn("text-[10px] gap-1 ml-auto", modeMeta.cls)}>
              <ModeIcon className="h-3 w-3" /> {modeMeta.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Sĩ số: <strong className="text-foreground tabular-nums">{room.capacity}</strong></span>
            {room.address && <><span>·</span><span className="truncate">{room.address}</span></>}
          </div>
          {/* Conflict indicator */}
          {loading ? (
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Đang kiểm tra lịch…
            </div>
          ) : conflictCount === 0 ? (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Available toàn bộ lịch
            </div>
          ) : (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {conflictCount} buổi conflict — click để xem
            </div>
          )}
        </div>
      </button>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function SkipRow({ selected, onPick }: { selected: boolean; onPick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40 border-t border-dashed",
          selected && "bg-primary/5",
        )}
      >
        <div className={cn(
          "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30",
        )}>
          {selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">— Không gán phòng —</p>
          <p className="text-[11px] text-muted-foreground">
            Lớp dùng text "Phòng" ở Step 1 (legacy). Có thể gán phòng sau qua tab Cấu hình.
          </p>
        </div>
      </button>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function EmptyRooms() {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center space-y-2">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Không có phòng phù hợp</p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        Thử đổi hình thức mặc định, hoặc tạo phòng mới phù hợp với sĩ số + mode trước khi quay lại.
      </p>
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link to="/rooms" target="_blank">
          <ExternalLink className="h-3.5 w-3.5" /> Mở trang quản lý phòng
        </Link>
      </Button>
    </div>
  );
}
