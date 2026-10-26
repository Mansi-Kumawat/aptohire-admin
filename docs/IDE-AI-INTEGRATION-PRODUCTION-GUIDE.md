# AptoHire — IDE AI Integration & Production Readiness Guide

**Status date:** 26 October 2026  
**Audience:** The owner and their IDE AI coding assistant  
**Primary reference:** The attached `MASTER-RUNBOOK.md`  
**Purpose:** Inventory what is already built, connect the existing portals through the shared backend, and prepare for a controlled production release. This is an execution guide; it does not deploy anything or change the shared backend.

---

## 1. Important scope and workspace facts

- You said the other portals have already been created. **Do not recreate, replace, or scaffold them again.** Audit the existing folders/repositories and continue from their current state.
- The workspace inspected for this guide contains the **`aptohire-admin/`** project. The root, student, university, organization, and shared backend folders were not present in this workspace snapshot, so their implementation status is **not assessed here**. Their absence here does not mean they are missing from your IDE or computer.
- The attached `MASTER-RUNBOOK.md` was used as the system-level project reference. Leave the uploaded original unchanged.
- The admin repository's `backend/` directory is an **application data-access layer**, not the shared Supabase backend. It contains domain types, mock/Supabase adapters, and the Supabase client boundary; it has no shared database migrations or Edge Functions.
- The standing project boundary is: **do not modify the separate shared backend unless the owner explicitly authorizes it.** For now, let the IDE AI inspect its contract read-only and produce a gap report. Do not let it run production deployment or secret-setting commands.

### Expected AptoHire topology

The Master Runbook describes five independent websites and one shared backend:

| Existing project | Local port | Production host (planned) |
|---|---:|---|
| Root / marketing and verification | 5173 | `aptohire.com` |
| Student | 5174 | `student.aptohire.com` |
| University | 5175 | `university.aptohire.com` |
| Organization | 5176 | `organization.aptohire.com` |
| Admin | 5177 | `admin.aptohire.com` |
| Shared Supabase backend | API 54321 (local) | Supabase project URL |

Use the actual folder names, ports, and domains from your existing projects if they differ. The table is the Runbook's baseline, not permission to overwrite existing configuration.

---

## 2. Admin project status: what is built and what remains

### Built in `aptohire-admin/`

- React, TypeScript, and Vite admin application with a separate frontend and data-access layer.
- Mock mode by default (`VITE_USE_MOCKS=true` in `.env.example`) and a switchable Supabase adapter.
- Auth → role → MFA gate before protected admin pages/data queries; no public admin sign-up route and no impersonation.
- Approval, blind review, ticket/appeal, agent-run, settings, audit-log, reports, notifications, account/security, help, library sample-template, and staff-directory screens.
- Step-up authentication flows and confirmation copy for sensitive operations; kill-switch and demo reset require typed confirmation. Mock mutations are validated and pessimistic.
- Current visual fixes: the Back-to-Applications, Back-to-Review-Queue, and Back-to-Tickets controls are removed; the ticket score ring is in normal document flow and does not overlap the title.
- `.env.example`, `.gitignore`, app docs, tests, and security/build scripts are present.

### Verified for the current admin code

The latest recorded checks passed: TypeScript typecheck, ESLint, **30 unit tests**, **4 Playwright E2E tests**, production build, and source/build security scan. These verify the admin project code and mock flows; they **do not** prove that all portals work together against the real shared backend.

### Remaining admin/product gaps before production

