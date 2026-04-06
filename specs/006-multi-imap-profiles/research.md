# Research: Multi-IMAP Profile Support

## Decision 1: Database Schema Migration Strategy

**Decision**: Add `ImapProfile` model + add `profileId` FK to existing `Thread`, `Email`, `Category` models. Migrate existing data to a default "Legacy" profile.

**Rationale**: Shared DB with `profileId` filtering (as decided in clarification) is the simplest approach. Prisma handles migrations well. Existing data must be preserved by assigning it to a default profile created during migration.

**Alternatives considered**:
- Separate database per profile: Rejected — complex to manage, harder to query across profiles, overkill for the expected scale (≤10 profiles).
- Schema-per-profile (PostgreSQL schemas): Rejected — unnecessary complexity, not portable if switching to SQLite later.

## Decision 2: Backend Architecture for Profile-Aware IMAP

**Decision**: Refactor `ImapService` to accept a `profileId` parameter for connect/disconnect. Add `ProfileService` (CRUD) and `ProfileModule`. The `SettingsService` (single-config) becomes a thin wrapper around `ProfileService` for backward compatibility during migration.

**Rationale**: The current `ImapService` reads config from `SystemConfig` (single row). This must change to load config from the active `ImapProfile` row. The service already has connect/disconnect/reconnect logic — it just needs to be parameterized by profileId.

**Alternatives considered**:
- Creating a separate ImapService instance per profile: Rejected — only one profile is active at a time, so a single service with switchable config is sufficient and simpler.

## Decision 3: Frontend Profile Switcher UX

**Decision**: Profile switcher as a dropdown in the thread list sidebar header. Shows active profile name + icon, dropdown lists all profiles with "Manage Profiles" link. Profile management is a dedicated page/modal.

**Rationale**: Auto-connect last used profile (as decided in clarification) means the switcher is secondary UI — user doesn't see it on every launch, only when they want to switch. Sidebar header is always visible and doesn't take extra space.

**Alternatives considered**:
- Full-page profile selector on every launch: Rejected as per clarification — user chose auto-connect.
- Profile switcher in top header bar: Viable but sidebar header is more contextual (next to threads).

## Decision 4: Provider Presets Implementation

**Decision**: Static JSON configuration of provider presets shipped with the frontend. No server-side component needed. Presets: Gmail, Outlook/Office365, Yahoo, Custom.

**Rationale**: Provider IMAP settings rarely change. Static config in the frontend is simplest and requires zero backend work. Can be extended by adding entries to a JSON file.

**Alternatives considered**:
- Server-side provider config API: Unnecessary overhead for static data.
- Community-contributed provider database: Out of scope for initial version.

## Decision 5: Gmail App Password Guidance

**Decision**: Inline help text shown when Gmail preset is selected, with step-by-step instructions and link to Google's App Password page. No in-app OAuth flow.

**Rationale**: App Passwords are the simplest way to authenticate Gmail IMAP without OAuth2 complexity (which requires a Google Cloud project, consent screen, etc.). Clear guidance reduces user confusion.
