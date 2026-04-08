# Tasks: Electron to Tauri Migration

**Input**: Design documents from `/specs/008-electron-to-tauri/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted. Manual acceptance testing is specified in the spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Tauri shell**: `src-tauri/src/`
- **Frontend**: `frontend/src/`
- **Backend**: `backend/`
- **Scripts**: `scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Tauri project and configure the build toolchain

- [X] T001 Install Rust toolchain (stable) and verify with `rustc --version` and `rustc --print host-tuple`
- [X] T002 Initialize Tauri v2 project by running `cargo tauri init` in the project root, creating `src-tauri/` directory
- [X] T003 Configure `src-tauri/tauri.conf.json` with app identity (appId: `com.mailsystem.tauri`, productName: `Mail Catcher`), window defaults (1440×960, minWidth 1080, minHeight 720), frontend paths (`devUrl: http://localhost:5173`, `frontendDist: ../frontend/dist`), and bundle settings
- [X] T004 [P] Add Tauri plugin dependencies to `src-tauri/Cargo.toml`: `tauri-plugin-shell`, `tauri-plugin-notification`, `tauri-plugin-store`, `tauri-plugin-single-instance`, `keyring` crate
- [X] T005 [P] Install frontend Tauri packages in `frontend/package.json`: `@tauri-apps/api`, `@tauri-apps/plugin-shell`, `@tauri-apps/plugin-notification`, `@tauri-apps/plugin-store`
- [X] T006 Configure security permissions in `src-tauri/capabilities/default.json`: grant `core:default`, `shell:allow-spawn` (sidecar), `notification:default`, `store:default`
- [ ] T007 [P] Generate app icons for all platforms using `cargo tauri icon` from an existing icon asset in `electron/build/icon.png`, outputting to `src-tauri/icons/`
- [X] T008 Register all plugins in `src-tauri/src/lib.rs`: initialize `tauri-plugin-shell`, `tauri-plugin-notification`, `tauri-plugin-store`, `tauri-plugin-single-instance` in the Tauri builder
- [ ] T009 Verify baseline: run `cargo tauri dev` and confirm an empty Tauri window opens pointing to the Vite dev server at `http://localhost:5173`

**Checkpoint**: Tauri project skeleton compiles and opens a window showing the existing frontend in dev mode.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend SEA bundling and sidecar binary preparation — MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until the backend sidecar is functional

- [X] T010 Create Node.js SEA configuration file `backend/sea-config.json` pointing to `backend/dist/main.js` as the entry point with `disableExperimentalSEAWarning: true`
- [X] T011 Add `build:sea` script to `backend/package.json` that runs: `nest build` → `node --experimental-sea-config sea-config.json` → copy `node.exe` → `npx postject` to inject the SEA blob → produce `backend.exe`
- [X] T012 Create `scripts/prepare-sidecar.mjs` build script that: runs the backend SEA build, determines the target triple via `rustc --print host-tuple`, renames the binary to `backend-{target-triple}.exe`, copies it to `src-tauri/binaries/`
- [X] T013 Configure `src-tauri/tauri.conf.json` `bundle.externalBin` to include `"binaries/backend"` for sidecar bundling
- [X] T014 Update sidecar permission in `src-tauri/capabilities/default.json` to allow spawning the `backend` sidecar binary with `shell:allow-spawn` scoped to `{ "name": "binaries/backend", "sidecar": true }`
- [ ] T015 Test the standalone `backend.exe` binary: verify it starts, listens on a port, and responds to `GET /api/config` health check independently of the Tauri app

**Checkpoint**: Backend compiles to a standalone SEA binary, runs independently, and is placed in `src-tauri/binaries/` with the correct target-triple suffix.

---

## Phase 3: User Story 1 — Lightweight Install & Launch on Windows (Priority: P1) 🎯 MVP

**Goal**: User downloads <30 MB installer, launches app, sees the full UI with backend services running silently.

**Independent Test**: On a clean Windows 10/11 machine, install the app, launch it, verify the main UI appears within 5 seconds, configure IMAP, and confirm emails arrive.

### Implementation for User Story 1

