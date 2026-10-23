# AptoHire Admin console

**AptoHire — Hired for what you can do.** This repository is the independent admin console for AptoHire staff. It is a Vite + React + TypeScript app. It runs locally with fictional sample data and can be connected to the shared Supabase project after the backend contract is available.

This is the most privileged AptoHire web surface. It requires an admin account and two-step verification. Reviews hide student identity. The console has no public account creation and no impersonation. A shared responsive visual system keeps the operational pages consistent across desktop, tablet, and mobile, with restrained transitions, keyboard-visible focus, reduced-motion support, and styled form controls.

## 1. How it fits with AptoHire

AptoHire has five separate web projects: the root site, Student, University, Organization, and Admin. This repository is only the Admin project. It has its own domain (`admin.aptohire.com`) and deployment. All portals may connect to one shared Supabase database, where database policies and server functions enforce access.

The admin URL is not a secret. Security depends on authentication, two-step verification, database policies, and server-side checks.

## 2. Frontend and backend folders

- `frontend/` contains the browser app: routes, gates, shell, pages, styles, and public HTML entry point.
- `backend/` contains the app's data-access boundary: domain types, mock adapter, Supabase adapter, and the one Supabase client factory. It is **not** the shared Supabase backend project and does not contain migrations or Edge Functions.
- `docs/` contains the build plan and the contract hand-off note.
- `tests/` contains unit and component test setup.
- `public/` contains the supplied AptoHire wordmark/icon assets, favicon, and crawler rules.

React components use the `Backend` interface; they do not import the Supabase SDK or call `fetch`. The mock adapter is used by default. The Supabase adapter must be checked against `docs/CONTRACT.md` before production data is enabled.

## 3. Prerequisites

1. Install Node.js LTS (Node 20.19+ for the current Vite toolchain) and Git.
2. Open a terminal in this folder.
3. Install packages:

```bash
npm install
```

## 4. Run the fictional demo

1. Copy `.env.example` to `.env.local`.
2. Leave `VITE_USE_MOCKS=true` and `VITE_DEMO_MODE=true`.
3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:5177`.
5. Choose **Continue with demo account**. On first sign-in, enrol a TOTP authenticator. In mock mode only, enter `123456` as the six-digit code. Sign out and sign back in to see the challenge screen.

The accounts and data are fictional. The mock adapter adds a short delay and validates approval, review, appeal, and configuration mutations locally. A normal demo admin is `admin@demo.aptohire.test`. To exercise the different-reviewer scenario, sign out and sign in through the email form as `reviewer2@demo.aptohire.test` after assigning the ticket. Mock mode accepts a typed password; it is not a real account credential.

Other fictional role examples are `aarav@unia.edu.test`, `tpo@unia.edu.test`, and `recruiter@orga.demo.test`. They should see a refusal, not admin queues.

## 5. Connect to the shared Supabase project

1. Copy the backend team's current `docs/CONTRACT.md` into this repository at `docs/CONTRACT.md`.
2. Review the exact table, view, column, and Edge Function names. The contract takes precedence over assumptions in the adapter.
3. Add only the Supabase project URL and public anon/publishable key to `.env.local`:

```dotenv
VITE_APP_ENV=local
VITE_DEMO_MODE=false
VITE_USE_MOCKS=false
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

4. Run `npm run db:types` after setting `SUPABASE_PROJECT_REF` in your shell, then reconcile the adapter mappers with the contract.
5. Confirm that admin database policies require an admin role and the required assurance level, and that each admin Edge Function independently checks authorization and writes its audit event.

**Never put a service-role key, secret key, or privileged server credential in this project.** The browser uses the public key and the signed-in admin session only. The shared backend owns migrations, RLS, storage policies, and Edge Functions; this repository does not modify them.

## 6. First admin account and authenticator

There is no sign-up route. Create the first admin manually by following the shared backend's `scripts/create-admin.sql` procedure. Add `https://admin.aptohire.com/**` and `http://localhost:5177/**` to Supabase **Authentication → URL Configuration**. On first sign-in, the admin must enrol a TOTP authenticator. Keep the recovery secret somewhere safe. If it is lost, another admin must reset the factor.

