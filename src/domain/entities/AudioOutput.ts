const normalizeVolume = (volume: number) =>
  Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;

export default class AudioOutput {
  id: string;

  name: string;

  volume: number;

  constructor(id: string, name: string, volume = 1) {
    this.id = id || 'default';
    this.name = name || 'Default';
    this.volume = normalizeVolume(volume);
  }
}
