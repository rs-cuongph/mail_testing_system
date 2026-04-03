# Quickstart: Configurable Email Domain

**Branch**: `002-configurable-domain` | **Date**: 2026-04-03

## Overview

This feature allows configuring the target email domain and base address via environment variables, removing the hardcoded `rn.work` dependency.

## Configuration

Add to `backend/.env`:

```env
# Mail Domain Configuration
MAIL_DOMAIN="rn.work"           # Domain to filter incoming emails (e.g., "mycompany.com")
MAIL_BASE_ADDRESS="gens"         # Base address for thread labels (e.g., "inbox")
```

## Usage

### 1. Default (existing behavior)

No changes needed. If `MAIL_DOMAIN` and `MAIL_BASE_ADDRESS` are not set, defaults are `rn.work` and `gens`.

### 2. Custom Domain

```env
MAIL_DOMAIN="mycompany.com"
MAIL_BASE_ADDRESS="inbox"
```

Restart the backend. Now:
- Only emails to `*@mycompany.com` are processed
- Threads are labeled as `inbox+tag@mycompany.com`
- Frontend UI shows "Send emails to `inbox+tag@mycompany.com`"

### 3. Docker Compose

Add to `docker-compose.yml` backend environment:

```yaml
environment:
  MAIL_DOMAIN: mycompany.com
  MAIL_BASE_ADDRESS: inbox
```

### 4. Verify

```bash
# Check backend config
curl http://localhost:3000/api/config
# Returns: {"mailDomain":"mycompany.com","mailBaseAddress":"inbox"}
```

## Prerequisites

- IMAP mailbox must be configured to receive emails for the chosen domain
- Catch-all rule: `*@{MAIL_DOMAIN} → {MAIL_BASE_ADDRESS}@{MAIL_DOMAIN}`
