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

  static fromAudioOutput(
    audioOutput: AudioOutput,
    availableOptions: OptionsDevice[] = []
  ): OptionsDevice {
    const matchingOption = availableOptions.find(
      (option) => option.value.deviceId === audioOutput.id
    );
    if (matchingOption) {
      return matchingOption;
    }

    const name =
      audioOutput.id === 'default'
        ? formatDeviceLabel({
            deviceId: 'default',
            label: audioOutput.name,
          } as MediaDeviceInfo)
        : audioOutput.name;
    return new OptionsDevice(
      {
        deviceId: audioOutput.id,
        label: name,
      } as MediaDeviceInfo,
      name
    );
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

    return OptionsDevice.fromAudioOutput(userPreference.audioOutput);
  }

  toAudioOutput(volume = 1): AudioOutput {
    return new AudioOutput(this.value.deviceId, this.label, volume);
  }
}

type SelectStyle = Record<string, unknown>;

type OptionState = {
  isSelected: boolean;
};

const sameAudioOutput = (left: AudioOutput, right: AudioOutput) => {
  const leftAdditional = left.additionalOutputs || [];
  const rightAdditional = right.additionalOutputs || [];
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.volume === right.volume &&
    leftAdditional.length === rightAdditional.length &&
    leftAdditional.every(
      (output, index) =>
        output.id === rightAdditional[index]?.id &&
        output.name === rightAdditional[index]?.name &&
        output.volume === rightAdditional[index]?.volume
    )
  );
};

const findOutputVolume = (audioOutput: AudioOutput, outputId: string) => {
  if (audioOutput.id === outputId) {
    return audioOutput.volume ?? 1;
  }
  return (
    audioOutput.additionalOutputs.find((output) => output.id === outputId)
      ?.volume ?? 1
  );
};

const ChooseAudioOutput = () => {
  const initialPreferences = soundboardDomain.getUserPreferences();
  const [optionsDevices, setOptionsDevices] = useState([] as OptionsDevice[]);
  const [selectedMain, setSelectedMain] = useState(
    OptionsDevice.fromUserPreferences(initialPreferences)
  );
  const [selectedAdditional, setSelectedAdditional] = useState(
    (initialPreferences.audioOutput.additionalOutputs || []).map((output) =>
      OptionsDevice.fromAudioOutput(output)
    )
  );

  const saveSelection = useCallback(
    (main: OptionsDevice, additional: OptionsDevice[]) => {
      const preferences = soundboardDomain.getUserPreferences();
      const currentOutput = preferences.audioOutput;
      const nextOutput = new AudioOutput(
        main.value.deviceId,
        main.label,
        findOutputVolume(currentOutput, main.value.deviceId),
        additional.map((option) =>
          option.toAudioOutput(
            findOutputVolume(currentOutput, option.value.deviceId)
          )
        )
      );

      if (!sameAudioOutput(currentOutput, nextOutput)) {
        soundboardDomain.setUserPreferences(
          preferences.setAudioOutput(nextOutput)
        );
      }
    },
    []
  );

  const refreshDevices = useCallback(() => {
    navigator?.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        const available = devices
          .filter((device) => device.kind === 'audiooutput')
          .map((device) => OptionsDevice.fromMediaDeviceInfo(device));
        const preferences = soundboardDomain.getUserPreferences();
        const main = OptionsDevice.fromUserPreferences(preferences, available);
        const additional = (preferences.audioOutput.additionalOutputs || [])
          .map((output) =>
            available.find((option) => option.value.deviceId === output.id)
          )
          .filter((option): option is OptionsDevice =>
            Boolean(option && option.value.deviceId !== main.value.deviceId)
          );

        setOptionsDevices(available);
        setSelectedMain(main);
        setSelectedAdditional(additional);
        saveSelection(main, additional);
        return true;
      })
      .catch((reason) => toast.error(`Cannot enumerate devices ${reason}`));
  }, [saveSelection]);

  useEffect(() => {
    refreshDevices();
    navigator?.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () =>
      navigator?.mediaDevices?.removeEventListener?.(
        'devicechange',
        refreshDevices
      );
  }, [refreshDevices]);

  const onMainSelect = (nextMain: OptionsDevice) => {
    const nextAdditional = selectedAdditional.filter(
      (option) => option.value.deviceId !== nextMain.value.deviceId
    );
    setSelectedMain(nextMain);
    setSelectedAdditional(nextAdditional);
    saveSelection(nextMain, nextAdditional);
  };

  const saveAdditional = (nextAdditional: OptionsDevice[]) => {
    setSelectedAdditional(nextAdditional);
    saveSelection(selectedMain, nextAdditional);
  };

  const updateAdditional = (index: number, nextValue: OptionsDevice | null) => {
    if (!nextValue) {
      saveAdditional(
        selectedAdditional.filter((_, currentIndex) => currentIndex !== index)
      );
      return;
    }

    saveAdditional(
      selectedAdditional.map((option, currentIndex) =>
        currentIndex === index ? nextValue : option
      )
    );
  };

  const addAdditional = (nextValue: OptionsDevice | null) => {
    if (nextValue) {
      saveAdditional(selectedAdditional.concat(nextValue));
    }
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

  const selectedAdditionalIds = new Set(
    selectedAdditional.map((option) => option.value.deviceId)
  );
  const getAdditionalOptions = (current?: OptionsDevice) =>
    optionsDevices.filter(
      (option) =>
        option.value.deviceId !== selectedMain.value.deviceId &&
        (option.value.deviceId === current?.value.deviceId ||
          !selectedAdditionalIds.has(option.value.deviceId))
    );
  const emptyAdditionalOptions = getAdditionalOptions();

  return (
    <div className="choose-audio-output">
      <div className="audio-output-row">
        <span className="label">Main audio output:</span>
        <Select<OptionsDevice, false>
          styles={customStyles}
          value={selectedMain}
          onChange={(value: OptionsDevice | null) => {
            if (value) {
              onMainSelect(value);
            }
          }}
          options={optionsDevices}
        />
      </div>
      <div className="audio-output-row additional-output-row">
        <span className="label">Additional outputs:</span>
        <div className="additional-output-selects">
          {selectedAdditional.map((option, index) => (
            <Select<OptionsDevice, false>
              key={option.value.deviceId}
              isClearable
              styles={customStyles}
              value={option}
              onChange={(value: OptionsDevice | null) =>
                updateAdditional(index, value)
              }
              options={getAdditionalOptions(option)}
            />
          ))}
          {emptyAdditionalOptions.length > 0 && (
            <Select<OptionsDevice, false>
              styles={customStyles}
              value={null}
              onChange={addAdditional}
              options={emptyAdditionalOptions}
              placeholder="Add output..."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChooseAudioOutput;
