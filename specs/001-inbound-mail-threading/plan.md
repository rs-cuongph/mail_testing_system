# Implementation Plan: Inbound Mail Testing System (Plus Addressing Threading)

**Branch**: `001-inbound-mail-threading` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-inbound-mail-threading/spec.md`

## Summary

Build an inbound email testing system that connects to a cPanel IMAP server, receives emails addressed to `gens+{tag}@rn.work`, groups them into custom threads based on the `+tag` value, and displays them in a web UI. The system uses NestJS (backend API + IMAP worker), PostgreSQL with Prisma (data storage), React/Vite (frontend), and Socket.IO (real-time updates).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+ LTS  
**Primary Dependencies**: NestJS 10+, imapflow, mailparser, Prisma, React 18+, Socket.IO  
**Storage**: PostgreSQL 14+ (via Prisma ORM), local filesystem (attachments)  
**Testing**: Jest (backend unit + e2e), Vitest (frontend)  
**Target Platform**: Linux server (internal network deployment)  
**Project Type**: Web service (backend API + frontend SPA)  
**Performance Goals**: Email appears in UI within 10 seconds of delivery; email detail loads in <2 seconds  
**Constraints**: Single domain (rn.work), moderate volume (hundreds/day), no authentication  
**Scale/Scope**: Single IMAP mailbox, single-instance deployment, internal team use

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution file contains only template placeholders (no custom principles defined). No gates to enforce. Proceeding with standard best practices.

## Project Structure

### Documentation (this feature)

```text
specs/001-inbound-mail-threading/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Entity design
├── quickstart.md        # Phase 1: Setup guide
├── contracts/
│   └── api.md           # Phase 1: REST + WebSocket contracts
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── imap/
│   │   ├── imap.module.ts
│   │   ├── imap.service.ts
│   │   └── mail-parser.service.ts
│   ├── threads/
│   │   ├── threads.module.ts
│   │   ├── threads.controller.ts
│   │   └── threads.service.ts
│   ├── emails/
│   │   ├── emails.module.ts
│   │   ├── emails.controller.ts
│   │   └── emails.service.ts
│   ├── attachments/
│   │   ├── attachments.module.ts
│   │   ├── attachments.controller.ts
│   │   └── attachments.service.ts
│   ├── events/
│   │   ├── events.module.ts
│   │   └── events.gateway.ts
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── prisma/
│   └── schema.prisma
├── test/
├── package.json
└── tsconfig.json

frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ThreadList.tsx
│   │   ├── ThreadView.tsx
│   │   ├── EmailDetail.tsx
│   │   ├── EmailBodyViewer.tsx
│   │   └── AttachmentList.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── socket.ts
│   └── types/
│       └── index.ts
├── package.json
└── vite.config.ts
```

**Structure Decision**: Single NestJS application (API + IMAP worker in same process) with separate Vite React frontend. This avoids monorepo complexity while keeping clear separation between backend and frontend. The IMAP worker runs as a NestJS service within the backend, sharing the database connection. See [research.md — Decision 7](research.md) for rationale.

## Complexity Tracking

No constitution violations to justify — template constitution has no defined constraints.
