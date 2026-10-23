# Admin console plan

## Routes and access
`/login`, `/forgot-password`, `/reset-password`, `/mfa/setup`, `/mfa/verify`, `/approvals`, `/reviews`, `/tickets`, `/runs`, `/settings`, `/library`, `/audit-log`, `/users`, `/reports`, `/notifications`, `/account`, `/help`, and not-found. Protected routes enforce Auth → role → MFA before admin data queries mount.

## Frontend
`frontend/src/app` owns routing/providers/access gates. `components` contains the responsive shell, navigation, status badges, tables and guarded dialogs. `pages` contains route-level screens; `hooks` holds reusable step-up handling; `styles` contains design tokens and responsive CSS. Pages call the injected backend through React Query and do not call Supabase directly.

## Backend
`backend/src/domain/types.ts` defines the backend contract and domain types. `backend/src/adapters/mock.ts` provides fictional sample data, gated auth/MFA, validated mutations, session persistence, audit events and notifications. `backend/src/adapters/supabase.ts` is a provisional integration boundary; `supabaseClient.ts` owns the only `createClient` call and receives only the anon key.

## Current limits and next steps
The shared backend contract is not present. Reconcile every provisional Supabase table, view, column, Edge Function payload, RLS rule and error shape before enabling real data. Edge Functions must independently enforce admin role, `aal2` step-up, atomic state transitions and audit writes. Signed evidence/video/transcript flows, Library writes, user-role changes and notification Realtime remain deferred. The shared UI refresh gives all pages a refined visual system, responsive layouts, subtle motion, and styled form controls; queue/detail views now include clear back-to-list controls, and the desktop rail has a compact brand header and clearer navigation grouping. E2E checks these back actions, desktop rail geometry, hidden tablet/mobile rail behavior, and the 768 px tablet drawer. Latest verification: typecheck, lint, 30 unit tests, 3 Playwright E2E tests, production build and both source-only/source+build security scans passed. Axe reported zero serious/critical violations across 28 checked states; responsive overflow passed at 360, 375, 390, 768, 1024 and 1440 px. Live Supabase integration, manual device/keyboard testing and Lighthouse measurement are not complete.
