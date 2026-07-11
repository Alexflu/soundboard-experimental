import { SoundboardDomain } from './SoundboardDomain';
import Sound from './entities/Sound';
import Source from './entities/Source';
import Filters from './entities/Filters';
import LocalSoundAdapter from '../infrastructure/LocalSoundAdapter';
import MyInstantSoundAdapter from '../infrastructure/MyInstantSoundAdapter';
import UserPreferenceAdapter from '../infrastructure/UserPreferenceAdapter';

describe('SoundboardDomainTest', () => {
  const getLocalSounds = jest.fn<Sound[], [string]>();
  const getMyInstantSounds = jest.fn<Promise<Sound[]>, [string]>();

  const localSoundAdapter = ({
    getSounds: getLocalSounds,
    addSound: jest.fn(),
    removeSound: jest.fn(),
  } as unknown) as LocalSoundAdapter;

  const myInstantSoundAdapter = ({
    getSounds: getMyInstantSounds,
  } as unknown) as MyInstantSoundAdapter;

  const userPreferenceAdapter = ({
    getUserPreferences: jest.fn(() => ({ pathToSoundsJson: '' })),
  } as unknown) as UserPreferenceAdapter;

  const soundboardDomain = new SoundboardDomain(
    localSoundAdapter,
    myInstantSoundAdapter,
    userPreferenceAdapter
  );

  it('should get sounds', async () => {
    const soundLocal = new Sound(
      'localSound',
      'description',
      'file://lol',
      Source.LOCAL
    );
    const soundMyInstant = new Sound(
      'myInstantSound',
      'description',
      'https://lol',
      Source.MYINSTANT
    );
    getLocalSounds.mockReturnValueOnce([soundLocal]);
    getMyInstantSounds.mockResolvedValueOnce([soundMyInstant]);

    const sounds = await soundboardDomain.getSounds(new Filters(''));

    expect(sounds).toEqual([soundLocal, soundMyInstant]);
  });

  it('should get sounds with filter', async () => {
    const soundLocal = new Sound(
      'localSound',
      'description',
      'file://lol',
      Source.LOCAL
    );
    const soundLocal2 = new Sound(
      'toto',
      'description',
      'file://lol',
      Source.LOCAL
    );
    const soundMyInstant = new Sound(
      'myInstantSound',
      'description',
      'https://lol',
      Source.MYINSTANT
    );
    const soundMyInstant2 = new Sound(
      'tata',
      'description',
      'https://lol',
      Source.MYINSTANT
    );
    getLocalSounds.mockReturnValueOnce([soundLocal, soundLocal2]);
    getMyInstantSounds.mockResolvedValueOnce([
      soundMyInstant,
      soundMyInstant2,
    ]);

    const sounds = await soundboardDomain.getSounds(new Filters('sound'));

    expect(sounds).toEqual([soundLocal, soundMyInstant]);
  });
});
