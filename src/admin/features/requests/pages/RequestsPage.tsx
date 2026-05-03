import { useState } from "react";
import {
  ClipboardList,
  Clock,
  History,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import { EmptyMascot } from "@shared/components/ui/empty-mascot";
import { HeroBoard } from "@shared/components/ui/hero-board";
import { MakeupRequestCard } from "../components/MakeupRequestCard";
import { SubstituteRequestCard } from "../components/SubstituteRequestCard";
import {
  usePendingMakeupRequests,
  useHistoryMakeupRequests,
  usePendingSubstituteRequests,
  useHistorySubstituteRequests,
  useApproveMakeupRequest,
  useRejectMakeupRequest,
  useApproveSubstituteRequest,
  useRejectSubstituteRequest,
} from "../hooks/useRequests";

// ============================================
// Admin Requests Inbox Page
// F-Requests-Inbox-Admin — Migration A Wave 1
// ============================================

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState("makeup-pending");

  // Queries
  const pendingMakeupQuery = usePendingMakeupRequests();
  const historyMakeupQuery = useHistoryMakeupRequests();
  const pendingSubstituteQuery = usePendingSubstituteRequests();
  const historySubstituteQuery = useHistorySubstituteRequests();

  // Mutations
  const approveMakeupMutation = useApproveMakeupRequest();
  const rejectMakeupMutation = useRejectMakeupRequest();
  const approveSubstituteMutation = useApproveSubstituteRequest();
  const rejectSubstituteMutation = useRejectSubstituteRequest();

  // Refresh all queries
  const handleRefresh = () => {
    pendingMakeupQuery.refetch();
    historyMakeupQuery.refetch();
    pendingSubstituteQuery.refetch();
    historySubstituteQuery.refetch();
  };

  const isLoading =
    pendingMakeupQuery.isLoading ||
    pendingSubstituteQuery.isLoading;

  const pendingMakeupCount = pendingMakeupQuery.data?.length || 0;
  const pendingSubstituteCount = pendingSubstituteQuery.data?.length || 0;
  const totalPending = pendingMakeupCount + pendingSubstituteCount;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <HeroBoard
        title="Quản lý yêu cầu"
        subtitle="Xử lý báo bù và báo dạy thế từ giáo viên"
        illustration={<ClipboardList className="w-8 h-8 text-blue-600" />}
        className="border-b"
      >
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Làm mới
        </Button>
      </HeroBoard>

      {/* Stats summary */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{pendingMakeupCount}</div>
              <div className="text-sm text-gray-500">Báo bù chờ duyệt</div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{pendingSubstituteCount}</div>
              <div className="text-sm text-gray-500">Báo dạy thế chờ xử lý</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit">
            <TabsTrigger value="makeup-pending" className="relative">
              Báo bù
              {pendingMakeupCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-red-100 text-red-700"
                >
                  {pendingMakeupCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="substitute-pending" className="relative">
              Báo dạy thế
              {pendingSubstituteCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-yellow-100 text-yellow-700"
                >
                  {pendingSubstituteCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Lịch sử
            </TabsTrigger>
          </TabsList>

          {/* Makeup Pending Tab */}
          <TabsContent value="makeup-pending" className="space-y-4">
            {isLoading ? (
              <LoadingCards count={2} />
            ) : pendingMakeupQuery.data?.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-12 h-12 text-green-500" />}
                title="Không có yêu cầu báo bù chờ duyệt"
                description="Tất cả yêu cầu báo bù đã được xử lý"
              />
            ) : (
              <div className="space-y-4">
                {pendingMakeupQuery.data?.map((request) => (
                  <MakeupRequestCard
                    key={request.id}
                    request={request}
                    onApprove={(id, note) => approveMakeupMutation.mutate({ id, adminNote: note })}
                    onReject={(id, note) => rejectMakeupMutation.mutate({ id, adminNote: note })}
                    isProcessing={
                      approveMakeupMutation.isPending ||
                      rejectMakeupMutation.isPending
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Substitute Pending Tab */}
          <TabsContent value="substitute-pending" className="space-y-4">
            {isLoading ? (
              <LoadingCards count={2} />
            ) : pendingSubstituteQuery.data?.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-12 h-12 text-green-500" />}
                title="Không có yêu cầu dạy thế chờ xử lý"
                description="Tất cả yêu cầu dạy thế đã được xử lý"
              />
            ) : (
              <div className="space-y-4">
                {pendingSubstituteQuery.data?.map((request) => (
                  <SubstituteRequestCard
                    key={request.id}
                    request={request}
                    onApprove={(id, note) => approveSubstituteMutation.mutate({ id, adminNote: note })}
                    onReject={(id, note) => rejectSubstituteMutation.mutate({ id, adminNote: note })}
                    isProcessing={
                      approveSubstituteMutation.isPending ||
                      rejectSubstituteMutation.isPending
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-6">
              {/* Makeup History */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Lịch sử báo bù
                </h3>
                {historyMakeupQuery.isLoading ? (
                  <LoadingCards count={1} />
                ) : historyMakeupQuery.data?.length === 0 ? (
                  <EmptyState
                    icon={<History className="w-10 h-10 text-gray-400" />}
                    title="Chưa có lịch sử báo bù"
                    description="Các yêu cầu đã xử lý sẽ hiển thị ở đây"
                  />
                ) : (
                  <div className="space-y-4">
                    {historyMakeupQuery.data?.map((request) => (
                      <MakeupRequestCard
                        key={request.id}
                        request={request}
                        onApprove={() => {}}
                        onReject={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Substitute History */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Lịch sử báo dạy thế
                </h3>
                {historySubstituteQuery.isLoading ? (
                  <LoadingCards count={1} />
                ) : historySubstituteQuery.data?.length === 0 ? (
                  <EmptyState
                    icon={<History className="w-10 h-10 text-gray-400" />}
                    title="Chưa có lịch sử dạy thế"
                    description="Các yêu cầu đã xử lý sẽ hiển thị ở đây"
                  />
                ) : (
                  <div className="space-y-4">
                    {historySubstituteQuery.data?.map((request) => (
                      <SubstituteRequestCard
                        key={request.id}
                        request={request}
                        onApprove={() => {}}
                        onReject={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12 bg-white rounded-lg border">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="text-gray-500 mt-1">{description}</p>
    </div>
  );
}
