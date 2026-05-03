import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  MessageSquare,
  CheckCircle2,
  XCircle,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Textarea } from "@shared/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { cn } from "@shared/lib/utils";
import type { SubstituteRequest } from "../hooks/useRequests";

// ============================================
// Substitute Request Card Component
// ============================================

interface SubstituteRequestCardProps {
  request: SubstituteRequest;
  onApprove: (id: string, adminNote?: string) => void;
  onReject: (id: string, adminNote: string) => void;
  isProcessing?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; color: string; description: string }
> = {
  pending: {
    label: "Chờ GV xác nhận",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    description: "Giáo viên được đề xuất chưa xác nhận",
  },
  substitute_confirmed: {
    label: "GV đã xác nhận - Chờ duyệt",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Giáo viên dạy thế đã đồng ý, chờ Admin phê duyệt",
  },
  substitute_declined: {
    label: "GV từ chối",
    color: "bg-red-100 text-red-700 border-red-200",
    description: "Giáo viên được đề xuất đã từ chối",
  },
  admin_approved: {
    label: "Đã duyệt",
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Admin đã phê duyệt",
  },
  admin_rejected: {
    label: "Admin từ chối",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    description: "Admin đã từ chối yêu cầu",
  },
  cancelled: {
    label: "Đã hủy",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    description: "Yêu cầu đã bị hủy",
  },
  completed: {
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Buổi dạy thế đã hoàn thành",
  },
};

export function SubstituteRequestCard({
  request,
  onApprove,
  onReject,
  isProcessing = false,
}: SubstituteRequestCardProps) {
  const navigate = useNavigate();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  const handleApprove = () => {
    onApprove(request.id, adminNote);
    setShowApproveDialog(false);
    setAdminNote("");
  };

  const handleReject = () => {
    if (!adminNote.trim()) return;
    onReject(request.id, adminNote);
    setShowRejectDialog(false);
    setAdminNote("");
  };

  const handleFindReplacement = () => {
    // Navigate to class lifecycle tab for requesting replacement
    navigate(`/classes/${request.class_id}?tab=lifecycle`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Chưa xác định";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const status = statusConfig[request.status] || statusConfig.pending;
  const isPendingApproval =
    request.status === "substitute_confirmed" || request.status === "pending";
  const isDeclined = request.status === "substitute_declined";

  return (
    <>
      <Card className="hover:border-blue-300 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                {request.requester_name?.charAt(0) || "?"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {request.requester_name || "Không xác định"}
                  </span>
                  <span className="text-xs text-gray-500">
                    • {new Date(request.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Yêu cầu dạy thế lớp{" "}
                  <span className="font-medium text-blue-700">
                    {request.class_name || request.class_code}
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className={cn(status.color)}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Substitute info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Giáo viên dạy thế được đề xuất:
              </span>
            </div>
            {request.substitute_name ? (
              <div className="flex items-center gap-2 pl-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-sm">
                  {request.substitute_name.charAt(0)}
                </div>
                <span className="font-medium text-gray-900">
                  {request.substitute_name}
                </span>
                {request.substitute_confirmed_at && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    Đã xác nhận
                  </Badge>
                )}
              </div>
            ) : (
              <div className="pl-6 text-sm text-gray-500">
                Chưa có giáo viên được đề xuất
              </div>
            )}

            {/* Session details */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(request.session_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  {request.session_start_time || "??:??"} -{" "}
                  {request.session_end_time || "??:??"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>Phòng: {request.session_room || "Chưa xác định"}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="flex items-start gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-700">Lý do:</div>
              <div className="text-sm text-gray-600">{request.reason}</div>
            </div>
          </div>

          {/* Admin note if exists */}
          {request.admin_note && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800">
                <span className="font-medium">Ghi chú Admin:</span>{" "}
                {request.admin_note}
              </div>
            </div>
          )}

          {/* Actions */}
          {isPendingApproval ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setShowRejectDialog(true)}
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowApproveDialog(true)}
                disabled={isProcessing}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Duyệt
              </Button>
            </div>
          ) : isDeclined ? (
            <Button
              variant="outline"
              className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={handleFindReplacement}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Tìm giáo viên thay thế
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Duyệt yêu cầu dạy thế
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-2 space-y-2">
                <p>
                  <strong>Lớp:</strong> {request.class_name || request.class_code}
                </p>
                <p>
                  <strong>Giáo viên dạy thế:</strong>{" "}
                  {request.substitute_name || "Chưa có"}
                </p>
                <p>
                  <strong>Thời gian:</strong> {formatDate(request.session_date)}
                </p>
                <p className="text-blue-600 bg-blue-50 p-2 rounded text-sm">
                  Sau khi duyệt, giáo viên dạy thế sẽ được thông báo và được thêm vào lịch dạy.
                </p>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700">
                  Ghi chú (tùy chọn)
                </label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Thêm ghi chú..."
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAdminNote("")}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Xác nhận duyệt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Từ chối yêu cầu dạy thế
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-2">
                <label className="text-sm font-medium text-gray-700">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Vui lòng cho biết lý do từ chối..."
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAdminNote("")}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!adminNote.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Xác nhận từ chối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
