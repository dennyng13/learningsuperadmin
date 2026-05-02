/**
 * MyPlansPage — F3.5 UOP marketplace + my-plans (Phase F3 v2 §4.5).
 *
 * Tabs:
 * 1. "Plans của tôi" — own UOPs (created_by_user_id = auth.uid())
 *    Actions per row: Edit / Delete / Toggle public-private
 * 2. "Plans công khai" — public marketplace (is_public=true, exclude own)
 *    Actions per row: "Sao chép vào account của tôi"
 *
 * Dependencies (Sprint 1 shipped):
 * - PlanEditor scaffold (commit d1658a5)
 * - UOPCreateDialog (commit 8722d2a)
 * - useCreateUOP / useUpdateUOP / useDeleteUOP / useCopyPublicUOP / useMyUOPs / usePublicUOPs
 *
 * Schema (post F3.1 Lovable + types.ts copy 1496a50):
 * - is_user_owned, is_public, created_by_user_id (RLS scope)
 * - cefr_level (A1-C2 enum)
 * - tags (text[])
 * - total_hours, total_sessions, session_duration
 * - parent_uop_id (FK lineage cho copies)
 *
 * Filters: program (ielts/wre/customized), CEFR (A1-C2), search (name + tags)
 *
 * Route: /my-plans (NEW, registered AdminRoutes.tsx)
 *
 * Mockup ref: Admin Portal IA §3.1.2 (Study Plan management) +
 * Teacher Portal IA §1.7 (My Study Plans — admin reference for UX parity).
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle, Copy, Eye, EyeOff, Globe, Loader2, Pencil, Plus, Search, Sparkles, Tag, Trash2, Users, X,
} from "lucide-react";
import { Card } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@shared/components/ui/breadcrumb";
import { cn } from "@shared/lib/utils";
import { formatDateDDMMYYYY } from "@shared/utils/dateFormat";
import {
  useMyUOPs, usePublicUOPs, useDeleteUOP, useCopyPublicUOP, useUpdateUOP,
  type UOPListRow,
} from "../hooks/useUOPMutations";
import { UOPCreateDialog } from "../components/UOPCreateDialog";
import { UOPEditDialog } from "../components/UOPEditDialog";

const PROGRAM_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "ielts", label: "IELTS" },
  { value: "wre", label: "WRE" },
  { value: "customized", label: "Customized" },
];

const CEFR_OPTIONS = [
  { value: "all", label: "Tất cả CEFR" },
  ...["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => ({ value: l, label: l })),
];

export default function MyPlansPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"mine" | "public">("mine");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UOPListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UOPListRow | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [cefrFilter, setCefrFilter] = useState("all");

  const myUOPsQ = useMyUOPs();
  const publicUOPsQ = usePublicUOPs();
  const deleteMut = useDeleteUOP();
  const copyMut = useCopyPublicUOP();
  const updateMut = useUpdateUOP();

  const filterRows = (rows: UOPListRow[] | undefined): UOPListRow[] => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (programFilter !== "all" && (r.program ?? "").toLowerCase() !== programFilter) return false;
      if (cefrFilter !== "all" && r.cefr_level !== cefrFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const blob = [
          r.plan_name ?? "",
          ...(Array.isArray(r.tags) ? r.tags : []),
          r.cefr_level ?? "",
          r.program ?? "",
        ].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  };

  const myFiltered = useMemo(() => filterRows(myUOPsQ.data), [myUOPsQ.data, search, programFilter, cefrFilter]);
  const publicFiltered = useMemo(() => filterRows(publicUOPsQ.data), [publicUOPsQ.data, search, programFilter, cefrFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success(`Đã xoá "${deleteTarget.plan_name}"`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xoá UOP");
    }
  };

  const handleCopyPublic = async (uop: UOPListRow) => {
    try {
      const newId = await copyMut.mutateAsync(uop.id);
      toast.success(`Đã copy "${uop.plan_name}" vào account của bạn`);
      // Switch to "mine" tab để user thấy bản copy
      setTab("mine");
      void newId;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi sao chép UOP");
    }
  };

  const handleTogglePublic = async (uop: UOPListRow) => {
    const next = !uop.is_public;
    try {
      await updateMut.mutateAsync({
        id: uop.id,
        patch: { is_public: next },
      });
      toast.success(next ? "Đã chia sẻ công khai" : "Đã chuyển về riêng tư");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi cập nhật trạng thái chia sẻ");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 animate-page-in">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>My Plans</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" /> My Plans <span className="text-xs font-normal text-muted-foreground ml-1">(UOP)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tạo + chia sẻ kế hoạch học tập của riêng bạn (Tier 3 — User-Owned Plans). Phase F3 v2 §4.5.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Tạo UOP mới
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên / tags / program / CEFR..."
            className="pl-9 h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROGRAM_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cefrFilter} onValueChange={setCefrFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CEFR_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || programFilter !== "all" || cefrFilter !== "all") && (
          <Button
            type="button" variant="ghost" size="sm"
            onClick={() => { setSearch(""); setProgramFilter("all"); setCefrFilter("all"); }}
            className="h-9 text-xs gap-1"
          >
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "mine" | "public")}>
        <TabsList>
          <TabsTrigger value="mine" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Plans của tôi
            {myUOPsQ.data && (
              <Badge variant="secondary" className="text-[10px] ml-1">{myUOPsQ.data.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="public" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Công khai
            {publicUOPsQ.data && (
              <Badge variant="secondary" className="text-[10px] ml-1">{publicUOPsQ.data.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          {myUOPsQ.isLoading ? (
            <UOPGridSkeleton />
          ) : myUOPsQ.error ? (
            <ErrorCard message={(myUOPsQ.error as Error).message} />
          ) : myFiltered.length === 0 ? (
            <EmptyMineCard onCreate={() => setCreateOpen(true)} hasFilters={!!search || programFilter !== "all" || cefrFilter !== "all"} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myFiltered.map((uop) => (
                <UOPCard
                  key={uop.id}
                  uop={uop}
                  variant="mine"
                  onEdit={() => setEditTarget(uop)}
                  onDelete={() => setDeleteTarget(uop)}
                  onTogglePublic={() => handleTogglePublic(uop)}
                  isMutating={updateMut.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-4">
          {publicUOPsQ.isLoading ? (
            <UOPGridSkeleton />
          ) : publicUOPsQ.error ? (
            <ErrorCard message={(publicUOPsQ.error as Error).message} />
          ) : publicFiltered.length === 0 ? (
            <EmptyPublicCard hasFilters={!!search || programFilter !== "all" || cefrFilter !== "all"} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {publicFiltered.map((uop) => (
                <UOPCard
                  key={uop.id}
                  uop={uop}
                  variant="public"
                  onCopy={() => handleCopyPublic(uop)}
                  isMutating={copyMut.isPending && copyMut.variables === uop.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <UOPCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { void myUOPsQ.refetch(); }}
      />

      {/* Edit dialog */}
      <UOPEditDialog
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        uopId={editTarget?.id ?? null}
        preview={editTarget}
        onUpdated={() => { setEditTarget(null); void myUOPsQ.refetch(); }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá UOP?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xoá <strong>{deleteTarget?.plan_name ?? "(không tên)"}</strong>?
              {deleteTarget?.is_public && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  ⚠️ Plan này đang công khai. Bản sao chép của các giáo viên khác sẽ KHÔNG bị ảnh hưởng (independent).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer ref */}
      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 pt-2">
        <Sparkles className="h-3 w-3" />
        Phase F3 v2 §4.5 — UOP marketplace. Tier 3 User-Owned Plans, schema F3.1 (Lovable).
      </div>
    </div>
  );
}

