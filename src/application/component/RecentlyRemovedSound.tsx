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
  const [sound] = useState(
    () =>
      new Sound(
        savedSound.name,
        '',
        savedSound.url,
        savedSound.source,
        savedSound.volume,
        trim?.startTime,
        trim?.endTime
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
  const captureCleanup = useRef<(() => void) | null>(null);

  const playbackStart = trim?.startTime ?? 0;
  const playbackEnd =
    duration === null
      ? null
      : Math.max(playbackStart, Math.min(trim?.endTime ?? duration, duration));
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

      const startTime = Math.min(playbackStart, totalDuration);
      const endTime = Math.max(
        startTime,
        Math.min(trim?.endTime ?? totalDuration, totalDuration)
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
    const metadataPlayer = new Audio(savedSound.url);
    metadataPlayer.preload = 'metadata';
    const onMetadata = () => {
      const totalDuration = metadataPlayer.duration;
      setDuration(totalDuration);
      setRemainingTime(
        Math.max(
          0,
          Math.min(trim?.endTime ?? totalDuration, totalDuration) -
            Math.min(playbackStart, totalDuration)
        )
      );
    };
    metadataPlayer.addEventListener('loadedmetadata', onMetadata);
    metadataPlayer.load();
    return () => {
      metadataPlayer.removeEventListener('loadedmetadata', onMetadata);
      metadataPlayer.src = '';
    };
  }, [playbackStart, savedSound.url, trim?.endTime]);

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
        <span className="description">Recently removed hotkey sound</span>
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
        <div className="sound-source-control">{sourceIcon}</div>
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
  );
};

export default RecentlyRemovedSound;
