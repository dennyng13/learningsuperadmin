import { Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@shared/components/misc/ErrorBoundary";
import { ProtectedAdminRoute } from "@admin/guards/ProtectedAdminRoute";
import AdminLayout from "@admin/layouts/AdminLayout";
import AdminLoginPage from "@admin/features/auth/pages/AdminLoginPage";
import ResetPasswordPage from "@admin/features/auth/pages/ResetPasswordPage";
import AdminDashboardPage from "@admin/features/dashboard/pages/AdminDashboardPage";
import AdminProfilePage from "@admin/features/auth/pages/AdminProfilePage";
import TestManagementPage from "@admin/features/tests/pages/TestManagementPage";
import TestEditorPage from "@admin/features/tests/pages/TestEditorPage";
import TestPreviewPage from "@admin/features/tests/pages/TestPreviewPage";
import ImportPage from "@admin/features/tests/pages/ImportPage";
import UserManagementPage from "@admin/features/users/pages/UserManagementPage";
import TeacherManagementPage from "@admin/features/users/pages/TeacherManagementPage";
import TeacherProfilePage from "@admin/features/users/pages/TeacherProfilePage";
import ClassManagementPage from "@admin/features/classes/pages/ClassManagementPage";
import CreateClassWizardPage from "@admin/features/classes/pages/CreateClassWizardPage";
import ModulePermissionsPage from "@admin/features/modules/pages/ModulePermissionsPage";
import FlashcardSetsPage from "@admin/features/flashcards/pages/FlashcardSetsPage";
import PracticeExerciseDetailPage from "@admin/features/practice/pages/PracticeExerciseDetailPage";
import BadgeManagementPage from "@admin/features/badges/pages/BadgeManagementPage";
import TeachngoAttendancePage from "@admin/features/attendance/pages/TeachngoAttendancePage";
import StudentPerformancePage from "@admin/features/performance/pages/StudentPerformancePage";
import TeacherPerformancePage from "@admin/features/performance/pages/TeacherPerformancePage";
import AdminSettingsPage from "@admin/features/settings/pages/AdminSettingsPage";
import EmailTemplatePreviewPage from "@admin/features/settings/pages/EmailTemplatePreviewPage";
import FeatureFlagsPage from "@admin/features/feature-flags/pages/FeatureFlagsPage";
import StudyPlansPage from "@admin/features/study-plans/pages/StudyPlansPage";
import StudyPlanTemplatesPage from "@admin/features/study-plans/pages/StudyPlanTemplatesPage";
import PlacementTestPage from "@admin/features/placement/pages/PlacementTestPage";
import PlacementTestEditorPage from "@admin/features/placement/pages/PlacementTestEditorPage";
import AdminSchedulePage from "@admin/features/schedule/pages/AdminSchedulePage";
import AvailabilityDraftsPage from "@admin/features/availability-drafts/pages/AvailabilityDraftsPage";
import NotFoundPage from "@admin/features/misc/pages/NotFoundPage";
import HealthCheckPage from "@admin/features/misc/pages/HealthCheckPage";

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
        <Route path="/health-check" element={<HealthCheckPage />} />

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
          <Route path="teachers" element={<TeacherManagementPage />} />
          <Route path="teachers/availability" element={<TeacherManagementPage />} />
          <Route path="teachers/performance" element={<TeacherManagementPage />} />
          <Route path="teachers/income" element={<TeacherManagementPage />} />
          <Route path="teachers/:teacherId" element={<TeacherProfilePage />} />
          <Route path="users/:userId/performance" element={<StudentPerformancePage />} />

          {/* Classes & Schedule */}
          <Route path="classes" element={<ClassManagementPage />} />
          <Route path="classes/new" element={<CreateClassWizardPage />} />
          <Route path="schedule" element={<AdminSchedulePage />} />
          <Route path="attendance" element={<TeachngoAttendancePage />} />

          {/* Availability review */}
          <Route path="availability-drafts" element={<AvailabilityDraftsPage />} />

          {/* Study plans (templates nested) */}
          <Route path="study-plans" element={<StudyPlansPage />} />
          <Route path="study-plans/templates" element={<StudyPlanTemplatesPage />} />

          {/* Placement */}
          <Route path="placement" element={<PlacementTestPage />} />
          <Route path="placement/:id" element={<PlacementTestEditorPage />} />

          {/* Performance */}
          <Route path="performance/teachers" element={<Navigate to="/teachers/performance" replace />} />

          {/* Misc */}
          <Route path="flashcards" element={<FlashcardSetsPage />} />
          <Route path="badges" element={<BadgeManagementPage />} />
          <Route path="profile" element={<AdminProfilePage />} />

          {/* System */}
          <Route path="modules" element={<ModulePermissionsPage />} />
          <Route path="feature-flags" element={<FeatureFlagsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="settings/email-preview" element={<EmailTemplatePreviewPage />} />

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
