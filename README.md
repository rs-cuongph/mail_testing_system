# Mail Testing System

An internal email testing tool that ingests emails from an IMAP mailbox, groups them into threads by `+tag` (for example `inbox+test@example.com`), and displays them in a real-time UI.

## Docker

### 1. Configure IMAP credentials

```bash
cp backend/.env.example backend/.env
```

Set these values in `backend/.env`:

- `IMAP_HOST`
- `IMAP_USER`
- `IMAP_PASSWORD`
- `MAIL_DOMAIN`
- `MAIL_BASE_ADDRESS`

### 2. Start everything

```bash
docker compose up -d --build
```

### 3. Open the app

```text
http://localhost
```

## Local web development

### Prerequisites

- Node.js 18+ (LTS)
- PostgreSQL 14+

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Set up the database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Run the web app

```bash
# Terminal 1
cd backend && npm run start:dev

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173`.

## Desktop app

The Electron desktop app packages the frontend and backend into a single Windows app named `Mail Catcher`.

### Desktop prerequisites

- Node.js 18+ (LTS)
- Dependencies installed in `frontend`, `backend`, and `electron`

### Run desktop in development

```bash
# Terminal 1
cd frontend && npm run build

# Terminal 2
cd backend && npm run build:desktop

# Terminal 3
cd electron && npm run dev
```

The Electron app starts the bundled backend automatically and loads the packaged frontend build.

### Build a Windows installer

```bash
cd electron
npm run dist
```

Expected output:

- Installer: `electron/dist/Mail-Catcher-Setup-<version>.exe`
- Unpacked app: `electron/dist/win-unpacked/`

### Desktop packaging notes

- Installer metadata and the Windows executable icon come from `electron/build/icon.ico`
- Runtime tray, window, and notification icon come from `electron/build/icon.png`
- Notifications and secure credential storage are handled in the Electron main process

## Architecture

```text
frontend (React + Vite)
  <-> REST API + WebSocket (Socket.IO)
backend (NestJS)
  |- IMAP Worker (imapflow, IDLE mode)
  |- REST API (/api/threads, /api/emails, /api/attachments, /api/config)
  `- WebSocket Gateway (email:new, thread:new, thread:deleted, all:cleared)
  <-> Prisma ORM
database
```

## Key features

- Tag-based threading by `+tag`
- Real-time UI updates over WebSocket
- Desktop notifications for new mail
- Runtime trace log panel with export
- Attachment download support
- Manual thread purge and profile-based IMAP setup
