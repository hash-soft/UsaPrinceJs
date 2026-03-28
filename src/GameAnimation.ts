import { GameSound } from './AudioUtils';
import {
  EEffectCode,
  EEffectMoveType,
  EEffectRange,
  EEffectScaleType,
  EEffectSettings,
  EEffectVisible,
  Effect,
  EffectCommand,
} from './DataTypes';
import { animations } from './DataStore';
import { GameMaterial } from './GameMaterial';
import { GameRate } from './GameUtils';

/**
 * 効果タイマークラス
 */
export class GameEffectTimer {
  /**
   * 設定時間
   */
  private _settingDuration: number = 0;
  /**
   * 残り時間
   */
  private _duration: number = 0;

  /**
   * クリア
   */
  clear() {
    this._settingDuration = 0;
    this._duration = 0;
  }

  /**
   * 残り時間を設定
   */
  setDuration(value: number) {
    this._settingDuration = value;
    this._duration = value;
  }

  /**
   * 設定時間を取得
   */
  get settingDuration() {
    return this._settingDuration;
  }

  /**
   * 残り時間を取得
   */
  get duration() {
    return this._duration;
  }

  /**
   * タイマー中かどうかを取得
   */
  get during() {
    return this._duration > 0;
  }

  /**
   * 残り時間を減算
   */
  decDuration() {
    if (this._duration > 0) {
      this._duration -= 1;
      if (this._duration === 0) {
        return true;
      }
    }
    return false;
  }
}

/**
 * アニメーション待機タイプ
 */
export const enum EAnimationWaitType {
  None, //待機しない
  SettingTime, // 指定時間
  ToEnd, //終わりまで
}

/**
 * アニメーションクラス
 *
 * アニメーションデータのタイミングをとる
 * 実行のタイミングで実行可能なものは実行し、
 * 表示クラスでないとできないものは表示クラスへの要求を
 * 保存する
 */
export class GameAnimation {
  /**
   * 対象
   * フィルターや位置などはこの対象を通じて設定する
   * アニメーション開始終了もここから
   */
  private _targets: GameMaterial[];
  /**
   * 効果
   */
  private _effect: Effect;
  /**
   * コマンドインデックス
   */
  private _index: number;
  /**
   * 待機カウント
   */
  private _waitCount: number;
  /**
   * 速度
   */
  private _speed: number;
  /**
   * フレームカウント
   */
  private _frameIndex: number;
  /**
   * 実行カウント
   */
  private _realCount: number;
  /**
   * 設定時間
   */
  private _settingTime: number;
  /**
   * フラッシュ間隔
   */
  private _flashDuration: number;
  /**
   * フラッシュ色
   */
  private _flashColor: [number, number, number, number];
  /**
   * 不透明度変更するか
   */
  private _opacityChange: boolean;
  /**
   * 不透明度間隔
   */
  private _opacityDuration: number;
  /**
   * 不透明度
   */
  private _opacity: number;
  /**
   * ブラー間隔
   */
  private _blurDuration: number;
  /**
   * ブラーの水平方向の強さ
   */
  private _blurX: number;
  /**
   * ブラーの垂直方向の強さ
   */
  private _blurY: number;
  /**
   * ノイズ間隔
   */
  private _noiseDuration: number;
  /**
   * ノイズの強さ
   */
  private _noiseStrength: number;
  /**
   * 表示状態
   */
  private _visible: EEffectVisible;
  /**
   * 移動間隔
   */
  private _moveDuration: number;
  /**
   * 移動タイプ
   */
  private _moveType: EEffectMoveType;
  /**
   * X移動位置
   */
  private _moveX: number;
  /**
   * Y移動位置
   */
  private _moveY: number;
  /**
   * 拡大率間隔
   */
  private _scaleDuration: number;
  /**
   * 拡大率タイプ
   */
  private _scaleType: EEffectScaleType;
  /**
   * X拡大率
   */
  private _scaleX: number;
  /**
   * Y拡大率
   */
  private _scaleY: number;
  /**
   * 角度をリセットする
   */
  private _resetAngle: boolean;
  /**
   * 角度を変更する
   */
  private _angleChange: boolean;
  /**
   * 加算角度
   */
  private _addAngle: number;
  /**
   * Zオーダーを変更する
   */
  private _zOrderChange: boolean;
  /**
   * Zオーダー値
   */
  private _zOrder: number;
  /**
   * 効果範囲
   */
  private _range: EEffectRange;

  /**
   * 対象を取得する
   */
  get targets() {
    return this._targets;
  }

