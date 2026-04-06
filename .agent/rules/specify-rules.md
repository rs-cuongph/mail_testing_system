# mail_testing_system Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-06

## Active Technologies
- TypeScript 5.x (Node.js 22) + NestJS 10, React 18, Vite, Prisma 7, Socket.IO, imapflow (002-configurable-domain)
- PostgreSQL 16 (via Prisma ORM) (002-configurable-domain)
- Node.js/TypeScript (Backend), React/TypeScript (Frontend) + NestJS (EventEmitter2, TypeORM/Prisma), React (Vite) (004-dynamic-fe-config)
- PostgreSQL (SystemConfig table) (004-dynamic-fe-config)

- TypeScript 5.x, Node.js 18+ LTS + NestJS 10+, imapflow, mailparser, Prisma, React 18+, Socket.IO (001-inbound-mail-threading)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x, Node.js 18+ LTS: Follow standard conventions

## Recent Changes
- 004-dynamic-fe-config: Added Node.js/TypeScript (Backend), React/TypeScript (Frontend) + NestJS (EventEmitter2, TypeORM/Prisma), React (Vite)
- 002-configurable-domain: Added TypeScript 5.x (Node.js 22) + NestJS 10, React 18, Vite, Prisma 7, Socket.IO, imapflow

- 001-inbound-mail-threading: Added TypeScript 5.x, Node.js 18+ LTS + NestJS 10+, imapflow, mailparser, Prisma, React 18+, Socket.IO

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
