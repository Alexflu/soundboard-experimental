import React, { useEffect, useState } from 'react';
import soundboardDomain from '../../domain/SoundboardDomain';

const { ipcRenderer } = require('electron');

const ChooseSoundsPath = () => {
  const [localSoundJsonPath, setLocalSoundJsonPath] = useState('');

  useEffect(() => {
    const userPreferences = soundboardDomain.getUserPreferences();
    setLocalSoundJsonPath(userPreferences.pathToSoundsJson);
  }, []);

  const chooseFile = async () => {
    const filePath = await ipcRenderer?.invoke(
      'dialog:choose-sounds-json',
      localSoundJsonPath
    );
    if (!filePath) {
      return;
    }

    setLocalSoundJsonPath(filePath);
    soundboardDomain.setUserPreferences(
      soundboardDomain.getUserPreferences().setPathToSoundsJson(filePath)
    );
  };

  return (
    <div className="choose-sounds-path">
      <div className="input-container">
        <span className="label">Sound list:</span>
        <button
          className="sounds-path-button"
          type="button"
          onClick={chooseFile}
        >
          Choose file
        </button>
      </div>
      <span className="current-path">
        <span className="label">Current path: </span>
        {localSoundJsonPath}
      </span>
    </div>
  );
};

export default ChooseSoundsPath;
