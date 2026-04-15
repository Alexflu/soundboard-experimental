import {
  DEFAULT_RANDOM_HOTKEY,
  normalizeHotkeys,
} from './HotkeyPreferences';

describe('HotkeyPreferences', () => {
  it('keeps existing defaults when no hotkeys are provided', () => {
    expect(normalizeHotkeys()).toEqual({ randomSound: DEFAULT_RANDOM_HOTKEY });
  });

  it('supports randomSound override', () => {
    expect(
      normalizeHotkeys({
        randomSound: 'Alt+F1',
      })
    ).toEqual({
      randomSound: 'Alt+F1',
    });
  });
});
