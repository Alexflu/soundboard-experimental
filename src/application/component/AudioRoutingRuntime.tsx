import React, { useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import microphoneRouter from '../microphoneRouter';
import { getRecordingSettings } from '../recordingSettings';
import { getRoutingSettings, saveRoutingSettings } from '../routingSettings';

const AudioRoutingRuntime = () => {
  const applyRouting = useCallback(() => {
    const routingSettings = getRoutingSettings();
    microphoneRouter
      .apply(routingSettings, getRecordingSettings())
      .catch((error) => {
        microphoneRouter.stop();
        if (routingSettings.enabled) {
          saveRoutingSettings({ enabled: false });
          toast.error(`Cannot route microphone: ${error}`);
        }
      });
  }, []);

  useEffect(() => {
    applyRouting();
    window.addEventListener(
      'soundboard:routing-settings-changed',
      applyRouting
    );
    window.addEventListener(
      'soundboard:recording-settings-changed',
      applyRouting
    );
    navigator.mediaDevices?.addEventListener?.('devicechange', applyRouting);

    return () => {
      window.removeEventListener(
        'soundboard:routing-settings-changed',
        applyRouting
      );
      window.removeEventListener(
        'soundboard:recording-settings-changed',
        applyRouting
      );
      navigator.mediaDevices?.removeEventListener?.(
        'devicechange',
        applyRouting
      );
      microphoneRouter.stop();
    };
  }, [applyRouting]);

  return null;
};

export default AudioRoutingRuntime;
