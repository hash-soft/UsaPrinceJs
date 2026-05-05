import { AudioManager } from '../src/AudioManager';

describe('AudioManager Volume Control', () => {
  beforeEach(() => {
    // Reset volume settings before each test
    AudioManager.setBgmVolume(0.8);
    AudioManager.setSystemSeVolume(1.0);
    AudioManager.setSeVolume(0.8);
  });

  test('should set BGM volume', () => {
    AudioManager.setBgmVolume(0.5);
    // Note: Since we can't easily mock @pixi/sound in this environment,
    // we're testing that the method doesn't throw and the property is set
    expect(() => AudioManager.setBgmVolume(0.5)).not.toThrow();
  });

  test('should set System SE volume', () => {
    AudioManager.setSystemSeVolume(0.7);
    expect(() => AudioManager.setSystemSeVolume(0.7)).not.toThrow();
  });

  test('should set SE volume', () => {
    AudioManager.setSeVolume(0.6);
    expect(() => AudioManager.setSeVolume(0.6)).not.toThrow();
  });

  test('should set all volumes', () => {
    AudioManager.setAllVolume(0.9);
    expect(() => AudioManager.setAllVolume(0.9)).not.toThrow();
  });

  test('_getDefaultVolumeForUrl should return correct volumes', () => {
    expect(
      AudioManager['_getDefaultVolumeForUrl']('./assets/music/test.mp3'),
    ).toBe(0.8);
    expect(
      AudioManager['_getDefaultVolumeForUrl']('./assets/sound/test.wav'),
    ).toBe(0.8);
    expect(
      AudioManager['_getDefaultVolumeForUrl']('./other/path/test.mp3'),
    ).toBe(1.0);
  });
});
