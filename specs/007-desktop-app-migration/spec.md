# Feature Specification: Desktop App Migration (Windows, macOS, Linux)

**Feature Branch**: `007-desktop-app-migration`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "migrate sang phiên bản Desktop APP dành cho window, macos, linux. MVP là window first"

---

## Clarifications

### Session 2026-04-08

- Q: Which desktop shell framework should be used to wrap the existing NestJS + React stack? → A: Electron — Node.js-based shell that natively integrates with the existing stack; backend runs as a managed Node child process inside the Electron main process.
- Q: How should IMAP credentials (specifically the password) be stored locally? → A: OS Keychain / Credential Store via Electron `safeStorage` API — Windows Credential Manager, macOS Keychain, Linux libsecret. IMAP password is never written to disk in plaintext.
- Q: When the user clicks the window close button (X), what should happen? → A: Minimize to system tray — the app window hides but IMAP monitoring continues running. A tray icon with context menu allows the user to re-open the window or fully quit.
- Q: Can existing Docker users migrate their email data into the desktop app? → A: No — the desktop app always starts with a fresh empty database. No import from PostgreSQL/Docker is supported. Users re-configure IMAP and receive new emails going forward.
- Q: Should the app send OS desktop notifications when a new email is received? → A: Yes — OS notifications are enabled by default (sender + subject shown). A clearly visible toggle in app settings allows the user to disable notifications entirely.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories are prioritized as user journeys ordered by importance.
  Each story is independently testable and delivers standalone value.
-->

### User Story 1 — Install & Launch on Windows (Priority: P1)

A tester on the team downloads a single `.exe` installer, double-clicks it, and in under 3 minutes has a fully working Mail Testing System open on their screen. There is no prerequisite installation of Node.js, Docker, PostgreSQL, or any other tool. The app window opens directly, backend services are running invisibly, and the user immediately sees the IMAP configuration screen if it's their first time, or their thread inbox if they've used it before.

**Why this priority**: This is the MVP gate. Until any Windows user can get from "download file" to "receiving emails" without developer help, nothing else matters.

**Independent Test**: Install on a clean Windows 10/11 machine that has never had Node.js, Docker, or PostgreSQL installed. Verify the app opens, connects to an IMAP server, and displays an incoming email — all within 5 minutes of download.

**Acceptance Scenarios**:

1. **Given** a clean Windows 10/11 (64-bit) machine with no dev tools, **When** the user runs the installer `.exe`, **Then** the application installs and auto-launches within 3 minutes, showing the main UI.
2. **Given** the app is installed, **When** the user configures IMAP credentials and saves, **Then** the system begins polling/idling for emails without any additional steps.
3. **Given** the app is running and emails are arriving, **When** the user closes the app window, **Then** all background processes (API server, database) terminate within 10 seconds and no orphan processes remain.
4. **Given** the app was previously configured and closed, **When** the user relaunches it from the Start Menu or Desktop shortcut, **Then** all previous settings and email data are exactly as they left them.

---

### User Story 2 — Full Feature Parity with Web Version (Priority: P1)

A developer who previously used the system via `docker compose up` switches to the desktop app. Every feature they relied on — tag-based threading, real-time email arrival via WebSocket, HTML/plain-text rendering, attachment downloads, category management, thread deletion, and IMAP configuration — works identically in the desktop version. They don't have to refer to documentation or adapt their workflow.

**Why this priority**: Equal to P1. Installation without complete functionality is worthless.

**Independent Test**: Run through the complete existing feature checklist (IMAP connect → send test email → view thread → view HTML body → download attachment → delete thread → change IMAP config) purely inside the desktop app with no browser or terminal open.

**Acceptance Scenarios**:

1. **Given** the desktop app is running, **When** a new email arrives to the configured IMAP inbox, **Then** it appears in the thread list in real-time (within the same latency as the web version).
2. **Given** an email with an HTML body, **When** the user views it in the app, **Then** it renders correctly inside a sandboxed view identical to the web experience.
3. **Given** an email with an attachment, **When** the user clicks "Download", **Then** the attachment saves to the user's Downloads folder.
4. **Given** the app is open, **When** the user updates IMAP configuration, **Then** the system reconnects to the new server without requiring an app restart.
5. **Given** the user has existing email threads, **When** they delete a thread or clear all data, **Then** the data is permanently removed and the UI updates immediately.

---

### User Story 3 — First-Time Setup Experience (Priority: P2)

A first-time user opens the desktop app with no prior configuration. Instead of a blank screen or an error, they are greeted by a guided setup screen where they enter their IMAP credentials. The system validates the connection in real time (or gives a clear error if it fails) and then transitions smoothly into the main inbox view. The entire onboarding takes under 2 minutes.

**Why this priority**: Critical for non-technical users, but comes after core functionality is working.

