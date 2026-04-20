/**
 * WritingTaskConfig — Per-part configuration panel for Writing tasks.
 * - IELTS task type dropdown (Task 1 Academic / Task 1 General / Task 2 / Custom)
 * - Stimulus image upload (chart/diagram) — required for Task 1 Academic
 * - Min / Max word count
 *
 * Stored in `parts.task_metadata` as JSON:
 *   { ielts_task_type, stimulus_image_url, min_words, max_words }
 */
import { useState } from "react";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Button } from "@shared/components/ui/button";
import { Image as ImageIcon, Upload, X, Loader2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WritingTaskType =
  | "task1_academic"
  | "task1_general"
  | "task2_essay"
  | "custom";

export interface WritingTaskMetadata {
  ielts_task_type?: WritingTaskType;
  stimulus_image_url?: string;
  min_words?: number;
  max_words?: number;
}

const TASK_TYPE_OPTIONS: Array<{ value: WritingTaskType; label: string; defaultMin: number; defaultMax: number; needsImage: boolean }> = [
  { value: "task1_academic", label: "Task 1 Academic — chart / graph / diagram / map / process", defaultMin: 150, defaultMax: 250, needsImage: true },
  { value: "task1_general",  label: "Task 1 General — letter (formal / informal)",                defaultMin: 150, defaultMax: 250, needsImage: false },
  { value: "task2_essay",    label: "Task 2 — Essay (opinion / discussion / problem-solution)",   defaultMin: 250, defaultMax: 400, needsImage: false },
  { value: "custom",         label: "Custom / Free writing",                                       defaultMin: 100, defaultMax: 500, needsImage: false },
];

interface Props {
  value: WritingTaskMetadata | undefined;
  onChange: (next: WritingTaskMetadata) => void;
}

export default function WritingTaskConfig({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const meta = value || {};
  const taskOpt = TASK_TYPE_OPTIONS.find(o => o.value === meta.ielts_task_type);
  const needsImage = !!taskOpt?.needsImage;

  const update = (patch: Partial<WritingTaskMetadata>) => onChange({ ...meta, ...patch });

  const handleSelectType = (v: WritingTaskType) => {
    const opt = TASK_TYPE_OPTIONS.find(o => o.value === v)!;
    update({
      ielts_task_type: v,
      // Auto-fill defaults only when min/max are blank
      min_words: meta.min_words ?? opt.defaultMin,
      max_words: meta.max_words ?? opt.defaultMax,
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh"); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh quá 5MB"); return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `writing-stimulus/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error } = await supabase.storage.from("exercise-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("exercise-images").getPublicUrl(path);
      update({ stimulus_image_url: data.publicUrl });
      toast.success("Đã tải ảnh đề bài");
    } catch (err: any) {
      toast.error(err.message || "Lỗi upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
          Cấu hình Writing task
        </span>
      </div>

      {/* Task type */}
      <div>
        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
          Loại task IELTS
        </Label>
        <Select value={meta.ielts_task_type || ""} onValueChange={(v) => handleSelectType(v as WritingTaskType)}>
          <SelectTrigger className="rounded-lg text-sm h-9">
            <SelectValue placeholder="Chọn loại task..." />
          </SelectTrigger>
          <SelectContent>
            {TASK_TYPE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Word limits */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Số chữ tối thiểu
          </Label>
          <Input
            type="number"
            min={0}
            value={meta.min_words ?? ""}
            onChange={(e) => update({ min_words: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="VD: 150"
            className="rounded-lg text-sm h-9"
          />
        </div>
        <div>
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Số chữ tối đa (chặn cứng)
          </Label>
          <Input
            type="number"
            min={0}
            value={meta.max_words ?? ""}
            onChange={(e) => update({ max_words: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="VD: 250"
            className="rounded-lg text-sm h-9"
          />
        </div>
      </div>
      {meta.min_words != null && meta.max_words != null && meta.max_words < meta.min_words && (
        <p className="text-[10px] text-destructive"> Max phải lớn hơn min</p>
      )}

      {/* Stimulus image */}
      <div>
        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          Ảnh đề bài (chart / diagram / map)
          {needsImage && <span className="text-amber-600 dark:text-amber-400 font-bold">*</span>}
        </Label>
        {meta.stimulus_image_url ? (
          <div className="relative rounded-lg overflow-hidden border bg-card">
            <img src={meta.stimulus_image_url} alt="Stimulus" className="w-full max-h-64 object-contain" />
            <button
              type="button"
              onClick={() => update({ stimulus_image_url: undefined })}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md"
              title="Xoá ảnh"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-4 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-xs text-muted-foreground">Đang tải...</span></>
            ) : (
              <><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Click để tải ảnh đề bài (≤5MB)</span></>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>
    </div>
  );
}
