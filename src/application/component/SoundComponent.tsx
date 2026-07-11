import React, { useEffect, useRef, useState } from 'react';
import { FaGlobeAmericas, FaHdd, FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import Player from '../../domain/entities/Player';
import soundboardDomain from '../../domain/SoundboardDomain';
import Source from '../../domain/entities/Source';
import RemoveSound from './RemoveSound';
import { captureHotkey } from './hotkeyCapture';
import { toHotkeyDisplay } from '../../domain/entities/HotkeyPreferences';

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
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false);
  const captureCleanup = useRef<(() => void) | null>(null);

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
    const bound = soundboardDomain.bindSoundToHotkey(bindingKey, sound);
    if (bound) {
      toast.success(`Bound ${sound.name} to ${toHotkeyDisplay(bindingKey)}`);
    }
  };

  const finishCapture = () => {
    captureCleanup.current = null;
    setIsCapturingHotkey(false);
  };

  const startCapture = () => {
    if (isCapturingHotkey) {
      return;
    }

    setIsCapturingHotkey(true);
    captureCleanup.current = captureHotkey({
      onCapture: (hotkey) => {
        bindToHotkey(hotkey);
        finishCapture();
      },
      onCancel: (reason) => {
        finishCapture();
        if (reason === 'timeout') {
          toast.info('Hotkey binding timed out');
        }
      },
    });
  };

  useEffect(
    () => () => {
      captureCleanup.current?.();
    },
    []
  );

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
          <button
            className="bind-hotkey-button"
            type="button"
            onClick={startCapture}
            data-hotkey-capture-trigger
            title={
              isCapturingHotkey
                ? 'Press a key combination. Escape or click elsewhere to cancel.'
                : 'Bind this sound to a global hotkey'
            }
          >
            {isCapturingHotkey
              ? 'Press keys… (Esc/click cancels)'
              : 'Bind hotkey'}
          </button>
          <FaGlobeAmericas className="source-icon" title={sound.source} />
        </div>
      )}
    </div>
  );
};

export default SoundComponent;
