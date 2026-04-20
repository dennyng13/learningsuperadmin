import { Navigate } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-bold">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
