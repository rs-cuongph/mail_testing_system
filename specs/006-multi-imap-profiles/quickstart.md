# Quickstart: Multi-IMAP Profile Support

## Prerequisites
- Existing Mail Testing System running (Docker or local dev)
- PostgreSQL database accessible
- Node.js 22+

## Development Setup

```bash
# 1. Switch to feature branch
git checkout 006-multi-imap-profiles

# 2. Run database migration
cd backend
npx prisma migrate dev --name add-imap-profiles

# 3. Start backend
npm run start:dev

# 4. Start frontend (separate terminal)
cd frontend
npm run dev
```

## Key Changes Overview

### Backend
1. **New module**: `backend/src/profiles/` — ProfileController, ProfileService, DTOs
2. **Modified**: `backend/src/imap/imap.service.ts` — parameterized by profileId
3. **Modified**: `backend/src/threads/threads.service.ts` — filter by profileId
4. **Modified**: `backend/src/categories/categories.service.ts` — filter by profileId
5. **Schema**: New `ImapProfile` model, `profileId` FK on Thread and Category
6. **Deprecated**: `SystemConfig` model (migrated to ImapProfile)

### Frontend
1. **New component**: `ProfileSwitcher` — dropdown in sidebar header
2. **New page**: `ProfilesPage` — CRUD management
3. **Modified**: `App.tsx` — active profile context, auto-connect logic
4. **Modified**: `ThreadList.tsx` — reload on profile switch
5. **New service**: `profiles.api.ts` — API client for profile endpoints

## Testing the Feature

```bash
# 1. Create a profile
curl -X POST http://localhost:7654/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Gmail","provider":"gmail","imapHost":"imap.gmail.com","imapPort":993,"imapUser":"test@gmail.com","imapPassword":"app-password","imapTls":true,"imapMode":"idle","imapPollInterval":5000,"mailDomain":"gmail.com","mailBaseAddress":"inbox"}'

# 2. List profiles
curl http://localhost:7654/api/profiles

# 3. Activate a profile
curl -X POST http://localhost:7654/api/profiles/{id}/activate

# 4. Verify data isolation — threads should only show for active profile
curl http://localhost:7654/api/threads
```

## Provider Presets (Frontend)

| Provider | Host | Port | TLS |
|----------|------|------|-----|
| Gmail | imap.gmail.com | 993 | ✅ |
| Outlook/Office365 | outlook.office365.com | 993 | ✅ |
| Yahoo | imap.mail.yahoo.com | 993 | ✅ |
| Custom | (user input) | (user input) | (user input) |
