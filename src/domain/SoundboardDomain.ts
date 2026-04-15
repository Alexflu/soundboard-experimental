import { toast } from 'react-toastify';
import { HotkeySound, UserPreferences } from './entities/UserPreferences';
import UserPreferenceAdapter from '../infrastructure/UserPreferenceAdapter';
import LocalSoundAdapter from '../infrastructure/LocalSoundAdapter';
import Sound from './entities/Sound';
import Player from './entities/Player';
import MyInstantSoundAdapter from '../infrastructure/MyInstantSoundAdapter';
import Filters from './entities/Filters';
import Source from './entities/Source';
import { HotkeyAction } from './entities/HotkeyPreferences';

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

  async playSearchSlotHotkeySound(
    action: HotkeyAction,
    index: number,
    filters: Filters
  ): Promise<Player | null> {
    const hotkeySound = this.getUserPreferences().hotkeySounds[action];
    if (hotkeySound) {
      const player = this.playSound(
        new Sound(hotkeySound.name, '', hotkeySound.url, Source.MYINSTANT)
      );
      toast.info(`Hotkey sound: ${hotkeySound.name}`);
      return player;
    }

    return this.playLocalSoundByIndex(index, filters);
  }

  bindSoundToHotkey(action: HotkeyAction, sound: Sound) {
    const userPreferences = this.getUserPreferences();
    this.setUserPreferences(
      userPreferences.setHotkeySound(
        action,
        new HotkeySound(sound.path, sound.name, sound.path)
      )
    );
  }

  playBoundHotkeySound(action: HotkeyAction): Player | null {
    const hotkeySound = this.getUserPreferences().hotkeySounds[action];
    if (!hotkeySound) {
      return null;
    }
    return this.playSound(
      new Sound(hotkeySound.name, '', hotkeySound.url, Source.MYINSTANT)
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
