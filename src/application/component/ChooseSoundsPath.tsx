import React, { BaseSyntheticEvent, useEffect, useState } from 'react';
import soundboardDomain from '../../domain/SoundboardDomain';

const { webUtils } = require('electron');

const ChooseSoundsPath = () => {
  const [localSoundJsonPath, setLocalSoundJsonPath] = useState('');

  useEffect(() => {
    const userPreferences = soundboardDomain.getUserPreferences();
    setLocalSoundJsonPath(userPreferences.pathToSoundsJson);
  }, []);

  const fileSelected = (event: BaseSyntheticEvent) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const filePath = webUtils?.getPathForFile?.(file) || file.path || '';
    if (!filePath) {
      return;
    }

    setLocalSoundJsonPath(filePath);
    soundboardDomain.setUserPreferences(
      soundboardDomain.getUserPreferences().setPathToSoundsJson(filePath)
    );
    event.target.value = '';
  };

  return (
    <div className="choose-sounds-path">
      <div className="input-container">
        <span className="label">Sound list:</span>
        <input
          id="sounds-path-input"
          type="file"
          className="sounds-path-input"
          accept=".json,application/json"
          onChange={fileSelected}
        />
        <label className="sounds-path-button" htmlFor="sounds-path-input">
          Choose file
        </label>
      </div>
      <span className="current-path">
        <span className="label">Current path: </span>
        {localSoundJsonPath}
      </span>
    </div>
  );
};

export default ChooseSoundsPath;