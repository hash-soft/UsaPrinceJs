import {
  BlurFilter,
  Container,
  Filter,
  Graphics,
  NoiseFilter,
  Rectangle,
  Sprite,
  Texture,
  Text as PixiText,
  IDestroyOptions,
  BaseTexture,
} from 'pixi.js';
import { Graphics as GameGraphics, ColorFilter } from './Graphics';
import { Rect } from './GameUtils';
import { GameEffectTimer } from './GameAnimation';
import { GameLog } from './GameLog';

/**
 * 効果ベースクラス
 */
abstract class EffectBase {
  /**
   * タイマー
   */
  private _timer: GameEffectTimer = new GameEffectTimer();
  /**
   * コンストラクタ
   * @param _sprite 効果をかけるスプライト
   */
  constructor(private _sprite: SpriteBase) {}

  get sprite() {
    return this._sprite;
  }

  /**
   * 効果中の期間を取得
   */
  get duration() {
    return this._timer.duration;
  }

  /**
   * 効果中かを取得
   */
  get during() {
    return this._timer.during;
  }

  /**
   * 効果時間を設定する
   * @param duration
   */
  protected _setDuration(duration: number) {
    this._timer.setDuration(duration);
  }

  /**
   * クリア
   */
  clear() {
    this._timer.clear();
  }

  /**
   * 更新処理
   */
  update() {
    if (this.during) {
      this._checkElapseDuration();
    }
    this._decDuration();
  }

  /**
   * 効果時間を減算する
   */
  private _decDuration() {
    if (this._timer.decDuration()) {
      this._endDuration();
    }
  }

  /**
   * 時間経過中の確認処理
   */
  protected _checkElapseDuration() {
    //
  }

  /**
   * 効果時間終了
   */
  protected _endDuration() {
    //
  }

  /**
   * 次の値を計算する
   * @param current
   * @param point
   * @returns
   */
  protected _calcNext(current: number, point: number) {
    const duration = this._timer.duration;
    return (current * (duration - 1) + point) / duration;
  }
}

abstract class EffectFilterBase extends EffectBase {
  /**
   * 効果時間終了
   */
  protected override _endDuration() {
    this._clearFilter();
  }

  /**
   * フィルターを設定する
   */
  protected _setFilter() {
    this.sprite.setFilter(this._filter);
  }

  /**
   * フィルターを除去する
   */
  protected _clearFilter() {
    this.sprite.removeFilter(this._filter);
  }

  /**
   * クリア
   */
  override clear() {
    super.clear();
    this._clearFilter();
  }

  /**
   * 使用フィルターを取得する
   */
  protected abstract get _filter(): Filter;
}

/**
 * フラッシュ効果クラス
 */
class EffectFlash extends EffectFilterBase {
  /**
   * コンストラクタ
   * @param sprite
   * @param _colorFilter カラーフィルター
   */
  constructor(
    sprite: SpriteBase,
    private _colorFilter: ColorFilter = new ColorFilter()
  ) {
    super(sprite);
  }

  /**
   * 時間経過中の確認処理
   */
  protected override _checkElapseDuration() {
    super._checkElapseDuration();
    const duration = this.duration;
    const a = (this._colorFilter.blendColorA * (duration - 1)) / duration;
    this._colorFilter.setBlendColorA(a);
  }

  /**
   * フラッシュ開始
   * @param duration
   * @param r
   * @param g
   * @param b
   * @param a
   */
  start(duration: number, r: number, g: number, b: number, a: number) {
    this._setDuration(duration);
    this._colorFilter.setBlendColor(r, g, b, a);
    this._setFilter();
  }

  /**
   * フィルターを設定する
   */
  protected _setFilter() {
    if (this._colorFilter.enable) {
      super._setFilter();
    }
  }

  /**
   * フィルターを除去する
   */
  protected _clearFilter() {
    this._colorFilter.setBlendColor(0, 0, 0, 0);
    if (!this._colorFilter.enable) {
      super._clearFilter();
    }
  }

  /**
   * 使用フィルターを取得する
   */
  protected get _filter() {
    return this._colorFilter.colorMatrix;
  }
}

/**
 * ノイズ効果クラス
 */
class EffectNoise extends EffectFilterBase {
  /**
   *
   * @param sprite
   * @param _noiseFilter ノイズフィルター
   */
  constructor(
    sprite: SpriteBase,
    private _noiseFilter: NoiseFilter = new NoiseFilter()
  ) {
    super(sprite);
  }

  /**
   * ノイズ開始
   * @param duration
   * @param strength
   */
  start(duration: number, strength: number) {
    this._setDuration(duration);
    this._noiseFilter.noise = strength;
    this._setFilter();
  }

