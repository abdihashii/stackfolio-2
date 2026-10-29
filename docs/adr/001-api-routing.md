# API routing

Date: 2026-10-28 (UTC)

## Decision

- Browser app calls `/api/v0/...` on `vault.stackfolio.app`.
- Cloudflare routes those requests to the backend.
- Other clients can use `api.stackfolio.app/v0/...`, reaching the same backend.
- Local development uses a Vite proxy to mirror browser routing.
- Both entry points enforce the same authentication and authorization. Other browser origins require explicit CORS permission.

## Reason

Same-origin browser requests keep frontend URLs relative and avoid browser CORS configuration while preserving a separate API address for other clients.

## Open

Cloudflare routing implementation, NestJS/TypeORM runtime compatibility, and production PostgreSQL hosting remain unverified. This records the intended architecture, not completed setup.
