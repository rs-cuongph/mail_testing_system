import { app, BrowserWindow, ipcMain, Notification, safeStorage } from 'electron';
import { randomUUID } from 'crypto';
import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import * as url from 'url';
import { TrayController } from './tray';

const DEFAULT_BACKEND_PORT = 7654;
const APP_USER_MODEL_ID = 'com.mailsystem.desktop';
const APP_DISPLAY_NAME = 'Mail Catcher';

function getRuntimeIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'icon.png');
  }

  return path.resolve(__dirname, '..', 'build', 'icon.png');
}

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort = DEFAULT_BACKEND_PORT;
let isQuitting = false;
let trayController: TrayController | null = null;

type CredentialStore = Record<string, string>;
type AppPreferences = {
  notificationsEnabled: boolean;
};

type CredentialRequestMessage = {
  type: 'credential:get' | 'credential:set' | 'credential:delete';
  requestId: string;
  credentialKey?: string | null;
  password?: string | null;
};

type NotificationPayload = {
  title: string;
  body: string;
  threadTag?: string;
  emailId?: string;
};

function getFrontendEntryPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend', 'index.html');
  }

  return path.resolve(__dirname, '..', '..', 'frontend', 'dist', 'index.html');
}

function getBackendEntryPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  }

  return path.resolve(__dirname, '..', '..', 'backend', 'dist', 'main.js');
}

function getBackendWorkingDirectory() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }

  return path.resolve(__dirname, '..', '..', 'backend');
}

function getPrismaCliEntryPath() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      'backend',
      'node_modules',
      'prisma',
      'build',
      'index.js',
    );
  }

  return path.resolve(
    __dirname,
    '..',
    '..',
    'backend',
    'node_modules',
    'prisma',
    'build',
    'index.js',
  );
}

function createBackendEnvironment(port: number) {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  const attachmentsDir = path.join(userDataPath, 'attachments');

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(attachmentsDir, { recursive: true });

  return {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: `file:${path.join(dataDir, 'mail-testing-system.db')}`,
    ATTACHMENT_STORAGE_DIR: attachmentsDir,
    FRONTEND_URL: 'file://',
  };
}

function getCredentialStorePath() {
  return path.join(app.getPath('userData'), 'credentials.json');
}

function getPreferencesPath() {
  return path.join(app.getPath('userData'), 'preferences.json');
}

function loadPreferences(): AppPreferences {
  const preferencesPath = getPreferencesPath();
  if (!fs.existsSync(preferencesPath)) {
    return { notificationsEnabled: true };
  }

  return {
    notificationsEnabled: true,
    ...(JSON.parse(fs.readFileSync(preferencesPath, 'utf8')) as Partial<AppPreferences>),
  };
}

function savePreferences(preferences: AppPreferences) {
  fs.writeFileSync(getPreferencesPath(), JSON.stringify(preferences, null, 2), 'utf8');
}

function getNotificationsEnabled() {
  return loadPreferences().notificationsEnabled;
}

function setNotificationsEnabled(enabled: boolean) {
  const preferences = loadPreferences();
  preferences.notificationsEnabled = enabled;
  savePreferences(preferences);
  return enabled;
}

function showDesktopNotification(payload: NotificationPayload) {
  if (!Notification.isSupported() || !getNotificationsEnabled()) {
    return false;
  }

  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    icon: getRuntimeIconPath(),
    urgency: 'normal',
    silent: false,
  });

  notification.on('click', () => {
    showMainWindow();
    mainWindow?.webContents.send('notifications:click', payload);
  });

  notification.show();
  return true;
}

function registerNotificationBridge() {
  ipcMain.handle('notifications:isSupported', () => Notification.isSupported());
  ipcMain.handle('notifications:getEnabled', () => getNotificationsEnabled());
  ipcMain.handle('notifications:setEnabled', (_event, enabled: boolean) => setNotificationsEnabled(Boolean(enabled)));
  ipcMain.handle('notifications:show', (_event, payload: NotificationPayload) => showDesktopNotification(payload));
}

function loadCredentialStore(): CredentialStore {
  const storePath = getCredentialStorePath();
  if (!fs.existsSync(storePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(storePath, 'utf8')) as CredentialStore;
}

function saveCredentialStore(store: CredentialStore) {
  fs.writeFileSync(getCredentialStorePath(), JSON.stringify(store, null, 2), 'utf8');
}

function encryptPassword(password: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS secure storage is unavailable');
  }

  return safeStorage.encryptString(password).toString('base64');
}

function decryptPassword(encryptedValue: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS secure storage is unavailable');
  }

  return safeStorage.decryptString(Buffer.from(encryptedValue, 'base64'));
}

function setStoredCredential(password: string, existingCredentialKey?: string | null) {
  const store = loadCredentialStore();
  const credentialKey = existingCredentialKey || randomUUID();
  store[credentialKey] = encryptPassword(password);
  saveCredentialStore(store);
  return credentialKey;
}

function getStoredCredential(credentialKey?: string | null) {
  if (!credentialKey) {
    return null;
  }

  const encryptedValue = loadCredentialStore()[credentialKey];
  return encryptedValue ? decryptPassword(encryptedValue) : null;
}

function deleteStoredCredential(credentialKey?: string | null) {
  if (!credentialKey) {
    return;
  }

  const store = loadCredentialStore();
  if (!(credentialKey in store)) {
    return;
  }

  delete store[credentialKey];
  saveCredentialStore(store);
}

