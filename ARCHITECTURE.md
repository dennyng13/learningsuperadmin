# ARCHITECTURE — Learning Super Admin Portal

## 1. Project này làm gì?

`learningsuperadmin` là **Super Admin Portal** — giao diện web dành cho cấp quản lý cao nhất của hệ thống Learning+. Portal này quản lý người dùng (học sinh / giáo viên / admin), lớp học, lịch dạy, hợp đồng, bảng công, bảng lương, đề thi, study plan, phân quyền module, brand assets, feature flags, v.v. Đây là 1 trong 3 portal cùng dùng chung backend Supabase: `ieltspractice` (Student Portal — own DB chính), `teachingwithlearningplus` (Teacher Portal — own bảng `teacher_*`), và portal này (Super Admin). Stack: **Vite + React 18 + TypeScript + shadcn/ui + Tailwind + React Router + TanStack Query + Supabase**, deploy & sync 2 chiều qua **Lovable**.

---

## 2. Cấu trúc thư mục

```
learningsuperadmin/
├── src/
│   ├── admin/              # Code RIÊNG cho portal admin này
│   │   ├── features/       # Mỗi feature 1 folder (users, classes, contracts, ...)
│   │   ├── routes/         # AdminRoutes.tsx — khai báo toàn bộ route
│   │   ├── layouts/        # AdminLayout, Sidebar, BottomNav, Breadcrumb
│   │   ├── guards/         # ProtectedAdminRoute, SuperAdminRoute, ModuleAccessRoute
│   │   └── lib/            # Helper riêng cho admin (vd: brandAssets.ts)
│   │
│   ├── shared/             # Code DÙNG CHUNG (có thể được portal khác sync sang)
│   │   ├── components/     # UI components: ui/ (shadcn), layouts/, dashboard/, exam/, ...
│   │   ├── hooks/          # Custom React hooks (useAuth, useFeatureFlag, useTeacher*, ...)
│   │   ├── lib/            # Helper logic dùng chung (utils.ts, teachngoLinkStudents.ts)
│   │   ├── utils/          # Các util thuần (formatTime, scoreConversion, colors, ...)
│   │   ├── types/          # TypeScript types tự viết (admin.ts, student.ts, exam.ts, ...)
│   │   ├── config/         # Cấu hình runtime (navigation.ts)
│   │   └── data/           # Dữ liệu tĩnh (sample tests, fixtures)
│   │
│   ├── integrations/       # ⚠️ AUTO-GEN — KHÔNG SỬA TAY
│   │   ├── supabase/       # client.ts + types.ts (gen từ schema)
│   │   └── lovable/        # index.ts (Lovable cloud auth)
│   │
│   ├── App.tsx             # Root: providers (QueryClient, Tooltip, Toaster, ErrorBoundary)
│   ├── main.tsx            # Entry point
│   ├── index.css           # Tailwind base + custom CSS variables
│   ├── assets/             # Tài nguyên tĩnh import vào code
│   └── test/               # Test setup
│
├── supabase/               # ⚠️ Migrations + edge functions (CHỈ Lovable apply được)
├── docs/                   # Doc nội bộ (feature-flags, lovable-sync, max-quotes, ...)
├── architecture-review/    # Báo cáo audit kiến trúc (lịch sử)
├── mem/                    # Memory cho Claude/Lovable về features
├── public/                 # Asset phục vụ tĩnh (favicon, robots, ...)
├── CLAUDE.md               # Quy tắc làm việc với Claude (đọc TRƯỚC khi sửa)
├── AUDIT.md                # Báo cáo audit codebase
├── components.json         # Cấu hình shadcn CLI
├── vite.config.ts          # Aliases + chunk splitting + Lovable tagger
├── tailwind.config.ts      # Theme tokens
└── package.json            # Scripts: dev, build, lint, test, sync:types
```

---

## 3. Quy ước đặt tên & tổ chức code

### Path aliases (khai báo trong `vite.config.ts` và `tsconfig`)

