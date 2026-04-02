# Quickstart: Inbound Mail Testing System

**Branch**: `001-inbound-mail-threading` | **Date**: 2026-04-02

## Prerequisites

- Node.js 18+ (LTS)
- PostgreSQL 14+
- Access to IMAP server (Dovecot on cPanel)
- Catch-all email rule configured: `*@rn.work → gens@rn.work`

## Project Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Configuration

Create `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mail_testing?schema=public"

# IMAP
IMAP_HOST="mail.rn.work"
IMAP_PORT=993
IMAP_USER="gens@rn.work"
IMAP_PASSWORD="your-password"
IMAP_TLS=true

# App
PORT=3000
ATTACHMENT_STORAGE_DIR="./uploads/attachments"

# IMAP Worker
IMAP_MODE="idle"           # "idle" or "poll"
IMAP_POLL_INTERVAL=5000    # milliseconds, used when IMAP_MODE=poll
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

### 3. Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run Development

```bash
# Terminal 1: Backend (API + IMAP Worker)
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 5. Verify

1. Open browser: `http://localhost:5173`
2. Send a test email to `gens+test@rn.work`
3. Verify it appears in the UI under thread `gens+test@rn.work` within 10 seconds

## Project Structure

```
mail_testing_system/
├── backend/
│   ├── src/
│   │   ├── app.module.ts              # Root module
│   │   ├── main.ts                    # Entry point
│   │   ├── imap/                      # IMAP Worker module
│   │   │   ├── imap.module.ts
│   │   │   ├── imap.service.ts        # IMAP connection & fetching
│   │   │   └── mail-parser.service.ts # Email parsing & tag extraction
│   │   ├── threads/                   # Thread management module
│   │   │   ├── threads.module.ts
│   │   │   ├── threads.controller.ts  # REST API for threads
│   │   │   └── threads.service.ts
│   │   ├── emails/                    # Email management module
│   │   │   ├── emails.module.ts
│   │   │   ├── emails.controller.ts   # REST API for emails
│   │   │   └── emails.service.ts
│   │   ├── attachments/               # Attachment management module
│   │   │   ├── attachments.module.ts
│   │   │   ├── attachments.controller.ts
│   │   │   └── attachments.service.ts
│   │   ├── events/                    # WebSocket gateway
│   │   │   ├── events.module.ts
│   │   │   └── events.gateway.ts
│   │   └── prisma/                    # Database module
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── ThreadList.tsx          # Thread list sidebar
│   │   │   ├── ThreadView.tsx         # Emails in a thread
│   │   │   ├── EmailDetail.tsx        # Full email view with toggle
│   │   │   ├── EmailBodyViewer.tsx    # Plain text / HTML toggle
│   │   │   └── AttachmentList.tsx     # Attachment download links
│   │   ├── services/
│   │   │   ├── api.ts                 # REST API client
│   │   │   └── socket.ts             # Socket.IO client
│   │   └── types/
│   │       └── index.ts               # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
└── specs/                             # Feature specs (this directory)
```

## Key Commands

| Command | Location | Description |
| ------- | -------- | ----------- |
| `npm run start:dev` | backend | Start NestJS in watch mode (API + IMAP worker) |
| `npm run dev` | frontend | Start Vite dev server |
| `npx prisma studio` | backend | Open Prisma Studio for DB inspection |
| `npx prisma migrate dev` | backend | Run pending DB migrations |
| `npm run test` | backend | Run backend unit tests |
| `npm run test:e2e` | backend | Run backend E2E tests |
