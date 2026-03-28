import { Graphics as GameGraphics } from './Graphics';
import { GameMaterial } from './GameMaterial';
import { Rect } from './GameUtils';
import { SpriteBase, SpriteObject, SpriteTextureBase } from './SpriteBase';
import { GamePicture } from './GamePicture';
import {
  Rectangle,
  TextStyleFontWeight,
  Text as PixiText,
  Graphics,
  BaseTexture,
} from 'pixi.js';

/**
 * 固定スプライト
 */
export class SpriteFixed extends SpriteTextureBase {
  /**
   * マスク矩形
   */
  private _maskFrame: Rect | null = null;

  /**
   * コンストラクタ
   * @param _picture ピクチャー情報
   * @param texture
   */
  constructor(
    private _picture: GamePicture,
    texture: BaseTexture
  ) {
    super();
    this._setAnchor(this._picture.anchorX, this._picture.anchorY);
    const option = this._picture.imageOption;
    const scale = option.scale || 1;
    const x = option.x * scale;
    const y = option.y * scale;
    const width = (option.width || texture.width) * scale;
    const height = (option.height || texture.height) * scale;
    const frame = new Rectangle(x, y, width, height);
    super._setImage(texture, frame);
  }

  /**
   * 更新
   */
  override update() {
    super.update();
    this._updateFrame();
    this._updatePos();
    super._applyOffsetMove();
  }

  /**
   * フレームのマスクを更新する
   */
  private _updateFrame() {
    const frame = this._picture.maskFrame;
    if (this._maskFrame !== frame) {
      if (frame) {
        this._setMaskFrame(frame);
      } else {
        this._clearMaskFrame();
      }
      this._maskFrame = frame;
    }
  }

  /**
   * 位置を更新する
   */
  private _updatePos() {
    this.setPos(this._picture.x, this._picture.y);
  }
}

/**
 * ウィンドウシート
 */
export class SpriteWindowSheet extends SpriteFixed {
  /**
   * グラフィックに追加
   */
  protected override _addGraphic() {
    GameGraphics.addWindowChild(this._sprite);
  }
}

/**
 * テクスチャスプライト
 */
export abstract class SpriteTexture extends SpriteTextureBase {
  /**
   * 読み込むファイルのベースパス
   */
  protected abstract get _basePath(): string;

  /**
   * urlを取得
   * @param name
   */
  protected _getUrl(name: string) {
    return this._basePath + name;
  }

  equalMaterial(material: GameMaterial): boolean;
  equalMaterial() {
    return false;
  }

  /**
   * 更新
   */
  override update() {
    super.update();
    this._updateTexture();
  }

  /**
   * テクスチャの更新
   */
  protected abstract _updateTexture(): void;
}

/**
 * 一枚絵のスプライト
 */
abstract class SpritePlane extends SpriteTexture {
  /**
   * ピクチャーファイル名
   */
  private _pictureName: string = '';

  /**
   * コンストラクタ
   * @param _picture ピクチャー情報
   */
  constructor(private _picture: GamePicture) {
    super();
    this.setZIndex(this._baseZIndex);
  }

  /**
   * 更新
   */
  update() {
    super.update();
    this.x = this._picture.x;
    this.y = this._picture.y;
  }

  /**
   * テクスチャの更新
   */
  protected _updateTexture() {
    // グラフィックが変化したかどうか
    if (this._pictureName == this._picture.materialName) {
      return;
    }
    if (this._picture.materialName) {
      this._loadTexture(this._getUrl(this._picture.materialName));
    } else {
      this._setEmptyImage();
    }
    this._pictureName = this._picture.materialName;
  }
}

/**
 * 戦闘背景スプライト
 */
export class SpriteBattleBack extends SpritePlane {
  /**
   * 戦闘背景のベースパス
   */
  protected get _basePath() {
    return './assets/background/';
  }

  /**
   * ベースZ位置
   */
  protected override get _baseZIndex() {
    return 2000;
  }
}

/**
 * タイトル背景スプライト
 */
export class SpriteTitleBack extends SpritePlane {
  /**
   * タイトル背景のベースパス
   */
  protected get _basePath() {
    return './assets/background/';
  }

  /**
   * ベースZ位置
   */
  protected get _baseZIndex() {
    return 0;
  }
}

/**
 * テキストスプライト
 */
export class SpriteText extends SpriteBase {
  /**
   * ベース横幅
   */
  private _baseWidth: number = 0;
  /**
   * ベース縦幅
   */
  private _baseHeight: number = 0;
  /**
   * フォントウェイト名の配列
   */
  private static _weightName: TextStyleFontWeight[] = [
    'normal',
    'bold',
    'bolder',
    'lighter',
    '100',
    '200',
    '300',
    '400',
    '500',
    '600',
    '700',
    '800',
    '900',
  ];

  /**
   * コンストラクタ
   * @param _picture ピクチャー情報
   * @param texture
   */
  constructor(private _picture: GamePicture) {
    super();
    const sprite = this._sprite;
    sprite.anchor.set(this._picture.anchorX, this._picture.anchorY);
    const option = this._picture.fontOption;
    sprite.text = this._picture.materialName;
    sprite.style = {
      fontFamily: this._picture.familyName,
      fontSize: option.fontSize,
      fontWeight: SpriteText._weightName[option.fontWeight],
      fill: option.fill,
      strokeThickness: option.strokeThickness,
      stroke: option.stroke,
    };
    this._baseWidth = this._sprite.width;
    this._baseHeight = this._sprite.height;
  }

  get picture() {
    return this._picture;
  }

  protected override get _baseZIndex() {
    return 3000;
  }

  /**
   * スプライトを取得する
   */
  protected override get _sprite(): PixiText {
    return this._object as PixiText;
  }

