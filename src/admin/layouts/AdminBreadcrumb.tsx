import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@shared/components/ui/breadcrumb";
import { adminNavItems } from "@shared/config/navigation";

// Build label map from single source of truth (adminNavItems) + a few extras
// for nested / non-nav routes.
const EXTRA_LABELS: Record<string, string> = {
  "/profile": "Hồ sơ",
  "/study-plans/templates": "Mẫu kế hoạch",
};

const routeLabels: Record<string, string> = {
  ...Object.fromEntries(adminNavItems.map(i => [i.route, i.label])),
  ...EXTRA_LABELS,
};

interface Crumb { label: string; path: string }

function resolveCrumbs(pathname: string): Crumb[] {
  if (pathname === "/") return [];

  // Direct match
  if (routeLabels[pathname]) {
    return [{ label: routeLabels[pathname], path: pathname }];
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
      crumbs.push({ label: routeLabels[built], path: built });
      continue;
    }

    // Terminal verbs
    if (i === segments.length - 1) {
      if (seg === "preview") { crumbs.push({ label: "Xem trước", path: built }); continue; }
      if (seg === "performance") { crumbs.push({ label: "Kết quả", path: built }); continue; }
      if (seg === "stats") { crumbs.push({ label: "Thống kê", path: built }); continue; }
    }

    // Dynamic ID under a known parent → add parent crumb once + "Chỉnh sửa"
    const parentPath = "/" + prev;
    if (prev && routeLabels[parentPath] && !crumbs.find(c => c.path === parentPath)) {
      crumbs.unshift({ label: routeLabels[parentPath], path: parentPath });
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
