import React, { useEffect, useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { getRoutingSettings, saveRoutingSettings } from '../routingSettings';

const MicrophoneRoutingControl = () => {
  const [settings, setSettings] = useState(getRoutingSettings);

  useEffect(() => {
    const syncSettings = () => setSettings(getRoutingSettings());
    window.addEventListener(
      'soundboard:routing-settings-changed',
      syncSettings
    );
    return () =>
      window.removeEventListener(
        'soundboard:routing-settings-changed',
        syncSettings
      );
  }, []);

  const toggleRouting = () => {
    setSettings(saveRoutingSettings({ enabled: !settings.enabled }));
  };

  return (
    <button
      type="button"
      className={`microphone-routing-control${
        settings.enabled ? ' active' : ''
      }`}
      onClick={toggleRouting}
      title={`${settings.enabled ? 'Disable' : 'Enable'} microphone routing to ${
        settings.outputDeviceName
      }`}
      aria-label={`${settings.enabled ? 'Disable' : 'Enable'} microphone routing`}
    >
      {settings.enabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
    </button>
  );
};

export default MicrophoneRoutingControl;
