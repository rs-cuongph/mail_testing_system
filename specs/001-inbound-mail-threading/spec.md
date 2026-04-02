# Feature Specification: Inbound Mail Testing System (Plus Addressing Threading)

**Feature Branch**: `001-inbound-mail-threading`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "Build a system that receives emails from a cPanel domain and displays them in a UI grouped by custom threads based on plus-addressing (+tag). Each unique +tag creates a separate thread, independent of any mail client threading logic."

## Clarifications

### Session 2026-04-02

- Q: Should the web UI require authentication or be an open internal tool? → A: No authentication — open internal tool, rely on network-level access control.
- Q: How should the system display HTML email bodies? → A: Both views — users can toggle between plain text and sandboxed HTML rendering.
- Q: How should old threads and emails be cleaned up? → A: Manual purge via UI — users can delete individual threads or bulk-clear all data.
- Q: How should threads be labeled in the UI? → A: Full address format — display `gens+1@rn.work`, `gens+2@rn.work`.
- Q: Should the system extract +tags from CC/BCC fields or only from To? → A: `To` field only — extract tags exclusively from the `To` header.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Email Threads by Tag (Priority: P1)

A tester sends emails to `gens+1@rn.work` and `gens+2@rn.work`. The system receives these emails via IMAP, extracts the `+tag` from each recipient address, and groups them into separate threads. When the tester opens the UI, they see two distinct threads — one for tag `1` and one for tag `2` — each containing only the emails sent to that specific plus-addressed recipient.

**Why this priority**: This is the core value proposition of the system. Without tag-based threading, the system has no differentiating functionality. This story covers the end-to-end flow from email ingestion to thread display.

**Independent Test**: Can be fully tested by sending 2+ emails to different `+tag` addresses and verifying the UI displays them in separate, correctly grouped threads.

**Acceptance Scenarios**:

1. **Given** email `gens+1@rn.work` receives Mail A and Mail B, **When** the user opens the UI, **Then** a thread labeled `gens+1@rn.work` displays both Mail A and Mail B in chronological order.
2. **Given** email `gens+2@rn.work` receives Mail C, **When** the user opens the UI, **Then** a thread labeled `gens+2@rn.work` displays only Mail C, separate from the first thread.
3. **Given** an email is sent to `gens@rn.work` (no tag), **When** the system processes it, **Then** the email appears under a thread labeled `gens@rn.work (default)`.

---

### User Story 2 - View Individual Email Details (Priority: P2)

A tester wants to inspect the full content of a specific email within a thread. They click on an email entry in the thread view and see the complete email details including sender, recipient, subject, body, and received timestamp.

**Why this priority**: After seeing threads, users need to drill into individual emails to verify content. This is essential for the testing use case but depends on Story 1 being implemented first.

**Independent Test**: Can be tested by clicking any email in a thread and verifying all fields (from, to, subject, body, timestamp) are displayed correctly.

**Acceptance Scenarios**:

1. **Given** a thread contains multiple emails, **When** a user selects a specific email, **Then** the system displays the full email details including sender, recipient, subject, body, and received timestamp.
2. **Given** an email has a body encoded in base64 or quoted-printable, **When** the user views it, **Then** the body is decoded and displayed as readable text.
3. **Given** an email contains HTML content, **When** the user views it, **Then** they can toggle between a plain text view and a sandboxed HTML-rendered view.

---

### User Story 3 - Real-time Email Arrival (Priority: P3)

A tester sends a new email to `gens+1@rn.work` and expects the UI to reflect the new email within a short time without needing to manually refresh the page.

**Why this priority**: Real-time updates enhance usability for active testing sessions but are not strictly required for the system to function. Polling or manual refresh can serve as a fallback.

**Independent Test**: Can be tested by sending an email and observing the UI updates within seconds without a manual page refresh.

**Acceptance Scenarios**:

1. **Given** the UI is open on a thread view, **When** a new email arrives for that thread's tag, **Then** the email appears in the thread within 10 seconds without page refresh.
2. **Given** the UI is open on the thread list, **When** a new email arrives for any tag, **Then** the thread list updates to reflect the new email count and timestamp.

---

### User Story 4 - Attachment Handling (Priority: P3)

A tester sends an email with attachments to a plus-addressed recipient. The system stores the attachments and displays them alongside the email details so the tester can download or preview them.

**Why this priority**: Attachments are common in email testing scenarios but are not part of the core threading feature. This extends the email detail view.

**Independent Test**: Can be tested by sending an email with an attachment and verifying the attachment is accessible from the email detail view.

**Acceptance Scenarios**:

1. **Given** an email with one or more attachments is received, **When** the user views the email details, **Then** the attachments are listed with filenames and sizes.
2. **Given** an attachment is listed in the email details, **When** the user clicks to download it, **Then** the file downloads correctly with the original filename.

