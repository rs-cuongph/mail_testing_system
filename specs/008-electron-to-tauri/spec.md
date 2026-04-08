# Feature Specification: Electron to Tauri Migration

**Feature Branch**: `008-electron-to-tauri`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "tôi muốn migration hệ thống electron hiện tại sang tauri"

## Clarifications

### Session 2026-04-08

- Q: How should the NestJS backend process be managed within the Tauri shell — as a sidecar binary, a raw child process, or rewritten in Rust? → A: Sidecar binary — bundle the NestJS backend as a standalone executable managed via Tauri's built-in sidecar API with automatic lifecycle management.
- Q: When the NestJS backend process crashes, should recovery be automatic or manual? → A: Auto-restart with limit — automatically restart the backend up to 3 times within 60 seconds. If still failing after 3 retries, show an error dialog with manual "Restart" or "Quit" options.
- Q: Can the Electron version and Tauri version coexist on the same machine, and should they share data? → A: Separate data directories — each version has its own data directory. Both can be installed simultaneously without conflict. No data sharing between them.
- Q: How should the installer handle Windows machines where WebView2 is not installed? → A: Embed the WebView2 bootstrapper (~1.8 MB) in the installer. It auto-downloads and installs WebView2 if missing during app installation.
- Q: Should the window close button (X) always minimize to tray, or should this be configurable? → A: Minimize to tray by default, configurable — a setting allows the user to change the close button behavior to "quit app" instead.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories are prioritized as user journeys ordered by importance.
  Each story is independently testable and delivers standalone value.
-->

### User Story 1 — Lightweight Install & Launch on Windows (Priority: P1)

A tester downloads a single `.msi` or `.exe` installer that is dramatically smaller than the previous Electron-based package (target under 30 MB vs the previous ~300 MB). After installation, double-clicking the app shortcut launches the Mail Testing System within seconds. The application window renders the existing React frontend identically to the Electron version. The bundled backend services start silently in the background, and the user can immediately configure IMAP or view their inbox — all without installing any prerequisites.

**Why this priority**: This is the MVP gate. The core promise of moving to Tauri is a smaller, faster, native-feeling desktop experience. Until a Windows user gets from "download" to "first email received" with a noticeably smaller installer and faster startup, the migration has no value.

**Independent Test**: Download the installer on a clean Windows 10/11 machine. Verify the installer is under 30 MB. Time the install-to-first-screen. Compare startup speed against the Electron version. Confirm emails arrive and display correctly.

**Acceptance Scenarios**:

1. **Given** a clean Windows 10/11 (64-bit) machine with no dev tools, **When** the user runs the installer, **Then** the application installs and shows the main UI within 60 seconds.
2. **Given** the Tauri app is installed, **When** the user configures IMAP credentials and saves, **Then** the backend begins polling/idling for emails without any additional steps.
3. **Given** the app is running and emails are arriving, **When** the user closes the app window, **Then** all background processes terminate gracefully within 10 seconds with zero orphan processes.
4. **Given** the user relaunches the app after closing, **When** the app opens, **Then** all previous settings, email data, and threads are intact.
5. **Given** both the Electron installer and the Tauri installer exist, **When** comparing file sizes, **Then** the Tauri installer is at least 80% smaller than the Electron installer.

---

### User Story 2 — Full Feature Parity with Electron Version (Priority: P1)

A developer who used the Mail Testing System with the Electron shell switches to the Tauri version. Every feature works identically: tag-based email threading, real-time email arrival via WebSocket, HTML/plain-text email rendering, attachment downloads, category management, thread deletion, IMAP configuration, and setup wizard. The user experiences zero feature regression.

**Why this priority**: Equal to P1. A smaller binary is meaningless if features are missing.

**Independent Test**: Run through the complete feature checklist (IMAP connect → send test email → view thread → view HTML body → download attachment → delete thread → change IMAP config → setup wizard) inside the Tauri app with no browser or terminal open.

**Acceptance Scenarios**:

1. **Given** the Tauri app is running, **When** a new email arrives, **Then** it appears in the thread list in real-time with equal or better latency than the Electron version.
2. **Given** an email with an HTML body, **When** the user views it, **Then** it renders correctly inside a sandboxed view identical to the Electron experience.
3. **Given** an email with an attachment, **When** the user clicks "Download", **Then** the attachment saves to the user's Downloads folder via a native file dialog.
4. **Given** the app is open, **When** the user updates IMAP configuration, **Then** the system reconnects without requiring an app restart.
5. **Given** no IMAP configuration exists on first launch, **When** the app opens, **Then** a setup wizard guides the user through credential entry, connection testing, and initial configuration.

---

### User Story 3 — Secure Local Credential Storage (Priority: P1)

A security-conscious user stores their IMAP password through the app. The password is encrypted using the OS-native credential store and is never written to disk in plaintext. The user can update or remove stored credentials at any time through the settings screen.

**Why this priority**: Credential security is a non-negotiable requirement that was already present in the Electron version and must be maintained in the Tauri migration.

