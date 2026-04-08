# Desktop App Quickstart

This documentation describes how to build and run the Mail Testing System as a Desktop App locally.

## Prerequisites
- Node.js 20+
- OS: Windows, macOS, or Linux

## Setup Steps

### 1. Install Dependencies
Ensure you install dependencies across all three layers (frontend, backend, electron container):
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
# Generate SQLite Prisma Client
npx prisma generate

# Electron
cd ../electron
npm install
```

### 2. Run in Development Mode
During development, the Electron process will wrap the frontend and backend.
```bash
# Start backend in dev mode
cd backend
npm run start:dev

# Start frontend in dev mode
cd ../frontend
npm run dev

# Start Electron shell
cd ../electron
npm run start
```
*Note: We may consolidate this with a `concurrently` script at the root `package.json` in the future.*

### 3. Build & Package (Production)
To create a distributable `.exe`, `.dmg`, or AppImage:
```bash
# Build frontend and backend first
cd frontend && npm run build
cd ../backend && npm run build

# Package with Electron Builder
cd ../electron
npm run package:win   # For Windows (.exe)
npm run package:mac   # For macOS (.dmg)
npm run package:linux # For Linux (AppImage)
```
The output installers will be located in `electron/dist/`.
