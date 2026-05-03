import { useState } from "react";
import { CalendarPlus, User, GraduationCap, Clock, CheckCircle2, XCircle, AlertCircle, Building2, Video, Monitor } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Card, CardContent, CardHeader } from "@shared/components/ui/card";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { cn } from "@shared/lib/utils";
import type { StudentMakeupRequest } from "../hooks/useRequests";

// ============================================
// Student Makeup Request Card (Wave 2)
// Admin view for student makeup requests
// ============================================

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved: { label: "Đã duyệt", color: "bg-blue-100 text-blue-700 border-blue-200" },
  scheduled: { label: "Đã lên lịch", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Từ chối", color: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Đã hủy", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

const modeIcons: Record<string, React.ReactNode> = {
  online: <Video className="w-4 h-4" />,
  offline: <Building2 className="w-4 h-4" />,
  hybrid: <Monitor className="w-4 h-4" />,
};

const modeLabels: Record<string, string> = {
  online: "Online",
  offline: "Tại trung tâm",
  hybrid: "Hybrid",
};

interface StudentMakeupCardProps {
  request: StudentMakeupRequest;
  onApprove?: (id: string, note?: string) => void;
  onReject?: (id: string, note: string) => void;
  isProcessing?: boolean;
}

export function StudentMakeupCard({
  request,
  onApprove,
  onReject,
  isProcessing,
}: StudentMakeupCardProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  const status = statusConfig[request.status] || statusConfig.pending;
  const canAction = request.status === "pending" && onApprove && onReject;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleApprove = () => {
    onApprove?.(request.id, adminNote.trim() || undefined);
    setApproveDialogOpen(false);
    setAdminNote("");
  };

  const handleReject = () => {
    if (!adminNote.trim()) return;
    onReject?.(request.id, adminNote.trim());
    setRejectDialogOpen(false);
    setAdminNote("");
  };

  return (
    <>
      <Card className={cn("transition-all", canAction ? "hover:border-blue-300" : "opacity-90")}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white">
                <CalendarPlus className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Học sinh xin học bù</div>
                <div className="text-sm text-gray-500">{request.class_name || request.class_code}</div>
              </div>
            </div>
            <Badge variant="outline" className={cn(status.color)}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{request.student_name || request.student_email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <GraduationCap className="w-4 h-4 text-gray-500" />
              <span>{request.class_code}</span>
            </div>
          </div>

          {/* Proposed Schedule */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Đề xuất thời gian học bù
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">
                {formatDate(request.proposed_date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{request.proposed_start_time.slice(0, 5)} - {request.proposed_end_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {modeIcons[request.proposed_mode]}
              <span>{modeLabels[request.proposed_mode]}</span>
              {request.proposed_room && (
                <span className="text-gray-500">• Phòng {request.proposed_room}</span>
              )}
            </div>
          </div>

          {/* Original Session (if any) */}
          {request.original_session_date && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">Buổi học gốc:</span>{" "}
              {formatDate(request.original_session_date)}
            </div>
          )}

          {/* Reason */}
          <div className="text-sm">
            <span className="font-medium text-gray-700">Lý do học bù:</span>
            <p className="text-gray-600 mt-1">{request.reason}</p>
          </div>

          {/* Admin Note (if reviewed) */}
          {request.admin_note && (
            <div className="text-sm bg-blue-50 text-blue-700 p-2 rounded">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <span className="font-medium">Phản hồi:</span> {request.admin_note}
            </div>
          )}

          {/* Scheduled Session */}
          {request.scheduled_session_date && (
            <div className="text-sm bg-green-50 text-green-700 p-2 rounded">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              <span className="font-medium">Đã lên lịch:</span>{" "}
              {formatDate(request.scheduled_session_date)}
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Gửi: {new Date(request.created_at).toLocaleDateString("vi-VN")}</span>
            {request.reviewed_at && (
              <span>Duyệt: {new Date(request.reviewed_at).toLocaleDateString("vi-VN")}</span>
            )}
          </div>

          {/* Action Buttons */}
          {canAction && (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-green-300 hover:bg-green-50 text-green-700"
                onClick={() => setApproveDialogOpen(true)}
                disabled={isProcessing}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Duyệt
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-300 hover:bg-red-50 text-red-700"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Duyệt yêu cầu học bù
            </DialogTitle>
            <DialogDescription>
              Học sinh: <strong>{request.student_name}</strong>
              <br />
              Đề xuất: {formatDate(request.proposed_date)} • {request.proposed_start_time.slice(0, 5)} - {request.proposed_end_time.slice(0, 5)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <strong>Lưu ý:</strong> Sau khi duyệt, bạn cần tạo buổi học mới trong lịch lớp học.
            </div>

            <label className="text-sm font-medium text-gray-700">
              Ghi chú cho học sinh (tùy chọn)
            </label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="VD: Đã duyệt, vui lòng đến đúng giờ..."
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? "Đang xử lý..." : "Xác nhận duyệt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Từ chối yêu cầu học bù
            </DialogTitle>
            <DialogDescription>
              Học sinh: <strong>{request.student_name}</strong>
              <br />
              Lớp: {request.class_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="VD: Thời gian đề xuất trùng lịch, không thể sắp xếp giáo viên..."
              className="mt-2"
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing || !adminNote.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
