# Research: Inbound Mail Testing System

**Branch**: `001-inbound-mail-threading` | **Date**: 2026-04-02

## Tech Stack Decisions

### Decision 1: Backend Framework — NestJS

- **Decision**: NestJS v10+ with TypeScript
- **Rationale**: Specified in original SPEC.md. Provides modular architecture, dependency injection, built-in support for background services (via `@nestjs/schedule`), and WebSocket gateways for real-time updates. Well-suited for the IMAP worker + API architecture.
- **Alternatives considered**:
  - Express.js: Too minimal — no built-in module system, DI, or lifecycle hooks needed for IMAP connection management.
  - Fastify standalone: Fast but lacks the structured module system NestJS provides for separating IMAP, API, and WebSocket concerns.

### Decision 2: IMAP Library — imapflow

- **Decision**: `imapflow` for IMAP connectivity
- **Rationale**: Specified in original SPEC.md. Modern async/await API, supports IMAP IDLE natively, built-in mailbox locking via `getMailboxLock()`, streaming support for large messages. Same author as `mailparser` which we'll use for parsing.
- **Alternatives considered**:
  - `node-imap`: Older, callback-based API, less ergonomic.
  - EmailEngine: Overkill for single-mailbox internal tool; adds infrastructure complexity (separate service).

### Decision 3: Email Parsing — mailparser

- **Decision**: `mailparser` for MIME parsing, encoding handling, and attachment extraction
- **Rationale**: Handles base64, quoted-printable, multipart MIME, HTML/text body extraction, and attachment parsing out of the box. Same ecosystem as `imapflow`.
- **Alternatives considered**:
  - Manual parsing: Error-prone for MIME edge cases, encoding issues.

### Decision 4: Database — PostgreSQL + Prisma ORM

- **Decision**: PostgreSQL with Prisma ORM
- **Rationale**: PostgreSQL specified in original SPEC.md. Prisma provides type-safe queries, auto-generated client, easy migrations, and excellent NestJS integration. JSONB support for raw headers storage.
- **Alternatives considered**:
  - TypeORM: More mature NestJS integration but less ergonomic query API and more complex migration system.
  - Drizzle: Newer, lighter, but less ecosystem support in NestJS.
  - Raw SQL: Too much boilerplate for a CRUD-heavy application.

### Decision 5: Frontend — React (Vite)

- **Decision**: React 18+ with Vite bundler
- **Rationale**: Lightweight SPA sufficient for this internal tool. Vite provides fast dev experience. React ecosystem offers rich component libraries. No SSR needed for an internal testing tool.
- **Alternatives considered**:
  - Next.js: SSR/SSG unnecessary for internal tool, adds deployment complexity.
  - Vue.js: Viable but team preference is React (NestJS ecosystem alignment).
  - Plain HTML/JS: Would lack component reusability and state management for thread/email views.

### Decision 6: Real-time Updates — WebSocket (Socket.IO)

- **Decision**: Socket.IO via `@nestjs/websockets` + `@nestjs/platform-socket.io`
- **Rationale**: NestJS has first-class WebSocket gateway support. Socket.IO handles reconnection, fallback transports, and room-based broadcasting (useful for per-thread subscriptions). Lighter than adding Redis/BullMQ for this use case.
- **Alternatives considered**:
  - Server-Sent Events (SSE): Simpler but unidirectional, no room support.
  - Polling from frontend: Wastes bandwidth, higher latency.
  - BullMQ + Redis: Overkill for single-instance internal tool.

### Decision 7: Project Structure — Single NestJS App + Separate Frontend

- **Decision**: Single NestJS application (API + IMAP worker in same process) with separate Vite React frontend.
- **Rationale**: For an internal testing tool with moderate volume, a monorepo with separate apps is unnecessary complexity. The IMAP worker runs as a NestJS service within the same application, using `OnModuleInit` for lifecycle management. This simplifies deployment (one backend process) and shared database access.
- **Alternatives considered**:
  - NestJS monorepo (apps/api + apps/worker): Adds build complexity, inter-process communication — unnecessary at this scale.
  - Full monorepo with Nx: Over-engineered for a small internal tool.

### Decision 8: Attachment Storage — Local Filesystem

- **Decision**: Store attachments on local filesystem under a configurable directory
- **Rationale**: Specified in spec assumptions. Simplest approach for internal tool. Served via NestJS static file serving or a dedicated download endpoint.
- **Alternatives considered**:
  - S3/MinIO: Future enhancement, not needed for V1.

## Key Best Practices Applied

1. **IMAP Connection Management**: Use `imapflow`'s `getMailboxLock()` for safe concurrent access. Implement `OnModuleInit`/`OnModuleDestroy` for lifecycle.
2. **IMAP IDLE**: Use native IDLE support in `imapflow` for real-time email detection; fall back to polling if IDLE drops.
3. **Graceful Shutdown**: NestJS lifecycle hooks ensure IMAP connections and DB sessions close on SIGTERM/SIGINT.
4. **Deduplication**: Unique constraint on `message_id` in database; upsert pattern on insert.
5. **HTML Sanitization**: Use sandboxed iframe with `sandbox` attribute for HTML email rendering to prevent XSS.
