import {
  Application,
  BaseTexture,
  Container,
  ImageResource,
  RenderTexture,
  Texture,
  TextureGCSystem,
  Ticker,
  TickerCallback,
  Graphics as PixiGraphics,
} from 'pixi.js';
import '@pixi/unsafe-eval';
import { ColorMatrixFilter } from '@pixi/filter-color-matrix';
import { BlurFilter } from '@pixi/filter-blur';
import Utils from './Utils';
import { SpriteContainer } from './SpriteBase';
import { GameLog } from './GameLog';

/* ColorMatrix
            ┌ m00 m01 m02 m03 m04 ┐
            │ m10 m11 m12 m13 m14 │
[R G B A W] │ m20 m21 m22 m23 m24 │＝ [R' G' B' A' W']
            │ m30 m31 m32 m33 m34 │
            └ m40 m41 m42 m43 m44 ┘
R' = R × m00 ＋ G × m10 ＋ B × m20 ＋ A × m30 ＋ W × m40
G' = R × m01 ＋ G × m11 ＋ B × m21 ＋ A × m31 ＋ W × m41
B' = R × m02 ＋ G × m12 ＋ B × m22 ＋ A × m32 ＋ W × m42
A' = R × m03 ＋ G × m13 ＋ B × m23 ＋ A × m33 ＋ W × m43
W = 1
*/
// ワープ効果にはブラーフィルターパスがあってる感じ
/**
 * カラーフィルタークラス
 */

export class ColorFilter {
  /**
   * ブレンドする色
   */
  private _blendColor: number[];
  /**
   * フェード値
   */
  private _fadeValue: number;
  /**
   * カラーマトリックス
   */
  private _colorMatrix: ColorMatrixFilter;

  /**
   * コンストラクタ
   */
  constructor(r = 0, g = 0, b = 0, a = 0, fadeValue = 255) {
    this._blendColor = [r, g, b, a];
    this._fadeValue = fadeValue;
    this._colorMatrix = new ColorMatrixFilter();
    this._setMatrix();
  }

  /**
   * 有効かどうか
   */
  get enable() {
    return this._blendColor[3] !== 0 || this._fadeValue !== 255;
  }

  /**
   * ブレンド色を設定
   * @param r
   * @param g
   * @param b
   * @param a
   */
  setBlendColor(r: number, g: number, b: number, a: number) {
    this._blendColor[0] = r;
    this._blendColor[1] = g;
    this._blendColor[2] = b;
    this._blendColor[3] = a;
    this._setMatrix();
  }

  /**
   * ブレンド値を取得
   */
  get blendColor() {
    return this._blendColor;
  }

  /**
   * ブレンド色のアルファを設定
   * @param a
   */
  setBlendColorA(a: number) {
    this._blendColor[3] = a;
    this._setMatrix();
  }

  /**
   * ブレンド色のアルファを取得
   */
  get blendColorA() {
    return this._blendColor[3];
  }

  /**
   * フェード値を設定
   * @param value
   */
  setFadeValue(value: number) {
    this._fadeValue = value;
    this._setMatrix();
  }

  /**
   * フェード値を取得
   */
  get fadeValue() {
    return this._fadeValue;
  }

  /**
   * カラーマトリックスを取得
   */
  get colorMatrix() {
    return this._colorMatrix;
  }

  /**
   * カラーマトリックスを反映
   */
  private _setMatrix() {
    const [r, g, b, a] = [...this._blendColor];
    const [cr, cg, cb, ca] = [r / 255, g / 255, b / 255, a / 255];
    const cfadeValue = this._fadeValue / 255;
    const crgb = (1 - ca) * cfadeValue;
    const matrix = this._colorMatrix.matrix;
    matrix[0] = crgb;
    matrix[4] = cr * ca * cfadeValue;
    matrix[6] = crgb;
    matrix[9] = cg * ca * cfadeValue;
    matrix[12] = crgb;
    matrix[14] = cb * ca * cfadeValue;
  }
}

// zIndexの範囲
// 0: 背景
// 1000:下層レイヤー
// 2100〜2999: キャラクター
//   決め方：2100 + ディスプレイy座標 + 優先ID * 0.001
//   100台から始まっているのはy座標がマイナスになる場合があるため
//   ディスプレイ外は表示されないため512(縦解像度)+αで収まる
// 3000:上層レイヤー
// 10000:ウィンドウ
// 20000:フェード

// フィルター
// スクリーンフィルターはGraphicsのものを使用している
// アニメーションとシステムで共有してるので
// あと勝ちになる

/**
 * グラフィックスクラス
 */
