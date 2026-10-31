# Admin portal — Step 2 real-mode smoke test

This is a **demo-environment** checklist for connecting the Admin portal to the owner's already-configured hosted Supabase demo project. It is not a production-launch checklist. It does not authorize database changes, seeds, secret changes, or deployment by an assistant.

## Before touching Vercel

1. Confirm you are using the intended **demo Supabase project**, not production. Never run seed data against production.
2. Confirm the owner has already deployed the backend migrations and Admin Edge Functions, created the first Admin account, and enabled the Admin's MFA/TOTP factor. Do not ask anyone to send you credentials or authenticator codes.
3. Keep the existing Vercel `VITE_DEMO_PASSWORD` value exactly as the owner intends. It is an intentionally public demo placeholder, not a credential and not a substitute for Supabase authentication. Do not copy it into code, screenshots, or chat.
4. Use a separate Vercel project for this Admin repository. Keep the portal's existing UI theme unchanged.

## Vercel project setup

1. Open the Admin project in Vercel. Set its **Root Directory** to the folder containing this Admin `package.json` and `vercel.json` (the root of the standalone Admin ZIP/repository).
2. Use the Vite defaults or set:
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
3. In **Settings → Environment Variables**, add/update these for the **Production** environment (and Preview only if you are deliberately testing a Preview URL):

   | Variable | Value to enter |
   |---|---|
   | `VITE_APP_ENV` | `demo` |
   | `VITE_DEMO_MODE` | `true` |
   | `VITE_USE_MOCKS` | `false` |
   | `VITE_SITE_URL` | The exact stable Admin URL shown in Vercel Domains, including `https://` and no trailing slash |
   | `VITE_SUPABASE_URL` | The demo project's Project URL from Supabase; never put it in source code |
   | `VITE_SUPABASE_ANON_KEY` | The demo project's public anon/publishable key from Supabase; never use `service_role` or a secret key |
   | `VITE_DEMO_PASSWORD` | Keep the already-approved intentional demo placeholder exactly as currently configured; do not paste it into source or chat |
   | `VITE_ROOT_URL` | The deployed root portal URL |
   | `VITE_ROOT_DOMAIN` | The shared root domain used by the portals, without `https://` |
   | `VITE_STUDENT_URL` | The deployed Student portal URL |
   | `VITE_UNIVERSITY_URL` | The deployed University portal URL |
   | `VITE_ORGANIZATION_URL` | The deployed Organization portal URL |

   Do not set a Vercel variable named `SUPABASE_SERVICE_ROLE_KEY`, and do not put any secret backend value in a `VITE_` variable. Vite variables are included in browser builds.
4. Save the variables, then **redeploy** the latest Admin deployment so Vite rebuilds with the new values. Environment changes do not alter a deployment that is already built.
5. In Vercel Domains, confirm the URL used for `VITE_SITE_URL` is assigned to this Admin project and resolves over HTTPS. If using a custom domain, use that exact domain; otherwise use the stable production `*.vercel.app` domain.

## Supabase Auth URL configuration

1. Open **Authentication → URL Configuration** in the same demo project.
2. Add the exact Admin production URL and its password-reset callback path to **Redirect URLs** (for example, `https://<your-admin-domain>/reset-password`). Add the Admin's Vercel Preview URL only if you are testing Preview deployments.
3. This portal supplies `VITE_SITE_URL` as an explicit reset redirect. Because the Supabase project is shared, **do not replace its existing global Site URL** just for this portal; preserve the Root/other-portal value already agreed by the owner. Keep the other portals' approved redirect URLs intact.
4. Do not change email confirmation, RLS, MFA requirements, database policies, or Auth provider settings as a workaround for a portal error.

## Smoke test (no consequential writes)

1. Open the HTTPS Admin URL in a private/incognito window.
2. Click **Use demo email**. With the configured `VITE_DEMO_PASSWORD`, the button now fills both the Admin demo email and password; then click **Sign in**. If the password stays blank, confirm that Vercel has the existing demo variable and redeploy after any variable change. Never send the password or TOTP code in chat.
3. First sign-in: scan the displayed QR code with the Admin's authenticator app, then enter the current six-digit code. If the factor is already enrolled, complete the MFA challenge instead.
4. Confirm the Dashboard loads and the session is accepted as an Admin only after the MFA check.
5. Open **Approvals**, **Staff directory**, and **Audit log** (or Reports). Confirm each either shows real rows or a clear empty state, with no browser-console errors. Do not approve/reject applications, alter AI settings, decide appeals, or retry runs as part of this smoke test.
6. Record only the page name and safe error code if something fails. Do not send passwords, keys, tokens, student data, screenshots with personal data, or raw request headers.

## If MFA setup reports a factor-name conflict

The updated Admin client removes stale **unverified** TOTP factors before enrollment, assigns a unique friendly name to each new enrollment, prevents duplicate verification requests, and uses an already-verified factor for a challenge. If a previously enrolled factor is verified but the authenticator app does not have its matching secret, stop retrying codes: the backend owner must reset that account's factor through the approved Supabase Auth/admin recovery process, then the Admin can enroll again. Do not delete MFA rows with SQL or weaken the `aal2` requirement.

## Step 2 gate and rollback

- This checks the Admin sign-in and read pages only. It does **not** prove the full five-portal Step 2 story, authorize Step 3, or establish production acceptance.
- The Runbook requires portals to use one consistent mode for cross-portal flows. Do not present or run an end-to-end story while some portals use mock data and others use Supabase. If Admin is only being smoke-tested while the rest remain mock, keep that test isolated and switch it back to mocks before any shared demo; otherwise coordinate the real-mode change across all portals.
- If the Admin real-mode smoke test fails, set `VITE_USE_MOCKS=true` on every portal that was switched, redeploy those portals, and verify the demo is consistently back in mock mode. Do not weaken MFA/RLS or add a client-side service key to make it pass.
- A successful local build/test does not substitute for this owner-run hosted check. No hosted Supabase or Vercel change has been made by this work.

## Known Admin contract caveats

- Backend source currently has no `admin-seed-reset` function; reset remains unavailable and is intentionally not shown as a working operation.
- The Admin prompt's frozen cap/duration ranges differ from the latest backend validator. This portal limits changes to the frozen UI range, rejects a zero daily cap (the backend rejects it), and can read backend-supported values more broadly. Resolve this as a product/backend contract decision before relying on those settings.
- The `admin-update-config` Edge Function accepts only `{ key, value }`; any typed confirmation reason is not persisted by that function. Treat it as an on-screen confirmation only, not as an audit-log note.
- Real-mode adapter tests verify field projections and request shapes against local backend source; they cannot establish hosted credentials, seed contents, redirect allowlists, or deployed function versions.
