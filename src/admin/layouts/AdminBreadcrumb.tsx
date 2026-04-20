import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@shared/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/tests": "Đề thi",
  "/admin/import": "Import",
  "/admin/users": "Người dùng",
  "/admin/classes": "Lớp học",
  "/admin/modules": "Phân quyền",
  "/admin/flashcards": "Flashcard",
  "/admin/practice": "Bài tập",
  "/admin/badges": "Huy hiệu",
  "/admin/profile": "Hồ sơ",
  "/admin/settings": "Cài đặt",
  "/admin/teachngo-attendance": "Điểm danh",
};

function resolveLabel(pathname: string): { crumbs: { label: string; path: string }[] } {
  if (pathname === "/admin") {
    return { crumbs: [] };
  }

  const crumbs: { label: string; path: string }[] = [];

  // Try direct match first
  if (routeLabels[pathname]) {
    crumbs.push({ label: routeLabels[pathname], path: pathname });
    return { crumbs };
  }

  // Handle nested routes like /admin/tests/:id or /admin/student/:id/performance
  const segments = pathname.replace("/admin/", "").split("/");
  let built = "/admin";

  for (let i = 0; i < segments.length; i++) {
    built += "/" + segments[i];
    if (routeLabels[built]) {
      crumbs.push({ label: routeLabels[built], path: built });
    } else if (i === segments.length - 1 && segments[i] === "preview") {
      crumbs.push({ label: "Xem trước", path: built });
    } else if (i === segments.length - 1 && segments[i] === "performance") {
      crumbs.push({ label: "Kết quả học viên", path: built });
    } else if (segments[i] === "student") {
      // skip, will be handled by "performance"
    } else if (segments[i - 1] === "tests" || segments[i - 1] === "student") {
      // dynamic ID segment — add parent if not already added
      if (!crumbs.find(c => c.path === "/admin/" + segments[i - 1])) {
        const parentPath = "/admin/" + segments[i - 1];
        if (routeLabels[parentPath]) {
          crumbs.unshift({ label: routeLabels[parentPath], path: parentPath });
        }
      }
      if (segments[i - 1] === "tests") {
        crumbs.push({ label: "Chỉnh sửa", path: built });
      }
    }
  }

  return { crumbs };
}

export function AdminBreadcrumb() {
  const { pathname } = useLocation();
  const { crumbs } = resolveLabel(pathname);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin" className="text-[11px]">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage className="text-[11px] font-semibold">{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path} className="text-[11px]">{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
