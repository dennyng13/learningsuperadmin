import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useMyModuleAccess, type AdminModuleKey } from "@shared/hooks/useUserModuleAccess";

interface Props {
  moduleKey: AdminModuleKey;
  children: React.ReactNode;
}

/**
 * Guard wrapping admin sub-pages whose access is gated by
 * `user_module_access`. super_admin always passes; other admins fall back
 * to row in DB (default enabled when no row).
 *
 * Khi bị từ chối: toast + redirect về /library (hub cha).
 */
export function ModuleAccessRoute({ moduleKey, children }: Props) {
  const { canAccess, loading } = useMyModuleAccess();
  const allowed = canAccess(moduleKey);

  useEffect(() => {
    if (!loading && !allowed) {
      toast.error("Bạn không có quyền truy cập trang này");
    }
  }, [loading, allowed]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) return <Navigate to="/library" replace />;

  return <>{children}</>;
}
