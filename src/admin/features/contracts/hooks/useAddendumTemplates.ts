import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AddendumTemplateRow,
  ContractFieldType,
  ContractTemplateFieldOption,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

// =============================================================================
// List + detail
// =============================================================================

export function useAddendumTemplatesList(includeArchived = false) {
  const [data, setData] = useState<AddendumTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await rpc("addendum_templates_list", {
      p_include_archived: includeArchived,
    });
    if (error) {
      setError(error.message);
      setData([]);
    } else {
      setData((data as AddendumTemplateRow[]) ?? []);
    }
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useAddendumTemplateWithFields(templateId: string | undefined) {
  const [data, setData] = useState<AddendumTemplateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!templateId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await rpc("addendum_template_get_with_fields", {
      p_template_id: templateId,
    });
    if (error) {
      setError(error.message);
      setData(null);
    } else {
      setData(data as unknown as AddendumTemplateRow);
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

// =============================================================================
// Mutations
// =============================================================================

export interface AddendumTemplateCreateInput {
  name: string;
  description?: string | null;
  body_md?: string | null;
  default_auto_archive?: boolean | null;
}

export async function createAddendumTemplate(
  input: AddendumTemplateCreateInput,
): Promise<string> {
  const { data, error } = await rpc("addendum_template_create", {
    p_name: input.name,
    p_description: input.description ?? null,
    p_body_md: input.body_md ?? "",
    p_default_auto_archive: input.default_auto_archive ?? true,
  });
  if (error) throw error;
  return data as unknown as string;
}

export interface AddendumTemplateUpdateInput {
  name?: string | null;
  description?: string | null;
  body_md?: string | null;
  default_auto_archive?: boolean | null;
  is_active?: boolean | null;
}

export async function updateAddendumTemplate(
  templateId: string,
  input: AddendumTemplateUpdateInput,
) {
  const { error } = await rpc("addendum_template_update", {
    p_template_id: templateId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
    p_body_md: input.body_md ?? null,
    p_default_auto_archive: input.default_auto_archive ?? null,
    p_is_active: input.is_active ?? null,
  });
  if (error) throw error;
}

export async function archiveAddendumTemplate(templateId: string) {
  const { error } = await rpc("addendum_template_archive", {
    p_template_id: templateId,
  });
  if (error) throw error;
}

export interface AddendumTemplateFieldUpsertInput {
  template_id: string;
  field_key: string;
  label: string;
  field_type: ContractFieldType;
  required?: boolean;
  default_value?: unknown;
  options?: ContractTemplateFieldOption[] | null;
  help_text?: string | null;
  field_group?: string | null;
  sort_order?: number;
  id?: string | null;
}

export async function upsertAddendumTemplateField(
  input: AddendumTemplateFieldUpsertInput,
): Promise<string> {
  const { data, error } = await rpc("addendum_template_field_upsert", {
    p_template_id: input.template_id,
    p_field_key: input.field_key,
    p_label: input.label,
    p_field_type: input.field_type,
    p_required: input.required ?? false,
    p_default_value: input.default_value === undefined ? null : input.default_value,
    p_options: input.options ?? null,
    p_help_text: input.help_text ?? null,
    p_field_group: input.field_group ?? null,
    p_sort_order: input.sort_order ?? 0,
    p_id: input.id ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function deleteAddendumTemplateField(fieldId: string) {
  const { error } = await rpc("addendum_template_field_delete", {
    p_field_id: fieldId,
  });
  if (error) throw error;
}

export async function reorderAddendumTemplateFields(
  templateId: string,
  orderedIds: string[],
) {
  const { error } = await rpc("addendum_template_field_reorder", {
    p_template_id: templateId,
    p_ordered_ids: orderedIds,
  });
  if (error) throw error;
}

export async function setContractTemplateDefaultAddendum(
  contractTemplateId: string,
  addendumTemplateId: string | null,
) {
  const { error } = await rpc("contract_template_set_default_addendum", {
    p_contract_template_id: contractTemplateId,
    p_addendum_template_id: addendumTemplateId,
  });
  if (error) throw error;
}
