import React, { BaseSyntheticEvent } from 'react';
import { FaPlus } from 'react-icons/fa';
import soundboardDomain from '../../domain/SoundboardDomain';

const AddSound = ({ reloadSounds }: { reloadSounds: () => void }) => {
  const soundSelected = (event: BaseSyntheticEvent) => {
    const file = event.target.files[0];
    if (file) {
      soundboardDomain.addSound(file.path);
      reloadSounds();
      event.target.value = '';
    }
  };

  return (
    <div className="add-sound-container">
      <input
        id="add-sound-input"
        type="file"
        className="add-sound-input"
        accept="audio/*"
        onChange={soundSelected}
      />
      <label
        htmlFor="add-sound-input"
        className="add-sound-button"
        title="Add audio file"
        aria-label="Add audio file"
      >
        <FaPlus />
      </label>
    </div>
  );
};

export default AddSound;
