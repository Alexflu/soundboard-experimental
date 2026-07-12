import path from 'path';
import Sound from '../../domain/entities/Sound';
import Source from '../../domain/entities/Source';
import { LocalSoundJsonData } from './LocalSoundFileJson';

class LocalSoundJson {
  activationKeysNumbers: number[];

  file: string;

  name?: string;

  volume: number;

  constructor(
    activationKeysNumbers: number[],
    file: string,
    name?: string,
    volume = 1
  ) {
    this.activationKeysNumbers = activationKeysNumbers;
    this.file = file;
    this.name = name;
    this.volume = Math.min(1, Math.max(0, volume));
  }

  static fromLocalSoundJson(soundJson: LocalSoundJsonData) {
    return new LocalSoundJson(
      soundJson.activationKeysNumbers || [],
      soundJson.file,
      soundJson.name,
      typeof soundJson.volume === 'number' ? soundJson.volume : 1
    );
  }

  toSound(): Sound {
    const isWindowsPath = /^[A-Za-z]:[\\/]/.test(this.file);
    const pathParser = isWindowsPath ? path.win32 : path.posix;
    const derivedName =
      pathParser.basename(this.file, pathParser.extname(this.file)) ||
      'Untitled sound';
    const description = pathParser.basename(pathParser.dirname(this.file));
    const normalizedPath = isWindowsPath
      ? this.file.replace(/\\/g, '/')
      : this.file;
    const fileUrl = new URL(
      isWindowsPath ? `file:///${normalizedPath}` : `file://${normalizedPath}`
    ).href;

    return new Sound(
      this.name || derivedName,
      description,
      fileUrl,
      Source.LOCAL,
      this.volume
    );
  }
}

export default LocalSoundJson;
