# Tasks: Multi-IMAP Profile Support

**Input**: Design documents from `/specs/006-multi-imap-profiles/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

There is no major setup needed since the project structure already exists. Moving directly to foundational phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Setup Prisma schema with new `ImapProfile` model in `backend/prisma/schema.prisma`
- [x] T002 Add `profileId` relations to `Thread` and `Category` models in `backend/prisma/schema.prisma`
- [x] T003 Generate Prisma migration for schema changes in `backend/prisma/`
- [x] T004 Create `ProfilesModule` and controller structure in `backend/src/profiles/profiles.module.ts` and `backend/src/profiles/profiles.controller.ts`
- [x] T005 Set up `ProfileContext` for frontend state management in `frontend/src/contexts/ProfileContext.tsx`
- [x] T006 Wrap application with `ProfileProvider` in `frontend/src/App.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create and Manage IMAP Profiles (Priority: P1) 🎯 MVP

**Goal**: Users can create, edit, list, and delete multiple IMAP profiles

**Independent Test**: Can be tested by creating 3 profiles with different settings, editing one, deleting another, and verifying the remaining profiles retain their configurations correctly.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create Profile DTOs in `backend/src/profiles/dto/profile.dto.ts`
- [x] T008 [US1] Implement `ProfilesService` with CRUD operations in `backend/src/profiles/profiles.service.ts`
- [x] T009 [US1] Implement `ProfilesController` endpoints (GET, POST, PATCH, DELETE) in `backend/src/profiles/profiles.controller.ts`
- [x] T010 [P] [US1] Implement frontend API client in `frontend/src/services/profiles.api.ts`
- [x] T011 [US1] Create `ProfilesPage` for managing profiles (CRUD UI) in `frontend/src/pages/ProfilesPage.tsx`
- [x] T012 [US1] Update `App.tsx` routing to include `/profiles` in `frontend/src/App.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Profile Switching and Data Isolation (Priority: P1)

**Goal**: Users can switch profiles. Active profile connects to IMAP, data queries are isolated to the active profile's data.

**Independent Test**: Test by activating Profile A, receiving emails, switching to Profile B (empty inbox), receiving emails on B, switching back to A to see original emails.

### Implementation for User Story 2

- [x] T013 [P] [US2] Create `/api/profiles/:id/activate` endpoint in `backend/src/profiles/profiles.controller.ts`
- [x] T014 [US2] Refactor `ImapService` to use `profileId` state in `backend/src/imap/imap.service.ts`
- [x] T015 [US2] Update `ImapService` connect/disconnect logic on profile switch in `backend/src/imap/imap.service.ts`
- [x] T016 [US2] Refactor `ThreadsService` to require and filter by `profileId` in `backend/src/threads/threads.service.ts`
- [x] T017 [US2] Refactor `CategoriesService` to require and filter by `profileId` in `backend/src/categories/categories.service.ts`
- [x] T018 [US2] Update `EmailsService` queries to respect profile constraints implicitly through threads in `backend/src/emails/emails.service.ts`
- [x] T019 [P] [US2] Implement `ProfileSwitcher` UI component in `frontend/src/components/ProfileSwitcher.tsx`
- [x] T020 [US2] Integrate `ProfileSwitcher` into `ThreadList` header in `frontend/src/components/ThreadList.tsx`
- [x] T021 [US2] Auto-connect last active profile logic on app load in `frontend/src/App.tsx`
- [x] T022 [US2] Update `ThreadList` fetching logic to reload when active profile changes in `frontend/src/components/ThreadList.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Multi-Provider Support with Guided Setup (Priority: P2)

**Goal**: Provide preset configurations for common email providers (Gmail, Outlook, Yahoo) during profile creation.

**Independent Test**: Test by selecting "Gmail" preset and verifying host/port/TLS auto-fill and help text visibility.

### Implementation for User Story 3

- [x] T023 [P] [US3] Create provider presets JSON config in `frontend/src/lib/provider-presets.ts`
- [x] T024 [US3] Update `ProfilesPage` form to include provider selection dropdown in `frontend/src/pages/ProfilesPage.tsx`
- [x] T025 [US3] Implement auto-fill logic when provider is selected in `frontend/src/pages/ProfilesPage.tsx`
- [x] T026 [US3] Add "Gmail App Password" guidance alert conditionally in `frontend/src/pages/ProfilesPage.tsx`

**Checkpoint**: All user stories 1, 2, 3 should now be independently functional

---

## Phase 6: User Story 4 - Import/Export Config Per Profile (Priority: P2)

**Goal**: Extend existing configuration export/import functionality to work per-profile.

**Independent Test**: Export Profile A's config, import as new profile, verify settings match (except blank password).

### Implementation for User Story 4

- [x] T027 [P] [US4] Implement Export Profile endpoint in `backend/src/profiles/profiles.controller.ts`
- [x] T028 [US4] Implement Import Profile endpoint in `backend/src/profiles/profiles.controller.ts`
- [x] T029 [US4] Update Frontend import/export UI on `ProfilesPage` in `frontend/src/pages/ProfilesPage.tsx`
- [x] T030 [US4] Implement name de-duplication suffix logic (e.g. Profile (2)) in `backend/src/profiles/profiles.service.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup legacy implementations affecting the whole system.

- [ ] T031 Refactor `SettingsService` to delegate to `ProfilesService` for backward compatibility in `backend/src/settings/settings.service.ts`
- [ ] T032 Remove old `SystemConfig` handling logic in backend services
- [ ] T033 Code cleanup in `backend/src/imap/imap.service.ts`
- [ ] T034 Update Documentation (e.g., readme if needed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Phase 3 (US1) should be done before Phase 4 (US2) to allow creating profiles to switch between.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- DTO creation and frontend API client can be done in parallel for US1.
- Backend API endpoints and Frontend `ProfileSwitcher` can be done in parallel for US2.
- Provider presets logic in frontend is completely isolated and parallelizable logic.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (CRITICAL)
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: Test Profile CRUD
4. Continue to Phase 4 (US2) for full core feature (Switching Data Isolation).
