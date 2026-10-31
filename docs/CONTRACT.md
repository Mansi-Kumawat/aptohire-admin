# AptoHire backend ↔ portal contract

**Status as of 2026-10-31: backend local verification is user-reported as passing; Admin source-level contract review and adapter tests are complete for the projections and payloads listed below. Hosted Admin authentication/data acceptance is not confirmed.** This file is the contract-package index and acceptance record. It does not claim production readiness.

## Authoritative sources

- [`FROZEN-CONTRACTS.md`](./FROZEN-CONTRACTS.md) is the binding frontend request/response, field, enum, bound, and error contract transcribed from the five portal prompts. Do not rename or reinterpret it without an explicit product decision.
- `supabase/functions/_shared/schemas/` contains server-side request/response validators; the generated export copies public schema sources under `contract-dist/schemas/`.
- The current database object/column inventory is generated in `contract-dist/INVENTORY.md`; live local PostgreSQL schema and TypeScript types are emitted as `contract-dist/database-schema.sql` and `contract-dist/database.types.ts` when `npm run contract:export` runs successfully against the local stack.
- `docs/prompts/00-aptohire-backend-prompt.md` and `docs/prompts/00b-aptohire-backend-delta-prompt.md` remain the requirements sources. `docs/PLAN.md`, `docs/DELTA_AUDIT.md`, and `docs/TODO_DECISIONS.md` track implementation scope and open limitations.

**Important distinction:** a generated schema/inventory describes backend source and database shape; it does not prove that a portal calls the API correctly or that authorization is correct. The frozen prompt contract is the required interface; portal source review and acceptance tests are still needed.

## Backend verification record

The user reports that the latest local run passed:

- `deno check`, `deno lint`, and `deno test -A`;
- `npm run check:static` and `npm run db:test`;
- the local Supabase Storage integration test (not ignored);
- `npm run types` and `npm run contract:export`;
- local Edge Function serving, including the `public-verify` synthetic non-existent-id request returning the expected `404 NOT_FOUND`, and a read-only OPTIONS route sweep with no `BOOT_ERROR`.

These are **user-reported results**, not independently executed by the assistant. The `OPTIONS` sweep confirms routes can be reached without a worker boot error; it is not a behavioral/authenticated integration test for each function. Do not treat it as proof that every portal flow or every RLS policy has been accepted.

## Shared calling rules

- Edge Function base: `${SUPABASE_URL}/functions/v1`.
- Use the public anon key only as the public API key for anonymous functions. User-facing functions use the signed-in user's JWT. Admin functions require an admin JWT with `aal2` (MFA). Never put a service-role key in a browser or portal project.
- Common error envelope: `{ "error": { "code": "…", "message": "…", "fields"?: { "field": "…" } } }`. Render safe, user-facing messages; do not show raw backend/provider messages.
- Validate with the exact frozen request/response schemas. Render only response fields actually present; optional or ungranted fields must not be fabricated.
- Treat student-provided text and uploaded content as untrusted. Do not send real student data to direct providers or n8n during local verification.

## Portal API map from the frozen contract

| Portal | Contracted functions / surfaces | Integration acceptance |
|---|---|---|
| Root site | `public-verify`, `submit-application` | **Not confirmed:** portal source is not present in this workspace. |
| Student | `complete-signup`, `register-student`, `confirm-affiliation`, `assign-project`, `submit-project`, `respond-access`, `withdraw-access`, `profile-sync`, `export-my-data`, `delete-my-account`; student views/RPCs in `FROZEN-CONTRACTS.md` | **Not confirmed:** portal source is not present in this workspace. |
| University | `complete-signup`, `roster-import`; university views, roster and Storage paths | **Not confirmed:** portal source is not present in this workspace. |
| Organization | `complete-signup`, `extract-job-skills`, `match-job`, `request-access`, `reveal-student`; blind candidate/request views | **Not confirmed:** portal source is not present in this workspace. |
| Admin | `admin-approve-university`, `admin-approve-org`, `admin-set-subscription`, `admin-review-audit`, `admin-decide-ticket`, `admin-update-config`, `admin-retry-run`; admin views plus allowlisted blind reads from `audits`, `skill_scores`, `submissions`, and `skills` | **Source review + adapter tests complete for field selections/payload mapping; hosted sign-in, MFA, RLS and live data acceptance remain unconfirmed.** `admin-view-student` is not used because the frozen contract forbids rendering student identity. |

