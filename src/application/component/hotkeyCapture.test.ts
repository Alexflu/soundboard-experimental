import { getHotkeyFromEvent, normalizeHotkey } from './hotkeyCapture';

describe('hotkeyCapture', () => {
  it('uses the base digit when Shift changes the visible key', () => {
    const event = {
      ctrlKey: true,
      altKey: false,
      shiftKey: true,
      metaKey: false,
      key: '%',
      code: 'Digit5',
    } as KeyboardEvent;

    expect(getHotkeyFromEvent(event)).toBe('Control+Shift+5');
  });

  it('ignores modifier-only input', () => {
    expect(normalizeHotkey(['Control'], 'Control')).toBeNull();
  });
});
