import React, { useEffect, useState } from 'react';
import Player from '../../domain/entities/Player';
import {
  AudioOutput,
  UserPreferences,
} from '../../domain/entities/UserPreferences';
import soundboardDomain from '../../domain/SoundboardDomain';

const findOutput = (preferences: UserPreferences, outputId: string) => {
  const { audioOutput } = preferences;
  if (audioOutput.id === outputId) {
    return audioOutput;
  }
  return (audioOutput.additionalOutputs || []).find(
    (output) => output.id === outputId
  );
};

const MasterVolumeControl = ({ outputId }: { outputId: string }) => {
  const initialPreferences = soundboardDomain.getUserPreferences();
  const [volume, setVolume] = useState(
    findOutput(initialPreferences, outputId)?.volume ?? 1
  );

  useEffect(() => {
    const syncVolume = (preferences: UserPreferences) => {
      const nextVolume = findOutput(preferences, outputId)?.volume ?? 1;
      setVolume(nextVolume);
      Player.setGlobalAudioOutputVolume(outputId, nextVolume);
    };

    syncVolume(soundboardDomain.getUserPreferences());
    const unregister = soundboardDomain.watchUserPreferences(syncVolume);
    return () => unregister();
  }, [outputId]);

  const updateVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    Player.setGlobalAudioOutputVolume(outputId, nextVolume);
    const preferences = soundboardDomain.getUserPreferences();
    const currentOutput = preferences.audioOutput;
    const additionalOutputs = currentOutput.additionalOutputs || [];
    const nextOutput =
      currentOutput.id === outputId
        ? new AudioOutput(
            currentOutput.id,
            currentOutput.name,
            nextVolume,
            additionalOutputs
          )
        : new AudioOutput(
            currentOutput.id,
            currentOutput.name,
            currentOutput.volume,
            additionalOutputs.map((output) =>
              output.id === outputId
                ? new AudioOutput(output.id, output.name, nextVolume)
                : output
            )
          );

    soundboardDomain.setUserPreferences(preferences.setAudioOutput(nextOutput));
  };

  return (
    <input
      className="master-volume-control"
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={volume}
      onChange={(event) => updateVolume(Number(event.target.value))}
      title={`Output volume ${Math.round(volume * 100)}%`}
      aria-label="Selected output volume"
    />
  );
};

export default MasterVolumeControl;
