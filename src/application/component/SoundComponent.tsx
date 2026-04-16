import React, { useEffect, useRef, useState } from 'react';
import { FaGlobeAmericas, FaHdd, FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import Player from '../../domain/entities/Player';
import soundboardDomain from '../../domain/SoundboardDomain';
import Source from '../../domain/entities/Source';
import RemoveSound from './RemoveSound';
import { getHotkeyFromEvent } from './hotkeyCapture';
import { toHotkeyDisplay } from '../../domain/entities/HotkeyPreferences';

const SoundComponent = ({
  sound,
  registerSound,
  reloadSounds,
  boundHotkey,
  onCaptureStateChange,
}: {
  sound: Sound;
  registerSound: (stopSound: () => void) => void;
  reloadSounds: () => void;
  boundHotkey?: string | null;
  onCaptureStateChange?: (active: boolean) => void;
}) => {
  const [player] = useState(
    new Player(sound, soundboardDomain.getUserPreferences().audioOutput.id)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false);
  const captureButtonRef = useRef<HTMLButtonElement | null>(null);
  const captureListenerRef = useRef<{
    keyDown: (event: KeyboardEvent) => void;
    mouseDown: (event: MouseEvent) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

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

  const stopCapture = () => {
    if (!captureListenerRef.current) {
      return;
    }

    const { keyDown, mouseDown, timeoutId } = captureListenerRef.current;
    window.removeEventListener('keydown', keyDown, true);
    document.removeEventListener('mousedown', mouseDown, true);
    clearTimeout(timeoutId);
    captureListenerRef.current = null;
    setIsCapturingHotkey(false);
    onCaptureStateChange?.(false);
  };

  const startCapture = () => {
    if (isCapturingHotkey) {
      return;
    }
    stopCapture();
    setIsCapturingHotkey(true);
    onCaptureStateChange?.(true);

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        stopCapture();
        return;
      }

      const hotkey = getHotkeyFromEvent(event);
      if (!hotkey) {
        return;
      }

      bindToHotkey(hotkey);
      stopCapture();
    };

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (captureButtonRef.current && target) {
        if (captureButtonRef.current.contains(target)) {
          return;
        }
      }
      stopCapture();
    };

    const timeoutId = setTimeout(() => stopCapture(), 5000);
    captureListenerRef.current = { keyDown: onKeyDown, mouseDown: onMouseDown, timeoutId };
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onMouseDown, true);
  };

  useEffect(
    () => () => {
      if (!captureListenerRef.current) {
        return;
      }
      const { keyDown, mouseDown, timeoutId } = captureListenerRef.current;
      window.removeEventListener('keydown', keyDown, true);
      document.removeEventListener('mousedown', mouseDown, true);
      clearTimeout(timeoutId);
      captureListenerRef.current = null;
      onCaptureStateChange?.(false);
    },
    [onCaptureStateChange]
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
            ref={captureButtonRef}
          >
            {isCapturingHotkey ? 'Press keys' : 'Bind'}
          </button>
          {!!boundHotkey && <span>{toHotkeyDisplay(boundHotkey)}</span>}
          <FaGlobeAmericas className="source-icon" title={sound.source} />
        </div>
      )}
    </div>
  );
};

export default SoundComponent;
