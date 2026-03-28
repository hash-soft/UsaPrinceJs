import { PlayOptions, Sound, IMediaInstance } from '@pixi/sound';
import Utils from './Utils';

interface BgmOptions extends PlayOptions {
  endInterruptFn?: (sound: Sound) => void;
}

interface Bgm {
  sound: Sound;
  options: BgmOptions;
}

/**
 * オーディオクラス
 */
export class AudioManager {
  /**
   * Bgmスタック
   */
  private static _bgmStack: Bgm[] = [];
  /**
   * 解放するBgmSound
   */
  private static _releaseBgms: Sound[] = [];
  /**
   * 事前読み込みBgm
   */
  private static _preloadBgm: Bgm | null = null;
  /**
   * システム効果音
   * ゲーム開始時に読み込んでおくのでここにある効果音を
   * 使用する場合読み込みが必要ない
   */
  private static _systemSes: Map<string, Sound> = new Map();
  /**
   * 効果音
   */
  private static _ses: Map<string, Sound> = new Map();

  /**
   * bgm再生
   * @param name
   * @param start
   * @param end
   * @param store 現在演奏中のBgmを保持しておく
   * @returns
   */
  static playBgm(
    name: string,
    start?: number,
    end?: number,
    loop?: boolean,
    store = false
  ) {
    // 同じbgm作成済み
    if (this._bgmCreated(name)) {
      // 再生中ならそのまま戻る
      if (this._bgmPlaying()) {
        // ほんとはオプションを変更する
        return;
      }
      // 再生可能なら再生して戻る
      if (this._bgmPlayable()) {
        this._playMusic(this._getCurrentBgm(), loop, start, end);
        return;
      }
      // それ以外なら読み込み待ちなので戻る
      return;
    }

    // スタックに残す場合は再開できるように一時停止にする
    if (store) {
      this.pauseBgm();
    } else {
      this.stopBgm();
      this._popBgm();
    }

    // 事前読み込みBgm
    if (this._preloadBgm && this._preloadBgmCreated(name)) {
      const { sound, options } = this._preloadBgm;
      options.loop = true;
      options.start = start;
      options.end = end;
      if (sound.isPlayable) {
        this._playMusic(this._preloadBgm, true, start, end);
      }
      this._bgmStack.push(this._preloadBgm);
      this._preloadBgm = null;
      return;
    }

    const url = this._getBgmUrl(name);
    // 新しいbgmを読み込んで再生
    const sound = this._load(
      url,
      (loadSound) => {
        const bgm = this._getCurrentBgm();
        // ここに来るまでにsoundオブジェクトが変わっている場合は再生しない
        if (!this._checkPlayableSound(bgm, loadSound)) {
          return;
        }
        this._playMusic(bgm, loop, start, end);
      },
      // 失敗時
      () => {
        Utils.pushError(new Error(url));
      }
    );

    this._pushBgm(sound, loop, start, end);
  }

  /**
   * 再生可能サウンドか確認する
   * @param bgm
   * @param sound
   * @returns
   */
  private static _checkPlayableSound(
    bgm: Bgm | undefined,
    sound: Sound | undefined
  ) {
    if (bgm?.sound !== sound) {
      this._destroyReleaseBgm();
      return false;
    }
    return true;
  }

  /**
   * bgm事前読み込み
   * @param name
   * @returns
   */
  static preloadBgm(name: string) {
    // 同じbgm作成済みならなにもしない
    if (this._bgmCreated(name) || this._preloadBgmCreated(name)) {
      return;
    }
    this._destroyPreloadBgm();
    const url = this._getBgmUrl(name);
    // 新しいbgmを読み込む
    const sound = this._load(
      url,
      (loadSound) => {
        const bgm = this._getCurrentBgm();
        // ここに来るまでに事前読み込みのbgmになっていなければ再生しない
        if (!this._checkPlayableSound(bgm, loadSound)) {
          return;
        }
        const {
          loop = undefined,
          start = undefined,
          end = undefined,
          endInterruptFn = undefined,
        } = bgm ? bgm.options : {};
        this._playMusic(bgm, loop, start, end, endInterruptFn);
      },
      // 失敗時
      () => {
        Utils.pushError(new Error(url));
      }
    );
    this._preloadBgm = { sound, options: {} };
  }

