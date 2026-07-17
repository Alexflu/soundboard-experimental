import { toast } from 'react-toastify';
import {
  HotkeyBinding,
  HotkeySound,
  UserPreferences,
} from './entities/UserPreferences';
import UserPreferenceAdapter from '../infrastructure/UserPreferenceAdapter';
import LocalSoundAdapter from '../infrastructure/LocalSoundAdapter';
import Sound from './entities/Sound';
import Player from './entities/Player';
import MyInstantSoundAdapter from '../infrastructure/MyInstantSoundAdapter';
import Filters from './entities/Filters';

const hasModifier = (key: string): boolean => key.includes('+');

const isReservedHotkey = (
  key: string,
  userPreferences: UserPreferences
): boolean =>
  key === userPreferences.hotkeys.stopAllSounds ||
  key === userPreferences.hotkeys.randomSound;

export class SoundboardDomain {
  localSoundAdapter: LocalSoundAdapter;

  myInstantSoundAdapter: MyInstantSoundAdapter;

  userPreferenceAdapter: UserPreferenceAdapter;

  private readonly boundPlaybackListeners: Array<
    (payload: { key: string; player: Player; soundId: string }) => void
  >;

  constructor(
    localSoundAdapter: LocalSoundAdapter,
    myInstantSoundAdapter: MyInstantSoundAdapter,
    userPreferenceAdapter: UserPreferenceAdapter
  ) {
    this.localSoundAdapter = localSoundAdapter;
    this.myInstantSoundAdapter = myInstantSoundAdapter;
    this.userPreferenceAdapter = userPreferenceAdapter;
    this.boundPlaybackListeners = [];
  }

  async getSounds(filters: Filters): Promise<Sound[]> {
    const userPreferences = this.userPreferenceAdapter.getUserPreferences();
    const localSounds = this.localSoundAdapter
      .getSounds(userPreferences.pathToSoundsJson)
      .map((sound) => SoundboardDomain.applyStoredTrim(sound, userPreferences));
    const myInstantSounds = await this.myInstantSoundAdapter.getSounds(
      filters.search
    );
    return filters.applyFilters(localSounds.concat(myInstantSounds));
  }

  setUserPreferences(userPreferences: UserPreferences) {
    this.userPreferenceAdapter.set(userPreferences);
  }

  getUserPreferences(): UserPreferences {
    return this.userPreferenceAdapter.getUserPreferences();
  }

  watchUserPreferences(
    onChange: (userPreferences: UserPreferences) => void
  ): () => void {
    return this.userPreferenceAdapter.watch(onChange);
  }

  disposeUserPreferencesWatcher() {
    this.userPreferenceAdapter.disposeWatcher();
  }

  addSound(soundPath: string) {
    if (!soundPath) {
      toast.error('Cannot determine the selected audio file path');
      return;
    }
    const userPreferences = this.userPreferenceAdapter.getUserPreferences();
    this.localSoundAdapter.addSound(
      userPreferences.pathToSoundsJson,
      soundPath
    );
  }

  removeSound(sound: Sound) {
    const userPreferences = this.userPreferenceAdapter.getUserPreferences();
    this.localSoundAdapter.removeSound(
      userPreferences.pathToSoundsJson,
      sound.path
    );
  }

  async playRandomSound(): Promise<Player | null> {
    const preferences = this.getUserPreferences();

    if (preferences.hotkeySettings.randomSoundPool === 'bound') {
      const binding = this.getOneRandomBinding();
      if (!binding) {
        toast.error('No bound sounds are available for random playback');
        return null;
      }

      const player = this.playBinding(binding);
      toast.info(`Random sound: ${binding.sound.name}`);
      return player;
    }

    const randomSound = this.getOneRandomLocalSound();
    if (!randomSound) {
      toast.error('No playable local sounds are available');
      return null;
    }

    const player = this.playSound(randomSound);
    toast.info(`Random sound: ${randomSound.name}`);
    return player;
  }

  async playLocalSoundByIndex(
    index: number,
    filters: Filters
  ): Promise<Player | null> {
    const sounds = await this.getSounds(filters);
    const sound = sounds[index];

    if (sound) {
      const player = this.playSound(sound);
      toast.info(`Sound: ${sound.name}`);
      return player;
    }

    toast.error(`No sound found in slot ${index + 1}`);
    return null;
  }

  playBoundHotkeySounds(key: string): Player[] {
    const bindings = this.findBindingsByKey(key);
    const activeBindings = this.getUserPreferences().hotkeySettings
      .allowMultipleSoundsPerHotkey
      ? bindings
      : bindings.slice(-1);

    return activeBindings.map((binding) => this.playBinding(binding));
  }

  playBoundHotkeySound(key: string, soundId?: string): Player | null {
    const bindings = this.getUserPreferences().bindings.filter(
      (entry) =>
        entry.key === key &&
        (soundId === undefined || entry.sound.id === soundId)
    );
    const binding = bindings[bindings.length - 1];
    return binding ? this.playBinding(binding) : null;
  }

