import React, { useEffect, useState } from 'react';
import { FaPlay, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sound from '../../domain/entities/Sound';
import SoundComponent from '../component/SoundComponent';
import FilterComponent from '../component/FilterComponent';
import AddSound from '../component/AddSound';
import Filters from '../../domain/entities/Filters';
import soundboardDomain from '../../domain/SoundboardDomain';
import {
  HotkeySoundMap,
  UserPreferences,
} from '../../domain/entities/UserPreferences';
import {
  HotkeyAction,
  HotkeyMap,
} from '../../domain/entities/HotkeyPreferences';

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
  const [hotkeySounds, setHotkeySounds] = useState<HotkeySoundMap>(
    soundboardDomain.getUserPreferences().hotkeySounds
  );
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(
    soundboardDomain.getUserPreferences().hotkeys
  );
  const searchSlotActions: HotkeyAction[] = [
    'searchSlot1',
    'searchSlot2',
    'searchSlot3',
    'searchSlot4',
    'searchSlot5',
    'searchSlot6',
    'searchSlot7',
  ];

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
  const renderBoundHotkeys = () =>
    searchSlotActions
      .map((action) => ({
        action,
        sound: hotkeySounds[action],
      }))
      .filter((entry) => !!entry.sound);

  const playBoundHotkeySound = (action: HotkeyAction) => {
    const player = soundboardDomain.playBoundHotkeySound(action);
    if (player) {
      registerSound(() => player.stop());
    }
  };

  useEffect(() => reloadSounds(), [filters]);
  useEffect(() => {
    const unregister = soundboardDomain.watchUserPreferences(
      (updatedPreferences: UserPreferences) => {
        setHotkeySounds(updatedPreferences.hotkeySounds);
        setHotkeys(updatedPreferences.hotkeys);
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
        {!filters.search && (
          <div className="bound-hotkeys">
            <span className="bound-hotkeys-title">Bound hotkey sounds</span>
            {renderBoundHotkeys().map((entry) => (
              <div className="bound-hotkey-row" key={entry.action}>
                <button
                  type="button"
                  className="bound-hotkey-play"
                  onClick={() => playBoundHotkeySound(entry.action)}
                >
                  <FaPlay />
                </button>
                <span>{entry.sound?.name}</span>
                <span className="bound-hotkey-label">
                  ({hotkeys[entry.action]})
                </span>
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
