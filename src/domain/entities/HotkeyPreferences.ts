export type HotkeyAction =
  | 'randomSound'
  | 'searchSlot1'
  | 'searchSlot2'
  | 'searchSlot3'
  | 'searchSlot4'
  | 'searchSlot5'
  | 'searchSlot6'
  | 'searchSlot7';

export type HotkeyMap = Record<HotkeyAction, string>;

export const HOTKEY_ACTIONS: HotkeyAction[] = [
  'randomSound',
  'searchSlot1',
  'searchSlot2',
  'searchSlot3',
  'searchSlot4',
  'searchSlot5',
  'searchSlot6',
  'searchSlot7',
];

export const DEFAULT_HOTKEYS: HotkeyMap = {
  randomSound: 'Control+F1',
  searchSlot1: 'Control+F2',
  searchSlot2: 'Control+F3',
  searchSlot3: 'Control+F4',
  searchSlot4: 'Control+F5',
  searchSlot5: 'Control+F6',
  searchSlot6: 'Control+F7',
  searchSlot7: 'Control+F8',
};

export const normalizeHotkeys = (
  hotkeys?: Partial<HotkeyMap> | null
): HotkeyMap =>
  HOTKEY_ACTIONS.reduce(
    (acc, action) => ({
      ...acc,
      [action]: hotkeys?.[action] || DEFAULT_HOTKEYS[action],
    }),
    {} as HotkeyMap
  );
