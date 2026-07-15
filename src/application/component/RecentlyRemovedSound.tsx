import React, { useEffect, useRef, useState } from 'react';
import {
  FaGlobeAmericas,
  FaHdd,
  FaPlay,
  FaStop,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import HotkeySound from '../../domain/entities/HotkeySound';
import Player from '../../domain/entities/Player';
import Sound from '../../domain/entities/Sound';
import Source from '../../domain/entities/Source';
import soundboardDomain from '../../domain/SoundboardDomain';
import { SoundTrim } from '../../domain/entities/UserPreferences';
import { toHotkeyDisplay } from '../../domain/entities/HotkeyPreferences';
import PlaybackTrimHandles from './PlaybackTrimHandles';
import { captureHotkey } from './hotkeyCapture';
import { removeRecentlyRemovedSound } from '../recentlyRemovedSounds';

const formatDuration = (duration: number | null) => {
  if (duration === null || !Number.isFinite(duration)) {
    return '--:--';
  }
  const seconds = Math.max(0, Math.ceil(duration));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

const RecentlyRemovedSound = ({
  savedSound,
  trim,
  registerSound,
}: {
  savedSound: HotkeySound;
  trim: SoundTrim | undefined;
  registerSound: (stopSound: () => void) => void;
}) => {
  const initialStartTime = trim?.startTime ?? 0;
  const initialEndTime = trim?.endTime;
  const [sound] = useState(
    () =>
      new Sound(
        savedSound.name,
        '',
        savedSound.url,
        savedSound.source,
        savedSound.volume,
        initialStartTime,
        initialEndTime
      )
  );
  const [player] = useState(() => {
    const { audioOutput } = soundboardDomain.getUserPreferences();
    const masterVolume = audioOutput.volume ?? 1;
    Player.setGlobalMasterVolume(masterVolume);
    return new Player(sound, audioOutput.id, masterVolume);
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [trimStart, setTrimStart] = useState(initialStartTime);
  const [trimEnd, setTrimEnd] = useState<number | undefined>(initialEndTime);
  const captureCleanup = useRef<(() => void) | null>(null);

  const playbackStart =
    duration === null ? trimStart : Math.min(trimStart, duration);
  const playbackEnd =
    duration === null
      ? null
      : Math.max(playbackStart, Math.min(trimEnd ?? duration, duration));
  const playbackDuration =
    playbackEnd === null ? null : Math.max(0, playbackEnd - playbackStart);

  const resetPlaybackDisplay = () => {
    setIsPlaying(false);
    setProgress(0);
    setRemainingTime(playbackDuration);
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

      const startTime = Math.min(trimStart, totalDuration);
      const endTime = Math.max(
        startTime,
        Math.min(trimEnd ?? totalDuration, totalDuration)
      );
      const selectedDuration = endTime - startTime;
      if (selectedDuration <= 0) {
        return;
      }

      setProgress(
        Math.min(
          1,
          Math.max(0, (audioPlayer.currentTime - startTime) / selectedDuration)
        )
      );
      setRemainingTime(Math.max(0, endTime - audioPlayer.currentTime));
    };

    audioPlayer.addEventListener('timeupdate', onTimeUpdate);
    audioPlayer.addEventListener('ended', resetPlaybackDisplay, { once: true });
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
    soundboardDomain.setSoundTrim(savedSound.id, startTime, endTime);

    if (duration !== null) {
      const nextEnd = Math.min(endTime ?? duration, duration);
      setRemainingTime(Math.max(0, nextEnd - Math.min(startTime, duration)));
    }
    setProgress(0);
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
        const bound = soundboardDomain.bindSoundToHotkey(hotkey, sound);
        if (bound) {
          removeRecentlyRemovedSound(savedSound.id);
          toast.success(
            `Bound ${savedSound.name} to ${toHotkeyDisplay(hotkey)}`
          );
        }
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
  }, [player, sound, trim]);

  useEffect(() => {
    const metadataPlayer = new Audio(savedSound.url);
    metadataPlayer.preload = 'metadata';
    const onMetadata = () => {
      const totalDuration = metadataPlayer.duration;
      setDuration(totalDuration);
      setRemainingTime(
        Math.max(
          0,
          Math.min(trimEnd ?? totalDuration, totalDuration) -
            Math.min(trimStart, totalDuration)
        )
      );
    };
    metadataPlayer.addEventListener('loadedmetadata', onMetadata);
    metadataPlayer.load();
    return () => {
      metadataPlayer.removeEventListener('loadedmetadata', onMetadata);
      metadataPlayer.src = '';
    };
  }, [savedSound.url, trimEnd, trimStart]);

  useEffect(
    () => () => {
      captureCleanup.current?.();
      player.stop();
    },
    [player]
  );

  const sourceIcon =
    savedSound.source === Source.LOCAL ? (
      <FaHdd className="source-icon" title={savedSound.source} />
    ) : (
      <FaGlobeAmericas className="source-icon" title={savedSound.source} />
    );

  return (
    <div className="sound-component recently-removed-sound animated fadeInRight">
      <div
        className="sound-progress"
        style={{ transform: `scaleX(${progress})` }}
      />
      <PlaybackTrimHandles
        duration={duration}
        startTime={trimStart}
        endTime={trimEnd}
        onCommit={updateTrim}
      />
      <button
        type="button"
        className="action-container"
        onClick={isPlaying ? stop : play}
        title={isPlaying ? 'Stop sound' : 'Play sound'}
      >
        {isPlaying ? <FaStop className="stop" /> : <FaPlay />}
      </button>
      <div className="name-description-container">
        <span>{savedSound.name}</span>
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
          {isCapturingHotkey ? 'Press keys…' : 'Bind'}
        </button>
        <div className="sound-source-control">
          {sourceIcon}
          <div className="remove-button-container">
            <button
              className="recently-removed-delete"
              type="button"
              onClick={() => removeRecentlyRemovedSound(savedSound.id)}
              title="Remove from history"
              aria-label={`Remove ${savedSound.name} from history`}
            >
              <FaTrash />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentlyRemovedSound;
