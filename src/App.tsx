import * as React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import './App.global.css';
import { FaCog } from 'react-icons/fa';
import { useCallback, useEffect, useRef, useState } from 'react';
import SoundsView from './application/view/SoundsView';
import SettingsView from './application/view/SettingsView';
import TopBarComponent from './application/component/TopBarComponent';
import RecentlyRemovedHistory from './application/component/RecentlyRemovedHistory';
import RangeValueTooltip from './application/component/RangeValueTooltip';
import soundboardDomain from './domain/SoundboardDomain';
import Player from './domain/entities/Player';
import logo from '../assets/logo.svg';
import Filters from './domain/entities/Filters';
import {
  DEFAULT_SEARCH_SLOT_HOTKEYS,
  HotkeyMap,
} from './domain/entities/HotkeyPreferences';
import {
  AudioOutput,
  HotkeyBinding,
  HotkeySettings,
} from './domain/entities/UserPreferences';
import {
  addRecentlyRemovedSound,
  removeRecentlyRemovedSound,
} from './application/recentlyRemovedSounds';

const { ipcRenderer } = require('electron');

type HotkeyHandler = {
  callback: () => Promise<void>;
  errorMessage: string;
};

const applyAudioOutputs = (audioOutput: AudioOutput) => {
  const additionalOutputs = audioOutput.additionalOutputs || [];
  Player.setGlobalAdditionalAudioOutputDeviceIds(
    additionalOutputs.map((output) => output.id)
  );
  Player.setGlobalAudioOutputVolumes([audioOutput, ...additionalOutputs]);
};

