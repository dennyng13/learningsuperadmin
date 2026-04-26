import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@shared/components/ui/breadcrumb";
import { adminNavItems } from "@shared/config/navigation";

// Group label hiển thị trong breadcrumb (không phải route — render plain text)
const GROUP_LABELS: Record<string, string> = {
  academic: "Học thuật",
  classes: "Lớp & Lịch",
  users: "Người dùng",
  hr: "Hành chính",
  system: "Hệ thống",
};

// Chỉ chèn cấp "group" vào breadcrumb cho các nhóm con (Người dùng / Nhân sự /
// Hệ thống / Lớp & Lịch). Group "academic" đã ở top-level nên bỏ qua.
const SHOW_GROUP_FOR = new Set(["users", "hr", "system", "classes"]);
const routeGroup: Record<string, string> = Object.fromEntries(
  adminNavItems
    .filter((i) => i.route !== "/" && SHOW_GROUP_FOR.has(i.group))
    .map((i) => [i.route, i.group]),
);

// Build label map from single source of truth (adminNavItems) + a few extras
// for nested / non-nav routes.
const EXTRA_LABELS: Record<string, string> = {
  "/profile": "Hồ sơ",
  "/teachers": "Giáo viên",
  "/teachers/availability": "Lịch rảnh",
  "/teachers/performance": "Hiệu suất",
  "/teachers/income": "Tính lương",
  "/study-plans/templates": "Mẫu kế hoạch",
  "/timesheet": "Bảng công",
  "/payroll": "Bảng lương",
  "/contracts/templates": "Mẫu hợp đồng",
  "/permissions": "Phân quyền",
};

const routeLabels: Record<string, string> = {
  ...Object.fromEntries(adminNavItems.map(i => [i.route, i.label])),
  ...EXTRA_LABELS,
};

interface Crumb { label: string; path: string }

const groupPrefix = (route: string): Crumb[] => {
  const g = routeGroup[route];
  if (!g) return [];
  const label = GROUP_LABELS[g];
  return label ? [{ label, path: "" }] : [];
};

function resolveCrumbs(pathname: string): Crumb[] {
  if (pathname === "/") return [];

  // Direct match
  if (routeLabels[pathname]) {
    return [...groupPrefix(pathname), { label: routeLabels[pathname], path: pathname }];
  }

  // Try nested matching with dynamic segments: /tests/:id, /users/:id/performance,
  // /placement/:id, /tests/:id/preview, /practice/:exerciseId/stats
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let built = "";

  for (let i = 0; i < segments.length; i++) {
    built += "/" + segments[i];
    const seg = segments[i];
    const prev = segments[i - 1];

    if (routeLabels[built]) {
      // Crumb đầu tiên có thể có group → prepend group label
      if (crumbs.length === 0) {
        crumbs.push(...groupPrefix(built));
      }
      crumbs.push({ label: routeLabels[built], path: built });
      continue;
    }

    // Terminal verbs
    if (i === segments.length - 1) {
      if (seg === "preview") { crumbs.push({ label: "Xem trước", path: built }); continue; }
      if (seg === "performance") { crumbs.push({ label: "Kết quả", path: built }); continue; }
      if (seg === "stats") { crumbs.push({ label: "Thống kê", path: built }); continue; }
      if (prev === "teachers") { crumbs.push({ label: "Hồ sơ giáo viên", path: built }); continue; }
    }

    // Dynamic ID under a known parent → add parent crumb once + "Chỉnh sửa"
    const parentPath = "/" + prev;
    if (prev && routeLabels[parentPath] && !crumbs.find(c => c.path === parentPath)) {
      // Prepend group nếu là crumb đầu
      if (crumbs.length === 0) {
        crumbs.push(...groupPrefix(parentPath));
      }
      crumbs.push({ label: routeLabels[parentPath], path: parentPath });
      if (prev === "tests" || prev === "placement") {
        crumbs.push({ label: "Chỉnh sửa", path: built });
      }
    }
  }

  return crumbs;
}

export function AdminBreadcrumb() {
  const { pathname } = useLocation();
  const crumbs = resolveCrumbs(pathname);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="text-[11px]">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, i) => (
          <span key={crumb.path || `group-${i}`} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.path === "" ? (
                <span className="text-[11px] text-muted-foreground">{crumb.label}</span>
              ) : i === crumbs.length - 1 ? (
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
