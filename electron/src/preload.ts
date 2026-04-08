import { contextBridge, ipcRenderer } from 'electron';

type NotificationPayload = {
  title: string;
  body: string;
  threadTag?: string;
  emailId?: string;
};

contextBridge.exposeInMainWorld('desktopApp', {
  platform: process.platform,
  notifications: {
    isSupported: () => ipcRenderer.invoke('notifications:isSupported'),
    getEnabled: () => ipcRenderer.invoke('notifications:getEnabled'),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke('notifications:setEnabled', enabled),
    show: (payload: NotificationPayload) => ipcRenderer.invoke('notifications:show', payload),
    onClick: (callback: (payload: NotificationPayload) => void) => {
      const listener = (_event: unknown, payload: NotificationPayload) => callback(payload);
      ipcRenderer.on('notifications:click', listener);
      return () => {
        ipcRenderer.removeListener('notifications:click', listener);
      };
    },
  },
});
