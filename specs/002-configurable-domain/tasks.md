# Tasks: Configurable Email Domain

**Input**: Design documents from `/specs/002-configurable-domain/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project initialization needed — this feature modifies existing files only.

*(No setup tasks — project already exists and is fully functional.)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No new foundational infrastructure needed. All changes build on existing `ConfigService` (already globally registered in `AppModule`).

*(No foundational tasks — `ConfigModule.forRoot({ isGlobal: true })` already in place.)*

---

## Phase 3: User Story 1 — Configure Target Domain (Priority: P1) 🎯 MVP

**Goal**: Remove hardcoded `rn.work` from backend logic so the system processes emails for any domain configured via `MAIL_DOMAIN` environment variable.

**Independent Test**: Set `MAIL_DOMAIN=example.com` in `backend/.env`, restart backend. Send an email to `user+tag@example.com` → verify it appears in the UI. Send an email to `someone@rn.work` → verify it is ignored.

### Implementation for User Story 1

- [x] T001 [P] [US1] Add `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` variables to `backend/.env` and `backend/.env.example`
- [x] T002 [US1] Inject `ConfigService` into `MailParserService` and replace hardcoded `@rn.work` filter with `@${this.domain}` (using `endsWith`) in `backend/src/imap/mail-parser.service.ts`
- [x] T003 [US1] Read `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` from `ConfigService` in `ImapService`, replacing hardcoded `'rn.work'` fallback on line 149 in `backend/src/imap/imap.service.ts`
- [x] T004 [US1] Add startup validation: if `MAIL_DOMAIN` is empty or malformed, log warning and use default `rn.work` in `backend/src/imap/mail-parser.service.ts`

**Checkpoint**: Backend now processes emails only for the configured domain. Existing `rn.work` users unaffected (default value).

---

## Phase 4: User Story 2 — Configure Base Address (Priority: P2)

**Goal**: Allow configuring the base email address (e.g., `gens`) via `MAIL_BASE_ADDRESS` env var so thread labels display the correct address for any domain.

**Independent Test**: Set `MAIL_BASE_ADDRESS=inbox`, restart backend. Create a thread → verify label shows `inbox+tag@{domain}` instead of `gens+tag@{domain}`.

### Implementation for User Story 2

- [x] T005 [US2] Update `ImapService.processRawEmail()` to use `MAIL_BASE_ADDRESS` from config when constructing `fullAddress` for thread labels in `backend/src/imap/imap.service.ts`

**Checkpoint**: Thread labels now reflect the configured base address. Defaults to `gens` if not set.

---

## Phase 5: User Story 3 — UI Reflects Configured Domain (Priority: P2)

**Goal**: Frontend displays the actual configured domain/base address in all instructional text instead of hardcoded `gens+tag@rn.work`.

**Independent Test**: Set `MAIL_DOMAIN=test.io` and `MAIL_BASE_ADDRESS=dev`, restart backend. Open frontend → verify empty-state says "Send emails to `dev+tag@test.io`".

### Implementation for User Story 3

- [x] T006 [US3] Create `ConfigController` with `GET /api/config` endpoint returning `{ mailDomain, mailBaseAddress }` in `backend/src/config/config.controller.ts`
- [x] T007 [US3] Register `ConfigController` in `backend/src/app.module.ts`
- [x] T008 [P] [US3] Add `getConfig()` method to API client in `frontend/src/services/api.ts`
- [x] T009 [US3] Fetch config on mount in `App.tsx` and replace hardcoded `gens+tag@rn.work` with dynamic config values in `frontend/src/App.tsx`
- [x] T010 [US3] Replace hardcoded `gens+tag@rn.work` empty-state text with dynamic config values in `frontend/src/components/ThreadList.tsx`

**Checkpoint**: Frontend UI now displays correct domain information matching backend configuration.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and Docker integration

- [x] T011 [P] Add `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` to backend environment section in `docker-compose.yml`
- [x] T012 [P] Update `README.md` to document `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` variables
- [x] T013 Run Docker rebuild and verify end-to-end with custom domain: `docker compose up -d --build` ⚠️ *Requires Docker running*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — project exists
- **Foundational (Phase 2)**: Skipped — infrastructure exists
- **US1 (Phase 3)**: Can start immediately — modifies backend logic
- **US2 (Phase 4)**: Can start after US1 (uses same config values)
- **US3 (Phase 5)**: Depends on T006 (config endpoint) — can run parallel to US2
- **Polish (Phase 6)**: Can run after US1 is complete

### Within Each User Story

- Backend changes before frontend changes
- Config endpoint (T006) before frontend fetch (T008–T010)
- Environment files (T001) before code changes (T002–T003)

### Parallel Opportunities

- T001: env files can be done in parallel with any code task
- T008: API client method can be scaffolded alongside T006–T007
- T011/T012: Docker and docs are independent of each other

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001–T004)
2. **STOP and VALIDATE**: Change `MAIL_DOMAIN` in `.env`, restart, verify filtering works
3. Deploy if ready — backend is domain-agnostic

### Incremental Delivery

1. US1 (T001–T004) → Domain filtering configurable → **MVP!**
2. US2 (T005) → Base address configurable → Thread labels correct
3. US3 (T006–T010) → Frontend reflects config → Full UX
4. Polish (T011–T013) → Docker + docs → Production-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Total: **13 tasks** across 4 phases (3 user stories + polish)
- No database migrations needed
- All changes are backward-compatible (defaults = `rn.work` / `gens`)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
