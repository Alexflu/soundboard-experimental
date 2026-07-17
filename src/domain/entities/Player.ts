import { toast } from 'react-toastify';
import Sound from './Sound';

type AudioWithSinkId = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

type AudioOutputVolume = {
  id: string;
  volume: number;
};

const normalizeVolume = (volume: number) =>
  Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;

class Player {
  private static readonly activePlayers = new Set<Player>();

  private static globalMasterVolume = 1;

  private static globalAdditionalAudioOutputDeviceIds: string[] = [];

  private static globalAudioOutputVolumes = new Map<string, number>();

  player: HTMLAudioElement | undefined;

  sound: Sound;

  audioOutputDeviceId: string;

  additionalAudioOutputDeviceIds: string[];

  masterVolume: number;

  private mirrorPlayers: HTMLAudioElement[];

  private cleanupPlayback?: () => void;

  constructor(
    sound: Sound,
    audioOutputDeviceId: string,
    masterVolume = Player.globalMasterVolume,
    additionalAudioOutputDeviceIds = Player.globalAdditionalAudioOutputDeviceIds
  ) {
    this.sound = sound;
    this.audioOutputDeviceId = audioOutputDeviceId || 'default';
    const seen = new Set([this.audioOutputDeviceId]);
    this.additionalAudioOutputDeviceIds = additionalAudioOutputDeviceIds.filter(
      (deviceId) => {
        if (!deviceId || seen.has(deviceId)) {
          return false;
        }
        seen.add(deviceId);
        return true;
      }
    );
    this.masterVolume = normalizeVolume(masterVolume);
    this.player = undefined;
    this.mirrorPlayers = [];
  }

  static setGlobalMasterVolume(volume: number) {
    Player.globalMasterVolume = normalizeVolume(volume);
    Player.activePlayers.forEach((player) => player.applyVolume());
  }

  static setGlobalAdditionalAudioOutputDeviceIds(deviceIds: string[]) {
    Player.globalAdditionalAudioOutputDeviceIds = Array.from(
      new Set(deviceIds.filter(Boolean))
    );
  }

  static setGlobalAudioOutputVolumes(outputs: AudioOutputVolume[]) {
    Player.globalAudioOutputVolumes = new Map(
      outputs
        .filter((output) => Boolean(output?.id))
        .map((output) => [output.id, normalizeVolume(output.volume)])
    );
    Player.activePlayers.forEach((player) => player.applyVolume());
  }

  static setGlobalAudioOutputVolume(deviceId: string, volume: number) {
    if (!deviceId) {
      return;
    }
    Player.globalAudioOutputVolumes.set(deviceId, normalizeVolume(volume));
    Player.activePlayers.forEach((player) => player.applyVolume());
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
    if (this.player) {
      this.stop();
    }

    const outputDeviceIds = [
      this.audioOutputDeviceId,
      ...this.additionalAudioOutputDeviceIds,
    ];
    const audioPlayers = outputDeviceIds.map(() => {
      const audioPlayer = new Audio(this.sound.path) as HTMLAudioElement;
      audioPlayer.preload = 'auto';
      return audioPlayer;
    });
    const [audioPlayer, ...mirrorPlayers] = audioPlayers;
    this.player = audioPlayer;
    this.mirrorPlayers = mirrorPlayers;
    this.masterVolume = Player.globalMasterVolume;
    this.applyVolume();
    Player.activePlayers.add(this);

    await Promise.all(
      audioPlayers.map((currentPlayer, index) =>
        Player.setOutputDevice(currentPlayer, outputDeviceIds[index])
      )
    );
    audioPlayers.forEach((currentPlayer) => currentPlayer.load());
    await Promise.all(audioPlayers.map(Player.waitForCanPlay));

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

    audioPlayers.forEach((currentPlayer) => {
      try {
        currentPlayer.currentTime = startTime;
      } catch {
        // Some failed or not-yet-seekable media cannot accept currentTime.
      }
    });

    const onTrimEnd = () => {
      if (
        validEndTime !== undefined &&
        audioPlayer.currentTime >= validEndTime
      ) {
        audioPlayers.forEach((currentPlayer) => currentPlayer.pause());
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
      mirrorPlayers.forEach((currentPlayer) => currentPlayer.pause());
      Player.activePlayers.delete(this);
      if (this.player === audioPlayer) {
        this.cleanupPlayback = undefined;
      }
    };
    audioPlayer.addEventListener('ended', finishPlayback, { once: true });
    this.cleanupPlayback = () => {
      audioPlayer.removeEventListener('timeupdate', onTrimEnd);
      audioPlayer.removeEventListener('ended', finishPlayback);
      mirrorPlayers.forEach((currentPlayer) => currentPlayer.pause());
      Player.activePlayers.delete(this);
    };

    Promise.all(audioPlayers.map((currentPlayer) => currentPlayer.play()))
      .then(() => {
        if (this.player !== audioPlayer) {
          return false;
        }
        mirrorPlayers.forEach((currentPlayer) => {
          if (
            Math.abs(currentPlayer.currentTime - audioPlayer.currentTime) > 0.01
          ) {
            try {
              currentPlayer.currentTime = audioPlayer.currentTime;
            } catch {
              // Some output devices cannot be resynchronized after playback starts.
            }
          }
        });
        return true;
      })
      .catch((e) => {
        this.cleanupPlayback?.();
        this.cleanupPlayback = undefined;
        toast.error(`Error when playing sound : ${e}`);
      });
  }

  setVolume(volume: number) {
    this.sound.volume = normalizeVolume(volume);
    this.applyVolume();
  }

  private applyVolume() {
    this.getAudioPlayers().forEach((audioPlayer, index) => {
      const deviceId =
        index === 0
          ? this.audioOutputDeviceId
          : this.additionalAudioOutputDeviceIds[index - 1];
      const outputVolume =
        Player.globalAudioOutputVolumes.get(deviceId) ?? this.masterVolume;
      audioPlayer.volume = normalizeVolume(this.sound.volume * outputVolume);
    });
  }

  private getAudioPlayers(): HTMLAudioElement[] {
    return this.player ? [this.player, ...this.mirrorPlayers] : [];
  }

  private static async setOutputDevice(
    audioPlayer: HTMLAudioElement,
    deviceId: string
  ): Promise<void> {
    if (deviceId === 'default') {
      return;
    }

    const playerWithSinkId = audioPlayer as AudioWithSinkId;
    try {
      if (typeof playerWithSinkId.setSinkId !== 'function') {
        throw new Error('setSinkId is not supported by this browser');
      }
      await playerWithSinkId.setSinkId(deviceId);
    } catch (e) {
      toast.error(`Error when setting audio output: ${e}`);
    }
  }

  private static waitForCanPlay(audioPlayer: HTMLAudioElement): Promise<void> {
    if (audioPlayer.readyState >= 3) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const finish = () => {
        audioPlayer.removeEventListener('canplay', finish);
        audioPlayer.removeEventListener('error', finish);
        resolve();
      };
      audioPlayer.addEventListener('canplay', finish, { once: true });
      audioPlayer.addEventListener('error', finish, { once: true });
    });
  }

  stop() {
    const audioPlayers = this.getAudioPlayers();
    audioPlayers.forEach((audioPlayer) => {
      audioPlayer.pause();
      try {
        audioPlayer.currentTime = 0;
      } catch {
        // Media may be stopped before it becomes seekable.
      }
    });
    this.cleanupPlayback?.();
    this.cleanupPlayback = undefined;
    Player.activePlayers.delete(this);
    delete this.player;
    this.mirrorPlayers = [];
  }
}

export default Player;