  /**
   * bgmの割り込み
   * 同じbgmが流れてようがかまわず割り込む
   * 再生が終わったら割り込み前のbgmをリジュームする
   * @param name
   * @param start
   * @param end
   * @param endFn
   * @param endNoResume 終了後元のbgmをリジュームしない
   */
  static interruptBgm(
    name: string,
    start: number,
    end: number,
    endFn?: () => void,
    endNoResume = false
  ) {
    const url = this._getBgmUrl(name);
    const endInterruptFn = this._getEndInterruptFn(endFn, endNoResume);
    // 新しいbgmを読み込んで再生
    const sound = this._load(
      url,
      (loadSound) => {
        const bgm = this._getCurrentBgm();
        // ここに来るまでにbgmが変わっている場合は再生しない
        if (!this._checkPlayableSound(bgm, loadSound)) {
          return;
        }
        this._playMusic(bgm, false, start, end, endInterruptFn);
      },
      () => {
        Utils.pushError(new Error(url));
      }
    );
    // bgmが再生中なら一時停止
    this.pauseBgm();
    this._pushBgm(sound, false, start, end, endInterruptFn);
  }

  /**
   * 割り込み終了時に実行する関数を取得
   * @param endFn
   * @param endNoResume 終了後元のbgmをリジュームしない
   * @returns
   */
  private static _getEndInterruptFn(endFn?: () => void, endNoResume = false) {
    return (sound: Sound) => {
      // 割り込み終了
      endFn?.();
      const bgm = this._getCurrentBgm();
      if (bgm?.sound !== sound) {
        // なんらかの理由でstackが削除されたため処理を終了する
        return;
      }
      // 割り込みを戻して再生する
      this._popBgm();
      if (!endNoResume) {
        this.resumeBgm();
      }
    };
  }

  /**
   * bgmの再開
   * @returns
   */
  static resumeBgm() {
    const bgm = this._getCurrentBgm();
    if (bgm === undefined || bgm.sound.isPlaying) {
      return;
    }
    this._destroyReleaseBgm();
    if (bgm.sound.paused) {
      this._resumeMusic(bgm);
    } else {
      const options = bgm.options;
      this._play(
        bgm.sound,
        options.loop,
        options.start,
        options.end,
        options.endInterruptFn
      );
    }
  }

  /**
   * bgmを一時停止する
   */
  static pauseBgm() {
    const bgm = this._getCurrentBgm();
    // 演奏中なら一時停止する
    if (bgm?.sound.isPlaying) {
      bgm.sound.pause();
    }
  }

  /**
   * bgmを停止する
   */
  static stopBgm(release = false) {
    const bgm = this._getCurrentBgm();
    bgm?.sound.stop();
    if (release) {
      this._popBgm();
    }
    // 終了コールバックを呼ぶ
    bgm?.options.endInterruptFn?.(bgm.sound);
  }

  /**
   * のっかっているBgmを削除する
   */
  static releaseStackedBgm() {
    if (this._bgmStack.length < 2) {
      // のっかっているbgmがない
      return;
    }
    this._popBgm();
  }

  /**
   * Bgmをスタックに積む
   * @param sound
   * @param loop
   * @param start
   * @param end
   * @param endInterruptFn
   */
  private static _pushBgm(
    sound: Sound,
    loop?: boolean,
    start?: number,
    end?: number,
    endInterruptFn?: (sound: Sound) => void
  ) {
    const options = { loop, start, end, endInterruptFn };
    this._bgmStack.push({ sound, options });
  }

  /**
   * Bgmをスタックから取り出す
   * @returns
   */
  private static _popBgm() {
    const bgm = this._bgmStack.pop();
    if (bgm?.sound) {
      this._releaseBgms.push(bgm.sound);
    }
    return bgm;
  }

