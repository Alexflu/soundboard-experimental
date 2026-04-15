import React, { useState } from 'react';
import { FaGlobeAmericas, FaHdd, FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import Player from '../../domain/entities/Player';
import soundboardDomain from '../../domain/SoundboardDomain';
import Source from '../../domain/entities/Source';
import RemoveSound from './RemoveSound';
import { HotkeyAction } from '../../domain/entities/HotkeyPreferences';

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
  const [selectedHotkeyAction, setSelectedHotkeyAction] = useState<
    HotkeyAction
  >('searchSlot1');
  const hotkeySlotOptions: Array<{ action: HotkeyAction; label: string }> = [
    { action: 'searchSlot1', label: 'Search Slot 1' },
    { action: 'searchSlot2', label: 'Search Slot 2' },
    { action: 'searchSlot3', label: 'Search Slot 3' },
    { action: 'searchSlot4', label: 'Search Slot 4' },
    { action: 'searchSlot5', label: 'Search Slot 5' },
    { action: 'searchSlot6', label: 'Search Slot 6' },
    { action: 'searchSlot7', label: 'Search Slot 7' },
  ];

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
    soundboardDomain.bindSoundToHotkey(selectedHotkeyAction, sound);
    toast.success(`Bound ${sound.name} to ${selectedHotkeyAction}`);
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
          <select
            className="bind-hotkey-select"
            value={selectedHotkeyAction}
            onChange={(event) =>
              setSelectedHotkeyAction(event.target.value as HotkeyAction)
            }
          >
            {hotkeySlotOptions.map((hotkeySlotOption) => (
              <option
                key={hotkeySlotOption.action}
                value={hotkeySlotOption.action}
              >
                {hotkeySlotOption.label}
              </option>
            ))}
          </select>
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
