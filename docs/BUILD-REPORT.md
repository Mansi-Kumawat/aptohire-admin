# Current status addendum — 26 October 2026

> This addendum supersedes older navigation, score-layout, and test-count statements later in this report. The remaining text is retained as historical build notes.

- Back-navigation buttons from Approvals, Reviews, and Tickets are removed; use the main sidebar/queue layout.
- The desktop sidebar now has a keyboard-accessible collapse/expand control, slightly larger navigation text, and retains the existing tablet icon rail and mobile drawer/tab navigation.
- The left promotional panel on the sign-in screen has more breathing room via increased horizontal padding; the sign-in card remains in its original centered position, and mobile styling is unchanged.
- The ticket score ring is in normal document flow and does not overlap the appeal title. Review-only score presentation is scoped to the Reviews panel.
- Staff Directory is read-only; it has no staff invitation, role-edit, disable, or delete workflow. There is no general student directory.
- Latest verified checks: typecheck and lint passed; 30 unit tests passed; 4 Playwright E2E tests passed (including sidebar collapse and sign-in spacing); production build and source/build security scan passed.
- The shared backend contract is not present in this repository. The Supabase adapter is provisional; live cross-portal integration and production deployment are not verified.

---

### ✅ Admin console build report

**Stack used:** React 18.3.1 · TypeScript 5.9.2 (strict) · Vite 8.3.4 · React Router 7.18.4 · TanStack Query 5.87.1 · Supabase JS 2.57.4 · Tailwind CSS 3.4.19 · Vitest 4.1.11 · Playwright 1.64.1.

**Routes built:** `/login` · `/forgot-password` · `/reset-password` · `/auth/callback` · `/mfa/setup` · `/mfa/verify` · `/` · `/approvals` · `/approvals/:type/:id` · `/reviews` · `/reviews/:auditId` · `/tickets` · `/tickets/:ticketId` · `/runs` · `/runs/:runId` · `/settings` · `/library` · `/audit-log` · `/users` · `/reports` · `/notifications` · `/account` · `/help` · `*`.

**Frontend/backend roots:** `frontend/` contains the Vite app, auth gates, pages, styles and UI helpers. `backend/` contains the typed `Backend` contract, Zod domain schemas, mock adapter, Supabase adapter and client boundary.

**Implemented and corrected:**
- Replaced the old A-letter brand lockup with the supplied AptoHire wordmark in login, MFA, navigation, and admin headers. The collapsed rail uses the provided icon crop; the new PNG favicon and Apple touch icon use the same mark.
- Added a shared UI refresh in `frontend/src/styles/modern-ui.css`: calmer layered surfaces, stronger page-title/stat-card hierarchy, refined buttons, inputs and select menus, restrained hover/entrance motion, visible focus states, and reduced-motion support. Applied responsive layouts across desktop, tablet and phone; rebuilt the desktop rail with a compact brand header and clearer nav grouping, corrected mobile rail visibility, refined the tablet drawer, and added usable back-to-queue arrows to approval, review, ticket, and run detail views.
- Mock mode is the default. Demo sign-in is limited to named fictional accounts; role and MFA state are kept per account. Mock admin reads and writes require an authenticated admin with MFA. Mock state, audit events and notification read state persist in session storage and are schema-checked on restore.
- Gate order is Auth → role → MFA. Admin data queries are mounted only after the gate passes. No sign-up, impersonation, service-role key or embedded secret is provided.
- Sensitive actions ask for a fresh authenticator code: application approval/rejection, review decisions, reviewer assignment and appeal decisions, subscription changes, agent retries, every configuration save, audit-log and report CSV exports, and demo reset. Kill-switch changes require typing `PAUSE` or `RESUME`; demo reset requires `RESET`. Server-side Edge Functions must independently enforce recent `aal2` and authorization.
- Appeal matching now uses reviewer IDs, not display names. Only the assigned reviewer who is not the original reviewer may decide. Mock state transitions, score ranges, config values and required reasons are validated; reconsidering a rejected application is supported.
- Config environment flags accept only `true`/`false`; URLs and domain inputs are validated. Server errors are mapped to safe error codes. CSV export guards formulas preceded by whitespace/control characters.
- Application payload fields render as plain text; free-mail/domain mismatch and possible-duplicate checks are advisory. Evidence opens in a blind text-only panel. Reports now calculate agreement, false-pass and adjustment figures from completed decisions rather than displaying fabricated fixed percentages. Audit log and notifications use backend methods in mock mode; notification counts match the feed. Password recovery calls Supabase Auth in real mode and is clearly marked simulated in mock mode.

**Backend interface:** Auth sign-in/sign-out/profile/MFA/password-recovery methods; queue counts; applications and decisions; subscription control; reviews and decisions; tickets and transitions; agent runs and retry; config; staff; audit log; notifications and mark-read; demo reset. Mock and Supabase adapters implement these methods. The Supabase adapter is **provisional**: its table/view/column/function names and payloads have not been checked against the separate shared backend contract.

