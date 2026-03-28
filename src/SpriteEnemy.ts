import * as PIXI from 'pixi.js';
import { GameEnemy } from './GameEnemy';
import { GameMaterial } from './GameMaterial';
import { SpriteTexture } from './SpritePlane';

/**
 * 敵スプライト
 */
export class SpriteEnemy extends SpriteTexture {
  /**
   * 敵の名前
   */
  private _enemyName: string = '';
  /**
   * 選択効果カウント
   */
  private _selectEffectCount: number = 0;

  /**
   * コンストラクタ
   * @param _enemy 敵オブジェクト
   */
  constructor(private _enemy: GameEnemy) {
    super();
  }

  /**
   * 退場済みか
   */
  get leave() {
    return !this._enemy.live;
  }

  /**
   * 敵画像のベースパス
   */
  protected get _basePath() {
    return './assets/enemies/';
  }

  /**
   * ベースZ位置
   */
  protected get _baseZIndex() {
    return 2100;
  }

  /**
   * 指定の素材が敵オブジェクトと一致しているか
   * @param material
   * @returns
   */
  equalMaterial(material: GameMaterial): boolean {
    return this._enemy === material;
  }

  /**
   * 敵スプライトの再利用
   * @param enemy
   */
  recycle(enemy: GameEnemy) {
    this._clearEffect();
    this._enemyName = '';
    this._enemy = enemy;
    this._selectEffectCount = 0;
  }

  /**
   * 更新
   */
  update() {
    super.update();
    this._updateLeaving();
    this._updateRevival();
    this._updateSelectEffect();
    this._updatePos();
    this._updateOffset();
  }

  /**
   * テクスチャの更新
   */
  protected _updateTexture(): void {
    if (this._enemyName == this._enemy.enemyName) {
      return;
    }
    // setVisibleいらん気がする
    const name = this._enemy.enemyName;
    if (name) {
      this._loadTexture(this._getUrl(name), () => {
        this.setVisible(true);
      });
    } else {
      this._setEmptyImage();
      this.setVisible(true);
    }
    this.alpha = 1;
    this.setZIndex(this._baseZIndex);
    this._enemyName = name;
  }

  /**
   * 退場の更新
   * 非表示にする
   */
  private _updateLeaving() {
    if (!this._enemy.dispOff) {
      return;
    }
    this._enemy.clearDispOff();
    if (!this.visible) {
      // すでに非表示ならなにもしない
      return;
    }
    this.setVisible(false);
  }

  /**
   * 復活の更新
   */
  private _updateRevival() {
    if (!this.visible && this._enemy.live) {
      this.setVisible(true);
    }
  }

  /**
   * 選択効果の更新
   * ★カーソルの点滅と連動させる
   */
  protected _updateSelectEffect() {
    if (!this._enemy.select) {
      this._selectEffectCount = 0;
      this._removeSelectFilter();
      return;
    }
    this._selectEffectCount += 1;
    this._selectEffectCount %= 30;
    if (this._selectEffectCount < 15) {
      this._setSelectFilter();
    } else {
      this._removeSelectFilter();
    }
  }

  /**
   * 位置の更新
   */
  protected _updatePos() {
    const enemy = this._enemy;
    this.setPos(
      enemy.screenX + enemy.srcWidth / 2,
      enemy.screenY - enemy.srcHeight / 2
    );
    this.setSize(enemy.srcWidth, enemy.srcHeight);
  }

  /**
   * 敵画像のテクスチャ範囲を取得する
   */
  protected _getTextureFrame() {
    const enemy = this._enemy;
    return new PIXI.Rectangle(
      enemy.srcX,
      enemy.srcY,
      enemy.srcWidth,
      enemy.srcHeight
    );
  }

  /**
   * 敵画像の基点を設定する
   */
  protected override _setBaseAnchor() {
    // 中央
    this._setAnchor(0.5, 0.5);
  }

  /**
   * 効果のオフセットを更新する
   */
  private _updateOffset() {
    super._applyOffsetMove();
    super._applyOffsetScale();
    super._applyOffsetZOrder();
    super._applyAddAngle();
  }
}
