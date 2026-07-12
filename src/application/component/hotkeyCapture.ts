const { ipcRenderer } = require('electron');

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

const HOTKEY_ALIAS: Record<string, string> = {
  Control: 'Control',
  Ctrl: 'Control',
  Shift: 'Shift',
  Alt: 'Alt',
  Meta: 'Meta',
};

const HOTKEY_ORDER = ['Control', 'Alt', 'Shift', 'Meta'];

const SHIFTED_KEY_ALIASES: Record<string, string> = {
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  '+': 'Equal',
  _: 'Minus',
  ':': 'Semicolon',
  '"': 'Quote',
  '<': 'Comma',
  '>': 'Period',
  '?': 'Slash',
  '~': 'Backquote',
  '{': 'BracketLeft',
  '|': 'Backslash',
  '}': 'BracketRight',
};

const KEY_ALIASES: Record<string, string> = {
  ' ': 'Space',
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

const NUMPAD_CODE_ALIASES: Record<string, string> = {
  NumpadMultiply: 'NumpadMultiply',
  NumpadAdd: 'NumpadAdd',
  NumpadSubtract: 'NumpadSubtract',
  NumpadDecimal: 'NumpadDecimal',
  NumpadDivide: 'NumpadDivide',
  NumpadEnter: 'NumpadEnter',
};

const normalizeModifier = (modifier: string) =>
  HOTKEY_ALIAS[modifier] || modifier;

const normalizeEventKey = (event: KeyboardEvent): string => {
  const digitMatch = event.code?.match(/^Digit([0-9])$/);
  if (digitMatch) {
    return digitMatch[1];
  }

  const letterMatch = event.code?.match(/^Key([A-Z])$/);
  if (letterMatch) {
    return letterMatch[1];
  }

  const numpadDigitMatch = event.code?.match(/^Numpad([0-9])$/);
  if (numpadDigitMatch) {
    return `Numpad${numpadDigitMatch[1]}`;
  }

  return (
    NUMPAD_CODE_ALIASES[event.code] ||
    SHIFTED_KEY_ALIASES[event.key] ||
    KEY_ALIASES[event.key] ||
    event.key
  );
};

export const normalizeHotkey = (
  modifiers: string[],
  key: string
): string | null => {
  if (!key || MODIFIER_KEYS.has(key)) {
    return null;
  }

  const orderedModifiers = HOTKEY_ORDER.filter((modifier) =>
    modifiers.map(normalizeModifier).includes(modifier)
  );

  return orderedModifiers.concat(key).join('+');
};

export const getHotkeyFromEvent = (event: KeyboardEvent): string | null => {
  const modifiers = [
    event.ctrlKey ? 'Control' : null,
    event.altKey ? 'Alt' : null,
    event.shiftKey ? 'Shift' : null,
    event.metaKey ? 'Meta' : null,
  ].filter(Boolean) as string[];
  return normalizeHotkey(modifiers, normalizeEventKey(event));
};

export type HotkeyCaptureCancelReason = 'escape' | 'pointer' | 'timeout';

type CaptureHotkeyOptions = {
  onCapture: (hotkey: string) => void;
  onCancel?: (reason: HotkeyCaptureCancelReason) => void;
  timeoutMs?: number;
};

export const captureHotkey = ({
  onCapture,
  onCancel,
  timeoutMs = 10000,
}: CaptureHotkeyOptions): (() => void) => {
  let active = true;
  let timeoutId = 0;
  let onKeyDown: (event: KeyboardEvent) => void;
  let onPointerDown: (event: PointerEvent) => void;

  ipcRenderer?.sendSync('shortcut:suspend');

  const cleanup = () => {
    if (!active) {
      return;
    }
    active = false;
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.clearTimeout(timeoutId);
    ipcRenderer?.send('shortcut:resume');
    window.dispatchEvent(new Event('soundboard:hotkey-capture-ended'));
  };

  const cancel = (reason: HotkeyCaptureCancelReason) => {
    if (!active) {
      return;
    }
    cleanup();
    onCancel?.(reason);
  };

  onKeyDown = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      cancel('escape');
      return;
    }

    const hotkey = getHotkeyFromEvent(event);
    if (!hotkey) {
      return;
    }

    cleanup();
    onCapture(hotkey);
  };

  onPointerDown = (event: PointerEvent) => {
    const target = event.target as Element | null;
    if (target?.closest('[data-hotkey-capture-trigger]')) {
      return;
    }
    cancel('pointer');
  };

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('pointerdown', onPointerDown, true);
  timeoutId = window.setTimeout(() => cancel('timeout'), timeoutMs);

  return cleanup;
};