**Independent Test**: Open the app with no config present. Complete the IMAP setup form with valid credentials, verify the connection test feedback, and reach the inbox view — all without consulting external documentation.

**Acceptance Scenarios**:

1. **Given** no IMAP configuration exists, **When** the app launches, **Then** a setup/configuration screen is shown instead of a blank or broken inbox.
2. **Given** the user fills in IMAP credentials and clicks "Test Connection", **When** the credentials are valid, **Then** a success status is shown within 5 seconds.
3. **Given** the user fills in invalid credentials and clicks "Test Connection", **When** connection fails, **Then** a human-readable error message is shown (not a raw stack trace).
4. **Given** setup is complete, **When** the user saves, **Then** the app transitions to the inbox and begins receiving emails.

---

### User Story 4 — macOS Support (Priority: P2)

A developer on macOS can download a `.dmg` installer, drag the app to their Applications folder, and use the Mail Testing System identically to the Windows experience. The app looks and behaves like a native macOS application — it has a proper app icon in the Dock, responds to macOS keyboard shortcuts, and obeys the macOS window lifecycle (Cmd+Q to quit, etc.).

**Why this priority**: Second platform after the Windows MVP is validated. macOS is common among developers who would use this tool.

**Independent Test**: Install the `.dmg` on macOS 13 (Ventura) or later on Apple Silicon or Intel. Complete the same P1 scenario end-to-end as the Windows test.

**Acceptance Scenarios**:

1. **Given** a macOS machine, **When** the user opens the `.dmg` and drags the app to Applications, **Then** the app launches and works fully.
2. **Given** the app is running on macOS, **When** the user presses Cmd+Q or closes the last window, **Then** the app and all background services quit cleanly.
3. **Given** macOS Gatekeeper is active, **When** the user opens the app for the first time, **Then** macOS does not block it outright (app is notarized or user-override is documented).

---

### User Story 5 — Linux Support (Priority: P3)

A DevOps engineer on Ubuntu or Fedora installs the Mail Testing System via an AppImage or `.deb` package. The app works identically to the Windows and macOS versions. Installation requires no sudo access (AppImage path) if the user chooses that format.

**Why this priority**: Linux support rounds out the platform story but is least likely to be the primary use case.

**Independent Test**: Install an AppImage on Ubuntu 22.04 LTS without sudo and run through the full P1 scenario.

**Acceptance Scenarios**:

1. **Given** an Ubuntu 22.04 LTS machine, **When** the user runs the AppImage, **Then** the app launches and all features work correctly.
2. **Given** a Fedora 39+ machine, **When** the user installs the `.rpm` or uses the AppImage, **Then** the app launches and works correctly.

---

### Edge Cases

- What happens if the default internal port (used by the bundled backend) is already occupied by another app on the user's machine?
- How does the system handle a corrupted local database (e.g., power loss during write)?
- What happens if the user tries to install a second instance of the same app on the same machine?
- How does the system behave when the machine has no internet connection (IMAP unreachable)?
- What happens if antivirus or OS security software blocks the embedded server from binding to a port?
- What happens if the user's AppData / home directory has insufficient disk space for the local database?
- How does the app behave when the user's OS display scale is set to 150% or 200% (HiDPI)?
- What happens if the OS system tray is unavailable or full (e.g., no tray support on some Linux desktop environments)?
- What happens if a user expects to see historical emails from the Docker version after switching to the desktop app? (Documented: not supported — fresh database only.)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST bundle together the frontend UI, backend API server, and local database engine into a single distributable installer per platform (`.exe` for Windows, `.dmg`/`.pkg` for macOS, AppImage/`.deb`/`.rpm` for Linux).
- **FR-002**: The system MUST embed all required runtime dependencies (JavaScript runtime, database engine) so users do not need to install them separately.
- **FR-003**: The system MUST present the application UI inside a native desktop window — users do NOT need to open a browser to use the app.
- **FR-004**: The system MUST automatically start all backend services (API server, local database) when the application window opens.
- **FR-005**: When the user clicks the window close button (X), the system MUST hide the main window and minimize to the OS system tray — the IMAP worker and backend services continue running uninterrupted. The system MUST stop all background services gracefully only when the user selects "Quit" from the tray context menu (or equivalent platform quit action).
- **FR-006**: The system MUST persist all user data (email threads, settings, categories, attachments) between sessions in a platform-appropriate local data directory (e.g., AppData on Windows, Application Support on macOS, `~/.config` or `~/.local/share` on Linux).
- **FR-007**: The system MUST handle internal port conflicts by automatically selecting an available port; the user should never see a "port already in use" error.
- **FR-008**: The system MUST display a first-time setup screen when no IMAP configuration is found, guiding the user through initial configuration.
- **FR-009**: The system MUST provide a "Test Connection" function during IMAP configuration that validates credentials and reports success or failure in plain language.
- **FR-010**: The Windows installer MUST create Start Menu and Desktop shortcuts and register an uninstaller accessible from Windows Settings → Apps.
- **FR-011**: The macOS app MUST be packaged as a standard macOS app bundle and distributed as a `.dmg`.
- **FR-012**: The Linux package MUST be available as at minimum an AppImage that runs without root privileges.
- **FR-013**: All features available in the web/Docker version MUST be available in the desktop app with identical functionality (see User Story 2).
- **FR-014**: The application MUST support high-DPI displays on all platforms (no blurry UI at 150% or 200% scale).
- **FR-015**: The user MUST be able to access IMAP settings at any time from within the running app, not just at initial setup.
- **FR-016**: The system MUST store IMAP credentials (password) using the OS-native secure credential store (Windows Credential Manager / macOS Keychain / Linux libsecret). The password MUST NOT be written to disk in plaintext at any point.
- **FR-017**: The system MUST display a persistent tray icon when the window is hidden. The tray icon context menu MUST include at minimum: "Open" (restore window) and "Quit" (terminate all services and exit). The tray icon MUST update its badge/tooltip to show the count of new unread emails received since the window was last opened.
- **FR-018**: The system MUST send an OS desktop notification (Windows Action Center / macOS Notification Center / Linux notify-osd) whenever a new email arrives. Each notification MUST display at minimum the sender and email subject. The system MUST provide a clearly visible toggle in the app settings to disable notifications. Notifications MUST be enabled by default.

