import {
  DEFAULT_SEARCH_SLOT_HOTKEYS,
  LegacyHotkeyMap,
  LEGACY_SEARCH_SLOT_ACTIONS,
  HotkeyMap,
  normalizeHotkeys,
} from './HotkeyPreferences';
import AudioOutput from './AudioOutput';
import HotkeySound from './HotkeySound';

export { default as AudioOutput } from './AudioOutput';
export { default as HotkeySound } from './HotkeySound';

export type HotkeyBinding = {
  key: string;
  sound: HotkeySound;
};

export type SoundTrim = {
  startTime: number;
  endTime?: number;
};

export type SoundTrimMap = Record<string, SoundTrim>;

const normalizeSoundTrim = (
  trim?: Partial<SoundTrim> | null
): SoundTrim => {
  const startTime =
    typeof trim?.startTime === 'number' && Number.isFinite(trim.startTime)
      ? Math.max(0, trim.startTime)
      : 0;
  const endTime =
    typeof trim?.endTime === 'number' &&
    Number.isFinite(trim.endTime) &&
    trim.endTime > startTime
      ? trim.endTime
      : undefined;

  return endTime === undefined ? { startTime } : { startTime, endTime };
};

export const normalizeSoundTrims = (
  soundTrims?: Record<string, Partial<SoundTrim>> | null
): SoundTrimMap =>
  Object.entries(soundTrims || {}).reduce((normalized, [soundId, trim]) => {
    if (!soundId) {
      return normalized;
    }

    const nextTrim = normalizeSoundTrim(trim);
    if (nextTrim.startTime > 0 || nextTrim.endTime !== undefined) {
      normalized[soundId] = nextTrim;
    }
    return normalized;
  }, {} as SoundTrimMap);

export type RandomSoundPool = 'local' | 'bound';

export type HotkeySettings = {
  pianoKeysEnabled: boolean;
  allowMultipleSoundsPerHotkey: boolean;
  randomSoundPool: RandomSoundPool;
};

export const DEFAULT_HOTKEY_SETTINGS: HotkeySettings = {
  pianoKeysEnabled: false,
  allowMultipleSoundsPerHotkey: false,
  randomSoundPool: 'local',
};

export const normalizeHotkeySettings = (
  settings?: Partial<HotkeySettings> | null
): HotkeySettings => ({
  pianoKeysEnabled:
    settings?.pianoKeysEnabled ?? DEFAULT_HOTKEY_SETTINGS.pianoKeysEnabled,
  allowMultipleSoundsPerHotkey:
    settings?.allowMultipleSoundsPerHotkey ??
    DEFAULT_HOTKEY_SETTINGS.allowMultipleSoundsPerHotkey,
  randomSoundPool: settings?.randomSoundPool === 'bound' ? 'bound' : 'local',
});

export type HotkeySoundMap = Partial<
  Record<(typeof LEGACY_SEARCH_SLOT_ACTIONS)[number], HotkeySound>
>;

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

const normalizeBindingsFromList = (bindings?: HotkeyBinding[] | null) =>
  (bindings || []).reduce((acc, binding) => {
    if (
      binding?.key &&
      binding?.sound?.id &&
      binding?.sound?.name &&
      binding?.sound?.url
    ) {
      const normalizedBinding = {
        key: binding.key,
        sound: new HotkeySound(
          binding.sound.id,
          binding.sound.name,
          binding.sound.url,
          binding.sound.source,
          binding.sound.volume
        ),
      };

      return acc
        .filter(
          (existingBinding) =>
            existingBinding.sound.id !== normalizedBinding.sound.id
        )
        .concat(normalizedBinding);
    }
    return acc;
  }, [] as HotkeyBinding[]);

const normalizeBindingsFromLegacy = (
  legacyHotkeySounds: HotkeySoundMap,
  legacyHotkeys?: LegacyHotkeyMap | null
) =>
  LEGACY_SEARCH_SLOT_ACTIONS.reduce((acc, action, index) => {
    const sound = legacyHotkeySounds[action];
    if (!sound) {
      return acc;
    }

    const key = legacyHotkeys?.[action] || DEFAULT_SEARCH_SLOT_HOTKEYS[index];
    return acc.concat({ key, sound });
  }, [] as HotkeyBinding[]);

export const normalizeBindings = (
  bindings?: HotkeyBinding[] | null,
  legacyHotkeySounds?: HotkeySoundMap | null,
  legacyHotkeys?: LegacyHotkeyMap | null
): HotkeyBinding[] => {
  const normalizedBindings = normalizeBindingsFromList(bindings);
  if (normalizedBindings.length > 0) {
    return normalizedBindings;
  }

  return normalizeBindingsFromLegacy(
    normalizeHotkeySounds(legacyHotkeySounds),
    legacyHotkeys
  );
};

export class UserPreferences {
  audioOutput: AudioOutput;

  pathToSoundsJson: string;

  hotkeys: HotkeyMap;

  bindings: HotkeyBinding[];

  hotkeySettings: HotkeySettings;

  soundTrims: SoundTrimMap;

