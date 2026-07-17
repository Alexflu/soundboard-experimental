import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaCircle, FaStop } from 'react-icons/fa';
import { toast } from 'react-toastify';
import soundboardDomain from '../../domain/SoundboardDomain';
import { getRecordingSettings } from '../recordingSettings';

const { ipcRenderer } = require('electron');

const getMimeType = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(
    (type) => MediaRecorder.isTypeSupported(type)
  ) || '';

const getMicrophoneStream = (inputDeviceId: string) =>
  navigator.mediaDevices.getUserMedia({
    audio:
      inputDeviceId === 'default'
        ? true
        : { deviceId: { exact: inputDeviceId } },
  });

const getSystemAudioStream = async () => {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true,
  });
  displayStream.getVideoTracks().forEach((track) => track.stop());
  if (displayStream.getAudioTracks().length === 0) {
    displayStream.getTracks().forEach((track) => track.stop());
    throw new Error('System audio capture is unavailable');
  }
  return displayStream;
};

const emitRecordingLevel = (level: number) =>
  window.dispatchEvent(
    new CustomEvent<number>('soundboard:recording-level', { detail: level })
  );

const RecordingControl = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    if (levelRef.current) {
      clearInterval(levelRef.current);
      levelRef.current = null;
    }
    emitRecordingLevel(0);
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();
    streamsRef.current.forEach((stream) =>
      stream.getTracks().forEach((track) => track.stop())
    );
    streamsRef.current = [];
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
    setElapsedSeconds(0);
  }, [clearTimers]);

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
      const streams: Array<{ stream: MediaStream; gain: number }> = [];
      const addStream = (stream: MediaStream, gain: number) => {
        streams.push({ stream, gain });
        streamsRef.current = streams.map((entry) => entry.stream);
      };

      if (settings.source !== 'system') {
        addStream(
          await getMicrophoneStream(settings.inputDeviceId),
          settings.gain
        );
      }
      if (settings.source !== 'microphone') {
        addStream(await getSystemAudioStream(), 1);
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      const mix = audioContext.createGain();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;

      streams.forEach(({ stream, gain: streamGain }) => {
        const source = audioContext.createMediaStreamSource(stream);
        const gain = audioContext.createGain();
        gain.gain.value = streamGain;
        source.connect(gain).connect(mix);
      });
      mix.connect(destination);
      mix.connect(analyser);

      const mimeType = getMimeType();
      const recorder = mimeType
        ? new MediaRecorder(destination.stream, { mimeType })
        : new MediaRecorder(destination.stream);

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

      await audioContext.resume();
      recorder.start(250);
      setIsRecording(true);
      setElapsedSeconds(0);

      const samples = new Uint8Array(analyser.fftSize);
      levelRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const sum = samples.reduce((total, sample) => {
          const normalized = (sample - 128) / 128;
          return total + normalized * normalized;
        }, 0);
        emitRecordingLevel(
          Math.min(1, Math.sqrt(sum / samples.length) * 4)
        );
      }, 50);

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
    [cleanup]
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
