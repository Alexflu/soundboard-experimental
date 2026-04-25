import { toast } from 'react-toastify';
import Sound from './Sound';

type AudioWithSinkId = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

class Player {
  player: HTMLAudioElement | undefined;

  sound: Sound;

  audioOutputDeviceId: string;

  constructor(sound: Sound, audioOutputDeviceId: string) {
    this.sound = sound;
    this.audioOutputDeviceId = audioOutputDeviceId;
    this.player = undefined;
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
    this.player
      .play()
      .catch((e) => toast.error(`Error when playing sound : ${e}`));
  }

  stop() {
    if (this.player) {
      this.player.pause();
      this.player.currentTime = 0;
    }
    delete this.player;
  }
}

export default Player;
