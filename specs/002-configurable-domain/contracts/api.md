# API Contracts: Configurable Email Domain

**Branch**: `002-configurable-domain` | **Date**: 2026-04-03

## New Endpoint

### GET /api/config

Returns the current mail domain configuration. Used by the frontend to display correct domain references in UI text.

**Response** `200 OK`:
```json
{
  "mailDomain": "rn.work",
  "mailBaseAddress": "gens"
}
```

**Notes**:
- No authentication required (internal tool).
- Values are read from environment variables at startup and do not change at runtime.
- Response is cacheable (values won't change until backend restart).

## Existing Endpoints (No Changes)

All existing endpoints (`GET /api/threads`, `GET /api/threads/:tag`, `GET /api/emails/:id`, `GET /api/attachments/:id/download`, `DELETE /api/threads/*`) remain unchanged.

## Environment Variables (New)

| Variable | Default | Description |
|----------|---------|-------------|
| `MAIL_DOMAIN` | `rn.work` | Target email domain for filtering incoming emails |
| `MAIL_BASE_ADDRESS` | `gens` | Base local-part address (before `+`) for thread labels |
