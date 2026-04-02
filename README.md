# Mail Testing System — Plus Addressing Thread View

An internal email testing tool that ingests emails from an IMAP mailbox, groups them into threads by `+tag` (e.g., `gens+test@rn.work`), and displays them in a real-time web UI.

## 🐳 Docker (Recommended)

### 1. Configure IMAP credentials

```bash
cp backend/.env.example backend/.env
# Mở backend/.env và điền: IMAP_HOST, IMAP_USER, IMAP_PASSWORD
```

### 2. Start everything

```bash
docker compose up -d --build
```

### 3. Open browser

```
http://localhost
```

Gửi email đến `gens+test@rn.work` — sẽ xuất hiện trong UI trong vài giây.

### Useful Docker commands

```bash
# Xem logs
docker compose logs -f

# Xem logs của một service cụ thể
docker compose logs -f backend

# Dừng tất cả
docker compose down

# Xóa data (volumes)
docker compose down -v

# Rebuild sau khi sửa code
docker compose up -d --build backend
```

---

## Quick Start

### Prerequisites

- Node.js 18+ (LTS)
- PostgreSQL 14+
- cPanel IMAP access with catch-all configured: `*@rn.work → gens@rn.work`

### 1. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit DATABASE_URL, IMAP_HOST, IMAP_USER, IMAP_PASSWORD in backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 2. Set Up Database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Run

```bash
# Terminal 1: Backend (API + IMAP worker)
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** — send an email to `gens+test@rn.work` to see it appear.

## Architecture

```
frontend (React + Vite)
  ↕ REST API + WebSocket (Socket.IO)
backend (NestJS)
  ├── IMAP Worker (imapflow, IDLE mode)
  ├── REST API (/api/threads, /api/emails, /api/attachments)
  └── WebSocket Gateway (email:new, thread:new, thread:deleted, all:cleared)
  ↕ Prisma ORM
PostgreSQL
```

## Key Features

- **Tag-based threading** — `gens+{tag}@rn.work` creates/updates its own thread
- **Real-time updates** — new emails appear in the UI without refresh (WebSocket)
- **Dual-body rendering** — toggle between plain text and sandboxed HTML
- **Attachments** — stored on filesystem, downloadable from the UI
- **Manual purge** — delete individual threads or clear all data

## Environment Variables (backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `IMAP_HOST` | `mail.rn.work` | IMAP server hostname |
| `IMAP_PORT` | `993` | IMAP port |
| `IMAP_USER` | — | IMAP auth email |
| `IMAP_PASSWORD` | — | IMAP auth password |
| `IMAP_TLS` | `true` | Use TLS/SSL |
| `IMAP_MODE` | `idle` | `idle` or `poll` |
| `IMAP_POLL_INTERVAL` | `5000` | Polling interval (ms) |
| `PORT` | `3000` | Backend server port |
| `ATTACHMENT_STORAGE_DIR` | `./uploads/attachments` | Where attachments are stored |

## API Reference

See [`specs/001-inbound-mail-threading/contracts/api.md`](specs/001-inbound-mail-threading/contracts/api.md) for full REST and WebSocket documentation.

## Full Setup Guide

See [`specs/001-inbound-mail-threading/quickstart.md`](specs/001-inbound-mail-threading/quickstart.md) for complete project structure and validation steps.
