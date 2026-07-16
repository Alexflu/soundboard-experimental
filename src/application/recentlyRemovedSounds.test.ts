import HotkeySound from '../domain/entities/HotkeySound';
import Source from '../domain/entities/Source';
import {
  addRecentlyRemovedSound,
  getRecentlyRemovedSounds,
  removeRecentlyRemovedSound,
} from './recentlyRemovedSounds';

const createSound = (id: string, name = id) =>
  new HotkeySound(
    id,
    name,
    `https://example.com/${id}.mp3`,
    Source.MYINSTANT,
    0.75
  );

describe('recentlyRemovedSounds', () => {
  beforeEach(() => window.localStorage.clear());

  it('stores removed sounds newest first', () => {
    addRecentlyRemovedSound(createSound('one'));
    addRecentlyRemovedSound(createSound('two'));

    expect(getRecentlyRemovedSounds().map((sound) => sound.id)).toEqual([
      'two',
      'one',
    ]);
  });

  it('deduplicates a sound while preserving its latest values', () => {
    addRecentlyRemovedSound(createSound('one', 'Old name'));
    addRecentlyRemovedSound(createSound('one', 'New name'));

    expect(getRecentlyRemovedSounds()).toEqual([
      createSound('one', 'New name'),
    ]);
  });

  it('removes one history entry', () => {
    addRecentlyRemovedSound(createSound('one'));
    addRecentlyRemovedSound(createSound('two'));

    removeRecentlyRemovedSound('two');

    expect(getRecentlyRemovedSounds()).toEqual([createSound('one')]);
  });
});
