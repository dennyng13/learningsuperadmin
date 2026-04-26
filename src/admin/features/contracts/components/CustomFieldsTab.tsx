import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import CustomFieldsForm from "./CustomFieldsForm";
import { validateCustomFields } from "../utils/customFields";
import { updateContractCustomFields } from "../hooks/useContracts";
import type {
  ContractStatus,
  ContractTemplateFieldRow,
} from "../types";

interface CustomFieldsTabProps {
  contractId: string;
  status: ContractStatus;
  fieldsSnapshot: ContractTemplateFieldRow[] | null;
  values: Record<string, unknown> | null;
  onMutated: () => void;
}

const EDITABLE_STATUSES: ContractStatus[] = [
  "draft",
  "awaiting_teacher",
  "revision_requested",
  "awaiting_admin",
];

export default function CustomFieldsTab({
  contractId, status, fieldsSnapshot, values, onMutated,
}: CustomFieldsTabProps) {
  const fields = fieldsSnapshot ?? [];
  const [draft, setDraft] = useState<Record<string, unknown>>(values ?? {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(values ?? {});
  }, [values]);

  const editable = EDITABLE_STATUSES.includes(status);

  const save = async () => {
    const missing = validateCustomFields(fields, draft);
    if (missing.length) {
      toast.error(`Thiếu trường bắt buộc: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      await updateContractCustomFields(contractId, draft);
      toast.success("Đã lưu thông tin tùy chỉnh");
      onMutated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không lưu được: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!fields.length) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Hợp đồng này không có trường tùy chỉnh.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Thông tin tùy chỉnh</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CustomFieldsForm
          fields={fields}
          values={draft}
          onChange={setDraft}
          disabled={!editable}
        />
        {editable ? (
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Lưu thay đổi
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Hợp đồng đang ở trạng thái không cho phép chỉnh sửa thông tin tùy chỉnh.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