export class Graphics {
  /**
   * PIXI.Application
   */
  private static _app: Application;
  /**
   * テクスチャソースの独自キャッシュ
   */
  private static _sourceCache: Map<string, BaseTexture>;
  /**
   * スナップを保存するテクスチャ
   */
  private static _snapTexture: RenderTexture;
  /**
   * ベースのコンテナ
   * シーン＋ウィンドウがのっかる
   */
  private static _baseSprite: SpriteContainer;
  /**
   * シーンのコンテナ
   */
  private static _sceneSprite: SpriteContainer;
  /**
   * ウィンドウのコンテナ
   */
  private static _windowSprite: SpriteContainer;
  /**
   * カラーフィルタ
   */
  private static _colorFilter: ColorFilter;
  /**
   * シーン用カラーフィルター」
   */
  private static _sceneColorFilter: ColorFilter;
  /**
   * ブラーフィルター
   */
  private static _blurFilter: BlurFilter;
  /**
   * システムカラーフィルター
   */
  private static _systemColorFilters: ColorFilter[];
  /**
   * ティッカー
   */
  private static _ticker: Ticker;

  /**
   * 設定したPIXI.Applicationを取得
   */
  static get app() {
    return this._app;
  }

  /**
   * 横サイズを取得
   */
  static get width() {
    return this._app.screen.width;
  }

  /**
   * 縦サイズを取得
   */
  static get height() {
    return this._app.screen.height;
  }

  /**
   * シーンのコンテナを取得する
   */
  static get sceneSprite() {
    return this._sceneSprite;
  }

  /**
   * ウィンドウのコンテナを取得する
   */
  static get windowSprite() {
    return this._windowSprite;
  }

  /**
   * 空のBaseTexture
   */
  static get emptySource() {
    // PIXI.Textureにあるものを使う
    return Texture.EMPTY.baseTexture;
  }

  /**
   * カラーフィルター
   */
  static get colorFilter() {
    return this._colorFilter;
  }

  /**
   * ブラーフィルター
   */
  static get blurFilter() {
    return this._blurFilter;
  }

  /**
   * 初期化
   * @param width
   * @param height
   */
  static initialize(width: number, height: number) {
    this._pixiSettings();
    const app = new Application({
      width: width,
      height: height,
      autoStart: false,
    });
    // PIXI.ApplicationにTickerを設定すると
    // 勝手にリスナーにrenderが追加されるため別で作成する
    this._ticker = new Ticker();
    document.body.appendChild(app.view as HTMLCanvasElement);
    this._setViewStyle(app);
    this._setCursorStyle(app);
    this._app = app;

    this._baseSprite = new SpriteContainer((object) => {
      const mask = new PixiGraphics();
      mask.beginFill();
      mask.drawRect(0, 0, width, height);
      mask.endFill();
      object.mask = mask;
      app.stage.addChild(object);
    }, false);
    // サブコンテナ作成
    this._sceneSprite = new SpriteContainer(
      (object) => this.addBaseChild(object),
      true
    );
    this._windowSprite = new SpriteContainer(
      (object) => this.addBaseChild(object),
      false
    );
    // テクスチャソースキャッシュ
    this._sourceCache = new Map();

    // スナップ用テクスチャ
    this._snapTexture = RenderTexture.create({ width, height });

    this._createFilter();
  }

  /**
   * PIXI設定を行う
   */
  static _pixiSettings() {
    TextureGCSystem.defaultMaxIdle = 1000;
  }

  /**
   * 表示スタイルを設定する
   * @param app
   */
  private static _setViewStyle(app: Application) {
    // ウィンドウサイズに合わせた表示
    const style = (app.renderer.view as HTMLCanvasElement).style;
    style.position = 'absolute';
    style.display = 'block';
    // 中央表示
    style.margin = 'auto';
    style.left = '0';
    style.right = '0';
    style.top = '0';
    style.bottom = '0';
  }

  /**
   * マウスカーソルを消すための処理
   * @param app
   */
  private static _setCursorStyle(app: Application) {
    const hideTimer = () => {
      return window.setTimeout(() => {
        app.renderer.events.domElement.style.cursor = 'none';
        id = 0;
      }, 1000);
    };
    let id = hideTimer();
    app.renderer.events.domElement.addEventListener('mousemove', () => {
      app.renderer.events.domElement.style.cursor = 'default';
      clearTimeout(id);
      id = hideTimer();
    });
  }

  /**
   * フィルターを作成する
   */
  private static _createFilter() {
    this._colorFilter = new ColorFilter();
    this._sceneColorFilter = new ColorFilter();
    this._blurFilter = new BlurFilter(0);
    this._createSystemFilter();
  }

  /**
   * システムフィルターを作成する
   */
  private static _createSystemFilter() {
    this._systemColorFilters = [new ColorFilter(255, 255, 255, 64)];
  }

  /**
   * Tickerのリスナーを設定する
   * @param fn
   * @param context
   */
  static setTickerListener<T>(fn: TickerCallback<T>, context: T) {
    this._ticker.add(fn, context);
  }

  /**
   * Tickerを開始する
   */
  static startTicker() {
    this._ticker.start();
  }

  /**
   * Tickerを停止する
   */
  static stopTicker() {
    this._ticker?.stop();
  }

  /**
   * ステージを描画する
   */
  static render() {
    this.app.renderer.render(this.app.stage);
  }

  /**
   * ブレンドカラーを設定する
   * @param color
   */
  static setBlendColor(color: number[]) {
    this._colorFilter.setBlendColor(color[0], color[1], color[2], color[3]);
  }

