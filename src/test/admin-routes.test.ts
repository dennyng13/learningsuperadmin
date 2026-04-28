import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guard against post-rename regressions: every renamed admin route
 * (Courses / Classes / Attendance) must point at the expected component
 * AND the imported file must exist on disk. Static source check — no
 * React mount, no Supabase mock needed.
 */

const ROUTES_FILE = resolve(__dirname, "../admin/routes/AdminRoutes.tsx");
const SRC_ROOT = resolve(__dirname, "..");

const EXPECTED_ROUTES: Array<{
  label: string;
  routePath: string;
  component: string;
  importPath: string; // relative to src/, no extension
}> = [
  {
    label: "Courses",
    routePath: "courses",
    component: "CoursesPage",
    importPath: "admin/features/academic/pages/CoursesPage",
  },
  {
    label: "Classes",
    routePath: "classes",
    component: "ClassManagementPage",
    importPath: "admin/features/classes/pages/ClassManagementPage",
  },
  {
    label: "Classes (list)",
    routePath: "classes/list",
    component: "ClassesListPage",
    importPath: "admin/features/classes/pages/ClassesListPage",
  },
  // P5d: re-introduces /attendance route, now mapped to AttendanceMonitorPage.
  {
    label: "Attendance Monitor",
    routePath: "attendance",
    component: "AttendanceMonitorPage",
    importPath: "admin/features/attendance/pages/AttendanceMonitorPage",
  },
];

const FORBIDDEN_LEGACY_NAMES = [
  "TeachngoAttendancePage",
  "TeachngoTab",
  "TeachngoClassesTab",
];

const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "teachngo-attendance",       to: "/attendance" },
  { from: "teachngo-attendance/\\*",   to: "/attendance" },
  { from: "teachngo-classes",          to: "/classes" },
  { from: "teachngo-classes/list",     to: "/classes/list" },
  { from: "teachngo-classes/new",      to: "/classes/new" },
  { from: "teachngo-courses",          to: "/courses" },
  { from: "teachngo-courses/\\*",      to: "/courses" },
];

describe("AdminRoutes — post-rename mapping", () => {
  const source = readFileSync(ROUTES_FILE, "utf8");

  for (const r of EXPECTED_ROUTES) {
    it(`route "${r.routePath}" maps to <${r.component} />`, () => {
      const routeRe = new RegExp(
        `path=["']${r.routePath.replace(/\//g, "\\/")}["'][^>]*element=\\{[^}]*<${r.component}\\b`
      );
      expect(source).toMatch(routeRe);
    });

    it(`imports ${r.component} from "${r.importPath}"`, () => {
      const importRe = new RegExp(
        `import\\s+${r.component}\\s+from\\s+["']@${r.importPath}["']`
      );
      expect(source).toMatch(importRe);
    });

    it(`file exists for ${r.component}`, () => {
      const candidates = [
        resolve(SRC_ROOT, `${r.importPath}.tsx`),
        resolve(SRC_ROOT, `${r.importPath}.ts`),
      ];
      expect(candidates.some((p) => existsSync(p))).toBe(true);
    });
  }

  it("does not reference any legacy Teachngo* component names", () => {
    for (const legacy of FORBIDDEN_LEGACY_NAMES) {
      expect(source).not.toMatch(new RegExp(`\\b${legacy}\\b`));
    }
  });

  describe("legacy slug redirects", () => {
    for (const r of LEGACY_REDIRECTS) {
      it(`redirects "${r.from}" → "${r.to}"`, () => {
        const re = new RegExp(
          `path=["']${r.from}["'][^>]*element=\\{\\s*<Navigate\\s+to=["']${r.to}["']\\s+replace\\s*/>\\s*\\}`
        );
        expect(source).toMatch(re);
      });
    }

    it("preserves :id on /teachngo-classes/:id redirect", () => {
      expect(source).toMatch(/path=["']teachngo-classes\/:id["'][^>]*<TeachngoClassRedirect\b/);
      expect(source).toMatch(/replace\(\/\^\\\/teachngo-classes\/, ["']\/classes["']\)/);
    });
  });
});