  /**
   * 音楽Play
   * @param bgm
   * @param loop
   * @param start
   * @param end
   * @param endFn
   * @returns
   */
  private static _playMusic(
    bgm?: Bgm,
    loop?: boolean,
    start?: number,
    end?: number,
    endFn?: (sound: Sound) => void
  ) {
    this._destroyReleaseBgm();
    if (!bgm) {
      return;
    }
    const { sound, options } = bgm;
    options.loop = loop;
    options.start = start;
    options.end = end;
    options.endInterruptFn = endFn;
    this._play(sound, loop, start, end, endFn);
  }

  /**
   * 音楽リジューム
   * @param bgm
   */
  private static _resumeMusic(bgm: Bgm) {
    bgm.sound.resume();
  }

  /**
   * 解放Bgmを破棄する
   */
  private static _destroyReleaseBgm() {
    for (const sound of this._releaseBgms) {
      // 読み込み完了しているバッファだけ削除する
      if (sound.isLoaded) {
        sound.destroy();
      }
    }
    this._releaseBgms.splice(0, this._releaseBgms.length);
  }

  /**
   * 事前読み込みBgmを破棄する
   */
  private static _destroyPreloadBgm() {
    this._preloadBgm?.sound.destroy();
    this._preloadBgm = null;
  }

  /**
   * スタック先頭に指定のbgmが作成されているかどうか
   * @param name
   * @returns
   */
  private static _bgmCreated(name: string) {
    const bgm = this._getCurrentBgm();
    if (bgm === undefined) {
      return;
    }
    const url = this._getBgmUrl(name);
    return this._created(url, bgm.sound);
  }

  /**
   * 事前読み込みBgmが作成されているか
   * @param name
   * @returns
   */
  private static _preloadBgmCreated(name: string) {
    if (!this._preloadBgm) {
      return false;
    }
    const url = this._getBgmUrl(name);
    return this._created(url, this._preloadBgm.sound);
  }

  /**
   * Bgm演奏中か
   * @returns
   */
  private static _bgmPlaying() {
    const bgm = this._getCurrentBgm();
    return bgm?.sound?.isPlaying;
  }

  /**
   * Bgm演奏可能状態か
   * @returns
   */
  private static _bgmPlayable() {
    const bgm = this._getCurrentBgm();
    return bgm?.sound?.isPlayable;
  }

  /**
   * BGMのURLを取得する
   * @param name
   * @returns
   */
  private static _getBgmUrl(name) {
    return './assets/music/' + name;
  }

  /**
   * 同一url
   * @param url
   * @param sound
   * @returns
   */
  private static _created(url: string, sound: Sound) {
    return sound.url === url;
  }

  /**
   * 現在のBgmを取得
   * @returns
   */
  private static _getCurrentBgm() {
    return Utils.lastElement(this._bgmStack);
  }

  /**
   * se読み込み
   * @param name
   * @returns
   */
  static loadSystemSe(name) {
    if (this._systemSes.has(name)) {
      // 読み込み済み
      return;
    }
    const url = this._getSeUrl(name);
    const sound = this._load(url);
    this._systemSes.set(name, sound);
  }

  /**
   * システムサウンドを演奏する
   * @param name
   * @param start
   * @param end
   */
  static playSystemSe(name: string, start: number, end: number) {
    const sound = this._systemSes.get(name);
    if (sound) {
      this._play(sound, false, start, end);
    } else {
      const url = this._getSeUrl(name);
      const newSound = this._load(url, (sound) => {
        this._play(sound, false, start, end);
      });
      this._systemSes.set(name, newSound);
    }
  }

  /**
   * システムSeを再開する
   */
  static resumeSystemSe() {
    this._resumeSounds(this._systemSes);
  }

  /**
   * システムSeを一時停止する
   */
  static pauseSystemSe() {
    this._pauseSounds(this._systemSes);
  }

