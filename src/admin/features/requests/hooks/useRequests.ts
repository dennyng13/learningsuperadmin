import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================
// Types from schema
// ============================================
export type SubstituteRequest = {
  id: string;
  class_id: string;
  session_id: string | null;
  requested_by_user_id: string;
  proposed_substitute_user_id: string | null;
  status: 'pending' | 'substitute_confirmed' | 'substitute_declined' | 'admin_approved' | 'admin_rejected' | 'cancelled' | 'completed';
  reason: string;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  substitute_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  class_name?: string;
  class_code?: string;
  requester_name?: string;
  substitute_name?: string | null;
  session_date?: string | null;
  session_start_time?: string | null;
  session_end_time?: string | null;
  session_room?: string | null;
};

export type MakeupRequest = {
  id: string;
  class_id: string;
  original_session_id: string | null;
  proposed_date: string;
  proposed_start_time: string;
  proposed_end_time: string;
  proposed_room: string | null;
  proposed_mode: 'online' | 'offline' | 'hybrid';
  created_session_id: string | null;
  requested_by_user_id: string;
  status: 'pending' | 'approved' | 'scheduled' | 'completed' | 'rejected' | 'cancelled';
  reason: string;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  class_name?: string;
  class_code?: string;
  requester_name?: string;
};

export type StudentLeaveRequest = {
  id: string;
  user_id: string;
  class_id: string;
  session_id: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data from view
  student_email?: string;
  student_name?: string;
  class_name?: string;
  class_code?: string;
  session_date?: string | null;
  session_start_time?: string | null;
  session_end_time?: string | null;
};

export type StudentMakeupRequest = {
  id: string;
  user_id: string;
  class_id: string;
  original_session_id: string | null;
  proposed_date: string;
  proposed_start_time: string;
  proposed_end_time: string;
  proposed_room: string | null;
  proposed_mode: 'online' | 'offline' | 'hybrid';
  reason: string;
  status: 'pending' | 'approved' | 'scheduled' | 'rejected' | 'cancelled';
  created_session_id: string | null;
  admin_note: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data from view
  student_email?: string;
  student_name?: string;
  class_name?: string;
  class_code?: string;
  original_session_date?: string | null;
  scheduled_session_date?: string | null;
};

// ============================================
// Queries
// ============================================

const fetchSubstituteRequests = async (statusFilter?: string[]): Promise<SubstituteRequest[]> => {
  let query = supabase
    .from("substitute_request")
    .select(`
      *,
      class:class_id(class_name, class_code),
      requester:requested_by_user_id(full_name),
      substitute:proposed_substitute_user_id(full_name),
      session:session_id(session_date, start_time, end_time, room)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.in("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    class_name: item.class?.class_name,
    class_code: item.class?.class_code,
    requester_name: item.requester?.full_name,
    substitute_name: item.substitute?.full_name,
    session_date: item.session?.session_date,
    session_start_time: item.session?.start_time,
    session_end_time: item.session?.end_time,
    session_room: item.session?.room,
  }));
};

const fetchMakeupRequests = async (statusFilter?: string[]): Promise<MakeupRequest[]> => {
  let query = supabase
    .from("makeup_request")
    .select(`
      *,
      class:class_id(class_name, class_code),
      requester:requested_by_user_id(full_name)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.in("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    class_name: item.class?.class_name,
    class_code: item.class?.class_code,
    requester_name: item.requester?.full_name,
  }));
};

// ============================================
// Mutations
// ============================================

const approveMakeupRequest = async ({
  id,
  adminNote,
}: {
  id: string;
  adminNote?: string;
}): Promise<void> => {
  const { error } = await supabase
    .from("makeup_request")
    .update({
      status: "approved",
      admin_note: adminNote || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    // Check for trigger conflict error
    if (error.message?.includes("Conflict")) {
      throw new Error("Trùng lịch với buổi học khác trong cùng lớp");
    }
    throw error;
  }
};

const rejectMakeupRequest = async ({
  id,
  adminNote,
}: {
  id: string;
  adminNote: string;
}): Promise<void> => {
  const { error } = await supabase
    .from("makeup_request")
    .update({
      status: "rejected",
      admin_note: adminNote,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
};

const approveSubstituteRequest = async ({
  id,
  adminNote,
}: {
  id: string;
  adminNote?: string;
}): Promise<void> => {
  const { error } = await supabase
    .from("substitute_request")
    .update({
      status: "admin_approved",
      admin_note: adminNote || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
};

const rejectSubstituteRequest = async ({
  id,
  adminNote,
}: {
  id: string;
  adminNote: string;
}): Promise<void> => {
  const { error } = await supabase
    .from("substitute_request")
    .update({
      status: "admin_rejected",
      admin_note: adminNote,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
};

// ============================================
// React Query Hooks
// ============================================

export const usePendingSubstituteRequests = () => {
  return useQuery({
    queryKey: ["substitute-requests", "pending"],
    queryFn: () => fetchSubstituteRequests(["pending", "substitute_confirmed", "substitute_declined"]),
  });
};

export const useHistorySubstituteRequests = () => {
  return useQuery({
    queryKey: ["substitute-requests", "history"],
    queryFn: () => fetchSubstituteRequests(["admin_approved", "admin_rejected", "cancelled", "completed"]),
  });
};

export const usePendingMakeupRequests = () => {
  return useQuery({
    queryKey: ["makeup-requests", "pending"],
    queryFn: () => fetchMakeupRequests(["pending"]),
  });
};

export const useHistoryMakeupRequests = () => {
  return useQuery({
    queryKey: ["makeup-requests", "history"],
    queryFn: () => fetchMakeupRequests(["scheduled", "completed", "rejected", "cancelled"]),
  });
};

export const useApproveMakeupRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveMakeupRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["makeup-requests"] });
      toast.success("Đã duyệt yêu cầu báo bù. Buổi học mới đã được tạo tự động.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể duyệt yêu cầu");
    },
  });
};

export const useRejectMakeupRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectMakeupRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["makeup-requests"] });
      toast.success("Đã từ chối yêu cầu báo bù");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể từ chối yêu cầu");
    },
  });
};

