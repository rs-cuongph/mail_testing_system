# Feature Specification: Multi-IMAP Profile Support

**Feature Branch**: `006-multi-imap-profiles`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "Hỗ trợ nhiều IMAP settings khác nhau để testing. User có thể tạo, switch, quản lý nhiều IMAP profile. Mail từng profile lưu riêng biệt. Hỗ trợ nhiều provider (Gmail, Outlook, v.v.)."

## Clarifications

### Session 2026-04-06

- Q: Gmail auth method — App Password hay OAuth2? → A: App Password only với hướng dẫn chi tiết (bật 2FA → tạo App Password). OAuth2 flow out of scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Manage IMAP Profiles (Priority: P1)

A tester works with multiple email accounts for different projects (e.g., `qa@company.com` for internal testing, `test@gmail.com` for customer-facing flows). They open the application and create multiple IMAP profiles, each with its own connection settings, mail domain, and base address. They can edit or delete any profile at any time.

**Why this priority**: Without the ability to create multiple profiles, the entire feature has no value. This is the foundational capability.

**Independent Test**: Can be tested by creating 3 profiles with different settings, editing one, deleting another, and verifying the remaining profiles retain their configurations correctly.

**Acceptance Scenarios**:

1. **Given** the user is on the profiles management screen, **When** they click "Add Profile", **Then** a form appears with all IMAP settings fields (name, host, port, username, password, TLS, sync mode, mail domain, base address).
2. **Given** the user fills in valid IMAP settings and clicks Save, **When** the system tests the connection, **Then** the profile is saved and appears in the profiles list.
3. **Given** the user has 3 profiles, **When** they edit Profile B's hostname, **Then** only Profile B is updated; other profiles remain unchanged.
4. **Given** the user has 3 profiles, **When** they delete Profile C, **Then** Profile C and all its associated emails/threads/categories are removed. Profiles A and B remain intact.
5. **Given** a profile named "Work Email" already exists, **When** the user creates another profile with the same name, **Then** the system prevents duplicates or appends a suffix to distinguish them.

---

### User Story 2 - Profile Switching and Data Isolation (Priority: P1)

A tester has configured 3 IMAP profiles. When they open the application, it auto-connects to the last used profile. They can switch to a different profile at any time via a dropdown or button in the sidebar/header. When switching, the current IMAP connection disconnects, the new profile's connection activates, and only the new profile's emails/threads/categories are displayed. Data from different profiles never intermixes.

**Why this priority**: Equal to P1 — the core value of multi-profile is the ability to switch contexts without losing data.

**Independent Test**: Can be tested by: activating Profile A → receiving 5 emails → switching to Profile B → verifying inbox is empty → receiving 3 emails on Profile B → switching back to Profile A → verifying exactly 5 original emails are there.

**Acceptance Scenarios**:

1. **Given** the user has multiple profiles and last used Profile A, **When** they launch the application, **Then** Profile A auto-connects and its emails are displayed.
2. **Given** Profile A is active with emails, **When** the user clicks the profile switcher and selects Profile B, **Then** Profile A disconnects, Profile B connects, and only Profile B's emails/threads/categories are shown.
3. **Given** the user switches from Profile B back to Profile A, **Then** all previously received emails under Profile A are fully preserved.
4. **Given** Profile A receives an email while Profile B is active, **When** the user switches to Profile A later, **Then** that email is NOT synced until Profile A becomes active (only the active profile syncs).
5. **Given** Profile A has 3 categories ("Bug", "Feature", "Urgent"), **When** the user switches to Profile B, **Then** Profile B has its own independent category list (possibly empty or different).

---

### User Story 3 - Multi-Provider Support with Guided Setup (Priority: P2)

A tester wants to connect their Gmail account. During profile creation, they can optionally select "Gmail" as the provider, and the form auto-fills the correct IMAP settings (host: `imap.gmail.com`, port: 993, TLS: on). A help note explains that Gmail requires an App Password since basic auth is disabled. Similar presets exist for Outlook/Office365, Yahoo, and other common providers. Custom IMAP servers are also supported with manual entry.

**Why this priority**: Reduces configuration errors, especially for providers with non-obvious settings like Gmail's app password requirement.

**Independent Test**: Can be tested by selecting "Gmail" preset, verifying auto-filled values, then switching to "Custom" and entering arbitrary IMAP settings.

**Acceptance Scenarios**:

1. **Given** the user is creating a new profile, **When** they select "Gmail" from the provider dropdown, **Then** host, port, and TLS are auto-filled with Gmail's IMAP settings.
2. **Given** the user selects "Gmail", **Then** a visible help note explains the App Password requirement with a link to Google's instructions.
3. **Given** the user selects "Outlook/Office365", **Then** host (`outlook.office365.com`), port (993), and TLS are auto-filled.
4. **Given** the user selects "Custom", **Then** all fields are blank for manual entry.
5. **Given** the user has selected a provider preset, **When** they manually edit a pre-filled field, **Then** the change is accepted (presets are suggestions, not locked).

