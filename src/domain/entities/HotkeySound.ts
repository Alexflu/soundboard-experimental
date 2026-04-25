import Source from './Source';

export class HotkeySound {
  id: string;

  name: string;

  url: string;

  source: Source;

  volume: number;

  constructor(
    id: string,
    name: string,
    url: string,
    source?: Source,
    volume = 1
  ) {
    this.id = id;
    this.name = name;
    this.url = url;
    if (source) {
      this.source = source;
    } else if (/^https?:\/\//.test(url)) {
      this.source = Source.MYINSTANT;
    } else {
      this.source = Source.LOCAL;
    }
    this.volume = Math.max(0, Math.min(1, volume));
  }
}