1. **Authoritative backend contract:** `docs/CONTRACT.md` in this repo is a hand-off note, not the shared backend's real contract. The Supabase adapter mappings are provisional until compared with the backend team's actual tables, views, columns, function names, payloads, and errors.
2. **Server-side security proof:** Confirm RLS and every Edge Function independently enforce role, required `aal2`/recent MFA, authorization, validation, atomic state transitions, idempotency, and audit logging. A frontend MFA modal is not a security boundary.
3. **Live integration:** Real Supabase mode and cross-portal journeys have not been verified against your actual project.
4. **Evidence handling:** Signed evidence/video/transcript URLs and playback/loading flows remain deferred; current review evidence is a blind text excerpt.
5. **Account management:** Staff Directory is read-only. There is no staff invitation, role editing, deactivation, deletion, or general student directory in this admin UI. This is not forbidden by the original prompt, but it remains a product decision/feature gap.
6. **Other contract-dependent areas:** Library writes, notification Realtime, and some report fields depend on backend support; notifications currently rely on polling. Confirm report data fields such as human/adjusted scores with the backend contract.
7. **Operational readiness:** Production Supabase/Vercel configuration, email sending, backups/restore rehearsal, monitoring, and manual device/accessibility testing are not established by a successful local build.

Use `TODO(decision)` for policy choices such as whether to add admin-managed staff invitations/account lifecycle and what evidence access scopes are allowed. Do not guess or silently broaden access.

---

## 3. How the portals should connect

### They are separate websites, not one frontend

Keep each existing portal as its own project/repository and deployment. A user signing in to one portal is not automatically signed in to the others; the Runbook says each portal has its own sign-in. Do not merge the five sites into the admin app.

### Browser navigation vs. data sharing

- Use each portal's existing sibling-URL environment variables for links and redirects (for example `VITE_STUDENT_URL`, `VITE_UNIVERSITY_URL`, and `VITE_ORGANIZATION_URL`).
- Share business data through the **shared backend contract** (Supabase/RLS/Edge Functions), not by calling another portal's `localhost` URL or by duplicating client-side state between websites.
- In mock mode, portals use local fictional data and do **not** provide a real cross-portal workflow. Use each portal's demo tools for isolated UI demos. A real connected demo requires all portals to use the same backend project and compatible contract.
- Keep the role boundaries: a student, university, organization, and admin each use their own portal and allowed functions. Never trust a client-side role flag as authorization.

### Local cross-portal URLs

The Admin `.env.example` currently lists these sibling URLs:

```dotenv
VITE_SITE_URL=http://localhost:5177
VITE_ROOT_URL=http://localhost:5173
VITE_STUDENT_URL=http://localhost:5174
VITE_UNIVERSITY_URL=http://localhost:5175
VITE_ORGANIZATION_URL=http://localhost:5176
```

Keep each existing portal's values consistent with the actual local ports. For the backend's local CORS allow-list, the Runbook baseline is:

```dotenv
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177
```

---

## 4. How to connect each portal to the backend

### 4.1 Get the contract first

