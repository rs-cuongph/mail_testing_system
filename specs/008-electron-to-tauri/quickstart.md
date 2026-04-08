# Quickstart: Electron to Tauri Migration

**Branch**: `008-electron-to-tauri` | **Date**: 2026-04-08

## Prerequisites

### Development Machine Requirements
- **Rust toolchain**: Install via [rustup](https://rustup.rs/) (stable channel)
- **Node.js**: v20+ (for NestJS backend and frontend tooling)
- **Windows**: Visual Studio Build Tools 2022 (C++ workload) + WebView2
- **macOS**: Xcode Command Line Tools
- **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libayatana-appindicator3-dev`

### Verify Rust Installation
```bash
rustc --version    # Should be ≥1.77
cargo --version
rustc --print host-tuple  # e.g., x86_64-pc-windows-msvc
```

## Project Setup (One-time)

### 1. Initialize Tauri in the project root
```bash
cd d:\mail_testing_system
cargo install tauri-cli --version "^2"
cargo tauri init
```

When prompted:
- App name: `Mail Catcher`
- Window title: `Mail Catcher`
- Frontend dev URL: `http://localhost:5173`
- Frontend build output: `../frontend/dist`
- Frontend dev command: `npm run dev --prefix ../frontend`
- Frontend build command: `npm run build --prefix ../frontend`

### 2. Add required Tauri plugins
```bash
cd src-tauri
cargo add tauri-plugin-shell tauri-plugin-notification tauri-plugin-store tauri-plugin-single-instance
```

### 3. Install frontend Tauri dependencies
```bash
cd frontend
npm install @tauri-apps/api @tauri-apps/plugin-shell @tauri-apps/plugin-notification @tauri-apps/plugin-store
```

## Development Workflow

### Run in Dev Mode
```bash
# From project root
cargo tauri dev
```
This will:
1. Start the Vite dev server (frontend)
2. Build the Rust application
3. Open the Tauri window pointing to the Vite dev server
4. Start the backend sidecar (if configured)

### Build for Production (Windows)
```bash
# 1. Build the NestJS backend as standalone executable
npm run build:sea --prefix backend

# 2. Copy to src-tauri/binaries/ with target triple suffix
node scripts/prepare-sidecar.mjs

# 3. Build the Tauri application
cargo tauri build
```

Output: `src-tauri/target/release/bundle/nsis/Mail-Catcher-Setup-*.exe`

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/Cargo.toml` | Rust dependencies |
| `src-tauri/tauri.conf.json` | Tauri configuration (window, bundle, plugins) |
| `src-tauri/src/main.rs` | Rust entry point |
| `src-tauri/src/lib.rs` | IPC commands, sidecar management, tray |
| `src-tauri/capabilities/default.json` | Security permissions |
| `src-tauri/binaries/` | Sidecar executables (backend) |
| `scripts/prepare-sidecar.mjs` | Build script for backend SEA packaging |

## Mapping: Electron → Tauri

| Electron Concept | Tauri Equivalent |
|-------------------|------------------|
| `BrowserWindow` | `WebviewWindow` |
| `ipcMain.handle()` | `#[tauri::command]` |
| `ipcRenderer.invoke()` | `invoke()` from `@tauri-apps/api` |
| `electron-builder` | `cargo tauri build` |
| `preload.ts` (contextBridge) | Tauri permissions + `invoke()` |
| `safeStorage` | `keyring` crate (Rust) |
| `Notification` | `tauri-plugin-notification` |
| `Tray` | `tauri::tray::TrayIconBuilder` |
| `app.getPath('userData')` | `app.path().app_data_dir()` |
| Child process (`spawn`) | Sidecar (`shell().sidecar()`) |
| `ELECTRON_RUN_AS_NODE` | SEA (standalone Node.js executable) |
