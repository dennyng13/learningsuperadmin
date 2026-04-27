/**
 * classesCourseIdSupport — feature detection cho cột `classes.course_id`.
 *
 * Background: trước đây Khoá học (courses) match với Lớp (classes) qua tên
 * level (`classes.level` ≡ `course_levels.name`). Khi `classes` được nâng cấp
 * có cột `course_id` riêng, ta nên match trực tiếp để chính xác hơn (lớp
 * cùng level vẫn có thể thuộc khoá khác nhau).
 *
 * Hàm này probe 1 lần / phiên bằng `select('course_id').limit(1)`. Cache kết
 * quả ở module scope để các call sau trả về tức thì. Khi probe lỗi (cột chưa
 * tồn tại / lỗi schema), fallback an toàn về `false` và caller dùng logic
 * theo `level`.
 */
import { supabase } from "@/integrations/supabase/client";

let cachedPromise: Promise<boolean> | null = null;

/** Trả về `true` nếu bảng `classes` có cột `course_id`, ngược lại `false`. */
export function hasClassesCourseIdColumn(): Promise<boolean> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    try {
      const { error } = await (supabase as any)
        .from("classes")
        .select("course_id")
        .limit(1);
      if (error) {
        // Postgres error khi cột không tồn tại: code 42703 hoặc message chứa
        // "column ... does not exist". Coi mọi lỗi probe = không có cột.
        return false;
      }
      return true;
    } catch {
      return false;
    }
  })();
  return cachedPromise;
}

/** Reset cache — chỉ dùng cho test / sau khi chạy migration trong dev. */
export function _resetClassesCourseIdCache() {
  cachedPromise = null;
}