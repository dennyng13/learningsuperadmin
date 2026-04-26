import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Switch } from "@shared/components/ui/switch";
import { Badge } from "@shared/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { ExternalLink, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useContractTemplatesList,
  updateTemplate,
} from "@admin/features/contracts/hooks/useContracts";

export default function AdminContractsTab() {
  const { data, loading, error, refresh } = useContractTemplatesList(true);

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Template hợp đồng</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Quản lý các mẫu hợp đồng và trường tùy chỉnh.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/contracts/templates">
              <ExternalLink className="h-4 w-4 mr-1" />
              Trang quản lý
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/contracts/templates">
              <Plus className="h-4 w-4 mr-1" />
              Tạo template
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Đang tải template…
          </div>
        )}
        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="w-[100px] text-center">Số trường</TableHead>
                <TableHead className="w-[120px] text-center">Trạng thái</TableHead>
                <TableHead className="w-[120px] text-right">Hành động</TableHead>
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
                <TableRow key={tpl.id}>
                  <TableCell className="font-medium">{tpl.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                    {tpl.description || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{tpl.field_count ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={tpl.is_active}
                      onCheckedChange={(v) => toggleActive(tpl.id, v)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/contracts/templates/${tpl.id}`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Sửa
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
