import React, { useEffect, useRef, useState } from 'react';
import { FaCircle, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import soundboardDomain from '../../domain/SoundboardDomain';
import { getRecordingSettings } from '../recordingSettings';

const { ipcRenderer } = require('electron');

const getMimeType = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(
    (type) => MediaRecorder.isTypeSupported(type)
  ) || '';

const RecordingControl = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  };

  const cleanup = () => {
    clearTimers();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
    setElapsedSeconds(0);
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const startRecording = async () => {
    const settings = getRecordingSettings();
    const chunks: Blob[] = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio:
          settings.inputDeviceId === 'default'
            ? true
            : { deviceId: { exact: settings.inputDeviceId } },
      });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const gain = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      gain.gain.value = settings.gain;
      source.connect(gain).connect(destination);

      const mimeType = getMimeType();
      const recorder = mimeType
        ? new MediaRecorder(destination.stream, { mimeType })
        : new MediaRecorder(destination.stream);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      recorderRef.current = recorder;
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });
      recorder.addEventListener(
        'stop',
        () => {
          const save = async () => {
            try {
              const blob = new Blob(chunks, {
                type: recorder.mimeType || mimeType || 'audio/webm',
              });
              if (blob.size === 0) {
                throw new Error('No audio was captured');
              }
              const filePath = await ipcRenderer.invoke('recording:save', {
                data: await blob.arrayBuffer(),
                directory: settings.directory,
                extension: blob.type.includes('ogg') ? 'ogg' : 'webm',
              });
              if (!filePath) {
                throw new Error('Recording was not saved');
              }
              soundboardDomain.addSound(filePath);
              window.dispatchEvent(new Event('soundboard:recording-saved'));
              toast.success('Recording added to local sounds');
            } catch (error) {
              toast.error(`Cannot save recording: ${error}`);
            } finally {
              cleanup();
            }
          };
          save().catch(() => cleanup());
        },
        { once: true }
      );

      recorder.start(250);
      setIsRecording(true);
      setElapsedSeconds(0);
      elapsedRef.current = setInterval(
        () => setElapsedSeconds((current) => current + 1),
        1000
      );
      if (settings.timeoutSeconds > 0) {
        timeoutRef.current = setTimeout(
          stopRecording,
          settings.timeoutSeconds * 1000
        );
      }
    } catch (error) {
      cleanup();
      toast.error(`Cannot start recording: ${error}`);
    }
  };

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        cleanup();
      }
    },
    []
  );

  return (
    <button
      type="button"
      className={`recording-control${isRecording ? ' recording' : ''}`}
      onClick={isRecording ? stopRecording : startRecording}
      title={isRecording ? 'Stop recording' : 'Start recording'}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? <FaStop /> : <FaCircle />}
      {isRecording && <span>{elapsedSeconds}s</span>}
    </button>
  );
};

export default RecordingControl;
