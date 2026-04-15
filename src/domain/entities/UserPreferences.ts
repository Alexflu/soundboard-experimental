import {
  HotkeyAction,
  DEFAULT_HOTKEYS,
  HotkeyMap,
  normalizeHotkeys,
} from './HotkeyPreferences';

export class HotkeySound {
  id: string;

  name: string;

  url: string;

  constructor(id: string, name: string, url: string) {
    this.id = id;
    this.name = name;
    this.url = url;
  }
}

export type HotkeySoundMap = Partial<Record<HotkeyAction, HotkeySound>>;

export const normalizeHotkeySounds = (
  hotkeySounds?: HotkeySoundMap | null
): HotkeySoundMap =>
  Object.entries(hotkeySounds || {}).reduce((acc, [action, sound]) => {
    if (sound?.id && sound?.name && sound?.url) {
      return {
        ...acc,
        [action]: new HotkeySound(sound.id, sound.name, sound.url),
      };
    }
    return acc;
  }, {} as HotkeySoundMap);

export class UserPreferences {
  audioOutput: AudioOutput;

  pathToSoundsJson: string;

  hotkeys: HotkeyMap;

  hotkeySounds: HotkeySoundMap;

  constructor(
    audioOutput: AudioOutput,
    pathToSoundsJson: string,
    hotkeys: Partial<HotkeyMap> = DEFAULT_HOTKEYS,
    hotkeySounds: HotkeySoundMap = {}
  ) {
    this.audioOutput = audioOutput;
    this.pathToSoundsJson = pathToSoundsJson;
    this.hotkeys = normalizeHotkeys(hotkeys);
    this.hotkeySounds = normalizeHotkeySounds(hotkeySounds);
  }

  setAudioOutput(audioOutput: AudioOutput): UserPreferences {
    return new UserPreferences(
      audioOutput,
      this.pathToSoundsJson,
      this.hotkeys,
      this.hotkeySounds
    );
  }

  setPathToSoundsJson(pathToSoundsJson: string): UserPreferences {
    return new UserPreferences(
      this.audioOutput,
      pathToSoundsJson,
      this.hotkeys,
      this.hotkeySounds
    );
  }

  setHotkeys(hotkeys: Partial<HotkeyMap>): UserPreferences {
    return new UserPreferences(
      this.audioOutput,
      this.pathToSoundsJson,
      hotkeys,
      this.hotkeySounds
    );
  }

  setHotkeySounds(hotkeySounds: HotkeySoundMap): UserPreferences {
    return new UserPreferences(
      this.audioOutput,
      this.pathToSoundsJson,
      this.hotkeys,
      hotkeySounds
    );
  }

  setHotkeySound(
    action: HotkeyAction,
    hotkeySound: HotkeySound
  ): UserPreferences {
    return this.setHotkeySounds({
      ...this.hotkeySounds,
      [action]: hotkeySound,
    });
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
