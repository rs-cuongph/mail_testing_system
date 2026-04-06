# Implementation Plan: Multi-IMAP Profile Support

**Branch**: `006-multi-imap-profiles` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-multi-imap-profiles/spec.md`

## Summary

Transform the Mail Testing System from a single-IMAP-account tool to a multi-profile system where users can create, manage, and switch between multiple IMAP configurations. Each profile has isolated data (threads, emails, categories). Only one profile is active at a time. Supports provider presets (Gmail, Outlook, Yahoo) with guided setup. Built on existing NestJS + React + PostgreSQL stack with Prisma ORM.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 22)  
**Primary Dependencies**: NestJS, React 19, Prisma ORM, ImapFlow, Vite, Shadcn UI  
**Storage**: PostgreSQL 16 (via Prisma)  
**Testing**: Manual + curl API testing  
**Target Platform**: Web application (Docker + local dev)  
**Project Type**: Web service (backend API + frontend SPA)  
**Performance Goals**: Profile switch < 5 seconds, profile CRUD < 1 second  
**Constraints**: Single active profile at a time, shared database with profileId filtering  
**Scale/Scope**: Up to 10 IMAP profiles per instance

## Constitution Check

*GATE: Default constitution template — no custom gates enforced.*

No violations. Proceeding with standard best practices:
- Incremental migration (backward compatible)
- Existing tests/functionality preserved
- New module follows existing NestJS patterns

## Project Structure

### Documentation (this feature)

```text
specs/006-multi-imap-profiles/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Database schema design
├── quickstart.md        # Phase 1: Development quickstart
├── contracts/
│   └── api.md           # Phase 1: API endpoint contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma          # MODIFY: Add ImapProfile, add profileId FKs
│   └── migrations/            # NEW: Migration for profile schema
├── src/
│   ├── profiles/              # NEW MODULE
│   │   ├── profiles.module.ts
│   │   ├── profiles.controller.ts
│   │   ├── profiles.service.ts
│   │   └── dto/
│   │       └── profile.dto.ts
│   ├── settings/              # MODIFY: Delegate to ProfileService
│   │   ├── settings.controller.ts
│   │   └── settings.service.ts
│   ├── imap/                  # MODIFY: Parameterize by profileId
│   │   └── imap.service.ts
│   ├── threads/               # MODIFY: Filter by profileId
│   │   └── threads.service.ts
│   ├── categories/            # MODIFY: Filter by profileId
│   │   └── categories.service.ts
│   ├── emails/                # MODIFY: Filter by profileId (via thread)
│   │   └── emails.service.ts
│   └── app.module.ts          # MODIFY: Register ProfilesModule

frontend/
├── src/
│   ├── components/
│   │   ├── ProfileSwitcher.tsx   # NEW: Dropdown in sidebar
│   │   └── ThreadList.tsx        # MODIFY: Reload on profile switch
│   ├── pages/
│   │   ├── ProfilesPage.tsx      # NEW: Profile CRUD management
│   │   ├── SetupPage.tsx         # MODIFY: Redirect to profile creation
│   │   └── SettingsPage.tsx      # MODIFY: Edit active profile
│   ├── services/
│   │   ├── profiles.api.ts       # NEW: Profile API client
│   │   └── settings.api.ts       # MODIFY: Use profile endpoints
│   ├── contexts/
│   │   └── ProfileContext.tsx     # NEW: Active profile state
│   └── App.tsx                   # MODIFY: Profile context provider, routing
```

**Structure Decision**: Follows existing NestJS module pattern (module + controller + service + dto). Frontend follows existing pages + services + components pattern. New ProfileContext provides global active-profile state.

## Implementation Phases

### Phase 1: Database & Backend Foundation
1. Add `ImapProfile` model to Prisma schema
2. Add `profileId` FK to `Thread` and `Category`
3. Create migration with data backfill (existing data → "Default" profile)
4. Create `ProfilesModule` (controller + service + DTOs)
5. Implement profile CRUD API endpoints
6. Implement profile activation endpoint

### Phase 2: IMAP Service Refactor
1. Refactor `ImapService` to load config from active `ImapProfile`
2. Implement connect/disconnect on profile switch
3. Update `config.updated` event handler to use profile-based config
4. Update `SettingsService` to delegate to `ProfileService`

### Phase 3: Data Isolation
1. Update `ThreadsService` to filter by active `profileId`
2. Update `CategoriesService` to filter by active `profileId`  
3. Update `EmailsService` queries (via thread → profile chain)
4. Update unique constraints (tag per-profile, category name per-profile)

### Phase 4: Frontend — Profile Management
1. Create `ProfileContext` (active profile state, switch function)
2. Create `profiles.api.ts` service
3. Create `ProfilesPage` (list, create, edit, delete profiles)
4. Implement provider presets (Gmail, Outlook, Yahoo auto-fill)
5. Add Gmail App Password guidance component

### Phase 5: Frontend — Profile Switching & Integration
1. Create `ProfileSwitcher` component (sidebar dropdown)
2. Integrate into `ThreadList` sidebar header
3. Wire profile switch → API call → reload threads/categories
4. Update routing (auto-connect last profile, redirect to create if none)
5. Update `SettingsPage` to edit active profile
6. Update import/export to work per-profile

### Phase 6: Migration & Cleanup
1. Remove `SystemConfig` model (after verifying migration)
2. Remove old `SettingsController` single-config endpoints (or keep as backward-compat aliases)
3. End-to-end testing: create 3 profiles, switch, verify isolation
4. Docker build + deployment verification

## Complexity Tracking

No constitution violations to track.
