# Implementation Plan: Electron to Tauri Migration

**Branch**: `008-electron-to-tauri` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-electron-to-tauri/spec.md`

## Summary

Migrate the Mail Testing System's desktop shell from Electron to Tauri v2, replacing the bundled Chromium browser engine with the OS-native WebView (WebView2 on Windows). The existing React/Vite frontend and NestJS backend remain architecturally unchanged. The NestJS backend is bundled as a Node.js SEA (Single Executable Application) sidecar binary managed by Tauri's shell plugin. Credential storage moves from Electron's `safeStorage` to OS-native keyring via Rust. Expected outcome: installer size drops from ~300 MB to <30 MB, startup time from ~15s to <5s, memory usage reduced by 50%+.

## Technical Context

**Language/Version**: Rust (stable ≥1.77) for Tauri shell, TypeScript for frontend + backend  
**Primary Dependencies**: Tauri v2, tauri-plugin-shell, tauri-plugin-notification, tauri-plugin-store, keyring (Rust crate)  
**Storage**: SQLite via Prisma `@prisma/adapter-libsql` (unchanged)  
**Testing**: Manual testing against acceptance scenarios, `cargo test` for Rust commands  
**Target Platform**: Windows 10/11 (64-bit) MVP, macOS/Linux follow-on  
**Project Type**: Desktop application (monorepo: backend + frontend + desktop shell)  
**Performance Goals**: <5s startup, <30 MB installer, 50%+ less memory at idle  
**Constraints**: Must maintain 100% feature parity with Electron version, zero frontend rewrite  
**Scale/Scope**: Single-user local desktop app, ~10 Tauri IPC commands, ~3 Rust source files

## Constitution Check

*Constitution is a template (not project-specific) — no gates to enforce.*

## Project Structure

### Documentation (this feature)

```text
specs/008-electron-to-tauri/
├── plan.md              # This file
├── research.md          # Technology decisions and rationale
├── data-model.md        # Data migration and entity changes
├── quickstart.md        # Developer setup guide
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
mail_testing_system/
├── backend/                    # NestJS backend (minimal changes)
│   ├── src/                    # Application source
│   ├── prisma/                 # Prisma schema + migrations
│   ├── package.json            # Add SEA build script
│   └── sea-config.json         # NEW: Node.js SEA configuration
│
├── frontend/                   # React/Vite frontend (minimal changes)
│   ├── src/
│   │   ├── services/           # Update API bridge calls
│   │   └── lib/
│   │       └── tauri-bridge.ts # NEW: Tauri IPC wrapper
│   └── package.json            # Add @tauri-apps/* dependencies
│
├── src-tauri/                  # NEW: Tauri application
│   ├── Cargo.toml              # Rust dependencies
│   ├── build.rs                # Build script
│   ├── tauri.conf.json         # App config, bundle, plugins
│   ├── capabilities/
│   │   └── default.json        # Security permissions
│   ├── icons/                  # App icons for all platforms
│   ├── binaries/               # Sidecar executables (backend)
│   └── src/
│       ├── main.rs             # Entry point
│       ├── lib.rs              # Plugin registration, setup
│       ├── commands.rs         # Tauri IPC commands
│       ├── sidecar.rs          # Backend process management
│       └── tray.rs             # System tray logic
│
├── scripts/                    # NEW: Build automation
│   ├── prepare-sidecar.mjs     # Bundle backend as SEA + rename
│   └── build-all.mjs           # Full build pipeline
│
├── electron/                   # ARCHIVED (removed after validation)
└── docker-compose.yml          # Unchanged (for web/Docker users)
```

**Structure Decision**: The `src-tauri/` directory follows Tauri v2's standard project structure and sits alongside `backend/` and `frontend/` in the monorepo root. This mirrors the `electron/` directory's position, making it a clean replacement.

## Phase 0: Research

All research completed. See [research.md](./research.md) for detailed decisions:

1. **Sidecar API** → Tauri Shell Plugin with `externalBin` configuration
2. **Backend bundling** → Node.js SEA (Single Executable Application)
3. **Credential storage** → Rust `keyring` crate via `#[tauri::command]`
4. **System tray** → Tauri native `TrayIconBuilder`
5. **Notifications** → `tauri-plugin-notification`
6. **WebView2** → Download bootstrapper embedded in NSIS installer
7. **Frontend changes** → Brownfield pattern, minimal changes
8. **Project structure** → `src-tauri/` alongside existing directories

