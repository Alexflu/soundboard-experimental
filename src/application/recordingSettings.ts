const { ipcRenderer } = require('electron');

export type RecordingSource = 'microphone' | 'system' | 'mixed';

export type RecordingSettings = {
  version: number;
  directory: string;
  inputDeviceId: string;
  inputDeviceName: string;
  gain: number;
  timeoutSeconds: number;
  source: RecordingSource;
};

const STORAGE_KEY = 'soundboard:recording-settings';
const SETTINGS_VERSION = 3;

const getDefaultDirectory = () => {
  try {
    return ipcRenderer?.sendSync('recording:get-default-path') || '';
  } catch {
    return '';
  }
};

const normalizeSource = (source?: string): RecordingSource => {
  if (source === 'system' || source === 'mixed') {
    return source;
  }
  return 'microphone';
};

const normalize = (
  settings?: Partial<RecordingSettings> | null
): RecordingSettings => {
  const timeoutSeconds = settings?.timeoutSeconds;
  const hasCurrentTimeout =
    (settings?.version || 0) >= 2 &&
    typeof timeoutSeconds === 'number' &&
    Number.isFinite(timeoutSeconds);

  return {
    version: SETTINGS_VERSION,
    directory: settings?.directory || getDefaultDirectory(),
    inputDeviceId: settings?.inputDeviceId || 'default',
    inputDeviceName: settings?.inputDeviceName || 'Default input',
    gain:
      typeof settings?.gain === 'number' && Number.isFinite(settings.gain)
        ? Math.min(1, Math.max(0, settings.gain))
        : 1,
    timeoutSeconds: hasCurrentTimeout
      ? Math.min(3600, Math.max(0, Math.round(timeoutSeconds)))
      : 0,
    source: normalizeSource(settings?.source),
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
  window.dispatchEvent(
    new Event('soundboard:recording-settings-changed')
  );
  return next;
};
