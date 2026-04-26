# Project Memory

## Core
Admin Portal for Learning Plus ecosystem (3 portals share 1 Supabase backend).
Roles via `user_roles` table + `has_role(uid, role)` RPC. Never store roles on profiles.
Use semantic design tokens (HSL) from index.css; `font-display` for headings.

## Memories
- [Brand Assets Manager](mem://features/admin/brand-assets-manager.md) — Super-admin /brand-assets page, helpers, RLS, cache-busting, conventions.