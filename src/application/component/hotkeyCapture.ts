const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

const HOTKEY_ALIAS: Record<string, string> = {
  Control: 'Control',
  Ctrl: 'Control',
  Shift: 'Shift',
  Alt: 'Alt',
  Meta: 'Meta',
};

const HOTKEY_ORDER = ['Control', 'Alt', 'Shift', 'Meta'];

const normalizeModifier = (modifier: string) =>
  HOTKEY_ALIAS[modifier] || modifier;

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
  return normalizeHotkey(modifiers, event.key);
};