| Alias      | Trỏ tới             | Khi nào dùng                            |
|------------|---------------------|------------------------------------------|
| `@/`       | `src/`              | Hiếm dùng — ưu tiên alias cụ thể bên dưới |
| `@admin/`  | `src/admin/`        | Code riêng portal admin                  |
| `@shared/` | `src/shared/`       | UI / hook / util dùng chung              |
| `@teacher/`| `src/teacher/`      | (Reserved — portal teacher khi sync)     |
| `@student/`| `src/student/`      | (Reserved — portal student khi sync)     |

### Mỗi feature có cấu trúc giống nhau

```
src/admin/features/<feature>/
├── pages/         # 1 page = 1 route (PascalCase + "Page" suffix)
│   └── XxxPage.tsx
└── components/    # Component riêng của feature (không export ra ngoài)
    └── XxxCard.tsx
```

Ví dụ: `users/pages/UserManagementPage.tsx`, `contracts/pages/ContractDetailPage.tsx`.

### Quy ước đặt tên

- **Component / Page**: `PascalCase.tsx` (vd `AdminSidebar.tsx`, `TestEditorPage.tsx`)
- **Hook**: `useXxx.ts` (vd `useFeatureFlag.ts`, `useTeacherAvailability.ts`)
- **Util / lib**: `camelCase.ts` (vd `formatTime.ts`, `scoreConversion.ts`)
- **Types**: `camelCase.ts` chứa `export type/interface PascalCase` (vd `types/student.ts`)
- **Route path**: kebab-case (vd `/feature-flags`, `/study-plans/templates`)

### Phân tầng quan trọng

- **Page** = component được mount trực tiếp bởi route. Lazy-load qua `React.lazy()`.
- **Feature components** chỉ được dùng bởi page trong cùng feature đó.
- Khi 1 component được dùng bởi ≥ 2 features → chuyển sang `src/shared/components/`.
- Hook dùng chung → `src/shared/hooks/`. Hook chỉ phục vụ 1 feature có thể giữ trong feature đó.
- **Route guards** (trong `admin/guards/`):
  - `ProtectedAdminRoute` — yêu cầu đã đăng nhập + có vai trò admin
  - `SuperAdminRoute` — chỉ super admin
  - `ModuleAccessRoute` — kiểm tra quyền module động (`ADMIN_MODULE_KEYS`)

---

## 4. Các điểm "đặc biệt" PHẢI nhớ

### 4.1. Auto-generated files — TUYỆT ĐỐI KHÔNG SỬA TAY
- `src/integrations/supabase/types.ts` → gen bằng `npm run sync:types`
- `src/integrations/lovable/index.ts` → Lovable tự inject

### 4.2. Schema database, RLS, edge functions, migrations
- **KHÔNG sửa** ở repo này — chúng được own bởi `ieltspractice` (Lovable apply).
- Folder `supabase/migrations` ở đây chỉ để Lovable đọc tham chiếu, không tự apply.

### 4.3. Code chia sẻ với 2 portal khác
- Mọi thứ trong `src/shared/` có thể được Lovable sync sang Student/Teacher portal.
- ⚠️ Khi sửa file trong `src/shared/`, phải cảnh báo trước → ảnh hưởng cả 3 portal.

### 4.4. Quyền & vai trò
- 3 lớp guard (auth → super admin → module access) lồng nhau ở `AdminRoutes.tsx`.
- Sửa logic phân quyền có thể vỡ cả 3 portal vì cùng dùng `useAuth`, `useUserModuleAccess`.

### 4.5. Lazy loading + chunk splitting
- Tất cả page đều dùng `lazy(() => import(...))` trong `AdminRoutes.tsx`.
- `vite.config.ts` split vendor thành các chunk riêng (`vendor-router`, `vendor-query`, `vendor-supabase`, `vendor-icons`, `vendor-pdf`, `vendor-xlsx`, ...).
- ⚠️ React + Radix CỐ TÌNH không split — split sẽ gây lỗi `forwardRef` ở production.

