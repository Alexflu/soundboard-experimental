import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AudioOutput,
  UserPreferences,
} from '../../domain/entities/UserPreferences';
import soundboardDomain from '../../domain/SoundboardDomain';
import {
  getRecordingSettings,
  saveRecordingSettings,
} from '../recordingSettings';
import MasterVolumeControl from './MasterVolumeControl';
import RecordingControl from './RecordingControl';

const formatDeviceLabel = (device: MediaDeviceInfo, fallback: string) =>
  device.label?.trim() || fallback;

const CompactAudioControls = () => {
  const initialPreferences = soundboardDomain.getUserPreferences();
  const [recordingSettings, setRecordingSettings] = useState(
    getRecordingSettings
  );
  const [selectedOutput, setSelectedOutput] = useState(
    initialPreferences.audioOutput
  );
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);

  const refreshDevices = useCallback(() => {
    if (!navigator.mediaDevices) {
      return;
    }

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        setInputDevices(
          devices.filter((device) => device.kind === 'audioinput')
        );
        setOutputDevices(
          devices.filter((device) => device.kind === 'audiooutput')
        );
        return true;
      })
      .catch((error) => toast.error(`Cannot enumerate audio devices: ${error}`));
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
    const syncRecordingSettings = () =>
      setRecordingSettings(getRecordingSettings());
    window.addEventListener(
      'soundboard:recording-settings-changed',
      syncRecordingSettings
    );
    return () =>
      window.removeEventListener(
        'soundboard:recording-settings-changed',
        syncRecordingSettings
      );
  }, []);

  useEffect(() => {
    const unregister = soundboardDomain.watchUserPreferences(
      (preferences: UserPreferences) => setSelectedOutput(preferences.audioOutput)
    );
    return () => unregister();
  }, []);

  const updateInput = (deviceId: string) => {
    const selected = inputDevices.find((device) => device.deviceId === deviceId);
    setRecordingSettings(
      saveRecordingSettings({
        inputDeviceId: deviceId,
        inputDeviceName: selected
          ? formatDeviceLabel(selected, 'Default input')
          : 'Default input',
      })
    );
  };

  const updateGain = (gain: number) => {
    setRecordingSettings(saveRecordingSettings({ gain }));
  };

  const updateOutput = (deviceId: string) => {
    const selected = outputDevices.find(
      (device) => device.deviceId === deviceId
    );
    const preferences = soundboardDomain.getUserPreferences();
    const outputName = selected
      ? formatDeviceLabel(selected, 'Default output')
      : 'Default output';
    const additionalOutputs = preferences.audioOutput.additionalOutputs.filter(
      (output) => output.id !== deviceId
    );

    soundboardDomain.setUserPreferences(
      preferences.setAudioOutput(
        new AudioOutput(
          deviceId,
          outputName,
          preferences.audioOutput.volume,
          additionalOutputs
        )
      )
    );
  };

  const hasSelectedInput = inputDevices.some(
    (device) => device.deviceId === recordingSettings.inputDeviceId
  );
  const hasSelectedOutput = outputDevices.some(
    (device) => device.deviceId === selectedOutput.id
  );

  return (
    <div className="compact-audio-controls">
      <select
        className="compact-device-select"
        aria-label="Recording input"
        title={`Recording input: ${recordingSettings.inputDeviceName}`}
        value={recordingSettings.inputDeviceId}
        onChange={(event) => updateInput(event.target.value)}
      >
        {!hasSelectedInput && (
          <option value={recordingSettings.inputDeviceId}>
            {recordingSettings.inputDeviceName}
          </option>
        )}
        {!inputDevices.some((device) => device.deviceId === 'default') &&
          recordingSettings.inputDeviceId !== 'default' && (
            <option value="default">Default input</option>
          )}
        {inputDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {formatDeviceLabel(device, 'Audio input')}
          </option>
        ))}
      </select>
      <input
        className="compact-gain-control"
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={recordingSettings.gain}
        onChange={(event) => updateGain(Number(event.target.value))}
        title={`Recording gain ${Math.round(recordingSettings.gain * 100)}%`}
        aria-label="Recording gain"
      />
      <RecordingControl />
      <select
        className="compact-device-select"
        aria-label="Main audio output"
        title={`Main output: ${selectedOutput.name}`}
        value={selectedOutput.id}
        onChange={(event) => updateOutput(event.target.value)}
      >
        {!hasSelectedOutput && (
          <option value={selectedOutput.id}>{selectedOutput.name}</option>
        )}
        {!outputDevices.some((device) => device.deviceId === 'default') &&
          selectedOutput.id !== 'default' && (
            <option value="default">Default output</option>
          )}
        {outputDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {formatDeviceLabel(device, 'Audio output')}
          </option>
        ))}
      </select>
      <MasterVolumeControl />
    </div>
  );
};

export default CompactAudioControls;