- [X] T016 [US1] Implement `src-tauri/src/sidecar.rs`: create `SidecarManager` struct with `start()`, `stop()`, `is_running()`, `health_check()`, and `get_port()` methods. Use `tauri_plugin_shell::ShellExt` to spawn the `backend` sidecar binary
- [X] T017 [US1] Implement port discovery in `src-tauri/src/sidecar.rs`: `find_available_port()` function that tries ports starting from 7654, checking availability via `TcpListener::bind()`. Pass the discovered port as an environment variable `PORT` to the sidecar
- [X] T018 [US1] Implement sidecar environment setup in `src-tauri/src/sidecar.rs`: configure `DATABASE_URL` (pointing to `app_data_dir/data/mail-testing-system.db`), `ATTACHMENT_STORAGE_DIR` (pointing to `app_data_dir/attachments/`), `FRONTEND_URL` as env vars passed to the sidecar process
- [X] T019 [US1] Implement health check polling in `src-tauri/src/sidecar.rs`: `wait_for_backend()` that polls `GET http://127.0.0.1:{port}/api/config` up to 40 times with 500ms intervals, resolving when the backend responds with HTTP 200
- [X] T020 [US1] Implement Prisma migration execution in `src-tauri/src/sidecar.rs`: before starting the main sidecar, execute the backend binary with a `--migrate` argument or run `prisma migrate deploy` as a separate sidecar invocation
- [X] T021 [US1] Wire sidecar lifecycle into `src-tauri/src/lib.rs` Tauri `setup()` hook: on app start → find port → run migrations → start sidecar → wait for health check → create and show the main window
- [X] T022 [US1] Implement the `get_backend_url` Tauri command in `src-tauri/src/commands.rs` that returns `http://127.0.0.1:{port}/api` so the frontend can discover the backend URL
- [X] T023 [US1] Create `frontend/src/lib/tauri-bridge.ts`: abstraction module that detects if running inside Tauri (`window.__TAURI_INTERNALS__`) and provides `getBackendUrl()` which calls `invoke('get_backend_url')` in Tauri mode or falls back to URL search params in browser/Electron mode
- [X] T024 [US1] Update `frontend/src/App.tsx` to use `tauri-bridge.getBackendUrl()` instead of reading `apiBaseUrl` from `window.location.search` query parameters. Ensure the refactored code still works in web/browser mode
- [ ] T025 [US1] Implement graceful shutdown in `src-tauri/src/sidecar.rs`: on app exit, send SIGTERM/kill to the sidecar process, wait up to 5 seconds, then force-kill if still running. Wire this into the Tauri `on_window_event` close handler and `RunEvent::Exit`
- [X] T026 [US1] Implement auto-restart logic in `src-tauri/src/sidecar.rs`: track crash count and timestamps. If the sidecar exits with non-zero code, auto-restart up to 3 times within a 60-second window. After 3 failures, emit an event to the frontend
- [ ] T027 [US1] Implement crash recovery dialog in `src-tauri/src/sidecar.rs`: when auto-restart limit is exceeded, use `tauri::api::dialog::MessageDialogBuilder` to show an error dialog with "Restart" and "Quit" buttons. "Restart" resets the retry counter and attempts again; "Quit" calls `app.exit(1)`
- [X] T028 [US1] Configure Windows NSIS installer in `src-tauri/tauri.conf.json`: set `bundle.targets` to `["nsis"]`, configure `nsis.installerIcon`, `nsis.oneClick: false`, `nsis.createDesktopShortcut: true`, `nsis.createStartMenuShortcut: true`
- [X] T029 [US1] Configure WebView2 bootstrapper in `src-tauri/tauri.conf.json`: set `bundle.windows.webviewInstallMode` to `{ "type": "downloadBootstrapper" }`
- [X] T030 [US1] Create `scripts/build-all.mjs` full build pipeline script: runs `npm run build --prefix frontend` → `node scripts/prepare-sidecar.mjs` → `cargo tauri build` and reports the output installer path and size
- [ ] T031 [US1] Run `cargo tauri build` and verify: installer is produced as `.exe` in `src-tauri/target/release/bundle/nsis/`, installer size is under 30 MB (excluding sidecar), app launches on a clean machine and shows the main UI

**Checkpoint**: The Tauri app installs on Windows, launches with backend services running, and the full UI is functional. This is the MVP gate.

---

## Phase 4: User Story 2 — Full Feature Parity with Electron Version (Priority: P1)

**Goal**: Every feature from the Electron version works identically in the Tauri version: threading, real-time updates, HTML rendering, attachments, categories, IMAP config, setup wizard.

