import React, { useEffect, useState } from 'react';
import soundboardDomain from '../../domain/SoundboardDomain';
import {
  HotkeySettings as HotkeySettingsValue,
  UserPreferences,
} from '../../domain/entities/UserPreferences';

const HotkeySettings = () => {
  const [settings, setSettings] = useState<HotkeySettingsValue>(
    soundboardDomain.getUserPreferences().hotkeySettings
  );

  useEffect(() => {
    const unregister = soundboardDomain.watchUserPreferences(
      (preferences: UserPreferences) => setSettings(preferences.hotkeySettings)
    );
    return () => unregister();
  }, []);

  const updateSettings = (changes: Partial<HotkeySettingsValue>) => {
    const preferences = soundboardDomain.getUserPreferences();
    soundboardDomain.setUserPreferences(preferences.setHotkeySettings(changes));
  };

  return (
    <section className="hotkey-settings">
      <h3>Hotkey behavior</h3>
      <label className="hotkey-setting-row" htmlFor="piano-keys-enabled">
        <input
          id="piano-keys-enabled"
          type="checkbox"
          checked={settings.pianoKeysEnabled}
          onChange={(event) =>
            updateSettings({ pianoKeysEnabled: event.target.checked })
          }
        />
        <span>
          <strong>Piano Keys</strong>
          <small>Allow single-key global hotkeys such as W or 5.</small>
        </span>
      </label>

      <label
        className="hotkey-setting-row"
        htmlFor="multiple-sounds-per-hotkey"
      >
        <input
          id="multiple-sounds-per-hotkey"
          type="checkbox"
          checked={settings.allowMultipleSoundsPerHotkey}
          onChange={(event) =>
            updateSettings({
              allowMultipleSoundsPerHotkey: event.target.checked,
            })
          }
        />
        <span>
          <strong>Multiple sounds per hotkey</strong>
          <small>Play every sound assigned to the same key together.</small>
        </span>
      </label>

      <label className="hotkey-setting-row" htmlFor="random-bound-sounds">
        <input
          id="random-bound-sounds"
          type="checkbox"
          checked={settings.randomSoundPool === 'bound'}
          onChange={(event) =>
            updateSettings({
              randomSoundPool: event.target.checked ? 'bound' : 'local',
            })
          }
        />
        <span>
          <strong>Random from bound sounds</strong>
          <small>Off uses only the local sound list.</small>
        </span>
      </label>
    </section>
  );
};

export default HotkeySettings;
