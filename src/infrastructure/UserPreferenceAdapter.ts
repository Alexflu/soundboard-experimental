import { app, remote } from 'electron';
import fs from 'fs';
import {
  AudioOutput,
  UserPreferences,
} from '../domain/entities/UserPreferences';
import { normalizeHotkeys } from '../domain/entities/HotkeyPreferences';

const path = require('path');

class UserPreferenceAdapter {
  path: string;

  userPreferences: UserPreferences;

  private preferenceWatcher?: fs.WatchFileListener;

  private readonly changeListeners: Array<
    (preferences: UserPreferences) => void
  >;

  constructor() {
    this.path = UserPreferenceAdapter.getFilePath('user-preferences.json');
    this.userPreferences = UserPreferenceAdapter.parseDataFile(this.path);
    this.changeListeners = [];
  }

  getUserPreferences() {
    return this.userPreferences;
  }

  set(userPreferences: UserPreferences) {
    this.userPreferences = userPreferences;
    fs.writeFileSync(this.path, JSON.stringify(this.userPreferences));
  }

  watch(onChange: (preferences: UserPreferences) => void): () => void {
    this.changeListeners.push(onChange);
    this.ensurePreferenceWatcher();

    return () => {
      this.removeListener(onChange);
      if (this.changeListeners.length === 0) {
        this.disposeWatcher();
      }
    };
  }

  disposeWatcher() {
    if (this.preferenceWatcher) {
      fs.unwatchFile(this.path, this.preferenceWatcher);
      this.preferenceWatcher = undefined;
    }
  }

  private ensurePreferenceWatcher() {
    if (this.preferenceWatcher) {
      return;
    }

    const listener: fs.WatchFileListener = (current, previous) => {
      if (current.mtimeMs === previous.mtimeMs) {
        return;
      }
      this.reloadFromDisk();
    };

    fs.watchFile(this.path, { interval: 300 }, listener);
    this.preferenceWatcher = listener;
  }

  private reloadFromDisk() {
    const updatedPreferences = UserPreferenceAdapter.tryParseDataFile(
      this.path
    );
    if (!updatedPreferences) {
      return;
    }
    this.userPreferences = updatedPreferences;
    this.changeListeners.forEach((listener) => listener(this.userPreferences));
  }

  private removeListener(onChange: (preferences: UserPreferences) => void) {
    const listenerIndex = this.changeListeners.indexOf(onChange);
    if (listenerIndex >= 0) {
      this.changeListeners.splice(listenerIndex, 1);
    }
  }

  private static parseDataFile(filePath: string): UserPreferences {
    return (
      UserPreferenceAdapter.tryParseDataFile(filePath) ||
      new UserPreferences(
        new AudioOutput('default', 'default'),
        UserPreferenceAdapter.getOrCreateEmptySoundsListFile()
      )
    );
  }

  private static tryParseDataFile(filePath: string): UserPreferences | null {
    try {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return new UserPreferences(
        json.audioOutput,
        json.pathToSoundsJson,
        normalizeHotkeys(json.hotkeys)
      );
    } catch (error) {
      return null;
    }
  }

  private static getOrCreateEmptySoundsListFile(): string {
    const filePath = UserPreferenceAdapter.getFilePath('sounds.json');
    if (!fs.existsSync(filePath)) {
      const defaultSoundPath = app?.isPackaged
        ? path.join(process.resourcesPath, 'assets', 'oof.mp3')
        : path.join(__dirname, '../assets', 'oof.mp3');
      fs.writeFileSync(
        filePath,
        `{"soundboardEntries": [{"file": "${defaultSoundPath}"}]}`
      );
    }
    return filePath;
  }

  private static getFilePath(name: string): string {
    const myApp = app || remote?.app;
    const userDataPath = myApp ? myApp.getPath('userData') : '';
    return path.join(userDataPath, name);
  }
}

export default UserPreferenceAdapter;
