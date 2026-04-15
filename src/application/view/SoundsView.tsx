import React, { useEffect, useState } from 'react';
import { FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import SoundComponent from '../component/SoundComponent';
import FilterComponent from '../component/FilterComponent';
import AddSound from '../component/AddSound';
import Filters from '../../domain/entities/Filters';
import soundboardDomain from '../../domain/SoundboardDomain';
import { HotkeyBinding, UserPreferences } from '../../domain/entities/UserPreferences';

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
    const nextKey = window.prompt('Edit hotkey', binding.key);
    if (!nextKey || nextKey === binding.key) {
      return;
    }

    soundboardDomain.updateBindingKey(binding.key, nextKey);
    toast.success(`Updated hotkey to ${nextKey}`);
  };

  const removeBinding = (binding: HotkeyBinding) => {
    soundboardDomain.removeBinding(binding.key);
    toast.success(`Removed hotkey ${binding.key}`);
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
            <span className="bound-hotkeys-title">Bound hotkey sounds</span>
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
                <span>{binding.sound.name}</span>
                <span className="bound-hotkey-label">({binding.key})</span>
                <button
                  type="button"
                  className="bound-hotkey-button"
                  onClick={() => editBindingKey(binding)}
                >
                  Edit key
                </button>
                <button
                  type="button"
                  className="bound-hotkey-button"
                  onClick={() => removeBinding(binding)}
                >
                  Remove
                </button>
              </div>
            ))}
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
