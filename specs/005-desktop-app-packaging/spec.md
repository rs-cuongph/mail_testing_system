# Feature Specification: Desktop App Packaging

**Feature Branch**: `005-desktop-app-packaging`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "Chuyển đổi và đóng gói thành ứng dụng desktop có thể chia sẻ cho người khác sử dụng, trước mắt là Windows"

## Clarifications

### Session 2026-04-06

- Q: Khi có nhiều IMAP settings, chúng hoạt động đồng thời hay switch? → A: Switch đơn lẻ — chỉ 1 IMAP active tại một thời điểm, user chọn profile trước khi vào. Dữ liệu từng profile lưu riêng biệt.
- Q: Tách biệt dữ liệu per-profile như thế nào? → A: Cùng 1 database, thêm `profileId` vào các bảng để phân biệt.
- Q: Profile Selection UI flow? → A: Auto-connect profile cuối cùng đã dùng, có nút switch ở sidebar/header để đổi.
- Q: Multi-IMAP và Desktop Packaging tách riêng hay gộp? → A: Tách riêng — Multi-IMAP profile implement trước trên web/Docker, Desktop packaging implement sau.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Click Windows Installation (Priority: P1)

A user receives the Mail Testing System installer (`.exe`) from a colleague. They double-click the installer, follow a simple wizard (accept license → choose install location → finish), and the application launches automatically. All backend services (API server, database) start behind the scenes without the user needing to know about Docker, Node.js, or PostgreSQL.

**Why this priority**: This is the core value proposition — making the system accessible to non-technical users who just want to test emails without setting up a development environment.

**Independent Test**: Can be fully tested by running the installer on a clean Windows 10/11 machine and verifying the application opens with the Setup page ready for IMAP configuration.

**Acceptance Scenarios**:

1. **Given** a clean Windows 10/11 machine with no prior dependencies, **When** the user runs the installer, **Then** the application installs and launches within 3 minutes showing the configuration page.
2. **Given** the application is installed, **When** the user restarts their computer, **Then** the application can be launched from the Start Menu or Desktop shortcut without re-installation.
3. **Given** the application is installed, **When** the user opens it, **Then** all backend services (database, API) start automatically without manual intervention.

---

### User Story 2 - Full Application Lifecycle (Priority: P1)

After installation, the user can start, stop, and fully use the application just like any other Windows program. They configure IMAP settings, receive emails, browse threads, and manage categories — all through the familiar UI served in the embedded application window. When they close the window, background services shut down cleanly.

**Why this priority**: Equal to P1 because the application must actually work end-to-end after installation, not just install.

**Independent Test**: Can be tested by completing a full workflow: launch → configure IMAP → receive a test email → view the email in the thread list → close the application → verify no orphan processes remain.

**Acceptance Scenarios**:

1. **Given** the application is launched, **When** the user configures IMAP settings and saves, **Then** the system connects to the IMAP server and begins receiving emails.
2. **Given** the application is running, **When** the user closes the application window, **Then** all background services (API server, database) shut down gracefully within 10 seconds.
3. **Given** the application was previously configured, **When** the user relaunches it, **Then** all previous settings and email data are preserved.

---

### User Story 3 - Sharing the Installer (Priority: P2)

A developer or tester builds the installer package on their machine (Windows or macOS via cross-compilation) by running a single build command. The output is a standalone `.exe` installer file that can be shared via file transfer, USB drive, or cloud storage. The recipient does not need any development tools installed.

**Why this priority**: Important for distribution but secondary to the core install-and-use experience.

**Independent Test**: Can be tested by running the build command, transferring the output `.exe` to a different machine, and verifying it installs and runs correctly.

**Acceptance Scenarios**:

1. **Given** a developer has the project source code, **When** they run the build/package command, **Then** a single distributable installer file is generated.
2. **Given** the generated installer file, **When** transferred to a Windows machine without development tools, **Then** the installer runs and the application works correctly.

---

### User Story 4 - Application Updates (Priority: P3)

When a new version of the Mail Testing System is available, the user can download and run the new installer to update. Their existing configuration and email data are preserved across the update.

**Why this priority**: Nice-to-have for initial release; manual reinstall is acceptable initially.

**Independent Test**: Can be tested by installing v1, configuring settings, then installing v2 over it and verifying settings and data persist.

**Acceptance Scenarios**:

1. **Given** the user has version 1 installed with saved settings, **When** they install version 2 over it, **Then** all previous settings and email data are preserved.

---

### Edge Cases

- What happens when the required port (7654) is already in use by another application?
- How does the system handle if the database fails to start (e.g., corrupted data)?
- What happens if the user tries to install on an unsupported Windows version (pre-Windows 10)?
- How does the system behave if antivirus software blocks the embedded services?
- What happens when the user installs a second instance on the same machine?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST package the frontend, backend, and database into a single installable Windows application.
- **FR-002**: System MUST embed all runtime dependencies (Node.js runtime, PostgreSQL) so the user does not need to install them separately.
- **FR-003**: System MUST provide a native application window that displays the web-based UI without requiring an external browser.
- **FR-004**: System MUST start all backend services (API server, database) automatically when the application launches.
- **FR-005**: System MUST stop all backend services gracefully when the application is closed.
- **FR-006**: System MUST persist all user data (settings, emails, categories) between application sessions in a local data directory.
- **FR-007**: System MUST generate a Windows installer (`.exe`) that can be distributed as a single file.
- **FR-008**: System MUST handle port conflicts by finding available ports automatically if the default port is in use.
- **FR-009**: System MUST create Start Menu and Desktop shortcuts during installation.
- **FR-010**: System MUST provide an uninstaller accessible from Windows Settings > Apps that removes all application files (with option to keep or delete user data).

### Dependencies

- **DEP-001**: Multi-IMAP Profile feature (separate spec) SHOULD be implemented before desktop packaging so the desktop version ships with multi-profile support built-in.

### Key Entities

- **Application Package**: The distributable installer containing all components (UI, API, database engine, runtime). Approximately 100-200 MB.
- **User Data Store**: Local directory containing the database files, application settings, and email attachments. Stored in the user's AppData directory.
- **Application Process Tree**: The set of managed processes (main window, API server, database) coordinated by the desktop shell.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A non-technical user can install and launch the application within 3 minutes on a clean Windows 10/11 machine.
- **SC-002**: The installer file size is under 250 MB.
- **SC-003**: The application launches and is ready to use within 15 seconds after clicking the shortcut.
- **SC-004**: All existing features (IMAP connection, email viewing, categories, import/export config) work identically in the desktop version as in the Docker version.
- **SC-005**: Closing the application results in zero orphan processes remaining after 10 seconds.
- **SC-006**: The application can be successfully shared and installed by at least 3 different users on different Windows machines without developer assistance.

## Assumptions

- Target platform is Windows 10/11 (64-bit). macOS and Linux packaging are out of scope for this phase.
- The application will use Electron (or similar framework) as the desktop shell to wrap the web-based UI.
- PostgreSQL will be embedded as a local service (or replaced with SQLite for simpler packaging if feasible) for the desktop version.
- The user's machine has at least 4 GB RAM and 500 MB free disk space.
- Internet connectivity is required only for IMAP email retrieval, not for the application itself to function.
- Code signing is out of scope for the initial version (users may see "Unknown publisher" warnings during installation).
- Auto-update mechanism is out of scope for the initial version; users will manually download new versions.
- Cross-compilation from macOS to Windows is a nice-to-have but not required; the build can be done on a Windows machine or CI.
- Multi-IMAP Profile support is a prerequisite feature (separate spec) that will be completed before desktop packaging begins.
