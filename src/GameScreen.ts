import { gameAnimations } from './DataStore';
import { EShakeType } from './DataTypes';
import { GameAnimation } from './GameAnimation';
import { GameMaterial } from './GameMaterial';
import { EAnchorType, GamePicture } from './GamePicture';

const enum EFadeTarget {
  WholeContainer,
  SceneContainer,
}

/**
 * 画面操作のクラス
 */
export class GameScreen extends GameMaterial {
  /**
   * フェード値 0～255
   */
  private _fadeValue: number = 255;
  /**
   * 残りフェードアウト時間
   */
  private _fadeOutDuration: number = 0;
  /**
   * 残りフェードイン時間
   */
  private _fadeInDuration: number = 0;
  /**
   * フェードインフェードアウトの対象コンテナ
   */
  private _fadeTarget: EFadeTarget = EFadeTarget.WholeContainer;
  /**
   * フェードアウト終了時コールバック
   */
  private _endFadeOutFn: (() => void) | null = null;
  /**
   * フェードイン終了時コールバック
   */
  private _endFadeInFn: (() => void) | null = null;
  /**
   * エフェクト終了時コールバック
   */
  private _endEffectFn: (() => void) | null = null;
  /**
   * エフェクトオブジェクト
   */
  private _effectObject: GameAnimation | null = null;
  /**
   * シェイクのタイプ
   */
  private _shakeType: EShakeType = EShakeType.Normal;
  /**
   * シェイクの横の強さ
   */
  private _shakeStrengthX: number = 0;
  /**
   * シェイクの縦の強さ
   */
  private _shakeStrengthY: number = 0;
  /**
   * シェイクの速さ
   */
  private _shakeSpeed: number = 0;
  /**
   * シェイク時間
   */
  private _shakeDuration: number = 0;
  /**
   * シェイク中の左右の方向
   */
  private _shakeDirectionX: number = 1;
  /**
   * シェイク中の上下の方向
   */
  private _shakeDirectionY: number = 1;
  /**
   * シェイク中の横オフセット
   */
  private _shakeX: number = 0;
  /**
   * シェイク中の縦オフセット
   */
  private _shakeY: number = 0;
  /**
   * ピクチャー
   */
  private _pictures: GamePicture[] = [];

  /**
   * 横座標のオフセット
   */
  get offsetX() {
    return this._shakeX;
  }

  /**
   * 縦座標のオフセット
   */
  get offsetY() {
    return this._shakeY;
  }

  /**
   * シェイクのタイプ
   */
  get shakeType() {
    return this._shakeType;
  }

  /**
   * フェードをクリアする
   */
  clearFade() {
    this.setFadeValue(255);
  }

  /**
   * フェードを最大にする
   */
  setFadeMax() {
    this.setFadeValue(0);
  }

  /**
   * フェード値を設定する
   * @param value
   */
  setFadeValue(value: number) {
    this._fadeValue = value;
  }

  /**
   * フェード値を取得
   */
  get fadeValue() {
    return this._fadeValue;
  }

  /**
   * フェード対象がシーンコンテナか否か
   */
  get sceneFadeTarget() {
    return this._fadeTarget === EFadeTarget.SceneContainer;
  }

  /**
   * 残りフェードアウト時間を設定
   * @param value
   * @param fn
   * @returns
   */
  setFadeOutDuration(value: number, sceneTarget: boolean, fn?: () => void) {
    this._fadeOutDuration = value;
    this._fadeInDuration = 0;
    this._fadeTarget = sceneTarget
      ? EFadeTarget.SceneContainer
      : EFadeTarget.WholeContainer;
    if (value === 0) {
      this._fadeValue = 0;
      fn?.();
      return;
    }
    this._endFadeOutFn = fn ?? null;
  }

  /**
   * 残りフェードアウト時間を取得
   */
  get fadeOutDuration() {
    return this._fadeOutDuration;
  }

  /**
   * 残りフェードイン時間を設定
   * @param value
   * @param fn
   * @returns
   */
  setFadeInDuration(value: number, sceneTarget: boolean, fn?: () => void) {
    this._fadeOutDuration = 0;
    this._fadeInDuration = value;
    this._fadeTarget = sceneTarget
      ? EFadeTarget.SceneContainer
      : EFadeTarget.WholeContainer;
    if (value === 0) {
      this._fadeValue = 255;
      fn?.();
      return;
    }
    this._endFadeInFn = fn ?? null;
  }

  /**
   * 残りフェードイン時間を取得
   */
  get fadeInDuration() {
    return this._fadeInDuration;
  }

  /**
   * ピクチャーの取得
   */
  get pictures() {
    return this._pictures;
  }

  /**
   * シェイクの開始
   * @param type
   * @param x
   * @param y
   * @param speed
   * @param frame
   */
  startShake(type: number, x: number, y: number, speed: number, frame: number) {
    this._shakeType = type;
    this._shakeStrengthX = x;
    this._shakeStrengthY = y;
    this._shakeSpeed = speed;
    this._shakeDuration = frame;
  }