**External backend requirements / blockers before production data is enabled:**
- The authoritative shared `docs/CONTRACT.md` is not present in this project. The repository's contract file is a hand-off note, not that contract. Do not treat the Supabase adapter as production-integrated until exact schemas, RLS, function payloads, role fields, statuses, and error contracts are verified.
- Confirm `profiles`, `applications`, `audits`/`admin_borderline_v`, `tickets`/`admin_tickets_v`, `agent_runs`/`admin_agent_runs_v`, `app_config`, `admin_users_v`, `admin_audit_log_v`, and `notifications` field names, joins, and policies. In particular, the sanitized `admin_audit_log_v` and actor labels are a provisional assumption.
- Server-side functions must enforce admin role, recent `aal2`, cross-reviewer/assigned-reviewer rules, atomic transitions, idempotency, validation, audit writes, and kill-switch behavior. Frontend MFA prompts alone are not authorization controls.
- Signed video/document URLs, playback and transcript loading are not implemented; the current blind workbench displays text excerpts only. Library editing and user-role changes are intentionally read-only. Notification Realtime is not implemented; the feed polls periodically.
- Reports depend on `human_overall` or `adjusted_overall` being exposed by the eventual review view. Agreement tolerance is 5 points (`TODO(decision)`: confirm with rubric owners). Small samples are explicitly flagged.
- No student lookup or identity-bearing review payload is added. No non-admin UI or separate shared backend is modified.

**Quality results (current workspace):**
- Latest verification after the back-navigation and desktop-rail refinements: `npm run typecheck` **pass**, `npm run lint` **pass**, `npm test -- --run` **30 passed**, and `npm run e2e` **3 passed**. E2E verifies back-to-queue actions on Approvals/Reviews/Tickets, the run-details back action, desktop rail geometry, responsive icon selection, mobile/tablet navigation, exports, setting saves, typed confirmations, and keyboard navigation.
- Axe: **0 serious/critical violations across 28 checked states**, including export, settings, typed-confirmation, and step-up dialogs. Responsive overflow: **pass** at 360 / 375 / 390 / 768 / 1024 / 1440 px; E2E verifies the rail is hidden below 1024 px, the tablet drawer works at 768 px, and the desktop rail is 256 px wide below the 56 px top bar.
- `npm run build`: **pass**. Source/build security scan passed and emitted no mock adapter chunk; `npm run security:check` source-only scan also passed. This verifies the frontend bundle, not a live Supabase deployment.
- Latest measured gzip bundle sizes: base JS **115.43 KB**, lazy admin-pages chunk **16.86 KB**, Supabase JS chunk **3.67 KB**, Supabase client chunk **31.63 KB**, CSS **18.22 KB**.
- Lighthouse: **not measured**. Manual keyboard/real-device testing: **not completed**.
- `npm audit --omit=dev`: **0 vulnerabilities**. Full dependency audit: **7 development-tree findings** (2 moderate, 5 high; including `@vitest/mocker`, `braces`, `chokidar`, `fast-glob`, `micromatch`, `tailwindcss`, and `vitest`); no critical findings. Tailwind 3.4 was retained to avoid a breaking major-version upgrade.

**Safe defaults / TODOs:**
- `TODO(decision)`: confirm the five-point agreement tolerance with rubric owners.
- `TODO(decision)`: deployment protection or an IP/network allow-list is a deployment decision, never a substitute for authentication/MFA.
- `TODO(backend)`: replace provisional Supabase mappings with the authoritative contract; verify all RLS, view, Edge Function, storage, audit and notification behavior before enabling real data.
- Until then, mock mode is the only verified end-to-end workflow. The mock demo uses fictional people, universities and organizations and is visibly labeled **Sample**.

**Latest verification-related changes:** `frontend/src/components/BrandLogo.tsx`, `frontend/src/pages/AuthPages.tsx`, `frontend/src/components/AppShell.tsx`, and `frontend/index.html` (supplied wordmark in the UI plus new favicon and Apple touch icon); `public/aptohire-logo.png`, `public/aptohire-mark.png`, `public/favicon.png`, and `public/apple-touch-icon.png`; `frontend/src/app/providers.tsx` (safe backend-init failure state and idle-warning focus trap); `backend/src/adapters/supabase.ts` (pending MFA enrollment cleanup); `frontend/src/pages/AdminPages.tsx`, `frontend/src/components/ui.tsx`, and `frontend/src/styles/globals.css` (step-up, focus containment, keyboard-focusable table regions, and contrast fixes); `e2e/admin-workflows.spec.ts`, `e2e/admin-smoke.spec.ts`, `tests/modal.test.tsx`, and `tests/idle-warning.test.tsx` (logo/favicon, export/reset, Axe-dialog, tablet/mobile navigation and keyboard coverage); `frontend/src/styles/modern-ui.css`, `frontend/src/app/App.tsx`, `frontend/src/components/BrandLogo.tsx`, and `frontend/src/pages/AdminPages.tsx` (shared UI/UX refresh, polished desktop rail, responsive drawer, select styling, and back-navigation controls); `README.md`; `docs/BUILD-REPORT.md`; `docs/PLAN.md`.

**What to verify next:**
1. Supply the authoritative shared backend contract without modifying the separate shared backend.
2. Validate all provisional Supabase mappings and Edge Function payloads against that contract, then run integration/RLS tests in a non-production project.
3. Implement and verify signed evidence/video/transcript flows with identity-blind server responses.
4. Complete manual keyboard, screen-reader and device testing; measure Lighthouse only against the deployed build.
