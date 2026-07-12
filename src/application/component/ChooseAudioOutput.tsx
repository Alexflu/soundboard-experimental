import React, { useCallback, useEffect, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';

import {
  AudioOutput,
  UserPreferences,
} from '../../domain/entities/UserPreferences';
import soundboardDomain from '../../domain/SoundboardDomain';

const formatDeviceLabel = (device: MediaDeviceInfo) => {
  const label = device.label?.trim();
  if (device.deviceId === 'default') {
    if (!label || label.toLowerCase() === 'default') {
      return 'Default';
    }
    return /^default(?:\s|-)/i.test(label) ? label : `Default - ${label}`;
  }
  return label || `Audio output ${device.deviceId.slice(0, 8)}`;
};

class OptionsDevice {
  value: MediaDeviceInfo;

  label: string;

  constructor(value: MediaDeviceInfo, label: string) {
    this.value = value;
    this.label = label;
  }

  static fromMediaDeviceInfo(device: MediaDeviceInfo): OptionsDevice {
    return new OptionsDevice(device, formatDeviceLabel(device));
  }

  static fromUserPreferences(
    userPreference: UserPreferences,
    availableOptions: OptionsDevice[] = []
  ): OptionsDevice {
    const matchingOption = availableOptions.find(
      (option) => option.value.deviceId === userPreference.audioOutput.id
    );
    if (matchingOption) {
      return matchingOption;
    }

    if (availableOptions.length > 0) {
      return (
        availableOptions.find(
          (option) => option.value.deviceId === 'default'
        ) || availableOptions[0]
      );
    }

    const name =
      userPreference.audioOutput.id === 'default'
        ? formatDeviceLabel({
            deviceId: 'default',
            label: userPreference.audioOutput.name,
          } as MediaDeviceInfo)
        : userPreference.audioOutput.name;
    return new OptionsDevice(
      {
        deviceId: userPreference.audioOutput.id,
        label: name,
      } as MediaDeviceInfo,
      name
    );
  }

  toAudioOutput(volume: number): AudioOutput {
    return new AudioOutput(this.value.deviceId, this.label, volume);
  }
}

type SelectStyle = Record<string, unknown>;

type OptionState = {
  isSelected: boolean;
};

const ChooseAudioOutput = () => {
  const initialPreferences = soundboardDomain.getUserPreferences();
  const [optionsDevices, setOptionsDevices] = useState([] as OptionsDevice[]);
  const [selectedOption, setSelectedOption] = useState(
    OptionsDevice.fromUserPreferences(initialPreferences)
  );

  const refreshDevices = useCallback(() => {
    navigator?.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        const optionsDevicesResult = devices
          .filter((device) => device.kind === 'audiooutput')
          .map((device) => OptionsDevice.fromMediaDeviceInfo(device));
        const userPreferences = soundboardDomain.getUserPreferences();
        const refreshedSelection = OptionsDevice.fromUserPreferences(
          userPreferences,
          optionsDevicesResult
        );
        const volume = userPreferences.audioOutput.volume ?? 1;

        setOptionsDevices(optionsDevicesResult);
        setSelectedOption(refreshedSelection);

        if (
          refreshedSelection.value.deviceId !== userPreferences.audioOutput.id ||
          refreshedSelection.label !== userPreferences.audioOutput.name
        ) {
          soundboardDomain.setUserPreferences(
            userPreferences.setAudioOutput(
              refreshedSelection.toAudioOutput(volume)
            )
          );
        }
        return true;
      })
      .catch((reason) => toast.error(`Cannot enumerate devices ${reason}`));
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator?.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () =>
      navigator?.mediaDevices?.removeEventListener?.(
        'devicechange',
        refreshDevices
      );
  }, [refreshDevices]);

  const onSelect = (selectedOptionValue: OptionsDevice) => {
    setSelectedOption(selectedOptionValue);
    const preferences = soundboardDomain.getUserPreferences();
    soundboardDomain.setUserPreferences(
      preferences.setAudioOutput(
        selectedOptionValue.toAudioOutput(preferences.audioOutput.volume ?? 1)
      )
    );
  };

  const customStyles = {
    option: (base: SelectStyle, state: OptionState) => ({
      ...base,
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#2d2d2d',
      fontWeight: state.isSelected ? 'bold' : 'normal',
      '&:hover': {
        backgroundColor: '#3e3e3e',
      },
    }),
    control: (base: SelectStyle) => ({
      ...base,
      backgroundColor: '#2d2d2d',
      borderColor: '#e0e0e0 !important',
      boxShadow: 'none',
      minWidth: '260px',
      width: '45vw',
      marginLeft: '12px',
    }),
    singleValue: (base: SelectStyle) => ({
      ...base,
      color: '#e0e0e0',
    }),
    menu: (base: SelectStyle) => ({
      ...base,
      backgroundColor: '#2d2d2d',
      border: '1px solid #e0e0e0',
    }),
  };

  return (
    <div className="choose-audio-output">
      <span className="label">Choose audio output:</span>
      <Select<OptionsDevice, false>
        styles={customStyles}
        value={selectedOption}
        onChange={(value: OptionsDevice | null) => {
          if (value) {
            onSelect(value);
          }
        }}
        options={optionsDevices}
      />
    </div>
  );
};

export default ChooseAudioOutput;
