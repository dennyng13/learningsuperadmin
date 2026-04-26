import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DetailPageLayout } from "@shared/components/layouts";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Badge } from "@shared/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  ArrowDown, ArrowUp, FilePlus, Loader2, Pencil, Plus, Save, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useContractTemplateWithFields, updateTemplate, archiveTemplate,
  upsertTemplateField, deleteTemplateField, reorderTemplateFields,
} from "../hooks/useContracts";
import {
  CONTRACT_FIELD_TYPE_LABELS, type ContractTemplateFieldRow,
} from "../types";
import TemplateFieldEditor from "../components/TemplateFieldEditor";

const PLACEHOLDER_HINT = `Một số placeholder có sẵn:
{{contract_number}}, {{contract_date}}, {{effective_from}}, {{effective_to}},
{{teacher_full_name}}, {{teacher_cccd_number}}, {{teacher_email}},
{{party_a_legal_name}}, {{party_a_address}}, {{services_description}}.

Trường tùy chỉnh dùng dạng {{<field_key>}} với key bạn định nghĩa ở dưới.`;

export default function ContractTemplateEditorPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useContractTemplateWithFields(templateId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<ContractTemplateFieldRow | null>(null);
  const [deletingField, setDeletingField] = useState<ContractTemplateFieldRow | null>(null);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDescription(data.description ?? "");
      setBodyMd(data.body_md);
    }
  }, [data]);

  const fields = useMemo(() => data?.fields ?? [], [data]);
  const existingKeys = useMemo(() => fields.map((f) => f.field_key), [fields]);

  const placeholdersUsed = useMemo(() => {
    const re = /\{\{([a-z][a-z0-9_]{0,59})\}\}/g;
    const set = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(bodyMd))) set.add(m[1]);
    return set;
  }, [bodyMd]);

  const fieldKeysReferenced = useMemo(() => {
    return fields
      .filter((f) => placeholdersUsed.has(f.field_key))
      .map((f) => f.field_key);
  }, [fields, placeholdersUsed]);

  const fieldKeysOrphan = useMemo(() => {
    return fields
      .filter((f) => !placeholdersUsed.has(f.field_key))
      .map((f) => f.field_key);
  }, [fields, placeholdersUsed]);

  const saveMeta = async () => {
    if (!templateId) return;
    setSavingMeta(true);
    try {
      await updateTemplate(templateId, {
        name: name.trim(),
        description: description.trim() || null,
        body_md: bodyMd,
      });
      toast.success("Đã lưu template");
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không lưu được: ${msg}`);
    } finally {
      setSavingMeta(false);
    }
  };

  const archive = async () => {
    if (!templateId) return;
    try {
      await archiveTemplate(templateId);
      toast.success("Đã ẩn template");
      navigate("/contracts/templates");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không ẩn được: ${msg}`);
    }
  };

  const moveField = async (idx: number, dir: -1 | 1) => {
    if (!templateId) return;
    const next = [...fields];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    try {
      await reorderTemplateFields(templateId, next.map((f) => f.id));
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không sắp xếp được: ${msg}`);
    }
  };

  const submitField = async (input: Parameters<Parameters<typeof TemplateFieldEditor>[0]["onSubmit"]>[0]) => {
    if (!templateId) return;
    const sortOrder = input.id
      ? (fields.find((f) => f.id === input.id)?.sort_order ?? 0)
      : fields.length;
    await upsertTemplateField({
      template_id: templateId,
      field_key: input.field_key,
      label: input.label,
      field_type: input.field_type,
      required: input.required,
      default_value: input.default_value,
      options: input.options,
      help_text: input.help_text,
      field_group: input.field_group,
      sort_order: sortOrder,
      id: input.id,
    });
    toast.success("Đã lưu trường");
    await refresh();
  };

  const confirmDelete = async () => {
    if (!deletingField) return;
    try {
      await deleteTemplateField(deletingField.id);
      toast.success("Đã xoá trường");
      setDeletingField(null);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(`Không xoá được: ${msg}`);
    }
  };

  if (loading) {
    return (
      <DetailPageLayout title="Template" backRoute="/contracts/templates">
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Đang tải…
        </div>
      </DetailPageLayout>
    );
  }
  if (error || !data) {
    return (
      <DetailPageLayout title="Template" backRoute="/contracts/templates">
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {error || "Không tìm thấy template"}
          </CardContent>
        </Card>
      </DetailPageLayout>
    );
  }

  return (
    <DetailPageLayout
      title={data.name}
      subtitle="Chỉnh sửa template hợp đồng + các trường tùy chỉnh"
      icon={FilePlus}
      backRoute="/contracts/templates"
      backLabel="Danh sách template"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
            Ẩn template
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Tên template</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Mô tả</Label>
                <Textarea
                  id="desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Nội dung (Markdown)</Label>
                <Textarea
                  id="body"
                  rows={20}
                  value={bodyMd}
                  onChange={(e) => setBodyMd(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground whitespace-pre-line">{PLACEHOLDER_HINT}</p>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveMeta} disabled={savingMeta}>
                  {savingMeta ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Lưu thông tin
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Trường tùy chỉnh ({fields.length})</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingField(null);
                  setEditorOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Thêm trường
              </Button>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có trường nào. Thêm trường để admin điền khi tạo hợp đồng.
                </p>
              ) : (
                <div className="space-y-2">
                  {fields.map((f, idx) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 border rounded-md p-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => moveField(idx, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === fields.length - 1}
                          onClick={() => moveField(idx, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{f.label}</span>
                          <code className="text-xs px-1.5 py-0.5 rounded bg-muted">
                            {`{{${f.field_key}}}`}
                          </code>
                          <Badge variant="secondary">{CONTRACT_FIELD_TYPE_LABELS[f.field_type]}</Badge>
                          {f.required && <Badge variant="destructive">Bắt buộc</Badge>}
                          {f.field_group && (
                            <Badge variant="outline">Nhóm: {f.field_group}</Badge>
                          )}
                        </div>
                        {f.help_text && (
                          <p className="text-xs text-muted-foreground mt-1">{f.help_text}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingField(f);
                          setEditorOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingField(f)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kiểm tra placeholder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Trường được tham chiếu trong body_md:</p>
                {fieldKeysReferenced.length === 0 ? (
                  <p className="text-xs italic">Chưa có trường tùy chỉnh nào được dùng.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {fieldKeysReferenced.map((k) => (
                      <Badge key={k} variant="secondary">{k}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1">
                  Trường định nghĩa nhưng không xuất hiện trong body_md:
                </p>
                {fieldKeysOrphan.length === 0 ? (
                  <p className="text-xs italic">Tất cả trường đều được tham chiếu.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {fieldKeysOrphan.map((k) => (
                      <Badge key={k} variant="outline">{k}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Các trường này sẽ vẫn xuất hiện ở "Phụ lục bổ sung" trong PDF, nhóm theo field_group.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TemplateFieldEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editingField}
        existingKeys={existingKeys}
        onSubmit={submitField}
      />

      <AlertDialog open={!!deletingField} onOpenChange={(o) => !o && setDeletingField(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá trường tùy chỉnh?</AlertDialogTitle>
            <AlertDialogDescription>
              Trường <strong>{deletingField?.label}</strong> ({deletingField?.field_key}) sẽ bị xoá vĩnh viễn khỏi template.
              Hợp đồng đã tạo trước đó sẽ vẫn hiển thị giá trị do snapshot lưu lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ẩn template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template sẽ không xuất hiện khi tạo hợp đồng mới. Hợp đồng đã tạo trước đó vẫn hoạt động bình thường.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={archive}>Ẩn template</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailPageLayout>
  );
}
