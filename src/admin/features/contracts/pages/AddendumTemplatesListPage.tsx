import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListPageLayout } from "@shared/components/layouts";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { Badge } from "@shared/components/ui/badge";
import { Card, CardContent } from "@shared/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  ArrowUpRight, FileSignature, Loader2, Pencil, Plus, Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAddendumTemplatesList,
  createAddendumTemplate,
  updateAddendumTemplate,
} from "../hooks/useAddendumTemplates";
import type { AddendumTemplateRow } from "../types";

export default function AddendumTemplatesListPage() {
  const navigate = useNavigate();
  const [includeArchived, setIncludeArchived] = useState(true);
  const { data, loading, error, refresh } = useAddendumTemplatesList(includeArchived);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (t) =>
        t.name.toLowerCase().includes(q)
        || (t.description ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const submitCreate = async () => {
    if (!newName.trim()) {
      toast.error("Vui lòng nhập tên template");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createAddendumTemplate({
        name: newName.trim(),
        description: newDescription.trim() || null,
        body_md: "",
        default_auto_archive: true,
      });
      toast.success("Đã tạo template phụ lục");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      navigate(`/contracts/addendum-templates/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không tạo được: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (templateId: string, isActive: boolean) => {
    try {
      await updateAddendumTemplate(templateId, { is_active: isActive });
      toast.success(isActive ? "Đã kích hoạt" : "Đã tạm ẩn template");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không cập nhật được: ${msg}`);
    }
  };

  return (
    <ListPageLayout
      title="Template phụ lục"
      subtitle="Quản lý các mẫu phụ lục thù lao và trường tùy chỉnh"
      icon={FileSignature}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/contracts/templates")}
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Template hợp đồng
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Tạo template
          </Button>
        </div>
      }
      filterBar={
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm template theo tên hoặc mô tả…"
              className="pl-8 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="includeArchivedAd"
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
            />
            <Label htmlFor="includeArchivedAd" className="text-sm">
              Hiển thị template đã ẩn
            </Label>
          </div>
        </div>
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Đang tải template…
        </div>
      )}
      {!loading && error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <Card>
          <CardContent className="py-14 text-center">
            <FileSignature className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium mb-1">
              {search ? "Không có template nào khớp tìm kiếm" : "Chưa có template phụ lục"}
            </p>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {search
                ? "Thử bỏ bộ lọc hoặc tìm bằng từ khoá khác."
                : "Tạo template đầu tiên để admin có thể soạn phụ lục thù lao nhanh chóng từ mẫu sẵn."}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Tạo template mới
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              onToggle={toggleActive}
              onOpen={() => navigate(`/contracts/addendum-templates/${tpl.id}`)}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo template phụ lục mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ad-tpl-name">Tên template</Label>
              <Input
                id="ad-tpl-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: PL Điều chỉnh thù lao"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-tpl-desc">Mô tả</Label>
              <Textarea
                id="ad-tpl-desc"
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Khi nào dùng template này…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={submitCreate} disabled={submitting}>
              {submitting ? "Đang lưu..." : "Tạo và mở editor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPageLayout>
  );
}

interface TemplateCardProps {
  tpl: AddendumTemplateRow;
  onToggle: (id: string, active: boolean) => void;
  onOpen: () => void;
}

function TemplateCard({ tpl, onToggle, onOpen }: TemplateCardProps) {
  return (
    <Card
      className={`group relative transition-all hover:border-primary/40 hover:shadow-sm ${
        tpl.is_active ? "" : "opacity-70"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileSignature className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={onOpen}
              className="font-medium leading-tight text-left hover:text-primary line-clamp-2"
            >
              {tpl.name}
            </button>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 min-h-[2em]">
              {tpl.description || "Chưa có mô tả"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            {tpl.field_count ?? 0} trường tùy chỉnh
          </Badge>
          {tpl.default_auto_archive ? (
            <Badge variant="outline" className="text-[10px]">Tự thay thế khi kích hoạt</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Cùng tồn tại</Badge>
          )}
          {tpl.is_active ? (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              Đang hoạt động
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Đã ẩn</Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Switch
              checked={tpl.is_active}
              onCheckedChange={(v) => onToggle(tpl.id, v)}
            />
            <span className="text-xs text-muted-foreground">
              {tpl.is_active ? "Hiển thị khi tạo phụ lục" : "Đã tạm ẩn"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onOpen}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Quản lý
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
