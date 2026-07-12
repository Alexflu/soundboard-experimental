import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FaGlobeAmericas,
  FaHdd,
  FaPlay,
  FaStop,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import Player from '../../domain/entities/Player';
import SoundComponent from '../component/SoundComponent';
import FilterComponent from '../component/FilterComponent';
import AddSound from '../component/AddSound';
import Filters from '../../domain/entities/Filters';
import soundboardDomain from '../../domain/SoundboardDomain';
import {
  HotkeyBinding,
  UserPreferences,
} from '../../domain/entities/UserPreferences';
import Source from '../../domain/entities/Source';
import {
  HotkeyMap,
  toHotkeyDisplay,
} from '../../domain/entities/HotkeyPreferences';
import { captureHotkey } from '../component/hotkeyCapture';

const getBindingId = (binding: HotkeyBinding) => binding.sound.id;

const formatDuration = (duration?: number) => {
  if (duration === undefined || !Number.isFinite(duration)) {
    return '--:--';
  }
  const seconds = Math.max(0, Math.ceil(duration));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

const SoundsView = ({
  stopAllSounds,
  registerSound,
  setGlobalFilters,
}: {
  stopAllSounds: (() => void)[];
  registerSound: (stopSound: () => void) => void;
  setGlobalFilters: (filters: Filters) => void;
}) => {
  const initialPreferences = soundboardDomain.getUserPreferences();
  const [sounds, setSounds] = useState([] as Sound[]);
  const [filters, setFilters] = useState(new Filters(''));
  const [bindings, setBindings] = useState<HotkeyBinding[]>(
    initialPreferences.bindings
  );
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(initialPreferences.hotkeys);
  const [editingBindingId, setEditingBindingId] = useState<string | null>(null);
  const [playingProgress, setPlayingProgress] = useState<
    Record<string, number>
  >({});
  const [playingBindings, setPlayingBindings] = useState<
    Record<string, boolean>
  >({});
  const [boundDurations, setBoundDurations] = useState<Record<string, number>>(
    {}
  );
  const [boundRemainingTimes, setBoundRemainingTimes] = useState<
    Record<string, number>
  >({});
  const activeBoundPlayers = useRef<Record<string, Set<Player>>>({});
  const latestBoundPlayer = useRef<Record<string, Player>>({});
  const boundDurationsRef = useRef<Record<string, number>>({});
  const editCaptureCleanup = useRef<(() => void) | null>(null);

  const reloadSounds = useCallback(() => {
    soundboardDomain
      .getSounds(filters)
      .then((filteredSounds: Sound[]) => setSounds(filteredSounds))
      .catch(() => {
        toast.error('Cannot get sounds');
      });
  }, [filters]);

  const onFilterUpdated = (newFilters: Filters) => {
    const updated = Filters.fromFilters(newFilters);
    setFilters(updated);
    setGlobalFilters(updated);
  };

  const stopAll = () => stopAllSounds.forEach((stopSound) => stopSound());

  const playBoundHotkeySound = (binding: HotkeyBinding) => {
    const player = soundboardDomain.playBoundHotkeySound(
      binding.key,
      binding.sound.id
    );
    if (player) {
      registerSound(() => player.stop());
    }
  };

  const stopBoundHotkeySound = (binding: HotkeyBinding) => {
    const bindingId = getBindingId(binding);
    activeBoundPlayers.current[bindingId]?.forEach((player) => player.stop());
    delete activeBoundPlayers.current[bindingId];
    delete latestBoundPlayer.current[bindingId];
    setPlayingBindings((current) => ({ ...current, [bindingId]: false }));
    setPlayingProgress((current) => {
      const updated = { ...current };
      delete updated[bindingId];
      return updated;
    });
    setBoundRemainingTimes((current) => ({
      ...current,
      [bindingId]:
        boundDurationsRef.current[bindingId] ?? current[bindingId] ?? 0,
    }));
  };

  const reorderBinding = (sourceSoundId: string, targetSoundId: string) => {
    if (!sourceSoundId || sourceSoundId === targetSoundId) {
      return;
    }
    soundboardDomain.reorderBindings(sourceSoundId, targetSoundId);
  };

  const finishEditingBinding = () => {
    editCaptureCleanup.current = null;
    setEditingBindingId(null);
  };

  const editBindingKey = (binding: HotkeyBinding) => {
    editCaptureCleanup.current?.();
    setEditingBindingId(getBindingId(binding));

    editCaptureCleanup.current = captureHotkey({
      onCapture: (nextKey) => {
        if (
          nextKey !== binding.key &&
          soundboardDomain.updateBindingKey(
            binding.key,
            nextKey,
            binding.sound.id
          )
        ) {
          toast.success(`Updated hotkey to ${toHotkeyDisplay(nextKey)}`);
        }
        finishEditingBinding();
      },
      onCancel: (reason) => {
        finishEditingBinding();
        if (reason === 'timeout') {
          toast.info('Hotkey binding timed out');
        }
      },
    });
  };

  const removeBinding = (binding: HotkeyBinding) => {
    stopBoundHotkeySound(binding);
    soundboardDomain.removeBinding(binding.key, binding.sound.id);
    toast.success(`Removed hotkey ${toHotkeyDisplay(binding.key)}`);
  };

  const setBindingVolume = (binding: HotkeyBinding, value: string) => {
    const volume = Number(value);
    soundboardDomain.setBindingVolume(binding.key, binding.sound.id, volume);
  };

  useEffect(() => reloadSounds(), [reloadSounds]);

  useEffect(() => {
    const unregister = soundboardDomain.watchUserPreferences(
      (updatedPreferences: UserPreferences) => {
        setBindings(updatedPreferences.bindings);
        setHotkeys(updatedPreferences.hotkeys);
      }
    );
    return () => unregister();
  }, []);

  useEffect(
    () => () => {
      editCaptureCleanup.current?.();
    },
    []
  );

  useEffect(() => {
    const cleanups = bindings.reduce<Array<() => void>>((current, binding) => {
      const bindingId = getBindingId(binding);
      if (boundDurationsRef.current[bindingId] !== undefined) {
        return current;
      }

      const metadataPlayer = new Audio(binding.sound.url);
      metadataPlayer.preload = 'metadata';
      const onMetadata = () => {
        const { duration } = metadataPlayer;
        if (!Number.isFinite(duration) || duration <= 0) {
          return;
        }
        boundDurationsRef.current[bindingId] = duration;
        setBoundDurations((values) => ({ ...values, [bindingId]: duration }));
        setBoundRemainingTimes((values) =>
          values[bindingId] === undefined
            ? { ...values, [bindingId]: duration }
            : values
        );
      };
      metadataPlayer.addEventListener('loadedmetadata', onMetadata);
      metadataPlayer.load();

      return current.concat(() => {
        metadataPlayer.removeEventListener('loadedmetadata', onMetadata);
        metadataPlayer.src = '';
      });
    }, []);

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [bindings]);

  useEffect(() => {
    const unregisterPlayback = soundboardDomain.onBoundPlayback(
      ({ soundId, player }) => {
        const audioPlayer = player.player;
        if (!audioPlayer) {
          return;
        }

        const progressId = soundId;
        const players =
          activeBoundPlayers.current[progressId] || new Set<Player>();
        players.add(player);
        activeBoundPlayers.current[progressId] = players;
        latestBoundPlayer.current[progressId] = player;
        setPlayingBindings((current) => ({ ...current, [progressId]: true }));
        setPlayingProgress((current) => ({ ...current, [progressId]: 0 }));

        const onTimeUpdate = () => {
          if (latestBoundPlayer.current[progressId] !== player) {
            return;
          }
          const duration = audioPlayer.duration;
          if (!Number.isFinite(duration) || duration <= 0) {
            return;
          }
          boundDurationsRef.current[progressId] = duration;
          setBoundDurations((current) => ({
            ...current,
            [progressId]: duration,
          }));
          setPlayingProgress((current) => ({
            ...current,
            [progressId]: audioPlayer.currentTime / duration,
          }));
          setBoundRemainingTimes((current) => ({
            ...current,
            [progressId]: Math.max(0, duration - audioPlayer.currentTime),
          }));
        };

        const removePlayer = () => {
          const activePlayers = activeBoundPlayers.current[progressId];
          activePlayers?.delete(player);

          if (latestBoundPlayer.current[progressId] === player) {
            const nextPlayer = activePlayers
              ? Array.from(activePlayers)[0]
              : undefined;
            if (nextPlayer) {
              latestBoundPlayer.current[progressId] = nextPlayer;
            }
          }

          if (!activePlayers || activePlayers.size === 0) {
            delete activeBoundPlayers.current[progressId];
            delete latestBoundPlayer.current[progressId];
            setPlayingBindings((current) => ({
              ...current,
              [progressId]: false,
            }));
            setPlayingProgress((current) => {
              const updated = { ...current };
              delete updated[progressId];
              return updated;
            });
            setBoundRemainingTimes((current) => ({
              ...current,
              [progressId]:
                boundDurationsRef.current[progressId] ??
                current[progressId] ??
                0,
            }));
          }
        };

        audioPlayer.addEventListener('timeupdate', onTimeUpdate);
        audioPlayer.addEventListener('ended', removePlayer, { once: true });
        audioPlayer.addEventListener('pause', removePlayer, { once: true });
      }
    );
    return () => unregisterPlayback();
  }, []);

  const getSourceIcon = (binding: HotkeyBinding) =>
    binding.sound.source === Source.LOCAL ? (
      <FaHdd className="bound-hotkey-source-icon" title="Local" />
    ) : (
      <FaGlobeAmericas className="bound-hotkey-source-icon" title="MyInstant" />
    );

  return (
    <div className="sounds-view animated fadeInRight">
      <div className="actions">
        <FilterComponent sendFiltersToParent={onFilterUpdated} />
        <button className="button-stop-all" onClick={stopAll} type="button">
          <FaStop className="icon-stop-all" />
        </button>
      </div>

      <div className="sounds">
        {!filters.search && (
          <div className="bound-hotkeys">
            {bindings.length > 0 && (
              <span className="bound-hotkeys-title">Bound Sounds</span>
            )}
            {bindings.map((binding) => {
              const bindingId = getBindingId(binding);
              return (
                <div
                  className="bound-hotkey-row"
                  key={bindingId}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    reorderBinding(
                      event.dataTransfer.getData(
                        'application/x-soundboard-binding'
                      ),
                      binding.sound.id
                    );
                  }}
                >
                  <button
                    type="button"
                    className="bound-hotkey-play"
                    onClick={() =>
                      playingBindings[bindingId]
                        ? stopBoundHotkeySound(binding)
                        : playBoundHotkeySound(binding)
                    }
                    title={
                      playingBindings[bindingId] ? 'Stop sound' : 'Play sound'
                    }
                  >
                    {playingBindings[bindingId] ? (
                      <FaStop className="stop" />
                    ) : (
                      <FaPlay />
                    )}
                  </button>
                  <div className="bound-hotkey-content">
                    <div
                      className="bound-hotkey-progress"
                      style={{
                        transform: `scaleX(${playingProgress[bindingId] || 0})`,
                      }}
                    />
                    <span
                      className="bound-hotkey-sound-name"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          'application/x-soundboard-binding',
                          binding.sound.id
                        );
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      title="Drag to reorder"
                    >
                      {binding.sound.name}
                    </span>
                    <button
                      type="button"
                      className="bound-hotkey-label"
                      onClick={() => editBindingKey(binding)}
                      data-hotkey-capture-trigger
                      title={
                        editingBindingId === bindingId
                          ? 'Press a key combination. Escape or click elsewhere to cancel.'
                          : 'Change this hotkey'
                      }
                    >
                      {editingBindingId === bindingId
                        ? 'Press keys…'
                        : toHotkeyDisplay(binding.key)}
                    </button>
                    <div className="bound-hotkey-source-control">
                      {getSourceIcon(binding)}
                      <button
                        type="button"
                        className="bound-hotkey-remove"
                        onClick={() => removeBinding(binding)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <span
                    className="bound-hotkey-duration"
                    title={`Total duration ${formatDuration(
                      boundDurations[bindingId]
                    )}`}
                  >
                    {formatDuration(
                      playingBindings[bindingId]
                        ? boundRemainingTimes[bindingId]
                        : boundDurations[bindingId]
                    )}
                  </span>
                  <input
                    className="bound-hotkey-volume"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={binding.sound.volume}
                    onChange={(event) =>
                      setBindingVolume(binding, event.target.value)
                    }
                    title="Bound sound volume"
                  />
                </div>
              );
            })}
            <span className="bound-hotkeys-helper">
              Random Sound: {toHotkeyDisplay(hotkeys.randomSound)}
            </span>
            <span className="bound-hotkeys-helper">
              Stop All: {toHotkeyDisplay(hotkeys.stopAllSounds)}
            </span>
          </div>
        )}
        {sounds.map((sound) => (
          <SoundComponent
            key={sound.path || sound.name}
            sound={sound}
            bindings={bindings}
            registerSound={registerSound}
            reloadSounds={reloadSounds}
          />
        ))}
      </div>

      <AddSound reloadSounds={reloadSounds} />
    </div>
  );
};

export default SoundsView;
