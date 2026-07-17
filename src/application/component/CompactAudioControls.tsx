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
  const [recordingSettings, setRecordingSettings] =
    useState(getRecordingSettings);
  const [audioOutput, setAudioOutput] = useState(
    initialPreferences.audioOutput
  );
  const [selectedOutputId, setSelectedOutputId] = useState(
    initialPreferences.audioOutput.id
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
      .catch((error) =>
        toast.error(`Cannot enumerate audio devices: ${error}`)
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
      (preferences: UserPreferences) => {
        const nextAudioOutput = preferences.audioOutput;
        const activeOutputIds = new Set([
          nextAudioOutput.id,
          ...(nextAudioOutput.additionalOutputs || []).map(
            (output) => output.id
          ),
        ]);
        setAudioOutput(nextAudioOutput);
        setSelectedOutputId((current) =>
          activeOutputIds.has(current) ? current : nextAudioOutput.id
        );
      }
    );
    return () => unregister();
  }, []);

  const updateInput = (deviceId: string) => {
    const selected = inputDevices.find(
      (device) => device.deviceId === deviceId
    );
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
    const preferences = soundboardDomain.getUserPreferences();
    const currentOutput = preferences.audioOutput;
    const activeOutputs = [
      currentOutput,
      ...(currentOutput.additionalOutputs || []),
    ];
    if (activeOutputs.some((output) => output.id === deviceId)) {
      setSelectedOutputId(deviceId);
      return;
    }

    const selected = outputDevices.find(
      (device) => device.deviceId === deviceId
    );
    const outputName = selected
      ? formatDeviceLabel(selected, 'Default output')
      : 'Default output';
    const additionalOutputs = (currentOutput.additionalOutputs || []).filter(
      (output) => output.id !== deviceId
    );

    setSelectedOutputId(deviceId);
    soundboardDomain.setUserPreferences(
      preferences.setAudioOutput(
        new AudioOutput(deviceId, outputName, 1, additionalOutputs)
      )
    );
  };

  const activeOutputs = [audioOutput, ...(audioOutput.additionalOutputs || [])];
  const activeOutputIds = new Set(activeOutputs.map((output) => output.id));
  const selectedOutput =
    activeOutputs.find((output) => output.id === selectedOutputId) ||
    audioOutput;
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
        max={1}
        step={0.05}
        value={recordingSettings.gain}
        onChange={(event) => updateGain(Number(event.target.value))}
        title={`Recording gain ${Math.round(recordingSettings.gain * 100)}%`}
        aria-label="Recording gain"
      />
      <RecordingControl />
      <select
        className="compact-device-select"
        aria-label="Audio output volume target"
        title={`Output volume: ${selectedOutput.name}`}
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
        {outputDevices.map((device) => {
          const isActive = activeOutputIds.has(device.deviceId);
          return (
            <option key={device.deviceId} value={device.deviceId}>
              {formatDeviceLabel(device, 'Audio output')}
              {isActive ? ' (active)' : ''}
            </option>
          );
        })}
      </select>
      <MasterVolumeControl outputId={selectedOutput.id} />
    </div>
  );
};

export default CompactAudioControls;
