import { toast } from 'react-toastify';
import Sound from './Sound';

type AudioWithSinkId = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

const normalizeVolume = (volume: number) =>
  Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;

class Player {
  private static readonly activePlayers = new Set<Player>();

  player: HTMLAudioElement | undefined;

  sound: Sound;

  audioOutputDeviceId: string;

  masterVolume: number;

  constructor(sound: Sound, audioOutputDeviceId: string, masterVolume = 1) {
    this.sound = sound;
    this.audioOutputDeviceId = audioOutputDeviceId;
    this.masterVolume = normalizeVolume(masterVolume);
    this.player = undefined;
  }

  static setGlobalMasterVolume(volume: number) {
    Player.activePlayers.forEach((player) => player.setMasterVolume(volume));
  }

  isPlaying(): boolean {
    return (
      this.player !== undefined &&
      this.player.currentTime > 0 &&
      !this.player.paused &&
      !this.player.ended &&
      this.player.readyState > 2
    );
  }

  async play() {
    this.player = new Audio(this.sound.path) as HTMLAudioElement;
    this.applyVolume();
    Player.activePlayers.add(this);
    this.player.addEventListener(
      'ended',
      () => Player.activePlayers.delete(this),
      { once: true }
    );
    if (this.audioOutputDeviceId !== 'default') {
      const playerWithSinkId = this.player as AudioWithSinkId;
      try {
        if (typeof playerWithSinkId.setSinkId !== 'function') {
          throw new Error('setSinkId is not supported by this browser');
        }

        await playerWithSinkId.setSinkId(this.audioOutputDeviceId);
      } catch (e) {
        toast.error(`Error when setting sinkId: ${e}`);
      }
    }
    this.player.play().catch((e) => {
      Player.activePlayers.delete(this);
      toast.error(`Error when playing sound : ${e}`);
    });
  }

  setVolume(volume: number) {
    this.sound.volume = normalizeVolume(volume);
    this.applyVolume();
  }

  private setMasterVolume(volume: number) {
    this.masterVolume = normalizeVolume(volume);
    this.applyVolume();
  }

  private applyVolume() {
    if (this.player) {
      this.player.volume = this.sound.volume * this.masterVolume;
    }
  }

  stop() {
    if (this.player) {
      this.player.pause();
      this.player.currentTime = 0;
    }
    Player.activePlayers.delete(this);
    delete this.player;
  }
}

export default Player;
