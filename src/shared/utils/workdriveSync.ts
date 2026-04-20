/**
 * Upload a file to Zoho WorkDrive via edge function.
 * Used by both admin AudioUploader and student recording uploads.
 */
export async function uploadToWorkDrive(opts: {
  file: File | Blob;
  fileName: string;
  category: "bai_thi" | "bai_tap" | "students";
  skill: "listening" | "speaking" | "";
  itemName: string;
  entityType?: string;
  entityId?: string;
  audioUrl?: string;
  studentName?: string;
}): Promise<{ file_id: string; file_name: string } | null> {
  try {
    const formData = new FormData();
    formData.append("file", opts.file, opts.fileName);
    formData.append("category", opts.category);
    formData.append("item_name", opts.itemName);
    formData.append("file_name", opts.fileName);
    formData.append("skill", opts.skill);
    if (opts.entityType) formData.append("entity_type", opts.entityType);
    if (opts.entityId) formData.append("entity_id", opts.entityId);
    if (opts.audioUrl) formData.append("audio_url", opts.audioUrl);
    if (opts.studentName) formData.append("student_name", opts.studentName);
    if (opts.audioUrl) formData.append("audio_url", opts.audioUrl);

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/zoho-workdrive?action=upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    if (data.success) {
      return { file_id: data.file_id, file_name: data.file_name };
    }
    console.error("WorkDrive upload failed:", data);
    return null;
  } catch (err) {
    console.error("WorkDrive upload error:", err);
    return null;
  }
}

export async function deleteFromWorkDrive(fileId: string): Promise<boolean> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/zoho-workdrive?action=delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      }
    );
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("WorkDrive delete error:", err);
    return false;
  }
}

/**
 * Look up WorkDrive sync record by entity and delete the file from WorkDrive.
 * Used when removing audio/images from exercises or tests.
 */
export async function deleteWorkDriveByEntity(
  supabaseClient: { from: (table: string) => any },
  entityType: string,
  entityId: string,
): Promise<boolean> {
  try {
    const { data } = await supabaseClient
      .from("workdrive_sync")
      .select("workdrive_file_id")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (data?.workdrive_file_id) {
      return deleteFromWorkDrive(data.workdrive_file_id);
    }
    return false;
  } catch (err) {
    console.error("WorkDrive entity delete error:", err);
    return false;
  }
}
