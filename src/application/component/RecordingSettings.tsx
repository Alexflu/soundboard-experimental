import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getRecordingSettings,
  RecordingSettings as RecordingSettingsValue,
  saveRecordingSettings,
} from '../recordingSettings';

const { ipcRenderer } = require('electron');

const formatInputLabel = (device: MediaDeviceInfo) => {
  const label = device.label?.trim();
  if (device.deviceId === 'default') {
    return label || 'Default input';
  }
  return label || `Audio input ${device.deviceId.slice(0, 8)}`;
};

const RecordingSettings = () => {
  const [settings, setSettings] = useState(getRecordingSettings);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);

  const updateSettings = (updates: Partial<RecordingSettingsValue>) => {
    setSettings(saveRecordingSettings(updates));
  };

  const refreshDevices = useCallback(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        setInputDevices(
          devices.filter((device) => device.kind === 'audioinput')
        );
        return true;
      })
      .catch((error) => toast.error(`Cannot enumerate audio inputs: ${error}`));
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () =>
      navigator.mediaDevices?.removeEventListener?.(
        'devicechange',
        refreshDevices
      );
  }, [refreshDevices]);

  useEffect(() => {
    const syncSettings = () => setSettings(getRecordingSettings());
    window.addEventListener(
      'soundboard:recording-settings-changed',
      syncSettings
    );
    return () =>
      window.removeEventListener(
        'soundboard:recording-settings-changed',
        syncSettings
      );
  }, []);

  const chooseDirectory = async () => {
    const directory = await ipcRenderer.invoke(
      'dialog:choose-recording-folder',
      settings.directory
    );
    if (directory) {
      updateSettings({ directory });
    }
  };

  const openDirectory = () => {
    ipcRenderer
      .invoke('recording:open-folder', settings.directory)
      .then((error: string) => {
        if (error) {
          toast.error(`Cannot open recording folder: ${error}`);
        }
        return true;
      })
      .catch((error: unknown) =>
        toast.error(`Cannot open recording folder: ${error}`)
      );
  };

  return (
    <section className="recording-settings">
      <span className="recording-settings-title">Recording</span>
      <label htmlFor="recording-input-device">
        <span>Input:</span>
        <select
          id="recording-input-device"
          value={settings.inputDeviceId}
          onChange={(event) => {
            const selected = inputDevices.find(
              (device) => device.deviceId === event.target.value
            );
            updateSettings({
              inputDeviceId: event.target.value,
              inputDeviceName: selected
                ? formatInputLabel(selected)
                : 'Default input',
            });
          }}
        >
          {!inputDevices.some((device) => device.deviceId === 'default') && (
            <option value="default">Default input</option>
          )}
          {inputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {formatInputLabel(device)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="recording-input-gain">
        <span>Input gain:</span>
        <input
          id="recording-input-gain"
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={settings.gain}
          onChange={(event) =>
            updateSettings({ gain: Number(event.target.value) })
          }
        />
        <output>{Math.round(settings.gain * 100)}%</output>
      </label>
      <label htmlFor="recording-timeout">
        <span>Timeout:</span>
        <input
          id="recording-timeout"
          className="recording-timeout"
          type="number"
          min={0}
          max={3600}
          value={settings.timeoutSeconds}
          onChange={(event) =>
            updateSettings({ timeoutSeconds: Number(event.target.value) })
          }
        />
        <output>seconds (0 = unlimited)</output>
      </label>
      <div className="recording-folder-row">
        <span>Folder:</span>
        <input readOnly value={settings.directory} title={settings.directory} />
        <button type="button" onClick={chooseDirectory}>
          Change
        </button>
        <button type="button" onClick={openDirectory}>
          Open
        </button>
      </div>
    </section>
  );
};

export default RecordingSettings;
