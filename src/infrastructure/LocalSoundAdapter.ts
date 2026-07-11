import fs from 'fs';
import { pathToFileURL } from 'url';
import { toast } from 'react-toastify';
import LocalSoundFileJson from './dto/LocalSoundFileJson';
import LocalSoundJson from './dto/LocalSoundJson';
import Sound from '../domain/entities/Sound';

class LocalSoundAdapter {
  getSounds(pathToSoundsJson: string): Sound[] {
    let rawData: string | undefined;
    try {
      rawData = fs.readFileSync(pathToSoundsJson, 'utf8');
    } catch (error) {
      toast.info(
        `Cannot read file ${pathToSoundsJson}, please set sounds.json in settings`
      );
    }

    const localSoundsFileJson: LocalSoundFileJson = rawData
      ? this.parseJson(rawData)
      : new LocalSoundFileJson([]);

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
      const rawData = fs.readFileSync(pathToSoundsJson, 'utf8');
      const localSoundsFileJson = this.parseJson(rawData);
      localSoundsFileJson.soundboardEntries.push(
        new LocalSoundJson([], soundPath)
      );
      fs.writeFileSync(
        pathToSoundsJson,
        JSON.stringify(localSoundsFileJson),
        'utf8'
      );
    } catch (error) {
      toast.info(`Cannot add file ${soundPath}`);
    }
  }

  removeSound(pathToSoundsJson: string, soundPath: string) {
    try {
      const rawData = fs.readFileSync(pathToSoundsJson, 'utf8');
      const localSoundsFileJson = this.parseJson(rawData);
      localSoundsFileJson.soundboardEntries = localSoundsFileJson.soundboardEntries.filter(
        (sound) => pathToFileURL(sound.file).href !== soundPath
      );
      fs.writeFileSync(
        pathToSoundsJson,
        JSON.stringify(localSoundsFileJson),
        'utf8'
      );
    } catch (error) {
      toast.info(`Cannot remove file ${soundPath}`);
    }
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
}

export default LocalSoundAdapter;
