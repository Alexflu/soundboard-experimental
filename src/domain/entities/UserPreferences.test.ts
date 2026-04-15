import { AudioOutput, HotkeySound, UserPreferences } from './UserPreferences';

describe('UserPreferences', () => {
  it('keeps empty hotkey sounds by default', () => {
    const preferences = new UserPreferences(
      new AudioOutput('default', 'Default'),
      '/tmp/sounds.json'
    );

    expect(preferences.hotkeySounds).toEqual({});
  });

  it('sets and normalizes hotkey sound values', () => {
    const preferences = new UserPreferences(
      new AudioOutput('default', 'Default'),
      '/tmp/sounds.json'
    ).setHotkeySound(
      'searchSlot2',
      new HotkeySound('id-1', 'Vine Boom', 'https://example.com/vine-boom.mp3')
    );

    expect(preferences.hotkeySounds.searchSlot2).toEqual(
      new HotkeySound('id-1', 'Vine Boom', 'https://example.com/vine-boom.mp3')
    );
  });
});
