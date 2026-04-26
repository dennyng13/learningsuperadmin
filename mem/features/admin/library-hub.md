---
name: Library Hub Page
description: Hub /library gom Tests / Flashcards / Study Plans dạng card lớn với brand geometric shapes lấy từ DB.
type: feature
---
Route: `/library` (`LibraryHubPage` — `src/admin/features/library/pages/`).
Sidebar: 1 entry duy nhất "Quản lý học liệu" (group academic) với `aliasPaths: ["/tests","/flashcards","/study-plans","/practice"]` để vẫn highlight khi user vào sub-page. 3 entry cũ Tests/Flashcards/Study Plans đã ẨN khỏi sidebar.

Card style (lấy cảm hứng từ ảnh ref do user gửi):
- aspect-[5/4] rounded-3xl, một card "featured" tô `bg-primary text-primary-foreground`, các card còn lại nền `bg-card`.
- Icon top-left trong square 11x11 backdrop-blur.
- Title (font-display extrabold) + blurb 1-2 dòng.
- ArrowRight bottom-left, dịch sang phải khi hover.
- Geometric "cluster" 3 shape ở góc dưới phải, lấy từ `useBrandShapes(palette)` (`src/shared/hooks/useBrandShapes.ts`) — palette: tests=teal, flashcards=amber, study-plans=indigo. Shape thứ 1/2/3 có rotation+size khác nhau (xem `positions` array). Featured card dùng `mix-blend-screen` để shape không chìm trên nền primary.
- Fallback khi DB chưa upload shape: blob blur gradient ở góc.

Convention: bất kỳ hub page nào muốn re-dùng style → import `useBrandShapes(palette)` + dựng cluster theo cùng pattern. Shapes phải upload qua `/brand-assets` với key `shape-{palette}-{name}`.