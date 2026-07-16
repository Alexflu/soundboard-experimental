const normalizeVolume = (volume: number) =>
  Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;

export type AudioOutputValue = {
  id?: string;
  name?: string;
  volume?: number;
};

export default class AudioOutput {
  id: string;

  name: string;

  volume: number;

  additionalOutputs: AudioOutput[];

  constructor(
    id: string,
    name: string,
    volume = 1,
    additionalOutputs: AudioOutputValue[] = []
  ) {
    this.id = id || 'default';
    this.name = name || 'Default';
    this.volume = normalizeVolume(volume);

    const seen = new Set([this.id]);
    this.additionalOutputs = additionalOutputs.reduce<AudioOutput[]>(
      (outputs, output) => {
        const outputId = output?.id || 'default';
        if (seen.has(outputId)) {
          return outputs;
        }
        seen.add(outputId);
        return outputs.concat(
          new AudioOutput(
            outputId,
            output?.name || 'Audio output',
            output?.volume ?? 1
          )
        );
      },
      []
    );
  }
}