**Independent Test**: Run through the complete feature checklist (IMAP connect → send test email → view thread → view HTML body → download attachment → delete thread → change IMAP config → setup wizard) inside the Tauri app with no browser open.

### Implementation for User Story 2

- [X] T032 [P] [US2] Audit `frontend/src/services/` for any `window.electronAPI.*` references. List all calls that need to be replaced with Tauri invoke equivalents. Create a migration checklist
- [X] T033 [US2] Update `frontend/src/lib/tauri-bridge.ts`: add `showNotification(title, body)` function that calls `sendNotification()` from `@tauri-apps/plugin-notification` in Tauri mode or falls back to browser `Notification` API
- [X] T034 [US2] Update `frontend/src/lib/tauri-bridge.ts`: add `isDesktopApp()` utility that returns `true` when running inside Tauri, `false` otherwise. Use this to conditionally show/hide desktop-specific UI elements
- [X] T035 [US2] Replace all identified `window.electronAPI.*` calls in `frontend/src/services/` and `frontend/src/components/` with equivalent calls from `frontend/src/lib/tauri-bridge.ts`
- [ ] T036 [US2] Verify attachment download flow works in Tauri: ensure the "Download" button triggers a save-file dialog via `@tauri-apps/plugin-dialog` or the browser's native download mechanism, and the file saves to the user's Downloads folder
- [ ] T037 [US2] Verify HTML email rendering works in the Tauri WebView: open an email with an HTML body, confirm it renders correctly inside the sandboxed iframe within WebView2
- [ ] T038 [US2] Verify WebSocket real-time updates work: confirm that `socket.io-client` connects to `http://127.0.0.1:{port}` and new emails appear in real-time without manual refresh
- [ ] T039 [US2] Verify the setup wizard flow works on first launch: when no IMAP configuration exists, the app should show the setup wizard, allow credential entry, test connection, and complete initial configuration
- [ ] T040 [US2] Run through the complete feature parity checklist: IMAP connect, send test email, view thread, view HTML body, download attachment, manage categories, delete thread, change IMAP config, setup wizard — all within the Tauri app

**Checkpoint**: 100% feature parity with the Electron version. All acceptance scenarios from User Story 2 pass.

---

## Phase 5: User Story 3 — Secure Local Credential Storage (Priority: P1)

**Goal**: IMAP passwords are stored securely using the OS-native credential store (Windows Credential Manager). No plaintext password appears on disk.

**Independent Test**: Save IMAP credentials, inspect all files in the app data directory and SQLite database — verify no plaintext password exists. Update password, verify old value is overwritten.

### Implementation for User Story 3

- [X] T041 [US3] Implement `get_credential` Tauri command in `src-tauri/src/commands.rs`: takes a `credential_key: String`, reads from OS keyring using the `keyring` crate with service name `com.mailsystem.tauri`, returns `Option<String>`
- [X] T042 [US3] Implement `set_credential` Tauri command in `src-tauri/src/commands.rs`: takes `credential_key: String` and `password: String`, writes to OS keyring using the `keyring` crate, returns the credential key (generates UUID if key is empty)
- [X] T043 [US3] Implement `delete_credential` Tauri command in `src-tauri/src/commands.rs`: takes a `credential_key: String`, removes the entry from OS keyring using the `keyring` crate
- [X] T044 [US3] Register all three credential commands in `src-tauri/src/lib.rs` via `tauri::generate_handler![get_credential, set_credential, delete_credential]`
- [X] T045 [US3] Update `frontend/src/lib/tauri-bridge.ts`: add `getCredential(key)`, `setCredential(key, password)`, `deleteCredential(key)` functions that call the Tauri commands via `invoke()`
- [X] T046 [US3] Modify `backend/src/credentials/credential.service.ts` to remove the Electron IPC bridge dependency. The backend no longer resolves credentials itself — the frontend retrieves credentials from the Rust keyring and passes them to the backend via the existing HTTP API when configuring IMAP
- [X] T047 [US3] Update the IMAP configuration flow in the frontend: when saving IMAP credentials, call `tauri-bridge.setCredential()` to store the password in OS keyring, then save only the `credential_key` (UUID reference) to the backend database via the existing API
- [X] T048 [US3] Update the IMAP connection flow in the frontend: when connecting, call `tauri-bridge.getCredential(key)` to retrieve the password from OS keyring, then pass it to the backend's IMAP connect endpoint
- [ ] T049 [US3] Verify: after saving credentials, inspect `%APPDATA%/com.mailsystem.tauri/` — confirm no plaintext password exists in the SQLite database or any file. Verify the credential appears in Windows Credential Manager
- [ ] T050 [US3] Verify: update the IMAP password, confirm the old value is overwritten in the OS keyring. Delete the IMAP profile, confirm the credential is removed from the OS keyring

