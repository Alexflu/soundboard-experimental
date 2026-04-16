import React, { useRef, useState } from 'react';
import { FaGlobeAmericas, FaHdd, FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import Player from '../../domain/entities/Player';
import soundboardDomain from '../../domain/SoundboardDomain';
import Source from '../../domain/entities/Source';
import RemoveSound from './RemoveSound';
import { beginHotkeyCapture } from './hotkeyCapture';
import { toHotkeyDisplay } from '../../domain/entities/HotkeyPreferences';

const SoundComponent = ({
  sound,
  registerSound,
  reloadSounds,
  requireModifierForHotkeys,
  existingBindingHotkey,
}: {
  sound: Sound;
  registerSound: (stopSound: () => void) => void;
  reloadSounds: () => void;
  requireModifierForHotkeys: boolean;
  existingBindingHotkey?: string;
}) => {
  const [player] = useState(
    new Player(sound, soundboardDomain.getUserPreferences().audioOutput.id)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false);
  const bindButtonRef = useRef<HTMLButtonElement | null>(null);

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

  const bindToHotkey = (bindingKey: string) => {
    soundboardDomain.bindSoundToHotkey(bindingKey, sound);
    toast.success(`Bound ${sound.name} to ${toHotkeyDisplay(bindingKey)}`);
  };

  const startCapture = () => {
    if (isCapturingHotkey || !bindButtonRef.current) {
      return;
    }

    setIsCapturingHotkey(true);
    beginHotkeyCapture({
      captureElement: bindButtonRef.current,
      requireModifier: requireModifierForHotkeys,
      onResolve: (hotkey) => {
        bindToHotkey(hotkey);
        setIsCapturingHotkey(false);
      },
      onCancel: () => setIsCapturingHotkey(false),
    });
  };

  const renderBindingHint = () =>
    existingBindingHotkey ? (
      <span className="sound-binding-hint">
        {toHotkeyDisplay(existingBindingHotkey)}
      </span>
    ) : null;

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
          {renderBindingHint()}
          <div className="animated fadeInRight remove-button-container">
            <RemoveSound sound={sound} reloadSounds={reloadSounds} />
          </div>
          <FaHdd className="source-icon" title={sound.source} />
        </div>
      ) : (
        <div className="row-end">
          {renderBindingHint()}
          <button
            ref={bindButtonRef}
            className="bind-hotkey-button"
            type="button"
            onClick={startCapture}
          >
            {isCapturingHotkey
              ? 'Press keys (Esc/click/outside to cancel)'
              : 'Bind hotkey'}
          </button>
          <FaGlobeAmericas className="source-icon" title={sound.source} />
        </div>
      )}
    </div>
  );
};

export default SoundComponent;