---

### Edge Cases

- What happens when two emails arrive simultaneously for the same tag? → System must handle concurrent inserts without data loss.
- What happens when a duplicate email is received (same `message_id`)? → System must deduplicate and not create a second entry.
- What happens when an email is sent to multiple recipients including plus-addressed ones? → System must parse all `To` fields and correctly extract the target plus-address.
- What happens when the IMAP connection drops? → System should reconnect automatically and resume fetching.
- What happens when the email body contains mixed encodings (some parts base64, some quoted-printable)? → System must decode each MIME part correctly.
- What happens when a user deletes a thread that is still receiving new emails? → Newly arriving emails for that tag create a fresh thread.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to an IMAP server and fetch incoming emails from a configured mailbox.
- **FR-002**: System MUST extract the `+tag` exclusively from the `To` header of each email (e.g., `gens+1@rn.work` → tag `1`). CC and BCC fields are ignored for tag extraction.
- **FR-003**: System MUST assign a `thread_id` based on the extracted tag, or `"default"` if no tag is present.
- **FR-004**: System MUST NOT use mail client threading mechanisms (In-Reply-To, References, or subject-based threading).
- **FR-005**: System MUST deduplicate emails based on the `message_id` header.
- **FR-006**: System MUST store email metadata (sender, recipient, subject, received timestamp) and body content persistently.
- **FR-007**: System MUST store raw email headers for debugging purposes.
- **FR-008**: System MUST provide an interface to list all threads grouped by tag.
- **FR-009**: System MUST provide an interface to list all emails within a specific thread, sorted by received time (newest first).
- **FR-010**: System MUST provide an interface to view the full details of a single email.
- **FR-011**: System MUST decode email bodies encoded in base64 and quoted-printable formats.
- **FR-012**: System MUST handle emails sent to multiple recipients by parsing all `To` fields (ignoring CC/BCC) and extracting the correct plus-addressed target.
- **FR-013**: System MUST store email attachments and make them retrievable from the email detail view.
- **FR-014**: System MUST support near-real-time email arrival detection (via IMAP IDLE or polling within 10 seconds).
- **FR-015**: System MUST NOT require user authentication; the UI is openly accessible on the internal network.
- **FR-016**: System MUST provide a toggle to switch between plain text and sandboxed HTML rendering when viewing email body content.
- **FR-017**: System MUST allow users to delete individual threads (with all associated emails and attachments) and to bulk-clear all data via the UI.
- **FR-018**: System MUST display threads using the full recipient address format (e.g., `gens+1@rn.work`); threads with no tag display as `gens@rn.work (default)`.

### Key Entities

- **Thread**: Represents a logical grouping of emails sharing the same `+tag`. Key attributes: tag identifier, base address, creation timestamp, email count.
- **Email**: Represents a single received email message. Key attributes: unique message ID, sender, recipient, subject, body, thread association, received timestamp, raw headers.
- **Attachment**: Represents a file attached to an email. Key attributes: filename, size, content type, association with parent email.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Emails sent to distinct `+tag` addresses appear in separate threads on the UI within 10 seconds of delivery.
- **SC-002**: 100% of emails are deduplicated — no duplicate entries for the same `message_id`.
- **SC-003**: Users can view the full details (from, to, subject, body, timestamp) of any email in under 2 seconds.
- **SC-004**: The system correctly groups emails by tag with 100% accuracy, regardless of mail client threading behavior.
- **SC-005**: Email bodies in base64 and quoted-printable encoding are displayed as readable text 100% of the time.
- **SC-006**: Attachments are retrievable and downloadable with the correct original filename.

## Assumptions

- The mail server (cPanel with Dovecot/Exim) is already configured and accessible via IMAP.
- A catch-all email rule is configured on the domain to route all `gens+*@rn.work` into a single inbox.
- The system targets a single domain (`rn.work`) for the initial version; multi-domain is a future enhancement.
- The system is intended for internal testing use, not for high-volume production email processing.
- Users access the UI through a modern web browser with JavaScript enabled.
- Attachment storage uses local filesystem storage for the initial version; cloud storage (e.g., S3) is a future enhancement.
- The expected email volume is moderate (hundreds per day, not millions).
- Full-text search is out of scope for the initial version.
- Webhook notifications for new emails are out of scope for the initial version.
- Advanced tag parsing (e.g., `gens+userId+env`) is out of scope for the initial version.
- The system is deployed on an internal/private network; security relies on network-level controls (VPN, firewall) rather than application-level authentication.
- Tag extraction is scoped to the `To` header only; emails where the plus-address appears only in CC or BCC are not tagged.
