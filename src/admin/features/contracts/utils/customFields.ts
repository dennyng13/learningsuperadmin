import type { ContractTemplateFieldRow } from "../types";

export function validateCustomFields(
  fields: ContractTemplateFieldRow[],
  values: Record<string, unknown>,
): string[] {
  const missing: string[] = [];
  for (const f of fields) {
    if (!f.required) continue;
    const v = values[f.field_key];
    if (v === undefined || v === null || v === "") {
      missing.push(f.label);
    }
  }
  return missing;
}