  /**
   * 効果範囲を取得する
   */
  get range() {
    return this._range;
  }

  /**
   * コンストラクタ
   * @param effect
   * @param targets
   * @param speed
   */
  constructor(effect: Effect, targets: GameMaterial[], speed = 1) {
    this.setup(effect, targets, speed);
  }

  /**
   * 効果を設定する
   * @param targets
   * @param effect
   */
  setup(effect: Effect, targets: GameMaterial[], speed = 1) {
    this._targets = targets;
    this._effect = effect;
    this._speed = speed;
    this._settingTime = this._correctDuration(0, effect.length);
    this._clear();
  }

  /**
   * 効果をクリアする
   */
  private _clear() {
    this._index = 0;
    this._waitCount = 0;
    this._frameIndex = 0;
    this._realCount = 0;
    this._flashDuration = 0;
    this._flashColor = [0, 0, 0, 0];
    this._opacityChange = false;
    this._opacityDuration = 0;
    this._opacity = 0;
    this._blurDuration = -1;
    this._blurX = 0;
    this._blurY = 0;
    this._noiseDuration = 0;
    this._noiseStrength = 0;
    this._visible = EEffectVisible.None;
    this._moveDuration = 0;
    this._moveType = EEffectMoveType.None;
    this._moveX = 0;
    this._moveY = 0;
    this._scaleType = EEffectScaleType.None;
    this._scaleDuration = 0;
    this._scaleX = 0;
    this._scaleY = 0;
    this._resetAngle = false;
    this._angleChange = false;
    this._addAngle = 0;
    this._zOrderChange = false;
    this._zOrder = 0;
    this._range = EEffectRange.Target;
  }

  /**
   * コマンドリストが終了したかどうか
   * @returns
   */
  end() {
    return this._index >= this._effect.list.length && this._waitCount === 0;
  }

  /**
   * 設定時間分終了したかどうか
   * @returns
   */
  endSettingTime() {
    return this._realCount >= this._settingTime || this.end();
  }

  /**
   * フラッシュのタイミングか
   * @returns
   */
  flashTiming() {
    return this._flashDuration > 0;
  }

  /**
   * フラッシュ情報を取り出す
   * @returns
   */
  retrieveFlash() {
    const flash = { duration: this._flashDuration, color: this._flashColor };
    this._flashDuration = 0;
    return flash;
  }

  /**
   * 不透明度のタイミングか
   * @returns
   */
  opacityTiming() {
    return this._opacityChange;
  }

  /**
   * 不透明度を取り出す
   * @returns
   */
  retrieveOpacity() {
    const opacity = { duration: this._opacityDuration, opacity: this._opacity };
    this._opacityChange = false;
    return opacity;
  }

  /**
   * ブラーのタイミングか
   * @returns
   */
  blurTiming() {
    return this._blurDuration >= 0;
  }

  /**
   * ブラーを取り出す
   * @returns
   */
  retrieveBlur() {
    const blur = {
      duration: this._blurDuration,
      x: this._blurX,
      y: this._blurY,
    };
    this._blurDuration = -1;
    return blur;
  }

  /**
   * ノイズのタイミングか
   * @returns
   */
  noiseTiming() {
    return this._noiseDuration > 0;
  }

  /**
   * ノイズを取り出す
   * @returns
   */
  retrieveNoise() {
    const noise = {
      duration: this._noiseDuration,
      strength: this._noiseStrength,
    };
    this._noiseDuration = 0;
    return noise;
  }

  /**
   * 表示のタイミングか
   * @returns
   */
  visibleTiming() {
    return this._visible !== EEffectVisible.None;
  }

  /**
   * 表示を取り出す
   * @returns
   */
  retrieveVisible() {
    const visible = this._visible;
    this._visible = EEffectVisible.None;
    return visible;
  }

  /**
   * 移動のタイミングか
   * @returns
   */
  moveTiming() {
    return this._moveType !== EEffectMoveType.None;
  }

  /**
   * 移動を取り出す
   * @returns
   */
  retrieveMove() {
    let moveX: number, moveY: number;
    if (this._moveType === EEffectMoveType.Moment) {
      this._moveDuration = 0;
    }
    if (this._moveType === EEffectMoveType.Add) {
      moveX = this._moveX * this._moveDuration;
      moveY = this._moveY * this._moveDuration;
    } else {
      moveX = this._moveX;
      moveY = this._moveY;
    }

    this._moveType = EEffectMoveType.None;
    return {
      duration: this._moveDuration,
      moveX,
      moveY,
    };
  }

