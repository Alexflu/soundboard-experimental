import React, { BaseSyntheticEvent, useRef } from 'react';
import { FaPlus } from 'react-icons/fa';
import soundboardDomain from '../../domain/SoundboardDomain';

const { webUtils } = require('electron');

const AddSound = ({ reloadSounds }: { reloadSounds: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const soundSelected = (event: BaseSyntheticEvent) => {
    const file = event.target.files[0];
    if (file) {
      const filePath = webUtils?.getPathForFile?.(file) || file.path || '';
      soundboardDomain.addSound(filePath);
      reloadSounds();
      window.dispatchEvent(new Event('soundboard:localSoundsChanged'));
      event.target.value = '';
    }
  };

  return (
    <div className="add-sound-container">
      <input
        ref={inputRef}
        type="file"
        className="add-sound-input"
        accept="audio/*"
        onChange={soundSelected}
      />
      <button
        type="button"
        className="add-sound-button"
        title="Add audio file"
        aria-label="Add audio file"
        onClick={() => inputRef.current?.click()}
      >
        <FaPlus />
      </button>
    </div>
  );
};

export default AddSound;
