import { Graphics } from './Graphics';
import { EEffectVisible, EEffectRange } from './DataTypes';
import { GameAnimation } from './GameAnimation';
import { SpriteBase } from './SpriteBase';
import { SpriteTexture } from './SpritePlane';

export type EffectTarget = SpriteBase;
/**
 * 効果スプライト
 */
export class SpriteEffect extends SpriteTexture {
  /**
   * 再生中か
   */
  private _playing: boolean = true;

  /**
   * コンストラクタ
   * @param _animation アニメーション
   * @param _targets 対象
   */
  constructor(
    private _animation: GameAnimation,
    private _targets: EffectTarget[]
  ) {
    super();
  }

  /**
   * アニメーション画像のベースパス
   */
  protected get _basePath() {
    return './assets/animation/';
  }

  /**
   * 再生中かどうか
   */
  get playing() {
    return this._playing;
  }

  /**
   * 効果を設定する
   * @param targets
   * @param effect
   */
  setup(animation: GameAnimation, targets: EffectTarget[]) {
    this._animation = animation;
    this._targets = targets;
    this._playing = true;
  }

  /**
   * 更新
   * 効果実行順序
   * 1.開始
   * 2.次フレーム
   * 3.主スプライトupdate
   *   エフェクトupdate ＞ スプライトupdate
   * なのでオフセット項目の適用は
   * ・開始の後
   * ・スプライトupdateの後
   * となる
   */
  update() {
    super.update();
    this._process();
  }

  /**
   * 画像の基点を設定する
   */
  protected _setBaseAnchor() {
    // 原点左下
    this._setAnchor(0, 1);
  }

  /**
   * テクスチャの更新
   */
  protected _updateTexture(): void {
    //
  }

  /**
   * 処理を実行する
   */
  private _process() {
    if (!this.playing) {
      return;
    }
    this._processFlash();
    this._processOpacity();
    this._processBlur();
    this._processNoise();
    this._processVisible();
    this._processMove();
    this._processScale();
    this._processRotation();
    this._processZOrder();
    this._checkEnd();
  }

  /**
   * フラッシュ処理
   * @returns
   */
  private _processFlash() {
    if (!this._animation.flashTiming()) {
      return;
    }
    const flash = this._animation.retrieveFlash();
    const [r, g, b, a] = flash.color;
    this._startEffect((target) => {
      target.startFlash(flash.duration, r, g, b, a);
    });
  }

  /**
   * 不透明度処理
   * @returns
   */
  private _processOpacity() {
    if (!this._animation.opacityTiming()) {
      return;
    }
    const opacity = this._animation.retrieveOpacity();
    this._startEffect((target) => {
      target.startOpacity(opacity.duration, opacity.opacity);
    });
  }

  /**
   * ブラー処理
   * @returns
   */
  private _processBlur() {
    if (!this._animation.blurTiming()) {
      return;
    }
    const blur = this._animation.retrieveBlur();
    this._startEffect((target) => {
      target.startBlur(blur.duration, blur.x, blur.y);
    });
  }

  /**
   * ノイズ処理
   * @returns
   */
  private _processNoise() {
    if (!this._animation.noiseTiming()) {
      return;
    }
    const noise = this._animation.retrieveNoise();
    this._startEffect((target) => {
      target.startNoise(noise.duration, noise.strength);
    });
  }

  /**
   * 表示処理
   * @returns
   */
  private _processVisible() {
    if (!this._animation.visibleTiming()) {
      return;
    }
    const visible = this._animation.retrieveVisible();
    const visibleFn = (target: EffectTarget) => {
      switch (visible) {
        case EEffectVisible.On:
          return true;
        case EEffectVisible.Off:
          return false;
        case EEffectVisible.Mirror:
          return !target.visible;
        default:
          return target.visible;
      }
    };
    this._startEffect((target) => {
      target.setVisible(visibleFn(target));
    });
  }

  /**
   * 移動処理
   * @returns
   */
  private _processMove() {
    if (!this._animation.moveTiming()) {
      return;
    }
    const move = this._animation.retrieveMove();
    this._startEffect((target) => {
      target.startMove(move.duration, move.moveX, move.moveY);
    });
  }

  /**
   * 拡大率処理
   * @returns
   */
  private _processScale() {
    if (!this._animation.scaleTiming()) {
      return;
    }
    const scale = this._animation.retrieveScale();
    this._startEffect((target) => {
      target.startScale(scale.duration, scale.scaleX, scale.scaleY);
    });
  }

  /**
   * 回転処理
   * @returns
   */
  private _processRotation() {
    if (!this._animation.rotationTiming()) {
      return;
    }
    const rotation = this._animation.retrieveRotation();
    this._startEffect((target) => {
      if (rotation.reset) {
        target.setAngle(0);
        target.setAddAngle(0);
      }
      if (rotation.change) {
        target.setAddAngle(rotation.addAngle);
      }
    });
  }

  /**
   * Zオーター処理
   * @returns
   */
  private _processZOrder() {
    if (!this._animation.zOrderTiming()) {
      return;
    }
    const zOrder = this._animation.retrieveZOrder();
    this._startEffect((target) => {
      target.setOffsetZ(zOrder);
    });
  }

  /**
   * エフェクト開始
   * @param applyFn
   */
  private _startEffect(applyFn: (target: EffectTarget) => void) {
    switch (this._animation.range) {
      case EEffectRange.Scene:
        applyFn(Graphics.sceneSprite);
        break;
      case EEffectRange.Window:
        applyFn(Graphics.windowSprite);
        break;
      default:
        for (const target of this._targets) {
          applyFn(target);
        }
    }
  }

  /**
   * アニメーション終了したか確認
   */
  private _checkEnd() {
    if (this._animation.end()) {
      this._playing = false;
    }
  }
}