  /**
   * 拡大率のタイミングか
   * @returns
   */
  scaleTiming() {
    return this._scaleType !== EEffectScaleType.None;
  }

  /**
   * 拡大率を取り出す
   * @returns
   */
  retrieveScale() {
    const x = GameRate.calc(this._scaleX, 1);
    const y = GameRate.calc(this._scaleY, 1);
    let scaleX: number, scaleY: number;
    if (this._scaleType === EEffectScaleType.Moment) {
      this._scaleDuration = 0;
    }
    if (this._scaleType === EEffectScaleType.Add) {
      scaleX = x * this._scaleDuration + 1;
      scaleY = y * this._scaleDuration + 1;
    } else {
      scaleX = x;
      scaleY = y;
    }

    this._scaleType = EEffectScaleType.None;
    return {
      duration: this._scaleDuration,
      scaleX,
      scaleY,
    };
  }

  /**
   * 回転タイミング
   * @returns
   */
  rotationTiming() {
    return this._resetAngle || this._angleChange;
  }

  /**
   * 回転設定を取り出す
   * @returns
   */
  retrieveRotation() {
    const rotation = {
      reset: this._resetAngle,
      change: this._angleChange,
      addAngle: this._addAngle,
    };
    this._resetAngle = false;
    this._angleChange = false;
    return rotation;
  }

  /**
   * Zオーダー変更のタイミングか
   * @returns
   */
  zOrderTiming() {
    return this._zOrderChange;
  }

  /**
   * Zオーダーを取り出す
   * @returns
   */
  retrieveZOrder() {
    this._zOrderChange = false;
    return this._zOrder;
  }

  /**
   * 更新
   * コマンドをひたすら実行する
   */
  update() {
    for (;;) {
      if (this._waitCount > 0) {
        this._waitCount -= 1;
        this._realCount += 1;
        break;
      }
      const command = this._currentCommand();
      if (!command) {
        break;
      }
      this._updateCommand(command);
      this._index += 1;
    }
  }

  /**
   * コマンドの更新
   * @param command
   */
  private _updateCommand(command: EffectCommand) {
    switch (command.code) {
      case EEffectCode.Wait:
        this._executeWait(command.duration);
        break;
      case EEffectCode.Flash:
        this._requestFlash(command.duration, command.params);
        break;
      case EEffectCode.Opacity:
        this._requestOpacity(command.duration, ...(command.params as [number]));
        break;
      case EEffectCode.Blur:
        this._requestBlur(command.duration, command.params);
        break;
      case EEffectCode.Noise:
        this._requestNoise(command.duration, ...(command.params as [number]));
        break;
      case EEffectCode.Visible:
        this._requestVisible(...(command.params as [number]));
        break;
      case EEffectCode.Move:
        this._requestMove(command.duration, command.params);
        break;
      case EEffectCode.Ses:
        this._executeSes(...(command.params as [number]));
        break;
      case EEffectCode.Scale:
        this._requestScale(command.duration, command.params);
        break;
      case EEffectCode.Rotation:
        this._requestRotation(command.duration, command.params);
        break;
      case EEffectCode.ZOrder:
        this._requestZOrder(...(command.params as [number]));
        break;
      case EEffectCode.Settings:
        this._processSettings(command.params);
        break;
    }
  }

  /**
   * 待機を実行する
   * @param duration
   */
  private _executeWait(duration: number) {
    const oldFrameIndex = this._frameIndex;
    this._frameIndex += duration;
    this._waitCount = this._correctDuration(oldFrameIndex, this._frameIndex);
  }

  /**
   * フラッシュ要求を設定する
   * @param duration
   * @param params
   */
  private _requestFlash(duration: number, params: number[]) {
    this._flashDuration = this._correctDuration(
      this._frameIndex,
      this._frameIndex + duration
    );
    this._flashColor = params as [number, number, number, number];
  }

  /**
   * 不透明度要求を設定する
   * @param duration
   * @param opacity
   */
  private _requestOpacity(duration: number, opacity: number) {
    this._opacityChange = true;
    this._opacityDuration = this._correctDuration(
      this._frameIndex,
      this._frameIndex + duration
    );
    this._opacity = opacity;
  }

  /**
   * ブラー要求を設定する
   * @param duration
   * @param strength
   */
  private _requestBlur(duration: number, params: number[]) {
    this._blurDuration = this._correctDuration(
      this._frameIndex,
      this._frameIndex + duration
    );
    [this._blurX, this._blurY] = params;
  }

