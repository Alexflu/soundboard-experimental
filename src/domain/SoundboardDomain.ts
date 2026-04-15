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
import Source from './entities/Source';

export class SoundboardDomain {
  localSoundAdapter: LocalSoundAdapter;

  myInstantSoundAdapter: MyInstantSoundAdapter;

  userPreferenceAdapter: UserPreferenceAdapter;

  constructor(
    localSoundAdapter: LocalSoundAdapter,
    myInstantSoundAdapter: MyInstantSoundAdapter,
    userPreferenceAdapter: UserPreferenceAdapter
  ) {
    this.localSoundAdapter = localSoundAdapter;
    this.myInstantSoundAdapter = myInstantSoundAdapter;
    this.userPreferenceAdapter = userPreferenceAdapter;
  }

  async getSounds(filters: Filters): Promise<Sound[]> {
    const userPreferences = this.userPreferenceAdapter.getUserPreferences();
    const localSounds = this.localSoundAdapter.getSounds(
      userPreferences.pathToSoundsJson
    );
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
    const randomSound = this.getOneRandomLocalSound();
    if (randomSound) {
      const player = this.playSound(randomSound);
      toast.info(`Random sound: ${randomSound.name}`);
      return player;
    }
    return null;
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

  playBoundHotkeySound(key: string): Player | null {
    const binding = this.findBindingByKey(key);
    if (!binding) {
      return null;
    }

    const player = this.playSound(
      new Sound(
        binding.sound.name,
        '',
        binding.sound.url,
        Source.MYINSTANT
      )
    );
    toast.info(`Hotkey sound: ${binding.sound.name}`);
    return player;
  }

  bindSoundToHotkey(key: string, sound: Sound) {
    const userPreferences = this.getUserPreferences();
    this.setUserPreferences(
      userPreferences.upsertBinding(
        key,
        new HotkeySound(sound.path, sound.name, sound.path)
      )
    );
  }

  removeBinding(key: string) {
    this.setUserPreferences(this.getUserPreferences().removeBinding(key));
  }

  updateBindingKey(previousKey: string, nextKey: string) {
    this.setUserPreferences(
      this.getUserPreferences().updateBindingKey(previousKey, nextKey)
    );
  }

  findBindingByKey(key: string): HotkeyBinding | null {
    return (
      this.getUserPreferences().bindings.find((binding) => binding.key === key) ||
      null
    );
  }

  private playSound(sound: Sound): Player {
    const audioOutput = this.getUserPreferences().audioOutput.id;
    const player = new Player(sound, audioOutput);
    player.play();
    return player;
  }

  private getOneRandomLocalSound(): Sound | null {
    const userPreferences = this.userPreferenceAdapter.getUserPreferences();
    const localSounds = this.localSoundAdapter.getSounds(
      userPreferences.pathToSoundsJson
    );
    if (localSounds && localSounds.length > 0) {
      return localSounds[Math.floor(Math.random() * localSounds.length)];
    }
    return null;
  }
}

const soundboardDomain = new SoundboardDomain(
  new LocalSoundAdapter(),
  new MyInstantSoundAdapter(),
  new UserPreferenceAdapter()
);
Object.freeze(soundboardDomain);

export default soundboardDomain;
