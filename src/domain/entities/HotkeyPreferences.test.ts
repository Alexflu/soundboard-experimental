import {
  DEFAULT_HOTKEYS,
  normalizeHotkeys,
} from './HotkeyPreferences';

describe('HotkeyPreferences', () => {
  it('keeps existing defaults when no hotkeys are provided', () => {
    expect(normalizeHotkeys()).toEqual(DEFAULT_HOTKEYS);
  });

  it('supports partial overrides and keeps missing defaults', () => {
    expect(
      normalizeHotkeys({
        randomSound: 'Alt+F1',
        searchSlot1: 'Alt+1',
      })
    ).toEqual({
      ...DEFAULT_HOTKEYS,
      randomSound: 'Alt+F1',
      searchSlot1: 'Alt+1',
    });
  });
});
