# Implementation Plan: Configurable Email Domain

**Branch**: `002-configurable-domain` | **Date**: 2026-04-03 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-configurable-domain/spec.md`

## Summary

Remove all hardcoded `rn.work` domain references from the mail testing system and replace them with environment-variable-driven configuration (`MAIL_DOMAIN`, `MAIL_BASE_ADDRESS`). This enables deploying the system for any email domain without code changes. The backend reads config via NestJS `ConfigService`, passes domain to `MailParserService` for filtering, and exposes a `/api/config` endpoint so the frontend can display the correct domain in UI text.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 22)  
**Primary Dependencies**: NestJS 10, React 18, Vite, Prisma 7, Socket.IO, imapflow  
**Storage**: PostgreSQL 16 (via Prisma ORM)  
**Testing**: Manual verification (no automated test suite yet)  
**Target Platform**: Docker (linux/amd64), local macOS development  
**Project Type**: Web application (backend API + frontend SPA)  
**Constraints**: Single-domain per deployment — multi-domain out of scope  
**Scale/Scope**: Internal tool, low volume (hundreds of emails/day)

## Constitution Check

*Constitution is template-only (not customized) — no gates to enforce.*

## Project Structure

### Documentation (this feature)

```text
specs/002-configurable-domain/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (changes to existing files)

```text
backend/
├── src/
│   ├── imap/
│   │   ├── mail-parser.service.ts   # MODIFY: inject domain instead of hardcode
│   │   └── imap.service.ts          # MODIFY: read MAIL_DOMAIN/MAIL_BASE_ADDRESS from config
│   ├── config/
│   │   └── config.controller.ts     # NEW: GET /api/config endpoint
│   └── app.module.ts                # MODIFY: register config controller
├── .env                             # MODIFY: add MAIL_DOMAIN, MAIL_BASE_ADDRESS
└── .env.example                     # MODIFY: add MAIL_DOMAIN, MAIL_BASE_ADDRESS

frontend/
├── src/
│   ├── App.tsx                      # MODIFY: fetch config, replace hardcoded text
│   ├── components/
│   │   └── ThreadList.tsx           # MODIFY: replace hardcoded empty-state text
│   └── services/
│       └── api.ts                   # MODIFY: add getConfig() method
└── .env.example                     # no change needed (API URL already configurable)

docker-compose.yml                   # MODIFY: add MAIL_DOMAIN, MAIL_BASE_ADDRESS to env
README.md                            # MODIFY: document new variables
```

**Structure Decision**: No new modules — changes are spread across existing files. One new controller (`config.controller.ts`) for serving config to frontend.

## Proposed Changes

### Backend — MailParserService (Critical Path)

**File**: `backend/src/imap/mail-parser.service.ts`

Current: Line 37 hardcodes `@rn.work` in domain filter.

**Change**: Inject `ConfigService`, read `MAIL_DOMAIN` (default `rn.work`), use it in the `targetAddress` filter.

```typescript
// Before
(addr) => addr.address && addr.address.includes('@rn.work')

// After  
(addr) => addr.address && addr.address.endsWith(`@${this.domain}`)
```

Key: Use `endsWith` instead of `includes` for stricter matching (prevents `@rn.worker.com` from matching).

---

### Backend — ImapService (Fallback Domain)

**File**: `backend/src/imap/imap.service.ts`

Current: Line 149 hardcodes `'rn.work'` as fallback domain.

**Change**: Read `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` from `ConfigService`. Replace hardcoded fallback.

```typescript
// Before
const domain = extracted.toEmail.split('@')[1] ?? 'rn.work';

// After
const domain = extracted.toEmail.split('@')[1] ?? this.configuredDomain;
```

---

### Backend — Config Endpoint (New)

**File**: `backend/src/config/config.controller.ts` (NEW)

Simple controller exposing `GET /api/config` returning:

```json
{
  "mailDomain": "rn.work",
  "mailBaseAddress": "gens"
}
```

No authentication needed (internal tool). Registered directly in `AppModule`.

---

### Frontend — Dynamic Config Display

**Files**: `frontend/src/App.tsx`, `frontend/src/components/ThreadList.tsx`, `frontend/src/services/api.ts`

1. Add `api.getConfig()` method to fetch `GET /api/config`
2. `App.tsx`: Fetch config on mount, pass to children or use in empty-state text
3. `ThreadList.tsx`: Replace hardcoded `gens+tag@rn.work` with config values

---

### Environment & Docker

**Files**: `backend/.env`, `backend/.env.example`, `docker-compose.yml`, `README.md`

Add two new variables:
```env
MAIL_DOMAIN="rn.work"
MAIL_BASE_ADDRESS="gens"
```

Docker-compose passes these to the backend container.

## Complexity Tracking

No violations to justify — this is a straightforward configuration extraction.
