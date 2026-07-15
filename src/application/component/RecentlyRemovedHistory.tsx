import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import soundboardDomain from '../../domain/SoundboardDomain';
import HotkeySound from '../../domain/entities/HotkeySound';
import { HotkeyBinding } from '../../domain/entities/UserPreferences';
import RecentlyRemovedSound from './RecentlyRemovedSound';
import {
  getRecentlyRemovedSounds,
  subscribeRecentlyRemovedSounds,
} from '../recentlyRemovedSounds';

const LOCAL_SOUNDS_CHANGED_EVENT = 'soundboard:localSoundsChanged';

const RecentlyRemovedHistory = ({
  bindings,
  registerSound,
}: {
  bindings: HotkeyBinding[];
  registerSound: (stopSound: () => void) => void;
}) => {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [recentlyRemoved, setRecentlyRemoved] = useState<HotkeySound[]>(
    getRecentlyRemovedSounds
  );
  const [localSoundIds, setLocalSoundIds] = useState<Set<string>>(new Set());

  const reloadLocalSoundIds = useCallback(() => {
    const preferences = soundboardDomain.getUserPreferences();
    const ids = soundboardDomain.localSoundAdapter
      .getSounds(preferences.pathToSoundsJson)
      .map((sound) => sound.path);
    setLocalSoundIds(new Set(ids));
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let attachedContainer: HTMLDivElement | null = null;

    const attach = () => {
      const soundsContainer = document.querySelector('.sounds-view .sounds');
      if (!(soundsContainer instanceof HTMLElement)) {
        animationFrame = window.requestAnimationFrame(attach);
        return;
      }

      attachedContainer = document.createElement('div');
      attachedContainer.className = 'recently-removed-history';
      soundsContainer.appendChild(attachedContainer);
      setPortalTarget(attachedContainer);
    };

    attach();
    return () => {
      window.cancelAnimationFrame(animationFrame);
      attachedContainer?.remove();
    };
  }, []);

  useEffect(() => {
    reloadLocalSoundIds();
    window.addEventListener(LOCAL_SOUNDS_CHANGED_EVENT, reloadLocalSoundIds);
    return () =>
      window.removeEventListener(
        LOCAL_SOUNDS_CHANGED_EVENT,
        reloadLocalSoundIds
      );
  }, [reloadLocalSoundIds]);

  useEffect(
    () => subscribeRecentlyRemovedSounds(setRecentlyRemoved),
    []
  );

  const visibleSounds = useMemo(() => {
    const activeBindingIds = new Set(
      bindings.map((binding) => binding.sound.id)
    );
    return recentlyRemoved.filter(
      (sound) =>
        !activeBindingIds.has(sound.id) && !localSoundIds.has(sound.id)
    );
  }, [bindings, localSoundIds, recentlyRemoved]);

  if (!portalTarget || visibleSounds.length === 0) {
    return null;
  }

  const trims = soundboardDomain.getUserPreferences().soundTrims;

  return createPortal(
    <>
      <span className="recently-removed-title">Recently Removed</span>
      {visibleSounds.map((sound) => (
        <RecentlyRemovedSound
          key={sound.id}
          savedSound={sound}
          trim={trims[sound.id]}
          registerSound={registerSound}
        />
      ))}
    </>,
    portalTarget
  );
};

export default RecentlyRemovedHistory;