  /**
   * 使用フィルターを取得する
   */
  protected get _filter() {
    return this._noiseFilter;
  }
}

/**
 * ブラー効果クラス
 */
class EffectBlur extends EffectFilterBase {
  /**
   * ブラー横最大値
   */
  private _maxX: number = 0;
  /**
   * ブラー縦最大値
   */
  private _maxY: number = 0;

  /**
   * コンストラクタ
   * @param sprite
   * @param _blurFilter ブラーフィルター
   */
  constructor(
    sprite: SpriteBase,
    private _blurFilter: BlurFilter = new BlurFilter()
  ) {
    super(sprite);
  }

  /**
   * 時間経過中の確認処理
   */
  protected override _checkElapseDuration() {
    super._checkElapseDuration();
    this._blurFilter.blurX = this._calcNext(this._blurFilter.blurX, this._maxX);
    this._blurFilter.blurY = this._calcNext(this._blurFilter.blurY, this._maxY);
  }

  /**
   * ブラー開始
   * @param duration
   * @param strength
   */
  start(duration: number, x: number, y: number) {
    this._setDuration(duration);
    this._maxX = x;
    this._maxY = y;
    if (duration === 0) {
      this._blurFilter.blurX = x;
      this._blurFilter.blurY = y;
    }

    this._setFilter();
  }

  /**
   * クリア
   */
  override clear() {
    this._maxX = 0;
    this._maxY = 0;
    super.clear();
  }

  /**
   * フィルターを除去する
   */
  protected _clearFilter() {
    if (this._maxX === 0 && this._maxY === 0) {
      super._clearFilter();
    }
  }

  /**
   * 使用フィルターを取得する
   */
  protected get _filter() {
    return this._blurFilter;
  }
}

/**
 * 移動クラス
 */
class EffectMove extends EffectBase {
  /**
   * X到達点
   */
  private _x: number = 0;
  /**
   * Y到達点
   */
  private _y: number = 0;
  /**
   * X現在
   */
  private _moveX: number = 0;
  /**
   * Y現在
   */
  private _moveY: number = 0;

  /**
   * X現在を取得する
   */
  get moveX() {
    return this._moveX;
  }

  /**
   * Y現在を取得する
   */
  get moveY() {
    return this._moveY;
  }

  /**
   * コンストラクタ
   * @param sprite
   * @param filter
   */
  constructor(sprite: SpriteBase) {
    super(sprite);
  }

  /**
   * 開始する
   * @param duration
   * @param x
   * @param y
   */
  start(duration: number, x: number, y: number) {
    this._setDuration(duration);
    this._x = x;
    this._y = y;
    if (duration === 0) {
      this._moveX = x;
      this._moveY = y;
    }
  }

  /**
   * クリア
   */
  override clear() {
    this._x = 0;
    this._y = 0;
    this._moveX = 0;
    this._moveY = 0;
    super.clear();
  }

  /**
   * 時間経過中の確認処理
   */
  protected override _checkElapseDuration() {
    super._checkElapseDuration();
    this._moveX = this._calcNext(this._moveX, this._x);
    this._moveY = this._calcNext(this._moveY, this._y);
  }
}

/**
 * 拡大率クラス
 */
class EffectScale extends EffectBase {
  /**
   * X到達点
   */
  private _x: number = 0;
  /**
   * Y到達点
   */
  private _y: number = 0;
  /**
   * X現在
   */
  private _scaleX: number = 1;
  /**
   * Y現在
   */
  private _scaleY: number = 1;

  /**
   * X現在を取得する
   */
  get scaleX() {
    return this._scaleX;
  }

  /**
   * Y現在を取得する
   */
  get scaleY() {
    return this._scaleY;
  }

  /**
   * コンストラクタ
   * @param sprite
   */
  constructor(sprite: SpriteBase) {
    super(sprite);
  }

  /**
   * 開始する
   * @param duration
   * @param x
   * @param y
   */
  start(duration: number, x: number, y: number) {
    this._setDuration(duration);
    this._x = x;
    this._y = y;
    if (duration === 0) {
      this._scaleX = x;
      this._scaleY = y;
    }
  }

  /**
   * クリア
   */
  override clear() {
    this._x = 0;
    this._y = 0;
    this._scaleX = 1;
    this._scaleY = 1;
    super.clear();
  }

  /**
   * 時間経過中の確認処理
   */
  protected override _checkElapseDuration() {
    super._checkElapseDuration();
    this._scaleX = this._calcNext(this._scaleX, this._x);
    this._scaleY = this._calcNext(this._scaleY, this._y);
  }
}