**Independent Test**: Save IMAP credentials. Inspect the local database file and all Config/AppData files — verify no plaintext password exists anywhere on disk. Update the password, verify the old value is overwritten.

**Acceptance Scenarios**:

1. **Given** the user saves IMAP credentials, **When** inspecting all files in the application's data directory, **Then** no plaintext password is found.
2. **Given** the user changes their IMAP password in settings, **When** the new password is saved, **Then** the old password is securely overwritten in the OS credential store.
3. **Given** the user deletes their IMAP profile, **When** the profile is removed, **Then** the associated credential is also removed from the OS credential store.

---

### User Story 4 — System Tray & Background Operation (Priority: P2)

When the user closes the main window, the app minimizes to the system tray instead of quitting. IMAP monitoring continues in the background. A tray icon with a context menu allows the user to re-open the window or fully quit. OS notifications appear when new emails arrive.

**Why this priority**: Background operation and notifications ensure continuous email monitoring, which is the core value of the app for testers.

**Independent Test**: Close the main window. Verify the tray icon appears. Wait for a new email to arrive. Verify an OS notification appears. Click the tray icon to re-open the window. Verify the new email is visible. Select "Quit" from the tray menu and verify all processes end.

**Acceptance Scenarios**:

1. **Given** the app is running with default settings, **When** the user clicks the window close button (X), **Then** the window hides and a tray icon appears — backend services continue running.
2. **Given** the app is minimized to tray, **When** a new email arrives, **Then** an OS notification displays the sender and subject.
3. **Given** a tray icon is visible, **When** the user right-clicks it, **Then** a context menu shows "Open" and "Quit" options at minimum.
4. **Given** the user selects "Quit" from the tray menu, **When** the app shuts down, **Then** all background services stop within 10 seconds with no orphan processes.
5. **Given** the user has changed the close-button setting to "quit app", **When** the user clicks the window close button (X), **Then** the app and all background services terminate fully instead of minimizing to tray.

---

### User Story 5 — macOS & Linux Support (Priority: P3)

Developers on macOS and Linux can install and use the Mail Testing System with identical functionality. macOS users get a `.dmg`, Linux users get an AppImage or `.deb`. Platform-specific behaviors (Cmd+Q on macOS, no-sudo AppImage on Linux) are handled correctly.

**Why this priority**: Cross-platform support leverages Tauri's native advantage over Electron but is not required for the Windows-first MVP.

**Independent Test**: Install on macOS 13+ and Ubuntu 22.04 LTS. Run through the full P1 scenario on each platform.

**Acceptance Scenarios**:

1. **Given** a macOS machine, **When** the user installs and opens the `.dmg`, **Then** the app launches and all features work identically to Windows.
2. **Given** an Ubuntu 22.04 machine, **When** the user runs the AppImage, **Then** the app launches without root privileges and all features work.
3. **Given** the app is running on macOS, **When** the user presses Cmd+Q, **Then** the app and all services quit cleanly.

---

### Edge Cases

- What happens if the default internal port (used by the bundled backend) is already occupied by another app?
- How does the system handle a corrupted local SQLite database (e.g., power loss during write)?
- What happens when the WebView runtime (WebView2 on Windows) is not installed? → The installer embeds the WebView2 bootstrapper (~1.8 MB) which auto-downloads and installs WebView2 if missing. Internet connection is required during initial installation only.
- How does the system behave when the machine has no internet connection (IMAP unreachable)?
- What happens if the application's data directory is on a read-only filesystem or has insufficient permissions?
- How does the app handle display scaling at 150% and 200% (HiDPI)?
- What happens if a user has both the Electron version and the Tauri version installed simultaneously? → Each version uses a separate data directory; both can coexist without conflict. No data is shared between them.
- How does the system handle Tauri's IPC communication failure between frontend and backend?
- What happens if the NestJS child process crashes during runtime — does the app detect and attempt recovery?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace the current Electron shell with a Tauri shell while preserving the existing React frontend and NestJS backend architecture.
- **FR-002**: The system MUST produce a single distributable installer per platform (`.msi`/`.exe` for Windows, `.dmg` for macOS, AppImage/`.deb` for Linux) that is at least 80% smaller than the equivalent Electron installer.
- **FR-003**: The system MUST bundle the NestJS backend with its runtime so users do not need to install any prerequisites.
- **FR-004**: The system MUST render the existing React frontend inside Tauri's native WebView (WebView2 on Windows, WebKit on macOS/Linux) without requiring a bundled browser engine.
- **FR-005**: The system MUST automatically start all backend services (API server, SQLite database) when the application window opens.
- **FR-006**: The system MUST implement Tauri IPC commands to bridge communication between the frontend (WebView) and the native Rust backend layer for operations such as credential storage, file system access, and process management.
- **FR-007**: The system MUST persist all user data (email threads, settings, categories, attachments) between sessions in a platform-appropriate local data directory.
- **FR-008**: The system MUST handle internal port conflicts by automatically selecting an available port for the NestJS backend.
- **FR-009**: By default, when the user clicks the window close button (X), the system MUST minimize to the OS system tray — IMAP monitoring and backend services MUST continue running. The system MUST provide a setting in the app preferences to change this behavior so the close button fully quits the app instead. The system MUST stop all services only when the user selects "Quit" from the tray context menu or when the close-button setting is set to "quit."
- **FR-010**: The system MUST store IMAP credentials using the OS-native secure credential store. The password MUST NOT be written to disk in plaintext at any point.
- **FR-011**: The system MUST display OS desktop notifications when a new email arrives, showing sender and subject. A settings toggle MUST allow the user to disable notifications.
- **FR-012**: The system MUST provide a "Test Connection" function during IMAP setup that validates credentials and reports success or failure in plain language.
- **FR-013**: All features available in the Electron version MUST be available in the Tauri version with identical functionality, including: tag-based threading, real-time email updates, HTML rendering, attachment downloads, category management, thread deletion, IMAP configuration, and first-time setup wizard.
- **FR-014**: The system MUST support high-DPI displays on all supported platforms.
- **FR-015**: The system MUST detect if the backend sidecar process crashes and automatically attempt to restart it up to 3 times within a 60-second window. If the backend fails to recover after 3 retries, the system MUST display a user-friendly error dialog with "Restart" and "Quit" options.
- **FR-016**: The Windows installer MUST create Start Menu and Desktop shortcuts and register an uninstaller accessible from Windows Settings → Apps.
- **FR-017**: The Windows installer MUST embed the WebView2 bootstrapper. If WebView2 is not present on the user's machine, the installer MUST automatically download and install it during the installation process.

