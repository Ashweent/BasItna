# Fixes applied (proposal vs. implementation)

1. PostgreSQL is now real (`PgStore`, auto-creates schema, atomic single-use). In-memory store only if `DATABASE_URL` is unset (UI shows which one is active).
2. HMAC secret only from env (`BASITNA_HMAC_SECRET`); no hardcoded key anywhere; production refuses to start without it; sub-keys derived per purpose. Frontend playground uses a clearly fake demo key.
3. Mock NADRA = small dummy registry only; unknown CNICs are rejected; response exposes only `isAlive`/`is18Plus`; `/api/nadra/lookup` removed.
4. Inspection endpoints (`tokens/list`, `audit-logs`, `database/dump`, `reset`) need `x-admin-key` (or demo mode); disabled in production without `ADMIN_API_KEY`.
5. Organizations authenticate with a per-org API key (`x-org-key`); tokens carry an HMAC signature binding token+org+purpose+proof+expiry.
6. TTL enforced server-side (1 min .. 24 h); 72h option removed from UI.
7. Token codes use CSPRNG over an unambiguous alphanumeric alphabet (BI-XXXX-XXXX); rate limiting on issue/verify/analyze.
8. Purpose enforcement: purpose is mandatory and must be in the organization's `allowedPurposes` (server-side); UI disables disallowed proofs.
9. `STUDENT_STATUS` removed (not in proposal, not verifiable).
10. "CNICs stored" is measured by scanning stored data (header + dump), not hardcoded.
11. HTTPS redirect + HSTS + security headers in production; expired tokens purged after 24h; Gemini model configurable (`GEMINI_MODEL`, default gemini-2.5-flash); automatic sensitive-field detection (`detectSensitiveCategory`).
12. Hygiene: package renamed, real README, `.env.example` completed, `.aistudio/` and stale `bun.lock` removed, esbuild peer conflict fixed, missing `Check` import fixed, 23 tests (`npm test`).

Not changed: frontend stays Vite + React (proposal says "React / Next.js"); the "Google Form" is still a simulated form.

## Update 2
- Email is no longer university-specific: any school / college / university / personal email is accepted (format-validated only).
- New "Institution Type" dropdown: School, College, University, Undergraduate, Postgraduate.
- On token generation the citizen sees "Your Details" (email, institution type, masked CNIC). These are echoed back only: not stored, not logged, not sent to the organization (keeps "Proof, Not Data").
- Form-analyzer sample label changed from "University Email" to "Email Address (School / College / University)".
- Removed the "Target Organization (Audience-Binding)" selector from the Citizen form. Tokens are now always issued for the default organization (fast-nuces); the server-side audience binding is unchanged.