  /**
   * シーン用のブレンドカラーを設定する
   * @param color
   */
  static setSceneBlendColor(color: number[]) {
    this._sceneColorFilter.setBlendColor(
      color[0],
      color[1],
      color[2],
      color[3]
    );
  }

  /**
   * フェード値を設定する
   * @param value
   */
  static setFadeValue(value: number) {
    this._colorFilter.setFadeValue(value);
  }

  /**
   * シーン用のフェード値を設定する
   * @param value
   */
  static setSceneFadeValue(value: number) {
    this._sceneColorFilter.setFadeValue(value);
  }

  /**
   * ブラー強度を設定する
   * @param value
   */
  static setBlurStrength(value: number) {
    this._blurFilter.blur = value;
  }

  /**
   * カラーフィルターの適用
   */
  static applyColorFilter() {
    if (this._colorFilter.enable) {
      this._baseSprite.setFilter(this._colorFilter.colorMatrix);
    } else {
      this._baseSprite.removeFilter(this._colorFilter.colorMatrix);
    }
  }

  /**
   * シーン用のカラーフィルターの適用
   */
  static applySceneColorFilter() {
    if (this._sceneColorFilter.enable) {
      this._sceneSprite.setFilter(this._sceneColorFilter.colorMatrix);
    } else {
      this._sceneSprite.removeFilter(this._sceneColorFilter.colorMatrix);
    }
  }

  /**
   * ブラーフィルターの適用
   */
  static applyBlurFilter() {
    if (this._blurFilter.blur > 0) {
      this._baseSprite.setFilter(this._blurFilter);
    } else {
      this._baseSprite.removeFilter(this._blurFilter);
    }
  }

  /**
   * ブラーフィルターを除去
   */
  static removeBlurFilter() {
    this.setBlurStrength(0);
    this._baseSprite.removeFilter(this._blurFilter);
  }

  /**
   * システムカラーマトリックスフィルターを取得する
   */
  static getSystemColorMatrixFilter(index: number) {
    return this._systemColorFilters[index].colorMatrix;
  }

  /**
   * 色配列からRGBの数値に変換
   * @param color
   */
  static colorArrayToRGBNumber(color: number[]) {
    return color[0] << 16 || color[1] << 8 || color[2];
  }

  /**
   * テクスチャソースのキャッシュを取得する
   * キャッシュされていないときはテクスチャソースを作成して読み込む
   * @param url
   */
  static loadSource(url: string) {
    const cache = this._sourceCache;
    const source = cache.get(url);

    if (!source) {
      const newSource = new BaseTexture();
      cache.set(url, newSource);
      const image = new ImageResource(url);
      image.load().then(
        (resource: ImageResource) => {
          GameLog.debug('load:', url);
          newSource.setResource(resource);
        },
        (e) => {
          GameLog.error(e);
          Utils.pushError(new Error(url));
        }
      );
      return newSource;
    }
    return source;
  }

  /**
   * ベースコンテナに子を追加
   * @param child
   */
  static addBaseChild(child: Container) {
    this._baseSprite.addChild(child);
  }

  /**
   * ベースコンテナから子を削除
   * @param child
   */
  static removeBaseChild(child: Container) {
    this._baseSprite.removeChild(child);
  }

  /**
   * シーンコンテナに子を追加
   * @param child
   */
  static addSceneChild(child: Container) {
    this._sceneSprite.addChild(child);
  }

  /**
   * シーンコンテナから子を削除
   * @param child
   */
  static removeSceneChild(child: Container) {
    this._sceneSprite.removeChild(child);
  }

  /**
   * ウィンドウコンテナに子を追加
   * @param child
   */
  static addWindowChild(child: Container) {
    this._windowSprite.addChild(child);
  }

  /**
   * ウィンドウコンテナから子を削除
   * @param child
   */
  static removeWindowChild(child: Container) {
    this._windowSprite.removeChild(child);
  }

  /**
   * スナップショットをとる
   */
  static takeSnap() {
    this.app.renderer.render(this._baseSprite.object, {
      renderTexture: this._snapTexture,
    });
    return this._snapTexture;
  }

  /**
   * スナップテクスチャを取得する
   */
  static getSnapTexture() {
    return this._snapTexture;
  }

  /**
   * 描画対象を作成する
   * @param width
   * @param height
   */
  static createElement(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * ブラーフィルターを作成
   * @param strength
   */
  static createBlurFilter(strength = 4) {
    const filter = new BlurFilter(strength);
    return filter;
  }

  /**
   * エフェクト処理
   */
  static processEffect() {
    this._baseSprite.update();
    this._sceneSprite.update();
    this._windowSprite.update();
  }

  /**
   * スナップショットのURLを取得する
   * ステージの現在のレンダリング内容をPNG形式のデータURLとして取得します。
   * レンダリングを一時停止してからURLを抽出し、その後再開します。
   * @returns Promise<string> PNG形式のデータURL
   */
  static async getSnapshotUrl() {
    this.app.stop();
    const url = await this.app.renderer.extract.base64(this._app.stage);
    this.app.start();
    return url;
  }
}
