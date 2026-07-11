import React, {
  BaseSyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import soundboardDomain from '../../domain/SoundboardDomain';

const { webUtils } = require('electron');

const ChooseSoundsPath = () => {
  const [localSoundJsonPath, setLocalSoundJsonPath] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
          ref={inputRef}
          type="file"
          className="sounds-path-input"
          accept=".json,application/json"
          onChange={fileSelected}
        />
        <button
          className="sounds-path-button"
          type="button"
          onClick={() => inputRef.current?.click()}
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
