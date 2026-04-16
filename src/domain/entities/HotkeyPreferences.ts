export type HotkeyAction = 'randomSound' | 'stopAllSounds';

export type HotkeyMap = Record<HotkeyAction, string>;

export const DEFAULT_RANDOM_HOTKEY = 'Control+F1';
export const DEFAULT_STOP_ALL_HOTKEY = 'Control+Shift+S';

export const DEFAULT_SEARCH_SLOT_HOTKEYS = [
  'Control+F2',
  'Control+F3',
  'Control+F4',
  'Control+F5',
  'Control+F6',
  'Control+F7',
  'Control+F8',
];

export const normalizeHotkeys = (
  hotkeys?: Partial<HotkeyMap> | null
): HotkeyMap => ({
  randomSound: hotkeys?.randomSound || DEFAULT_RANDOM_HOTKEY,
  stopAllSounds: hotkeys?.stopAllSounds || DEFAULT_STOP_ALL_HOTKEY,
});

const HOTKEY_DISPLAY_LABELS: Record<string, string> = {
  Control: 'Ctrl',
  Ctrl: 'Ctrl',
  Shift: 'Shift',
  Alt: 'Alt',
};

export const toHotkeyDisplay = (hotkey: string): string =>
  hotkey
    .split('+')
    .map((part) => HOTKEY_DISPLAY_LABELS[part] || part)
    .join('+');

export const LEGACY_SEARCH_SLOT_ACTIONS = [
  'searchSlot1',
  'searchSlot2',
  'searchSlot3',
  'searchSlot4',
  'searchSlot5',
  'searchSlot6',
  'searchSlot7',
] as const;

export type LegacySearchSlotAction = typeof LEGACY_SEARCH_SLOT_ACTIONS[number];

export type LegacyHotkeyMap = Partial<
  Record<HotkeyAction | LegacySearchSlotAction, string>
>;
