export type PassiveKeyboardEvent = {
  keycode: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export type PassiveKeyboardHook = {
  on: (
    event: 'keydown' | 'keyup',
    listener: (keyboardEvent: PassiveKeyboardEvent) => void
  ) => unknown;
  removeListener: (
    event: 'keydown' | 'keyup',
    listener: (keyboardEvent: PassiveKeyboardEvent) => void
  ) => unknown;
  start: () => void;
  stop: () => void;
};

type ParsedShortcut = {
  keycode: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

const KEY_ALIASES: Record<string, string> = {
  ' ': 'Space',
  Spacebar: 'Space',
  Esc: 'Escape',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  ';': 'Semicolon',
  '=': 'Equal',
  ',': 'Comma',
  '-': 'Minus',
  '.': 'Period',
  '/': 'Slash',
  '`': 'Backquote',
  '[': 'BracketLeft',
  '\\': 'Backslash',
  ']': 'BracketRight',
  "'": 'Quote',
};

const normalizeKeyName = (keyName: string) => {
  const aliasedKey = KEY_ALIASES[keyName] || keyName;
  if (/^[a-z]$/i.test(aliasedKey)) {
    return aliasedKey.toUpperCase();
  }
  if (/^f\d{1,2}$/i.test(aliasedKey)) {
    return aliasedKey.toUpperCase();
  }
  return aliasedKey;
};

const parseAccelerator = (
  accelerator: string,
  keyMap: Record<string, number>,
  platform: NodeJS.Platform
): ParsedShortcut | null => {
  const parts = accelerator
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  const keyName = parts.pop();
  if (!keyName) {
    return null;
  }

  const modifiers = parts.map((modifier) => modifier.toLowerCase());
  const knownModifiers = new Set([
    'alt',
    'option',
    'control',
    'ctrl',
    'command',
    'cmd',
    'meta',
    'super',
    'commandorcontrol',
    'cmdorctrl',
    'shift',
  ]);
  if (modifiers.some((modifier) => !knownModifiers.has(modifier))) {
    return null;
  }

  const commandOrControl =
    modifiers.includes('commandorcontrol') || modifiers.includes('cmdorctrl');
  const normalizedKeyName = normalizeKeyName(keyName);
  const keycode = keyMap[normalizedKeyName];
  if (keycode === undefined) {
    return null;
  }

  return {
    keycode,
    altKey: modifiers.includes('alt') || modifiers.includes('option'),
    ctrlKey:
      modifiers.includes('control') ||
      modifiers.includes('ctrl') ||
      (commandOrControl && platform !== 'darwin'),
    metaKey:
      modifiers.includes('command') ||
      modifiers.includes('cmd') ||
      modifiers.includes('meta') ||
      modifiers.includes('super') ||
      (commandOrControl && platform === 'darwin'),
    shiftKey: modifiers.includes('shift'),
  };
};

const matchesShortcut = (
  keyboardEvent: PassiveKeyboardEvent,
  shortcut: ParsedShortcut
) =>
  keyboardEvent.keycode === shortcut.keycode &&
  keyboardEvent.altKey === shortcut.altKey &&
  keyboardEvent.ctrlKey === shortcut.ctrlKey &&
  keyboardEvent.metaKey === shortcut.metaKey &&
  keyboardEvent.shiftKey === shortcut.shiftKey;

class PassiveShortcutManager {
  private readonly shortcuts = new Map<string, ParsedShortcut>();

  private readonly pressedKeys = new Set<number>();

  private started = false;

  private suspended = false;

  constructor(
    private readonly hook: PassiveKeyboardHook,
    private readonly keyMap: Record<string, number>,
    private readonly triggerShortcut: (accelerator: string) => void,
    private readonly platform: NodeJS.Platform = process.platform
  ) {}

  private readonly onKeyDown = (keyboardEvent: PassiveKeyboardEvent) => {
    if (this.suspended || this.pressedKeys.has(keyboardEvent.keycode)) {
      return;
    }

    this.pressedKeys.add(keyboardEvent.keycode);
    this.shortcuts.forEach((shortcut, accelerator) => {
      if (matchesShortcut(keyboardEvent, shortcut)) {
        this.triggerShortcut(accelerator);
      }
    });
  };

  private readonly onKeyUp = (keyboardEvent: PassiveKeyboardEvent) => {
    this.pressedKeys.delete(keyboardEvent.keycode);
  };

  start() {
    if (this.started) {
      return true;
    }

    this.hook.on('keydown', this.onKeyDown);
    this.hook.on('keyup', this.onKeyUp);
    try {
      this.hook.start();
      this.started = true;
      return true;
    } catch {
      this.hook.removeListener('keydown', this.onKeyDown);
      this.hook.removeListener('keyup', this.onKeyUp);
      return false;
    }
  }

  stop() {
    if (!this.started) {
      return;
    }

    this.hook.removeListener('keydown', this.onKeyDown);
    this.hook.removeListener('keyup', this.onKeyUp);
    this.hook.stop();
    this.shortcuts.clear();
    this.pressedKeys.clear();
    this.started = false;
  }

  register(accelerator: string) {
    const shortcut = parseAccelerator(accelerator, this.keyMap, this.platform);
    if (!this.started || !shortcut) {
      return false;
    }

    this.shortcuts.set(accelerator, shortcut);
    return true;
  }

  unregister(accelerator: string) {
    this.shortcuts.delete(accelerator);
  }

  suspend() {
    this.suspended = true;
    this.pressedKeys.clear();
  }

  resume() {
    this.suspended = false;
    this.pressedKeys.clear();
  }
}

export default PassiveShortcutManager;
