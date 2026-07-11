import path from 'path';
import { pathToFileURL } from 'url';
import Sound from '../../domain/entities/Sound';
import Source from '../../domain/entities/Source';

class LocalSoundJson {
  activationKeysNumbers: number[];

  file: string;

  constructor(activationKeysNumbers: number[], file: string) {
    this.activationKeysNumbers = activationKeysNumbers;
    this.file = file;
  }

  static fromLocalSoundJson(soundJson: LocalSoundJson) {
    return new LocalSoundJson(
      soundJson.activationKeysNumbers || [],
      soundJson.file
    );
  }

  toSound(): Sound {
    const name = path.basename(this.file, path.extname(this.file)) || 'Untitled sound';
    const description = path.basename(path.dirname(this.file));
    return new Sound(
      name,
      description,
      pathToFileURL(this.file).href,
      Source.LOCAL
    );
  }
}

export default LocalSoundJson;