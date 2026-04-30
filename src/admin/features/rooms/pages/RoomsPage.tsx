import { useMemo, useState } from "react";
import {
  MapPin, Plus, Pencil, Archive, Search, Building2, Wifi, Layers, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { HeroBoard } from "@shared/components/ui/hero-board";
import { PopCard } from "@shared/components/ui/pop-card";
import { PopButton } from "@shared/components/ui/pop-button";
import { PopChip } from "@shared/components/ui/pop-chip";
import { StatusBadge } from "@shared/components/ui/status-badge";
import { IconButton } from "@shared/components/ui/icon-button";
import { EmptyMascot } from "@shared/components/ui/empty-mascot";
import {
  useRooms, useRoomMutations, type Room, type RoomArchiveResult,
} from "@shared/hooks/useRooms";
import RoomEditorDialog from "@admin/features/rooms/components/RoomEditorDialog";

/* /rooms — Admin list page for managing facility rooms (onsite, online,
   hybrid). CRUD wired via useRoomMutations + RoomEditorDialog (Step 3).
   Sprint 2 Day 4 sticker-pop refactor. */

const MODE_META: Record<Room["mode"], {
  label: string;
  icon: typeof Building2;
  tone: "sky" | "teal" | "violet";
}> = {
  onsite: { label: "Onsite", icon: Building2, tone: "sky" },
  online: { label: "Online", icon: Wifi,      tone: "teal" },
  hybrid: { label: "Hybrid", icon: Layers,    tone: "violet" },
};

const STATUS_META: Record<Room["status"], {
  label: string;
  status: "active" | "archived" | "warning";
}> = {
  active:            { label: "Hoạt động",   status: "active" },
  archived:          { label: "Đã lưu trữ",  status: "archived" },
  under_maintenance: { label: "Bảo trì",     status: "warning" },
};

type FilterMode = "all" | Room["mode"];
type FilterStatus = "active" | "archived" | "all";

export default function RoomsPage() {
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active");

  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Room | null>(null);
  const [archiveResult, setArchiveResult] = useState<RoomArchiveResult | null>(null);

  const { data: rooms, isLoading } = useRooms({ includeArchived: filterStatus !== "active" });
  const { archive: archiveMut } = useRoomMutations();

  const filtered = useMemo(() => {
    let arr = rooms ?? [];
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) =>
        r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
      );
    }
    if (filterMode !== "all") arr = arr.filter((r) => r.mode === filterMode);
    if (filterStatus === "archived") arr = arr.filter((r) => r.status === "archived");
    return arr;
  }, [rooms, query, filterMode, filterStatus]);

  const closeArchiveFlow = () => {
    setArchiveTarget(null);
    setArchiveResult(null);
  };

  const handleArchive = async (force: boolean) => {
    if (!archiveTarget) return;
    try {
      const result = await archiveMut.mutateAsync({ id: archiveTarget.id, force });
      if (result.success) {
        toast.success(force ? "Đã lưu trữ phòng (forced)" : "Đã lưu trữ phòng");
        closeArchiveFlow();
      } else if (result.reason === "has_future_sessions") {
        // Open force-confirm dialog with sessions_count info.
        setArchiveResult(result);
      } else {
        toast.error(result.message || "Không thể lưu trữ phòng");
        closeArchiveFlow();
      }
    } catch (e) {
      // onError of mutation already toasts; just close.
      void e;
      closeArchiveFlow();
    }
  };

  const totalActive = (rooms ?? []).filter((r) => r.status === "active").length;
  const totalCount = (rooms ?? []).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <HeroBoard
        tone="teal"
        title="Phòng học"
        subtitle={
          isLoading
            ? "Đang tải…"
            : `${totalActive} phòng đang hoạt động · ${totalCount} tổng`
        }
        action={
          <PopButton tone="white" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            <span>Tạo phòng</span>
          </PopButton>
        }
        illustration={<MapPin className="size-28 text-white/85 animate-bob" strokeWidth={1.5} />}
      />

      {/* Filter bar — sticker-style search + 2 selects */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-lp-body" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm code hoặc tên phòng…"
            className="w-full h-10 pl-9 pr-3 text-sm font-body bg-white border-[2px] border-lp-ink rounded-pop placeholder:text-lp-body/70 focus:outline-none focus:shadow-pop-xs transition-shadow"
          />
        </div>
        <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
          <SelectTrigger className="w-[150px] h-10 text-sm font-display font-bold bg-white border-[2px] border-lp-ink rounded-pop text-lp-ink">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[2px] border-lp-ink rounded-pop shadow-pop">
            <SelectItem value="all">Mọi hình thức</SelectItem>
            <SelectItem value="onsite">Onsite</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[160px] h-10 text-sm font-display font-bold bg-white border-[2px] border-lp-ink rounded-pop text-lp-ink">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[2px] border-lp-ink rounded-pop shadow-pop">
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="archived">Đã lưu trữ</SelectItem>
            <SelectItem value="all">Tất cả</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-pop-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <RoomsEmptyState
          hasRooms={(rooms ?? []).length > 0}
          searching={!!query.trim() || filterMode !== "all"}
          onCreate={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={() => setEditTarget(room)}
              onArchive={() => setArchiveTarget(room)}
            />
          ))}
        </div>
      )}

      <RoomEditorDialog
        open={createOpen || !!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditTarget(null);
          }
        }}
        room={editTarget}
      />

      {/* Archive confirm */}
      <AlertDialog
        open={!!archiveTarget && !archiveResult}
        onOpenChange={(o) => !o && closeArchiveFlow()}
      >
        <AlertDialogContent className="border-[2.5px] border-lp-ink rounded-pop-lg shadow-pop-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lp-ink">
              Lưu trữ phòng "{archiveTarget?.code}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lp-body">
              Phòng sẽ ẩn khỏi danh sách hoạt động. Có thể khôi phục bằng cách
              chuyển status về "Hoạt động".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMut.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleArchive(false)}
              disabled={archiveMut.isPending}
              className="bg-lp-coral text-white border-[2px] border-lp-ink hover:bg-lp-coral-deep"
            >
              {archiveMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Lưu trữ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force archive — opens when result.success=false + reason=has_future_sessions */}
      <AlertDialog
        open={!!archiveResult}
        onOpenChange={(o) => !o && closeArchiveFlow()}
      >
        <AlertDialogContent className="border-[2.5px] border-lp-ink rounded-pop-lg shadow-pop-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lp-ink">Phòng có buổi học tương lai</AlertDialogTitle>
            <AlertDialogDescription className="text-lp-body">
              {archiveResult?.message
                ?? `Phòng có ${archiveResult?.sessions_count ?? "?"} buổi học chưa kết thúc. Vẫn lưu trữ?`}
              <br />
              <span className="text-xs">Các buổi học sẽ giữ tham chiếu đến phòng đã lưu trữ.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMut.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleArchive(true)}
              disabled={archiveMut.isPending}
              className="bg-lp-coral text-white border-[2px] border-lp-ink hover:bg-lp-coral-deep"
            >
              {archiveMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Vẫn lưu trữ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function RoomCard({
  room, onEdit, onArchive,
}: {
  room: Room;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const modeMeta = MODE_META[room.mode];
  const statusMeta = STATUS_META[room.status];
  const ModeIcon = modeMeta.icon;
  const previewText = room.address || room.meeting_link;

  return (
    <PopCard tone="white" shadow="md" hover="lift" className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-extrabold text-base text-lp-ink truncate">{room.code}</h3>
          <p className="text-xs text-lp-body truncate">{room.name}</p>
        </div>
        <StatusBadge status={statusMeta.status} label={statusMeta.label} />
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <PopChip tone={modeMeta.tone}>
          <ModeIcon className="h-3 w-3" />
          {modeMeta.label}
        </PopChip>
        <span className="text-lp-body">·</span>
        <span className="text-lp-body font-body">
          Sĩ số: <strong className="text-lp-ink font-display tabular-nums">{room.capacity}</strong>
        </span>
      </div>

      {previewText && (
        <p className="text-[11px] text-lp-body truncate" title={previewText}>
          {previewText}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t-[2px] border-lp-ink/10">
        <IconButton tone="teal" size="sm" aria-label="Sửa phòng" onClick={onEdit}>
          <Pencil />
        </IconButton>
        {room.status !== "archived" && (
          <IconButton tone="coral" size="sm" aria-label="Lưu trữ phòng" onClick={onArchive}>
            <Archive />
          </IconButton>
        )}
      </div>
    </PopCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function RoomsEmptyState({
  hasRooms, searching, onCreate,
}: {
  hasRooms: boolean;
  searching: boolean;
  onCreate: () => void;
}) {
  const isFiltered = hasRooms && searching;
  return (
    <EmptyMascot
      icon={MapPin}
      title={isFiltered ? "Không có phòng phù hợp bộ lọc" : "Không có phòng học"}
      description={
        isFiltered
          ? "Thử bỏ filter hoặc tìm với từ khoá khác."
          : "Tạo phòng đầu tiên để gán cho lớp học."
      }
      action={
        !isFiltered ? (
          <PopButton tone="coral" size="sm" onClick={onCreate}>
            <Plus className="size-4" />
            <span>Tạo phòng đầu tiên</span>
          </PopButton>
        ) : undefined
      }
    />
  );
}