**Checkpoint**: Credentials are stored exclusively in the OS-native keyring. No plaintext passwords on disk.

---

## Phase 6: User Story 4 — System Tray & Background Operation (Priority: P2)

**Goal**: When user closes the window, app minimizes to tray. IMAP monitoring continues. Tray icon with context menu. OS notifications on new email.

**Independent Test**: Close main window → verify tray icon → wait for email → verify notification → reopen from tray → verify email visible → "Quit" from tray → verify all processes end.

### Implementation for User Story 4

- [X] T051 [US4] Implement `src-tauri/src/tray.rs`: create system tray icon using `TrayIconBuilder::new()` with app icon, tooltip "Mail Catcher", context menu with "Open" and "Quit" items
- [X] T052 [US4] Wire tray menu actions in `src-tauri/src/tray.rs`: "Open" → show/focus main window, "Quit" → trigger graceful shutdown (stop sidecar, destroy tray, exit app)
- [X] T053 [US4] Register the tray in `src-tauri/src/lib.rs` `setup()` hook: create tray icon after app initialization
- [X] T054 [US4] Implement close-to-tray behavior in `src-tauri/src/lib.rs`: intercept `WindowEvent::CloseRequested`, check the `closeBehavior` preference. If "tray" → `event.prevent_close()` + `window.hide()`. If "quit" → trigger graceful shutdown
- [X] T055 [US4] Implement `get_close_behavior` and `set_close_behavior` Tauri commands in `src-tauri/src/commands.rs`: read/write `closeBehavior` preference ("tray" | "quit") using `tauri-plugin-store`
- [X] T056 [US4] Update `frontend/src/lib/tauri-bridge.ts`: add `getCloseBehavior()` and `setCloseBehavior(value)` functions
- [X] T057 [US4] Add a "Close button behavior" setting in the frontend settings page (or create a minimal settings panel if none exists): dropdown with "Minimize to tray" (default) and "Quit application" options. Persist via `tauri-bridge.setCloseBehavior()`
- [X] T058 [US4] Implement notification relay: when the frontend receives a new-email WebSocket event, call `tauri-bridge.showNotification(title, body)` which triggers `sendNotification()` from `@tauri-apps/plugin-notification`
- [X] T059 [US4] Implement `get_notifications_enabled` and `set_notifications_enabled` Tauri commands in `src-tauri/src/commands.rs`: read/write `notificationsEnabled` preference using `tauri-plugin-store`
- [X] T060 [US4] Update notification trigger logic in frontend to check `notificationsEnabled` preference before sending notifications
- [ ] T061 [US4] Verify: close window → tray icon appears → backend still running → send test email → OS notification appears → click tray "Open" → window reappears → click tray "Quit" → all processes end within 10 seconds
- [ ] T062 [US4] Verify: change close-button setting to "quit app" → close window → app and all services terminate (no tray icon remains)

**Checkpoint**: System tray, background operation, configurable close behavior, and notifications all work correctly.

---

## Phase 7: User Story 5 — macOS & Linux Support (Priority: P3)

**Goal**: Install and run on macOS 13+ and Ubuntu 22.04 LTS with identical functionality.

**Independent Test**: Install on macOS and Ubuntu, run through full P1 scenario on each platform.

### Implementation for User Story 5

