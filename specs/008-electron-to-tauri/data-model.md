# Data Model: Electron to Tauri Migration

**Branch**: `008-electron-to-tauri` | **Date**: 2026-04-08

## Overview

This migration does not change the application's data model. The existing SQLite database schema (managed by Prisma with `@prisma/adapter-libsql`) remains identical. The changes are purely at the desktop shell layer.

## Entities Affected by Migration

### 1. IMAP Credential Store (Changed)

**Before (Electron)**:
- Credentials stored in `credentials.json` file in `app.getPath('userData')`
- Encrypted using Electron's `safeStorage` API (DPAPI on Windows)
- Credential keys stored in SQLite `ImapProfile` table
- IPC bridge: `process.send()` / `process.on('message')` between Electron main and backend child process

**After (Tauri)**:
- Credentials stored in OS-native keyring via Rust `keyring` crate
- Service name: `com.mailsystem.desktop`
- Credential keys still stored in SQLite `ImapProfile` table
- IPC bridge: Tauri `#[tauri::command]` functions invoked from frontend via `invoke()`

| Attribute       | Type   | Storage Location             | Notes                        |
|-----------------|--------|------------------------------|------------------------------|
| credential_key  | string | SQLite (ImapProfile table)   | UUID reference key           |
| password        | string | OS Keyring (via Rust)        | Never in plaintext on disk   |

### 2. App Preferences (Changed)

**Before (Electron)**:
- `preferences.json` file in `app.getPath('userData')`
- Stored: `notificationsEnabled`, close-button behavior (new)

**After (Tauri)**:
- Use `tauri-plugin-store` for app preferences
- Stored in Tauri's app data directory
- Same fields: `notificationsEnabled`, `closeBehavior`

| Attribute             | Type    | Default | Notes                              |
|-----------------------|---------|---------|------------------------------------|
| notificationsEnabled  | boolean | true    | Toggle for OS desktop notifications|
| closeBehavior         | string  | "tray"  | "tray" or "quit"                   |

### 3. User Data Directory (Changed Path)

**Before (Electron)**:
- Windows: `%APPDATA%/Mail Catcher/`
- Contains: `data/mail-testing-system.db`, `attachments/`, `credentials.json`, `preferences.json`

**After (Tauri)**:
- Windows: `%APPDATA%/com.mailsystem.tauri/` (separate from Electron version)
- Contains: `data/mail-testing-system.db`, `attachments/`
- Credentials: OS Keyring (not on disk)
- Preferences: Tauri Store (managed by plugin)

### 4. Database Schema (Unchanged)

The Prisma schema and all database tables remain identical:
- `Email`, `Thread`, `Category`, `ImapProfile`, `Setting`
- Provider: `sqlite` via `@prisma/adapter-libsql`
- No schema migration needed for the Tauri version

## IPC Communication Model (Changed)

### Before (Electron)
```
Frontend (Renderer) ←→ preload.ts (contextBridge) ←→ main.ts (ipcMain)
                                                      ↕
                                                  Backend (child process via IPC channel)
```

### After (Tauri)
```
Frontend (WebView) ←→ Tauri IPC (invoke) ←→ Rust Commands (src/lib.rs)
                                              ↕
                                          Backend (sidecar via HTTP + stdin/stdout)
```

Key difference: The credential bridge no longer goes through Node.js IPC. Instead:
1. Frontend calls `invoke('get_credential', { key })` → Rust reads OS keyring
2. Frontend calls `invoke('set_credential', { key, password })` → Rust writes OS keyring
3. Backend receives password via HTTP call from frontend (for IMAP connection)
