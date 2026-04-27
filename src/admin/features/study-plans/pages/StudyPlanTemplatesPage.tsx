/**
 * StudyPlanTemplatesPage — chỉ render TemplateList.
 * Breadcrumb + nút "Quay lại" đã được AdminLayout cung cấp toàn cục
 * (AdminBreadcrumb + GlobalBackButton) — không cần lặp lại ở đây.
 */
import { TemplateList } from "@shared/components/study-plan/TemplateList";

export default function StudyPlanTemplatesPage() {
  return <TemplateList />;
}
