import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DetailPageLayout } from "@shared/components/layouts";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { FilePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createContract, useContractTemplates, useTeacherOptions,
} from "../hooks/useContracts";

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const { data: templates, loading: tplLoading } = useContractTemplates();
  const { data: teachers, loading: teacherLoading } = useTeacherOptions();

  const [templateId, setTemplateId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractType, setContractType] = useState("HĐ Dịch vụ Đào tạo");
  const [servicesDescription, setServicesDescription] = useState(
    "Giảng dạy các chương trình IELTS / WRE / Phonic / VSTEP theo phân công.",
  );
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!templateId || !teacherId) {
      toast.error("Vui lòng chọn template và giáo viên");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createContract({
        template_id: templateId,
        teacher_id: teacherId,
        contract_number: contractNumber || null,
        contract_type: contractType || null,
        services_description: servicesDescription || null,
        effective_from: effectiveFrom || null,
        effective_to: effectiveTo || null,
      });
      toast.success("Đã tạo hợp đồng (trạng thái: đang soạn)");
      navigate(`/contracts/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không tạo được hợp đồng: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DetailPageLayout
      title="Tạo hợp đồng mới"
      subtitle="Khởi tạo hợp đồng từ template và giáo viên"
      icon={FilePlus}
      backRoute="/contracts"
      backLabel="Danh sách hợp đồng"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin chính</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="template">Template hợp đồng</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="template">
                  <SelectValue placeholder={tplLoading ? "Đang tải…" : "Chọn template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher">Giáo viên</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger id="teacher">
                  <SelectValue placeholder={teacherLoading ? "Đang tải…" : "Chọn giáo viên"} />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name} {t.email ? `· ${t.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contract_number">Số hợp đồng (để trống = auto-gen)</Label>
              <Input
                id="contract_number"
                placeholder="LP-HDDV-yymmdd-##"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contract_type">Loại hợp đồng</Label>
              <Input
                id="contract_type"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="effective_from">Hiệu lực từ</Label>
              <Input
                id="effective_from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="effective_to">Hiệu lực đến</Label>
              <Input
                id="effective_to"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="services">Mô tả dịch vụ</Label>
            <Textarea
              id="services"
              rows={3}
              value={servicesDescription}
              onChange={(e) => setServicesDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/contracts")}>
              Hủy
            </Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Tạo hợp đồng
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Hợp đồng tạo ra ở trạng thái <strong>Đang soạn</strong>. Sau đó vào trang chi tiết để bổ sung thông tin
        Bên A / Bên B, phụ lục thù lao, rồi gửi cho giáo viên ký.
      </p>
    </DetailPageLayout>
  );
}
