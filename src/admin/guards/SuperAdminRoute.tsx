import { Link } from "react-router-dom";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { Button } from "@shared/components/ui/button";

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-lg font-bold">Bạn không có quyền truy cập</h1>
            <p className="text-sm text-muted-foreground">
              Trang này chỉ dành cho Super Admin. Liên hệ quản trị viên nếu bạn cần quyền truy cập.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}