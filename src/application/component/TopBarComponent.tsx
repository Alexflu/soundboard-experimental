import * as React from 'react';
import { FaMinus, FaTimes, FaWindowMaximize } from 'react-icons/fa';

const { ipcRenderer } = require('electron');

const TopBarComponent = () => {
  const minimize = () => {
    ipcRenderer?.send('window:minimize');
  };
  const maximize = () => {
    ipcRenderer?.send('window:toggle-maximize');
  };
  const closeWindow = () => {
    ipcRenderer?.send('window:hide');
  };

  return (
    <div className="top-bar-component">
      <button onClick={() => minimize()} className="min-btn" type="button">
        <FaMinus />
      </button>
      <button onClick={() => maximize()} className="max-btn" type="button">
        <FaWindowMaximize />
      </button>
      <button onClick={() => closeWindow()} className="close-btn" type="button">
        <FaTimes />
      </button>
    </div>
  );
};

export default TopBarComponent;
