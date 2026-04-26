import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Trash2 } from "lucide-react";
import {
  CONTRACT_FIELD_TYPE_LABELS,
  type ContractFieldType,
  type ContractTemplateFieldOption,
  type ContractTemplateFieldRow,
} from "../types";

interface TemplateFieldEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ContractTemplateFieldRow | null;
  existingKeys: string[];
  onSubmit: (input: {
    id: string | null;
    field_key: string;
    label: string;
    field_type: ContractFieldType;
    required: boolean;
    default_value: unknown;
    options: ContractTemplateFieldOption[] | null;
    help_text: string | null;
    field_group: string | null;
  }) => Promise<void>;
}

const FIELD_TYPES: ContractFieldType[] = [
  "text", "textarea", "number", "date", "currency", "dropdown", "checkbox",
];

export default function TemplateFieldEditor({
  open, onOpenChange, initial, existingKeys, onSubmit,
}: TemplateFieldEditorProps) {
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<ContractFieldType>("text");
  const [required, setRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");
  const [helpText, setHelpText] = useState("");
  const [fieldGroup, setFieldGroup] = useState("");
  const [options, setOptions] = useState<ContractTemplateFieldOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setFieldKey(initial.field_key);
      setLabel(initial.label);
      setFieldType(initial.field_type);
      setRequired(initial.required);
      setDefaultValue(
        initial.default_value === null || initial.default_value === undefined
          ? ""
          : String(initial.default_value),
      );
      setHelpText(initial.help_text ?? "");
      setFieldGroup(initial.field_group ?? "");
      setOptions(initial.options ?? []);
    } else {
      setFieldKey("");
      setLabel("");
      setFieldType("text");
      setRequired(false);
      setDefaultValue("");
      setHelpText("");
      setFieldGroup("");
      setOptions([]);
    }
    setError(null);
  }, [open, initial]);

  const keyConflicts = useMemo(() => {
    if (!fieldKey) return false;
    if (initial && initial.field_key === fieldKey) return false;
    return existingKeys.includes(fieldKey);
  }, [fieldKey, existingKeys, initial]);

  const submit = async () => {
    setError(null);
    if (!fieldKey || !/^[a-z][a-z0-9_]{0,59}$/.test(fieldKey)) {
      setError("field_key phải bắt đầu bằng chữ thường và chỉ chứa [a-z0-9_]");
      return;
    }
    if (keyConflicts) {
      setError(`field_key "${fieldKey}" đã tồn tại trong template này`);
      return;
    }
    if (!label.trim()) {
      setError("Vui lòng nhập nhãn (label)");
      return;
    }
    if (fieldType === "dropdown" && options.length === 0) {
      setError("Trường dropdown cần ít nhất 1 lựa chọn");
      return;
    }
    let parsedDefault: unknown = null;
    if (defaultValue !== "") {
      if (fieldType === "number" || fieldType === "currency") {
        parsedDefault = Number(defaultValue);
      } else if (fieldType === "checkbox") {
        parsedDefault = defaultValue === "true";
      } else {
        parsedDefault = defaultValue;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        id: initial?.id ?? null,
        field_key: fieldKey,
        label: label.trim(),
        field_type: fieldType,
        required,
        default_value: parsedDefault,
        options: fieldType === "dropdown" ? options : null,
        help_text: helpText.trim() || null,
        field_group: fieldGroup.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const addOption = () => setOptions((prev) => [...prev, { value: "", label: "" }]);
  const updateOption = (idx: number, patch: Partial<ContractTemplateFieldOption>) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };
  const removeOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa trường" : "Thêm trường tùy chỉnh"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fk">Khóa (field_key)</Label>
              <Input
                id="fk"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="vd: base_salary"
                disabled={!!initial}
              />
              <p className="text-xs text-muted-foreground">
                Dùng trong placeholder body_md dưới dạng <code>{`{{${fieldKey || "key"}}}`}</code>.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lbl">Nhãn (hiển thị cho admin)</Label>
              <Input id="lbl" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Kiểu dữ liệu</Label>
              <Select value={fieldType} onValueChange={(v) => setFieldType(v as ContractFieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{CONTRACT_FIELD_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grp">Nhóm (field_group)</Label>
              <Input
                id="grp"
                value={fieldGroup}
                onChange={(e) => setFieldGroup(e.target.value)}
                placeholder="vd: Thù lao"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <p className="text-sm font-medium">Bắt buộc</p>
              <p className="text-xs text-muted-foreground">
                Nếu bật, admin phải nhập giá trị khi tạo hợp đồng.
              </p>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>

          {fieldType !== "checkbox" && fieldType !== "dropdown" && (
            <div className="space-y-1.5">
              <Label htmlFor="dv">Giá trị mặc định</Label>
              <Input
                id="dv"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                type={fieldType === "date" ? "date" : fieldType === "number" || fieldType === "currency" ? "number" : "text"}
              />
            </div>
          )}

          {fieldType === "dropdown" && (
            <div className="space-y-2">
              <Label>Danh sách lựa chọn</Label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="value"
                      value={opt.value}
                      onChange={(e) => updateOption(idx, { value: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Nhãn hiển thị"
                      value={opt.label}
                      onChange={(e) => updateOption(idx, { label: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                + Thêm lựa chọn
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ht">Mô tả / hướng dẫn</Label>
            <Textarea
              id="ht"
              rows={2}
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