### 4.6. Routing legacy
- Có nhiều redirect cho URL cũ (`/admin/*`, `/teachngo-*`, `/timesheet`, `/payroll`, `/settings/*`).
- Khi đổi route, kiểm tra phần "Legacy redirects" trong `AdminRoutes.tsx`.

### 4.7. UI components — dùng shadcn CLI
- `components.json` đã cấu hình. Khi cần component mới: chạy shadcn CLI thay vì viết tay.
- Component shadcn nằm ở `src/shared/components/ui/`.

### 4.8. Dependencies
- KHÔNG tự `npm audit fix --force` hoặc nâng cấp package.
- `bun.lock` + `package-lock.json` cùng tồn tại — Lovable quản lý.

---

## 5. Hướng dẫn cho người mới

### "Tôi muốn thêm 1 trang mới"

Giả sử thêm trang **Quản lý kỳ thi** (`/exam-sessions`):

1. **Tạo folder feature** (nếu chưa có):
   ```
   src/admin/features/exam-sessions/
   ├── pages/
   │   └── ExamSessionsPage.tsx
   └── components/
   ```
2. **Viết page** trong `ExamSessionsPage.tsx` (export default function).
3. **Khai báo route** trong `src/admin/routes/AdminRoutes.tsx`:
   ```tsx
   const ExamSessionsPage = lazy(() => import("@admin/features/exam-sessions/pages/ExamSessionsPage"));
   // ... trong <Routes>:
   <Route path="exam-sessions" element={<ExamSessionsPage />} />
   ```
   Cần phân quyền? Bọc bằng `<ModuleAccessRoute moduleKey={...}>` hoặc `<SuperAdminRoute>`.
4. **Thêm vào sidebar** (nếu cần) tại `src/shared/config/navigation.ts` và/hoặc `src/admin/layouts/AdminSidebar.tsx`.
5. **Test thủ công**: `npm run dev`, mở `http://localhost:8080/exam-sessions`.

### "Tôi muốn thêm 1 hook mới"

Giả sử thêm `useExamSessions()`:

1. **Quyết định vị trí**:
   - Chỉ dùng cho 1 feature → `src/admin/features/exam-sessions/hooks/useExamSessions.ts` (tạo folder `hooks/` trong feature).
   - Có khả năng dùng nhiều nơi → `src/shared/hooks/useExamSessions.ts`.
2. **Tên file** theo quy ước: `useXxx.ts`.
3. **Pattern phổ biến** (TanStack Query):
   ```ts
   import { useQuery } from "@tanstack/react-query";
   import { supabase } from "@/integrations/supabase/client";

   export function useExamSessions() {
     return useQuery({
       queryKey: ["exam-sessions"],
       queryFn: async () => {
         const { data, error } = await supabase.from("exam_sessions").select("*");
         if (error) throw error;
         return data;
       },
     });
   }
   ```
4. **Import** trong page:
   ```ts
   import { useExamSessions } from "@shared/hooks/useExamSessions";
   ```

### "Tôi muốn thêm 1 component UI dùng chung"

1. Nếu là component shadcn (button, dialog, ...) → dùng shadcn CLI để add vào `src/shared/components/ui/`.
2. Nếu là component tự viết, dùng nhiều nơi → `src/shared/components/<group>/MyComponent.tsx`.
3. Nếu chỉ dùng trong 1 feature → để trong `src/admin/features/<feature>/components/`.

### "Tôi muốn thêm 1 feature flag"

Đọc `docs/feature-flags.md`. Hook đã có sẵn: `useFeatureFlag` ở `src/shared/hooks/`.

### Trước khi commit

- `npm run lint` — kiểm tra ESLint
- `npm run test` — chạy Vitest
- `npm run build` — đảm bảo build production không lỗi
- Viết commit message tiếng Anh ngắn gọn, theo style repo (xem `git log`).
- ⚠️ **Hỏi xác nhận trước khi push lên GitHub.**