## Phase 1: Design & Architecture

### Component Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Tauri Shell (Rust)                  │
│                                                       │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │   System Tray    │  │    IPC Commands Layer     │   │
│  │   (tray.rs)      │  │    (commands.rs)          │   │
│  │                  │  │                           │   │
│  │  • Open window   │  │  • get_credential()      │   │
│  │  • Quit app      │  │  • set_credential()      │   │
│  │  • Tooltip count │  │  • delete_credential()    │   │
│  └─────────────────┘  │  • get_preference()       │   │
│                        │  • set_preference()       │   │
│  ┌─────────────────┐  │  • get_backend_url()      │   │
│  │ Sidecar Manager  │  └──────────────────────────┘   │
│  │ (sidecar.rs)     │                                  │
│  │                  │  ┌──────────────────────────┐   │
│  │ • Start backend  │  │    Notification Bridge    │   │
│  │ • Health check   │  │    (tauri-plugin)         │   │
│  │ • Auto-restart   │  │                           │   │
│  │ • Port discovery │  │  • OS notifications      │   │
│  │ • Graceful stop  │  │  • Permission handling   │   │
│  └─────────────────┘  └──────────────────────────┘   │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │              WebView (OS Native)                │   │
│  │                                                 │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │    React Frontend (Vite build output)     │  │   │
│  │  │                                           │  │   │
│  │  │  Services → fetch(`http://127.0.0.1:${p}`)│  │   │
│  │  │  Tauri Bridge → invoke('get_credential')  │  │   │
│  │  │  Notifications → invoke('show_notif')     │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │         Backend Sidecar (Node.js SEA)          │   │
│  │                                                 │   │
│  │  NestJS API Server (port auto-assigned)        │   │
│  │  ├── IMAP Worker                               │   │
│  │  ├── WebSocket Gateway                         │   │
│  │  ├── Prisma + SQLite                           │   │
│  │  └── REST API                                  │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Sidecar Lifecycle

```
App Start → Find available port
          → Set env (PORT, DATABASE_URL, ATTACHMENT_DIR)
          → Run Prisma migrations (via sidecar args)
          → Start sidecar (backend SEA binary)
          → Wait for health check (GET /api/config)
          → Show main window

Backend Crash → Detect exit code ≠ 0
              → If retries < 3 within 60s → restart automatically
              → If retries ≥ 3 → show error dialog (Restart/Quit)

App Quit → Send SIGTERM to sidecar
         → Wait up to 5s
         → If still running → SIGKILL
         → Destroy tray → Exit
```

### IPC Command Mapping (Electron → Tauri)

| Electron IPC Channel | Tauri Command | Direction |
|---|---|---|
| `notifications:isSupported` | Plugin: `isPermissionGranted()` | Frontend → Rust |
| `notifications:getEnabled` | `get_preference("notificationsEnabled")` | Frontend → Rust |
| `notifications:setEnabled` | `set_preference("notificationsEnabled", val)` | Frontend → Rust |
| `notifications:show` | `show_notification(title, body)` | Frontend → Rust |
| `credential:get` (Node IPC) | `get_credential(key)` | Frontend → Rust |
| `credential:set` (Node IPC) | `set_credential(key, password)` | Frontend → Rust |
| `credential:delete` (Node IPC) | `delete_credential(key)` | Frontend → Rust |
| *(new)* | `get_backend_url()` | Frontend → Rust |
| *(new)* | `get_close_behavior()` | Frontend → Rust |
| *(new)* | `set_close_behavior(val)` | Frontend → Rust |

