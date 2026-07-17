const { ipcRenderer } = require('electron');

export type RecordingSettings = {
  version: number;
  directory: string;
  inputDeviceId: string;
  inputDeviceName: string;
  gain: number;
  timeoutSeconds: number;
};

const STORAGE_KEY = 'soundboard:recording-settings';
const SETTINGS_VERSION = 2;

const getDefaultDirectory = () => {
  try {
    return ipcRenderer?.sendSync('recording:get-default-path') || '';
  } catch {
    return '';
  }
};

const normalize = (
  settings?: Partial<RecordingSettings> | null
): RecordingSettings => {
  const hasCurrentTimeout =
    settings?.version === SETTINGS_VERSION &&
    typeof settings.timeoutSeconds === 'number' &&
    Number.isFinite(settings.timeoutSeconds);

  return {
    version: SETTINGS_VERSION,
    directory: settings?.directory || getDefaultDirectory(),
    inputDeviceId: settings?.inputDeviceId || 'default',
    inputDeviceName: settings?.inputDeviceName || 'Default input',
    gain:
      typeof settings?.gain === 'number' && Number.isFinite(settings.gain)
        ? Math.min(2, Math.max(0, settings.gain))
        : 1,
    timeoutSeconds: hasCurrentTimeout
      ? Math.min(3600, Math.max(0, Math.round(settings.timeoutSeconds || 0)))
      : 0,
  };
};

export const getRecordingSettings = (): RecordingSettings => {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return normalize();
  }
};

export const saveRecordingSettings = (
  settings: Partial<RecordingSettings>
): RecordingSettings => {
  const next = normalize({ ...getRecordingSettings(), ...settings });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('soundboard:recording-settings-changed'));
  return next;
};