1. In the existing shared backend repository, locate its **authoritative** `docs/CONTRACT.md` (or run the backend owner's documented `npm run contract:export`).
2. Have the owner approve a read-only contract audit before any code edits.
3. Compare the exact contract to each portal's adapter. For Admin, start with:
   - `backend/src/domain/types.ts`
   - `backend/src/adapters/supabase.ts`
   - `backend/src/adapters/supabaseClient.ts`
   - `docs/CONTRACT.md`
4. Copy the approved contract into each portal's `docs/` folder as directed by the Runbook. Do not invent schema/function names and do not change UI components to hide a contract mismatch.
5. If the backend needs changes, prepare a separate proposal for the owner. Do not edit the shared backend under the current project boundary.

### 4.2 Mock mode first

For every existing portal, use its `.env.example` to create an uncommitted `.env.local`. Start with:

```dotenv
VITE_USE_MOCKS=true
VITE_DEMO_MODE=true
```

Run each project's own typecheck, lint, tests, and build before enabling real data. Keep fictional people, universities, and organizations labeled **Sample**. Never copy real student data into test fixtures.

### 4.3 Local real-backend mode

Only after the contract is confirmed and the **owner** has started the local backend, configure each portal's local `.env.local` from that portal's `.env.example`. The common browser-facing settings are:

```dotenv
VITE_USE_MOCKS=false
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local public anon key>
```

For an end-to-end **demo** against a local/demo backend, follow the Runbook's approved `VITE_DEMO_MODE` setting and use only fictional seeded accounts. For a real production build, set `VITE_DEMO_MODE=false` and do not set `VITE_DEMO_PASSWORD`.

Rules for keys and environment files:

- Only the **public anon/publishable key** may be used by browser code. Never put a service-role key, database password, pepper, callback secret, or other privileged secret in a `VITE_*` variable.
- Backend secrets belong only in the backend's local ignored env file or the backend host's secret manager. Never paste them into the IDE AI chat, commit them, print them in logs, or add them to this ZIP.
- Use `.env.example` to communicate variable names, not real values. Restart the dev server after changing `.env.local`.

### 4.4 Local shared-backend commands (owner-controlled)

The Master Runbook lists these commands for the **existing backend repo**, with Docker running. They are not commands to run from `aptohire-admin/`:

```bash
cd <existing-aptohire-backend>
npm run db:start
npm run db:reset       # local-only; resets local demo DB
npm run db:test
npm run fn:test
npm run fn:serve       # keep this terminal open
npx supabase status    # copy only the local API URL and anon key
```

The backend repo may have different script names; inspect its `package.json` first. Do not run `db:reset` against a remote project. Do not run `db push`, `functions deploy`, or `secrets set` against a real project from the AI tool; those production actions are owner-operated.

### 4.5 Adapt each portal incrementally

For each existing portal, make a matrix of `UI operation → Backend interface method → contract view/function → role/RLS rule → audit event → test`. Keep Supabase calls in the repository's data adapter/client boundary; UI pages should call the typed backend interface, not import Supabase directly. Add contract tests and safe error mapping where methods are missing. Preserve pessimistic mutation behavior: show success only after the backend confirms it.

---

## 5. Step-by-step workflow for your IDE AI coding tool

Do this in **small phases**. Open the parent folder that contains the already-created portal/backend folders, or open each existing repository in its own IDE window. Do not paste one giant request asking the AI to build/rewrite everything.

### Phase 0 — Read-only inventory (no code changes)

Paste this first:

> Read the attached AptoHire Master Runbook, this repository's README and docs, and inspect the existing portal/backend folders. The portals already exist; do not scaffold, recreate, rename, or overwrite them. Do not modify files in this phase. Do not inspect or print secret values; report only env variable names and whether example/local files exist. Do not touch the uploads folder. Produce a repo map and a Present / Partial / Missing / Not-inspected matrix for: auth/MFA gates, backend contract, adapters, RLS/function enforcement evidence, cross-portal URLs, privacy rules, tests, build/deployment config, and open product TODOs. Clearly mark other portals as Not-inspected if they are outside the opened workspace. Stop for owner review.

Review the report against the real folder names before allowing edits.

### Phase 1 — Contract and integration audit (read-only)

> Compare each existing portal's adapter and environment variables against the authoritative shared backend contract. For each method, list exact contract names, request/response shape, auth role, MFA level, RLS/function enforcement, audit event, and missing tests. Do not edit the shared backend, migrations, or portal code yet. The Admin repo's `docs/CONTRACT.md` is only a hand-off note until replaced with the backend owner's contract. Produce a per-repo gap plan and stop.

If the original backend prompt has already been run, the Runbook says to use its **00b delta prompt** rather than re-running the full backend prompt. Because this project currently forbids edits to the separate shared backend, the AI must not execute that prompt as a mutating task without your explicit authorization.

### Phase 2 — Approve a minimal change plan

Ask the AI for a separate plan per existing repository. Require:

- Files to change, contract assumptions, migration impact (if any), tests to add, rollback plan, and security/privacy risks.
- No changes to completed phases and no broad refactor.
- Any unresolved choice recorded as `TODO(decision)` rather than guessed.
- Backend changes isolated to the backend repo and held for owner approval.

### Phase 3 — Implement one repository/feature at a time

For each approved change, tell the AI:

> Implement only the approved items for this phase in the existing project structure. Keep mock mode as the default and use the project's typed backend adapter. Do not expose secrets or add service-role credentials. Preserve Auth → role → MFA before protected queries; keep review/ticket data blind to student identity; treat user-generated content as plain text; require step-up for dangerous actions and typed confirmation for kill-switch/reset; keep mutations pessimistic. Do not modify the separate shared backend or any other portal unless explicitly authorized. Add tests for the change, then run the repo's typecheck, lint, unit tests, E2E, build, and security scan. Stop and report exact results before continuing.

After human review, commit the phase in its own Git repository. Do not commit `.env.local`, generated secrets, local database files, or test artifacts.

### Phase 4 — Connect portal navigation and shared data

1. Confirm every portal's local/production sibling URLs point to the existing host names.
2. Confirm each portal has its own sign-in and role gate; do not assume a session in one portal automatically authenticates the others.
3. Verify portal-to-portal links use environment variables and safe same-site redirects.
4. Verify shared state changes go through the backend, not browser-to-browser calls.
5. Test authorization for the wrong role and missing/insufficient MFA before testing happy paths.

### Phase 5 — Real integration demo

With the **local/demo** Supabase backend running and all portals set to `VITE_USE_MOCKS=false`, follow the Runbook's flow and record results:

1. Admin approves a pending university; verify the backend transition and audit row.
2. Student starts and submits a project; verify scoring/progress arrives through the backend.
3. Organization sees anonymous candidate cards; verify no names/contact/university are exposed before consent.
4. Organization requests scoped access; student accepts; organization sees only approved scopes and expiry.
5. University sees aggregate funnel/unmatched-demand counts, not student identities.
6. Student generates a verification link; Root displays only the fields the student chose to share.
7. Admin review remains blind; ticket decision is made by an eligible different reviewer.
8. Settings/kill-switch and audit exports enforce step-up; kill-switch and demo reset require typed confirmation.

Reset and repeat twice in a **local/demo** environment to catch state leakage. Do not seed production with demo data.

### Phase 6 — Production readiness and deployment plan

The AI may prepare a checklist and review configuration; the owner executes real-project operations:

1. Verify the authoritative contract, RLS tests, Edge Function authorization, `aal2` step-up, audit writes, idempotency, and safe error behavior.
2. Review all five portal environment variables and allowed origins. Production: `VITE_USE_MOCKS=false`, `VITE_DEMO_MODE=false`, correct HTTPS `VITE_SITE_URL` and sibling URLs, public Supabase URL/anon key only, and no demo password.
3. In Supabase Auth, configure exact production redirect URLs, email confirmation/password policy, TOTP MFA, and production email delivery. Provision the first admin only through the approved owner-controlled backend procedure; no public admin sign-up.
4. Use a separate Vercel project and domain for each existing portal. Configure build root, environment variables, headers/rewrites, and custom domain without merging apps.
5. Store privileged backend secrets in the backend host's secret manager, never in a portal or VITE variable. Use separate local/demo/production values.
6. Run production smoke tests with non-sensitive test accounts; verify wrong-role and missing-MFA refusal, privacy, browser console/network, HTTPS, and mobile layout.
7. Confirm backups and restore procedure, monitoring/alerts, rate limits, data-retention rules, security contact, incident procedure, and rollback to the previous deployment.
8. Do not go live until the owner signs off on the Definition of Done in Section 8.

---

## 6. Commands and connection checklist

### In every existing portal repository

Use the package manager and lockfile already in that repo. For npm projects with a lockfile:

```bash
npm ci
npm run typecheck
npm run lint
npm test -- --run
npm run e2e
npm run build
npm run security:check
```

The Admin repo currently exposes these checks. Other portals may use different script names; inspect each existing `package.json`, do not copy Admin scripts blindly. Playwright may require browser installation (`npx playwright install chromium`) on a fresh machine.

### In the existing backend repository

Use its own README/package scripts and Runbook. The Runbook baseline is `db:reset`, `db:test`, `fn:test`, `fn:check`, and contract export. Run only against local/demo environments under owner supervision. Never edit an already-applied migration; backend owners add new migrations.

### Manual cross-portal checklist

- [ ] All five Vite apps use the same intended environment mode and matching sibling URLs.
- [ ] All real-mode portals point to the same intended Supabase project and public anon key.
- [ ] Local CORS includes ports 5173–5177; production CORS includes only the five HTTPS portal origins.
- [ ] Each site has its own working sign-in and correct role authorization.
- [ ] Admin data queries do not mount until Auth → admin role → MFA succeeds.
- [ ] Organization candidate views are anonymous until explicit student consent.
- [ ] University unmatched-demand is aggregate-only.
- [ ] Review and ticket UIs contain no student identity; unsafe HTML is displayed as plain text.
- [ ] Mutations are pessimistic, audited, and server-authorized.
- [ ] Real cross-portal demo passes twice after a local/demo reset.

---

## 7. Copy-paste safety rules for the AI tool

Include this block at the end of every prompt:

> Safety constraints: work only in the existing repo(s) named for this phase; never recreate the other portals; do not touch `/home/user/uploads/`; do not read, print, or commit secret values; browser code may use only the public Supabase anon/publishable key; never use a service-role key in a portal; preserve Admin Auth → role → MFA gate order; never fetch admin data before all three gates pass; never render student identity in Reviews or Tickets; render user-provided text as plain text, never HTML; use step-up for dangerous mutations, typed confirmation for kill-switch/reset, and pessimistic writes; keep mock mode as default; do not change the shared backend, migrations, or deployed Supabase/Vercel projects without explicit owner authorization; never run real `db push`, function deploy, or secret-setting commands; document unresolved choices as `TODO(decision)`; report tests actually run and their results.

---

## 8. Go/no-go definition of done

Do not call the full AptoHire system production-ready until all applicable items are checked by the owner:

- [ ] Existing five portals and shared backend are inventoried; no portal was accidentally recreated or merged.
- [ ] Authoritative shared contract is copied/versioned in each portal; all adapter methods match exact backend names/payloads.
- [ ] RLS and Edge Function tests pass for both allowed and denied roles, including missing/low MFA assurance.
- [ ] Auth → role → MFA gate is verified before any privileged query; server enforces it independently.
- [ ] Audit records cover sensitive actions; mutations are atomic, idempotent, validated, and pessimistic.
- [ ] Privacy checks pass for organization consent, university aggregates, blind reviews/tickets, and user-generated content.
- [ ] Each portal's typecheck, lint, unit, E2E, build, and security scans pass against the current commit.
- [ ] Full real-mode end-to-end demo passes twice in a demo environment; production has no demo seed/password.
- [ ] Evidence/video/transcript, signed URLs, Library writes, notification behavior, and any deferred feature have either been implemented and tested or explicitly excluded from launch.
- [ ] Staff/user account lifecycle requirements (invite, edit role, disable/delete, student lookup) are resolved; if not in scope, that limitation is documented.
- [ ] HTTPS, email/TOTP MFA, redirects, CORS, environment separation, backups/restore, monitoring, incident/rollback procedures are tested.
- [ ] Keyboard/screen-reader/reduced-motion/responsive testing is completed on real browsers/devices; accessibility review and performance measurement are recorded.
- [ ] Owner has reviewed security findings, deployment plan, billing/compliance implications, and signed off.

---

## 9. Important current TODOs

- `TODO(decision)`: Should Admin have secure staff invitations and account/role management, or remain read-only and defer all account changes to the identity provider?
- `TODO(decision)`: Is a student directory required, and which attributes/roles may see it? Do not add one to blind review/ticket workflows.
- `TODO(decision)`: Confirm agreement tolerance and report field definitions with rubric owners.
- `TODO(backend)`: Replace provisional Supabase adapter mappings with the authoritative contract and test them against local/demo Supabase.
- `TODO(backend)`: Verify RLS, Edge Functions, signed evidence URLs, audit writes, and notification Realtime/polling policy.
- `TODO(release)`: Production domains, email sender, Vercel deployment protection/IP allow-list, monitoring, backups, and incident ownership.

**Current safe state:** Keep the portals in mock mode until the contract and server-side authorization are verified. The successful Admin build/tests are a code-quality checkpoint—not proof of cross-portal integration or production readiness.
