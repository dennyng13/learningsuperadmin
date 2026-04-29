import { useMemo, useState } from "react";
import {
  MapPin, Plus, Pencil, Archive, Search, Building2, Wifi, Layers, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Card } from "@shared/components/ui/card";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { ListPageLayout } from "@shared/components/layouts/ListPageLayout";
import {
  useRooms, useRoomMutations, type Room, type RoomArchiveResult,
} from "@shared/hooks/useRooms";
import RoomEditorDialog from "@admin/features/rooms/components/RoomEditorDialog";
import { cn } from "@shared/lib/utils";

/* /rooms — Admin list page for managing facility rooms (onsite, online,
   hybrid). CRUD wired via useRoomMutations + RoomEditorDialog (Step 3).
   Route registration pending Step 4. */

const MODE_META: Record<Room["mode"], { label: string; icon: typeof Building2; cls: string }> = {
  onsite: {
    label: "Onsite",
    icon: Building2,
    cls: "border-sky-500/30 text-sky-700 dark:text-sky-400",
  },
  online: {
    label: "Online",
    icon: Wifi,
    cls: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  },
  hybrid: {
    label: "Hybrid",
    icon: Layers,
    cls: "border-violet-500/30 text-violet-700 dark:text-violet-400",
  },
};

const STATUS_META: Record<Room["status"], { label: string; cls: string }> = {
  active: {
    label: "Hoạt động",
    cls: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  },
  archived: {
    label: "Đã lưu trữ",
    cls: "border-muted-foreground/30 text-muted-foreground",
  },
  under_maintenance: {
    label: "Bảo trì",
    cls: "border-amber-500/30 text-amber-700 dark:text-amber-400",
  },
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

  const filterBar = (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm code hoặc tên phòng…"
          className="pl-8 h-9 text-sm"
        />
      </div>
      <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
        <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Mọi hình thức</SelectItem>
          <SelectItem value="onsite">Onsite</SelectItem>
          <SelectItem value="online">Online</SelectItem>
          <SelectItem value="hybrid">Hybrid</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
        <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Đang hoạt động</SelectItem>
          <SelectItem value="archived">Đã lưu trữ</SelectItem>
          <SelectItem value="all">Tất cả</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const headerActions = (
    <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
      <Plus className="h-4 w-4" />
      Tạo phòng
    </Button>
  );

  return (
    <ListPageLayout
      title="Phòng học"
      subtitle="Quản lý cơ sở vật chất + phòng online"
      icon={MapPin}
      actions={headerActions}
      filterBar={filterBar}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasRooms={(rooms ?? []).length > 0}
          searching={!!query.trim() || filterMode !== "all"}
          onCreate={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Lưu trữ phòng "{archiveTarget?.code}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Phòng sẽ ẩn khỏi danh sách hoạt động. Có thể khôi phục bằng cách
              chuyển status về "Hoạt động".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMut.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleArchive(false)}
              disabled={archiveMut.isPending}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Phòng có buổi học tương lai</AlertDialogTitle>
            <AlertDialogDescription>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiveMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Vẫn lưu trữ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageLayout>
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
    <Card className="p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-base truncate">{room.code}</h3>
          <p className="text-xs text-muted-foreground truncate">{room.name}</p>
        </div>
        <Badge variant="outline" className={cn("text-[10px] shrink-0", statusMeta.cls)}>
          {statusMeta.label}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <Badge variant="outline" className={cn("text-[10px] gap-1", modeMeta.cls)}>
          <ModeIcon className="h-3 w-3" />
          {modeMeta.label}
        </Badge>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Sĩ số: <strong className="text-foreground tabular-nums">{room.capacity}</strong></span>
      </div>

      {previewText && (
        <p className="text-[11px] text-muted-foreground truncate" title={previewText}>
          {previewText}
        </p>
      )}

      <div className="flex items-center gap-1 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-xs gap-1">
          <Pencil className="h-3 w-3" /> Sửa
        </Button>
        {room.status !== "archived" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <Archive className="h-3 w-3" /> Lưu trữ
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function EmptyState({
  hasRooms, searching, onCreate,
}: {
  hasRooms: boolean;
  searching: boolean;
  onCreate: () => void;
}) {
  const isFiltered = hasRooms && searching;
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center space-y-3">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <MapPin className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-display text-base font-semibold">
        {isFiltered ? "Không có phòng phù hợp bộ lọc" : "Không có phòng học"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {isFiltered
          ? "Thử bỏ filter hoặc tìm với từ khoá khác."
          : "Tạo phòng đầu tiên để gán cho lớp học."}
      </p>
      {!isFiltered && (
        <Button onClick={onCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Tạo phòng đầu tiên
        </Button>
      )}
    </div>
  );
}