  bindSoundToHotkey(key: string, sound: Sound): boolean {
    const userPreferences = this.getUserPreferences();
    if (isReservedHotkey(key, userPreferences)) {
      toast.error('This hotkey is reserved by Soundboard');
      return false;
    }
    if (!userPreferences.hotkeySettings.pianoKeysEnabled && !hasModifier(key)) {
      toast.error('Enable Piano Keys in Settings to use single-key hotkeys');
      return false;
    }

    this.setUserPreferences(
      userPreferences.upsertBinding(
        key,
        new HotkeySound(
          sound.path,
          sound.name,
          sound.path,
          sound.source,
          sound.volume
        )
      )
    );
    return true;
  }

  removeBinding(key: string, soundId?: string) {
    this.setUserPreferences(
      this.getUserPreferences().removeBinding(key, soundId)
    );
  }

  updateBindingKey(
    previousKey: string,
    nextKey: string,
    soundId?: string
  ): boolean {
    const userPreferences = this.getUserPreferences();
    if (isReservedHotkey(nextKey, userPreferences)) {
      toast.error('This hotkey is reserved by Soundboard');
      return false;
    }
    if (
      !userPreferences.hotkeySettings.pianoKeysEnabled &&
      !hasModifier(nextKey)
    ) {
      toast.error('Enable Piano Keys in Settings to use single-key hotkeys');
      return false;
    }

    this.setUserPreferences(
      userPreferences.updateBindingKey(previousKey, nextKey, soundId)
    );
    return true;
  }

  setBindingVolume(key: string, soundId: string, volume: number) {
    Player.setBindingSoundVolume(soundId, volume);
    this.setUserPreferences(
      this.getUserPreferences().setBindingVolume(key, soundId, volume)
    );
  }

  setSoundTrim(soundId: string, startTime: number, endTime?: number) {
    this.setUserPreferences(
      this.getUserPreferences().setSoundTrim(soundId, startTime, endTime)
    );
  }

  reorderBindings(sourceSoundId: string, targetSoundId: string) {
    this.setUserPreferences(
      this.getUserPreferences().reorderBindings(sourceSoundId, targetSoundId)
    );
  }

  findBindingByKey(key: string): HotkeyBinding | null {
    const bindings = this.findBindingsByKey(key);
    return bindings[bindings.length - 1] || null;
  }

  findBindingsByKey(key: string): HotkeyBinding[] {
    return this.getUserPreferences().bindings.filter(
      (binding) => binding.key === key
    );
  }

  onBoundPlayback(
    callback: (payload: {
      key: string;
      player: Player;
      soundId: string;
    }) => void
  ): () => void {
    this.boundPlaybackListeners.push(callback);
    return () => {
      const index = this.boundPlaybackListeners.indexOf(callback);
      if (index >= 0) {
        this.boundPlaybackListeners.splice(index, 1);
      }
    };
  }

  private playBinding(binding: HotkeyBinding): Player {
    const trim = this.getUserPreferences().soundTrims?.[binding.sound.id];
    const player = this.playSound(
      new Sound(
        binding.sound.name,
        '',
        binding.sound.url,
        binding.sound.source,
        binding.sound.volume,
        trim?.startTime,
        trim?.endTime
      ),
      binding.sound.id
    );
    this.boundPlaybackListeners.forEach((listener) =>
      listener({
        key: binding.key,
        player,
        soundId: binding.sound.id,
      })
    );
    return player;
  }

  private playSound(sound: Sound, bindingSoundId?: string): Player {
    const { audioOutput } = this.getUserPreferences();
    const masterVolume = audioOutput.volume ?? 1;
    Player.setGlobalMasterVolume(masterVolume);
    const player = new Player(sound, audioOutput.id, masterVolume);
    player.bindingSoundId = bindingSoundId;
    player.play();
    return player;
  }

  private getOneRandomLocalSound(): Sound | null {
    const userPreferences = this.userPreferenceAdapter.getUserPreferences();
    const localSounds = this.localSoundAdapter
      .getSounds(userPreferences.pathToSoundsJson)
      .filter((sound) => Boolean(sound.name && sound.path))
      .map((sound) => SoundboardDomain.applyStoredTrim(sound, userPreferences));

    return localSounds.length > 0
      ? localSounds[Math.floor(Math.random() * localSounds.length)]
      : null;
  }

  private getOneRandomBinding(): HotkeyBinding | null {
    const bindings = this.getUserPreferences().bindings.filter((binding) =>
      Boolean(binding.sound.name && binding.sound.url)
    );
    return bindings.length > 0
      ? bindings[Math.floor(Math.random() * bindings.length)]
      : null;
  }

  private static applyStoredTrim(
    sound: Sound,
    preferences: UserPreferences
  ): Sound {
    const trim = preferences.soundTrims?.[sound.path];
    if (!trim) {
      return sound;
    }

    return new Sound(
      sound.name,
      sound.description,
      sound.path,
      sound.source,
      sound.volume,
      trim.startTime,
      trim.endTime
    );
  }
}

const soundboardDomain = new SoundboardDomain(
  new LocalSoundAdapter(),
  new MyInstantSoundAdapter(),
  new UserPreferenceAdapter()
);
Object.freeze(soundboardDomain);

export default soundboardDomain;
