export async function isDesktopNotificationsSupported() {
  return (await window.desktopApp?.notifications?.isSupported?.()) ?? false;
}

export async function getDesktopNotificationsEnabled() {
  if (!window.desktopApp?.notifications) {
    return false;
  }

  return window.desktopApp.notifications.getEnabled();
}

export async function setDesktopNotificationsEnabled(enabled: boolean) {
  if (!window.desktopApp?.notifications) {
    return false;
  }

  return window.desktopApp.notifications.setEnabled(enabled);
}

export async function showDesktopNotification(payload: { title: string; body: string; threadTag?: string; emailId?: string }) {
  if (!window.desktopApp?.notifications) {
    return false;
  }

  return window.desktopApp.notifications.show(payload);
}

export function onDesktopNotificationClick(
  callback: (payload: { title: string; body: string; threadTag?: string; emailId?: string }) => void,
) {
  if (!window.desktopApp?.notifications?.onClick) {
    return () => undefined;
  }

  return window.desktopApp.notifications.onClick(callback);
}
