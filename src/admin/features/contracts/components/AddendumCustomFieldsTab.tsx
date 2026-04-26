import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import CustomFieldsForm from "./CustomFieldsForm";
import { validateCustomFields } from "../utils/customFields";
import { updateAddendumCustomFields } from "../hooks/useAddendums";
import type {
  AddendumStatus,
  AddendumTemplateFieldRow,
  ContractTemplateFieldRow,
} from "../types";

interface AddendumCustomFieldsTabProps {
  addendumId: string;
  status: AddendumStatus;
  bodyMd: string;
  fieldsSnapshot: AddendumTemplateFieldRow[] | null;
  values: Record<string, unknown> | null;
  onMutated: () => void;
}

const EDITABLE_STATUSES: AddendumStatus[] = [
  "draft",
  "awaiting_teacher",
  "revision_requested",
  "awaiting_admin",
];

export default function AddendumCustomFieldsTab({
  addendumId, status, bodyMd, fieldsSnapshot, values, onMutated,
}: AddendumCustomFieldsTabProps) {
  const fields = fieldsSnapshot ?? [];
  const [draft, setDraft] = useState<Record<string, unknown>>(values ?? {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(values ?? {});
  }, [values]);

  const editable = EDITABLE_STATUSES.includes(status);

  const save = async () => {
    const missing = validateCustomFields(
      fields as unknown as ContractTemplateFieldRow[],
      draft,
    );
    if (missing.length) {
      toast.error(`Thiếu trường bắt buộc: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      await updateAddendumCustomFields(addendumId, draft);
      toast.success("Đã lưu thông tin tùy chỉnh");
      onMutated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không lưu được: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const hasBody = bodyMd && bodyMd.trim().length > 0;

  if (!fields.length && !hasBody) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Phụ lục này không sử dụng template hoặc template không có trường tùy chỉnh / nội dung mở đầu.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {hasBody && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nội dung mở đầu (snapshot)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-muted-foreground bg-muted/40 rounded-md p-3 max-h-[280px] overflow-y-auto">
              {bodyMd}
            </pre>
          </CardContent>
        </Card>
      )}

      {fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin tùy chỉnh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CustomFieldsForm
              fields={fields as unknown as ContractTemplateFieldRow[]}
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
                Phụ lục đang ở trạng thái không cho phép chỉnh sửa thông tin tùy chỉnh.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
