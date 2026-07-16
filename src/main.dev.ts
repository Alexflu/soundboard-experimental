/* eslint global-require: off, no-console: off */

import fs from 'fs';
import path from 'path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  shell,
  Tray,
  session,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import PassiveShortcutManager, {
  PassiveKeyboardHook,
} from './infrastructure/PassiveShortcutManager';

type UiohookModule = {
  uIOhook: PassiveKeyboardHook;
  UiohookKey: Record<string, number>;
};

type RecordingSavePayload = {
  data: ArrayBuffer | Uint8Array;
  directory?: string;
  extension?: string;
};

const initializeAppUpdater = () => {
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();
};

let mainWindow: BrowserWindow | null = null;
let shortcutManager: PassiveShortcutManager | null = null;
let tray: Tray | null = null;

const getDefaultRecordingPath = () =>
  path.join(app.getPath('userData'), 'Recordings');

const ensureDirectory = (directory: string) => {
  fs.mkdirSync(directory, { recursive: true });
  return directory;
};

const initializePassiveShortcuts = () => {
  if (shortcutManager) {
    return true;
  }

  try {
    const { uIOhook, UiohookKey } = require('uiohook-napi') as UiohookModule;
    const manager = new PassiveShortcutManager(
      uIOhook,
      UiohookKey,
      (accelerator) => {
        mainWindow?.webContents.send('shortcut:triggered', accelerator);
      }
    );
    if (!manager.start()) {
      log.error('Passive global keyboard listener could not start');
      return false;
    }
    shortcutManager = manager;
    return true;
  } catch (error) {
    log.error('Passive global keyboard listener is unavailable', error);
    return false;
  }
};

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const installExtensions = async () => {
  const reactDevToolsPath = process.env.REACT_DEVELOPER_TOOLS_PATH;
  if (!reactDevToolsPath) {
    return;
  }

  try {
    await session.defaultSession.loadExtension(reactDevToolsPath, {
      allowFileAccess: true,
    });
  } catch {
    // React DevTools are optional in development.
  }
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string =>
    path.join(resourcesPath, ...paths);

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    frame: false,
    icon: getAssetPath('logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  initializePassiveShortcuts();

  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:hide', () => {
    mainWindow?.hide();
  });

  ipcMain.on('app:getPath', (event, pathName) => {
    event.returnValue = app.getPath(pathName);
  });

  ipcMain.on('recording:get-default-path', (event) => {
    event.returnValue = ensureDirectory(getDefaultRecordingPath());
  });

  ipcMain.on('shortcut:register', (event, accelerator: string) => {
    event.returnValue = shortcutManager?.register(accelerator) ?? false;
  });

  ipcMain.on('shortcut:unregister', (_event, accelerator: string) => {
    shortcutManager?.unregister(accelerator);
  });

  ipcMain.on('shortcut:suspend', (event) => {
    shortcutManager?.suspend();
    event.returnValue = shortcutManager !== null;
  });

  ipcMain.on('shortcut:resume', () => {
    shortcutManager?.resume();
  });

  ipcMain.handle(
    'dialog:choose-sounds-json',
    async (_event, currentPath?: string) => {
      const window = mainWindow;
      if (!window) {
        return '';
      }

      const defaultPath = currentPath
        ? path.dirname(currentPath)
        : app.getPath('userData');
      const result = await dialog.showOpenDialog(window, {
        defaultPath,
        properties: ['openFile'],
        filters: [{ name: 'JSON files', extensions: ['json'] }],
      });
      return result.canceled ? '' : result.filePaths[0] || '';
    }
  );

  ipcMain.handle(
    'dialog:choose-recording-folder',
    async (_event, currentPath?: string) => {
      const window = mainWindow;
      if (!window) {
        return '';
      }
      const result = await dialog.showOpenDialog(window, {
        defaultPath: currentPath || getDefaultRecordingPath(),
        properties: ['openDirectory', 'createDirectory'],
      });
      return result.canceled ? '' : result.filePaths[0] || '';
    }
  );

  ipcMain.handle(
    'recording:open-folder',
    async (_event, recordingPath?: string) =>
      shell.openPath(
        ensureDirectory(recordingPath || getDefaultRecordingPath())
      )
  );

  ipcMain.handle(
    'recording:save',
    async (_event, payload: RecordingSavePayload) => {
      const directory = ensureDirectory(
        payload.directory || getDefaultRecordingPath()
      );
      const extension = payload.extension === 'ogg' ? 'ogg' : 'webm';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(
        directory,
        `recording-${timestamp}.${extension}`
      );
      fs.writeFileSync(filePath, Buffer.from(payload.data));
      return filePath;
    }
  );

  const logoIco = nativeImage
    .createFromPath(getAssetPath('logo.ico'))
    .resize({ width: 16, height: 16 });
  tray = new Tray(logoIco);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show App',
        click() {
          mainWindow?.show();
        },
      },
      {
        label: 'Quit',
        click() {
          app.quit();
        },
      },
    ])
  );
  tray.setToolTip('Soundboard');
  tray.setIgnoreDoubleClickEvents(true);
  tray.on('click', () => mainWindow?.show());

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) {
      return;
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription) => {
      log.error(`Renderer failed to load (${errorCode}): ${errorDescription}`);
    }
  );

  await mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
    initializeAppUpdater();
  }
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  shortcutManager?.stop();
  shortcutManager = null;
  tray?.destroy();
  tray = null;
  ipcMain.removeAllListeners('window:minimize');
  ipcMain.removeAllListeners('window:toggle-maximize');
  ipcMain.removeAllListeners('window:hide');
  ipcMain.removeAllListeners('app:getPath');
  ipcMain.removeAllListeners('recording:get-default-path');
  ipcMain.removeAllListeners('shortcut:register');
  ipcMain.removeAllListeners('shortcut:unregister');
  ipcMain.removeAllListeners('shortcut:suspend');
  ipcMain.removeAllListeners('shortcut:resume');
  ipcMain.removeHandler('dialog:choose-sounds-json');
  ipcMain.removeHandler('dialog:choose-recording-folder');
  ipcMain.removeHandler('recording:open-folder');
  ipcMain.removeHandler('recording:save');
});

app
  .whenReady()
  .then(createWindow)
  .catch((error) => log.error(error));

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow().catch((error) => log.error(error));
  }
});
