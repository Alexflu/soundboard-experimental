export type LocalSoundJsonData = {
  activationKeysNumbers: number[];
  file: string;
};

export default class LocalSoundFileJson {
  soundboardEntries: LocalSoundJsonData[];

  constructor(soundboardEntries: LocalSoundJsonData[]) {
    this.soundboardEntries = soundboardEntries;
  }
}
