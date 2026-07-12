export type LocalSoundJsonData = {
  activationKeysNumbers?: number[];
  file: string;
  name?: string;
  volume?: number;
};

export default class LocalSoundFileJson {
  soundboardEntries: LocalSoundJsonData[];

  constructor(soundboardEntries: LocalSoundJsonData[]) {
    this.soundboardEntries = soundboardEntries;
  }
}
