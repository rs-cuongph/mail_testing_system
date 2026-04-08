# Research: Electron to Tauri Migration

**Branch**: `008-electron-to-tauri` | **Date**: 2026-04-08

## 1. Tauri v2 Sidecar API for NestJS Backend

### Decision: Use Tauri Shell Plugin's Sidecar API

### Rationale
- Tauri v2 provides built-in sidecar support via `tauri-plugin-shell`
- Sidecars are configured in `tauri.conf.json` under `bundle.externalBin`
- Binary naming requires `$TARGET_TRIPLE` suffix (e.g., `backend-x86_64-pc-windows-msvc.exe`)
- Sidecar can be spawned from Rust via `app.shell().sidecar("backend")` or from JS via `Command.sidecar("binaries/backend")`
- Permissions required in `capabilities/default.json`: `shell:allow-spawn` with sidecar flag

### Alternatives Considered
- **Raw `std::process::Command`**: Less integrated, no Tauri-managed lifecycle
- **Rewrite backend in Rust**: Massive scope, unnecessary given working NestJS backend

### Key Implementation Details
- Backend must be compiled to a standalone executable using Node.js SEA (Single Executable Application) or `pkg`
- With the `@prisma/adapter-libsql` already in use, SQLite is ready
- The sidecar binary must be placed in `src-tauri/binaries/` with target-triple suffix
- Communication: Sidecar communicates via stdout/stdin (IPC) or HTTP (existing REST API)
- For credential bridge: Use Tauri IPC commands from Rust side instead of Node.js IPC

---

## 2. NestJS Backend Bundling as Standalone Executable

### Decision: Use Node.js Single Executable Application (SEA)

### Rationale
- Node.js SEA (≥20.x) is the official solution for creating single executables
- Bundles the Node.js runtime + application code into one .exe
- No external dependency on `pkg` (which is deprecated) or `nexe`
- Produces a ~50-70 MB executable (Node.js runtime + app code)
- NestJS compiles to JS via `nest build`, then SEA wraps the output

### Alternatives Considered
- **pkg (@vercel/pkg)**: Deprecated, no longer maintained
- **nexe**: Limited community, compatibility issues with native modules
- **Bun compile**: Emerging, but Prisma/libsql compatibility uncertain

### Key Steps
1. `nest build` → produces `dist/main.js`
2. Create SEA config: `sea-config.json` pointing to `dist/main.js`
3. `node --experimental-sea-config sea-config.json` → generates SEA blob
4. Copy `node.exe`, inject SEA blob → produces standalone `backend.exe`
5. Rename to `backend-x86_64-pc-windows-msvc.exe` and place in `src-tauri/binaries/`

---

## 3. Credential Storage: Electron safeStorage → Tauri Stronghold/Keyring

### Decision: Use Tauri's built-in keyring via custom Rust IPC commands

### Rationale
- Electron used `safeStorage` API (DPAPI on Windows, Keychain on macOS)
- Tauri has `tauri-plugin-stronghold` for encrypted storage, but is heavier
- Simpler approach: Use Rust's `keyring` crate directly for OS-native credential storage
- Custom Tauri IPC commands (`#[tauri::command]`) expose get/set/delete credential operations
- Frontend calls these commands via `invoke()` instead of Electron's `ipcRenderer`

### Alternatives Considered
- **tauri-plugin-stronghold**: Over-engineered for simple key-value credential storage
- **tauri-plugin-store**: Not designed for secrets, stores as JSON file (not secure)
- **Storing encrypted in SQLite**: Same as current approach but less secure than OS keyring

### Migration Impact
- Electron `preload.ts` bridge → replaced by Tauri `invoke()` calls
- Backend credential IPC bridge (`process.send/on('message')`) → replaced by Tauri commands called from frontend, then passed to backend via HTTP or env
- Two approaches for backend to access credentials:
  - **Option A**: Frontend retrieves credential via Tauri IPC, passes to backend via HTTP endpoint
  - **Option B**: Rust layer retrieves credential, passes to sidecar backend via stdin/env at startup

---

## 4. System Tray: Electron Tray → Tauri Native Tray

### Decision: Use Tauri's built-in tray API

### Rationale
- Tauri v2 has native tray support (no plugin needed): `tauri::tray::TrayIconBuilder`
- Supports icon, tooltip, and context menu
- Rust-side implementation is straightforward
- Close-to-tray behavior controlled via `on_window_event` handler

### Key Implementation
```rust
// In main.rs setup
let tray = TrayIconBuilder::new()
    .icon(app.default_window_icon().unwrap().clone())
    .menu(&menu)
    .on_menu_event(handler)
    .build(app)?;
```

---

## 5. Notifications: Electron Notification → tauri-plugin-notification

### Decision: Use `tauri-plugin-notification`

### Rationale
- Official Tauri plugin for OS notifications
- Supports Windows (Action Center), macOS (Notification Center), Linux
- Permission-based: requires `notification:default` capability
- Can be triggered from Rust (when backend signals new email) or from frontend JS

### Cargo dependency
```toml
[dependencies]
tauri-plugin-notification = "2"
```

### Frontend usage
```typescript
import { sendNotification } from '@tauri-apps/plugin-notification';
sendNotification({ title: 'New Email', body: 'From: sender@example.com' });
```

---

## 6. WebView2 Bootstrapper on Windows

### Decision: Embed WebView2 bootstrapper in NSIS installer

### Rationale
- Tauri on Windows uses WebView2 (Edge Chromium-based)
- Pre-installed on Windows 11 and most updated Windows 10
- Tauri's NSIS installer template supports `webviewInstallMode: "downloadBootstrapper"` (~1.8 MB)
- Configuration in `tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "nsis": {
        "installerIcon": "icons/icon.ico"
      },
      "webviewInstallMode": {
        "type": "downloadBootstrapper"
      }
    }
  }
}
```

---

## 7. Frontend Adaptation

### Decision: Minimal changes — Brownfield pattern

### Rationale
- Tauri v2 supports the "brownfield" IPC pattern for existing web apps
- The existing React/Vite frontend communicates with backend via HTTP (fetch/axios)
- Only changes needed:
  1. Replace `window.electronAPI.*` calls with `@tauri-apps/api` invoke calls (notifications, credentials)
  2. Update API base URL discovery (query param → Tauri event or environment)
  3. Add `@tauri-apps/plugin-shell` for sidecar interaction (if needed from frontend)
- The Vite `build.outDir` remains the same; Tauri's `frontendDist` config points to it

### Vite Config for Tauri
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
```

### Tauri Config
```json
{
  "build": {
    "devUrl": "http://localhost:5173",
    "frontendDist": "../frontend/dist"
  }
}
```

---

## 8. Project Structure Decision

### Decision: Add `src-tauri/` directory alongside existing `backend/` and `frontend/`

### Rationale
- Standard Tauri v2 project structure
- `src-tauri/` contains Rust code, Cargo.toml, tauri.conf.json
- Existing `electron/` directory will be archived/removed after migration
- Tauri CLI integrates with the existing monorepo structure

### Directory Layout
```
mail_testing_system/
├── backend/          # NestJS backend (unchanged)
├── frontend/         # React/Vite frontend (minimal changes)
├── src-tauri/        # NEW: Tauri Rust application
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/
│   ├── binaries/     # Sidecar binaries (backend.exe)
│   └── src/
│       ├── main.rs   # Tauri entry point
│       └── lib.rs    # Commands, tray, sidecar management
├── electron/         # ARCHIVED after migration
├── scripts/          # Build scripts (SEA bundling, sidecar prep)
└── ...
```
