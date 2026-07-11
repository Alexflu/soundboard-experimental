import path from 'path';
import Sound from '../../domain/entities/Sound';
import Source from '../../domain/entities/Source';
import { LocalSoundJsonData } from './LocalSoundFileJson';

class LocalSoundJson {
  activationKeysNumbers: number[];

  file: string;

  constructor(activationKeysNumbers: number[], file: string) {
    this.activationKeysNumbers = activationKeysNumbers;
    this.file = file;
  }

  static fromLocalSoundJson(soundJson: LocalSoundJsonData) {
    return new LocalSoundJson(
      soundJson.activationKeysNumbers || [],
      soundJson.file
    );
  }

  toSound(): Sound {
    const isWindowsPath = /^[A-Za-z]:[\\/]/.test(this.file);
    const pathParser = isWindowsPath ? path.win32 : path.posix;
    const name =
      pathParser.basename(this.file, pathParser.extname(this.file)) ||
      'Untitled sound';
    const description = pathParser.basename(pathParser.dirname(this.file));
    const normalizedPath = isWindowsPath
      ? this.file.replace(/\\/g, '/')
      : this.file;
    const fileUrl = new URL(
      isWindowsPath ? `file:///${normalizedPath}` : `file://${normalizedPath}`
    ).href;

    return new Sound(name, description, fileUrl, Source.LOCAL);
  }
}

export default LocalSoundJson;
