import Source from './Source';

class Sound {
  name: string;

  description: string;

  path: string;

  source: Source;

  volume: number;

  startTime: number;

  endTime?: number;

  constructor(
    name: string,
    description: string,
    path: string,
    source: Source,
    volume = 1,
    startTime = 0,
    endTime?: number
  ) {
    this.name = name;
    this.description = description;
    this.path = path;
    this.source = source;
    this.volume = Math.min(1, Math.max(0, volume));
    this.startTime = Number.isFinite(startTime) ? Math.max(0, startTime) : 0;
    this.endTime =
      typeof endTime === 'number' &&
      Number.isFinite(endTime) &&
      endTime > this.startTime
        ? endTime
        : undefined;
  }
}

export default Sound;
