import * as React from 'react';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import './App.global.css';
import { FaCog } from 'react-icons/fa/';
import { useCallback, useEffect, useRef, useState } from 'react';
import SoundsView from './application/view/SoundsView';
import SettingsView from './application/view/SettingsView';
import TopBarComponent from './application/component/TopBarComponent';
import soundboardDomain from './domain/SoundboardDomain';
import logo from '../assets/logo.svg';
import Filters from './domain/entities/Filters';
import {
  DEFAULT_SEARCH_SLOT_HOTKEYS,
  HotkeyMap,
} from './domain/entities/HotkeyPreferences';
import {
  HotkeyBinding,
  HotkeySettings,
} from './domain/entities/UserPreferences';

const { ipcRenderer } = require('electron');

type HotkeyHandler = {
  callback: () => Promise<void>;
  errorMessage: string;
};

export default function App() {
  const initialPreferences = soundboardDomain.getUserPreferences();
  const [stopAllSounds, setStopAllSounds] = useState([] as (() => void)[]);
  const [filters, setFilters] = useState(new Filters(''));
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(
    initialPreferences.hotkeys
  );
  const [bindings, setBindings] = useState<HotkeyBinding[]>(
    initialPreferences.bindings
  );
  const [hotkeySettings, setHotkeySettings] = useState<HotkeySettings>(
    initialPreferences.hotkeySettings
  );
  const filtersRef = useRef(filters);

  const registerSound = useCallback(
    (stopSound: () => void) =>
      setStopAllSounds((current) => current.concat(stopSound)),
    []
  );

  const registerPlayer = useCallback(
    (player: { stop: () => void } | null) => {
      if (player) {
        registerSound(() => player.stop());
      }
    },
    [registerSound]
  );

  const stopAll = useCallback(
    () => stopAllSounds.forEach((stopSound) => stopSound()),
    [stopAllSounds]
  );

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
    const unregisterPreferenceWatcher = soundboardDomain.watchUserPreferences(
      (userPreferences) => {
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
  }, [hotkeys, bindings, hotkeySettings, registerPlayer, stopAll]);

  return (
    <Router>
      <div className="app-view">
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
          <Switch>
            <Route path="/settings" component={SettingsView} />
            <Route path="/">
              <SoundsView
                stopAllSounds={stopAllSounds}
                registerSound={registerSound}
                setGlobalFilters={setFilters}
              />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  );
}