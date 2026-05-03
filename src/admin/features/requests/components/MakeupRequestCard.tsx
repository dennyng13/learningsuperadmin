import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
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
import type { MakeupRequest } from "../hooks/useRequests";

// ============================================
// Makeup Request Card Component
// ============================================

interface MakeupRequestCardProps {
  request: MakeupRequest;
  onApprove: (id: string, adminNote?: string) => void;
  onReject: (id: string, adminNote: string) => void;
  isProcessing?: boolean;
}

const modeLabels: Record<string, string> = {
  online: "Online",
  offline: "Tại trung tâm",
  hybrid: "Hybrid",
};

const modeColors: Record<string, string> = {
  online: "bg-blue-100 text-blue-700",
  offline: "bg-green-100 text-green-700",
  hybrid: "bg-purple-100 text-purple-700",
};

export function MakeupRequestCard({
  request,
  onApprove,
  onReject,
  isProcessing = false,
}: MakeupRequestCardProps) {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

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
                  Yêu cầu báo bù lớp{" "}
                  <span className="font-medium text-blue-700">
                    {request.class_name || request.class_code}
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Chờ duyệt
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Proposed session details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(request.proposed_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  {request.proposed_start_time} - {request.proposed_end_time}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{request.proposed_room || "Chưa xác định phòng"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", modeColors[request.proposed_mode])}
                >
                  {modeLabels[request.proposed_mode]}
                </Badge>
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

          {/* Actions */}
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
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Duyệt yêu cầu báo bù
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-2 space-y-2">
                <p>
                  <strong>Lớp:</strong> {request.class_name || request.class_code}
                </p>
                <p>
                  <strong>Thời gian:</strong> {formatDate(request.proposed_date)} •{" "}
                  {request.proposed_start_time} - {request.proposed_end_time}
                </p>
                <p className="text-blue-600 bg-blue-50 p-2 rounded text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Sau khi duyệt, hệ thống sẽ tự động tạo buổi học mới và thông báo cho giáo viên.
                </p>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700">
                  Ghi chú (tùy chọn)
                </label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Thêm ghi chú cho giáo viên..."
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
              Từ chối yêu cầu báo bù
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