  /**
   * エフェクトを開始する
   * @param id
   * @param fn
   */
  startEffect(id: number, fn?: () => void) {
    if (this._effectObject) {
      this.endEffect();
    }
    this._effectObject = gameAnimations.push(id, [this]);
    this._endEffectFn = fn ?? null;
  }

  /**
   * エフェクトを終了する
   */
  endEffect() {
    this._endEffectFn?.();
    this._endEffectFn = null;
    this._effectObject = null;
  }

  /**
   * 更新
   */
  update() {
    this._updateFadeOut();
    this._updateFadeIn();
    this._updateShake();
    this._updateEffect();
    this._updatePicture();
  }

  /**
   * フェードアウトの更新
   * @returns
   */
  private _updateFadeOut() {
    if (this._fadeOutDuration <= 0) {
      return;
    }
    const duration = this._fadeOutDuration;
    this._fadeValue = (this._fadeValue * (duration - 1)) / duration;
    this._fadeOutDuration--;
    if (this._fadeOutDuration === 0) {
      this._endFadeOutFn?.();
      this._endFadeOutFn = null;
    }
  }

  /**
   * フェードインの更新
   * @returns
   */
  private _updateFadeIn() {
    if (this._fadeInDuration <= 0) {
      return;
    }
    const duration = this._fadeInDuration;
    this._fadeValue = (this._fadeValue * (duration - 1) + 255) / duration;
    this._fadeInDuration--;
    if (this._fadeInDuration === 0) {
      this._endFadeInFn?.();
      this._endFadeOutFn = null;
    }
  }

  /**
   * シェイクの更新
   * @returns
   */
  private _updateShake() {
    if (this._shakeDuration <= 0 && this._shakeX === 0 && this._shakeY === 0) {
      return;
    }
    this._updateShakeX();
    this._updateShakeY();

    this._shakeDuration--;
  }

  /**
   * シェイクの更新横座標
   */
  private _updateShakeX() {
    const x = this._shakeDirectionX * this._shakeSpeed;
    if (this._shakeDuration <= 1 && this._shakeX * (x + this._shakeX) < 0) {
      this._shakeX = 0;
    } else {
      this._shakeX += x;
    }
    if (this._shakeX >= this._shakeStrengthX) {
      this._shakeDirectionX = -1;
    }
    if (this._shakeX <= -this._shakeStrengthX) {
      this._shakeDirectionX = 1;
    }
  }

  /**
   * シェイクの更新縦座標
   */
  private _updateShakeY() {
    const y = this._shakeDirectionY * this._shakeSpeed;
    if (this._shakeDuration <= 1 && this._shakeY * (y + this._shakeY) < 0) {
      this._shakeY = 0;
    } else {
      this._shakeY += y;
    }
    if (this._shakeY >= this._shakeStrengthY) {
      this._shakeDirectionY = -1;
    }
    if (this._shakeY <= -this._shakeStrengthY) {
      this._shakeDirectionY = 1;
    }
  }

  /**
   * エフェクトの更新
   */
  private _updateEffect() {
    if (this._effectObject === null) {
      return;
    }
    if (this._effectObject.end()) {
      this.endEffect();
    }
  }

  /**
   * ピクチャの更新
   */
  private _updatePicture() {
    for (const picture of this._pictures) {
      picture?.update();
    }
  }

  /**
   * エフェクト中か
   * @returns
   */
  duringEffect() {
    return this._effectObject !== null;
  }

  /**
   * ピクチャを表示する
   * @param pictureNo
   * @param pictureId
   * @param materialName
   * @param anchorType
   * @param x
   * @param y
   */
  showPicture(
    pictureNo: number,
    pictureId: number,
    materialName: string,
    anchorType: EAnchorType,
    x: number,
    y: number
  ) {
    const picture = new GamePicture();
    picture.show(pictureId, materialName, anchorType, x, y);
    this._pictures[pictureNo] = picture;
  }

  /**
   * ピクチャを移動する
   * @param pictureNo
   * @param x
   * @param y
   * @param moveType
   * @param duration
   */
  movePicture(
    pictureNo: number,
    x: number,
    y: number,
    moveType: number,
    duration: number
  ) {
    this._pictures[pictureNo]?.move(x, y, moveType, duration);
  }

  /**
   * ピクチャを削除する
   * @param pictureNo
   */
  erasePicture(pictureNo: number) {
    this._pictures[pictureNo]?.remove();
  }

  /**
   * ピクチャを取得する
   * @param pictureNo
   * @returns
   */
  findPicture(pictureNo: number) {
    return this._pictures[pictureNo];
  }

  /**
   * ピクチャをクリアする
   */
  clearPictures() {
    this._pictures = [];
  }
}
