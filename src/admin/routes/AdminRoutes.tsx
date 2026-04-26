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
import ClassesListPage from "@admin/features/classes/pages/ClassesListPage";
import AdminClassDetailPage from "@admin/features/classes/pages/AdminClassDetailPage";
import PermissionsPage from "@admin/features/permissions/pages/PermissionsPage";
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
import ContractsListPage from "@admin/features/contracts/pages/ContractsListPage";
import ContractCreatePage from "@admin/features/contracts/pages/ContractCreatePage";
import ContractDetailPage from "@admin/features/contracts/pages/ContractDetailPage";
import ContractTemplatesListPage from "@admin/features/contracts/pages/ContractTemplatesListPage";
import ContractTemplateEditorPage from "@admin/features/contracts/pages/ContractTemplateEditorPage";
import AddendumEditorPage from "@admin/features/contracts/pages/AddendumEditorPage";
import AddendumTemplatesListPage from "@admin/features/contracts/pages/AddendumTemplatesListPage";
import AddendumTemplateEditorPage from "@admin/features/contracts/pages/AddendumTemplateEditorPage";
import TimesheetPeriodsPage from "@admin/features/timesheet/pages/TimesheetPeriodsPage";
import TimesheetPeriodDetailPage from "@admin/features/timesheet/pages/TimesheetPeriodDetailPage";
import PayrollListPage from "@admin/features/payroll/pages/PayrollListPage";
import PayrollBatchDetailPage from "@admin/features/payroll/pages/PayrollBatchDetailPage";
import PayrollPayslipDetailPage from "@admin/features/payroll/pages/PayrollPayslipDetailPage";
import CompensationPage from "@admin/features/compensation/pages/CompensationPage";
import BrandAssetsPage from "@admin/features/brand-assets/pages/BrandAssetsPage";
import BandDescriptorsPage from "@admin/features/academic/pages/BandDescriptorsPage";
import FeedbackTemplatesPage from "@admin/features/academic/pages/FeedbackTemplatesPage";
import CoursesPage from "@admin/features/academic/pages/CoursesPage";
import LibraryHubPage from "@admin/features/library/pages/LibraryHubPage";
import SchemaHealthPage from "@admin/features/schema-health/pages/SchemaHealthPage";
import { SuperAdminRoute } from "@admin/guards/SuperAdminRoute";
import { ModuleAccessRoute } from "@admin/guards/ModuleAccessRoute";
import { ADMIN_MODULE_KEYS } from "@shared/hooks/useUserModuleAccess";

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

          {/* Quản lý học liệu — hub gom Tests / Flashcards / Study Plans */}
          <Route path="library" element={<LibraryHubPage />} />

          {/* Tests / Practice */}
          <Route path="tests" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.TESTS}><TestManagementPage /></ModuleAccessRoute>} />
          <Route path="tests/import" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.TESTS}><ImportPage /></ModuleAccessRoute>} />
          <Route path="tests/:id" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.TESTS}><TestEditorPage /></ModuleAccessRoute>} />
          <Route path="tests/:id/preview" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.TESTS}><TestPreviewPage /></ModuleAccessRoute>} />
          <Route path="practice/:exerciseId/stats" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.TESTS}><PracticeExerciseDetailPage /></ModuleAccessRoute>} />

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
          <Route path="classes/list" element={<ClassesListPage />} />
          <Route path="classes/new" element={<CreateClassWizardPage />} />
          <Route path="classes/:id" element={<AdminClassDetailPage />} />
          <Route path="schedule" element={<AdminSchedulePage />} />
          <Route path="attendance" element={<TeachngoAttendancePage />} />

          {/* Availability review */}
          <Route path="availability-drafts" element={<AvailabilityDraftsPage />} />

          {/* Study plans (templates nested) */}
          <Route path="study-plans" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.STUDY_PLANS}><StudyPlansPage /></ModuleAccessRoute>} />
          <Route path="study-plans/templates" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.STUDY_PLANS}><StudyPlanTemplatesPage /></ModuleAccessRoute>} />

          {/* Placement */}
          <Route path="placement" element={<PlacementTestPage />} />
          <Route path="placement/:id" element={<PlacementTestEditorPage />} />

          {/* Performance */}
          <Route path="performance/teachers" element={<Navigate to="/teachers/performance" replace />} />

          {/* Contracts (Stage F1) */}
          <Route path="contracts" element={<ContractsListPage />} />
          <Route path="contracts/new" element={<ContractCreatePage />} />
          <Route path="contracts/templates" element={<ContractTemplatesListPage />} />
          <Route path="contracts/templates/:templateId" element={<ContractTemplateEditorPage />} />
          <Route path="contracts/addendum-templates" element={<AddendumTemplatesListPage />} />
          <Route path="contracts/addendum-templates/:templateId" element={<AddendumTemplateEditorPage />} />
          <Route path="contracts/:contractId" element={<ContractDetailPage />} />
          <Route path="contracts/:contractId/addendums/:addendumId" element={<AddendumEditorPage />} />

          {/* Lương / Thưởng — gộp Bảng công + Bảng lương dưới 1 entry */}
          <Route path="compensation" element={<CompensationPage />} />
          {/* Legacy redirects — internal "Quay lại" buttons trong các trang
              detail vẫn navigate("/timesheet") / navigate("/payroll"). */}
          <Route path="timesheet" element={<Navigate to="/compensation?tab=timesheet" replace />} />
          <Route path="payroll" element={<Navigate to="/compensation?tab=payroll" replace />} />
          <Route path="timesheet/:periodId" element={<TimesheetPeriodDetailPage />} />
          <Route path="payroll/batches/:batchId" element={<PayrollBatchDetailPage />} />
          <Route path="payroll/payslips/:payslipId" element={<PayrollPayslipDetailPage />} />

          {/* Misc */}
          <Route path="flashcards" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.FLASHCARDS}><FlashcardSetsPage /></ModuleAccessRoute>} />
          <Route path="badges" element={<BadgeManagementPage />} />
          <Route path="profile" element={<AdminProfilePage />} />

          {/* Academic — Band Descriptor & Mẫu nhận xét (chuyển từ Settings) */}
          <Route path="band-descriptors" element={<BandDescriptorsPage />} />
          <Route path="feedback-templates" element={<FeedbackTemplatesPage />} />
          {/* Academic — Module Quản lý Khóa học (programs + cấp độ) */}
          <Route path="courses" element={<CoursesPage />} />
          {/* Legacy redirects — bookmark cũ /settings/<id> → trang riêng */}
          <Route path="settings/ai-grading"       element={<Navigate to="/permissions?tab=ai-grading" replace />} />
          <Route path="settings/band-descriptors" element={<Navigate to="/band-descriptors" replace />} />
          <Route path="settings/templates"        element={<Navigate to="/feedback-templates" replace />} />

          {/* Permissions — gộp Module access + Student field access */}
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="modules" element={<Navigate to="/permissions?tab=modules" replace />} />

          {/* System */}
          <Route path="feature-flags" element={<FeatureFlagsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="settings/email-preview" element={<EmailTemplatePreviewPage />} />
          <Route path="brand-assets" element={<SuperAdminRoute><BrandAssetsPage /></SuperAdminRoute>} />
          <Route path="schema-health" element={<SuperAdminRoute><SchemaHealthPage /></SuperAdminRoute>} />

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
