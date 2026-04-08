# Frontend Migration Checklist

Updated: 2026-04-08

- `frontend/src/services/desktop.ts`
  - Repointed desktop notification helpers to `frontend/src/lib/tauri-bridge.ts`.
- `frontend/src/services/runtime.ts`
  - Moved backend URL resolution behind runtime initialization so Tauri can provide the sidecar URL.
- `frontend/src/pages/SetupPage.tsx`
  - Stores credentials via Tauri keyring commands before submitting profile settings.
- `frontend/src/pages/ProfilesPage.tsx`
  - Stores, loads, activates, and deletes credentials through the Tauri keyring bridge.
- `frontend/src/App.tsx`
  - Loads Tauri-backed notification and close-behavior preferences.
- `frontend/src/components/`
  - No direct `window.electronAPI` calls found.
- `frontend/src/services/`
  - No direct `window.electronAPI` calls found.

Compatibility note:

- `frontend/src/lib/tauri-bridge.ts` keeps a `window.desktopApp` fallback only for legacy Electron/browser compatibility during the migration period.
