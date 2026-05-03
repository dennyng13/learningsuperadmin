import { useState } from "react";
import { CalendarX, User, GraduationCap, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
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
import type { StudentLeaveRequest } from "../hooks/useRequests";

// ============================================
// Student Leave Request Card (Wave 2)
// Admin view for student leave requests
// ============================================

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved: { label: "Đã duyệt", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Từ chối", color: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Đã hủy", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

interface StudentLeaveCardProps {
  request: StudentLeaveRequest;
  onApprove?: (id: string, note?: string) => void;
  onReject?: (id: string, note: string) => void;
  isProcessing?: boolean;
}

export function StudentLeaveCard({
  request,
  onApprove,
  onReject,
  isProcessing,
}: StudentLeaveCardProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  const status = statusConfig[request.status] || statusConfig.pending;
  const canAction = request.status === "pending" && onApprove && onReject;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Chưa xác định";
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
      <Card className={cn("transition-all", canAction ? "hover:border-yellow-300" : "opacity-90")}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
                <CalendarX className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Học sinh xin nghỉ</div>
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
            {request.session_date && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>
                  {formatDate(request.session_date)}
                  {request.session_start_time && (
                    <span> • {request.session_start_time.slice(0, 5)} - {request.session_end_time?.slice(0, 5)}</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="text-sm">
            <span className="font-medium text-gray-700">Lý do:</span>
            <p className="text-gray-600 mt-1">{request.reason}</p>
          </div>

          {/* Admin Note (if reviewed) */}
          {request.admin_note && (
            <div className="text-sm bg-blue-50 text-blue-700 p-2 rounded">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <span className="font-medium">Phản hồi:</span> {request.admin_note}
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
              Duyệt yêu cầu nghỉ học
            </DialogTitle>
            <DialogDescription>
              Học sinh: <strong>{request.student_name}</strong>
              <br />
              Lớp: {request.class_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">
              Ghi chú cho học sinh (tùy chọn)
            </label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="VD: Đã ghi nhận, buổi học sẽ được bù..."
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
              Từ chối yêu cầu nghỉ học
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
              placeholder="VD: Không đủ lý do chính đáng, đã quá số buổi nghỉ cho phép..."
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