/**
 * スプライトオブジェクトの定義
 */
export type SpriteObject = Container | Graphics | Sprite | PixiText;

/**
 * スプライトのベースクラス
 */
export abstract class SpriteBase {
  /**
   * スプライトオブジェクト
   */
  protected _object: SpriteObject = this._makeObject();
  /**
   * フラッシュ効果
   */
  private _flash: EffectFlash = new EffectFlash(this);
  /**
   * 不透明度効果中タイマー
   */
  private _opacityTimer: GameEffectTimer = new GameEffectTimer();
  /**
   * 不透明度適用終了時の値
   */
  private _alphaEnd: number = 0;
  /**
   * ブラー
   */
  private _blur: EffectBlur = new EffectBlur(this);
  /**
   * ノイズ効果
   */
  private _noise: EffectNoise = new EffectNoise(this);
  /**
   * 移動効果
   */
  private _move: EffectMove = new EffectMove(this);
  /**
   * 拡大率効果
   */
  private _scale: EffectScale = new EffectScale(this);
  /**
   * 角度を加算する
   */
  private _addAngle: number = 0;
  /**
   * Zオーダーのオフセット
   */
  private _offsetZ: number = 0;

  /**
   * コンストラクタ
   */
  constructor() {
    this._resetFilter();
    this._addGraphic();
  }

  /**
   * 表示の設定
   */
  setVisible(value: boolean) {
    this._sprite.visible = value;
  }

  /**
   * 表示の取得
   */
  get visible() {
    return this._sprite.visible;
  }

  /**
   * Xの設定
   */
  set x(value: number) {
    this._sprite.x = value;
  }

  /**
   * Yの設定
   */
  set y(value: number) {
    this._sprite.y = value;
  }

  /**
   * Z座標の設定
   * @param value
   */
  setZIndex(value: number) {
    if (this._sprite.zIndex !== value) {
      this._sprite.zIndex = value;
    }
  }

  /**
   * ベースZ位置
   */
  protected get _baseZIndex() {
    return 0;
  }

  /**
   * アルファ値の設定
   */
  set alpha(value: number) {
    this._sprite.alpha = value;
  }

  /**
   * アルファ値を取得
   */
  get alpha() {
    return this._sprite.alpha;
  }

  /**
   * 角度を設定する
   * @param value
   */
  setAngle(value: number) {
    this._sprite.angle = value;
  }

  /**
   * 角度を取得する
   */
  get angle() {
    return this._sprite.angle;
  }

  /**
   * X移動値を取得する
   */
  get moveX() {
    return this._move.moveX;
  }

  /**
   * Y移動値を取得する
   */
  get moveY() {
    return this._move.moveY;
  }

  /**
   * X拡大率を取得する
   */
  get scaleX() {
    return this._scale.scaleX;
  }

  /**
   * Y拡大率を取得する
   */
  get scaleY() {
    return this._scale.scaleY;
  }

  /**
   * 加算角度を設定する
   * @param value
   */
  setAddAngle(value: number) {
    this._addAngle = value;
    this._applyAddAngle();
  }

  /**
   * 加算角度を取得する
   */
  get addAngle() {
    return this._addAngle;
  }

  /**
   * Zオーダーのオフセットを取得する
   */
  get offsetZ() {
    return this._offsetZ;
  }

  /**
   * スプライトを取得する
   */
  protected abstract get _sprite(): SpriteObject;

  /**
   * コンテナを作成する
   */
  protected abstract _makeObject(): SpriteObject;

  /**
   * フィルター初期化
   */
  private _resetFilter() {
    this._sprite.filters = [];
  }

  /**
   * グラフィックに追加
   */
  protected _addGraphic() {
    GameGraphics.addSceneChild(this._sprite);
  }

  /**
   * 位置を設定する
   * @param x
   * @param y
   */
  setPos(x: number, y: number) {
    this._sprite.x = x;
    this._sprite.y = y;
  }

  /**
   * サイズを設定する
   * Spriteの種類によって意味合いが変わる
   * @param width
   * @param height
   */
  setSize(width: number, height: number) {
    this._sprite.width = width;
    this._sprite.height = height;
  }

  /**
   * 本オブジェクトの参照を切る前に使用する
   * 明示的に破棄する必要があるかは不明だがいちおう
   * 注）使用後に本オブジェクトを使用しないこと
   * @param options
   */
  remove(options?: IDestroyOptions) {
    this._sprite.destroy(options);
  }

