import { EResolve } from './GameConfig';
import { GamePicture } from './GamePicture';
import { GameWindows } from './GameWindows';
import { Graphics as GameGraphics } from './Graphics';
import { SpriteWindowSheet } from './SpritePlane';
import { WindowFrame } from './WindowBase';
import { BaseTexture } from 'pixi.js';

/**
 * ウィンドウを描画しているスプライトを持つ
 * このスプライトでウィンドウの表示が決まる
 */
export class SpriteWindowset {
  /**
   * スプライト元にするキャンバス
   */
  private _sheet!: HTMLCanvasElement;
  /**
   * キャンバスの子テキスト
   */
  private _context!: CanvasRenderingContext2D;
  /**
   * 描画するウィンドウ
   */
  private _windows: GameWindows;
  /**
   * 一番下にあるウィンドウ
   */
  private _groundWindow: WindowFrame | null;
  /**
   * キャンバスを設定したスプライト
   */
  private _sprite: SpriteWindowSheet;
  /**
   * キャンバスのピクチャー
   * スプライトクラスを使いまわしているだけで何も設定しない
   */
  private _picture: GamePicture;
  /**
   * 非表示にするかどうか
   */
  private _hide: boolean;
  /**
   * 本オブジェクト
   * ゲーム内で共有
   */
  private static _instance: SpriteWindowset | undefined;

  /**
   * コンストラクタ
   */
  constructor() {
    this._sheet = GameGraphics.createElement(EResolve.Width, EResolve.Height);
    this._context = this._sheet.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;
    this._createSprite();
    this._hide = false;
  }

  /**
   * インスタンスを取得
   * @returns
   */
  static getInstance() {
    if (!this._instance) {
      this._instance = new SpriteWindowset();
    }
    return this._instance;
  }

  /**
   * 一番下にあるウィンドウを設定
   */
  setGroundWindow(value: WindowFrame) {
    this._groundWindow = value;
  }

  /**
   * 一番下にあるウィンドウを除去
   */
  removeGroundWindow() {
    this._groundWindow = null;
    this._windows.allDirty = true;
  }

  /**
   * ウィンドウを設定
   * @param windows
   */
  setup(windows: GameWindows) {
    this._windows = windows;
  }

  /**
   * ウィンドウスプライトを作成
   */
  private _createSprite() {
    this._picture = new GamePicture();
    const texture = BaseTexture.from(this._sheet);
    this._sprite = new SpriteWindowSheet(this._picture, texture);
    this._sprite.setZIndex(10000);
    this._sprite.setVisible(false);
  }

  /**
   * 更新
   * @returns
   */
  update() {
    const windowList = this._getWindowList();
    // スプライト非表示かつウィンドウがない場合は処理終了
    if (this._sprite.visible === false && windowList.length === 0) {
      return;
    }

    this._checkClearSheet();
    windowList.forEach((window) => window.update());
    windowList.forEach((window) => this.draw(window));

    // テクスチャ更新
    if (this.containDirtyWindow(windowList)) {
      // windowのどれかがdirtyでないとテクスチャの更新はされない
      this._sprite.textureResourceUpdate();
    }
    // dirtyフラグをクリア
    this._clearDirty();

    //this._sprite.update();  // 親がやるのでなにもしない
    // spriteのonoff ウィンドウがあればon なければ off
    this._judgeVisible(windowList);
  }

  /**
   * 描画シートをクリアする
   */
  private _checkClearSheet() {
    if (this._windows.allDirty) {
      this._groundWindow?.setDirtyAllArea();
      this.clearSheet();
    }
  }

  /**
   * ウィンドウリストを取得
   * @returns
   */
  private _getWindowList() {
    if (this._groundWindow) {
      return [this._groundWindow].concat(this._windows.windowList);
    } else {
      return this._windows.windowList;
    }
  }

  /**
   * キャンバスに描画する
   * @param window
   * @returns
   */
  draw(window: WindowFrame) {
    if (!window.dirty || !window.visible) {
      return;
    }
    window.drawDirtyRect(this._context);
  }

  /**
   * シートをクリアする
   */
  clearSheet() {
    this._context.clearRect(0, 0, this._sheet.width, this._sheet.height);
  }

  /**
   * 更新必要なウィンドウが含まれているかどうか
   * @param windowList
   * @returns
   */
  containDirtyWindow(windowList: WindowFrame[]) {
    return windowList.some((window) => window.dirty);
  }

  private _judgeVisible(windowList: WindowFrame[]) {
    this._sprite.setVisible(windowList.length > 0 && !this._hide);
  }

  /**
   * 更新範囲をクリアする
   */
  private _clearDirty() {
    this._groundWindow?.clearDirty();
    this._windows.clearDirty();
  }
}
