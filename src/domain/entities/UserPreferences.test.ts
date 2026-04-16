import { AudioOutput, HotkeySound, UserPreferences } from './UserPreferences';
import Source from './Source';

describe('UserPreferences', () => {
  it('keeps empty bindings by default', () => {
    const preferences = new UserPreferences(
      new AudioOutput('default', 'Default'),
      '/tmp/sounds.json'
    );

    expect(preferences.bindings).toEqual([]);
  });

  it('adds and normalizes binding values', () => {
    const preferences = new UserPreferences(
      new AudioOutput('default', 'Default'),
      '/tmp/sounds.json'
    ).upsertBinding(
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

  it('removes duplicate key and duplicate sound on upsert', () => {
    const preferences = new UserPreferences(
      new AudioOutput('default', 'Default'),
      '/tmp/sounds.json'
    )
      .upsertBinding(
        'Control+F2',
        new HotkeySound('id-1', 'A', 'https://example.com/a.mp3')
      )
      .upsertBinding(
        'Control+F3',
        new HotkeySound('id-1', 'A', 'https://example.com/a.mp3')
      )
      .upsertBinding(
        'Control+F3',
        new HotkeySound('id-2', 'B', 'https://example.com/b.mp3')
      );

    expect(preferences.bindings).toEqual([
      {
        key: 'Control+F3',
        sound: new HotkeySound('id-2', 'B', 'https://example.com/b.mp3'),
      },
    ]);
  });
});
