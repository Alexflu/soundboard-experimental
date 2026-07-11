import Source from './Source';

class Sound {
  name: string;

  description: string;

  path: string;

  source: Source;

  volume: number;

  constructor(
    name: string,
    description: string,
    path: string,
    source: Source,
    volume = 1
  ) {
    this.name = name;
    this.description = description;
    this.path = path;
    this.source = source;
    this.volume = Math.min(1, Math.max(0, volume));
  }
}

export default Sound;
