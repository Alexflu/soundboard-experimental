import React, { useState } from 'react';
import { FaGlobeAmericas, FaHdd, FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import Player from '../../domain/entities/Player';
import soundboardDomain from '../../domain/SoundboardDomain';
import Source from '../../domain/entities/Source';
import RemoveSound from './RemoveSound';

const SoundComponent = ({
  sound,
  registerSound,
  reloadSounds,
}: {
  sound: Sound;
  registerSound: (stopSound: () => void) => void;
  reloadSounds: () => void;
}) => {
  const [player] = useState(
    new Player(sound, soundboardDomain.getUserPreferences().audioOutput.id)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [bindingKey, setBindingKey] = useState('Control+F2');

  const stop = () => {
    player.stop();
    setIsPlaying(false);
  };

  const play = () => {
    player.play();
    registerSound(stop);
    setIsPlaying(true);
    player.player?.addEventListener('ended', () => setIsPlaying(false));
  };

  const bindToHotkey = () => {
    if (!bindingKey) {
      toast.error('Please enter a hotkey');
      return;
    }

    soundboardDomain.bindSoundToHotkey(bindingKey, sound);
    toast.success(`Bound ${sound.name} to ${bindingKey}`);
  };

  return (
    <div className="sound-component animated fadeInRight">
      <div className="action-container">
        {!isPlaying ? (
          <FaPlay onClick={() => play()} />
        ) : (
          <FaStop className="stop" onClick={() => stop()} />
        )}
      </div>
      <div className="name-description-container">
        <span>{sound.name}</span>
        <span className="description">{sound.description}</span>
      </div>
      {sound.source === Source.LOCAL ? (
        <div className="row-end">
          <div className="animated fadeInRight remove-button-container">
            <RemoveSound sound={sound} reloadSounds={reloadSounds} />
          </div>
          <FaHdd className="source-icon" title={sound.source} />
        </div>
      ) : (
        <div className="row-end">
          <input
            className="bind-hotkey-select"
            value={bindingKey}
            onChange={(event) => setBindingKey(event.target.value)}
            placeholder="Control+F2"
          />
          <button
            className="bind-hotkey-button"
            type="button"
            onClick={bindToHotkey}
          >
            Bind to hotkey
          </button>
          <FaGlobeAmericas className="source-icon" title={sound.source} />
        </div>
      )}
    </div>
  );
};

export default SoundComponent;