function attachCredentialBridge(child: ChildProcess) {
  child.on('message', (message: CredentialRequestMessage) => {
    if (!message?.type || !message.requestId) {
      return;
    }

    try {
      let result: string | null = null;

      if (message.type === 'credential:get') {
        result = getStoredCredential(message.credentialKey);
      } else if (message.type === 'credential:set') {
        if (!message.password) {
          throw new Error('Password is required');
        }
        result = setStoredCredential(message.password, message.credentialKey);
      } else if (message.type === 'credential:delete') {
        deleteStoredCredential(message.credentialKey);
      } else {
        return;
      }

      child.send?.({
        type: 'credential:response',
        requestId: message.requestId,
        ok: true,
        result,
      });
    } catch (error) {
      child.send?.({
        type: 'credential:response',
        requestId: message.requestId,
        ok: false,
        error: (error as Error).message,
      });
    }
  });
}

function runBackendMigrations(env: NodeJS.ProcessEnv) {
  const prismaCliEntryPath = getPrismaCliEntryPath();
  if (!fs.existsSync(prismaCliEntryPath)) {
    throw new Error(`Prisma CLI not found at ${prismaCliEntryPath}. Install backend dependencies before launching Electron.`);
  }

  return new Promise<void>((resolve, reject) => {
    const migrateProcess = spawn(
      process.execPath,
      [prismaCliEntryPath, 'migrate', 'deploy', '--config', 'prisma/prisma.config.js'],
      {
        cwd: getBackendWorkingDirectory(),
        env: {
          ...env,
          ELECTRON_RUN_AS_NODE: '1',
        },
        stdio: 'pipe',
      },
    );

    let stderr = '';

    migrateProcess.stdout.on('data', (chunk) => {
      process.stdout.write(`[prisma] ${chunk}`);
    });

    migrateProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(`[prisma] ${text}`);
    });

    migrateProcess.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Prisma migrate deploy failed with exit code ${code}.${stderr ? ` ${stderr.trim()}` : ''}`,
        ),
      );
    });
  });
}

function waitForBackend(port: number, attempts = 40) {
  const healthUrl = `http://127.0.0.1:${port}/api/config`;

  return new Promise<void>((resolve, reject) => {
    const check = async (remainingAttempts: number) => {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // Backend not ready yet.
      }

      if (remainingAttempts <= 0) {
        reject(new Error(`Backend did not start on ${healthUrl}`));
        return;
      }

      setTimeout(() => void check(remainingAttempts - 1), 500);
    };

    void check(attempts);
  });
}

function showMainWindow() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

async function quitApplication() {
  if (isQuitting) {
    return;
  }

  isQuitting = true;
  trayController?.destroy();
  await stopBackend();
  app.quit();
}

function findAvailablePort(startPort: number) {
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Could not find an available backend port'));
    }, 10000);

    const tryPort = (port: number) => {
      const server = net.createServer();

      server.once('error', () => {
        server.close();
        tryPort(port + 1);
      });

      server.once('listening', () => {
        clearTimeout(timer);
        server.close(() => resolve(port));
      });

      server.listen(port);
    };

    tryPort(startPort);
  });
}

async function startBackend() {
  const backendEntryPath = getBackendEntryPath();
  if (!fs.existsSync(backendEntryPath)) {
    throw new Error(`Backend build not found at ${backendEntryPath}. Build backend/dist before launching Electron.`);
  }

  backendPort = await findAvailablePort(DEFAULT_BACKEND_PORT);
  const backendEnv = createBackendEnvironment(backendPort);
  await runBackendMigrations(backendEnv);

  backendProcess = spawn(process.execPath, [backendEntryPath], {
    cwd: getBackendWorkingDirectory(),
    env: {
      ...backendEnv,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });

  attachCredentialBridge(backendProcess);

  backendProcess.stdout?.on('data', (chunk) => {
    process.stdout.write(`[backend] ${chunk}`);
  });

  backendProcess.stderr?.on('data', (chunk) => {
    process.stderr.write(`[backend] ${chunk}`);
  });

  backendProcess.once('exit', (code) => {
    backendProcess = null;
    if (!isQuitting && code !== 0) {
      app.quit();
    }
  });

  await waitForBackend(backendPort);
}

function stopBackend() {
  return new Promise<void>((resolve) => {
    if (!backendProcess) {
      resolve();
      return;
    }

    const child = backendProcess;
    backendProcess = null;

    const forceKillTimer = setTimeout(() => {
      child.kill('SIGKILL');
    }, 5000);

    child.once('exit', () => {
      clearTimeout(forceKillTimer);
      resolve();
    });

    child.kill('SIGTERM');
  });
}

async function createMainWindow() {
  const frontendEntryPath = getFrontendEntryPath();
  if (!fs.existsSync(frontendEntryPath)) {
    throw new Error(`Frontend build not found at ${frontendEntryPath}. Build frontend/dist before launching Electron.`);
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    icon: getRuntimeIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  await mainWindow.loadFile(frontendEntryPath, {
    search: new url.URLSearchParams({
      apiBaseUrl: `http://127.0.0.1:${backendPort}/api`,
    }).toString(),
  });
}

async function bootstrap() {
  app.setAppUserModelId(APP_USER_MODEL_ID);
  app.setName(APP_DISPLAY_NAME);
  await app.whenReady();
  registerNotificationBridge();
  trayController = new TrayController({
    onOpen: () => showMainWindow(),
    onQuit: () => {
      void quitApplication();
    },
  });
  trayController.create();
  await startBackend();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    } else {
      showMainWindow();
    }
  });
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    return;
  }
});

bootstrap().catch(async (error) => {
  console.error(error);
  trayController?.destroy();
  await stopBackend();
  app.quit();
});
