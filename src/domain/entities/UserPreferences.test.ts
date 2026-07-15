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

  it('keeps empty sound trims by default', () => {
    expect(createPreferences().soundTrims).toEqual({});
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

  it('preserves shared bindings when multiple sounds are disabled', () => {
    const preferences = createPreferences()
      .setHotkeySettings({ allowMultipleSoundsPerHotkey: true })
      .upsertBinding('Control+F2', sound('id-1'))
      .upsertBinding('Control+F2', sound('id-2'))
      .setHotkeySettings({ allowMultipleSoundsPerHotkey: false });

    expect(preferences.bindings.map((binding) => binding.sound.id)).toEqual([
      'id-1',
      'id-2',
    ]);
  });

  it('preserves shared bindings when loading saved preferences', () => {
    const preferences = new UserPreferences(
      new AudioOutput('default', 'Default'),
      '/tmp/sounds.json',
      {},
      [
        { key: 'Control+F2', sound: sound('id-1') },
        { key: 'Control+F2', sound: sound('id-2') },
      ],
      undefined,
      undefined,
      { allowMultipleSoundsPerHotkey: false }
    );

    expect(preferences.bindings).toHaveLength(2);
  });

  it('replaces an occupied key only during a new assignment while disabled', () => {
    const preferences = createPreferences()
      .setHotkeySettings({ allowMultipleSoundsPerHotkey: true })
      .upsertBinding('Control+F2', sound('id-1'))
      .upsertBinding('Control+F2', sound('id-2'))
      .setHotkeySettings({ allowMultipleSoundsPerHotkey: false })
      .upsertBinding('Control+F2', sound('id-3'));

    expect(preferences.bindings).toEqual([
      { key: 'Control+F2', sound: sound('id-3') },
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

  it('keeps a binding in place when its hotkey changes', () => {
    const preferences = createPreferences()
      .setHotkeySettings({ allowMultipleSoundsPerHotkey: true })
      .upsertBinding('Control+F1', sound('id-1'))
      .upsertBinding('Control+F2', sound('id-2'))
      .upsertBinding('Control+F3', sound('id-3'))
      .updateBindingKey('Control+F2', 'Shift+F2', 'id-2');

    expect(preferences.bindings.map((binding) => binding.sound.id)).toEqual([
      'id-1',
      'id-2',
      'id-3',
    ]);
    expect(preferences.bindings[1].key).toBe('Shift+F2');
  });

  it('reorders bound sounds', () => {
    const preferences = createPreferences()
      .setHotkeySettings({ allowMultipleSoundsPerHotkey: true })
      .upsertBinding('Control+F1', sound('id-1'))
      .upsertBinding('Control+F2', sound('id-2'))
      .upsertBinding('Control+F3', sound('id-3'))
      .reorderBindings('id-3', 'id-1');

    expect(preferences.bindings.map((binding) => binding.sound.id)).toEqual([
      'id-3',
      'id-1',
      'id-2',
    ]);
  });

  it('stores normalized playback trim ranges', () => {
    const preferences = createPreferences().setSoundTrim('sound-id', -2, 6);

    expect(preferences.soundTrims).toEqual({
      'sound-id': { startTime: 0, endTime: 6 },
    });
  });

  it('removes a playback trim returned to the full range', () => {
    const preferences = createPreferences()
      .setSoundTrim('sound-id', 2, 6)
      .setSoundTrim('sound-id', 0);

    expect(preferences.soundTrims).toEqual({});
  });
});
