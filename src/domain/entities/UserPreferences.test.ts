import { AudioOutput, HotkeySound, UserPreferences } from './UserPreferences';
import Source from './Source';

const createPreferences = () =>
  new UserPreferences(
    new AudioOutput('default', 'Default'),
    '/tmp/sounds.json'
  );

const sound = (id: string) =>
  new HotkeySound(id, id, `https://example.com/${id}.mp3`);

describe('UserPreferences', () => {
  it('keeps empty bindings by default', () => {
    expect(createPreferences().bindings).toEqual([]);
  });

  it('uses safe hotkey behavior defaults', () => {
    expect(createPreferences().hotkeySettings).toEqual({
      pianoKeysEnabled: false,
      allowMultipleSoundsPerHotkey: false,
      randomSoundPool: 'local',
    });
  });

  it('adds and normalizes binding values', () => {
    const preferences = createPreferences().upsertBinding(
      'Control+F2',
      new HotkeySound('id-1', 'Vine Boom', 'https://example.com/vine-boom.mp3')
    );

    expect(preferences.bindings).toEqual([
      {
        key: 'Control+F2',
        sound: new HotkeySound(
          'id-1',
          'Vine Boom',
          'https://example.com/vine-boom.mp3',
          Source.MYINSTANT,
          1
        ),
      },
    ]);
  });

  it('migrates legacy search slots into bindings when no bindings are present', () => {
    const preferences = new UserPreferences(
      new AudioOutput('default', 'Default'),
      '/tmp/sounds.json',
      {
        randomSound: 'Control+F1',
      },
      [],
      {
        searchSlot2: new HotkeySound(
          'id-2',
          'Bonk',
          'https://example.com/bonk.mp3'
        ),
      },
      {
        searchSlot2: 'Alt+2',
      }
    );

    expect(preferences.bindings).toEqual([
      {
        key: 'Alt+2',
        sound: new HotkeySound(
          'id-2',
          'Bonk',
          'https://example.com/bonk.mp3',
          Source.MYINSTANT,
          1
        ),
      },
    ]);
  });

  it('replaces duplicate keys when multiple sounds are disabled', () => {
    const preferences = createPreferences()
      .upsertBinding('Control+F2', sound('id-1'))
      .upsertBinding('Control+F2', sound('id-2'));

    expect(preferences.bindings).toHaveLength(1);
    expect(preferences.bindings[0].sound.id).toBe('id-2');
  });

  it('keeps multiple sounds on one key when enabled', () => {
    const preferences = createPreferences()
      .setHotkeySettings({ allowMultipleSoundsPerHotkey: true })
      .upsertBinding('Control+F2', sound('id-1'))
      .upsertBinding('Control+F2', sound('id-2'));

    expect(preferences.bindings.map((binding) => binding.sound.id)).toEqual([
      'id-1',
      'id-2',
    ]);
  });

  it('removes only the selected sound from a shared key', () => {
    const preferences = createPreferences()
      .setHotkeySettings({ allowMultipleSoundsPerHotkey: true })
      .upsertBinding('Control+F2', sound('id-1'))
      .upsertBinding('Control+F2', sound('id-2'))
      .removeBinding('Control+F2', 'id-1');

    expect(preferences.bindings).toHaveLength(1);
    expect(preferences.bindings[0].sound.id).toBe('id-2');
  });

  it('keeps one sound bound to only one key', () => {
    const preferences = createPreferences()
      .upsertBinding('Control+F2', sound('id-1'))
      .upsertBinding('Control+F3', sound('id-1'));

    expect(preferences.bindings).toEqual([
      {
        key: 'Control+F3',
        sound: sound('id-1'),
      },
    ]);
  });
});