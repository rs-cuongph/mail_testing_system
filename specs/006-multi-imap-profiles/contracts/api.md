# API Contracts: Multi-IMAP Profile

## Profile Management

### GET /api/profiles
Returns all IMAP profiles.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "name": "Work Gmail",
    "provider": "gmail",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapUser": "user@gmail.com",
    "imapTls": true,
    "imapMode": "idle",
    "imapPollInterval": 5000,
    "mailDomain": "gmail.com",
    "mailBaseAddress": "inbox",
    "isActive": true,
    "lastUsedAt": "2026-04-06T14:00:00Z"
  }
]
```
Note: `imapPassword` is never returned.

---

### POST /api/profiles
Create a new IMAP profile. Tests connection before saving.

**Request Body**:
```json
{
  "name": "Work Gmail",
  "provider": "gmail",
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "imapUser": "user@gmail.com",
  "imapPassword": "app-password-here",
  "imapTls": true,
  "imapMode": "idle",
  "imapPollInterval": 5000,
  "mailDomain": "gmail.com",
  "mailBaseAddress": "inbox"
}
```

**Response 201**: Created profile object (without password).  
**Response 400**: `{ "message": "IMAP connection failed: ..." }` or `{ "message": "Profile name already exists" }`

---

### PATCH /api/profiles/:id
Update an existing profile's settings. Tests connection if IMAP credentials changed.

**Request Body**: Partial profile fields (same as POST).  
**Response 200**: Updated profile object.  
**Response 404**: Profile not found.

---

### DELETE /api/profiles/:id
Delete a profile and all its associated data (threads, emails, categories, attachments).

**Response 200**: `{ "success": true, "message": "Profile deleted" }`  
**Response 404**: Profile not found.  
**Response 400**: `{ "message": "Cannot delete the only active profile" }` (if it's the last one)

---

### POST /api/profiles/:id/activate
Switch to a different profile. Disconnects current IMAP, connects to the new one.

**Response 200**: `{ "success": true, "activeProfileId": "uuid" }`  
**Response 404**: Profile not found.

---

### GET /api/profiles/:id/export
Export a profile's configuration as JSON (without password).

**Response 200**: JSON file download (`Content-Disposition: attachment`).

---

### POST /api/profiles/import
Import a profile configuration from JSON. Creates a new profile.

**Request Body**: Same as POST /api/profiles (password can be empty).  
**Response 201**: Created profile object.

---

## Modified Existing Endpoints

All existing endpoints that return threads, emails, or categories now implicitly filter by the active profile's `profileId`. No API signature changes needed — the backend reads the active profile from the database.

### GET /api/threads
Returns threads for the **active profile only**.

### GET /api/categories
Returns categories for the **active profile only**.

### POST /api/categories
Creates a category under the **active profile**.

### GET /api/config
Returns the **active profile's** configuration (backward compatible).

---

## WebSocket Events

### New Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `profile:switched` | Server → Client | `{ activeProfileId: string }` | Emitted when active profile changes. Client should reload all data. |
| `profile:created` | Server → Client | `{ profile: ProfileObject }` | New profile created |
| `profile:deleted` | Server → Client | `{ profileId: string }` | Profile deleted |

### Modified Events

All existing events (`thread:new`, `email:new`, etc.) continue to work — they only fire for the active profile's IMAP connection.