---

### User Story 4 - Import/Export Config Per Profile (Priority: P2)

A tester exports a profile's configuration as a JSON file (without the password) and shares it with a colleague. The colleague imports the file, enters their own password, and has the same IMAP configuration ready to use. This extends the existing import/export config feature to work per-profile.

**Why this priority**: Facilitates team collaboration — sharing standardized configs saves setup time.

**Independent Test**: Can be tested by exporting Profile A's config, importing it as a new profile on the same or different machine, and verifying all settings match (except password which is blank).

**Acceptance Scenarios**:

1. **Given** the user has Profile A configured, **When** they export its config, **Then** a JSON file is downloaded containing all settings except the password.
2. **Given** the user has a config JSON file, **When** they import it, **Then** a new profile is created with all settings pre-filled and the password field blank.
3. **Given** the user imports a config file, **When** the profile name already exists, **Then** the system creates the profile with a disambiguated name (e.g., "Work Email (2)").

---

### Edge Cases

- What happens if the user deletes the only remaining profile?
- What happens if the active profile's IMAP server becomes unreachable during use?
- How does the system handle switching profiles while emails are still being synced?
- What happens if two profiles use the same IMAP account credentials?
- What happens if a profile's database data becomes corrupted — does it affect other profiles?
- How does the system handle the unread count badge when switching profiles?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create multiple IMAP profiles, each with a unique display name and independent connection settings (host, port, username, password, TLS, sync mode, poll interval, mail domain, base address).
- **FR-002**: System MUST display a profile switcher control (dropdown or button) in the application sidebar or header, accessible at all times when a profile is active.
- **FR-003**: System MUST auto-connect to the last active profile when the application starts. If no profile exists, redirect to profile creation.
- **FR-004**: System MUST ensure only one IMAP profile is active at any time. Switching profiles disconnects the current IMAP connection before connecting the new one.
- **FR-005**: System MUST store all emails, threads, and categories per-profile using a shared database with a `profileId` foreign key. Data queries must always filter by the active profile.
- **FR-006**: System MUST allow users to edit any profile's settings. If the active profile is edited, the IMAP connection must reconnect with the updated settings.
- **FR-007**: System MUST allow users to delete a profile along with all its associated data (emails, threads, categories). Confirmation is required before deletion.
- **FR-008**: System MUST provide provider presets (Gmail, Outlook/Office365, Yahoo) that auto-fill IMAP host, port, and TLS settings during profile creation.
- **FR-009**: System MUST display provider-specific guidance (e.g., Gmail App Password instructions) when a provider preset is selected.
- **FR-010**: System MUST support import/export of profile configuration as JSON, excluding the password field. Importing creates a new profile.
- **FR-011**: System MUST prevent duplicate profile names. If a name collision occurs during creation or import, the system appends a numeric suffix.

### Key Entities

- **IMAP Profile**: A named configuration record containing: display name, provider (preset or custom), IMAP host, port, username, encrypted password, TLS flag, sync mode, poll interval, mail domain, base address, last active timestamp. Uniquely identified by ID, with a unique display name constraint.
- **Email / Thread / Category**: Existing entities extended with a `profileId` foreign key to associate them with the owning IMAP profile. All queries filter by the currently active `profileId`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create and switch between at least 10 IMAP profiles without data loss or email mixing.
- **SC-002**: Profile switching (disconnect + connect) completes within 5 seconds.
- **SC-003**: Deleting a profile removes all its associated data within 3 seconds with no impact on other profiles.
- **SC-004**: Provider presets correctly auto-fill settings for Gmail, Outlook/Office365, and Yahoo with zero user errors from incorrect IMAP host/port.
- **SC-005**: Config export/import works across different machines — a profile exported on Machine A can be imported and used on Machine B.
- **SC-006**: 100% data isolation — emails received on Profile A are never visible when Profile B is active, verified by automated tests.

## Assumptions

- The existing single-settings architecture will be refactored to support multiple profiles (database schema migration required).
- Gmail and other providers requiring OAuth2 will be supported via App Passwords in the initial version. Full OAuth2 flow is out of scope.
- The profile switcher UI will be integrated into the existing sidebar/header layout without a separate page.
- Profile data (emails, threads, categories) is stored in the same database using `profileId` as a filter column, not in separate databases.
- The existing import/export config feature will be extended to work per-profile rather than globally.
- Maximum recommended profiles is 10, though the system does not impose a hard limit.
- When no profiles exist (fresh install or all deleted), the system redirects to profile creation flow.
