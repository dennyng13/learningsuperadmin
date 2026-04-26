# Project Memory

## Core
Brand geometric shapes live in DB (`brand_assets`, type=shape, key `shape-{palette}-{name}`); use `useBrandShapes(palette)` to render them — never hard-code SVG decoration.

## Memories
- [Brand Assets Manager](mem://features/admin/brand-assets-manager) — Super-admin /brand-assets page, bucket + RPC + helpers in `src/admin/lib/brandAssets.ts`.
- [Library Hub](mem://features/admin/library-hub) — /library page gom Tests/Flashcards/Study Plans, card-with-shape pattern reusable cho hub khác.
- [Library Hub Access](mem://features/admin/library-access) — Per-admin gate qua `user_module_access` + ModuleAccessRoute guard + tab matrix trong /permissions.
- [Admin Classes List](mem://features/admin/classes-list) — /classes/list trang danh sách lớp với filter lifecycle_status, counter chips, table+grid view, URL-synced.
