import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getRoutingSettings,
  RoutingSettings as RoutingSettingsValue,
  saveRoutingSettings,
} from '../routingSettings';

const formatOutputLabel = (device: MediaDeviceInfo) =>
  device.label?.trim() || `Audio output ${device.deviceId.slice(0, 8)}`;

const RoutingSettings = () => {
  const [settings, setSettings] = useState(getRoutingSettings);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);

  const updateSettings = (updates: Partial<RoutingSettingsValue>) => {
    setSettings(saveRoutingSettings(updates));
  };

  const refreshDevices = useCallback(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        setOutputDevices(
          devices.filter((device) => device.kind === 'audiooutput')
        );
        return true;
      })
      .catch((error) =>
        toast.error(`Cannot enumerate audio outputs: ${error}`)
      );
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
    const syncSettings = () => setSettings(getRoutingSettings());
    window.addEventListener(
      'soundboard:routing-settings-changed',
      syncSettings
    );
    return () =>
      window.removeEventListener(
        'soundboard:routing-settings-changed',
        syncSettings
      );
  }, []);

  const hasSelectedOutput = outputDevices.some(
    (device) => device.deviceId === settings.outputDeviceId
  );

  return (
    <section className="routing-settings">
      <span className="routing-settings-title">Microphone routing</span>
      <label htmlFor="microphone-routing-enabled">
        <span>Passthrough:</span>
        <input
          id="microphone-routing-enabled"
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) =>
            updateSettings({ enabled: event.target.checked })
          }
        />
        <output>{settings.enabled ? 'On' : 'Off'}</output>
      </label>
      <label htmlFor="microphone-routing-output">
        <span>Route output:</span>
        <select
          id="microphone-routing-output"
          value={settings.outputDeviceId}
          onChange={(event) => {
            const selected = outputDevices.find(
              (device) => device.deviceId === event.target.value
            );
            updateSettings({
              outputDeviceId: event.target.value,
              outputDeviceName: selected
                ? formatOutputLabel(selected)
                : 'Default output',
            });
          }}
        >
          {!hasSelectedOutput && (
            <option value={settings.outputDeviceId}>
              {settings.outputDeviceName}
            </option>
          )}
          {!outputDevices.some((device) => device.deviceId === 'default') && (
            <option value="default">Default output</option>
          )}
          {outputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {formatOutputLabel(device)}
            </option>
          ))}
        </select>
      </label>
      <span className="routing-settings-helper">
        Uses the recording input and gain. Select the same output for soundboard
        playback to mix both signals.
      </span>
    </section>
  );
};

export default RoutingSettings;