/* ───────────── UOP card ───────────── */

function UOPCard({
  uop,
  variant,
  onEdit, onDelete, onTogglePublic, onCopy,
  isMutating,
}: {
  uop: UOPListRow;
  variant: "mine" | "public";
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
  onCopy?: () => void;
  isMutating?: boolean;
}) {
  const programLabel = uop.program ? uop.program.toUpperCase() : "—";
  return (
    <Card className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-violet-500/40">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-bold text-sm leading-tight line-clamp-2">
            {uop.plan_name ? uop.plan_name : <span className="italic text-muted-foreground">(chưa đặt tên)</span>}
          </h3>
          {variant === "mine" && uop.is_public && (
            <Badge variant="outline" className="text-[10px] gap-1 shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
              <Globe className="h-2.5 w-2.5" /> Public
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="text-[10px]">{programLabel}</Badge>
          {uop.cefr_level && (
            <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-700 dark:text-blue-400">
              {uop.cefr_level}
            </Badge>
          )}
          {uop.plan_type === "structured" && (
            <Badge variant="secondary" className="text-[10px]">
              {uop.total_sessions ?? 0} buổi · {uop.total_hours ?? 0}h
            </Badge>
          )}
        </div>

        {Array.isArray(uop.tags) && uop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {uop.tags.slice(0, 4).map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded"
              >
                <Tag className="h-2.5 w-2.5" /> {t}
              </span>
            ))}
            {uop.tags.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{uop.tags.length - 4}</span>
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground tabular-nums">
          Cập nhật: {formatDateDDMMYYYY(uop.updated_at)}
        </p>

        <div className="flex items-center gap-1 pt-1 border-t">
          {variant === "mine" ? (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={onEdit} className="h-7 gap-1 text-xs">
                <Pencil className="h-3 w-3" /> Sửa
              </Button>
              <Button
                type="button" size="sm" variant="ghost"
                onClick={onTogglePublic}
                disabled={isMutating}
                className="h-7 gap-1 text-xs"
                title={uop.is_public ? "Chuyển về riêng tư" : "Chia sẻ công khai"}
              >
                {uop.is_public ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {uop.is_public ? "Riêng tư" : "Public"}
              </Button>
              <div className="flex-1" />
              <Button
                type="button" size="sm" variant="ghost"
                onClick={onDelete}
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Xoá
              </Button>
            </>
          ) : (
            <Button
              type="button" size="sm" variant="default"
              onClick={onCopy}
              disabled={isMutating}
              className="h-7 gap-1 text-xs ml-auto"
            >
              {isMutating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
              Sao chép
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ───────────── Empty + skeleton + error helpers ───────────── */

function UOPGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="p-4 border-destructive/30 bg-destructive/5">
      <div className="flex items-start gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>Lỗi tải: {message}</p>
      </div>
    </Card>
  );
}

function EmptyMineCard({ onCreate, hasFilters }: { onCreate: () => void; hasFilters: boolean }) {
  return (
    <Card className="p-12 text-center border-dashed">
      <Sparkles className="h-12 w-12 text-violet-500/40 mx-auto mb-3" />
      <p className="font-medium text-sm">
        {hasFilters ? "Không có UOP khớp filter" : "Bạn chưa có UOP nào"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        {hasFilters
          ? "Đổi filter hoặc clear search."
          : "Tạo plan đầu tiên cho lớp customized hoặc share công khai cho team."}
      </p>
      {!hasFilters && (
        <Button onClick={onCreate} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Tạo UOP đầu tiên
        </Button>
      )}
    </Card>
  );
}

function EmptyPublicCard({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card className="p-12 text-center border-dashed">
      <Globe className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
      <p className="font-medium text-sm">
        {hasFilters ? "Không có UOP công khai khớp filter" : "Chưa có UOP công khai nào"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {hasFilters
          ? "Đổi filter hoặc clear search."
          : "Khi giáo viên khác share UOP công khai, plans sẽ xuất hiện ở đây."}
      </p>
    </Card>
  );
}
