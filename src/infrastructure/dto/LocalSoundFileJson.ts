import LocalSoundJson from './LocalSoundJson';

export default class LocalSoundFileJson {
  soundboardEntries: LocalSoundJson[];

  constructor(soundboardEntries: LocalSoundJson[]) {
    this.soundboardEntries = soundboardEntries;
  }
}