  /**
   * システムサウンドを停止する
   */
  static stopSystemSe() {
    this._stopSounds(this._systemSes);
  }

  /**
   * SEを演奏する
   * @param name
   * @param start
   * @param end
   */
  static playSe(name: string, start: number, end: number) {
    if (this._systemSes.has(name)) {
      // システムサウンドにある場合はそちらを使用する
      this.playSystemSe(name, start, end);
      return;
    }
    const sound = this._ses.get(name);
    if (sound) {
      this._play(sound, false, start, end);
    } else {
      const url = this._getSeUrl(name);
      const newSound = this._load(
        url,
        (sound) => {
          this._play(sound, false, start, end);
        },
        () => {
          Utils.pushError(new Error(url));
        }
      );
      this._ses.set(name, newSound);
    }
    // 使用していないバッファを削除
    this._ses.forEach((value, key) => {
      // 読み込み済みで再生していない
      if (value.isPlayable && !value.isPlaying) {
        this._destroySe(key);
      }
    });
  }

  /**
   * Seを再開する
   */
  static resumeSe() {
    this._resumeSounds(this._ses);
  }

  /**
   * Seを一時停止する
   */
  static pauseSe() {
    this._pauseSounds(this._ses);
  }

  /**
   * SEを停止する
   */
  static stopSe() {
    this._stopSounds(this._ses);
  }

  /**
   * サウンドグループを再開する
   * @param sounds
   */
  private static _resumeSounds(sounds: Map<string, Sound>) {
    for (const [, sound] of sounds) {
      // 再生中
      if (sound.paused) {
        sound.resume();
      }
    }
  }

  /**
   * サウンドグループを一時停止する
   * @param sounds
   */
  private static _pauseSounds(sounds: Map<string, Sound>) {
    for (const [, sound] of sounds) {
      // 再生中
      if (sound.isPlaying) {
        sound.pause();
      }
    }
  }

  /**
   * サウンドグループを停止する
   * @param sounds
   */
  private static _stopSounds(sounds: Map<string, Sound>) {
    for (const [, sound] of sounds) {
      // 再生中
      if (sound.isPlaying) {
        sound.stop();
      }
    }
  }

  /**
   * SEを削除する
   * @param key
   * @returns
   */
  private static _destroySe(key: string) {
    const sound = this._ses.get(key);
    sound?.destroy();
    return this._ses.delete(key);
  }

  /**
   * SEのURLを取得する
   * @param name
   * @returns
   */
  private static _getSeUrl(name) {
    return './assets/sound/' + name;
  }

  /**
   * 読み込み
   * @param url
   * @param fn
   * @param errorfn
   * @returns
   */
  private static _load(
    url: string,
    fn?: (sound: Sound | undefined) => void,
    errorfn?
  ) {
    const sound = Sound.from({
      url: url,
      preload: true,
      loaded: (err, sound: Sound | undefined) => {
        if (err) {
          errorfn?.();
          return;
        }
        fn?.(sound);
      },
    });
    return sound;
  }

  /**
   * 再生
   * @param sound
   * @param loop
   * @param start
   * @param end
   * @param endFn
   * @returns
   */
  private static _play(
    sound?: Sound,
    loop?: boolean,
    start?: number,
    end?: number,
    endFn?: (sound: Sound) => void
  ) {
    if (!sound?.isPlayable) {
      return;
    }
    const instance = sound.play({
      loop: loop,
      start: start === undefined ? 0 : start,
      end: end === undefined ? 0 : end,
    }) as IMediaInstance;
    if (!loop) {
      // ループしない場合は終了時に通知する
      instance.on('end', () => {
        endFn?.(sound);
      });
    }
  }

  /**
   * すべて再開する
   */
  static allResume() {
    this.resumeBgm();
    this.resumeSystemSe();
    this.resumeSe();
  }

  /**
   * すべて一時停止する
   */
  static allPause() {
    this.pauseBgm();
    this.pauseSystemSe();
    this.pauseSe();
  }
}
