import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaRegArrowAltCircleLeft } from 'react-icons/fa';
import ChooseAudioOutput from '../component/ChooseAudioOutput';
import ChooseSoundsPath from '../component/ChooseSoundsPath';
import soundboardDomain from '../../domain/SoundboardDomain';
import { UserPreferences } from '../../domain/entities/UserPreferences';

const SettingsView = () => {
  const [requireModifierForHotkeys, setRequireModifierForHotkeys] = useState(
    soundboardDomain.getUserPreferences().requireModifierForHotkeys
  );

  useEffect(() => {
    const unregister = soundboardDomain.watchUserPreferences(
      (preferences: UserPreferences) => {
        setRequireModifierForHotkeys(preferences.requireModifierForHotkeys);
      }
    );

    return () => unregister();
  }, []);

  const onRequireModifierChanged = (checked: boolean) => {
    setRequireModifierForHotkeys(checked);
    soundboardDomain.setUserPreferences(
      soundboardDomain.getUserPreferences().setRequireModifierForHotkeys(checked)
    );
  };

  return (
    <div className="settings-view animated fadeInRight">
      <Link className="button" to="/">
        <FaRegArrowAltCircleLeft className="icon" />
      </Link>
      <div className="hotkey-settings-row">
        <span className="label">Require modifier for hotkeys</span>
        <input
          type="checkbox"
          checked={requireModifierForHotkeys}
          onChange={(event) => onRequireModifierChanged(event.target.checked)}
        />
      </div>
      <ChooseAudioOutput />
      <ChooseSoundsPath />
    </div>
  );
};

export default SettingsView;
