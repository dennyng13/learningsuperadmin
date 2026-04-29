import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * useRooms — Phase F1 Step 1 wired to admin_* RPCs:
 *   - admin_create_room              (create mutation)
 *   - admin_update_room              (update mutation)
 *   - admin_archive_room             (archive mutation, returns jsonb result)
 *   - admin_check_room_conflict      (single-session helper)
 *   - admin_check_room_conflict_batch (batch helper)
 *
 * SELECT đi direct (RLS authenticated allow); mutations qua RPC (admin
 * guard inside). RPC #6 admin_assign_room_to_session deferred to Step 5
 * wizard integration.
 */

export interface Room {
  id: string;
  code: string;
  name: string;
  mode: "onsite" | "online" | "hybrid";
  capacity: number;
  address: string | null;
  meeting_link: string | null;
  status: "active" | "archived" | "under_maintenance";
  is_active: boolean;
  notes: string | null;
  branch: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RoomCreateInput {
  code: string;
  name: string;
  mode: "onsite" | "online" | "hybrid";
  capacity: number;
  address?: string | null;
  meeting_link?: string | null;
  status?: "active" | "archived" | "under_maintenance";
  notes?: string | null;
}

export type RoomUpdateInput = Partial<RoomCreateInput>;

/** Single conflict entry — matches admin_check_room_conflict jsonb shape. */
export interface RoomConflictInfo {
  session_id: string;
  class_id: string;
  class_name: string;
  class_code: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  teacher_id: string | null;
  teacher_name: string | null;
}

/** Return shape of admin_check_room_conflict (single). */
export interface RoomConflictResult {
  has_conflict: boolean;
  conflict_count: number;
  conflicts: RoomConflictInfo[];
}

/** Inner per-session entry inside batch result. */
export interface RoomConflictBatchEntry {
  session_index: number;
  session_date: string;
  start_time: string;
  end_time: string;
  conflicting_sessions: RoomConflictInfo[];
}

/** Return shape of admin_check_room_conflict_batch. */
export interface RoomConflictBatchResult {
  has_any_conflict: boolean;
  conflicts: RoomConflictBatchEntry[];
}

/** Result shape from admin_archive_room — caller must check `success`. */
export interface RoomArchiveResult {
  success: boolean;
  reason?: string;
  sessions_count?: number;
  message?: string;
}

/** List rooms. Default active only; includeArchived=true returns all. */
export function useRooms(opts: { includeArchived?: boolean } = {}) {
  const includeArchived = opts.includeArchived ?? false;
  return useQuery({
    queryKey: ["rooms", includeArchived],
    queryFn: async (): Promise<Room[]> => {
      let q = (supabase as any)
        .from("rooms")
        .select("*")
        .order("code", { ascending: true });
      if (!includeArchived) q = q.eq("status", "active");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Room[];
    },
  });
}

/** Fetch 1 room by id. */
export function useRoom(id: string | null) {
  return useQuery({
    queryKey: ["rooms", "detail", id],
    enabled: !!id,
    queryFn: async (): Promise<Room | null> => {
      const { data, error } = await (supabase as any)
        .from("rooms")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as Room | null) ?? null;
    },
  });
}

/** CRUD mutations bundled — pattern matches useTemplateMutations. */
export function useRoomMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (input: RoomCreateInput): Promise<string> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("admin_create_room", {
        p_room_data: input,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Đã tạo phòng");
    },
    onError: (e: Error) => toast.error(e?.message || "Lỗi tạo phòng"),
  });

  const update = useMutation({
    mutationFn: async (args: { id: string } & RoomUpdateInput): Promise<void> => {
      const { id, ...rest } = args;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("admin_update_room", {
        p_room_id: id,
        p_room_data: rest,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Đã cập nhật phòng");
    },
    onError: (e: Error) => toast.error(e?.message || "Lỗi cập nhật phòng"),
  });

  /* archive: NO toast in onSuccess — RPC may return success=false (e.g. when
     room has future sessions and force=false). Caller must check the jsonb
     result and decide UI accordingly. onError vẫn toast cho hard error. */
  const archive = useMutation({
    mutationFn: async (args: { id: string; force?: boolean }): Promise<RoomArchiveResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("admin_archive_room", {
        p_room_id: args.id,
        p_force: args.force ?? false,
      });
      if (error) throw error;
      return data as RoomArchiveResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (e: Error) => toast.error(e?.message || "Lỗi lưu trữ phòng"),
  });

  return { create, update, archive };
}

/** Single-session conflict check (used by Step3Sessions per-row). */
export async function checkRoomConflict(params: {
  room_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  exclude_session_id?: string;
}): Promise<RoomConflictResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("admin_check_room_conflict", {
    p_room_id: params.room_id,
    p_session_date: params.session_date,
    p_start_time: params.start_time,
    p_end_time: params.end_time,
    p_exclude_session_id: params.exclude_session_id ?? null,
  });
  if (error) throw error;
  return data as RoomConflictResult;
}

/** Batch conflict check (used by Step3RoomPicker before commit). */
export async function checkRoomConflictBatch(params: {
  room_id: string;
  sessions: Array<{ session_date: string; start_time: string; end_time: string }>;
}): Promise<RoomConflictBatchResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("admin_check_room_conflict_batch", {
    p_room_id: params.room_id,
    p_sessions: params.sessions,
  });
  if (error) throw error;
  return data as RoomConflictBatchResult;
}
