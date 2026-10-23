# Shared backend contract hand-off

The shared `aptohire-backend/` contract was not present in the supplied project files. Before enabling real data, copy the authoritative `docs/CONTRACT.md` from that backend into this location, preserving the backend team's object names and payloads.

The current `backend/src/adapters/supabase.ts` is a conservative adapter scaffold based on the admin prompt's provisional names. It is not contract-verified. Keep all contract-specific adaptation in `backend/`; do not change the UI to compensate for schema differences.
