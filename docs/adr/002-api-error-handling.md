# API error handling

Date: 2026-10-30 (UTC)
Status: Proposed

## Decision

- Backend returns appropriate HTTP statuses, stable error codes, and safe validation details.
- Fetchers throw on failure and preserve error information for callers, including network failures.
- UI chooses user-facing messages and recovery actions, with a generic fallback for unexpected errors.
- Human-readable messages are not error identifiers. Backend messages are displayed only when designed for users.
- Internal diagnostics stay in server logs; secrets are never logged or returned.

## Reason

Separate failure details from presentation so clients can give useful feedback without exposing internal errors.

## Open

Error codes and the response shape remain undefined. This guides the validation-message TODOs in `apps/web/src/routes/index.tsx`; implementation is deferred.
