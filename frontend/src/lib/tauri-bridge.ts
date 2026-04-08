import { invoke } from '@tauri-apps/api/core';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

type NotificationPayload = {
  title: string;
  body: string;
  threadTag?: string;
  emailId?: string;
};

const searchParams = new URLSearchParams(window.location.search);
const fallbackApiBaseUrl =
  searchParams.get('apiBaseUrl') ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:7654/api';

export function isTauriApp() {
  return Boolean(window.__TAURI_INTERNALS__);
}

export function isDesktopApp() {
  return isTauriApp();
}

export async function getBackendUrl() {
  if (isTauriApp()) {
    return invoke<string>('get_backend_url');
  }

  return fallbackApiBaseUrl;
}

export async function isDesktopNotificationsSupported() {
  if (isTauriApp()) {
    return true;
  }

  if (window.desktopApp?.notifications) {
    return window.desktopApp.notifications.isSupported();
  }

  return 'Notification' in window;
}

export async function getDesktopNotificationsEnabled() {
  if (isTauriApp()) {
    return invoke<boolean>('get_notifications_enabled');
  }

  if (!window.desktopApp?.notifications) {
    return false;
  }

  return window.desktopApp.notifications.getEnabled();
}

export async function setDesktopNotificationsEnabled(enabled: boolean) {
  if (isTauriApp()) {
    return invoke<boolean>('set_notifications_enabled', { enabled });
  }

  if (!window.desktopApp?.notifications) {
    return false;
  }

  return window.desktopApp.notifications.setEnabled(enabled);
}

export async function showDesktopNotification(payload: NotificationPayload) {
  if (isTauriApp()) {
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      permissionGranted = (await requestPermission()) === 'granted';
    }

    if (!permissionGranted) {
      return false;
    }

    await sendNotification({ title: payload.title, body: payload.body });
    return true;
  }

  if (window.desktopApp?.notifications) {
    return window.desktopApp.notifications.show(payload);
  }

  return false;
}

export function onDesktopNotificationClick(
  callback: (payload: NotificationPayload) => void,
) {
  if (window.desktopApp?.notifications?.onClick) {
    return window.desktopApp.notifications.onClick(callback);
  }

  return () => undefined;
}

export async function getCredential(credentialKey?: string | null) {
  if (!credentialKey || !isTauriApp()) {
    return null;
  }

  return invoke<string | null>('get_credential', { credentialKey });
}

export async function setCredential(
  credentialKey: string | null | undefined,
  password: string,
) {
  if (!password) {
    throw new Error('Password is required');
  }

  if (!isTauriApp()) {
    return credentialKey ?? '';
  }

  return invoke<string>('set_credential', { credentialKey, password });
}

export async function deleteCredential(credentialKey?: string | null) {
  if (!credentialKey || !isTauriApp()) {
    return;
  }

  await invoke('delete_credential', { credentialKey });
}

export async function getCloseBehavior() {
  if (!isTauriApp()) {
    return 'quit' as const;
  }

  return invoke<'tray' | 'quit'>('get_close_behavior');
}

export async function setCloseBehavior(value: 'tray' | 'quit') {
  if (!isTauriApp()) {
    return value;
  }

  return invoke<'tray' | 'quit'>('set_close_behavior', { value });
}