The Root, Student, University and Organization portal sources were not included in the backend workspace inspected for this contract cleanup. The Admin source is present in the separate `aptohire-admin` workspace and has now been compared against the local backend schemas, migrations, views and Edge Function validators. This source review and local adapter tests do not prove hosted MFA, RLS behavior, deployed function versions, or live-data acceptance; those still require the owner-run Step 2 smoke test.

## Portal integration acceptance checklist

For each of the five portals, acceptance is complete only after reviewing that portal's actual source and verifying all of the following against `FROZEN-CONTRACTS.md`:

1. Function name, HTTP method, URL, headers, authentication, and role/MFA requirements match.
2. Request payloads are validated against the exact field names, enum values, bounds, and strictness; sensitive values are not logged, persisted in browser logs, or placed in URLs.
3. Responses and optional fields are parsed with the frozen schemas; the UI does not invent data or render fields the user is not authorized to see.
4. Error codes, rate limits, loading/retry behavior, and conflict/expired/unauthorized states are handled without leaking raw server messages.
5. Database views/RPCs and Storage paths use only the documented projections and owner/member scopes; browser code never uses service-role credentials or bypasses RLS.
6. The portal's build/tests and local synthetic end-to-end checks pass against this backend. Any mismatch is reported as a discrepancy; do not silently change the frozen contract.

## Contract package handoff

1. In the local backend checkout with the local Supabase stack running, regenerate the package after this contract file changes: `npm run types` and `npm run contract:export`. This makes the exported `contract-dist/CONTRACT.md` and generated schema/types correspond to the local migrations. These commands do not reset the database.
2. For an **audit-only first pass**, upload to each relevant portal workspace: `contract-dist/CONTRACT.md`, `contract-dist/FROZEN-CONTRACTS.md`, only that portal's relevant files under `contract-dist/schemas/`, and `contract-dist/database.types.ts` if the portal uses generated Supabase types. `INVENTORY.md` is a static inventory, not a substitute for the contract. Ask the portal/code assistant to produce a mismatch report only—do not edit the frozen contract or make code changes yet.
3. Review the mismatch reports against the actual portal source. Integration acceptance is complete only after the actual call sites, permissions, UI behavior, and portal build/tests have been checked. The contract upload alone is not acceptance.

Never upload `.env`, `.env.local`, anon/service-role keys, provider keys, HMAC/pepper values, OAuth credentials, real account credentials, or student data. Keep all n8n workflows inactive. Do not point portals at a hosted project until a deliberate staging review and security approval are complete.

## Known backend/frozen-contract discrepancy

- The frozen admin contract includes `admin-seed-reset`; that Edge Function is intentionally **not implemented**. The Admin UI does not present a reset action. `npm run db:reset` is guarded for the local fictional fixture database only; do not add a hosted reset action or direct a portal to invoke a database reset.
- Frozen Admin settings require a daily cap of 0–50 and a video duration of 30–600 seconds. Current backend validators accept a daily cap of 1–100 and video duration of 1–3600 seconds. The Admin editor limits updates to 1–50 and 30–600 (zero is rejected by the backend); its read parser accepts the broader backend ranges so existing values do not prevent the rest of the settings page from loading. This remains an unresolved backend/product-contract discrepancy.
- The frozen settings UX requires a reason, but the current `admin-update-config` request schema accepts only `{ key, value }`. The Admin requires a typed on-screen reason for relevant changes but cannot persist that reason through this endpoint; do not claim it is stored in the audit log.
- Notifications are read-only in real mode because the backend has no supported mark-read action; the real-mode UI hides that control. Rejected applications cannot be reopened through the current approval functions; the UI no longer offers a misleading reconsider action.

## Remaining acceptance limits

- Root, Student, University and Organization source comparison remains pending in this workspace. Admin's local checks pass, but its owner-run hosted sign-in/MFA/data smoke test and full behavioral integration acceptance are not confirmed.
- n8n import/runtime/operator review is pending; workflow exports remain inactive and local-synthetic-only.
- Provider-generated semantic embeddings are not implemented; current missing-vector fallback is deterministic mock embedding, not semantic embedding.
- Broader agent/media capabilities and a separate policy-by-policy security review are not established by the reported test pass.
- Hosted staging, deployment, and production security review are deferred. No production-readiness claim is made.

---

## Generated inventory

See [INVENTORY.md](./INVENTORY.md) for migrations, SQL objects, policies, grants, buckets, Realtime tables, Edge Function folders, and schema sources. The implementation and verification status in the source contract remains authoritative.
