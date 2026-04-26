import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListPageLayout } from "@shared/components/layouts";
import { Button } from "@shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Switch } from "@shared/components/ui/switch";
import { Badge } from "@shared/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { FilePlus, Loader2, Plus, Pencil, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import {
  useContractTemplatesList, createTemplate, updateTemplate,
} from "../hooks/useContracts";

export default function ContractTemplatesListPage() {
  const navigate = useNavigate();
  const [includeArchived, setIncludeArchived] = useState(true);
  const { data, loading, error, refresh } = useContractTemplatesList(includeArchived);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitCreate = async () => {
    if (!newName.trim()) {
      toast.error("Vui lòng nhập tên template");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createTemplate({
        name: newName.trim(),
        description: newDescription.trim() || null,
        body_md: "",
      });
      toast.success("Đã tạo template");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      navigate(`/contracts/templates/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không tạo được template: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (templateId: string, isActive: boolean) => {
    try {
      await updateTemplate(templateId, { is_active: isActive });
      toast.success(isActive ? "Đã kích hoạt" : "Đã tạm ẩn template");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không cập nhật được: ${msg}`);
    }
  };

  return (
    <ListPageLayout
      title="Template hợp đồng"
      subtitle="Quản lý các mẫu hợp đồng và trường tùy chỉnh"
      icon={FilePlus}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/contracts")}
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Về danh sách hợp đồng
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Tạo template
          </Button>
        </div>
      }
      filterBar={
        <div className="flex items-center gap-2">
          <Switch
            id="includeArchived"
            checked={includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          <Label htmlFor="includeArchived" className="text-sm">
            Hiển thị template đã ẩn
          </Label>
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
      {!loading && !error && (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="w-[120px] text-center">Số trường</TableHead>
                <TableHead className="w-[120px] text-center">Trạng thái</TableHead>
                <TableHead className="w-[140px] text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Chưa có template nào.
                  </TableCell>
                </TableRow>
              )}
              {data.map((tpl) => (
                <TableRow key={tpl.id} className="hover:bg-accent/40">
                  <TableCell className="font-medium">{tpl.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground line-clamp-2">
                    {tpl.description || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{tpl.field_count ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={tpl.is_active}
                        onCheckedChange={(v) => toggleActive(tpl.id, v)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/contracts/templates/${tpl.id}`)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Quản lý
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo template mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Tên template</Label>
              <Input
                id="tpl-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="vd: HĐ Cộng tác viên"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Mô tả</Label>
              <Textarea
                id="tpl-desc"
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
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
