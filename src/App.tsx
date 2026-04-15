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
  HOTKEY_ACTIONS,
  HotkeyAction,
  HotkeyMap,
} from './domain/entities/HotkeyPreferences';

const globalShortcut = require('electron').remote?.globalShortcut;

export default function App() {
  const [stopAllSounds, setStopAllSounds] = useState([] as (() => void)[]);
  const [filters, setFilters] = useState(new Filters(''));
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(
    soundboardDomain.getUserPreferences().hotkeys
  );
  const filtersRef = useRef(filters);
  const searchSlotActions: HotkeyAction[] = [
    'searchSlot1',
    'searchSlot2',
    'searchSlot3',
    'searchSlot4',
    'searchSlot5',
    'searchSlot6',
    'searchSlot7',
  ];

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

  const actionHandlers: Record<HotkeyAction, () => Promise<void>> = {
    randomSound: async () => {
      const player = await soundboardDomain.playRandomSound();
      registerPlayer(player);
    },
    searchSlot1: async () => {},
    searchSlot2: async () => {},
    searchSlot3: async () => {},
    searchSlot4: async () => {},
    searchSlot5: async () => {},
    searchSlot6: async () => {},
    searchSlot7: async () => {},
  };

  searchSlotActions.forEach((action, index) => {
    actionHandlers[action] = async () => {
      const player = await soundboardDomain.playSearchSlotHotkeySound(
        action,
        index,
        filtersRef.current
      );
      registerPlayer(player);
    };
  });

  const errorByAction: Record<HotkeyAction, string> = {
    randomSound: 'Cannot play random sound',
    searchSlot1: 'Cannot play sound in slot 1',
    searchSlot2: 'Cannot play sound in slot 2',
    searchSlot3: 'Cannot play sound in slot 3',
    searchSlot4: 'Cannot play sound in slot 4',
    searchSlot5: 'Cannot play sound in slot 5',
    searchSlot6: 'Cannot play sound in slot 6',
    searchSlot7: 'Cannot play sound in slot 7',
  };

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const unregisterPreferenceWatcher = soundboardDomain.watchUserPreferences(
      (userPreferences) => {
        setHotkeys(userPreferences.hotkeys);
      }
    );

    return () => {
      unregisterPreferenceWatcher();
      soundboardDomain.disposeUserPreferencesWatcher();
    };
  }, []);

  useEffect(() => {
    HOTKEY_ACTIONS.forEach((action) => {
      const accelerator = hotkeys[action];
      globalShortcut?.register(accelerator, () => {
        if (isTypingInField()) {
          return;
        }

        actionHandlers[action]().catch((e) => {
          toast.error(errorByAction[action]);
          console.error(e);
        });
      });
    });

    return () => {
      HOTKEY_ACTIONS.forEach((action) => {
        globalShortcut?.unregister(hotkeys[action]);
      });
    };
  }, [hotkeys]);

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
