import fs from 'fs';
import path from 'path';
import { toast } from 'react-toastify';
import LocalSoundFileJson, {
  LocalSoundJsonData,
} from './dto/LocalSoundFileJson';
import LocalSoundJson from './dto/LocalSoundJson';
import Sound from '../domain/entities/Sound';

type DropPosition = 'before' | 'after';

class LocalSoundAdapter {
  getSounds(pathToSoundsJson: string): Sound[] {
    const localSoundsFileJson = this.readSoundsFile(pathToSoundsJson);

    return localSoundsFileJson.soundboardEntries
      .filter(
        (entry) =>
          typeof entry?.file === 'string' &&
          entry.file.trim().length > 0 &&
          fs.existsSync(entry.file)
      )
      .map((localSoundJson) =>
        LocalSoundJson.fromLocalSoundJson(localSoundJson)
      )
      .map((localSoundJson) => localSoundJson.toSound());
  }

  addSound(pathToSoundsJson: string, soundPath: string) {
    if (!soundPath || !fs.existsSync(soundPath)) {
      toast.info(`Cannot add file ${soundPath || '(unknown path)'}`);
      return;
    }

    try {
      const localSoundsFileJson = this.readSoundsFile(pathToSoundsJson);
      const pathParser = /^[A-Za-z]:[\\/]/.test(soundPath)
        ? path.win32
        : path.posix;
      const name =
        pathParser.basename(soundPath, pathParser.extname(soundPath)) ||
        'Untitled sound';
      localSoundsFileJson.soundboardEntries.push(
        new LocalSoundJson([], soundPath, name, 1)
      );
      LocalSoundAdapter.writeSoundsFile(pathToSoundsJson, localSoundsFileJson);
    } catch (error) {
      toast.info(`Cannot add file ${soundPath}`);
    }
  }

  removeSound(pathToSoundsJson: string, soundPath: string) {
    try {
      const localSoundsFileJson = this.readSoundsFile(pathToSoundsJson);
      localSoundsFileJson.soundboardEntries = localSoundsFileJson.soundboardEntries.filter(
        (sound) => LocalSoundAdapter.toFileUrl(sound.file) !== soundPath
      );
      LocalSoundAdapter.writeSoundsFile(pathToSoundsJson, localSoundsFileJson);
    } catch (error) {
      toast.info(`Cannot remove file ${soundPath}`);
    }
  }

  setSoundVolume(pathToSoundsJson: string, soundPath: string, volume: number) {
    try {
      const localSoundsFileJson = this.readSoundsFile(pathToSoundsJson);
      const normalizedVolume = Math.min(1, Math.max(0, volume));
      localSoundsFileJson.soundboardEntries.forEach((entry) => {
        if (LocalSoundAdapter.toFileUrl(entry.file) === soundPath) {
          entry.volume = normalizedVolume;
        }
      });
      LocalSoundAdapter.writeSoundsFile(pathToSoundsJson, localSoundsFileJson);
    } catch (error) {
      toast.info('Cannot save sound volume');
    }
  }

  reorderSounds(
    pathToSoundsJson: string,
    sourceSoundPath: string,
    targetSoundPath: string,
    position: DropPosition = 'after'
  ) {
    if (sourceSoundPath === targetSoundPath) {
      return;
    }

    try {
      const localSoundsFileJson = this.readSoundsFile(pathToSoundsJson);
      const entries = localSoundsFileJson.soundboardEntries;
      const sourceIndex = LocalSoundAdapter.findEntryIndex(
        entries,
        sourceSoundPath
      );
      if (sourceIndex < 0) {
        return;
      }

      const [movedEntry] = entries.splice(sourceIndex, 1);
      const targetIndex = LocalSoundAdapter.findEntryIndex(
        entries,
        targetSoundPath
      );
      if (targetIndex < 0) {
        return;
      }

      entries.splice(
        targetIndex + (position === 'after' ? 1 : 0),
        0,
        movedEntry
      );
      LocalSoundAdapter.writeSoundsFile(pathToSoundsJson, localSoundsFileJson);
    } catch (error) {
      toast.info('Cannot reorder sounds');
    }
  }

  private static findEntryIndex(
    entries: LocalSoundJsonData[],
    soundPath: string
  ) {
    return entries.findIndex(
      (entry) => LocalSoundAdapter.toFileUrl(entry.file) === soundPath
    );
  }

  private readSoundsFile(pathToSoundsJson: string): LocalSoundFileJson {
    try {
      const rawData = fs.readFileSync(pathToSoundsJson, 'utf8');
      return this.parseJson(rawData);
    } catch (error) {
      toast.info(
        `Cannot read file ${pathToSoundsJson}, please set sounds.json in settings`
      );
      return new LocalSoundFileJson([]);
    }
  }

  private static writeSoundsFile(
    pathToSoundsJson: string,
    localSoundsFileJson: LocalSoundFileJson
  ) {
    fs.writeFileSync(
      pathToSoundsJson,
      JSON.stringify(localSoundsFileJson),
      'utf8'
    );
  }

  private parseJson(rawData: Buffer | string): LocalSoundFileJson {
    try {
      const parsed = JSON.parse(rawData.toString());
      return new LocalSoundFileJson(
        Array.isArray(parsed.soundboardEntries) ? parsed.soundboardEntries : []
      );
    } catch {
      toast.error(`${this.constructor.name}: Cannot parse sounds json file`);
      return new LocalSoundFileJson([]);
    }
  }

  private static toFileUrl(filePath: string): string {
    const isWindowsPath = /^[A-Za-z]:[\\/]/.test(filePath);
    const normalizedPath = isWindowsPath
      ? filePath.replace(/\\/g, '/')
      : filePath;
    return new URL(
      isWindowsPath ? `file:///${normalizedPath}` : `file://${normalizedPath}`
    ).href;
  }
}

export default LocalSoundAdapter;