  /**
   * フィルターを設定する
   * @param filter
   */
  setFilter(filter: Filter) {
    const filters = this._object.filters as Filter[];
    if (filters) {
      if (!filters.includes(filter)) {
        this._object.filters = [...filters, filter];
      }
    } else {
      this._object.filters = [filter];
    }
  }

  /**
   * 全フィルターを除去する
   */
  removeAllFilter() {
    this._object.filters = [];
  }

  /**
   * フィルターを除去する
   * @param filter
   */
  removeFilter(filter: Filter) {
    const filters = this._object.filters as Filter[];
    if (!filters || !filters.length) {
      return;
    }
    const removed = filters.filter((value) => value !== filter);
    if (removed.length !== filters.length) {
      this._object.filters = removed;
    }
  }

  /**
   * 選択フィルターを設定
   */
  protected _setSelectFilter() {
    const filter = SpriteBase._selectColorMatrixFilter();
    this.setFilter(filter);
  }

  /**
   * 選択フィルターを取り除く
   */
  protected _removeSelectFilter() {
    const filter = SpriteBase._selectColorMatrixFilter();
    this.removeFilter(filter);
  }

  /**
   * 選択カラーフィルターの取得
   * @returns
   */
  protected static _selectColorMatrixFilter() {
    return GameGraphics.getSystemColorMatrixFilter(0);
  }

  /**
   * アニメーションの更新
   */
  protected _updateAnimation() {
    this._updateEffect();
  }

  /**
   * アニメーション効果の更新
   */
  private _updateEffect() {
    this._flash.update();
    this._updateOpacity();
    this._blur.update();
    this._noise.update();
    this._move.update();
    this._scale.update();
  }

  /**
   * 不透明度の更新
   * @returns
   */
  private _updateOpacity() {
    if (!this._opacityTimer.during) {
      return;
    }
    const duration = this._opacityTimer.duration;
    this.alpha = (this.alpha * (duration - 1) + this._alphaEnd) / duration;
    this._opacityTimer.decDuration();
  }

  /**
   * フラッシュを開始する
   * @param duration
   * @param r
   * @param g
   * @param b
   * @param a
   */
  startFlash(duration: number, r: number, g: number, b: number, a: number) {
    this._flash.start(duration, r, g, b, a);
  }

  /**
   * 不透明度変更を開始する
   * @param duration
   * @param opacity
   */
  startOpacity(duration: number, opacity: number) {
    if (duration > 0) {
      this._opacityTimer.setDuration(duration);
      this._alphaEnd = opacity / 255;
    } else {
      this.alpha = opacity / 255;
    }
  }

  /**
   * ブラーを開始する
   * @param duration
   * @param strength
   */
  startBlur(duration: number, x: number, y: number) {
    this._blur.start(duration, x, y);
  }

  /**
   * ノイズを開始する
   * @param duration
   * @param strength
   */
  startNoise(duration: number, strength: number) {
    this._noise.start(duration, strength);
  }

  /**
   * 移動を開始する
   * @param duration
   * @param x
   * @param y
   */
  startMove(duration: number, x: number, y: number) {
    this._move.start(duration, x, y);
    this._applyOffsetMove();
  }

  /**
   * 拡大率を開始する
   * @param duration
   * @param x
   * @param y
   */
  startScale(duration: number, x: number, y: number) {
    this._scale.start(duration, x, y);
    this._applyOffsetScale();
  }

  /**
   * Zオーダーオフセットを設定する
   * @param z
   */
  setOffsetZ(z: number) {
    this._offsetZ = z;
  }

  /**
   * 移動オフセットを適用する
   */
  protected _applyOffsetMove() {
    this._sprite.x += this.moveX;
    this._sprite.y += this.moveY;
  }

  /**
   * 拡大率オフセットを適用する
   */
  protected _applyOffsetScale() {
    this._sprite.scale.x = this.scaleX;
    this._sprite.scale.y = this.scaleY;
  }

  /**
   * Z位置のオフセットを適用する
   */
  protected _applyOffsetZOrder() {
    this.setZIndex(this._baseZIndex + this._offsetZ);
  }

  /**
   * 角度の加算を適用する
   */
  protected _applyAddAngle() {
    if (this._addAngle !== 0) {
      this._sprite.angle += this._addAngle;
    }
  }

  /**
   * アニメーションクリア
   */
  protected _clearEffect() {
    this._flash.clear();
    this._opacityTimer.clear();
    this.alpha = 1;
    this._blur.clear();
    this._noise.clear();
    this._move.clear();
    this._scale.clear();
  }

  /**
   * 更新
   */
  update() {
    this._updateAnimation();
  }
}

/**
 * コンテナスプライトクラス
 */
