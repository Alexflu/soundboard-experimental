import HotkeySound from '../domain/entities/HotkeySound';
import Source from '../domain/entities/Source';

const STORAGE_KEY = 'soundboard.recentlyRemovedHotkeySounds';
const CHANGE_EVENT = 'soundboard:recentlyRemovedHotkeySoundsChanged';

type StoredHotkeySound = {
  id: string;
  name: string;
  url: string;
  source: Source;
  volume: number;
};

const getStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const normalizeStoredSound = (
  value: Partial<StoredHotkeySound>
): HotkeySound | null => {
  if (!value.id || !value.name || !value.url) {
    return null;
  }

  const source =
    value.source === Source.LOCAL ? Source.LOCAL : Source.MYINSTANT;
  const volume =
    typeof value.volume === 'number' && Number.isFinite(value.volume)
      ? value.volume
      : 1;

  return new HotkeySound(value.id, value.name, value.url, source, volume);
};

const notifyChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
};

const saveRecentlyRemovedSounds = (sounds: HotkeySound[]) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(sounds));
  notifyChanged();
};

export const getRecentlyRemovedSounds = (): HotkeySound[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) {
      return [];
    }

    return saved.reduce((sounds: HotkeySound[], value) => {
      const sound = normalizeStoredSound(value);
      if (
        !sound ||
        sounds.some((existing: HotkeySound) => existing.id === sound.id)
      ) {
        return sounds;
      }
      return sounds.concat(sound);
    }, [] as HotkeySound[]);
  } catch {
    return [];
  }
};

export const addRecentlyRemovedSound = (sound: HotkeySound) => {
  const existing = getRecentlyRemovedSounds().filter(
    (savedSound) => savedSound.id !== sound.id
  );
  saveRecentlyRemovedSounds([sound, ...existing]);
};

export const removeRecentlyRemovedSound = (soundId: string) => {
  saveRecentlyRemovedSounds(
    getRecentlyRemovedSounds().filter((sound) => sound.id !== soundId)
  );
};

export const subscribeRecentlyRemovedSounds = (
  onChange: (sounds: HotkeySound[]) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const listener = () => onChange(getRecentlyRemovedSounds());
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
};