  /**
   * ノイズ要求を設定する
   * @param duration
   * @param strength
   */
  private _requestNoise(duration: number, strength: number) {
    this._noiseDuration = this._correctDuration(
      this._frameIndex,
      this._frameIndex + duration
    );
    this._noiseStrength = strength;
  }

  /**
   * 表示要求を設定する
   * @param visible
   */
  private _requestVisible(visible: EEffectVisible) {
    this._visible = visible;
  }

  /**
   * 移動要求を設定する
   * @param duration
   * @param params
   */
  private _requestMove(duration: number, params: number[]) {
    this._moveDuration = this._correctDuration(
      this._frameIndex,
      this._frameIndex + duration
    );
    [this._moveType, this._moveX, this._moveY] = params;
  }

  /**
   * 効果音演奏を実行する
   * @param id
   */
  private _executeSes(id: number) {
    GameSound.play(id);
  }

  /**
   * 拡大率要求を設定する
   * @param duration
   * @param params
   */
  private _requestScale(duration: number, params: number[]) {
    this._scaleDuration = this._correctDuration(
      this._frameIndex,
      this._frameIndex + duration
    );
    [this._scaleType, this._scaleX, this._scaleY] = params;
  }

  /**
   * 回転要求を設定する
   * @param duration
   * @param params
   */
  private _requestRotation(duration: number, params: number[]) {
    if (duration === 0) {
      this._resetAngle = true;
    } else {
      this._angleChange = true;
      this._addAngle = (params[0] * this._speed) / duration;
    }
  }

  /**
   * Zオーダー変更要求を設定する
   * @param zOrder
   */
  private _requestZOrder(zOrder: number) {
    this._zOrderChange = true;
    this._zOrder = zOrder;
  }

  /**
   * 設定処理
   * @param params
   */
  private _processSettings(params: number[]) {
    switch (params[0]) {
      case EEffectSettings.Range:
        this._range = params[1];
        break;
    }
  }

  /**
   * 設定速度に合わせ間隔を修正する
   * @param startFrame
   * @param endFrame
   * @returns
   */
  private _correctDuration(startFrame: number, endFrame: number) {
    return (
      Math.floor(endFrame / this._speed) - Math.floor(startFrame / this._speed)
    );
  }

  /**
   * 現在のコマンド
   * @returns
   */
  private _currentCommand() {
    return this._effect.list[this._index];
  }
}

/**
 * アニメーションを管理するクラス
 * 実行したいアニメーションはここに追加する
 */
export class GameAnimations {
  /**
   * スプライトアニメーション
   * 作成されたアニメーションオブジェクト
   */
  private _animations: GameAnimation[];
  /**
   * アニメーションキュー
   * 描画待ちアニメーション
   */
  private _materialQueue: GameAnimation[];

  /**
   * コンストラクタ
   */
  constructor() {
    this._animations = [];
    this._materialQueue = [];
  }

  /**
   * アニメーション実行中か
   */
  get running() {
    return this._animations.some((animation) => !animation.end());
  }

  /**
   * 設定している時間内に実行しているアニメーションがあるか
   */
  get runningSettingTime() {
    return this._animations.some((animation) => !animation.endSettingTime());
  }

  /**
   * 描画待ちアニメーションを取り出す
   * @returns
   */
  retrieveMaterial() {
    return this._materialQueue.splice(0);
  }

  /**
   * アニメーションを追加する
   * @param id
   * @param targets
   * @param speed
   */
  push(id: number, targets: GameMaterial[], speed = 1) {
    const animation = this._createSpriteAnimation(id, targets, speed);
    this._materialQueue.push(animation);
    return animation;
  }

  /**
   * アニメーションを作成する
   * 終了しているオブジェクトがあれば使いまわす
   * 削除はしない
   * @param id
   * @param targets
   * @param speed
   * @returns
   */
  private _createSpriteAnimation(
    id: number,
    targets: GameMaterial[],
    speed = 1
  ) {
    const effect = animations[id];
    const index = this._findEmptyAnimationIndex();
    if (index < 0) {
      const animation = new GameAnimation(effect, targets, speed);
      this._animations.push(animation);
      return animation;
    } else {
      this._animations[index].setup(effect, targets, speed);
      return this._animations[index];
    }
  }

  /**
   * 空きオブジェクトのインデックスを探す
   * @returns
   */
  private _findEmptyAnimationIndex() {
    return this._animations.findIndex((anime) => anime.end());
  }

  /**
   * 更新
   */
  update() {
    this._updateAnimations();
  }

  /**
   * アニメーションの更新
   */
  private _updateAnimations() {
    for (const anime of this._animations) {
      anime.update();
    }
  }
}
