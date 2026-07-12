import PassiveShortcutManager, {
  PassiveKeyboardEvent,
  PassiveKeyboardHook,
} from './PassiveShortcutManager';

type ListenerMap = Record<
  'keydown' | 'keyup',
  ((keyboardEvent: PassiveKeyboardEvent) => void) | undefined
>;

const createHook = () => {
  const listeners: ListenerMap = {
    keydown: undefined,
    keyup: undefined,
  };
  const hook: PassiveKeyboardHook = {
    on: jest.fn((event, listener) => {
      listeners[event] = listener;
    }),
    removeListener: jest.fn((event) => {
      listeners[event] = undefined;
    }),
    start: jest.fn(),
    stop: jest.fn(),
  };
  return { hook, listeners };
};

const keyboardEvent = (
  keycode: number,
  modifiers: Partial<PassiveKeyboardEvent> = {}
): PassiveKeyboardEvent => ({
  keycode,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...modifiers,
});

describe('PassiveShortcutManager', () => {
  const keyMap = {
    A: 30,
    S: 31,
    F1: 59,
  };

  it('triggers without consuming or repeating a held shortcut', () => {
    const { hook, listeners } = createHook();
    const triggerShortcut = jest.fn();
    const manager = new PassiveShortcutManager(
      hook,
      keyMap,
      triggerShortcut,
      'win32'
    );

    expect(manager.start()).toBe(true);
    expect(manager.register('Control+Shift+S')).toBe(true);

    const event = keyboardEvent(keyMap.S, {
      ctrlKey: true,
      shiftKey: true,
    });
    listeners.keydown?.(event);
    listeners.keydown?.(event);
    expect(triggerShortcut).toHaveBeenCalledTimes(1);
    expect(triggerShortcut).toHaveBeenCalledWith('Control+Shift+S');

    listeners.keyup?.(event);
    listeners.keydown?.(event);
    expect(triggerShortcut).toHaveBeenCalledTimes(2);
  });

  it('requires an exact modifier match', () => {
    const { hook, listeners } = createHook();
    const triggerShortcut = jest.fn();
    const manager = new PassiveShortcutManager(
      hook,
      keyMap,
      triggerShortcut,
      'win32'
    );

    manager.start();
    manager.register('Control+F1');
    listeners.keydown?.(
      keyboardEvent(keyMap.F1, { ctrlKey: true, shiftKey: true })
    );

    expect(triggerShortcut).not.toHaveBeenCalled();
  });

  it('supports single-key piano shortcuts', () => {
    const { hook, listeners } = createHook();
    const triggerShortcut = jest.fn();
    const manager = new PassiveShortcutManager(
      hook,
      keyMap,
      triggerShortcut,
      'win32'
    );

    manager.start();
    manager.register('A');
    listeners.keydown?.(keyboardEvent(keyMap.A));

    expect(triggerShortcut).toHaveBeenCalledWith('A');
  });

  it('suspends and resumes shortcut detection', () => {
    const { hook, listeners } = createHook();
    const triggerShortcut = jest.fn();
    const manager = new PassiveShortcutManager(
      hook,
      keyMap,
      triggerShortcut,
      'win32'
    );

    manager.start();
    manager.register('A');
    manager.suspend();
    listeners.keydown?.(keyboardEvent(keyMap.A));
    expect(triggerShortcut).not.toHaveBeenCalled();

    manager.resume();
    listeners.keydown?.(keyboardEvent(keyMap.A));
    expect(triggerShortcut).toHaveBeenCalledWith('A');
  });
});
