import { toast } from 'react-toastify';
import Sound from './Sound';

type AudioWithSinkId = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

const normalizeVolume = (volume: number) =>
  Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;

class Player {
  private static readonly activePlayers = new Set<Player>();

  private static globalMasterVolume = 1;

  player: HTMLAudioElement | undefined;

  sound: Sound;

  audioOutputDeviceId: string;

  masterVolume: number;

  private cleanupPlayback?: () => void;

  constructor(
    sound: Sound,
    audioOutputDeviceId: string,
    masterVolume = Player.globalMasterVolume
  ) {
    this.sound = sound;
    this.audioOutputDeviceId = audioOutputDeviceId;
    this.masterVolume = normalizeVolume(masterVolume);
    this.player = undefined;
  }

  static setGlobalMasterVolume(volume: number) {
    Player.globalMasterVolume = normalizeVolume(volume);
    Player.activePlayers.forEach((player) =>
      player.setMasterVolume(Player.globalMasterVolume)
    );
  }

  isPlaying(): boolean {
    return (
      this.player !== undefined &&
      this.player.currentTime >= this.sound.startTime &&
      !this.player.paused &&
      !this.player.ended &&
      this.player.readyState > 2
    );
  }

  async play() {
    const audioPlayer = new Audio(this.sound.path) as HTMLAudioElement;
    this.player = audioPlayer;
    this.masterVolume = Player.globalMasterVolume;
    this.applyVolume();
    Player.activePlayers.add(this);

    if (this.audioOutputDeviceId !== 'default') {
      const playerWithSinkId = audioPlayer as AudioWithSinkId;
      try {
        if (typeof playerWithSinkId.setSinkId !== 'function') {
          throw new Error('setSinkId is not supported by this browser');
        }

        await playerWithSinkId.setSinkId(this.audioOutputDeviceId);
      } catch (e) {
        toast.error(`Error when setting sinkId: ${e}`);
      }
    }

    await this.waitForMetadata(audioPlayer);
    if (this.player !== audioPlayer) {
      Player.activePlayers.delete(this);
      return;
    }

    const duration =
      Number.isFinite(audioPlayer.duration) && audioPlayer.duration > 0
        ? audioPlayer.duration
        : undefined;
    const startTime = duration
      ? Math.min(this.sound.startTime, Math.max(0, duration - 0.01))
      : this.sound.startTime;
    const requestedEndTime = this.sound.endTime;
    const endTime =
      duration && requestedEndTime !== undefined
        ? Math.min(requestedEndTime, duration)
        : requestedEndTime;
    const validEndTime =
      endTime !== undefined && endTime > startTime ? endTime : undefined;

    try {
      audioPlayer.currentTime = startTime;
    } catch {
      // Some failed or not-yet-seekable media cannot accept currentTime.
    }

    const onTrimEnd = () => {
      if (
        validEndTime !== undefined &&
        audioPlayer.currentTime >= validEndTime
      ) {
        audioPlayer.pause();
        audioPlayer.dispatchEvent(new Event('ended'));
      }
    };
    if (
      validEndTime !== undefined &&
      (duration === undefined || validEndTime < duration - 0.01)
    ) {
      audioPlayer.addEventListener('timeupdate', onTrimEnd);
    }

    const finishPlayback = () => {
      audioPlayer.removeEventListener('timeupdate', onTrimEnd);
      Player.activePlayers.delete(this);
      if (this.player === audioPlayer) {
        this.cleanupPlayback = undefined;
      }
    };
    audioPlayer.addEventListener('ended', finishPlayback, { once: true });
    this.cleanupPlayback = () => {
      audioPlayer.removeEventListener('timeupdate', onTrimEnd);
      audioPlayer.removeEventListener('ended', finishPlayback);
      Player.activePlayers.delete(this);
    };

    audioPlayer.play().catch((e) => {
      this.cleanupPlayback?.();
      this.cleanupPlayback = undefined;
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

  private waitForMetadata(audioPlayer: HTMLAudioElement): Promise<void> {
    if (audioPlayer.readyState >= 1) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const finish = () => {
        audioPlayer.removeEventListener('loadedmetadata', finish);
        audioPlayer.removeEventListener('error', finish);
        resolve();
      };
      audioPlayer.addEventListener('loadedmetadata', finish, { once: true });
      audioPlayer.addEventListener('error', finish, { once: true });
    });
  }

  stop() {
    if (this.player) {
      this.player.pause();
      try {
        this.player.currentTime = 0;
      } catch {
        // Media may be stopped before it becomes seekable.
      }
    }
    this.cleanupPlayback?.();
    this.cleanupPlayback = undefined;
    Player.activePlayers.delete(this);
    delete this.player;
  }
}

export default Player;
