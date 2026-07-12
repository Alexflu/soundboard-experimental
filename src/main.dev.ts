/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable/index.js';
import 'regenerator-runtime/runtime.js';
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
import log from 'electron-log';
import MenuBuilder from './menu';
import PassiveShortcutManager, {
  PassiveKeyboardHook,
} from './infrastructure/PassiveShortcutManager';

const { autoUpdater } = require('electron-updater');

type UiohookModule = {
  uIOhook: PassiveKeyboardHook;
  UiohookKey: Record<string, number>;
};

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let shortcutManager: PassiveShortcutManager | null = null;

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

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
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
let tray;
const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

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

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater();
  }
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  shortcutManager?.stop();
  shortcutManager = null;
  ipcMain.removeAllListeners('window:minimize');
  ipcMain.removeAllListeners('window:toggle-maximize');
  ipcMain.removeAllListeners('window:hide');
  ipcMain.removeAllListeners('app:getPath');
  ipcMain.removeAllListeners('shortcut:register');
  ipcMain.removeAllListeners('shortcut:unregister');
  ipcMain.removeAllListeners('shortcut:suspend');
  ipcMain.removeAllListeners('shortcut:resume');
  ipcMain.removeHandler('dialog:choose-sounds-json');
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it is common to re-create a window if there are no windows open.
  if (mainWindow === null) createWindow();
});
