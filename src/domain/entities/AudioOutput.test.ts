import AudioOutput from './AudioOutput';

describe('AudioOutput', () => {
  it('keeps unique additional outputs and excludes the main output', () => {
    const output = new AudioOutput('main', 'Main', 0.8, [
      { id: 'secondary', name: 'Secondary' },
      { id: 'main', name: 'Duplicate main' },
      { id: 'secondary', name: 'Duplicate secondary' },
    ]);

    expect(output.additionalOutputs).toEqual([
      new AudioOutput('secondary', 'Secondary'),
    ]);
  });
});