### Frontend Changes

**Files requiring modification**:

1. **`frontend/src/lib/tauri-bridge.ts`** (NEW) — Abstract Tauri IPC calls so the frontend can work both as web app and desktop app
2. **`frontend/src/App.tsx`** — Replace `window.location.search` API URL discovery with Tauri `invoke('get_backend_url')`
3. **`frontend/src/services/*.ts`** — Any direct `window.electronAPI.*` calls replaced with tauri-bridge imports
4. **`frontend/package.json`** — Add `@tauri-apps/api`, `@tauri-apps/plugin-shell`, `@tauri-apps/plugin-notification`

**Files NOT modified**: All React components, pages, CSS, routing remain unchanged.

### Backend Changes

**Files requiring modification**:

1. **`backend/package.json`** — Add `build:sea` script
2. **`backend/sea-config.json`** (NEW) — Node.js SEA blob configuration
3. **`backend/src/credentials/credential.service.ts`** — Remove Electron IPC bridge dependency, use HTTP-based credential passing

**Files NOT modified**: All NestJS modules, services, controllers, Prisma schema remain unchanged.

## Phase 2: Implementation Phases

### Phase 2.1: Tauri Project Initialization
- Initialize `src-tauri/` with `cargo tauri init`
- Configure `tauri.conf.json` (window, bundle, icons, plugins)
- Set up `capabilities/default.json` with required permissions
- Verify `cargo tauri dev` opens a window pointing to Vite dev server

### Phase 2.2: Backend SEA Bundling
- Create `sea-config.json` for Node.js SEA
- Create `scripts/prepare-sidecar.mjs` build script
- Test standalone `backend.exe` runs independently
- Place in `src-tauri/binaries/` with target-triple suffix

### Phase 2.3: Sidecar Management (Rust)
- Implement `sidecar.rs`: start, stop, health check, port discovery
- Implement auto-restart logic (3 retries in 60s window)
- Wire sidecar lifecycle into Tauri `setup()` hook
- Test backend starts and responds to health checks

### Phase 2.4: IPC Commands (Rust)
- Implement credential IPC commands using `keyring` crate
- Implement preference commands using `tauri-plugin-store`
- Implement `get_backend_url()` command
- Wire all commands in `lib.rs`

### Phase 2.5: System Tray & Window Behavior
- Implement `tray.rs` with TrayIconBuilder
- Implement close-to-tray behavior with configurable setting
- Handle "Open" and "Quit" tray menu actions
- Test Ctrl+Q, tray icon, window hide/show

### Phase 2.6: Frontend Integration
- Create `tauri-bridge.ts` abstraction layer
- Update API URL discovery to use Tauri command
- Replace Electron preload bridge calls with Tauri invoke
- Add notification support via `@tauri-apps/plugin-notification`

### Phase 2.7: Notification Bridge
- Implement notification forwarding from backend → Rust → OS
- Backend signals new email via WebSocket → Frontend triggers `invoke('show_notification')`
- Implement notification toggle in settings

### Phase 2.8: Build & Package (Windows)
- Configure NSIS installer in `tauri.conf.json`
- Set WebView2 download bootstrapper mode
- Configure app icons for Windows
- Test full build pipeline: `cargo tauri build`
- Verify installer size < 30 MB

### Phase 2.9: Integration Testing & Validation
- Run full feature parity checklist against Tauri app
- Measure: installer size, startup time, memory usage
- Test on clean Windows 10/11 machine
- Verify credential security (no plaintext on disk)
- Test crash recovery (kill backend, verify auto-restart)

### Phase 2.10: Cleanup
- Archive `electron/` directory
- Update root `README.md` with Tauri build instructions
- Update `docker-compose.yml` comments (still for web users)

## Complexity Tracking

No constitution violations to justify.