export const useApproveSubstituteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveSubstituteRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitute-requests"] });
      toast.success("Đã duyệt yêu cầu dạy thế");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể duyệt yêu cầu");
    },
  });
};

export const useRejectSubstituteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectSubstituteRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitute-requests"] });
      toast.success("Đã từ chối yêu cầu dạy thế");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể từ chối yêu cầu");
    },
  });
};

// ============================================
// Student Request Queries (Wave 2)
// ============================================

const fetchStudentLeaveRequests = async (statusFilter?: string[]): Promise<StudentLeaveRequest[]> => {
  let query = supabase
    .from("v_student_leave_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.in("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

const fetchStudentMakeupRequests = async (statusFilter?: string[]): Promise<StudentMakeupRequest[]> => {
  let query = supabase
    .from("v_student_makeup_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.in("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

// ============================================
// Student Request Mutations
// ============================================

const approveStudentLeaveRequest = async ({
  id,
  adminNote,
}: {
  id: string;
  adminNote?: string;
}): Promise<void> => {
  const { error } = await supabase.rpc("admin_review_student_leave", {
    p_request_id: id,
    p_status: "approved",
    p_admin_note: adminNote || null,
  });

  if (error) throw error;
};

const rejectStudentLeaveRequest = async ({
  id,
  adminNote,
}: {
  id: string;
  adminNote: string;
}): Promise<void> => {
  const { error } = await supabase.rpc("admin_review_student_leave", {
    p_request_id: id,
    p_status: "rejected",
    p_admin_note: adminNote,
  });

  if (error) throw error;
};

const approveStudentMakeupRequest = async ({
  id,
  adminNote,
  createdSessionId,
}: {
  id: string;
  adminNote?: string;
  createdSessionId?: string;
}): Promise<void> => {
  const { error } = await supabase.rpc("admin_review_student_makeup", {
    p_request_id: id,
    p_status: "approved",
    p_admin_note: adminNote || null,
    p_created_session_id: createdSessionId || null,
  });

  if (error) throw error;
};

const rejectStudentMakeupRequest = async ({
  id,
  adminNote,
}: {
  id: string;
  adminNote: string;
}): Promise<void> => {
  const { error } = await supabase.rpc("admin_review_student_makeup", {
    p_request_id: id,
    p_status: "rejected",
    p_admin_note: adminNote,
  });

  if (error) throw error;
};

// ============================================
// Student Request React Query Hooks
// ============================================

export const usePendingStudentLeaveRequests = () => {
  return useQuery({
    queryKey: ["student-leave-requests", "pending"],
    queryFn: () => fetchStudentLeaveRequests(["pending"]),
  });
};

export const useHistoryStudentLeaveRequests = () => {
  return useQuery({
    queryKey: ["student-leave-requests", "history"],
    queryFn: () => fetchStudentLeaveRequests(["approved", "rejected", "cancelled"]),
  });
};

export const usePendingStudentMakeupRequests = () => {
  return useQuery({
    queryKey: ["student-makeup-requests", "pending"],
    queryFn: () => fetchStudentMakeupRequests(["pending"]),
  });
};

export const useHistoryStudentMakeupRequests = () => {
  return useQuery({
    queryKey: ["student-makeup-requests", "history"],
    queryFn: () => fetchStudentMakeupRequests(["approved", "scheduled", "rejected", "cancelled"]),
  });
};

export const useApproveStudentLeaveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveStudentLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-leave-requests"] });
      toast.success("Đã duyệt yêu cầu nghỉ học của học sinh");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể duyệt yêu cầu");
    },
  });
};

export const useRejectStudentLeaveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectStudentLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-leave-requests"] });
      toast.success("Đã từ chối yêu cầu nghỉ học");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể từ chối yêu cầu");
    },
  });
};

export const useApproveStudentMakeupRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveStudentMakeupRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-makeup-requests"] });
      toast.success("Đã duyệt yêu cầu học bù. Vui lòng tạo buổi học mới.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể duyệt yêu cầu");
    },
  });
};

export const useRejectStudentMakeupRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectStudentMakeupRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-makeup-requests"] });
      toast.success("Đã từ chối yêu cầu học bù");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể từ chối yêu cầu");
    },
  });
};
