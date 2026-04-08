---
description: "Task list for Desktop App Migration"
---

# Tasks: Desktop App Migration

**Input**: Design documents from `/specs/007-desktop-app-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for the Electron container.

- [ ] T001 Create `electron/` workspace directory and initialize package.json
- [ ] T002 In `electron/`, install `electron`, `electron-builder` as devDependencies
- [ ] T003 In `electron/`, configure TypeScript, tsconfig.json, and install `@types/node`, `@types/electron`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

- [ ] T004 Change Prisma provider to "sqlite" in `backend/prisma/schema.prisma` and remove any PostgreSQL specific artifacts
- [ ] T005 [P] Implement build steps in `backend/package.json` to produce a standalone Node app bundled for Electron distribution
- [ ] T006 [P] Ensure Vite builds the `/dist` of the frontend accurately for local file or local server consumption

**Checkpoint**: Foundation ready - DB is now SQLite.

---

## Phase 3: User Story 1 - Install & Launch on Windows (Priority: P1) 🎯 MVP

**Goal**: Package the app as a `.exe` where backend and frontend run seamlessly inside Electron.

**Independent Test**: Build `.exe` on Windows, run it, verify NestJS starts without error and React UI loads.

### Implementation for User Story 1

- [ ] T007 [US1] Create `electron/src/main.ts` to spawn the NestJS backend as a child process and load the Vite frontend
- [ ] T008 [P] [US1] Create basic `electron/src/preload.ts` if needed for basic context bridge
- [ ] T009 [US1] Configure `electron-builder` in `electron/package.json` for Windows `target: "nsis"`
- [ ] T010 [US1] Add a mechanism to gracefully terminate the NestJS child process when Electron quits
- [ ] T011 [US1] Add port-conflict resolution logic so backend selects available port if 3000 is occupied

**Checkpoint**: At this point, User Story 1 should be fully functional (Windows MVP).

---

## Phase 4: User Story 2 - Full Feature Parity with Web Version (Priority: P1)

**Goal**: Adapt IMAP credential storage to use OS Keychain securely and ensure all features function.

**Independent Test**: Save IMAP config, verify password is not visible in `schema.prisma` DB file, verify emails arrive, verify attachments save.

### Implementation for User Story 2

- [ ] T012 [P] [US2] Update `ImapProfile` logic in `backend/src/imap/imap.service.ts` to retrieve passwords via IPC or direct environment pass-through instead of raw DB
- [ ] T013 [P] [US2] Create IPC endpoints in `electron/src/main.ts` leveraging `safeStorage` to encrypt/decrypt IMAP passwords
- [ ] T014 [US2] Adjust frontend API calls to properly utilize the new secure credential flows when saving IMAP configurations
- [ ] T015 [US2] Configure attachment storage path to use the OS data directory (`app.getPath('userData')`) in backend config
- [ ] T016 [US2] Create system tray management script in `electron/src/tray.ts` to hide window instead of quitting
- [ ] T017 [US2] Hook up OS notifications `new Notification(...)` in Electron when new email event triggers from backend

**Checkpoint**: Parity achieved. Database handles data securely, running in background via Tray.

---

## Phase 5: User Story 3 - First-Time Setup Experience (Priority: P2)

**Goal**: Provide guided IMAP credential setup on first launch.

**Independent Test**: Run app with empty DB, observe setup wizard preventing access to empty inbox.

### Implementation for User Story 3

- [ ] T018 [P] [US3] Add a frontend Setup Wizard screen component for First-Time usage
- [ ] T019 [US3] Integrate "Test Connection" API logic specifically returning human-readable IMAP validation errors
- [ ] T020 [US3] Lock main application routing so users must pass the Setup Wizard if `ImapProfile` table is empty

**Checkpoint**: User onboarding is robust.

---

## Phase 6: User Story 4 - macOS Support (Priority: P2)

**Goal**: Deliver `.dmg` for macOS developers.

**Independent Test**: Build on Mac or Linux, open `.dmg`, verify app runs identically to Windows.

### Implementation for User Story 4

- [ ] T021 [P] [US4] Configure `mac` target (`dmg`, `zip`) in `electron-builder`
- [ ] T022 [US4] Ensure `Cmd+Q` macOS lifecycle behaviors are appropriately matched while acknowledging the Tray requirement
- [ ] T023 [US4] Determine and document any macOS Gatekeeper instructions if app is unsigned

---

## Phase 7: User Story 5 - Linux Support (Priority: P3)

**Goal**: Produce `AppImage` for Linux.

**Independent Test**: Download `.AppImage` on Ubuntu, double click, verify app runs.

### Implementation for User Story 5

- [ ] T024 [P] [US5] Configure `linux` target (`AppImage`) in `electron-builder`
- [ ] T025 [US5] Document lack of Tray icon fallbacks on Linux distributions that don't support `libappindicator`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [ ] T026 Code cleanup and refactoring across electron/ frontend/ backend/
- [ ] T027 Optimize SQLite configuration for performance (WAL mode, synchronous=NORMAL)
- [ ] T028 Readme and Docs Updates

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete
