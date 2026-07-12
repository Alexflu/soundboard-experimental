import React, { useEffect, useState } from 'react';
import Player from '../../domain/entities/Player';
import {
  AudioOutput,
  UserPreferences,
} from '../../domain/entities/UserPreferences';
import soundboardDomain from '../../domain/SoundboardDomain';

const MasterVolumeControl = () => {
  const initialVolume =
    soundboardDomain.getUserPreferences().audioOutput.volume ?? 1;
  const [volume, setVolume] = useState(initialVolume);

  useEffect(() => {
    Player.setGlobalMasterVolume(initialVolume);
    const unregister = soundboardDomain.watchUserPreferences(
      (preferences: UserPreferences) => {
        const updatedVolume = preferences.audioOutput.volume ?? 1;
        setVolume(updatedVolume);
        Player.setGlobalMasterVolume(updatedVolume);
      }
    );
    return () => unregister();
  }, [initialVolume]);

  const updateVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    Player.setGlobalMasterVolume(nextVolume);
    const preferences = soundboardDomain.getUserPreferences();
    soundboardDomain.setUserPreferences(
      preferences.setAudioOutput(
        new AudioOutput(
          preferences.audioOutput.id,
          preferences.audioOutput.name,
          nextVolume
        )
      )
    );
  };

  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={volume}
      onChange={(event) => updateVolume(Number(event.target.value))}
      title={`Master volume ${Math.round(volume * 100)}%`}
      aria-label="Master volume"
      style={{ width: '90px', marginLeft: '8px' }}
    />
  );
};

export default MasterVolumeControl;