The UI gate order is session → role → two-step verification → admin pages. A non-admin account is refused before queue data is requested. Real authorization must still be enforced by the backend; the UI is not an authorization boundary.

## 7. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite on port 5177 with a strict port check |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm run lint` | Run ESLint and accessibility checks |
| `npm run test` | Run Vitest tests |
| `npm run build` | Typecheck, create a production build, and run the source/bundle security scan |
| `npm run preview` | Preview the built app |
| `npm run e2e` | Run Playwright tests (requires the browser binaries) |
| `npm run security:check` | Scan source for secret markers, hard-coded component colours, and prohibited identity-switching copy |
| `npm run db:types` | Generate database types from the configured Supabase project reference |

## 8. Read the queues safely

1. In **Approvals**, inspect application details and the informational checks. Approving a university unlocks its roster; approving an organization grants its verified badge. Subscription access is a separate action. Rejections require a reason.
2. In **Reviews**, evaluate the work and evidence without student identity. Confirm or adjust the borderline score. The decision is final and clears the human-review hold.
3. In **Tickets**, acknowledge and assign the appeal to a different reviewer from the person who confirmed the original score. The backend must enforce this too.
4. In **Agent runs**, retry only failed or timed-out runs. Retry is disabled while AI is paused.
5. In **Settings**, pause or resume AI only after reading the consequence. Sensitive settings need a fresh authenticator check. The kill switch blocks new AI reviews and project assignments; student drafts remain.
6. Use **Audit log** as a read-only operational record. Audit-log and report CSV exports require fresh authenticator verification; treat exports as sensitive. All configuration saves also require fresh verification.

## 9. Deploy to Vercel

1. Create a **separate Vercel project** for this repository; do not combine it with the other four portals.
2. Set the root directory to this repository and use the included `vercel.json` rewrites and security headers.
3. Add the domain `admin.aptohire.com` to that Vercel project.
4. Set `VITE_APP_ENV=production`, `VITE_DEMO_MODE=false`, `VITE_USE_MOCKS=false`, `VITE_SITE_URL=https://admin.aptohire.com`, and the public Supabase URL/key. Do not set `VITE_DEMO_PASSWORD`.
5. Add the production and local callback patterns in Supabase Authentication URL Configuration.
6. Create and test the first admin using the backend procedure; confirm TOTP and server-side authorization before inviting staff.

`// TODO(decision): A human owner may add Vercel Deployment Protection or a network/IP allow-list in front of the project. Do not treat that as a substitute for authentication and two-step verification.`

## 10. Common problems

- **Blank page:** check `.env.local` for spelling errors and restart Vite after editing it.
- **Two-step verification required:** finish authenticator enrolment or enter a fresh code.
- **Permission denied:** verify the account role and MFA state in the shared backend. Do not loosen client gates to work around a backend denial.
- **Lost authenticator:** another admin must reset it using the approved backend procedure.
- **Supabase project paused:** restore the project in the Supabase dashboard.
- **Port 5177 is busy:** stop the other process; the dev server intentionally refuses another port.

## 11. Glossary

- **Kill switch:** pauses new AI reviews and project assignments.
- **Borderline:** score range held for a human decision.
- **Appeal / ticket:** a student's request to review a score decision.
- **Step-up:** a fresh authenticator check immediately before a sensitive setting change.
- **Audit log:** append-only record of administrative activity.
- **Mock mode:** local fictional data and test-only behavior; never use for production.

## 12. Prototype limits

The mock flows are suitable for an interface demo, not a security certification. The shared backend contract was not included with this project hand-off. Before real data is enabled, validate every view and function name, identity-dropping mapper, MFA step-up call, policy, audit write, signed URL flow, and error mapping against that contract. The starter library and audit/report sections are explicitly labelled as sample or contract-dependent where applicable.
