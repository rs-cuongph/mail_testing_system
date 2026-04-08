import { Menu, Tray, app, nativeImage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

type TrayControllerOptions = {
  onOpen: () => void;
  onQuit: () => void;
};

export class TrayController {
  private tray: Tray | null = null;

  constructor(private readonly options: TrayControllerOptions) {}

  create() {
    if (this.tray) {
      return this.tray;
    }

    const icon = this.resolveTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('Mail Catcher');
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: 'Open',
          click: () => this.options.onOpen(),
        },
        {
          type: 'separator',
        },
        {
          label: 'Quit',
          click: () => this.options.onQuit(),
        },
      ]),
    );
    this.tray.on('double-click', () => this.options.onOpen());

    return this.tray;
  }

  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }

  private resolveTrayIcon() {
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icon.png')
      : path.resolve(__dirname, '..', 'build', 'icon.png');

    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath);
    }

    return nativeImage.createEmpty();
  }
}
