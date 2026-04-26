import ModulePermissionsPage from "@admin/features/modules/pages/ModulePermissionsPage";

/**
 * Wrapper để embed trang Phân quyền Module vào tab Settings.
 * Trang gốc đã có padding riêng — wrapper bỏ padding ngoài để khớp khung Settings.
 */
export default function AdminModulePermissionsTab() {
  return (
    <div className="-m-4 md:-m-6">
      <ModulePermissionsPage />
    </div>
  );
}