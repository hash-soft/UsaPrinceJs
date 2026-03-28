import { AudioManager } from './AudioManager';
import { system } from './DataStore';

/**
 * 効果音クラス
 */
export class GameSound {
  /**
   * システム効果音読み込み
   */
  static loadSystemSound() {
    const soundIds = system.soundIds;
    const sounds = system.sounds;
    for (const prop in soundIds) {
      const id = soundIds[prop];
      if (!sounds[id]) {
        continue;
      }
      AudioManager.loadSystemSe(sounds[id].filename);
    }
  }

  /**
   * 決定音演奏
   */
  static playDecide() {
    this.playSystemSound('decide');
  }

  /**
   * システム効果音演奏
   * @param name
   */
  static playSystemSound(name) {
    const soundIds = system.soundIds;
    const sound = system.sounds[soundIds[name]];
    if (!sound) {
      return;
    }
    AudioManager.playSystemSe(sound.filename, sound.start, sound.end);
  }

  /**
   * 演奏
   * @param id
   */
  static play(id: number) {
    if (id === 0) {
      AudioManager.stopSe();
      return;
    }
    const sound = system.sounds[id];
    if (!sound) {
      return;
    }
    AudioManager.playSe(sound.filename, sound.start, sound.end);
  }
}

/**
 * BGMクラス
 */
export class GameMusic {
  /**
   * 演奏
   * @param id
   */
  static play(id: number, loop: boolean, currentStore = false) {
    if (id === 0) {
      AudioManager.stopBgm();
      return;
    }
    const music = system.musics[id];
    if (!music) {
      return;
    }
    AudioManager.playBgm(
      music.filename,
      music.start,
      music.end,
      loop,
      currentStore
    );
  }

  /**
   * 事前読み込み
   * @param id
   * @returns
   */
  static preload(id: number) {
    const music = system.musics[id];
    if (!music) {
      return;
    }
    AudioManager.preloadBgm(music.filename);
  }

  /**
   * システムBGMの演奏
   * @param name
   */
  static playSystemMusic(name: string, currentStore = false) {
    const id = system.musicIds[name];
    this.play(id, true, currentStore);
  }

  /**
   * システムBGMの事前読み込み
   * @param name
   */
  static preloadSystemMusic(name: string) {
    const id = system.musicIds[name];
    this.preload(id);
  }

  /**
   * BGMの停止
   */
  static stop(currentRelease = false) {
    AudioManager.stopBgm(currentRelease);
  }

  /**
   * BGMの一時停止
   */
  static pause() {
    AudioManager.pauseBgm();
  }

  /**
   * BGMの割り込み
   * @param id
   * @returns
   */
  static interrupt(id: number, endFn?: () => void, endNoResume = false) {
    if (id === 0) {
      AudioManager.stopBgm();
      return;
    }
    const music = system.musics[id];
    if (!music) {
      return;
    }
    AudioManager.interruptBgm(
      music.filename,
      music.start,
      music.end,
      endFn,
      endNoResume
    );
  }

  /**
   * システムBGMの割り込み
   * @param name
   */
  static interruptSystemMusic(
    name: string,
    endFn?: () => void,
    endNoResume = false
  ) {
    const id = system.musicIds[name];
    this.interrupt(id, endFn, endNoResume);
  }

  /**
   * BGMの再開
   */
  static resume() {
    AudioManager.resumeBgm();
  }

  /**
   * のっかっているBGMを削除する
   */
  static releaseStacked() {
    AudioManager.releaseStackedBgm();
  }
}
