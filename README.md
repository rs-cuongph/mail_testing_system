# Mail Testing System — Plus Addressing Thread View

An internal email testing tool that ingests emails from an IMAP mailbox, groups them into threads by `+tag` (e.g., `inbox+test@example.com`), and displays them in a real-time web UI. **Supports any email domain** — configure via environment variables.

## 🐳 Docker (Recommended)

### 1. Configure IMAP credentials

```bash
cp backend/.env.example backend/.env
# Mở backend/.env và điền: IMAP_HOST, IMAP_USER, IMAP_PASSWORD, MAIL_DOMAIN, MAIL_BASE_ADDRESS
```

### 2. Start everything

```bash
docker compose up -d --build
```

### 3. Open browser

```
http://localhost
```

Gửi email đến `{MAIL_BASE_ADDRESS}+test@{MAIL_DOMAIN}` — sẽ xuất hiện trong UI trong vài giây.

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
- IMAP access with catch-all configured: `*@yourdomain.com → baseaddress@yourdomain.com`

### 1. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit DATABASE_URL, IMAP_HOST, IMAP_USER, IMAP_PASSWORD, MAIL_DOMAIN, MAIL_BASE_ADDRESS

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

Open **http://localhost:5173** — send an email to `{MAIL_BASE_ADDRESS}+test@{MAIL_DOMAIN}` to see it appear.

## Architecture

```
frontend (React + Vite)
  ↕ REST API + WebSocket (Socket.IO)
backend (NestJS)
  ├── IMAP Worker (imapflow, IDLE mode)
  ├── REST API (/api/threads, /api/emails, /api/attachments, /api/config)
  └── WebSocket Gateway (email:new, thread:new, thread:deleted, all:cleared)
  ↕ Prisma ORM
PostgreSQL
```

## Key Features

- **Tag-based threading** — `{base}+{tag}@{domain}` creates/updates its own thread
- **Configurable domain** — set `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` to use any email domain
- **Real-time updates** — new emails appear in the UI without refresh (WebSocket)
- **Dual-body rendering** — toggle between plain text and sandboxed HTML
- **Attachments** — stored on filesystem, downloadable from the UI
- **Manual purge** — delete individual threads or clear all data

## Environment Variables (backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `IMAP_HOST` | — | IMAP server hostname |
| `IMAP_PORT` | `993` | IMAP port |
| `IMAP_USER` | — | IMAP auth email |
| `IMAP_PASSWORD` | — | IMAP auth password |
| `IMAP_TLS` | `true` | Use TLS/SSL |
| `IMAP_MODE` | `idle` | `idle` or `poll` |
| `IMAP_POLL_INTERVAL` | `5000` | Polling interval (ms) |
| `MAIL_DOMAIN` | `rn.work` | Target email domain (only `*@MAIL_DOMAIN` emails are processed) |
| `MAIL_BASE_ADDRESS` | `gens` | Base local-part for thread labels |
| `PORT` | `3000` | Backend server port |
| `ATTACHMENT_STORAGE_DIR` | `./uploads/attachments` | Where attachments are stored |

## API Reference

See [`specs/001-inbound-mail-threading/contracts/api.md`](specs/001-inbound-mail-threading/contracts/api.md) for full REST and WebSocket documentation.

### Config Endpoint

```
GET /api/config
→ { "mailDomain": "example.com", "mailBaseAddress": "inbox" }
```

## Full Setup Guide

See [`specs/001-inbound-mail-threading/quickstart.md`](specs/001-inbound-mail-threading/quickstart.md) for complete project structure and validation steps.
