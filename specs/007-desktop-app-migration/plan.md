# Implementation Plan: Desktop App Migration

**Branch**: `007-desktop-app-migration` | **Date**: 2026-04-08 | **Spec**: [Desktop App Migration Spec](spec.md)

## Summary

Migrate the Mail Testing System to a cross-platform Desktop App using Electron, replacing the Dockerized PostgreSQL database with a local embedded SQLite database. This creates a zero-setup, one-click installable MVP for Windows first, packing both the Vite frontend and NestJS backend together.

## Technical Context

**Language/Version**: Node.js 20+ (Electron runtime), TypeScript
**Primary Dependencies**: Electron, electron-builder, Prisma (SQLite adapter), NestJS, React
**Storage**: SQLite (embedded local file), Electron `safeStorage` (Secure OS Keychain for IMAP passwords)
**Testing**: Jest (existing backend/frontend tests), Electron-specific E2E (Playwright or Spectron generally, but out of scope for initial unit tests)
**Target Platform**: Windows 10/11 first (MVP), macOS, Linux
**Project Type**: Desktop Application (Electron)
**Performance Goals**: Installation under 3 minutes, App startup under 15 seconds, low resource footprint while idling in tray.
**Constraints**: Keep installer < 300MB, no data migration from PostgreSQL needed.
**Scale/Scope**: Local usage, single user per machine, seamless background monitoring via tray.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- The architecture is highly testable (NestJS + Vite separated), satisfying Test-First if pursued.
- Separation of concerns maintained: `backend` remains independent logic, `frontend` remains UI logic, `electron/` acts as the distribution container.

## Project Structure

### Documentation (this feature)

```text
specs/007-desktop-app-migration/
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # Data entities 
├── quickstart.md        # Developer setup
└── tasks.md             # Breakdown of implementation steps (next phase)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   └── schema.prisma    # Migrated to SQLite
├── src/                 # Remains NestJS backend
├── package.json         # Updated dependencies

frontend/
├── src/                 # Remains React + Vite UI
├── package.json         # Updated dependencies

electron/
├── src/
│   ├── main.ts          # Electron main process (spawns backend, opens window)
│   ├── tray.ts          # System tray management
│   └── preload.ts       # IPC for safeStorage/frontend bridge
├── package.json         # Electron builder configuration
└── build/               # Icons & installer assets
```

**Structure Decision**: 
The repository will be evolved to include an `electron/` directory that orchestrates both existing `frontend` and `backend` components. `backend` will use SQLite and `schema.prisma` will be migrated.

## Verification & Execution

Once the structural changes and code implementation are verified, we will generate the macOS/Windows packages and ensure:
1. SQLite generates `.db` locally in `AppData`.
2. NestJS starts via the Electron main process successfully.
3. System tray correctly hides the window but keeps polling emails.
4. OS notifications are dispatched and toggleable.
