# Tasks: Inbound Mail Testing System (Plus Addressing Threading)

**Input**: Design documents from `/specs/001-inbound-mail-threading/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec — test tasks omitted. Add manually if TDD desired.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize NestJS backend project in `backend/` with TypeScript
- [ ] T002 Initialize React + Vite frontend project in `frontend/` with TypeScript
- [ ] T003 [P] Configure ESLint and Prettier for `backend/`
- [ ] T004 [P] Configure ESLint and Prettier for `frontend/`
- [ ] T005 [P] Create `backend/.env.example` with IMAP, database, and app config variables
- [ ] T006 [P] Create `frontend/.env.example` with API and WebSocket URLs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Install Prisma and configure PostgreSQL connection in `backend/prisma/schema.prisma`
- [ ] T008 Define Thread, Email, and Attachment models in `backend/prisma/schema.prisma` per data-model.md
- [ ] T009 Run initial Prisma migration to create database tables
- [ ] T010 [P] Create PrismaModule in `backend/src/prisma/prisma.module.ts`
- [ ] T011 [P] Create PrismaService with lifecycle hooks in `backend/src/prisma/prisma.service.ts`
- [ ] T012 Register PrismaModule as global module in `backend/src/app.module.ts`
- [ ] T013 [P] Configure `@nestjs/config` with environment validation in `backend/src/app.module.ts`
- [ ] T014 [P] Enable CORS in `backend/src/main.ts` for frontend dev server origin
- [ ] T015 Set global API prefix `/api` in `backend/src/main.ts`

**Checkpoint**: Foundation ready — database connected, Prisma client available, NestJS configured

---

## Phase 3: User Story 1 — View Email Threads by Tag (Priority: P1) 🎯 MVP

**Goal**: Emails sent to `gens+{tag}@rn.work` are received via IMAP, grouped by tag into threads, and displayed in the UI as separate threads labeled with full address format.

**Independent Test**: Send 2+ emails to different `+tag` addresses → verify UI shows separate, correctly grouped threads.

### Backend — IMAP Worker (US1)

- [ ] T016 [US1] Create ImapModule in `backend/src/imap/imap.module.ts`
- [ ] T017 [US1] Implement ImapService with IMAP connection, IDLE/poll logic, and lifecycle hooks (OnModuleInit/OnModuleDestroy) in `backend/src/imap/imap.service.ts`
- [ ] T018 [US1] Implement MailParserService with tag extraction (`extractTag` from `To` header) and email parsing via `mailparser` in `backend/src/imap/mail-parser.service.ts`
- [ ] T019 [US1] Wire ImapService to call MailParserService on new email → create/find Thread → insert Email record

### Backend — Thread & Email API (US1)

- [ ] T020 [P] [US1] Create ThreadsModule in `backend/src/threads/threads.module.ts`
- [ ] T021 [P] [US1] Implement ThreadsService with `findAll()` (ordered by updatedAt DESC) and `findByTag()` in `backend/src/threads/threads.service.ts`
- [ ] T022 [US1] Implement ThreadsController with `GET /threads` and `GET /threads/:tag` in `backend/src/threads/threads.controller.ts`
- [ ] T023 [P] [US1] Create EmailsModule in `backend/src/emails/emails.module.ts`
- [ ] T024 [P] [US1] Implement EmailsService with `findByThreadId()` (ordered by receivedAt DESC) in `backend/src/emails/emails.service.ts`
- [ ] T025 [US1] Implement deduplication logic using `messageId` unique constraint (upsert pattern) in `backend/src/emails/emails.service.ts`

### Frontend — Thread List & Thread View (US1)

- [ ] T026 [US1] Define TypeScript interfaces for Thread, Email, and API responses in `frontend/src/types/index.ts`
- [ ] T027 [US1] Create API client service with `getThreads()` and `getThreadByTag()` in `frontend/src/services/api.ts`
- [ ] T028 [US1] Implement ThreadList component displaying threads with full address labels in `frontend/src/components/ThreadList.tsx`
- [ ] T029 [US1] Implement ThreadView component displaying emails within a thread (newest first) in `frontend/src/components/ThreadView.tsx`
- [ ] T030 [US1] Wire App component with thread list ↔ thread view navigation in `frontend/src/App.tsx`
- [ ] T031 [US1] Style the UI with modern design (dark theme, thread sidebar, responsive layout) in `frontend/src/index.css`

**Checkpoint**: User Story 1 complete — emails arrive via IMAP, grouped by tag, displayed in UI as distinct threads

---

## Phase 4: User Story 2 — View Individual Email Details (Priority: P2)

**Goal**: Users can click an email in a thread to see full details (from, to, subject, body, timestamp) with a toggle between plain text and sandboxed HTML rendering.

**Independent Test**: Click any email in a thread → verify all fields displayed; toggle between plain text and HTML view.

### Backend — Email Detail API (US2)

- [ ] T032 [US2] Implement `findById()` method returning full email with raw headers in `backend/src/emails/emails.service.ts`
- [ ] T033 [US2] Implement EmailsController with `GET /emails/:id` in `backend/src/emails/emails.controller.ts`

### Frontend — Email Detail View (US2)

- [ ] T034 [US2] Add `getEmailById()` to API client in `frontend/src/services/api.ts`
- [ ] T035 [US2] Implement EmailBodyViewer component with plain text / HTML toggle (sandboxed iframe) in `frontend/src/components/EmailBodyViewer.tsx`
- [ ] T036 [US2] Implement EmailDetail component showing full email metadata + EmailBodyViewer in `frontend/src/components/EmailDetail.tsx`
- [ ] T037 [US2] Integrate EmailDetail into App layout (click email in ThreadView → show detail) in `frontend/src/App.tsx`

**Checkpoint**: User Story 2 complete — full email details viewable with dual-mode body rendering

---

## Phase 5: User Story 3 — Real-time Email Arrival (Priority: P3)

**Goal**: When a new email arrives, the UI updates within 10 seconds without manual page refresh via WebSocket events.

**Independent Test**: With UI open, send an email → observe it appearing in the thread within 10 seconds without refresh.

### Backend — WebSocket Gateway (US3)

- [ ] T038 [US3] Install `@nestjs/websockets` and `@nestjs/platform-socket.io` dependencies
- [ ] T039 [US3] Create EventsModule in `backend/src/events/events.module.ts`
- [ ] T040 [US3] Implement EventsGateway with `email:new`, `thread:new` events in `backend/src/events/events.gateway.ts`
- [ ] T041 [US3] Emit WebSocket events from ImapService when new email is processed in `backend/src/imap/imap.service.ts`

### Frontend — Real-time Updates (US3)

- [ ] T042 [US3] Install `socket.io-client` dependency in `frontend/`
- [ ] T043 [US3] Create Socket.IO client service with event listeners in `frontend/src/services/socket.ts`
- [ ] T044 [US3] Integrate socket events into ThreadList (auto-add new threads, update counts) in `frontend/src/components/ThreadList.tsx`
- [ ] T045 [US3] Integrate socket events into ThreadView (auto-append new emails) in `frontend/src/components/ThreadView.tsx`

**Checkpoint**: User Story 3 complete — new emails appear in real-time without page refresh

---

## Phase 6: User Story 4 — Attachment Handling (Priority: P3)

**Goal**: Emails with attachments are stored on local filesystem and displayed in the email detail view for download.

**Independent Test**: Send email with attachment → verify attachment listed in email detail → download succeeds with correct filename.

### Backend — Attachment Storage & API (US4)

- [ ] T046 [US4] Create AttachmentsModule in `backend/src/attachments/attachments.module.ts`
- [ ] T047 [US4] Implement AttachmentsService with `saveAttachment()` (write to filesystem) and `findByEmailId()` in `backend/src/attachments/attachments.service.ts`
- [ ] T048 [US4] Implement AttachmentsController with `GET /attachments/:id/download` (stream file with correct Content-Type and Content-Disposition) in `backend/src/attachments/attachments.controller.ts`
- [ ] T049 [US4] Integrate attachment extraction into MailParserService (parse MIME parts → save files → create records) in `backend/src/imap/mail-parser.service.ts`

### Frontend — Attachment Display (US4)

- [ ] T050 [US4] Implement AttachmentList component with filename, size, and download link in `frontend/src/components/AttachmentList.tsx`
- [ ] T051 [US4] Integrate AttachmentList into EmailDetail component in `frontend/src/components/EmailDetail.tsx`

**Checkpoint**: User Story 4 complete — attachments stored, displayed, and downloadable

---

## Phase 7: Data Management (Manual Purge)

**Goal**: Users can delete individual threads or bulk-clear all data via the UI.

### Backend — Delete API

- [ ] T052 Implement `deleteByTag()` (cascade delete thread + emails + attachments + files) in `backend/src/threads/threads.service.ts`
- [ ] T053 Implement `deleteAll()` (bulk clear all data + attachment files) in `backend/src/threads/threads.service.ts`
- [ ] T054 Add `DELETE /threads/:tag` and `DELETE /threads` endpoints in `backend/src/threads/threads.controller.ts`
- [ ] T055 Emit `thread:deleted` and `all:cleared` WebSocket events on deletion in `backend/src/events/events.gateway.ts`

### Frontend — Delete UI

- [ ] T056 Add delete button per thread in ThreadList component in `frontend/src/components/ThreadList.tsx`
- [ ] T057 Add "Clear All" button with confirmation dialog in `frontend/src/components/ThreadList.tsx`
- [ ] T058 Handle `thread:deleted` and `all:cleared` socket events for real-time UI sync in `frontend/src/components/ThreadList.tsx`

**Checkpoint**: Data management complete — threads deletable individually or in bulk

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T059 [P] Add error handling and user-friendly error states (loading, empty, error) across all frontend components
- [ ] T060 [P] Add NestJS global exception filter for consistent API error responses in `backend/src/main.ts`
- [ ] T061 [P] Add request logging middleware in `backend/src/main.ts`
- [ ] T062 Add IMAP connection reconnection logic with exponential backoff in `backend/src/imap/imap.service.ts`
- [ ] T063 [P] Create README.md with setup instructions referencing quickstart.md
- [ ] T064 Run full quickstart.md validation (end-to-end setup and test)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion
  - Stories can proceed in priority order (P1 → P2 → P3)
  - US2 naturally builds on US1 (email detail extends thread view)
  - US3 and US4 can be done in either order
- **Data Management (Phase 7)**: Depends on Phase 2; can run parallel with US3/US4
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 — no dependencies on other stories
- **US2 (P2)**: Requires Phase 2 + US1 (extends email list with detail view)
- **US3 (P3)**: Requires Phase 2 + US1 (adds real-time to existing thread/email views)
- **US4 (P3)**: Requires Phase 2 + US1 (extends email parsing and detail view with attachments)

### Within Each User Story

- Models/database before services
- Services before controllers
- Backend API before frontend components
- Core implementation before integration

### Parallel Opportunities

- T003/T004: Linting configs for backend/frontend (different projects)
- T005/T006: Environment configs (different projects)
- T010/T011: Prisma module + service (different files)
- T020/T023: Thread and Email modules (different files)
- T021/T024: Thread and Email services (different files)
- All [P] frontend components can be scaffolded in parallel before wiring

---

## Parallel Example: User Story 1

```bash
# Backend modules can be created in parallel:
Task T020: "Create ThreadsModule in backend/src/threads/threads.module.ts"
Task T023: "Create EmailsModule in backend/src/emails/emails.module.ts"

# Backend services can be created in parallel:
Task T021: "Implement ThreadsService in backend/src/threads/threads.service.ts"
Task T024: "Implement EmailsService in backend/src/emails/emails.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T015)
3. Complete Phase 3: User Story 1 (T016–T031)
4. **STOP and VALIDATE**: Send test emails, verify threads appear grouped by tag
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (**MVP!**)
3. Add User Story 2 → Email detail with HTML toggle → Deploy/Demo
4. Add User Story 3 → Real-time updates → Deploy/Demo
5. Add User Story 4 → Attachments → Deploy/Demo
6. Add Data Management → Cleanup capability → Deploy/Demo
7. Polish → Production-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