  constructor(
    audioOutput: AudioOutput,
    pathToSoundsJson: string,
    hotkeys: Partial<HotkeyMap> = {},
    bindings: HotkeyBinding[] = [],
    legacyHotkeySounds?: HotkeySoundMap,
    legacyHotkeys?: LegacyHotkeyMap,
    hotkeySettings: Partial<HotkeySettings> = {},
    soundTrims: Record<string, Partial<SoundTrim>> = {}
  ) {
    this.audioOutput = audioOutput;
    this.pathToSoundsJson = pathToSoundsJson;
    this.hotkeys = normalizeHotkeys(hotkeys);
    this.hotkeySettings = normalizeHotkeySettings(hotkeySettings);
    this.bindings = normalizeBindings(
      bindings,
      legacyHotkeySounds,
      legacyHotkeys
    );
    this.soundTrims = normalizeSoundTrims(soundTrims);
  }

  private copy(
    overrides: Partial<{
      audioOutput: AudioOutput;
      pathToSoundsJson: string;
      hotkeys: Partial<HotkeyMap>;
      bindings: HotkeyBinding[];
      hotkeySettings: Partial<HotkeySettings>;
      soundTrims: SoundTrimMap;
    }> = {}
  ): UserPreferences {
    return new UserPreferences(
      overrides.audioOutput || this.audioOutput,
      overrides.pathToSoundsJson || this.pathToSoundsJson,
      overrides.hotkeys || this.hotkeys,
      overrides.bindings || this.bindings,
      undefined,
      undefined,
      overrides.hotkeySettings || this.hotkeySettings,
      overrides.soundTrims || this.soundTrims
    );
  }

  setAudioOutput(audioOutput: AudioOutput): UserPreferences {
    return this.copy({ audioOutput });
  }

  setPathToSoundsJson(pathToSoundsJson: string): UserPreferences {
    return this.copy({ pathToSoundsJson });
  }

  setHotkeys(hotkeys: Partial<HotkeyMap>): UserPreferences {
    return this.copy({ hotkeys });
  }

  setBindings(bindings: HotkeyBinding[]): UserPreferences {
    return this.copy({ bindings });
  }

  setHotkeySettings(hotkeySettings: Partial<HotkeySettings>): UserPreferences {
    return this.copy({
      hotkeySettings: {
        ...this.hotkeySettings,
        ...hotkeySettings,
      },
    });
  }

  setSoundTrim(
    soundId: string,
    startTime: number,
    endTime?: number
  ): UserPreferences {
    if (!soundId) {
      return this;
    }

    const soundTrims = { ...this.soundTrims };
    const trim = normalizeSoundTrim({ startTime, endTime });
    if (trim.startTime === 0 && trim.endTime === undefined) {
      delete soundTrims[soundId];
    } else {
      soundTrims[soundId] = trim;
    }
    return this.copy({ soundTrims });
  }

  upsertBinding(key: string, sound: HotkeySound): UserPreferences {
    const withoutCurrentSound = this.bindings.filter(
      (binding) => binding.sound.id !== sound.id
    );
    const compatibleBindings = this.hotkeySettings.allowMultipleSoundsPerHotkey
      ? withoutCurrentSound
      : withoutCurrentSound.filter((binding) => binding.key !== key);

    return this.setBindings(compatibleBindings.concat({ key, sound }));
  }

  removeBinding(key: string, soundId?: string): UserPreferences {
    return this.setBindings(
      this.bindings.filter(
        (binding) =>
          binding.key !== key ||
          (soundId !== undefined && binding.sound.id !== soundId)
      )
    );
  }

  updateBindingKey(
    previousKey: string,
    nextKey: string,
    soundId?: string
  ): UserPreferences {
    const bindingToUpdate = this.bindings.find(
      (binding) =>
        binding.key === previousKey &&
        (soundId === undefined || binding.sound.id === soundId)
    );
    if (!bindingToUpdate) {
      return this;
    }

    const compatibleBindings = this.bindings.filter(
      (binding) =>
        binding === bindingToUpdate ||
        this.hotkeySettings.allowMultipleSoundsPerHotkey ||
        binding.key !== nextKey
    );

    return this.setBindings(
      compatibleBindings.map((binding) =>
        binding === bindingToUpdate
          ? { key: nextKey, sound: bindingToUpdate.sound }
          : binding
      )
    );
  }

  reorderBindings(
    sourceSoundId: string,
    targetSoundId: string
  ): UserPreferences {
    const sourceIndex = this.bindings.findIndex(
      (binding) => binding.sound.id === sourceSoundId
    );
    const targetIndex = this.bindings.findIndex(
      (binding) => binding.sound.id === targetSoundId
    );
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return this;
    }

    const reordered = [...this.bindings];
    const [sourceBinding] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, sourceBinding);
    return this.setBindings(reordered);
  }

  setBindingVolume(
    key: string,
    soundId: string,
    volume: number
  ): UserPreferences {
    const binding = this.bindings.find(
      (entry) => entry.key === key && entry.sound.id === soundId
    );
    if (!binding) {
      return this;
    }

    const updatedSound = new HotkeySound(
      binding.sound.id,
      binding.sound.name,
      binding.sound.url,
      binding.sound.source,
      volume
    );

    return this.setBindings(
      this.bindings.map((entry) =>
        entry === binding ? { key, sound: updatedSound } : entry
      )
    );
  }
}