export class SpriteContainer extends SpriteBase {
  /**
   * コンストラクタ
   * @param addGraphicFn
   * @param sortable
   */
  constructor(addGraphicFn: (object: Container) => void, sortable: boolean) {
    super();
    addGraphicFn(this._object);
    this._object.sortableChildren = sortable;
  }

  /**
   * コンテナを取得する
   */
  protected get _sprite(): Container {
    return this._object as Container;
  }

  /**
   * コンテナを作成する
   * @returns
   */
  protected override _makeObject(): SpriteObject {
    return new Container();
  }

  /**
   * 親を指定したいのでなにもしない
   */
  protected _addGraphic() {
    //
  }

  /**
   * 更新
   */
  update() {
    super.update();
    this._updatePos();
  }

  /**
   * 位置を更新する
   */
  private _updatePos() {
    this.setPos(this.moveX, this.moveY);
  }

  /**
   * コンテナを追加する
   * @param child
   */
  addChild(child: Container) {
    this._object.addChild(child);
  }

  /**
   * コンテナを削除する
   * @param child
   */
  removeChild(child: Container) {
    this._object.removeChild(child);
  }

  get object() {
    return this._object;
  }
}

/**
 * テクスチャスプライトベース
 */
export class SpriteTextureBase extends SpriteBase {
  /**
   * コンストラクタ
   */
  constructor() {
    super();
    this._setBaseAnchor();
  }

  /**
   * スプライトを取得する
   */
  protected override get _sprite(): Sprite {
    return this._object as Sprite;
  }

  /**
   * コンテナを作成する
   * @returns
   */
  protected override _makeObject(): SpriteObject {
    return new Sprite(new Texture(GameGraphics.emptySource));
  }

  /**
   * 基準となる基点を設定
   */
  protected _setBaseAnchor() {
    // 左上基点
    this._setAnchor(0, 0);
  }

  /**
   * 基点を設定
   * @param x
   * @param y
   */
  protected _setAnchor(x: number, y: number) {
    return this._sprite.anchor.set(x, y);
  }

  /**
   * テクスチャを読み込む
   * @param url
   */
  protected _loadTexture(url: string, loadedFn?: () => void) {
    const source = GameGraphics.loadSource(url);
    if (source.valid) {
      GameLog.debug('valid', url);
      this._setSource(source);
      loadedFn?.();
    } else {
      source.on('update', (newSource: BaseTexture) => {
        GameLog.debug('onUpdate', url);
        this._setSource(newSource);
        loadedFn?.();
      });
    }
  }

  /**
   * ソースを設定する
   * @param texture
   */
  private _setSource(source: BaseTexture) {
    this._setImage(source, this._getTextureFrame(source));
  }

  /**
   * テクスチャ範囲を取得する
   * @param texture
   */
  protected _getTextureFrame(texture: BaseTexture) {
    return new Rectangle(0, 0, texture.width, texture.height);
  }

  /**
   * 画像を設定する
   * @param baseTexture
   * @param frame
   */
  protected _setImage(source: BaseTexture, frame: Rectangle) {
    this._sprite.texture.baseTexture = source;
    this._sprite.texture.frame = frame;
  }

  /**
   * 空の画像を設定する
   */
  protected _setEmptyImage() {
    this._setImage(GameGraphics.emptySource, new Rectangle(0, 0, 0, 0));
  }

  /**
   * テクスチャの切り出し位置を設定する
   * @param x
   * @param y
   * @param update
   */
  protected _setFramePoint(x: number, y: number, update: boolean) {
    this._sprite.texture.frame.x = x;
    this._sprite.texture.frame.y = y;
    if (update) {
      this._sprite.texture.updateUvs();
    }
  }

  /**
   * 矩形のマスクを設定
   * @param frame
   */
  protected _setMaskFrame(frame: Rect) {
    const mask = new Graphics();
    mask.beginFill();
    mask.drawRect(frame.x, frame.y, frame.width, frame.height);
    mask.endFill();
    this._sprite.mask = mask;
  }

  /**
   * 矩形のマスクをクリア
   */
  protected _clearMaskFrame() {
    this._sprite.mask = null;
  }

  /**
   * 本オブジェクトの参照を切る前に使用する
   * @param options
   */
  remove(options = { texture: true }) {
    this._sprite.destroy(options);
  }

  /**
   * 色合いを設定する
   * @param tint
   */
  setTint(tint: number) {
    this._sprite.tint = tint;
  }

  /**
   * 色合いをクリアする
   */
  clearTint() {
    this._sprite.tint = 0xffffff;
  }

  textureResourceUpdate() {
    this._sprite.texture.update();
  }
}
