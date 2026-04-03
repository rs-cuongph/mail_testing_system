# Feature Specification: Configurable Email Domain

**Feature Branch**: `002-configurable-domain`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "domain rn.work tôi muốn có thể tuỳ ý config để phục vụ domain khác"

## User Scenarios & Testing

### User Story 1 — Configure Target Domain via Environment Variable (Priority: P1)

An administrator wants to deploy the mail testing system for a different domain (e.g., `mycompany.com` instead of `rn.work`). They set an environment variable like `MAIL_DOMAIN=mycompany.com`, and the system automatically filters and processes only emails addressed to `*@mycompany.com`, grouping them by `+tag` just as it does today. No code changes are required — only configuration.

**Why this priority**: This is the core ask — without this, the system is locked to `rn.work` and cannot serve any other domain.

**Independent Test**: Set `MAIL_DOMAIN=example.com` in the environment, restart the backend. Send an email to `user+tag@example.com`. Verify it appears in the UI under a thread labeled `user+tag@example.com`. Send an email to `someone@rn.work` — verify it is **ignored** (not processed).

**Acceptance Scenarios**:

1. **Given** `MAIL_DOMAIN` is set to `mycompany.com`, **When** an email is received with `To: user+test@mycompany.com`, **Then** the system processes it and creates a thread labeled `user+test@mycompany.com`.
2. **Given** `MAIL_DOMAIN` is set to `mycompany.com`, **When** an email is received with `To: someone@differentdomain.com`, **Then** the system ignores the email entirely.
3. **Given** `MAIL_DOMAIN` is not set, **When** the system starts, **Then** it defaults to `rn.work` for backward compatibility.

---

### User Story 2 — Configure Base Address via Environment Variable (Priority: P2)

An administrator wants to change the base email address (currently hardcoded as `gens`) to match their domain's catch-all configuration. For example, if their catch-all routes `*@mycompany.com` to `inbox@mycompany.com`, they need to set `MAIL_BASE_ADDRESS=inbox` so the system correctly constructs thread labels like `inbox+tag@mycompany.com`.

**Why this priority**: Different domains will have different catch-all users. Without this, thread labels display incorrect base addresses.

**Independent Test**: Set `MAIL_DOMAIN=mycompany.com` and `MAIL_BASE_ADDRESS=inbox`. Send an email to `inbox+test@mycompany.com`. Verify the thread label displays `inbox+test@mycompany.com`.

**Acceptance Scenarios**:

1. **Given** `MAIL_BASE_ADDRESS` is set to `inbox`, **When** a thread is created for tag `test`, **Then** the thread label shows `inbox+test@mycompany.com`.
2. **Given** `MAIL_BASE_ADDRESS` is not set, **When** the system starts, **Then** it defaults to `gens` for backward compatibility.

---

### User Story 3 — UI Reflects Configured Domain (Priority: P2)

The frontend UI currently shows hardcoded instructions referencing `gens+tag@rn.work`. When the domain and base address are configured differently, the UI should reflect the actual configured values so users see correct guidance.

**Why this priority**: A cosmetic/UX issue, but confusing for users if the UI says "send to gens+tag@rn.work" when the system actually listens on a different domain.

**Independent Test**: Start the system with `MAIL_DOMAIN=test.io` and `MAIL_BASE_ADDRESS=dev`. Open the frontend UI. Verify the empty-state message says "Send emails to `dev+tag@test.io`" instead of the hardcoded `rn.work`.

**Acceptance Scenarios**:

1. **Given** the backend is configured with `MAIL_DOMAIN=test.io` and `MAIL_BASE_ADDRESS=dev`, **When** the user opens the frontend with no threads, **Then** the empty-state message references `dev+tag@test.io`.
2. **Given** the backend serves the domain configuration via an API endpoint, **When** the frontend loads, **Then** it fetches and displays the correct domain in all instructional text.

---

### Edge Cases

- What happens when `MAIL_DOMAIN` is set to an empty string? → System should fall back to default (`rn.work`) and log a warning.
- What happens when `MAIL_DOMAIN` contains an invalid domain format (e.g., spaces, special characters)? → System should reject the value at startup and use the default, logging an error.
- What happens when the IMAP mailbox receives emails for multiple domains? → Only emails matching the configured `MAIL_DOMAIN` are processed; all others are silently skipped.
- What happens when `MAIL_BASE_ADDRESS` contains `+` or `@` characters? → System should strip them and log a warning.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow configuring the target email domain via an environment variable (`MAIL_DOMAIN`).
- **FR-002**: System MUST default to `rn.work` when `MAIL_DOMAIN` is not set or is empty, for backward compatibility.
- **FR-003**: System MUST filter incoming emails by matching the `To` header domain against the configured `MAIL_DOMAIN`. Emails to other domains are ignored.
- **FR-004**: System MUST allow configuring the base email address (local-part before `+`) via an environment variable (`MAIL_BASE_ADDRESS`).
- **FR-005**: System MUST default to `gens` when `MAIL_BASE_ADDRESS` is not set or is empty.
- **FR-006**: System MUST use the configured base address when constructing thread labels (e.g., `{MAIL_BASE_ADDRESS}+{tag}@{MAIL_DOMAIN}`).
- **FR-007**: System MUST expose the configured domain and base address to the frontend via an API endpoint so the UI can display accurate instructional text.
- **FR-008**: System MUST validate `MAIL_DOMAIN` at startup — if the value is malformed, the system falls back to the default and logs a warning.
- **FR-009**: All locations in the system where the domain or base address is currently hardcoded MUST be updated to read from configuration.
- **FR-010**: System MUST update `.env.example` and documentation to reference the new `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` variables.

### Key Entities

- **Configuration**: The set of environment variables (`MAIL_DOMAIN`, `MAIL_BASE_ADDRESS`) that control which emails are processed and how threads are labeled. No new database entities are required.

## Success Criteria

### Measurable Outcomes

- **SC-001**: An administrator can switch the system to process emails for any domain by changing a single environment variable and restarting — no code modification required.
- **SC-002**: Existing deployments using `rn.work` continue to work without any configuration changes (full backward compatibility).
- **SC-003**: The frontend UI displays the correct configured domain in all instructional text (zero hardcoded domain references in source code).
- **SC-004**: All hardcoded `rn.work` references in backend source code are replaced with configuration reads.

## Assumptions

- The system operates on a single domain at a time. Multi-domain support (processing emails for multiple domains simultaneously) is out of scope for this feature.
- The IMAP mailbox may contain emails for multiple domains, but only those matching `MAIL_DOMAIN` are processed.
- The catch-all email routing on the mail server is configured separately by the administrator; this feature only controls the application-level filtering.
- Docker Compose environment variables and `.env` files are the primary configuration mechanism.
