# BasItna — "Proof, Not Data."

Privacy-preserving identity verification layer for Pakistani CNIC workflows. Organizations get a
temporary, audience-bound **proof** ("Identity Verified" / "18+ Verified") instead of a CNIC number or scan.

## Run locally

```bash
npm install
cp .env.example .env      # then fill BASITNA_HMAC_SECRET (+ DATABASE_URL for PostgreSQL)
npm run dev               # http://localhost:3000
npm test                  # unit tests
npm run lint              # type-check
```

- No `DATABASE_URL` → in-memory demo store (the UI header says so). With `DATABASE_URL` the schema is created automatically in PostgreSQL.
- No `BASITNA_HMAC_SECRET` in development → a random ephemeral secret is generated. **In production the server refuses to start without it.**

## Production checklist
`NODE_ENV=production`, `BASITNA_HMAC_SECRET` (>= 32 chars), `DATABASE_URL`, `ADMIN_API_KEY`, run behind HTTPS (HTTP is redirected, HSTS is sent), `npm run build && npm start`.

## How it matches the proposal
| Proposal | Implementation |
|---|---|
| HMAC-SHA256 with key outside DB | `src/utils/crypto.ts` + `src/utils/config.ts` (env only, derived sub-keys) |
| Token bound to one org + one purpose, single use, limited validity | Org/purpose/expiry in token, HMAC signature, atomic single-use, TTL capped at 24h server-side |
| Org states purpose, gets only that proof | Organizations are authenticated (`x-org-key`) and must send a purpose; orgs can only request their `allowedPurposes` |
| Mock NADRA behind one function | `verifyWithNadra(cnic)` — small dummy registry, unknown CNICs rejected |
| PostgreSQL | `PgStore` in `src/db/database.ts` |
| Privacy Score + sensitive-data detection | `src/utils/formAnalyzer.ts` (`detectSensitiveCategory`, local heuristic + Gemini) |
| Stores HMAC + token records only | Schema has no CNIC/DOB/image columns; the "raw CNICs stored" counter is measured by scanning stored data |

## API
- `POST /api/tokens/issue` `{ cnic, organizationId, purpose, ttlHours }`
- `POST /api/tokens/verify` `{ token, organizationId, purpose }` + header `x-org-key`
- Admin (need `x-admin-key`, or demo mode): `GET /api/tokens/list`, `GET /api/audit-logs`, `GET /api/database/dump`, `POST /api/reset`