### Key Entities

- **Application Bundle**: The platform-specific distributable file containing all components — UI renderer, backend API, embedded database, and runtime. Estimated 150–300 MB per platform.
- **User Data Directory**: A per-platform local directory where the application stores its database, configuration, and attachments between sessions. Isolated per OS user account.
- **Managed Process Tree**: The set of processes coordinated by the desktop shell: the main window process, the backend API server process, and the embedded database process.
- **IMAP Profile Configuration**: Persistent settings describing the IMAP connection (host, port, TLS mode, polling interval, username). Non-sensitive fields stored in User Data Directory config file. Password stored exclusively in the OS-native secure credential store — never written to disk in plaintext.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A non-technical user can download, install, and receive their first test email on Windows in under 5 minutes, without consulting documentation.
- **SC-002**: The Windows installer file size is under 300 MB.
- **SC-003**: The application (including backend services) is fully ready to use within 15 seconds of the user clicking the app shortcut.
- **SC-004**: All existing features (email threading, real-time updates, HTML rendering, attachment download, category management, data purge, IMAP config) pass 100% of their existing acceptance scenarios when tested exclusively through the desktop app.
- **SC-005**: Closing the application on any platform results in zero orphan processes after 10 seconds.
- **SC-006**: The app installation can be completed successfully on at least 3 physically separate Windows machines by a non-developer without assistance.
- **SC-007**: The macOS app passes macOS Gatekeeper (either notarized or with documented one-time override instructions).
- **SC-008**: The HiDPI / display scaling renders crisply at 100%, 125%, 150%, and 200% on all platforms.

---

## Assumptions

- **MVP Scope**: Windows 10/11 (64-bit) is the only required platform for the initial release. macOS and Linux are planned follow-on releases in the same feature cycle.
- **Architecture approach**: **Electron** is the chosen desktop shell. The existing React frontend renders in Electron's Chromium-based renderer process. The NestJS backend runs as a managed child process spawned by the Electron main process. No frontend rewrite is required.
- **Database engine**: The embedded database is **SQLite**, replacing PostgreSQL from the Docker version. SQLite is bundled with the app — no database server installation required. The desktop app always starts with a fresh local database; no data migration from the Docker/PostgreSQL version is supported or offered.
- **Backend runtime**: The NestJS backend will be bundled with its Node.js runtime. No separate Node.js installation is required on the user's machine.
- **Data isolation**: The desktop app stores all data locally; there is no cloud sync or remote database. Each machine has its own independent data store.
- **Internet requirement**: Internet connectivity is required only for IMAP email retrieval. The application itself functions offline (for browsing existing emails, managing threads, etc.).
- **Code signing**: Code signing certificates are out of scope for the initial Windows MVP (users may see "Unknown Publisher" SmartScreen warning). A documentation note will be included.
- **Auto-update**: In-app auto-update is out of scope for v1. Users update by downloading and running a new installer.
- **Multi-IMAP profiles**: Multi-profile management (spec 006) is treated as a parallel feature. The desktop app may ship initially with single-profile support and add multi-profile in a subsequent iteration.
- **Spec 005 replacement**: This spec supersedes spec 005 (`005-desktop-app-packaging`) with a broader cross-platform scope and more detailed functional requirements. Implementation should start fresh from this spec.
- **Minimum hardware**: The user's machine has at least 4 GB RAM and 500 MB free disk space.
