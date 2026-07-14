import { BrowserWindow, Menu, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? MenuBuilder.buildDarwinTemplate()
        : this.buildDefaultTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;
      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => this.mainWindow.webContents.inspectElement(x, y),
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  private static buildDarwinTemplate(): MenuItemConstructorOptions[] {
    return [
      { role: 'appMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      MenuBuilder.buildHelpMenu(),
    ];
  }

  buildDefaultTemplate(): MenuItemConstructorOptions[] {
    const viewItems: MenuItemConstructorOptions[] = [];
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      viewItems.push(
        {
          label: '&Reload',
          accelerator: 'Ctrl+R',
          click: () => this.mainWindow.webContents.reload(),
        },
        {
          label: 'Toggle &Developer Tools',
          accelerator: 'Alt+Ctrl+I',
          click: () => this.mainWindow.webContents.toggleDevTools(),
        }
      );
    }
    viewItems.push({
      label: 'Toggle &Full Screen',
      accelerator: 'F11',
      click: () =>
        this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen()),
    });

    return [
      {
        label: '&File',
        submenu: [
          {
            label: '&Close',
            click: () => this.mainWindow.close(),
          },
        ],
      },
      { label: '&View', submenu: viewItems },
      MenuBuilder.buildHelpMenu(),
    ];
  }

  private static buildHelpMenu(): MenuItemConstructorOptions {
    return {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: () => shell.openExternal('https://electronjs.org'),
        },
        {
          label: 'Documentation',
          click: () =>
            shell.openExternal(
              'https://github.com/electron/electron/tree/master/docs#readme'
            ),
        },
      ],
    };
  }
}