  /**
   * スプライトオブジェクトを作成する
   * @returns
   */
  protected override _makeObject(): SpriteObject {
    return new PixiText();
  }

  /**
   * 更新
   */
  override update() {
    super.update();
    this._updateText();
    if (!this.visible) {
      return;
    }
    this._updatePos();
    this._updateOffset();
  }

  /**
   * 効果のオフセットを更新する
   * @returns
   */
  private _updateOffset() {
    super._applyOffsetMove();
    super._applyOffsetScale();
  }

  /**
   * テキストを更新する
   * @returns
   */
  private _updateText() {
    if (!this._picture.valid) {
      this.setVisible(false);
      return;
    }
    if (this._sprite.text !== this._picture.materialName) {
      this._sprite.text = this._picture.materialName;
      this._baseWidth = this._sprite.width;
      this._baseHeight = this._sprite.height;
    }
    this.setVisible(true);
  }

  /**
   * 位置を更新する
   */
  private _updatePos() {
    this.setPos(this._picture.x, this._picture.y);
    this.setZIndex(this._baseZIndex);
    this._sprite.width = this._baseWidth;
    this._sprite.height = this._baseHeight;
  }
}

/**
 * 画像スプライト
 */
export class SpriteImage extends SpriteTexture {
  /**
   * ベース横幅
   */
  private _baseWidth: number = 0;
  /**
   * ベース縦幅
   */
  private _baseHeight: number = 0;
  /**
   * 素材名
   */
  private _materialName: string = '';

  /**
   * コンストラクタ
   * @param _picture ピクチャー情報
   * @param texture
   */
  constructor(private _picture: GamePicture) {
    super();
    this._setAnchor(this._picture.anchorX, this._picture.anchorY);
  }

  get picture() {
    return this._picture;
  }

  /**
   * ベースパスを取得する
   */
  protected get _basePath(): string {
    return './assets/';
  }

  protected override get _baseZIndex() {
    return 3000;
  }

  /**
   * テクスチャ範囲を取得する
   * @param texture
   */
  protected override _getTextureFrame(texture: BaseTexture) {
    if (!this._picture.materialName) {
      return super._getTextureFrame(texture);
    }
    const option = this._picture.imageOption;
    const scale = option.scale || 1;
    const x = option.x * scale;
    const y = option.y * scale;
    const width = (option.width || texture.width) * scale;
    const height = (option.height || texture.height) * scale;
    this._baseWidth = width;
    this._baseHeight = height;
    return new Rectangle(x, y, width, height);
  }

  /**
   * 更新
   */
  override update() {
    super.update();
    this._updatePos();
    this._updateOffset();
  }

  /**
   * 効果のオフセットを更新する
   */
  private _updateOffset() {
    super._applyOffsetMove();
    super._applyOffsetScale();
  }

  /**
   * テクスチャの更新
   */
  protected override _updateTexture(): void {
    if (!this._picture.valid) {
      this.setVisible(false);
      return;
    }
    // グラフィックが変化したかどうか
    if (this._materialName != this._picture.materialName) {
      if (this._picture.materialName) {
        this._loadTexture(
          this._getUrl(
            `${this._picture.familyName}/${this._picture.materialName}`
          )
        );
      } else {
        this._setEmptyImage();
      }
      this._materialName = this._picture.materialName;
    }
    this.setVisible(true);
  }

  /**
   * 位置を更新する
   */
  private _updatePos() {
    this.setPos(this._picture.x, this._picture.y);
    this.setSize(this._baseWidth, this._baseHeight);
    this.setZIndex(this._baseZIndex);
  }
}

/**
 * 色スプライト
 */
export class SpriteColor extends SpriteBase {
  /**
   * 素材名
   */
  private _materialName: string = '';

  constructor(private _picture: GamePicture) {
    super();
  }

  get picture() {
    return this._picture;
  }

  /**
   * スプライトを取得する
   */
  protected get _sprite(): Graphics {
    return this._object as Graphics;
  }

  /**
   * コンテナを作成する
   * @returns
   */
  protected override _makeObject(): SpriteObject {
    return new Graphics();
  }

  protected override get _baseZIndex() {
    return 3000;
  }

  private _count: number = 0;
  /**
   * 更新
   */
  override update() {
    super.update();
    this._updateColor();
    if (!this.visible) {
      return;
    }
    this._updatePos();
    this._updateOffset();
  }

  /**
   * 効果のオフセットを更新する
   * @returns
   */
  private _updateOffset() {
    super._applyOffsetMove();
    super._applyOffsetScale();
  }

  /**
   * 矩形を色で埋める
   * @param color
   * @param x
   * @param y
   * @param width
   * @param height
   */
  private _updateColor() {
    if (!this._picture.valid) {
      this.setVisible(false);
      return;
    }

    // 色が変化したかどうか
    if (this._materialName !== this._picture.materialName) {
      const option = this._picture.colorOption;
      const color = parseInt(this._picture.materialName, option.decimal);
      const rgbTemp = isNaN(color) ? 0 : color;
      let alpha = 1.0;
      if (rgbTemp > 0xffffff) {
        alpha = (rgbTemp >>> 24) / 255;
      }
      const rgb = rgbTemp & 0xffffff;
      const sprite = this._sprite;
      sprite.clear();
      sprite.beginFill(rgb, alpha);
      sprite.drawRect(0, 0, option.width, option.height);
      sprite.endFill();
    }

    this.setVisible(true);
  }

  /**
   * 位置を更新する
   */
  private _updatePos() {
    this.setPos(this._picture.x, this._picture.y);
    const option = this._picture.colorOption;
    this.setSize(option.width, option.height);
    this.setZIndex(this._baseZIndex);
  }
}

export type SpritePicture = SpriteImage | SpriteText | SpriteColor;
