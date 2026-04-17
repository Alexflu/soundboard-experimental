import React, { useEffect, useState } from 'react';
import {
  FaGlobeAmericas,
  FaHdd,
  FaPlay,
  FaStop,
  FaTrash,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
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
  DEFAULT_STOP_ALL_HOTKEY,
  toHotkeyDisplay,
} from '../../domain/entities/HotkeyPreferences';
import { getHotkeyFromEvent } from '../component/hotkeyCapture';

const SoundsView = ({
  stopAllSounds,
  registerSound,
  setGlobalFilters,
}: {
  stopAllSounds: (() => void)[];
  registerSound: (stopSound: () => void) => void;
  setGlobalFilters: (filters: Filters) => void;
}) => {
  const [sounds, setSounds] = useState([] as Sound[]);
  const [filters, setFilters] = useState(new Filters(''));
  const [bindings, setBindings] = useState<HotkeyBinding[]>(
    soundboardDomain.getUserPreferences().bindings
  );
  const [playingProgress, setPlayingProgress] = useState<
    Record<string, number>
  >({});

  const reloadSounds = () => {
    soundboardDomain
      .getSounds(filters)
      .then((filteredSounds: Sound[]) => setSounds(filteredSounds))
      .catch((e) => {
        console.error(e);
        toast.error('Cannot get sounds');
      });
  };
  const onFilterUpdated = (newFilters: Filters) => {
    const updated = Filters.fromFilters(newFilters);
    setFilters(updated);
    setGlobalFilters(updated);
  };
  const stopAll = () => stopAllSounds.forEach((stopSound) => stopSound());

  const playBoundHotkeySound = (binding: HotkeyBinding) => {
    const player = soundboardDomain.playBoundHotkeySound(binding.key);
    if (player) {
      registerSound(() => player.stop());
    }
  };

  const editBindingKey = (binding: HotkeyBinding) => {
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        window.removeEventListener('keydown', onKeyDown, true);
        return;
      }

      const nextKey = getHotkeyFromEvent(event);
      if (!nextKey || nextKey === binding.key) {
        return;
      }

      soundboardDomain.updateBindingKey(binding.key, nextKey);
      toast.success(`Updated hotkey to ${toHotkeyDisplay(nextKey)}`);
      window.removeEventListener('keydown', onKeyDown, true);
    };
    window.addEventListener('keydown', onKeyDown, true);
  };

  const removeBinding = (binding: HotkeyBinding) => {
    soundboardDomain.removeBinding(binding.key);
    toast.success(`Removed hotkey ${toHotkeyDisplay(binding.key)}`);
  };

  const setBindingVolume = (binding: HotkeyBinding, value: string) => {
    const volume = Number(value);
    soundboardDomain.setBindingVolume(binding.key, volume);
  };

  useEffect(() => reloadSounds(), [filters]);
  useEffect(() => {
    const unregister = soundboardDomain.watchUserPreferences(
      (updatedPreferences: UserPreferences) => {
        setBindings(updatedPreferences.bindings);
      }
    );
    return () => unregister();
  }, []);

  useEffect(() => {
    const unregisterPlayback = soundboardDomain.onBoundPlayback(
      ({ key, player }) => {
        const audioPlayer = player.player;
        if (!audioPlayer) {
          return;
        }

        setPlayingProgress((current) => ({ ...current, [key]: 0 }));

        const onTimeUpdate = () => {
          const progress =
            audioPlayer.duration > 0
              ? audioPlayer.currentTime / audioPlayer.duration
              : 0;
          setPlayingProgress((current) => ({ ...current, [key]: progress }));
        };

        const clearProgress = () =>
          setPlayingProgress((current) => {
            const updated = { ...current };
            delete updated[key];
            return updated;
          });

        audioPlayer.addEventListener('timeupdate', onTimeUpdate);
        audioPlayer.addEventListener('ended', clearProgress, { once: true });
        audioPlayer.addEventListener('pause', () => {
          if (audioPlayer.currentTime === 0 || audioPlayer.ended) {
            clearProgress();
          }
        });
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
        {!filters.search && bindings.length > 0 && (
          <div className="bound-hotkeys">
            <span className="bound-hotkeys-title">Bound Sounds</span>
            {bindings.map((binding) => (
              <div
                className="bound-hotkey-row"
                key={`${binding.key}-${binding.sound.id}`}
              >
                <button
                  type="button"
                  className="bound-hotkey-play"
                  onClick={() => playBoundHotkeySound(binding)}
                >
                  <FaPlay />
                </button>
                <div className="bound-hotkey-content">
                  <div
                    className="bound-hotkey-progress"
                    style={{
                      transform: `scaleX(${playingProgress[binding.key] || 0})`,
                    }}
                  />
                  <span className="bound-hotkey-sound-name">
                    {binding.sound.name}
                  </span>
                  <button
                    type="button"
                    className="bound-hotkey-label"
                    onClick={() => editBindingKey(binding)}
                  >
                    {toHotkeyDisplay(binding.key)}
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
            ))}
            <span className="bound-hotkeys-helper">
              Stop all hotkey default:{' '}
              {toHotkeyDisplay(DEFAULT_STOP_ALL_HOTKEY)}
            </span>
          </div>
        )}
        {sounds.map((sound) => (
          <SoundComponent
            key={sound.name}
            sound={sound}
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
