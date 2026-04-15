export type HotkeyAction = 'randomSound';

export type HotkeyMap = Record<HotkeyAction, string>;

export const DEFAULT_RANDOM_HOTKEY = 'Control+F1';

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
});

export const LEGACY_SEARCH_SLOT_ACTIONS = [
  'searchSlot1',
  'searchSlot2',
  'searchSlot3',
  'searchSlot4',
  'searchSlot5',
  'searchSlot6',
  'searchSlot7',
] as const;

export type LegacySearchSlotAction = (typeof LEGACY_SEARCH_SLOT_ACTIONS)[number];

export type LegacyHotkeyMap = Partial<
  Record<HotkeyAction | LegacySearchSlotAction, string>
>;
