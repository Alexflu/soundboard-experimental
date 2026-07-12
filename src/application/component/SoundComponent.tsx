import React, { useEffect, useRef, useState } from 'react';
import { FaGlobeAmericas, FaHdd, FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import Player from '../../domain/entities/Player';
import soundboardDomain from '../../domain/SoundboardDomain';
import Source from '../../domain/entities/Source';
import { HotkeyBinding } from '../../domain/entities/UserPreferences';
import RemoveSound from './RemoveSound';
import { captureHotkey } from './hotkeyCapture';
import { toHotkeyDisplay } from '../../domain/entities/HotkeyPreferences';

const formatDuration = (duration: number | null) => {
  if (duration === null || !Number.isFinite(duration)) {
    return '--:--';
  }
  const seconds = Math.max(0, Math.ceil(duration));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

const SoundComponent = ({
  sound,
  bindings,
  registerSound,
  reloadSounds,
}: {
  sound: Sound;
  bindings: HotkeyBinding[];
  registerSound: (stopSound: () => void) => void;
  reloadSounds: () => void;
}) => {
  const [player] = useState(() => {
    const audioOutput = soundboardDomain.getUserPreferences().audioOutput;
    const masterVolume = audioOutput.volume ?? 1;
    Player.setGlobalMasterVolume(masterVolume);
    return new Player(sound, audioOutput.id, masterVolume);
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(sound.volume);
  const captureCleanup = useRef<(() => void) | null>(null);
  const soundBindings = bindings.filter(
    (binding) => binding.sound.id === sound.path
  );
  const canReorder = sound.source === Source.LOCAL;

  const resetPlaybackDisplay = () => {
    setIsPlaying(false);
    setProgress(0);
    setRemainingTime(duration);
  };

  const stop = () => {
    player.stop();
    resetPlaybackDisplay();
  };

  const play = () => {
    player.play();
    const audioPlayer = player.player;
    if (!audioPlayer) {
      return;
    }

    registerSound(stop);
    setIsPlaying(true);
    setRemainingTime(duration);

    const onTimeUpdate = () => {
      const totalDuration = Number.isFinite(audioPlayer.duration)
        ? audioPlayer.duration
        : duration;
      if (totalDuration && totalDuration > 0) {
        setProgress(audioPlayer.currentTime / totalDuration);
        setRemainingTime(totalDuration - audioPlayer.currentTime);
      }
    };

    audioPlayer.addEventListener('timeupdate', onTimeUpdate);
    audioPlayer.addEventListener('ended', resetPlaybackDisplay, { once: true });
  };

  const updateVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    player.setVolume(nextVolume);
    if (sound.source === Source.LOCAL) {
      const preferences = soundboardDomain.getUserPreferences();
      soundboardDomain.localSoundAdapter.setSoundVolume(
        preferences.pathToSoundsJson,
        sound.path,
        nextVolume
      );
    }
  };

  const reorderSound = (sourceSoundPath: string) => {
    if (!canReorder || !sourceSoundPath || sourceSoundPath === sound.path) {
      return;
    }
    const preferences = soundboardDomain.getUserPreferences();
    soundboardDomain.localSoundAdapter.reorderSounds(
      preferences.pathToSoundsJson,
      sourceSoundPath,
      sound.path
    );
    reloadSounds();
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

  useEffect(() => {
    const metadataPlayer = new Audio(sound.path);
    metadataPlayer.preload = 'metadata';
    const onMetadata = () => {
      setDuration(metadataPlayer.duration);
      setRemainingTime(metadataPlayer.duration);
    };
    metadataPlayer.addEventListener('loadedmetadata', onMetadata);
    return () => {
      metadataPlayer.removeEventListener('loadedmetadata', onMetadata);
      metadataPlayer.src = '';
    };
  }, [sound.path]);

  useEffect(
    () => () => {
      captureCleanup.current?.();
    },
    []
  );

  const bindingLabel = soundBindings.length
    ? soundBindings.map((binding) => toHotkeyDisplay(binding.key)).join(', ')
    : 'Bind';

  const sourceIcon =
    sound.source === Source.LOCAL ? (
      <FaHdd className="source-icon" title={sound.source} />
    ) : (
      <FaGlobeAmericas className="source-icon" title={sound.source} />
    );

  return (
    <div
      className="sound-component animated fadeInRight"
      onDragOver={(event) => {
        if (canReorder) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        reorderSound(
          event.dataTransfer.getData('application/x-soundboard-local')
        );
      }}
    >
      <div
        className="sound-progress"
        style={{ transform: `scaleX(${progress})` }}
      />
      <button
        type="button"
        className="action-container"
        onClick={isPlaying ? stop : play}
        title={isPlaying ? 'Stop sound' : 'Play sound'}
      >
        {isPlaying ? <FaStop className="stop" /> : <FaPlay />}
      </button>
      <div
        className={`name-description-container${
          canReorder ? ' reorder-handle' : ''
        }`}
        draggable={canReorder}
        onDragStart={(event) => {
          if (canReorder) {
            event.dataTransfer.setData(
              'application/x-soundboard-local',
              sound.path
            );
            event.dataTransfer.effectAllowed = 'move';
          }
        }}
        title={canReorder ? 'Drag to reorder' : undefined}
      >
        <span>{sound.name}</span>
        <span className="description">{sound.description}</span>
      </div>
      <div className="row-end">
        <span
          className="sound-duration"
          title={`Total duration ${formatDuration(duration)}`}
        >
          {formatDuration(isPlaying ? remainingTime : duration)}
        </span>
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
          {isCapturingHotkey ? 'Press keys…' : bindingLabel}
        </button>
        <div className="sound-source-control">
          {sourceIcon}
          {sound.source === Source.LOCAL && (
            <div className="remove-button-container">
              <RemoveSound sound={sound} reloadSounds={reloadSounds} />
            </div>
          )}
        </div>
        <input
          className="sound-volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(event) => updateVolume(Number(event.target.value))}
          title={`Volume ${Math.round(volume * 100)}%`}
          aria-label={`${sound.name} volume`}
        />
      </div>
    </div>
  );
};

export default SoundComponent;
