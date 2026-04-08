export {};

declare global {
  interface Window {
    desktopApp?: {
      platform: string;
      notifications?: {
        isSupported: () => Promise<boolean>;
        getEnabled: () => Promise<boolean>;
        setEnabled: (enabled: boolean) => Promise<boolean>;
        show: (payload: { title: string; body: string; threadTag?: string; emailId?: string }) => Promise<boolean>;
        onClick: (callback: (payload: { title: string; body: string; threadTag?: string; emailId?: string }) => void) => () => void;
      };
    };
  }
}
