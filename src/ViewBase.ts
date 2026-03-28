import { Graphics } from './Graphics';
import { GameAnimation } from './GameAnimation';
import { GameMaterial } from './GameMaterial';
import { EffectTarget, SpriteEffect } from './SpriteEffect';
import { SpriteWindowset } from './ViewWindow';
import { gameScreen, gameAnimations, gameMenus } from './DataStore';
import {
  SpriteColor,
  SpriteImage,
  SpritePicture,
  SpriteText,
} from './SpritePlane';
import { EPictureType } from './DataTypes';

/**
 * 表示クラスベース
 */
export abstract class ViewBase {
  /**
   * ウィンドウスプライト
   */
  private _window: SpriteWindowset = SpriteWindowset.getInstance();
  /**
   * アニメーションスプライト
   */
  private _effects: SpriteEffect[] = [];
  /**
   * ピクチャスプライト
   */
  private _pictures: SpritePicture[] = new Array<SpritePicture>(20);

  /**
   * コンストラクタ
   */
  constructor() {}

  /**
   * ウィンドウスプライトを取得
   */
  get window() {
    return this._window;
  }

  /**
   * 更新
   */
  update() {
    Graphics.processEffect();
    this._updateFade();
    this._updatePictures();
    this._window.update();
    this._updateAnimations();
  }

  /**
   * フェードの更新
   */
  private _updateFade() {
    if (gameScreen.sceneFadeTarget) {
      Graphics.setSceneFadeValue(gameScreen.fadeValue);
    } else {
      Graphics.setFadeValue(gameScreen.fadeValue);
    }
    Graphics.applyColorFilter();
    Graphics.applySceneColorFilter();
  }

  /**
   * ピクチャの更新
   */
  private _updatePictures() {
    for (let i = 1; i < gameScreen.pictures.length; i++) {
      const object = gameScreen.pictures[i];
      const index = i - 1;
      if (object && this._pictures[index]?.picture !== object) {
        this._pictures[index]?.remove();
        switch (object.type) {
          case EPictureType.Text:
            this._pictures[index] = new SpriteText(object);
            break;
          case EPictureType.Image:
            this._pictures[index] = new SpriteImage(object);
            break;
          case EPictureType.Color:
            this._pictures[index] = new SpriteColor(object);
            break;
          default:
            delete this._pictures[index];
            break;
        }
      }
    }
    for (const picture of this._pictures) {
      picture?.update();
    }
  }

  /**
   * アニメーションの更新
   */
  private _updateAnimations() {
    for (const animation of gameAnimations.retrieveMaterial()) {
      this._createEffect(animation);
    }
    for (const effect of this._effects) {
      effect.update();
    }
  }

  /**
   * エフェクトを作成する
   * @param animation
   */
  private _createEffect(animation: GameAnimation) {
    const effectTargets = this._findEffectTargets(animation.targets);
    const index = this._findEmptyEffectIndex();
    if (index < 0) {
      // push
      this._effects.push(new SpriteEffect(animation, effectTargets));
    } else {
      // assign
      this._effects[index].setup(animation, effectTargets);
    }
  }

  /**
   * 空きエフェクトインデックスを取得する
   * @returns
   */
  private _findEmptyEffectIndex() {
    return this._effects.findIndex((effect) => !effect.playing);
  }

  /**
   * エフェクト対象を探す
   * @param targets
   * @returns
   */
  private _findEffectTargets(targets: GameMaterial[]) {
    const effectTargets: EffectTarget[] = [];
    for (const target of targets) {
      const sprite =
        this._findTargetSprite(target) ??
        this._pictures.find((picture) => picture?.picture === target);
      if (sprite) {
        effectTargets.push(sprite);
        continue;
      }
    }

    if (this._includesScene(targets) || this._includesWindow(targets)) {
      // シーンかウィンドウが対象の場合はシーンスプライトを入れる
      effectTargets.push(Graphics.sceneSprite);
    }
    return effectTargets;
  }

  /**
   * 対象のスプライトを探す
   * @param target
   */
  protected _findTargetSprite(target: GameMaterial): undefined | EffectTarget;
  protected _findTargetSprite(): undefined | EffectTarget {
    return;
  }

  /**
   * シーンが含まれているか
   * @returns
   */
  private _includesScene(targets: GameMaterial[]) {
    return targets.includes(gameScreen);
  }

  /**
   * ウィンドウが含まれているか
   * @returns
   */
  private _includesWindow(targets: GameMaterial[]) {
    return targets.includes(gameMenus.windows);
  }

  /**
   * 描画オブジェクトを作成
   * 再設定するので再作成前に削除する必要はない
   */
  abstract create(): void;

  /**
   * スプライト削除
   */
  remove() {
    for (const effect of this._effects) {
      effect.remove();
    }
    for (const picture of this._pictures) {
      picture?.remove();
    }
    Graphics.sceneSprite.removeAllFilter();
  }
}
