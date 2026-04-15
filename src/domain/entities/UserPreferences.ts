import {
  DEFAULT_HOTKEYS,
  HotkeyMap,
  normalizeHotkeys,
} from './HotkeyPreferences';

export class UserPreferences {
  audioOutput: AudioOutput;

  pathToSoundsJson: string;

  hotkeys: HotkeyMap;

  constructor(
    audioOutput: AudioOutput,
    pathToSoundsJson: string,
    hotkeys: Partial<HotkeyMap> = DEFAULT_HOTKEYS
  ) {
    this.audioOutput = audioOutput;
    this.pathToSoundsJson = pathToSoundsJson;
    this.hotkeys = normalizeHotkeys(hotkeys);
  }

  setAudioOutput(audioOutput: AudioOutput): UserPreferences {
    return new UserPreferences(audioOutput, this.pathToSoundsJson, this.hotkeys);
  }

  setPathToSoundsJson(pathToSoundsJson: string): UserPreferences {
    return new UserPreferences(this.audioOutput, pathToSoundsJson, this.hotkeys);
  }

  setHotkeys(hotkeys: Partial<HotkeyMap>): UserPreferences {
    return new UserPreferences(this.audioOutput, this.pathToSoundsJson, hotkeys);
  }
}

export class AudioOutput {
  id: string;

  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}
