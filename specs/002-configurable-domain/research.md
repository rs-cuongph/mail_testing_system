# Research: Configurable Email Domain

**Branch**: `002-configurable-domain` | **Date**: 2026-04-03

## Tech Stack Decisions

### Decision 1: Configuration Mechanism — NestJS ConfigService

- **Decision**: Use existing `@nestjs/config` `ConfigService` (already globally registered) to read `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` from environment.
- **Rationale**: Zero new dependencies. `ConfigModule.forRoot({ isGlobal: true })` is already in `AppModule`. Services can inject `ConfigService` and call `.get('MAIL_DOMAIN', 'rn.work')`.
- **Alternatives considered**:
  - Dedicated config module with validation (class-validator): Overkill for 2 string variables.
  - YAML/JSON config files: Adds filesystem dependency, Docker volume complexity.
  - Database-stored config: Over-engineered — restart-based config change is acceptable for this internal tool.

### Decision 2: Frontend Config Delivery — API Endpoint

- **Decision**: Create a `GET /api/config` endpoint on the backend that returns `{ mailDomain, mailBaseAddress }`. Frontend fetches once on startup.
- **Rationale**: 
  - Vite build-time env vars (VITE_*) are baked into the JS bundle — changing domain would require a frontend rebuild.
  - A runtime API call means the frontend container doesn't need to rebuild when domain changes.
  - Minimal overhead: one fetch on page load, cacheable.
- **Alternatives considered**:
  - `VITE_MAIL_DOMAIN` build-time env: Requires Docker rebuild on domain change. Rejected.
  - Server-rendered HTML injection: No SSR in this project. Not applicable.
  - `window.__CONFIG__` injected via nginx sub_filter: Possible but fragile and harder to maintain.

### Decision 3: Domain Validation — Lightweight Regex

- **Decision**: Validate `MAIL_DOMAIN` with a simple regex check at startup. If invalid, log a warning and fall back to `rn.work`.
- **Rationale**: Prevents silent misconfiguration. A basic domain pattern (`/^[a-z0-9.-]+\.[a-z]{2,}$/i`) catches obvious errors (spaces, special chars) without being overly strict.
- **Alternatives considered**:
  - No validation: Risk of silent failure with typos.
  - `class-validator` IsURL/IsFQDN: Adds dependency for one check.
  - Strict RFC 1035 validation: Over-engineered for an internal tool.

### Decision 4: MailParserService Domain Filtering — Constructor Injection

- **Decision**: Inject `ConfigService` into `MailParserService` and read `MAIL_DOMAIN` once in the constructor, storing it as a private field.
- **Rationale**: Domain doesn't change at runtime. Reading once avoids repeated config lookups. `endsWith('@' + domain)` is more correct than `includes('@rn.work')` (prevents partial matches).
- **Alternatives considered**:
  - Pass domain as a method parameter from ImapService: Violates single-responsibility — MailParserService should own its filtering logic.
  - Read env directly (`process.env`): Bypasses NestJS DI, harder to test.

## Key Implementation Notes

1. **Hardcoded locations to update** (from grep):
   - `backend/src/imap/mail-parser.service.ts:37` — domain filter (`@rn.work`)
   - `backend/src/imap/imap.service.ts:149` — fallback domain (`'rn.work'`)
   - `frontend/src/App.tsx:42` — empty-state text
   - `frontend/src/components/ThreadList.tsx:99` — empty-state text
   - `backend/.env.example`, `docker-compose.yml`, `README.md` — documentation

2. **Backward compatibility**: Default values (`rn.work`, `gens`) ensure no breaking changes for existing deployments.

3. **No database changes needed**: Domain/base address are runtime config, not stored data. Existing `Thread.fullAddress` field already stores the computed address.
