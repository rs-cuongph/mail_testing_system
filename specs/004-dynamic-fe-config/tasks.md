---
description: "Task list template for feature implementation"
---

# Tasks: Dynamic FE Config

**Input**: Design documents from `/specs/004-dynamic-fe-config/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Project initialization and basic structure
(Project is already setup, skipped)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T001 Create `SystemConfig` model in `backend/prisma/schema.prisma`
- [x] T002 Generate database migration
- [x] T003 [P] Implement AES Encryption util required for password encryption in `backend/src/utils/crypto.util.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initial System Setup (Priority: P1) 🎯 MVP

**Goal**: Setup Wizard required before system can connect to IMAP.

**Independent Test**: Spin up clean DB. Web app forces redirect to Setup Wizard. Saves correct config, API encrypts password, returns 200 JS, and IMAP starts processing.

### Implementation for User Story 1

- [x] T004 [US1] Create SettingsModule, Controller, and Service `backend/src/settings/`
- [x] T005 [US1] Implement `GET /api/settings` and `POST /api/settings` endpoints in `backend/src/settings/settings.controller.ts`
- [x] T006 [US1] Handle IMAP connection testing (timeout 30s) logic in `backend/src/imap/imap.service.ts` and call it from SettingsService before saving
- [x] T007 [US1] Add logic to load existing Config from DB at startup, fallback to ENV in `backend/src/imap/imap.service.ts`
- [x] T008 [P] [US1] Create API client `frontend/src/services/settings.api.ts`
- [x] T009 [US1] Create Setup Wizard layout and forms in `frontend/src/pages/SetupPage.tsx`
- [x] T010 [US1] Implement global routing guard in `frontend/src/App.tsx` (redirect to `/setup` if GET settings 404)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Edit Configuration at Runtime (Priority: P1)

**Goal**: Edit Config from Settings without restart, auto-reconnect IMAP.

**Independent Test**: Modify the existing config from the UI settings. The backend updates and immediately emits event causing the IMAP to disconnect and reconnect with the new settings.

### Implementation for User Story 2

- [x] T011 [US2] Emit `config.updated` via `EventEmitter2` upon successful `POST /api/settings` save in `backend/src/settings/settings.service.ts`
- [x] T012 [US2] Listen to `config.updated` in `backend/src/imap/imap.service.ts` and gracefully restart the IMAP worker connection
- [x] T013 [P] [US2] Create Settings UI page with masked password field support in `frontend/src/pages/SettingsPage.tsx`
- [x] T014 [US2] Include layout changes to add a Settings navigation button in `frontend/src/components/Header.tsx` (or similar nav component)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Docker Image Deployment without Port Conflicts (Priority: P2)

**Goal**: Deploy on port 7654(BE) and 7655(FE) by default.

**Independent Test**: Boot the stack and confirm `localhost:7655` loads the FE, and `localhost:7654/api/...` works for BE.

### Implementation for User Story 3

- [x] T015 [US3] Update backend listen port to `7654` in `backend/src/main.ts` and `.env.example`
- [x] T016 [US3] Update frontend port to `7655` in `frontend/vite.config.ts`
- [x] T017 [US3] Update backend Dockerfile port EXPOSE to `7654` in `backend/Dockerfile`
- [x] T018 [US3] Update frontend Dockerfile port EXPOSE to `7655` in `frontend/Dockerfile`
- [x] T019 [P] [US3] Update ports mapping in root `docker-compose.yml`

**Checkpoint**: All user stories up to US3 functional

---

## Phase 6: User Story 4 - Connection Status Visibility (Priority: P2)

**Goal**: Users can see if IMAP is currently connected or failing.

**Independent Test**: Setting an invalid password intentionally should show "Error" or "Disconnected" in the UI status indicator.

### Implementation for User Story 4

- [x] T020 [P] [US4] Implement `GET /api/settings/status` endpoint in `backend/src/settings/settings.controller.ts`
- [x] T021 [US4] Add connection state tracking (connected, disconnected, error, reconnecting) in `backend/src/imap/imap.service.ts`
- [x] T022 [US4] Ensure `imap.service.ts` emits status change events or exposes a getter that `settings.service.ts` can read
- [x] T023 [US4] Add Status Indicator component to Settings page or Header in `frontend/src/components/IMAPStatus.tsx`
- [x] T024 [US4] Integrate regular polling or WebSocket events for Status updates in Frontend

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T025 [P] Verify Docker volumes for DB persistence across compose down/up.
- [x] T026 Disable plaintext exposure for saved Configs API outputs.
- [x] T027 Code cleanup & refactoring of ENV mappings.
