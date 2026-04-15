import * as React from 'react';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import './App.global.css';
import { FaCog } from 'react-icons/fa/';
import { useEffect, useRef, useState } from 'react';
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
import { HotkeyBinding } from './domain/entities/UserPreferences';

const globalShortcut = require('electron').remote?.globalShortcut;

export default function App() {
  const [stopAllSounds, setStopAllSounds] = useState([] as (() => void)[]);
  const [filters, setFilters] = useState(new Filters(''));
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(
    soundboardDomain.getUserPreferences().hotkeys
  );
  const [bindings, setBindings] = useState<HotkeyBinding[]>(
    soundboardDomain.getUserPreferences().bindings
  );
  const filtersRef = useRef(filters);

  const registerSound = (stopSound: () => void) =>
    setStopAllSounds((current) => current.concat(stopSound));

  const registerPlayer = (player: { stop: () => void } | null) => {
    if (player) {
      registerSound(() => player.stop());
    }
  };

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
      }
    );

    return () => {
      unregisterPreferenceWatcher();
      soundboardDomain.disposeUserPreferencesWatcher();
    };
  }, []);

  useEffect(() => {
    const registeredAccelerators: string[] = [];
    const registerAccelerator = (
      accelerator: string,
      handler: () => Promise<void>,
      errorMessage: string
    ) => {
      if (!accelerator || registeredAccelerators.includes(accelerator)) {
        return;
      }

      globalShortcut?.register(accelerator, () => {
        if (isTypingInField()) {
          return;
        }

        handler().catch((e) => {
          toast.error(errorMessage);
          console.error(e);
        });
      });

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

    bindings.forEach((binding) => {
      registerAccelerator(
        binding.key,
        async () => {
          const player = soundboardDomain.playBoundHotkeySound(binding.key);
          registerPlayer(player);
        },
        'Cannot play bound hotkey sound'
      );
    });

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
      registeredAccelerators.forEach((accelerator) => {
        globalShortcut?.unregister(accelerator);
      });
    };
  }, [hotkeys, bindings]);

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
