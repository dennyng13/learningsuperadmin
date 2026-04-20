import { lazy, Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@shared/components/misc/ErrorBoundary";
import { ProtectedAdminRoute } from "@admin/guards/ProtectedAdminRoute";

const AdminLayout = lazy(() => import("@admin/layouts/AdminLayout"));

/* ── Public ── */
const AdminLoginPage = lazy(() => import("@admin/features/auth/pages/AdminLoginPage"));
const ResetPasswordPage = lazy(() => import("@admin/features/auth/pages/ResetPasswordPage"));

/* ── Pages ── */
const AdminDashboardPage = lazy(() => import("@admin/features/dashboard/pages/AdminDashboardPage"));
const AdminProfilePage = lazy(() => import("@admin/features/auth/pages/AdminProfilePage"));
const TestManagementPage = lazy(() => import("@admin/features/tests/pages/TestManagementPage"));
const TestEditorPage = lazy(() => import("@admin/features/tests/pages/TestEditorPage"));
const TestPreviewPage = lazy(() => import("@admin/features/tests/pages/TestPreviewPage"));
const ImportPage = lazy(() => import("@admin/features/tests/pages/ImportPage"));
const UserManagementPage = lazy(() => import("@admin/features/users/pages/UserManagementPage"));
const ClassManagementPage = lazy(() => import("@admin/features/classes/pages/ClassManagementPage"));
const ModulePermissionsPage = lazy(() => import("@admin/features/modules/pages/ModulePermissionsPage"));
const FlashcardSetsPage = lazy(() => import("@admin/features/flashcards/pages/FlashcardSetsPage"));
const PracticeExerciseDetailPage = lazy(() => import("@admin/features/practice/pages/PracticeExerciseDetailPage"));
const BadgeManagementPage = lazy(() => import("@admin/features/badges/pages/BadgeManagementPage"));
const TeachngoAttendancePage = lazy(() => import("@admin/features/attendance/pages/TeachngoAttendancePage"));
const StudentPerformancePage = lazy(() => import("@admin/features/performance/pages/StudentPerformancePage"));
const TeacherPerformancePage = lazy(() => import("@admin/features/performance/pages/TeacherPerformancePage"));
const AdminSettingsPage = lazy(() => import("@admin/features/settings/pages/AdminSettingsPage"));
const StudyPlansPage = lazy(() => import("@admin/features/study-plans/pages/StudyPlansPage"));
const StudyPlanTemplatesPage = lazy(() => import("@admin/features/study-plans/pages/StudyPlanTemplatesPage"));
const PlacementTestPage = lazy(() => import("@admin/features/placement/pages/PlacementTestPage"));
const PlacementTestEditorPage = lazy(() => import("@admin/features/placement/pages/PlacementTestEditorPage"));
const AdminSchedulePage = lazy(() => import("@admin/features/schedule/pages/AdminSchedulePage"));
const NotFoundPage = lazy(() => import("@admin/features/misc/pages/NotFoundPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ─── Public ─── */}
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ─── Legacy redirects (back-compat for old /admin/* URLs) ─── */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin/*" element={<LegacyAdminRedirect />} />

        {/* ─── Protected ─── */}
        <Route element={<ProtectedAdminRoute><ErrorBoundary><AdminLayout /></ErrorBoundary></ProtectedAdminRoute>}>
          <Route index element={<AdminDashboardPage />} />

          {/* Tests / Practice */}
          <Route path="tests" element={<TestManagementPage />} />
          <Route path="tests/import" element={<ImportPage />} />
          <Route path="tests/:id" element={<TestEditorPage />} />
          <Route path="tests/:id/preview" element={<TestPreviewPage />} />
          <Route path="practice/:exerciseId/stats" element={<PracticeExerciseDetailPage />} />

          {/* Users (with nested performance) */}
          <Route path="users" element={<UserManagementPage />} />
          <Route path="users/:userId/performance" element={<StudentPerformancePage />} />

          {/* Classes & Schedule */}
          <Route path="classes" element={<ClassManagementPage />} />
          <Route path="schedule" element={<AdminSchedulePage />} />
          <Route path="attendance" element={<TeachngoAttendancePage />} />

          {/* Study plans (templates nested) */}
          <Route path="study-plans" element={<StudyPlansPage />} />
          <Route path="study-plans/templates" element={<StudyPlanTemplatesPage />} />

          {/* Placement */}
          <Route path="placement" element={<PlacementTestPage />} />
          <Route path="placement/:id" element={<PlacementTestEditorPage />} />

          {/* Performance */}
          <Route path="performance/teachers" element={<TeacherPerformancePage />} />

          {/* Misc */}
          <Route path="flashcards" element={<FlashcardSetsPage />} />
          <Route path="badges" element={<BadgeManagementPage />} />
          <Route path="profile" element={<AdminProfilePage />} />

          {/* System */}
          <Route path="modules" element={<ModulePermissionsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />

          {/* 404 */}
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

/** Strip /admin prefix from any legacy URL and redirect once. */
function LegacyAdminRedirect() {
  const { pathname, search, hash } = window.location;
  const stripped = pathname.replace(/^\/admin/, "") || "/";
  return <Navigate to={`${stripped}${search}${hash}`} replace />;
}
