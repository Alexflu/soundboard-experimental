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

export type HotkeySoundMap = Partial<
  Record<typeof LEGACY_SEARCH_SLOT_ACTIONS[number], HotkeySound>
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
      const withoutExistingKey = acc.filter(
        (existingBinding) => existingBinding.key !== normalizedBinding.key
      );
      const withoutExistingSound = withoutExistingKey.filter(
        (existingBinding) =>
          existingBinding.sound.id !== normalizedBinding.sound.id
      );
      return withoutExistingSound.concat(normalizedBinding);
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

  constructor(
    audioOutput: AudioOutput,
    pathToSoundsJson: string,
    hotkeys: Partial<HotkeyMap> = {},
    bindings: HotkeyBinding[] = [],
    legacyHotkeySounds?: HotkeySoundMap,
    legacyHotkeys?: LegacyHotkeyMap
  ) {
    this.audioOutput = audioOutput;
    this.pathToSoundsJson = pathToSoundsJson;
    this.hotkeys = normalizeHotkeys(hotkeys);
    this.bindings = normalizeBindings(
      bindings,
      legacyHotkeySounds,
      legacyHotkeys
    );
  }

  setAudioOutput(audioOutput: AudioOutput): UserPreferences {
    return new UserPreferences(
      audioOutput,
      this.pathToSoundsJson,
      this.hotkeys,
      this.bindings
    );
  }

  setPathToSoundsJson(pathToSoundsJson: string): UserPreferences {
    return new UserPreferences(
      this.audioOutput,
      pathToSoundsJson,
      this.hotkeys,
      this.bindings
    );
  }

  setHotkeys(hotkeys: Partial<HotkeyMap>): UserPreferences {
    return new UserPreferences(
      this.audioOutput,
      this.pathToSoundsJson,
      hotkeys,
      this.bindings
    );
  }

  setBindings(bindings: HotkeyBinding[]): UserPreferences {
    return new UserPreferences(
      this.audioOutput,
      this.pathToSoundsJson,
      this.hotkeys,
      bindings
    );
  }

  upsertBinding(key: string, sound: HotkeySound): UserPreferences {
    const withoutCurrentKey = this.bindings.filter(
      (binding) => binding.key !== key
    );
    const withoutCurrentSound = withoutCurrentKey.filter(
      (binding) => binding.sound.id !== sound.id
    );
    return this.setBindings(withoutCurrentSound.concat({ key, sound }));
  }

  removeBinding(key: string): UserPreferences {
    return this.setBindings(
      this.bindings.filter((binding) => binding.key !== key)
    );
  }

  updateBindingKey(previousKey: string, nextKey: string): UserPreferences {
    const bindingToUpdate = this.bindings.find(
      (binding) => binding.key === previousKey
    );
    if (!bindingToUpdate) {
      return this;
    }

    const bindingsWithoutPrevious = this.bindings.filter(
      (binding) => binding.key !== previousKey
    );

    const bindingsWithoutNext = bindingsWithoutPrevious.filter(
      (binding) => binding.key !== nextKey
    );

    return this.setBindings(
      bindingsWithoutNext.concat({
        key: nextKey,
        sound: bindingToUpdate.sound,
      })
    );
  }

  setBindingVolume(key: string, volume: number): UserPreferences {
    const binding = this.bindings.find((entry) => entry.key === key);
    if (!binding) {
      return this;
    }

    return this.upsertBinding(
      key,
      new HotkeySound(
        binding.sound.id,
        binding.sound.name,
        binding.sound.url,
        binding.sound.source,
        volume
      )
    );
  }
}
