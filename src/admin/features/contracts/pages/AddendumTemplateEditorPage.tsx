import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DetailPageLayout } from "@shared/components/layouts";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { Textarea } from "@shared/components/ui/textarea";
import { Badge } from "@shared/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  ArrowDown, ArrowUp, CheckCircle2, FileSignature, Info, Loader2,
  Pencil, Plus, Save, Trash2, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAddendumTemplateWithFields,
  updateAddendumTemplate,
  archiveAddendumTemplate,
  upsertAddendumTemplateField,
  deleteAddendumTemplateField,
  reorderAddendumTemplateFields,
} from "../hooks/useAddendumTemplates";
import {
  CONTRACT_FIELD_TYPE_LABELS,
  type AddendumTemplateFieldRow,
  type ContractTemplateFieldRow,
} from "../types";
import TemplateFieldEditor from "../components/TemplateFieldEditor";
import PlaceholderPicker from "../components/PlaceholderPicker";
import { FIELD_TYPE_META } from "../utils/fieldTypeMeta";
import {
  RESERVED_ADDENDUM_PLACEHOLDERS,
  RESERVED_ADDENDUM_PLACEHOLDER_KEYS,
} from "../utils/reservedAddendumFieldKeys";

export default function AddendumTemplateEditorPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAddendumTemplateWithFields(templateId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [defaultAutoArchive, setDefaultAutoArchive] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<AddendumTemplateFieldRow | null>(null);
  const [deletingField, setDeletingField] = useState<AddendumTemplateFieldRow | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDescription(data.description ?? "");
      setBodyMd(data.body_md);
      setDefaultAutoArchive(data.default_auto_archive);
    }
  }, [data]);

  const fields = useMemo<AddendumTemplateFieldRow[]>(() => data?.fields ?? [], [data]);
  const existingKeys = useMemo(() => fields.map((f) => f.field_key), [fields]);

  const placeholdersUsed = useMemo(() => {
    const re = /\{\{([a-z][a-z0-9_]{0,59})\}\}/g;
    const set = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(bodyMd))) set.add(m[1]);
    return set;
  }, [bodyMd]);

  const customKeysSet = useMemo(() => new Set(existingKeys), [existingKeys]);

  const placeholdersUnknown = useMemo(() => {
    const list: string[] = [];
    for (const k of placeholdersUsed) {
      if (!RESERVED_ADDENDUM_PLACEHOLDER_KEYS.has(k) && !customKeysSet.has(k)) {
        list.push(k);
      }
    }
    return list;
  }, [placeholdersUsed, customKeysSet]);

  const fieldKeysReferenced = useMemo(
    () => fields.filter((f) => placeholdersUsed.has(f.field_key)).map((f) => f.field_key),
    [fields, placeholdersUsed],
  );

  const fieldKeysOrphan = useMemo(
    () => fields.filter((f) => !placeholdersUsed.has(f.field_key)).map((f) => f.field_key),
    [fields, placeholdersUsed],
  );

  const isDirty = useMemo(() => {
    if (!data) return false;
    return (
      name !== data.name
      || (description ?? "") !== (data.description ?? "")
      || bodyMd !== data.body_md
      || defaultAutoArchive !== data.default_auto_archive
    );
  }, [data, name, description, bodyMd, defaultAutoArchive]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const insertPlaceholder = (key: string) => {
    const ta = bodyRef.current;
    const token = `{{${key}}}`;
    if (!ta) {
      setBodyMd((prev) => prev + token);
      return;
    }
    const start = ta.selectionStart ?? bodyMd.length;
    const end = ta.selectionEnd ?? bodyMd.length;
    const next = bodyMd.slice(0, start) + token + bodyMd.slice(end);
    setBodyMd(next);
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + token.length;
      ta.setSelectionRange(caret, caret);
    });
  };

  const saveMeta = async () => {
    if (!templateId) return;
    if (!name.trim()) {
      toast.error("Tên template không được để trống");
      return;
    }
    setSavingMeta(true);
    try {
      await updateAddendumTemplate(templateId, {
        name: name.trim(),
        description: description.trim() || null,
        body_md: bodyMd,
        default_auto_archive: defaultAutoArchive,
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
      await archiveAddendumTemplate(templateId);
      toast.success("Đã ẩn template");
      navigate("/contracts/addendum-templates");
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
      await reorderAddendumTemplateFields(templateId, next.map((f) => f.id));
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
    await upsertAddendumTemplateField({
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
      await deleteAddendumTemplateField(deletingField.id);
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
      <DetailPageLayout title="Template phụ lục" backRoute="/contracts/addendum-templates">
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Đang tải…
        </div>
      </DetailPageLayout>
    );
  }
  if (error || !data) {
    return (
      <DetailPageLayout title="Template phụ lục" backRoute="/contracts/addendum-templates">
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {error || "Không tìm thấy template"}
          </CardContent>
        </Card>
      </DetailPageLayout>
    );
  }

  const placeholderCount = placeholdersUsed.size;
  const placeholderHealthy = placeholdersUnknown.length === 0;

  return (
    <DetailPageLayout
      title={data.name}
      subtitle="Chỉnh sửa template phụ lục + các trường tùy chỉnh"
      icon={FileSignature}
      backRoute="/contracts/addendum-templates"
      backLabel="Danh sách template phụ lục"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
            Ẩn template
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-24">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thông tin chung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-name">Tên template</Label>
                  <Input
                    id="ad-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: PL Điều chỉnh thù lao"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-desc">Mô tả ngắn</Label>
                  <Input
                    id="ad-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả khi nào dùng template này…"
                  />
                </div>
              </div>

              <div className="flex items-start justify-between p-3 rounded-md bg-muted/40 gap-3">
                <div>
                  <p className="text-sm font-medium">Tự thay thế phụ lục cũ khi kích hoạt</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cờ mặc định khi tạo phụ lục từ template này. Admin có thể tắt khi tạo từng phụ lục riêng nếu muốn nhiều phụ lục cùng tồn tại.
                  </p>
                </div>
                <Switch
                  checked={defaultAutoArchive}
                  onCheckedChange={setDefaultAutoArchive}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Nội dung mở đầu (Markdown)</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Nội dung sẽ render trước bảng thù lao trong phụ lục PDF. Dùng <code>{`{{key}}`}</code> để chèn placeholder. Để trống nếu không cần phần mở đầu.
                </p>
              </div>
              <PlaceholderPicker
                customFields={fields as unknown as ContractTemplateFieldRow[]}
                onPick={insertPlaceholder}
                reservedPlaceholders={RESERVED_ADDENDUM_PLACEHOLDERS}
              />
            </CardHeader>
            <CardContent>
              <Textarea
                ref={bodyRef}
                rows={18}
                value={bodyMd}
                onChange={(e) => setBodyMd(e.target.value)}
                className="font-mono text-xs leading-relaxed resize-y"
                placeholder="Soạn nội dung phụ lục với placeholder {{...}} (tùy chọn)…"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{bodyMd.length.toLocaleString("vi-VN")} ký tự</span>
                <span>{placeholderCount} placeholder được sử dụng</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Trường tùy chỉnh</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin sẽ điền các trường này khi tạo phụ lục. Giáo viên thấy ở dạng read-only. Trường không nhúng vào body sẽ render ở "Phụ lục bổ sung" cuối PDF.
                </p>
              </div>
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
                <div className="border border-dashed rounded-lg py-10 px-6 text-center">
                  <Wand2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-1">Chưa có trường tùy chỉnh nào</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                    Thêm trường để admin nhập thông tin riêng cho từng phụ lục (vd. cơ sở điều chỉnh, mức tăng %, phạm vi áp dụng).
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingField(null);
                      setEditorOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Thêm trường đầu tiên
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((f, idx) => {
                    const meta = FIELD_TYPE_META[f.field_type];
                    const Icon = meta.icon;
                    const isReferenced = placeholdersUsed.has(f.field_key);
                    return (
                      <div
                        key={f.id}
                        className="flex items-start gap-3 border rounded-lg p-3 hover:border-primary/40 transition-colors"
                      >
                        <div className={`shrink-0 h-10 w-10 rounded-md flex items-center justify-center ${meta.pillClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{f.label}</span>
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {CONTRACT_FIELD_TYPE_LABELS[f.field_type]}
                            </Badge>
                            {f.required && (
                              <Badge variant="destructive" className="text-[10px]">Bắt buộc</Badge>
                            )}
                            {f.field_group && (
                              <Badge variant="outline" className="text-[10px]">{f.field_group}</Badge>
                            )}
                            {!isReferenced && (
                              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                                Phụ lục bổ sung
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted">
                              {`{{${f.field_key}}}`}
                            </code>
                            {f.help_text && (
                              <span className="text-xs text-muted-foreground">— {f.help_text}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-center -my-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={() => moveField(idx, -1)}
                            title="Lên"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === fields.length - 1}
                            onClick={() => moveField(idx, 1)}
                            title="Xuống"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingField(f);
                            setEditorOpen(true);
                          }}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingField(f)}
                          title="Xoá"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {placeholderHealthy ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Info className="h-4 w-4 text-amber-600" />
                )}
                Tóm tắt template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-lg font-semibold">{fields.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trường</div>
                </div>
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-lg font-semibold">{placeholderCount}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Placeholder</div>
                </div>
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-lg font-semibold">{fieldKeysReferenced.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Đã dùng</div>
                </div>
              </div>

              {placeholdersUnknown.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-900 mb-1">
                    Placeholder không khớp ({placeholdersUnknown.length})
                  </p>
                  <p className="text-[11px] text-amber-800 mb-2">
                    Các key này có trong nội dung mở đầu nhưng không phải auto-fill và cũng chưa định nghĩa ở Trường tùy chỉnh — sẽ render rỗng.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {placeholdersUnknown.map((k) => (
                      <code key={k} className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        {`{{${k}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {fieldKeysOrphan.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Trường chỉ render ở "Phụ lục bổ sung" cuối PDF:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {fieldKeysOrphan.map((k) => (
                      <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {fieldKeysReferenced.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Trường được nhúng trong nội dung mở đầu:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {fieldKeysReferenced.map((k) => (
                      <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="py-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Ghi chú</p>
              <p>
                Khi tạo phụ lục từ template, định nghĩa trường + nội dung mở đầu được snapshot vào phụ lục đó. Sửa template sau khi đã tạo phụ lục <strong>không</strong> ảnh hưởng phụ lục cũ.
              </p>
              <p>
                Liên kết template phụ lục này làm mặc định cho 1 contract template ở trang chỉnh sửa contract template (mục "Phụ lục mặc định").
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-xs flex items-center gap-2 min-w-0">
            {isDirty ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-amber-700 font-medium">Có thay đổi chưa lưu</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-muted-foreground">Đã đồng bộ</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!isDirty || savingMeta}
              onClick={() => {
                if (!data) return;
                setName(data.name);
                setDescription(data.description ?? "");
                setBodyMd(data.body_md);
                setDefaultAutoArchive(data.default_auto_archive);
              }}
            >
              Hoàn tác
            </Button>
            <Button onClick={saveMeta} disabled={savingMeta || !isDirty} size="sm">
              {savingMeta ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </div>

      <TemplateFieldEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editingField as unknown as ContractTemplateFieldRow | null}
        existingKeys={existingKeys}
        onSubmit={submitField}
      />

      <AlertDialog open={!!deletingField} onOpenChange={(o) => !o && setDeletingField(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá trường tùy chỉnh?</AlertDialogTitle>
            <AlertDialogDescription>
              Trường <strong>{deletingField?.label}</strong> ({deletingField?.field_key}) sẽ bị xoá vĩnh viễn khỏi template.
              Phụ lục đã tạo trước đó sẽ vẫn hiển thị giá trị do snapshot lưu lại.
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
            <AlertDialogTitle>Ẩn template phụ lục?</AlertDialogTitle>
            <AlertDialogDescription>
              Template <strong>{data.name}</strong> sẽ không còn hiển thị khi tạo phụ lục mới. Phụ lục cũ vẫn dùng snapshot và không bị ảnh hưởng. Có thể bật lại bất cứ lúc nào ở trang danh sách template.
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
