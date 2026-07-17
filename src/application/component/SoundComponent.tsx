import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaGlobeAmericas, FaHdd, FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import Player from '../../domain/entities/Player';
import soundboardDomain from '../../domain/SoundboardDomain';
import Source from '../../domain/entities/Source';
import {
  HotkeyBinding,
  SoundTrim,
} from '../../domain/entities/UserPreferences';
import RemoveSound from './RemoveSound';
import { captureHotkey } from './hotkeyCapture';
import { toHotkeyDisplay } from '../../domain/entities/HotkeyPreferences';
import PlaybackTrimHandles from './PlaybackTrimHandles';

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
  trim,
  bindings,
  registerSound,
  reloadSounds,
}: {
  sound: Sound;
  trim: SoundTrim | undefined;
  bindings: HotkeyBinding[];
  registerSound: (stopSound: () => void) => void;
  reloadSounds: () => void;
}) => {
  const initialStartTime = trim?.startTime ?? sound.startTime;
  const initialEndTime = trim?.endTime ?? sound.endTime;
  const [player] = useState(() => {
    const { audioOutput } = soundboardDomain.getUserPreferences();
    const masterVolume = audioOutput.volume ?? 1;
    Player.setGlobalMasterVolume(masterVolume);
    sound.startTime = initialStartTime;
    sound.endTime = initialEndTime;
    return new Player(sound, audioOutput.id, masterVolume);
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(sound.volume);
  const [trimStart, setTrimStart] = useState(initialStartTime);
  const [trimEnd, setTrimEnd] = useState<number | undefined>(initialEndTime);
  const captureCleanup = useRef<(() => void) | null>(null);
  const soundBindings = bindings.filter(
    (binding) => binding.sound.id === sound.path
  );
  const canReorder = sound.source === Source.LOCAL;
  const canTrim = sound.source === Source.LOCAL;
  const playbackStart =
    duration === null ? trimStart : Math.min(trimStart, duration);
  const playbackEnd =
    duration === null
      ? null
      : Math.max(playbackStart, Math.min(trimEnd ?? duration, duration));
  const playbackDuration =
    playbackEnd === null ? null : Math.max(0, playbackEnd - playbackStart);

  const updateKnownDuration = useCallback(
    (totalDuration: number) => {
      if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
        return null;
      }

      setDuration(totalDuration);
      const startTime = Math.min(trimStart, totalDuration);
      const endTime = Math.max(
        startTime,
        Math.min(trimEnd ?? totalDuration, totalDuration)
      );
      const selectedDuration = Math.max(0, endTime - startTime);
      setRemainingTime(selectedDuration);
      return selectedDuration;
    },
    [trimEnd, trimStart]
  );

  const resetPlaybackDisplay = (totalDuration?: number) => {
    setIsPlaying(false);
    setProgress(0);
    if (
      totalDuration === undefined ||
      updateKnownDuration(totalDuration) === null
    ) {
      setRemainingTime(playbackDuration);
    }
  };

  const stop = () => {
    player.stop();
    resetPlaybackDisplay();
  };

  const play = () => {
    player.sound.startTime = trimStart;
    player.sound.endTime = trimEnd;
    player.play();
    const audioPlayer = player.player;
    if (!audioPlayer) {
      return;
    }

    registerSound(stop);
    setIsPlaying(true);
    setRemainingTime(playbackDuration);

    const onTimeUpdate = () => {
      const totalDuration = Number.isFinite(audioPlayer.duration)
        ? audioPlayer.duration
        : duration;
      if (!totalDuration || totalDuration <= 0) {
        return;
      }

      setDuration(totalDuration);
      const startTime = Math.min(trimStart, totalDuration);
      const endTime = Math.max(
        startTime,
        Math.min(trimEnd ?? totalDuration, totalDuration)
      );
      const rangeDuration = endTime - startTime;
      if (rangeDuration <= 0) {
        return;
      }

      setProgress(
        Math.min(
          1,
          Math.max(0, (audioPlayer.currentTime - startTime) / rangeDuration)
        )
      );
      setRemainingTime(Math.max(0, endTime - audioPlayer.currentTime));
    };

    let playbackFinished = false;
    const finishPlayback = () => {
      if (playbackFinished) {
        return;
      }
      playbackFinished = true;
      audioPlayer.removeEventListener('timeupdate', onTimeUpdate);
      audioPlayer.removeEventListener('ended', finishPlayback);
      audioPlayer.removeEventListener('pause', finishPlayback);
      resetPlaybackDisplay(audioPlayer.duration);
    };

    audioPlayer.addEventListener('timeupdate', onTimeUpdate);
    audioPlayer.addEventListener('ended', finishPlayback, { once: true });
    audioPlayer.addEventListener('pause', finishPlayback, { once: true });
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

  const updateTrim = (startTime: number, endTime?: number) => {
    if (isPlaying) {
      stop();
    }
    setTrimStart(startTime);
    setTrimEnd(endTime);
    sound.startTime = startTime;
    sound.endTime = endTime;
    player.sound.startTime = startTime;
    player.sound.endTime = endTime;
    soundboardDomain.setSoundTrim(sound.path, startTime, endTime);

    if (duration !== null) {
      const nextEnd = Math.min(endTime ?? duration, duration);
      setRemainingTime(Math.max(0, nextEnd - Math.min(startTime, duration)));
    }
    setProgress(0);
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
    const nextStart = trim?.startTime ?? 0;
    const nextEnd = trim?.endTime;
    setTrimStart(nextStart);
    setTrimEnd(nextEnd);
    sound.startTime = nextStart;
    sound.endTime = nextEnd;
    player.sound.startTime = nextStart;
    player.sound.endTime = nextEnd;

    if (duration !== null) {
      setRemainingTime(
        Math.max(
          0,
          Math.min(nextEnd ?? duration, duration) -
            Math.min(nextStart, duration)
        )
      );
    }
  }, [duration, player, sound, trim]);

  useEffect(() => {
    const metadataPlayer = new Audio(sound.path);
    metadataPlayer.preload = 'metadata';
    const onMetadata = () => {
      updateKnownDuration(metadataPlayer.duration);
    };
    metadataPlayer.addEventListener('loadedmetadata', onMetadata);
    metadataPlayer.addEventListener('durationchange', onMetadata);
    metadataPlayer.load();
    return () => {
      metadataPlayer.removeEventListener('loadedmetadata', onMetadata);
      metadataPlayer.removeEventListener('durationchange', onMetadata);
      metadataPlayer.src = '';
    };
  }, [sound.path, updateKnownDuration]);

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
      {canTrim && (
        <PlaybackTrimHandles
          duration={duration}
          startTime={trimStart}
          endTime={trimEnd}
          onCommit={updateTrim}
        />
      )}
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
          title={`Selected duration ${formatDuration(playbackDuration)}`}
        >
          {formatDuration(isPlaying ? remainingTime : playbackDuration)}
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
