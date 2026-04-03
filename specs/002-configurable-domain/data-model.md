# Data Model: Configurable Email Domain

**Branch**: `002-configurable-domain` | **Date**: 2026-04-03

## No Database Changes

This feature does not introduce any new database entities or modify existing ones.

The `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` values are **runtime configuration** stored as environment variables, not persisted in the database.

### Existing Entities (Unchanged)

| Entity | Relevant Fields | Impact |
|--------|----------------|--------|
| Thread | `fullAddress` | Already stores the computed full address (e.g., `gens+1@rn.work`). New threads will use the configured domain/base address. **Existing data remains unchanged.** |
| Thread | `baseAddress` | Already stores the base address (e.g., `gens`). New threads will use the configured base. |
| Email  | `toEmail` | Stores the actual recipient address from the email header. No change needed. |

### Configuration Entity (Runtime Only)

```
┌──────────────────────────────────────────────┐
│ Mail Configuration (Environment Variables)   │
│                                              │
│  MAIL_DOMAIN       (default: "rn.work")      │
│  MAIL_BASE_ADDRESS (default: "gens")         │
│                                              │
│  Read at: Backend startup                    │
│  Exposed via: GET /api/config                │
│  Consumers: MailParserService, ImapService,  │
│             Frontend UI                      │
└──────────────────────────────────────────────┘
```

### Data Migration

No migration needed. Existing thread records retain their original `fullAddress` and `baseAddress` values. New threads created after configuration change will reflect the new domain.