### Key Entities

- **Tauri Application Shell**: The native desktop container replacing Electron. Uses the OS-native WebView instead of bundling Chromium, resulting in dramatically smaller application size.
- **IPC Command Layer**: The Tauri command interface that bridges the React frontend in the WebView with the native Rust layer for secure operations (credential storage, file access, process management).
- **Managed Backend Process (Sidecar)**: The NestJS backend bundled as a standalone executable and managed via Tauri's built-in sidecar API. Lifecycle (start, health check, restart, shutdown) is handled automatically by the sidecar management layer — no custom child process spawning code required.
- **User Data Directory**: Platform-specific local directory for database, configuration, and attachments. Isolated per OS user account.
- **IMAP Credential Store**: OS-native secure credential storage (Windows Credential Manager / macOS Keychain / Linux libsecret) accessed through Tauri's Rust layer.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Windows installer file size is under 30 MB (compared to ~300 MB for the Electron version).
- **SC-002**: The application is fully ready to use (main UI visible and responsive) within 5 seconds of the user clicking the shortcut, compared to 15 seconds for the Electron version.
- **SC-003**: A non-technical user can download, install, and receive their first test email on Windows in under 5 minutes.
- **SC-004**: All existing features pass 100% of their acceptance scenarios when tested exclusively through the Tauri app, achieving zero feature regression from the Electron version.
- **SC-005**: Closing the application on any platform results in zero orphan processes after 10 seconds.
- **SC-006**: Application memory usage at idle is at least 50% lower compared to the Electron version.
- **SC-007**: The app renders correctly at 100%, 125%, 150%, and 200% display scaling on all platforms.

---

## Assumptions

- **Architecture approach**: The existing React (Vite) frontend will be loaded inside Tauri's native WebView — no frontend rewrite is required. The NestJS backend runs as a **sidecar binary** managed via Tauri's built-in sidecar API, providing automatic process lifecycle management.
- **Database engine**: SQLite remains the embedded database (as established in spec 007). No database migration from the Electron version is needed — both use the same SQLite format.
- **Backend runtime**: The NestJS backend will be bundled as a standalone executable (via `pkg`, `nexe`, or `sea` — single executable application). The Tauri app manages this as a sidecar binary using Tauri's native sidecar API.
- **WebView dependency**: On Windows, WebView2 (Edge-based) is assumed to be present on most Windows 10/11 systems. The installer embeds the WebView2 bootstrapper (~1.8 MB) to auto-download and install WebView2 if missing. Internet connection is required during initial installation if WebView2 is absent.
- **Rust layer**: The Tauri migration introduces a Rust-based main process. Basic Rust compilation toolchain is required only for development/build, not for end users.
- **Data compatibility**: The Electron and Tauri versions use **separate data directories**. Both can be installed on the same machine simultaneously without conflict. No data sharing or migration between versions is supported — the Tauri version always starts with a fresh database.
- **Electron removal**: The `electron/` directory and all Electron-specific code will be removed or archived after the Tauri migration is validated and stable.
- **MVP scope**: Windows 10/11 (64-bit) is the only required platform for the initial release. macOS and Linux follow as subsequent iterations.
- **Code signing**: Code signing is out of scope for the initial MVP. Users may see "Unknown Publisher" warnings.
- **Auto-update**: In-app auto-update is out of scope for v1, consistent with the Electron version's approach.
- **Existing spec relationship**: This spec (008) supersedes spec 007 (`007-desktop-app-migration`) by replacing the Electron approach with Tauri while maintaining the same functional requirements and user stories.
