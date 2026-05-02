import { lazy, Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@shared/components/misc/ErrorBoundary";
import { ProtectedAdminRoute } from "@admin/guards/ProtectedAdminRoute";
import { SuperAdminRoute } from "@admin/guards/SuperAdminRoute";
import { ModuleAccessRoute } from "@admin/guards/ModuleAccessRoute";
import { ADMIN_MODULE_KEYS } from "@shared/hooks/useUserModuleAccess";
import { PLACEHOLDER_ROUTES } from "@admin/features/placeholder/placeholders";

const AdminLayout = lazy(() => import("@admin/layouts/AdminLayout"));

const AdminLoginPage = lazy(() => import("@admin/features/auth/pages/AdminLoginPage"));
const ResetPasswordPage = lazy(() => import("@admin/features/auth/pages/ResetPasswordPage"));
const AdminDashboardPage = lazy(() => import("@admin/features/dashboard/pages/AdminDashboardPage"));
const AdminProfilePage = lazy(() => import("@admin/features/auth/pages/AdminProfilePage"));
const TestManagementPage = lazy(() => import("@admin/features/tests/pages/TestManagementPage"));
const TestEditorPage = lazy(() => import("@admin/features/tests/pages/TestEditorPage"));
const TestPreviewPage = lazy(() => import("@admin/features/tests/pages/TestPreviewPage"));
const ImportPage = lazy(() => import("@admin/features/tests/pages/ImportPage"));
const UserManagementPage = lazy(() => import("@admin/features/users/pages/UserManagementPage"));
const TeacherManagementPage = lazy(() => import("@admin/features/users/pages/TeacherManagementPage"));
const TeacherProfilePage = lazy(() => import("@admin/features/users/pages/TeacherProfilePage"));
const ClassManagementPage = lazy(() => import("@admin/features/classes/pages/ClassManagementPage"));
const CreateClassWizardPage = lazy(() => import("@admin/features/classes/pages/CreateClassWizardPage"));
const ClassesListPage = lazy(() => import("@admin/features/classes/pages/ClassesListPage"));
const AdminClassDetailPage = lazy(() => import("@admin/features/classes/pages/AdminClassDetailPage"));
const ClassInvitationsListPage = lazy(() => import("@admin/features/classes/pages/ClassInvitationsListPage"));
const PermissionsPage = lazy(() => import("@admin/features/permissions/pages/PermissionsPage"));
const FlashcardSetsPage = lazy(() => import("@admin/features/flashcards/pages/FlashcardSetsPage"));
const PracticeExerciseDetailPage = lazy(() => import("@admin/features/practice/pages/PracticeExerciseDetailPage"));
const BadgeManagementPage = lazy(() => import("@admin/features/badges/pages/BadgeManagementPage"));
const AttendanceMonitorPage = lazy(() => import("@admin/features/attendance/pages/AttendanceMonitorPage"));
const RoomsPage = lazy(() => import("@admin/features/rooms/pages/RoomsPage"));
const StudentPerformancePage = lazy(() => import("@admin/features/performance/pages/StudentPerformancePage"));
const AdminSettingsPage = lazy(() => import("@admin/features/settings/pages/AdminSettingsPage"));
const EmailTemplatePreviewPage = lazy(() => import("@admin/features/settings/pages/EmailTemplatePreviewPage"));
const FeatureFlagsPage = lazy(() => import("@admin/features/feature-flags/pages/FeatureFlagsPage"));
const StudyPlansPage = lazy(() => import("@admin/features/study-plans/pages/StudyPlansPage"));
const StudyPlanTemplatesPage = lazy(() => import("@admin/features/study-plans/pages/StudyPlanTemplatesPage"));
const MyPlansPage = lazy(() => import("@admin/features/study-plans/pages/MyPlansPage"));
const PlacementTestPage = lazy(() => import("@admin/features/placement/pages/PlacementTestPage"));
const PlacementTestEditorPage = lazy(() => import("@admin/features/placement/pages/PlacementTestEditorPage"));
const AdminSchedulePage = lazy(() => import("@admin/features/schedule/pages/AdminSchedulePage"));
const AvailabilityDraftsPage = lazy(() => import("@admin/features/availability-drafts/pages/AvailabilityDraftsPage"));
const NotFoundPage = lazy(() => import("@admin/features/misc/pages/NotFoundPage"));
const HealthCheckPage = lazy(() => import("@admin/features/misc/pages/HealthCheckPage"));
const ContractsListPage = lazy(() => import("@admin/features/contracts/pages/ContractsListPage"));
const ContractCreatePage = lazy(() => import("@admin/features/contracts/pages/ContractCreatePage"));
const ContractDetailPage = lazy(() => import("@admin/features/contracts/pages/ContractDetailPage"));
const ContractTemplatesListPage = lazy(() => import("@admin/features/contracts/pages/ContractTemplatesListPage"));
const ContractTemplateEditorPage = lazy(() => import("@admin/features/contracts/pages/ContractTemplateEditorPage"));
const AddendumEditorPage = lazy(() => import("@admin/features/contracts/pages/AddendumEditorPage"));
const AddendumTemplatesListPage = lazy(() => import("@admin/features/contracts/pages/AddendumTemplatesListPage"));
const AddendumTemplateEditorPage = lazy(() => import("@admin/features/contracts/pages/AddendumTemplateEditorPage"));
const TimesheetPeriodDetailPage = lazy(() => import("@admin/features/timesheet/pages/TimesheetPeriodDetailPage"));
const PayrollBatchDetailPage = lazy(() => import("@admin/features/payroll/pages/PayrollBatchDetailPage"));
const PayrollPayslipDetailPage = lazy(() => import("@admin/features/payroll/pages/PayrollPayslipDetailPage"));
const CompensationPage = lazy(() => import("@admin/features/compensation/pages/CompensationPage"));
const BrandAssetsPage = lazy(() => import("@admin/features/brand-assets/pages/BrandAssetsPage"));
const MaxQuotesPage = lazy(() => import("@admin/features/max-quotes/pages/MaxQuotesPage"));
const BandDescriptorsPage = lazy(() => import("@admin/features/academic/pages/BandDescriptorsPage"));
const FeedbackTemplatesPage = lazy(() => import("@admin/features/academic/pages/FeedbackTemplatesPage"));
const CoursesPage = lazy(() => import("@admin/features/academic/pages/CoursesPage"));
const CourseLevelsPage = lazy(() => import("@admin/features/academic/pages/CourseLevelsPage"));
const ProgramsListPage = lazy(() => import("@admin/features/academic/pages/ProgramsListPage"));
const ProgramDetailPage = lazy(() => import("@admin/features/academic/pages/ProgramDetailPage"));
const LibraryHubPage = lazy(() => import("@admin/features/library/pages/LibraryHubPage"));
const SchemaHealthPage = lazy(() => import("@admin/features/schema-health/pages/SchemaHealthPage"));

// Day 7 IA placeholder pages — single shared component dispatching by route metadata.
const PlaceholderPage = lazy(() =>
  import("@admin/features/placeholder/PlaceholderPage").then((m) => ({ default: m.PlaceholderPage })),
);

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
          <Route path="teachers/directory" element={<TeacherManagementPage />} />
          <Route path="teachers/availability" element={<TeacherManagementPage />} />
          <Route path="teachers/performance" element={<TeacherManagementPage />} />
          <Route path="teachers/income" element={<TeacherManagementPage />} />
          <Route path="teachers/:teacherId" element={<TeacherProfilePage />} />
          <Route path="users/:userId/performance" element={<StudentPerformancePage />} />

          {/* Classes & Schedule */}
          <Route path="classes" element={<ClassManagementPage />} />
          <Route path="classes/list" element={<ClassesListPage />} />
          <Route path="classes/invitations" element={<ClassInvitationsListPage />} />
          <Route path="classes/new" element={<CreateClassWizardPage />} />
          <Route path="classes/:id" element={<AdminClassDetailPage />} />
          <Route path="schedule" element={<AdminSchedulePage />} />
          {/* P5d: replaces deleted P5a teachngo-coupled AttendancePage. */}
          <Route path="attendance" element={<AttendanceMonitorPage />} />
          <Route path="attendance/monitor" element={<AttendanceMonitorPage />} />

          {/* Rooms (Phase F1) */}
          <Route path="rooms" element={<RoomsPage />} />

          {/* ─── Legacy Teachngo* slug redirects (bookmark compat) ─── */}
          <Route path="teachngo-attendance"     element={<Navigate to="/attendance" replace />} />
          <Route path="teachngo-attendance/*"   element={<Navigate to="/attendance" replace />} />
          <Route path="teachngo-classes"        element={<Navigate to="/classes" replace />} />
          <Route path="teachngo-classes/list"   element={<Navigate to="/classes/list" replace />} />
          <Route path="teachngo-classes/new"    element={<Navigate to="/classes/new" replace />} />
          <Route path="teachngo-classes/:id"    element={<TeachngoClassRedirect />} />
          <Route path="teachngo-courses"        element={<Navigate to="/courses" replace />} />
          <Route path="teachngo-courses/*"      element={<Navigate to="/courses" replace />} />

          {/* Availability review */}
          <Route path="availability-drafts" element={<AvailabilityDraftsPage />} />

          {/* Study plans (templates nested) */}
          <Route path="study-plans" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.STUDY_PLANS}><StudyPlansPage /></ModuleAccessRoute>} />
          <Route path="study-plans/templates" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.STUDY_PLANS}><StudyPlanTemplatesPage /></ModuleAccessRoute>} />
          <Route path="my-plans" element={<ModuleAccessRoute moduleKey={ADMIN_MODULE_KEYS.STUDY_PLANS}><MyPlansPage /></ModuleAccessRoute>} />

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
          <Route path="courses/programs" element={<ProgramsListPage />} />
          <Route path="courses/programs/:key" element={<ProgramDetailPage />} />
          <Route path="courses/levels" element={<CourseLevelsPage />} />
          <Route path="courses/new" element={<Navigate to="/courses/programs" replace />} />
          <Route path="courses/:id/edit" element={<Navigate to="/courses/programs" replace />} />
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
          <Route path="brand-assets/quotes" element={<SuperAdminRoute><MaxQuotesPage /></SuperAdminRoute>} />
          <Route path="schema-health" element={<SuperAdminRoute><SchemaHealthPage /></SuperAdminRoute>} />

          {/* ─── Day 7 IA aliases ─── */}
          <Route path="invitations" element={<Navigate to="/classes/invitations" replace />} />
          <Route path="students" element={<Navigate to="/users" replace />} />
          <Route path="schedules" element={<Navigate to="/schedule" replace />} />
          <Route path="classes/create" element={<Navigate to="/classes/new" replace />} />
          <Route path="programs" element={<Navigate to="/courses/programs" replace />} />

          {/* ─── Day 7 IA placeholder routes ─── */}
          {PLACEHOLDER_ROUTES.map((p) => (
            <Route
              key={p.path}
              path={p.path}
              element={
                <PlaceholderPage
                  title={p.title}
                  subtitle={p.subtitle}
                  icon={p.icon}
                  description={p.description}
                  scope={p.scope}
                  eta={p.eta}
                />
              }
            />
          ))}

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

/** Preserve :id when redirecting /teachngo-classes/:id → /classes/:id */
function TeachngoClassRedirect() {
  const { pathname, search, hash } = window.location;
  const target = pathname.replace(/^\/teachngo-classes/, "/classes") || "/classes";
  return <Navigate to={`${target}${search}${hash}`} replace />;
}
