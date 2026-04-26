import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Checkbox } from "@shared/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import type {
  ContractTemplateFieldOption,
  ContractTemplateFieldRow,
} from "../types";

interface CustomFieldsFormProps {
  fields: ContractTemplateFieldRow[];
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  disabled?: boolean;
}

function groupFields(fields: ContractTemplateFieldRow[]): Map<string, ContractTemplateFieldRow[]> {
  const map = new Map<string, ContractTemplateFieldRow[]>();
  for (const f of fields) {
    const g = f.field_group || "Khác";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(f);
  }
  return map;
}

function FieldInput({
  field, value, onChange, disabled,
}: {
  field: ContractTemplateFieldRow;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const id = `cf-${field.field_key}`;
  switch (field.field_type) {
    case "textarea":
      return (
        <Textarea
          id={id}
          rows={3}
          disabled={disabled}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          disabled={disabled}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "currency":
      return (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          disabled={disabled}
          placeholder="VNĐ"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <Input
          id={id}
          type="date"
          disabled={disabled}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2 h-10">
          <Checkbox
            id={id}
            disabled={disabled}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(Boolean(checked))}
          />
          <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
            {value ? "Có" : "Không"}
          </Label>
        </div>
      );
    case "dropdown": {
      const options = (field.options ?? []) as ContractTemplateFieldOption[];
      return (
        <Select
          value={(value as string) ?? ""}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Chọn..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    default:
      return (
        <Input
          id={id}
          disabled={disabled}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export default function CustomFieldsForm({
  fields, values, onChange, disabled,
}: CustomFieldsFormProps) {
  if (!fields.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Template này không có trường tùy chỉnh.
      </p>
    );
  }

  const groups = groupFields(fields);
  const updateValue = (key: string, v: unknown) => {
    onChange({ ...values, [key]: v });
  };

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([groupName, groupFields]) => (
        <section key={groupName} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {groupName}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupFields.map((f) => {
              const span = f.field_type === "textarea" ? "md:col-span-2" : "";
              return (
                <div key={f.id} className={`space-y-1.5 ${span}`}>
                  <Label htmlFor={`cf-${f.field_key}`}>
                    {f.label}
                    {f.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <FieldInput
                    field={f}
                    value={values[f.field_key]}
                    onChange={(v) => updateValue(f.field_key, v)}
                    disabled={disabled}
                  />
                  {f.help_text && (
                    <p className="text-xs text-muted-foreground">{f.help_text}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}