- [ ] T063 [US5] Create macOS sidecar binary: adapt `scripts/prepare-sidecar.mjs` to support `aarch64-apple-darwin` and `x86_64-apple-darwin` target triples
- [ ] T064 [US5] Configure `src-tauri/tauri.conf.json` macOS bundle settings: `bundle.targets` includes `["dmg"]`, set `macOS.minimumSystemVersion: "13.0"`
- [ ] T065 [US5] Verify macOS-specific behavior: Cmd+Q quits the app, Dock icon behavior, macOS Notification Center integration
- [ ] T066 [US5] Create Linux sidecar binary: adapt `scripts/prepare-sidecar.mjs` to support `x86_64-unknown-linux-gnu` target triple
- [ ] T067 [US5] Configure `src-tauri/tauri.conf.json` Linux bundle settings: `bundle.targets` includes `["appimage", "deb"]`, verify no root privileges needed for AppImage
- [ ] T068 [US5] Verify Linux-specific behavior: system tray via `libayatana-appindicator`, notifications via desktop notification protocol, AppImage runs without sudo
- [ ] T069 [US5] Update `src-tauri/src/commands.rs` credential commands: verify `keyring` crate works with macOS Keychain and Linux `libsecret`/`kwallet`
- [ ] T070 [US5] Run full feature parity checklist on macOS 13+ and Ubuntu 22.04 LTS

**Checkpoint**: App works on all three platforms with identical functionality.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and quality improvements

- [ ] T071 [P] Update `README.md` in project root: add Tauri build instructions, prerequisites (Rust toolchain), development workflow (`cargo tauri dev`), and production build commands
- [ ] T072 [P] Archive the `electron/` directory: move to `electron.archived/` or remove entirely, update `.gitignore` if needed
- [ ] T073 [P] Update `docker-compose.yml` comments: clarify this is for web/Docker users only; desktop users use the Tauri installer
- [ ] T074 Measure and document performance metrics: installer size (target <30 MB), startup time (target <5s), idle memory usage (target 50% less than Electron)
- [ ] T075 Run final validation on a clean Windows 10/11 machine: full install → first email → all features → uninstall. Verify zero orphan processes after close
- [ ] T076 Verify HiDPI display rendering at 100%, 125%, 150%, and 200% scaling on Windows
- [X] T077 [P] Clean up any remaining `window.electronAPI` references in the codebase using a grep search

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) — MVP gate
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs sidecar running)
- **User Story 3 (Phase 5)**: Can start after Phase 2 (independent of US1/US2 for Rust commands); frontend integration depends on Phase 3
- **User Story 4 (Phase 6)**: Depends on Phase 3 (needs window + sidecar running)
- **User Story 5 (Phase 7)**: Depends on Phases 3-6 being stable on Windows first
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational: SEA binary)
    │
    ▼
Phase 3 (US1: Install & Launch) ← MVP GATE
    │
    ├──► Phase 4 (US2: Feature Parity) ──┐
    │                                      │
    ├──► Phase 5 (US3: Credentials) ──────┤
    │                                      │
    └──► Phase 6 (US4: Tray & Notifs) ────┤
                                           │
                                           ▼
                                    Phase 7 (US5: macOS/Linux)
                                           │
                                           ▼
                                    Phase 8 (Polish)
```

### Within Each User Story

- Rust commands before frontend integration
- Sidecar management before window behavior
- Core implementation before integration verification

### Parallel Opportunities

- **Phase 1**: T004, T005, T007 can all run in parallel
- **Phase 3**: T016-T019 (sidecar core) must be sequential; T028-T029 (installer config) can run in parallel with sidecar work
- **Phase 4-6**: After Phase 3, US2/US3/US4 can be worked on in parallel by different developers
- **Phase 5**: T041, T042, T043 (Rust commands) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Stream 1: Sidecar management (sequential)
T016 → T017 → T018 → T019 → T020 → T021

# Stream 2: Frontend bridge (parallel with Stream 1 after T022)
T022 → T023 → T024

# Stream 3: Installer config (parallel with Streams 1 & 2)
T028 + T029 (parallel)

# Stream 4: Safety & recovery (after Stream 1)
T025 → T026 → T027

# Final: Build & verify
T030 → T031
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T009)
2. Complete Phase 2: Foundational (T010–T015)
3. Complete Phase 3: User Story 1 (T016–T031)
4. **STOP and VALIDATE**: Test on a clean Windows machine
5. If installer size <30 MB and startup <5s → MVP achieved

### Incremental Delivery

1. Setup + Foundational → Tauri skeleton + backend sidecar ready
2. Add User Story 1 → Install & launch works → **MVP!**
3. Add User Story 2 → 100% feature parity verified
4. Add User Story 3 → Credentials secure in OS keyring
5. Add User Story 4 → Tray, background mode, notifications
6. Add User Story 5 → macOS/Linux support
7. Polish → Archive Electron, update docs

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The backend NestJS codebase remains largely unchanged — migration is focused on the desktop shell layer
