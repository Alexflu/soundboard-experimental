import { RecordingSettings } from './recordingSettings';
import { RoutingSettings } from './routingSettings';

type AudioWithSinkId = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

class MicrophoneRouter {
  private stream: MediaStream | null = null;

  private audioContext: AudioContext | null = null;

  private gainNode: GainNode | null = null;

  private audioElement: AudioWithSinkId | null = null;

  private inputDeviceId = '';

  private outputDeviceId = '';

  private startToken = 0;

  async apply(
    routingSettings: RoutingSettings,
    recordingSettings: RecordingSettings
  ) {
    if (!routingSettings.enabled) {
      this.stop();
      return;
    }

    if (
      !this.stream ||
      this.inputDeviceId !== recordingSettings.inputDeviceId
    ) {
      await this.start(routingSettings, recordingSettings);
      return;
    }

    if (this.gainNode) {
      this.gainNode.gain.value = recordingSettings.gain;
    }
    if (this.outputDeviceId !== routingSettings.outputDeviceId) {
      await this.setOutputDevice(routingSettings.outputDeviceId);
    }
  }

  stop() {
    this.startToken += 1;
    this.stopResources();
  }

  private stopResources() {
    this.audioElement?.pause();
    if (this.audioElement) {
      this.audioElement.srcObject = null;
    }
    this.audioElement = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.gainNode = null;
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    this.inputDeviceId = '';
    this.outputDeviceId = '';
  }

  private async start(
    routingSettings: RoutingSettings,
    recordingSettings: RecordingSettings
  ) {
    const token = this.startToken + 1;
    this.startToken = token;
    this.stopResources();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio:
        recordingSettings.inputDeviceId === 'default'
          ? true
          : { deviceId: { exact: recordingSettings.inputDeviceId } },
    });
    if (token !== this.startToken) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      const audioElement = new Audio() as AudioWithSinkId;

      gainNode.gain.value = recordingSettings.gain;
      source.connect(gainNode).connect(destination);
      audioElement.srcObject = destination.stream;
      audioElement.autoplay = true;

      this.stream = stream;
      this.audioContext = audioContext;
      this.gainNode = gainNode;
      this.audioElement = audioElement;
      this.inputDeviceId = recordingSettings.inputDeviceId;

      await this.setOutputDevice(routingSettings.outputDeviceId);
      await audioContext.resume();
      await audioElement.play();
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      this.stopResources();
      throw error;
    }
  }

  private async setOutputDevice(deviceId: string) {
    const { audioElement } = this;
    if (!audioElement) {
      return;
    }

    if (typeof audioElement.setSinkId === 'function') {
      await audioElement.setSinkId(deviceId || 'default');
    } else if (deviceId !== 'default') {
      throw new Error('Selecting a microphone route output is unsupported');
    }
    this.outputDeviceId = deviceId || 'default';
  }
}

export default new MicrophoneRouter();
