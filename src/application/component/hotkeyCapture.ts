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

  return SHIFTED_KEY_ALIASES[event.key] || event.key;
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

  function cleanup() {
    if (!active) {
      return;
    }
    active = false;
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.clearTimeout(timeoutId);
  }

  function cancel(reason: HotkeyCaptureCancelReason) {
    if (!active) {
      return;
    }
    cleanup();
    onCancel?.(reason);
  }

  function onKeyDown(event: KeyboardEvent) {
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
  }

  function onPointerDown(event: PointerEvent) {
    const target = event.target as Element | null;
    if (target?.closest('[data-hotkey-capture-trigger]')) {
      return;
    }
    cancel('pointer');
  }

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('pointerdown', onPointerDown, true);
  timeoutId = window.setTimeout(() => cancel('timeout'), timeoutMs);

  return cleanup;
};
