# Implementation Plan: Dynamic FE Config

**Branch**: `004-dynamic-fe-config` | **Date**: 2026-04-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-dynamic-fe-config/spec.md`

## Summary

The feature will allow the IMAP and Mail Domain configurations currently stored in `.env` (lines 6-21) to be managed dynamically from a frontend Settings page. This includes encrypting passwords in a PostgreSQL DB, exposing an API endpoint (unauthenticated for v1, relying on Docker internal network isolation), using NestJS EventEmitter2 for config updates, and running backend/frontend on ports 7654 and 7655 to avoid conflicts. A Setup Wizard will prompt the user if no configuration is found in the database.

## Technical Context

**Language/Version**: Node.js/TypeScript (Backend), React/TypeScript (Frontend)
**Primary Dependencies**: NestJS (EventEmitter2, TypeORM/Prisma), React (Vite)
**Storage**: PostgreSQL (SystemConfig table)
**Testing**: Jest
**Target Platform**: Docker container for Windows/macOS deployment
**Project Type**: Web Application (Backend API + Frontend SPA)
**Performance Goals**: IMAP reconnects and starts within 10 seconds of save. Connection test timeout 30s.

## Constitution Check

N/A (Constitution template is unfilled).

## Project Structure

### Documentation (this feature)

```text
specs/004-dynamic-fe-config/
├── plan.md              # This file
├── research.md          # Optional - research findings
├── data-model.md        # DB Entity definitions
├── quickstart.md        # Testing and usage instructions
├── contracts/           # API contracts for settings
└── tasks.md             # Tasks definition
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/          # Environment configuration
│   ├── settings/        # SystemConfig module & endpoints
│   └── imap/            # Updated to listen to EventEmitter2
└── tests/

frontend/
├── src/
│   ├── components/      # UI components (Settings layout)
│   ├── pages/           # /setup and /settings pages
│   └── services/        # Config API client
└── tests/
```

**Structure Decision**: Using the Web Application project pattern consisting of `backend/` and `frontend/` folders. Modifying existing configuration systems to introduce `SystemConfig` in the `settings/` package.

