const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

const HOTKEY_ALIAS: Record<string, string> = {
  Control: 'Control',
  Ctrl: 'Control',
  Shift: 'Shift',
  Alt: 'Alt',
  Meta: 'Meta',
};

const HOTKEY_ORDER = ['Control', 'Alt', 'Shift', 'Meta'];
const HOTKEY_CAPTURE_TIMEOUT_MS = 5000;

const normalizeModifier = (modifier: string) => HOTKEY_ALIAS[modifier] || modifier;

let activeCaptureToken: symbol | null = null;
let cancelActiveCaptureHandler: (() => void) | null = null;

export const isHotkeyCaptureActive = (): boolean => activeCaptureToken !== null;

export const cancelActiveHotkeyCapture = () => {
  if (cancelActiveCaptureHandler) {
    cancelActiveCaptureHandler();
  }
};

export const normalizeHotkey = (
  modifiers: string[],
  key: string,
  requireModifier = true
): string | null => {
  if (!key || MODIFIER_KEYS.has(key)) {
    return null;
  }

  const normalizedModifiers = modifiers.map(normalizeModifier);
  if (requireModifier && normalizedModifiers.length === 0) {
    return null;
  }

  const orderedModifiers = HOTKEY_ORDER.filter((modifier) =>
    normalizedModifiers.includes(modifier)
  );

  return orderedModifiers.concat(key).join('+');
};

export const getHotkeyFromEvent = (
  event: KeyboardEvent,
  requireModifier = true
): string | null => {
  const modifiers = [
    event.ctrlKey ? 'Control' : null,
    event.altKey ? 'Alt' : null,
    event.shiftKey ? 'Shift' : null,
    event.metaKey ? 'Meta' : null,
  ].filter(Boolean) as string[];
  return normalizeHotkey(modifiers, event.key, requireModifier);
};

export const beginHotkeyCapture = ({
  captureElement,
  onResolve,
  onCancel,
  requireModifier = true,
  timeoutMs = HOTKEY_CAPTURE_TIMEOUT_MS,
}: {
  captureElement: HTMLElement;
  onResolve: (hotkey: string) => void;
  onCancel?: () => void;
  requireModifier?: boolean;
  timeoutMs?: number;
}) => {
  cancelActiveHotkeyCapture();

  const token = Symbol('hotkey-capture');
  activeCaptureToken = token;

  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('mousedown', onMouseDown, true);
    window.clearTimeout(timeoutId);
    if (activeCaptureToken === token) {
      activeCaptureToken = null;
    }
    if (cancelActiveCaptureHandler === cancel) {
      cancelActiveCaptureHandler = null;
    }
  };

  const cancel = () => {
    cleanup();
    onCancel?.();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancel();
      return;
    }

    const hotkey = getHotkeyFromEvent(event, requireModifier);
    if (!hotkey) {
      return;
    }

    cleanup();
    onResolve(hotkey);
  };

  const onMouseDown = (event: MouseEvent) => {
    if (!captureElement.contains(event.target as Node)) {
      cancel();
    }
  };

  const timeoutId = window.setTimeout(cancel, timeoutMs);

  cancelActiveCaptureHandler = cancel;
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('mousedown', onMouseDown, true);

  return cancel;
};
