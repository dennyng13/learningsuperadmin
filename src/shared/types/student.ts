export interface StudentFieldDef {
  key: string;
  label: string;
  group: StudentFieldGroup;
  type: "text" | "date" | "number" | "select" | "textarea" | "phone" | "email";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export type StudentFieldGroup =
  | "basic"
  | "contact"
  | "personal"
  | "guardian"
  | "academic"
  | "financial"
  | "admin_notes";

export const FIELD_GROUP_LABELS: Record<StudentFieldGroup, string> = {
  basic: "Thông tin cơ bản",
  contact: "Liên hệ",
  personal: "Cá nhân",
  guardian: "Phụ huynh / Người bảo trợ",
  academic: "Học tập",
  financial: "Tài chính",
  admin_notes: "Ghi chú quản trị",
};

export const FIELD_GROUP_ICONS: Record<StudentFieldGroup, string> = {
  basic: "User",
  contact: "Phone",
  personal: "CreditCard",
  guardian: "Users",
  academic: "GraduationCap",
  financial: "Wallet",
  admin_notes: "StickyNote",
};

export const STUDENT_FIELDS: StudentFieldDef[] = [
  // Basic
  { key: "full_name", label: "Họ và tên", group: "basic", type: "text", required: true },
  { key: "avatar_url", label: "Ảnh đại diện", group: "basic", type: "text" },
  { key: "status", label: "Trạng thái", group: "basic", type: "select", options: [
    { value: "active", label: "Đang học" },
    { value: "inactive", label: "Nghỉ học" },
    { value: "graduated", label: "Đã tốt nghiệp" },
    { value: "prospect", label: "Prospect" },
  ]},

  // Contact
  { key: "email", label: "Email", group: "contact", type: "email" },
  { key: "phone", label: "Số điện thoại", group: "contact", type: "phone" },

  // Personal
  { key: "date_of_birth", label: "Ngày sinh", group: "personal", type: "date" },
  { key: "gender", label: "Giới tính", group: "personal", type: "select", options: [
    { value: "male", label: "Nam" },
    { value: "female", label: "Nữ" },
    { value: "other", label: "Khác" },
  ]},
  { key: "id_number", label: "CCCD/CMND", group: "personal", type: "text" },
  { key: "address", label: "Địa chỉ", group: "personal", type: "text" },
  { key: "city", label: "Thành phố", group: "personal", type: "text" },
  { key: "nationality", label: "Quốc tịch", group: "personal", type: "text" },
  { key: "school_name", label: "Trường học", group: "personal", type: "text" },
  { key: "occupation", label: "Nghề nghiệp", group: "personal", type: "text" },

  // Guardian
  { key: "guardian_name", label: "Tên phụ huynh", group: "guardian", type: "text" },
  { key: "guardian_phone", label: "SĐT phụ huynh", group: "guardian", type: "phone" },
  { key: "guardian_email", label: "Email phụ huynh", group: "guardian", type: "email" },
  { key: "guardian_relationship", label: "Quan hệ", group: "guardian", type: "select", options: [
    { value: "parent", label: "Bố/Mẹ" },
    { value: "guardian", label: "Người giám hộ" },
    { value: "relative", label: "Người thân" },
  ]},

  // Academic
  { key: "current_level", label: "Level hiện tại", group: "academic", type: "text" },
  { key: "target_band", label: "Band mục tiêu", group: "academic", type: "number" },
  { key: "entry_band", label: "Band đầu vào", group: "academic", type: "number" },
  { key: "enrollment_date", label: "Ngày nhập học", group: "academic", type: "date" },
  { key: "target_exam_date", label: "Ngày dự thi IELTS", group: "academic", type: "date" },

  // Admin notes
  { key: "notes", label: "Ghi chú", group: "admin_notes", type: "textarea" },
  { key: "source", label: "Nguồn", group: "admin_notes", type: "text", placeholder: "Facebook, giới thiệu, etc." },
  { key: "registration_date", label: "Ngày đăng ký", group: "admin_notes", type: "date" },
];
