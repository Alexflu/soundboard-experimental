export type RoutingSettings = {
  version: number;
  enabled: boolean;
  outputDeviceId: string;
  outputDeviceName: string;
};

const STORAGE_KEY = 'soundboard:routing-settings';
const SETTINGS_VERSION = 1;

const normalize = (
  settings?: Partial<RoutingSettings> | null
): RoutingSettings => ({
  version: SETTINGS_VERSION,
  enabled: settings?.enabled === true,
  outputDeviceId: settings?.outputDeviceId || 'default',
  outputDeviceName: settings?.outputDeviceName || 'Default output',
});

export const getRoutingSettings = (): RoutingSettings => {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return normalize();
  }
};

export const saveRoutingSettings = (
  settings: Partial<RoutingSettings>
): RoutingSettings => {
  const next = normalize({ ...getRoutingSettings(), ...settings });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('soundboard:routing-settings-changed'));
  return next;
};
