class AudioManager {

  // bgm再生
  static playBgm(name, start, end) {
    // 同じbgm作成済み
    if(this._bgmCreated(name)) {
      // 再生中ならそのまま戻る
      if(this._bgm.isPlaying) {
        return;
      }
      // 再生可能なら再生して戻る
      if(this._bgm.isPlayable) {
        this._play(this._bgm, true, start, end);
        return;
      }
      // それ以外なら読み込み待ちなので戻る
      return;
    }
   
    // 異なるbgm読み込みなら停止
    this.stopBgm();

    const url = this._getBgmUrl(name);
    // 新しいbgmを読み込んで再生
    this._bgm = this._load(url, 
      (sound) => {
        // ここに来るまでにbgmが変わっている場合は再生しない
        if(this._bgm !== sound) {
          return;
        }
        this._play(sound, true, start, end);
      },
      () => {
        this._bgm = null;
      });
    // startとendを保存する
    this._bgmOptions.start = start;
    this._bgmOptions.end = end;
  }

  // bgmの割り込み
  // 再生が終わったら割り込み前のbgmをリジュームする
  static interruptBgm(name, start, end, endFn) {
    // すでに割り込まれていたら停止
    if(this._interruptSound) {
      this.stopBgm();
      this._bgm = null;
    }
    if(this._bgm) {
      if(this._bgm.isPlaying) {
        this._bgm.pause();
      }
      // 一時停止に退避して参照を削除する
      [this._interruptSound, this._bgm] = [this._bgm, null];
    }
    const url = this._getBgmUrl(name);
    // 新しいbgmを読み込んで再生
    this._bgm = this._load(url, 
      (sound) => {
        // ここに来るまでにbgmが変わっている場合は再生しない
        if(this._bgm !== sound) {
          return;
        }
        const endInterrupt = () => {
          // 割り込み終了
          if(endFn) {
            endFn();
          }
          if(!this._interruptSound) {
            return;
          }
          // 割り込みを戻して再生する
          [this._bgm, this._interruptSound] = [this._interruptSound, null];
          if(this._bgm.paused) {
            this._bgm.resume();
          } else {
            this._bgm.play(this._bgm, true, 
              this._bgmOptions.begin, this._bgmOptions.end);
          }
        }
        this._play(sound, false, start, end, endInterrupt);
      },
      () => {
        this._bgm = null;
      });
  }

  // bgmの再開
  static resumeBgm() {
    // 再開するbgmがない
    if(!this._pauseSound) {
      return;
    }
    this.stopBgm();
    [this._bgm, this._pauseSound] = [this._pauseSound, null];

    // 一時停止状態じゃない場合はなにもしない
    if(this._bgm.paused) {
      this._bgm.resume();
    }
  }

  // bgmを一時停止する
  static pauseBgm() {
    if(this._bgm) {
      if(this._bgm.isPlaying) {
        this._bgm.pause();
      }
      // 一時停止に退避して参照を削除する
      [this._pauseSound, this._bgm] = [this._bgm, null];
    }
  }

  // bgmを停止する
  static stopBgm() {
    if(this._bgm && this._bgm.isPlaying) {
      this._bgm.stop();
    }
  }

  static _getBgmUrl(name) {
    return './assets/music/' + name;
  }

  // bgmが作成されているかどうか
  static _bgmCreated(name) {
    if(!this._bgm) {
      return false;
    }
    const url = this._getBgmUrl(name);
    return this._created(url, this._bgm);
  }

  // 同一url
  static _created(url, sound) {
    return sound.url === url;
  }


  // se読み込み
  static loadSystemSe(name) {
    if(this._systemSes.has(name)) {
      // 読み込み済み
      return;
    }
    const url = this._getSeUrl(name);
    const sound = this._load(url);
    this._systemSes.set(name, sound);
  }

  static playSystemSe(name, start, end) {
    const sound = this._systemSes.get(name);
    if(sound) {
      this._play(sound, false, start, end);
    } else {
      const url = this._getSeUrl(name);
      const newSound = this._load(url, 
        (sound) => {
          this._play(sound, false, start, end);
        });
      this._systemSes.set(name, newSound);
    }
  }

  static stopSystemSe() {
    this._systemSes.forEach((sound) => {
      // 再生中
      if(sound.isPlaying) {
        sound.stop();
      }
    });
  }

  static playSe(name, start, end) {
    const sound = this._ses.get(name);
    if(sound) {
      this._play(sound, false, start, end);
    } else {
      const url = this._getSeUrl(name);
      const newSound = this._load(url, 
        (sound) => {
          this._play(sound, false, start, end);
        },
        () => {
          this._ses.delete(name);
        });
      this._ses.set(name, newSound);
    }
    // 使用していないバッファを削除
    this._ses.forEach((value, key) => {
      // 読み込み済みで再生していない
      if(value.isPlayable && !value.isPlaying) {
        this._ses.delete(key);
      }
    });
  }

  static stopSe() {
    this._ses.forEach((sound) => {
      // 再生中
      if(sound.isPlaying) {
        sound.stop();
      }
    });
  }

  static _getSeUrl(name) {
    return './assets/sound/' + name;
  }

  // 読み込み
  static _load(url, fn, errorfn) {
    const sound = PIXI.sound.Sound.from({
      url: url,
      preload: true,
      loaded: (err, sound) => {
        if(err) {
          if(errorfn) {
            errorfn();
          }
          return;
        }
        if(fn) {
          fn(sound);
        }
      }
    });
    return sound;
  }

  // 再生
  static _play(sound, loop, start, end, endFn) {
    if(!sound.isPlayable) {
      return;
    }
    const instance = sound.play({
      loop: loop,
      start: start === undefined ? null : start,
      end: end === undefined ? null : end
    });
    if(!loop) {
      // ループしない場合は終了時に通知する
      instance.on('end', () => {
        if (endFn) {
          endFn();
        }
      });
    }
  }
}


AudioManager._bgm = null;
AudioManager._bgmOptions = {start: null, end: null};
AudioManager._pauseSound = null;
AudioManager._interruptSound = null;
AudioManager._ses = new Map();
AudioManager._systemSes = new Map();