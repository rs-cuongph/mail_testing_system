# Phase 0: Research

## Desktop Packaging Strategy (Electron)
- **Decision**: Use `electron-builder` with an `electron/` directory at the project root tying frontend and backend together.
- **Rationale**: The project has a clear separation of `frontend/` (Vite Web App) and `backend/` (NestJS). `electron-builder` allows us to compile the NestJS backend into a bundled JS file (using webpack or nest build), build the Vite frontend, and package both into a single installer. The Electron main process will spawn the NestJS backend as a child process and load the Vite frontend in a browser window.
- **Alternatives considered**: Tauri (rejected in clarification), NW.js (smaller ecosystem). Setting up Electron directly inside `frontend/` (messy as we have a `backend/` dependency).

## Database Engine (SQLite vs Postgres)
- **Decision**: Migrate Prisma provider from `postgresql` to `sqlite`. Remove Postgres from docker-compose.
- **Rationale**: The spec explicitly requires embedded SQLite and no Postgres migration. Prisma supports `sqlite` seamlessly. This means we rewrite `backend/prisma/schema.prisma` to use `provider = "sqlite"`, which removes the need for a separate database process in the desktop environment.
- **Alternatives considered**: Keeping both Postgres for Docker and SQLite for Desktop. This would require two separate Prisma schemas and migrations, significantly complicating the build process. The spec implies replacing the Docker version's DB entirely with SQLite.

## OS Credential Storage
- **Decision**: Use `safeStorage` API from Electron and expose it to the backend via IPC, or have the backend request credentials from the Electron main process.
- **Rationale**: `safeStorage` natively integrates with Windows Credential Manager, macOS Keychain, and Linux libsecret. Since NestJS needs the IMAP credentials, Electron Main will read/write the passwords and pass them securely to NestJS either via IPC or environment variables when spawning the backend child process.
- **Alternatives considered**: Using `keytar` in NestJS (deprecated and requires native compilation, difficult to bundle).

## System Tray and Background Execution
- **Decision**: Use Electron's `Tray` module. When the main window is closed, prevent the app from quitting (`event.preventDefault()`) and just `win.hide()`. Add a "Quit" button to the tray context menu that calls `app.quit()`.
- **Rationale**: Standard desktop behavior for background monitoring apps. Electron makes this trivial.
- **Alternatives considered**: Running the backend as a true OS daemon. Overkill and requires admin privileges.