export default function App() {
  const initialPreferences = soundboardDomain.getUserPreferences();
  applyAudioOutputs(initialPreferences.audioOutput);
  const stopAllSoundsRef = useRef<Array<() => void>>([]);
  const [filters, setFilters] = useState(new Filters(''));
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(initialPreferences.hotkeys);
  const [bindings, setBindings] = useState<HotkeyBinding[]>(
    initialPreferences.bindings
  );
  const [hotkeySettings, setHotkeySettings] = useState<HotkeySettings>(
    initialPreferences.hotkeySettings
  );
  const [shortcutRegistrationRevision, setShortcutRegistrationRevision] =
    useState(0);
  const [soundListRevision, setSoundListRevision] = useState(0);
  const filtersRef = useRef(filters);
  const previousBindingsRef = useRef(initialPreferences.bindings);

  const registerSound = useCallback((stopSound: () => void) => {
    stopAllSoundsRef.current.push(stopSound);
  }, []);

  const registerPlayer = useCallback(
    (player: { stop: () => void } | null) => {
      if (player) {
        registerSound(() => player.stop());
      }
    },
    [registerSound]
  );

  const stopAll = useCallback(() => {
    const stopFunctions = stopAllSoundsRef.current.splice(0);
    stopFunctions.forEach((stopSound) => stopSound());
  }, []);

  const isTypingInField = () => {
    const activeElement = document.activeElement as HTMLElement | null;
    const typingTags = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

    return (
      !!activeElement &&
      (typingTags.has(activeElement.tagName) || activeElement.isContentEditable)
    );
  };

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const onCaptureEnded = () =>
      setShortcutRegistrationRevision((current) => current + 1);
    window.addEventListener('soundboard:hotkey-capture-ended', onCaptureEnded);
    return () =>
      window.removeEventListener(
        'soundboard:hotkey-capture-ended',
        onCaptureEnded
      );
  }, []);

  useEffect(() => {
    const onRecordingSaved = () =>
      setSoundListRevision((current) => current + 1);
    window.addEventListener('soundboard:recording-saved', onRecordingSaved);
    return () =>
      window.removeEventListener(
        'soundboard:recording-saved',
        onRecordingSaved
      );
  }, []);

  useEffect(() => {
    const unregisterPreferenceWatcher = soundboardDomain.watchUserPreferences(
      (userPreferences) => {
        const nextBindingIds = new Set(
          userPreferences.bindings.map((binding) => binding.sound.id)
        );
        const previousBindingIds = new Set(
          previousBindingsRef.current.map((binding) => binding.sound.id)
        );

        previousBindingsRef.current
          .filter((binding) => !nextBindingIds.has(binding.sound.id))
          .forEach((binding) => addRecentlyRemovedSound(binding.sound));
        userPreferences.bindings
          .filter((binding) => !previousBindingIds.has(binding.sound.id))
          .forEach((binding) => removeRecentlyRemovedSound(binding.sound.id));
        previousBindingsRef.current = userPreferences.bindings;

        applyAudioOutputs(userPreferences.audioOutput);
        setHotkeys(userPreferences.hotkeys);
        setBindings(userPreferences.bindings);
        setHotkeySettings(userPreferences.hotkeySettings);
      }
    );

    return () => {
      unregisterPreferenceWatcher();
      soundboardDomain.disposeUserPreferencesWatcher();
    };
  }, []);

  useEffect(() => {
    const registeredAccelerators: string[] = [];
    const handlersByAccelerator: Record<string, HotkeyHandler> = {};

    const onShortcutTriggered = (_event: unknown, accelerator: string) => {
      if (isTypingInField()) {
        return;
      }

      const handler = handlersByAccelerator[accelerator];
      if (!handler) {
        return;
      }

      handler.callback().catch(() => {
        toast.error(handler.errorMessage);
      });
    };

    ipcRenderer?.on('shortcut:triggered', onShortcutTriggered);

    const registerAccelerator = (
      accelerator: string,
      callback: () => Promise<void>,
      errorMessage: string
    ) => {
      if (!accelerator || registeredAccelerators.includes(accelerator)) {
        return;
      }

      handlersByAccelerator[accelerator] = {
        callback,
        errorMessage,
      };

      const registrationSucceeded = ipcRenderer?.sendSync(
        'shortcut:register',
        accelerator
      );
      if (!registrationSucceeded) {
        delete handlersByAccelerator[accelerator];
        toast.error(`Failed to register hotkey: ${accelerator}`);
        return;
      }

      registeredAccelerators.push(accelerator);
    };

    registerAccelerator(
      hotkeys.randomSound,
      async () => {
        const player = await soundboardDomain.playRandomSound();
        registerPlayer(player);
      },
      'Cannot play random sound'
    );

    const activeBindingKeys = Array.from(
      new Set(
        bindings
          .filter(
            (binding) =>
              hotkeySettings.pianoKeysEnabled || binding.key.includes('+')
          )
          .map((binding) => binding.key)
      )
    );

    activeBindingKeys.forEach((bindingKey) => {
      registerAccelerator(
        bindingKey,
        async () => {
          soundboardDomain
            .playBoundHotkeySounds(bindingKey)
            .forEach(registerPlayer);
        },
        'Cannot play bound hotkey sound'
      );
    });

    registerAccelerator(
      hotkeys.stopAllSounds,
      async () => stopAll(),
      'Cannot stop all sounds'
    );

    DEFAULT_SEARCH_SLOT_HOTKEYS.forEach((defaultKey, index) => {
      registerAccelerator(
        defaultKey,
        async () => {
          const player = await soundboardDomain.playLocalSoundByIndex(
            index,
            filtersRef.current
          );
          registerPlayer(player);
        },
        `Cannot play sound in slot ${index + 1}`
      );
    });

    return () => {
      ipcRenderer?.removeListener('shortcut:triggered', onShortcutTriggered);
      registeredAccelerators.forEach((accelerator) => {
        ipcRenderer?.send('shortcut:unregister', accelerator);
      });
    };
  }, [
    hotkeys,
    bindings,
    hotkeySettings,
    registerPlayer,
    stopAll,
    shortcutRegistrationRevision,
  ]);

  return (
    <Router>
      <div className="app-view">
        <RangeValueTooltip />
        <TopBarComponent />
        <div className="menu">
          <span className="title">
            <img src={logo} className="icon" alt="logo" />
            Soundboard
          </span>
          <Link className="settings" to="/settings" title="Settings">
            <FaCog className="icon" />
          </Link>
        </div>
        <div className="body">
          <ToastContainer
            autoClose={2000}
            pauseOnFocusLoss={false}
            limit={3}
            newestOnTop
          />
          <Routes>
            <Route path="/settings" element={<SettingsView />} />
            <Route
              path="/"
              element={
                <>
                  <SoundsView
                    key={soundListRevision}
                    stopAllSounds={stopAllSoundsRef.current}
                    registerSound={registerSound}
                    setGlobalFilters={setFilters}
                  />
                  <RecentlyRemovedHistory
                    bindings={bindings}
                    registerSound={registerSound}
                  />
                </>
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
