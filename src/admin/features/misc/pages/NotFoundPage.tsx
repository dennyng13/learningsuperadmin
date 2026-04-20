import { Link, useLocation } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import mascotConfused from "@/assets/mascot-confused.png";

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="min-h-[calc(100vh-2.75rem)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <img
          src={mascotConfused}
          alt="Không tìm thấy trang"
          className="w-40 h-40 mx-auto object-contain"
        />

        <div className="space-y-2">
          <h1 className="font-display text-6xl font-extrabold text-primary">404</h1>
          <h2 className="font-display text-2xl font-bold">Không tìm thấy trang</h2>
          <p className="text-muted-foreground text-sm">
            Đường dẫn{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs font-mono">
              {location.pathname}
            </code>{" "}
            không tồn tại trong Admin Portal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Về Dashboard
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Có thể bạn đang tìm:</p>
          <div className="flex flex-wrap gap-1.5 justify-center text-xs">
            <Link to="/tests" className="px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors">Tests</Link>
            <Link to="/users" className="px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors">Users</Link>
            <Link to="/classes" className="px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors">Classes</Link>
            <Link to="/study-plans" className="px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors">Study Plans</Link>
            <Link to="/settings" className="px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors">Settings</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
