/* eslint-disable @typescript-eslint/no-explicit-any */
import { WindowData } from './DataTypes';
import { Rect } from './GameUtils';
import { Graphics as GameGraphics } from './Graphics';
import { BaseTexture, ICanvas, ImageResource } from 'pixi.js';

export interface WindowExtra {
  font: {
    size: string;
    name: string;
    height: number;
  };
}

/**
 * ウィンドウ部品
 */
interface WindowItemParts {
  text: string;
  textAlign?: string;
  left?: number;
  top?: number;
  colorId?: number;
}

/**
 * ウィンドウ項目
 * 項目一つをpartsで構成している
 */
export class WindowItem {
  /**
   * X座標
   */
  private _x: number = 0;
  /**
   * Y座標
   */
  private _y: number = 0;
  /**
   * 色Id
   */
  private _colorId: number = 0;
  /**
   * 区切り線を有効にするかどうか
   */
  private _border: boolean = false;
  /**
   * 区切り線の左
   */
  private _borderLeft: number = 0;
  /**
   * 区切り線の上
   */
  private _borderTop: number = 0;
  /**
   * 区切り線の幅
   */
  private _borderWidth: number = 0;
  /**
   * 区切り線の色Id
   */
  private _borderColorId: number = 0;
  /**
   * ウィンドウ項目
   */
  private _parts: WindowItemParts[] = [];

  /**
   * X座標を設定
   */
  set x(value: number) {
    this._x = value;
  }

  /**
   * X座標を取得
   */
  get x() {
    return this._x;
  }

  /**
   * Y座標を設定
   */
  set y(value: number) {
    this._y = value;
  }

  /**
   * Y座標を取得
   */
  get y() {
    return this._y;
  }

  /**
   * 色Idを設定
   * @param value
   */
  setColorId(value: number) {
    this._colorId = value;
  }

  /**
   * 色Idを取得
   */
  get colorId() {
    return this._colorId;
  }

  /**
   * 区切り線を有効にする
   */
  enableBorder() {
    this._border = true;
  }

  /**
   * 区切り線があるかを取得する
   */
  get border() {
    return this._border;
  }

  /**
   * 区切り線の左位置を設定する
   * @param value
   */
  setBorderLeft(value: number) {
    this._borderLeft = value;
  }

  /**
   * 区切り線の左位置を取得する
   */
  get borderLeft() {
    return this._borderLeft;
  }

  /**
   * 区切り線の上位置を設定する
   * @param value
   */
  setBorderTop(value: number) {
    this._borderTop = value;
  }

  /**
   * 区切り線の上位置を設定する
   */
  get borderTop() {
    return this._borderTop;
  }

  /**
   * 区切り線の幅を設定する
   * @param value
   */
  setBorderWidth(value: number) {
    this._borderWidth = value;
  }

  /**
   * 区切り線の幅を取得する
   */
  get borderWidth() {
    return this._borderWidth;
  }

  /**
   * 区切り線の色を設定する
   * @param colorId
   */
  setBorderColor(colorId: number) {
    this._borderColorId = colorId;
  }

  /**
   * 区切り線の色を取得する
   */
  get borderColorId() {
    return this._borderColorId;
  }

  /**
   * 部品を取得
   */
  get parts() {
    return this._parts;
  }

  /**
   * テキストから空かを取得
   */
  get emptyText() {
    return this._parts.every((part) => !part.text);
  }

  /**
   * 標準部品を作成する
   * @param text
   */
  createDefaultParts(text: string) {
    this._parts = [{ text }];
  }

  /**
   * 部品を設定する
   * @param parts
   */
  setParts(parts: WindowItemParts[]) {
    this._parts = parts;
  }
}

/**
 * ウィンドウ枠
 */
export class WindowFrame {
  /**
   * 再描画領域
   */
  protected _dirtyRect: Rect[] = [];
  /**
   * 表示
   */
  private _visible!: boolean;
  /**
   * 左座標
   */
  protected _offsetX!: number;
  /**
   * 上座標
   */
  protected _offsetY!: number;
  /**
   * 横幅
   */
  protected _width!: number;
  /**
   * 縦幅
   */
  protected _height!: number;
  /**
   * 有効かどうか
   * グレーアウトは別
   */
  private _active: boolean = true;
  /**
   * 非アクティブ時にグレーアウトするかどうか
   */
  private _inactiveColor: boolean = true;
  /**
   * HTMLキャンバス
   */
  private _canvas: HTMLCanvasElement = GameGraphics.createElement(0, 0);
  /**
   * キャンバスコンテキスト
   */
  protected _context: CanvasRenderingContext2D = this._canvas.getContext('2d', {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;

  /**
   * アイコン
   */
  protected static _Icons: Array<{
    canvas: ICanvas;
    context: CanvasRenderingContext2D;
  }> = [];

  /**
   * フォント色
   */
  private static FONT_COLOR_TABLE = [
    '#FFFFFF',
    '#FFFF00',
    '#FF0000',
    '#00FFFF',
    '#AFAFAF',
  ];
  /**
   * 下地の色
   */
  private static GROUND_COLOR_TABLE = ['rgba(0,0,0,0.5)'];
  /**
   * ウィンドウ枠の色
   */
  private static FRAME_COLOR_TABLE = ['#FFFFFF', '#AFAFAF', '#0034FF'];

  /**
   * コンストラクタ
   * @param window ウィンドウデータ
   * @param extra
   */
  constructor(protected _window: WindowData) {
    const window = this._window;
    this._visible = window.visible ?? true;
    this._offsetX = window.x ?? 0;
    this._offsetY = window.y ?? 0;
    this._width = window.width ?? 0;
    this._height = window.height ?? 0;
  }

  /**
   * フォントの色を設定する
   * @param value
   */
  setFontColor(value: number) {
    this._applyInactiveAlpha();
    const color = WindowFrame.getFontColor(value);
    this._fillStyle = color;
    this._strokeStyle = color;
  }

  /**
   * フォント色を取得する
   * @param value
   * @returns
   */
  static getFontColor(value: number) {
    return WindowFrame.FONT_COLOR_TABLE[value];
  }

  /**
   * 下地の色を設定する
   * @param value
   */
  setGroundColor(value: number) {
    this._resetInactiveAlpha();
    this._fillStyle = WindowFrame.GROUND_COLOR_TABLE[value];
    this._strokeStyle = WindowFrame.GROUND_COLOR_TABLE[value];
  }

  /**
   * 枠の色を設定する
   * @param value
   */
  setFrameColor(value: string) {
    this._applyInactiveAlpha();
    this._fillStyle = value;
    this._strokeStyle = value;
  }

  /**
   * 非アクティブアルファを設定する
   */
  protected _applyInactiveAlpha() {
    this._context.globalAlpha = this._needInactiveColor() ? 0.5 : 1.0;
  }

  /**
   * 非アクティブ色が必要か
   * 非アクティブかつ非アクティブ色使用なら必要
   * @returns
   */
  private _needInactiveColor() {
    return !this.active && this._inactiveColor;
  }

  /**
   * 非アクティブアルファをリセットする
   */
  protected _resetInactiveAlpha() {
    this._context.globalAlpha = 1.0;
  }

  /**
   * 枠の色のidを取得する
   */
  get frameColorId() {
    return 0;
  }

  /**
   * スクロールバーの色のidを取得する
   */
  get scrollColorId() {
    return 2;
  }

  /**
   * カーソル色のidを取得する
   */
  get cursorColorId() {
    return 0;
  }

  /**
   * フレームの色を取得する
   * @param id
   * @returns
   */
  static getFrameColor(id: number) {
    return WindowBase.FRAME_COLOR_TABLE[id];
  }

  /**
   * 塗りつぶし色を設定する
   */
  protected set _fillStyle(value: string) {
    this._context.fillStyle = value;
  }

  /**
   * アウトライン色を設定する
   */
  protected set _strokeStyle(value) {
    this._context.strokeStyle = value;
  }

  /**
   * アクティブ状態を設定する
   */
  setActive(value: boolean) {
    if (this._active === value) {
      return;
    }
    this._active = value;
    if (this._inactiveColor) {
      this.refresh();
    }
  }

  /**
   * アクティブかどうかを取得する
   */
  get active() {
    return this._active;
  }

  /**
   * 更新必要矩形があるかを取得
   */
  get dirty() {
    return this._dirtyRect.length !== 0;
  }

  /**
   * 表示状態を設定
   * @param value
   */
  setVisible(value: boolean) {
    this._visible = value;
    this.setDirtyAllArea();
  }

  /**
   * 表示状態を取得
   */
  get visible() {
    return this._visible;
  }

  /**
   * 処理中かどうかを取得
   */
  get processing() {
    return false;
  }

  /**
   * 破棄する
   */
  destroy() {
    (this._context as unknown) = null;
    (this._canvas as unknown) = null;
  }

  /**
   * 値をリセット
   */
  protected _resetValue() {
    const window = this._window;
    this._offsetX = window.x ?? 0;
    this._offsetY = window.y ?? 0;
    this._width = window.width ?? 0;
    this._height = window.height ?? 0;
  }

  /**
   * 非アクティブ色が有効かどうか設定する
   * @param value
   */
  protected _setInactiveColor(value: boolean) {
    this._inactiveColor = value;
  }

  /**
   * 設置
   */
  setup(
    header?: WindowItem[],
    body?: WindowItem[] | WindowItem[][],
    object?
  ): void;
  setup() {
    this._changeCanvasSize();
    this.refresh();
  }

  /**
   * キャンバスサイズの変更
   */
  protected _changeCanvasSize() {
    if (
      this._canvas.width === this._width &&
      this._canvas.height === this._height
    ) {
      return;
    }
    this._canvas.width = this._width;
    this._canvas.height = this._height;
    this._initCanvasStyle();
  }

  /**
   * キャンバススタイルの初期化
   */
  protected _initCanvasStyle() {}

  /**
   * ウィンドウ枠を描画
   */
  protected _drawFrame() {
    this.setFrameColor(WindowFrame.FRAME_COLOR_TABLE[this.frameColorId]);
    this._lineRect(0, 0, this._width, this._height);
    this._lineRect(1, 1, this._width - 2, this._height - 2);
    this._lineRect(2, 2, this._width - 4, this._height - 4);
  }

  /**
   * 矩形線を描画
   * @param x
   * @param y
   * @param width
   * @param height
   */
  protected _lineRect(x, y, width, height) {
    const ctx = this._context;
    ctx.strokeRect(x, y, width, height);
  }

  /**
   * 直線を描画
   * @param x
   * @param y
   * @param width
   * @param height
   * @param lineWidth
   */
  protected _drawLine(
    x: number,
    y: number,
    width: number,
    height: number,
    lineWidth = 1
  ) {
    const ctx = this._context;
    y = y + (lineWidth % 2) / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  /**
   * 再構築
   */
  refresh() {
    // ウィンドウを描画しなおし
    this._clear();
    this._drawFrame();
    // ウィンドウ再描画設定
    this.setDirtyAllArea();
  }

  /**
   * 矩形を消去する
   * @param x
   * @param y
   * @param width
   * @param height
   */
  protected _clearRect(x, y, width, height) {
    this._context.clearRect(x, y, width, height);
  }

  /**
   * 全体を消去する
   */
  protected _clear() {
    this._clearRect(0, 0, this._width, this._height);
  }

  /**
   * 全範囲を更新範囲とする
   * 範囲を消して追加する
   * @returns
   */
  setDirtyAllArea() {
    if (this._dirtyAllArea()) {
      return;
    }
    this.clearDirty();
    this.pushDirtyRect(0, 0, this._width, this._height);
  }

  /**
   * 更新範囲が全体かどうか
   * @returns
   */
  private _dirtyAllArea() {
    if (this._dirtyRect.length === 0) {
      return false;
    }
    const rect = this._dirtyRect[0];
    return (
      rect.x === 0 &&
      rect.y === 0 &&
      rect.width === this._width &&
      rect.height === this._height
    );
  }

  // 更新範囲を消去する
  clearDirty() {
    this._dirtyRect.length = 0;
  }

  /**
   * 更新矩形を描画する
   * @param ctx
   */
  drawDirtyRect(ctx: CanvasRenderingContext2D) {
    const rects = this._dirtyRect;

    rects.forEach((rect) => {
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const x = rect.x + this._offsetX;
      const y = rect.y + this._offsetY;
      const srcData = this._context.getImageData(
        rect.x,
        rect.y,
        rect.width,
        rect.height
      );
      ctx.putImageData(srcData, x, y);
    });
  }

  // 更新範囲を追加する
  pushDirtyRect(x: number, y: number, width: number, height: number) {
    this._dirtyRect.push({ x, y, width, height });
  }

  update() {
    //
  }

  /**
   * ウィンドウテクスチャを読み込む
   * updateが呼ばれた時点ではリソースを取得できないが
   * Promiseをかましたら大丈夫な模様
   * @param fnEnd
   */
  static loadWindowTexture(fnEnd: () => void) {
    const loadFn = (url: string, resolve: (value: BaseTexture) => void) => {
      const source = GameGraphics.loadSource(url);
      source.on('update', (source: BaseTexture) => {
        resolve(source);
      });
    };
    const iconLoad = new Promise<BaseTexture>((resolve) => {
      loadFn('./assets/window/icon.png', resolve);
    });
    Promise.all([iconLoad]).then((sources) => {
      this._createColorIcons(sources[0]);
      fnEnd();
    });
  }

  /**
   * 各色アイコンを作成する
   * @param srcTexture
   */
  private static _createColorIcons(source: BaseTexture) {
    const elmSource = (source.resource as ImageResource)
      .source as HTMLImageElement;
    for (let i = 0; i < this.FONT_COLOR_TABLE.length; i++) {
      this._Icons.push(this._createColorIcon(elmSource, i));
    }
  }

  /**
   * 色付きアイコンを作成する
   * @param srcTexture
   * @param index
   */
  private static _createColorIcon(source: HTMLImageElement, index: number) {
    const canvas = GameGraphics.createElement(source.width, source.height);
    const context = canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = this.FONT_COLOR_TABLE[index];
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0);
    context.globalCompositeOperation = 'destination-atop';
    context.drawImage(source, 0, 0);
    return { canvas, context };
  }
}

const enum ECursor {
  SwitchCount = 18,
  MaxCount = 36,
}

/**
 * ウィンドウのベース
 */
export class WindowBase extends WindowFrame {
  /**
   * ヘッダ部品
   */
  private _outer: WindowItem[];
  /**
   * 本体部品
   */
  private _body: WindowItem[] | WindowItem[][];
  /**
   * 中身のオブジェクト
   */
  private _object: any;
  /**
   * 入力可能かどうか
   */
  private _focus: boolean = false;
  /**
   * フォント色
   */
  private _fontColorId: number = 0;
  /**
   * 背景色
   */
  private _backColorId: number = 0;
  /**
   * 左パディング
   */
  protected _paddingLeft!: number;
  /**
   * 上パディング
   */
  protected _paddingTop!: number;
  /**
   * 列数
   */
  private _column!: number;
  /**
   * ウィンドウ横軸基準位置
   */
  private _position!: string;
  /**
   * 項目の横幅
   */
  protected _itemWidth!: number;
  /**
   * 項目の縦幅
   */
  protected _itemHeight!: number;
  /**
   * テキスト開始基準位置
   */
  private _textAlign!: string;
  /**
   * 列１グループの項目数
   */
  private _colGroupCount!: number;
  /**
   * 列グループの間隔
   */
  private _colGroupSpace!: number;
  /**
   * カーソルを持つ
   */
  private _cursor: boolean;
  /**
   * 1ページに表示できる最大項目数
   */
  private _maxItem!: number;
  /**
   * スクロール可能かどうか
   */
  protected _scroll!: boolean;
  /**
   * bodyをページごとに切り取ったもの
   */
  private _sliceBodies: Array<WindowItem[] | WindowItem[][]> = [];
  /**
   * 可変項目属性
   */
  private _fluctuate!: boolean;
  /**
   * カーソルインデックス
   */
  private _cursorIndex: number = 0;
  /**
   * 前のカーソルインデックス
   */
  private _oldCursorIndex: number = 0;
  /**
   * カーソル幅
   */
  private _cursorWidth!: number;
  /**
   * カーソルのアニメーションカウント
   */
  private _animeCount: number = 0;
  /**
   * 前のカーソルが表示されていたか
   */
  private _oldCursorView: boolean = false;
  /**
   * カーソル更新
   */
  private _dirtyCursor: boolean = false;
  /**
   * 項目を決定した
   */
  private _decided: boolean = false;
  /**
   * フォントサイズ
   */
  private _fontSize!: string;
  /**
   * フォント名
   */
  private _fontName!: string;
  /**
   * フォントの高さ
   */
  private _fontHeight!: number;
  /**
   * テキストベース補正
   */
  private _adjustY!: number;

  /**
   * コンストラクタ
   * @param arg
   */
  constructor(window: WindowData, extra: WindowExtra) {
    super(window);
    this._paddingLeft = window.paddingLeft ?? 0;
    this._paddingTop = window.paddingTop ?? 0;
    this._column = this._window.column ?? 0;
    this._position = window.position ?? 'start';
    this._itemWidth = window.itemWidth ?? 0;
    this._itemHeight = window.itemHeight ?? 0;
    this._textAlign = window.textAlign ?? 'start';
    this._colGroupCount = window.colGroupCount ?? 0;
    this._colGroupSpace = window.colGroupSpace ?? 0;
    this._cursor = window.cursor ?? false;
    this._maxItem = window.maxItem ?? 0;
    this._scroll = window.scroll ?? false;
    this._fluctuate = window.fluctuate ?? false;
    this._cursorWidth = this._cursor ? 16 : 0;
    this._setInactiveColor(window.inactiveColor ?? true);
    this._setExtra(extra);
  }

  /**
   * 追加データを設定する
   * @param extra
   */
  private _setExtra(extra: WindowExtra) {
    this._initFont(extra.font);
  }

  /**
   * 値をリセット
   */
  protected _resetValue() {
    super._resetValue();
    this._column = this._window.column ?? 0;
    this.setDecided(false);
  }

  /**
   * ウィンドウデータを取得
   */
  get window() {
    return this._window;
  }

  /**
   * ヘッダーを取得する
   */
  private get _header() {
    return this._window.headerReverse ? [] : this._outer;
  }

  /**
   * フッターを取得する
   */
  private get _footer() {
    return this._window.headerReverse ? this._outer : [];
  }

  /**
   * ウィンドウヘッダプロパティを取得する
   */
  get windowHeaderProperty() {
    return this._window.headerProperty;
  }

  /**
   * ウィンドウプロパティ名を取得する
   */
  get windowPropertyNames() {
    return this._window.propertyNames;
  }

  get object() {
    return this._object;
  }

  /**
   * bodyの要素数を取得
   */
  get length() {
    return this._body.length;
  }

  /**
   * 可変項目属性がついているかを取得する
   */
  get fluctuate() {
    return this._fluctuate;
  }

  /**
   * フォーカス状態を取得
   */
  get focus() {
    return this._focus;
  }

  /**
   * フォント色のidを取得
   */
  get fontColorId() {
    return this._fontColorId;
  }

  setInitIndex(value: number) {
    this._cursorIndex = value;
    this._oldCursorIndex = value;
  }

  /**
   * カーソルインデックスを設定する
   * @param value
   */
  setIndex(value: number) {
    this._cursorIndex = value;
  }

  /**
   * カーソルインデックスを取得する
   */
  get index() {
    return this._cursorIndex;
  }

  /**
   * 決定したかどうかを設定する
   * @param value
   */
  setDecided(value: boolean) {
    this._decided = value;
  }

  /**
   * 決定したかどうかを取得する
   */
  get decided() {
    return this._decided;
  }

  /**
   * 最大ページ数を取得
   */
  get maxPage() {
    return this._sliceBodies.length;
  }

  set textBaseline(value) {
    this._context.textBaseline = value;
  }

  set textAlign(value) {
    this._context.textAlign = value;
  }

  /**
   * コンテキストにフォントを設定する
   */
  set font(value: string) {
    this._context.font = value;
  }

  /**
   * フォントサイズを設定する
   */
  set fontSize(value: string) {
    this._fontSize = value;
    this._setFont(this._fontSize, this._fontName);
  }

  /**
   * フォント名を設定する
   */
  set fontName(value: string) {
    this._fontName = value;
    this._setFont(this._fontSize, this._fontName);
  }

  /**
   * テキストを測る
   * @param text
   * @returns
   */
  protected _measureText(text: string) {
    return this._context.measureText(text);
  }

  /**
   * フォントを設定する
   * @param size
   * @param fontName
   */
  private _setFont(size: string, fontName: string) {
    this.font = size + ' ' + fontName;
  }

  /**
   * フォントの高さを取得する
   */
  get fontHeight() {
    return this._fontHeight;
  }

  /**
   * フォント初期化
   * @param font
   */
  protected _initFont(font: { size: string; name: string; height: number }) {
    this._fontSize = font.size;
    this._fontName = font.name;
    this._fontHeight = font.height;
    this._adjustY = font.height / 2; // textBaselineの補正
  }

  /**
   * カーソル更新をクリアする
   */
  private _clearDirtyCursor() {
    this._dirtyCursor = false;
  }

  /**
   * ヘッダ変更
   */
  private _headerChange() {
    this._header.forEach((item, index) => {
      this._setItemPositionHeader(item, index);
    });
  }

  /**
   * フッター変更
   */
  private _footerChange() {
    const length = this._footer.length;
    this._footer.forEach((item, index) => {
      this._setItemPositionFooter(item, length - index);
    });
  }

  /**
   * 中身変更
   */
  private _bodyChange() {
    // 最大項目数チェック
    this._checkMax();
    this._body.forEach((item, index) => {
      this._setItemsPositionBody(item, index);
    });
    this._setScrollInfo();
    this._checkCursorIndex();
  }

  /**
   * 最大項目数確認
   * @returns
   */
  private _checkMax() {
    if (this._window.maxItem === undefined) {
      // 最大値定義なしなら
      // 列で割り切れる最大値を設定する
      this._maxItem = this._ceilColumn(this._body.length);
      return;
    }
    // スクロールしないかつ最大を超えていたら切り捨てる
    if (!this._scroll && this._body.length > this._maxItem) {
      this._body.length = this._maxItem;
    }
  }

  /**
   * header項目の位置設定
   * @param item
   * @param index
   */
  private _setItemPositionHeader(item: WindowItem, index: number) {
    // ヘッダはパディングだけを考慮
    item.x = this._paddingLeft + this._cursorWidth;
    item.y = this._paddingTop + index * this._itemHeight;
  }

  /**
   * footer項目の位置設定
   * @param item
   * @param index
   */
  private _setItemPositionFooter(item: WindowItem, index: number) {
    // 下からの位置
    item.x = this._paddingLeft + this._cursorWidth;
    item.y = this._height - index * this._itemHeight;
  }

  /**
   * body項目の位置設定
   * @param item
   * @param index
   */
  private _setItemsPositionBody(item: WindowItem, index: number) {
    // 項目が配列の場合
    if (Array.isArray(item)) {
      // 配列の確認なんかしなくても新しいクラスつくればよかったなあと思ったが今更なので放置
      item.forEach((value, topIndex) => {
        this._setItemPositionBody(value, index, topIndex);
      });
    } else {
      this._setItemPositionBody(item, index);
    }
  }

  /**
   * body項目１つの位置設定
   * @param item
   * @param index
   * @param topIndex 一項目中の縦要素の順番
   */
  private _setItemPositionBody(item: WindowItem, index: number, topIndex = 0) {
    // 本体はヘッダと列を考慮
    const top =
      this._header.length * this._itemHeight + topIndex * this._itemHeight;
    const cursorWidth = this._cursorWidth; // カーソルありならカーソルサイズが入っている
    const col = index % this._column;
    const colSpace = this._calcColGroupSpace(col);

    item.x =
      this._paddingLeft +
      col * this._itemWidth +
      (col + 1) * cursorWidth +
      colSpace;
    item.y =
      this._paddingTop +
      Math.floor(index / this._column) * this._itemHeight +
      top;
  }

  /**
   * 列グループ間隔を算出
   * @param index
   * @returns
   */
  private _calcColGroupSpace(col: number) {
    if (this._colGroupCount === 0) {
      return 0;
    }
    const count = Math.floor(col / this._colGroupCount);
    return count * this._colGroupSpace;
  }

  /**
   * スクロール情報を設定
   * @returns
   */
  private _setScrollInfo() {
    if (!this._scroll) {
      this._sliceBodies = [this._body];
      return;
    }
    // ページごとにまとめる
    const sliceItemList: Array<WindowItem[] | WindowItem[][]> = [];
    for (let i = 0; i < this.length; i += this._maxItem) {
      sliceItemList.push(this._body.slice(i, i + this._maxItem));
    }
    // 空白のページをフィルターする
    this._sliceBodies = sliceItemList.filter((items) => {
      for (const item of items) {
        if (Array.isArray(item)) {
          if (!item.every((item) => item.emptyText)) {
            return true;
          }
        } else {
          if (!item.emptyText) {
            return true;
          }
        }
      }
      return false;
    });
    // 空白のページを抜き取ったページ配列を統合する
    this._body = this._sliceBodies.flat() as WindowItem[] | WindowItem[][];
  }

  /**
   * カーソル位置の確認
   * 設定しているカーソル位置に項目がなければ補正する
   * @returns
   */
  private _checkCursorIndex() {
    if (!this._cursor) {
      return;
    }
    if (this._existText(this._body, this._cursorIndex)) {
      return;
    }
    // インデックス指定がマイナスなら先頭から
    // そうでなければ末尾から探していく
    if (this._cursorIndex < 0) {
      this._cursorIndex = this._body.findIndex((item) => {
        return item && !item.emptyText;
      });
    } else {
      this._cursorIndex = this._body.findLastIndex((item) => {
        return item && !item.emptyText;
      });
    }
  }

  /**
   * 指定されていない場合は計算で調整する
   * 横方向
   */
  protected _adjustWindowHorz() {
    if (this._column < 0 && this._window.row) {
      // 横要素を調整
      this._column = this._body.length / this._window.row;
      // 横幅も調整
      this._width = this._itemWidth * this._column + this._paddingLeft;
    }

    if (this._position === 'end') {
      // ｘ座標を調整
      this._offsetX -= this._width;
    }
  }

  /**
   * 指定されていない場合は計算で調整する
   * 縦方向
   */
  protected _adjustWindowVert() {
    if (this._height < 0) {
      // 最初のページのbodyを取得
      const body = this._getBody(0);
      const length = body?.length ?? 0;
      // 高さを調整
      const maxHeightItem =
        this._header.length +
        this._footer.length +
        Math.ceil(length / this._column);
      if (maxHeightItem > 0) {
        this._height = this._paddingTop + maxHeightItem * this._itemHeight;
      } else {
        this._height = 0;
      }
    }
  }

  /**
   * キャンバススタイルの初期化
   */
  //
  protected _initCanvasStyle() {
    // 他の形式だとフォントで指定したピクセルをはみ出してしまうのでmiddleにする
    this.textBaseline = 'middle';
    this._setFont(this._fontSize, this._fontName);
  }

  /**
   * ウィンドウ枠を描画
   * スクロールバーがあれば描画する
   */
  protected _drawFrame() {
    super._drawFrame();
    this._drawBorder();
    this._drawScrollBar();
  }

  /**
   * 区切りを描画
   * @returns
   */
  private _drawBorder() {
    // ヘッダ
    this._header.forEach((item) => {
      this._drawItemBorder(item, 0);
    });
    // 本体
    const body = this._getDisplayBody();
    const scrollTop = this._getScrollTop(this._cursorIndex);
    body?.forEach((item, index) => {
      if (Array.isArray(item)) {
        for (let i = 0; i < item.length; i++) {
          if (item[i].border && item[i].borderWidth <= 0) {
            if (index % this._column === 0) {
              // 先頭を対象とする
              this._drawItemBorder(item[i], scrollTop);
            }
            continue;
          }
          this._drawItemBorder(item[i], scrollTop, item[i].x - 4);
        }
      } else {
        if (item.borderWidth <= 0 && index % this._column === 0) {
          // 列の先頭を対象とする
          this._drawItemBorder(item, scrollTop);
        } else {
          this._drawItemBorder(item, scrollTop, item.x - 4);
        }
      }
    });
    // フッター
    this._footer.forEach((item) => {
      this._drawItemBorder(item, this._itemHeight);
    });
  }

  /**
   * 項目の区切り位置を描画
   * @param item
   * @param scrollTop 内部では一ページで表示する位置が設定されている
   * @returns
   */
  private _drawItemBorder(item: WindowItem, scrollTop: number, x = 0) {
    if (!item.border) {
      return;
    }
    const borderY = Math.floor((this._fontHeight + this._itemHeight) / 2);
    const top = item.y + borderY - scrollTop;
    this._drawBorderLine(
      item.borderLeft + x,
      top + item.borderTop,
      item.borderWidth,
      item.borderColorId < 0
        ? WindowFrame.getFontColor(item.colorId)
        : WindowFrame.getFrameColor(item.borderColorId)
    );
  }

  /**
   * 区切り線の描画
   * @param top
   * @param colorId
   */
  private _drawBorderLine(
    left: number,
    top: number,
    width: number,
    color: string
  ) {
    this.setFrameColor(color);
    if (width <= 0) {
      width = this._width - 8 - left;
    }
    this._drawLine(4 + left, top, width, 0, 1);
  }

  /**
   * スクロールバーの描画
   * @returns
   */
  private _drawScrollBar() {
    if (!this._enableScroll()) {
      return;
    }
    this.setFrameColor(WindowFrame.getFrameColor(this.scrollColorId));
    const realWidth = (this._width - 10) / this.maxPage;
    const page = this._getDisplayPage();
    const beginX = 5 + Math.floor(page * realWidth);
    const endX = 5 + Math.ceil((page + 1) * realWidth);
    this._lineRect(beginX, this._height - 4, endX - beginX, 1);
  }

  /**
   * スクロール可能か
   * @returns
   */
  private _enableScroll() {
    return this._scroll && this.maxPage > 1 ? true : false;
  }

  /**
   * 再構築
   * カーソルは構築しない
   * 必要ならsetFocus()で行う
   */
  refresh() {
    // ウィンドウを描画しなおし
    this._clear();

    this._drawBackground();
    this._drawFrame();
    // 項目を描画する
    this._drawItems();

    // ウィンドウ再描画設定
    this.setDirtyAllArea();
  }

  /**
   * 背景を描画
   */
  private _drawBackground() {
    this.setGroundColor(this._backColorId);
    this._fillRect(0, 0, this._width, this._height);
  }

  /**
   * 矩形を塗りつぶす
   * @param x
   * @param y
   * @param width
   * @param height
   */
  private _fillRect(x, y, width, height) {
    const ctx = this._context;
    ctx.fillRect(x, y, width, height);
  }

  /**
   * 項目を描画
   * @returns
   */
  private _drawItems() {
    // ヘッダ
    this._header.forEach((item) => {
      this._drawItem(item, 0);
    });
    // 本体
    const body = this._getDisplayBody();
    const scrollTop = this._getScrollTop(this._cursorIndex);
    body?.forEach((item) => {
      // 配列の場合はさらにforEach
      if (Array.isArray(item)) {
        item.forEach((value) => {
          this._drawItem(value, scrollTop);
        });
      } else {
        this._drawItem(item, scrollTop);
      }
    });
    // フッター
    this._footer.forEach((item) => {
      this._drawItem(item, 0);
    });
  }

  /**
   * 表示する本体項目を取得
   * @returns
   */
  private _getDisplayBody() {
    return this._getIndexBody(this._cursorIndex);
  }

  /**
   * インデックスのbodyを取得
   * @param index
   * @returns
   */
  private _getIndexBody(index: number) {
    // スクロールなしの場合はそのまま返す
    if (!this._scroll) {
      return this._body;
    }
    // 表示ページを返す
    const page = this._getIndexPage(index);
    return this._sliceBodies[page];
  }

  /**
   * 指定したページの本体を取得
   * @param page
   * @returns
   */
  private _getBody(page: number) {
    return this._scroll ? this._sliceBodies[page] : this._body;
  }

  /**
   * スクロールのトップ位置を取得
   * @param index
   * @returns
   */
  private _getScrollTop(index: number) {
    if (!this._scroll) {
      return 0;
    }
    return (
      this._getIndexPage(index) *
      (this._maxRow(this._maxItem) * this._itemHeight)
    );
  }

  /**
   * 表示ページを取得
   * @returns
   */
  //
  private _getDisplayPage() {
    return this._getIndexPage(this._cursorIndex);
  }

  /**
   * ページインデックスを取得
   * @param index
   * @returns
   */
  private _getIndexPage(index: number) {
    return this._scroll ? Math.floor(index / this._maxItem) : 0;
  }

  /**
   * 表示上のインデックス
   * @returns
   */
  private _getDisplayIndex() {
    return this._scroll ? this._cursorIndex % this._maxItem : this._cursorIndex;
  }

  /**
   * 実インデックスに変換
   * @param page
   * @param displayIndex
   * @returns
   */
  private _convertIndex(page, displayIndex) {
    if (!this._scroll) {
      return displayIndex;
    }
    return page * this._maxItem + displayIndex;
  }

  /**
   * 項目を描画する
   * @param item
   * @param scrollTop
   */
  private _drawItem(item: WindowItem, scrollTop: number) {
    item.parts.forEach((part) => {
      this._drawPart(
        part,
        item.x,
        item.y,
        part.colorId ?? item.colorId,
        scrollTop
      );
    });
  }

  /**
   * 部品を描画
   * @param part
   * @param itemX
   * @param itemY
   * @param scrollTop
   */
  private _drawPart(
    part: WindowItemParts,
    itemX: number,
    itemY: number,
    colorId: number,
    scrollTop: number
  ) {
    this.textAlign = part.textAlign || this._textAlign;
    const x = itemX + (part.left ?? 0);
    const y = itemY + (part.top ?? 0) - scrollTop;
    // テキスト描画
    this._drawPartText(part.text, x, y, colorId);
    // ボーダーなんかもあるけどまだ未実装
  }

  /**
   * テキスト部品を描画する
   * @param text
   * @param x
   * @param y
   * @param colorId
   */
  protected _drawPartText(text: string, x: number, y: number, colorId: number) {
    let begin = 0;
    let i = 0;
    const drawText = (index = i) => {
      const sliceText = text.slice(begin, index);
      this._drawText(sliceText, x, y, colorId);
      const matrix = this._measureText(sliceText);
      x += matrix.width;
    };

    while (i < text.length) {
      const c = text[i++];
      if (!this._checkEscapeCode(c)) {
        continue;
      }
      drawText(i - 1);
      const [width, length] = this._drawEscapeCharacter(text, i, x, y, colorId);
      x += width;
      i += length;
      begin = i;
    }
    drawText();
  }

  /**
   * 特殊文字か確認する
   * @param c
   * @returns
   */
  protected _checkEscapeCode(c: string) {
    return c === '\\';
  }

  /**
   * 特殊文字を描画する
   * @param text
   * @param begin
   * @param x
   * @param y
   * @param colorId
   * @returns [描画横幅, 特殊文字数]
   */
  protected _drawEscapeCharacter(
    text: string,
    begin: number,
    x: number,
    y: number,
    colorId: number
  ) {
    const c = text[begin];
    switch (c) {
      case 'i': {
        const [id, length] = this._getEscapeParam(text, begin + 1);
        const width = this._drawIcon(id, x, y, colorId);
        return [width, length + 1];
      }
    }
    return [0, 0];
  }

  /**
   * 特殊文字のパラメータを取得する
   * @param text
   * @param begin
   * @returns [パラメータ, 解析元の文字数]
   */
  protected _getEscapeParam(text: string, begin: number) {
    const result = /^\[\d+\]/.exec(text.slice(begin));
    if (!result) {
      return [0, 0];
    }
    return [parseInt(result[0].slice(1)), result[0].length];
  }

  /**
   * テキストを描画する
   * @param text
   * @param x
   * @param y
   * @returns
   */
  protected _drawText(text: string, x: number, y: number, colorId: number) {
    if (text.length === 0) {
      return;
    }
    this.setFontColor(colorId);
    this._context.fillText(text, x, y + this._adjustY);
  }

  /**
   * アイコンを描画する
   * @param index
   * @param x
   * @param y
   * @param colorId
   */
  protected _drawIcon(index: number, x: number, y: number, colorId: number) {
    if (index < 1) {
      return 0;
    }
    const image = WindowBase._Icons[colorId].canvas as HTMLCanvasElement;
    // テクスチャの高さを縦横のサイズとする
    const size = image.height;
    const srcX = (index - 1) * size;
    this._context.drawImage(image, srcX, 0, size, size, x, y, size, size);
    return size;
  }

  /**
   * カーソルを描画する
   * @param x
   * @param y
   */
  protected _drawCursor(x: number, y: number) {
    this.setFrameColor(WindowFrame.getFrameColor(this.cursorColorId));
    WindowBase._drawCursorToContext(this._context, x, y);
  }

  /**
   * 指定のコンテキストへカーソルを描画する
   * @param context
   * @param x
   * @param y
   */
  private static _drawCursorToContext(
    context: CanvasRenderingContext2D,
    x: number,
    y: number
  ) {
    context.beginPath();
    context.moveTo(x + 8, y + 2);
    context.lineTo(x + 14, y + 8);
    context.lineTo(x + 8, y + 14);
    context.closePath();

    context.fill();
  }

  /**
   * 指定の矩形を指定の座標に移動する
   * @param rect
   * @param x
   * @param y
   */
  protected _moveRect(rect, x, y) {
    const srcData = this._context.getImageData(
      rect.x,
      rect.y,
      rect.width,
      rect.height
    );
    this._context.putImageData(srcData, x, y);
  }

  /**
   * 矩形を一新する
   * ウィンドウ枠や項目は戻らないので注意
   * @param x
   * @param y
   * @param width
   * @param height
   */
  protected _refreshRect(x, y, width, height) {
    this.setGroundColor(this._backColorId);
    this._clearRect(x, y, width, height);
    this._fillRect(x, y, width, height);
  }

  // フレーム更新
  update() {
    if (this._cursor) {
      this._updateCursor();
    }
  }

  /**
   * カーソルを更新
   * @returns
   */
  private _updateCursor() {
    if (!this._cursor || !this._focus) {
      return;
    }
    this._updateAnimation();
    this.refreshCursor();
  }

  /**
   * カーソル移動開始前に呼ぶ
   */
  beginMoveCursor() {
    this._oldCursorIndex = this._cursorIndex;
  }

  /**
   * カーソル移動終了後に呼ぶ
   */
  endMoveCursor() {
    if (this._oldCursorIndex != this._cursorIndex) {
      this._resetAnimeCount();
    }
  }

  /**
   * カーソル移動
   * @param horz
   * @param vert
   * @param triggered
   */
  moveCursor(horz: number, vert: number, triggered: boolean) {
    this._moveCursorVert(vert, triggered);
    this._moveCursorHorz(horz, triggered);
  }

  /**
   * 垂直移動
   * @param vert
   * @param triggered
   * @returns
   */
  private _moveCursorVert(vert: number, triggered: boolean) {
    if (vert === 0) {
      return;
    }
    const page = this._getDisplayPage();
    const body = this._getDisplayBody();
    let nextIndex = this._getDisplayIndex();
    let newIndex = -1;
    // 縦が1の場合は探索しない
    const row = this._maxRow(body.length);
    const baseIndices: number[] = [];
    for (let i = 0; i < row - 1; i++) {
      nextIndex = this._nextVert(nextIndex, vert, triggered);
      if (nextIndex < 0) {
        break;
      }
      if (this._existText(body, nextIndex)) {
        newIndex = nextIndex;
        baseIndices.length = 0;
        break;
      }
      baseIndices.push(nextIndex);
    }

    // 横列を探す
    for (const index of baseIndices) {
      newIndex = this._findHorzNeighbor(index, body);
      if (newIndex < 0) {
        continue;
      }
      break;
    }

    if (newIndex >= 0) {
      this._cursorIndex = this._convertIndex(page, newIndex);
    }
  }

  private _nextVert(baseIndex: number, vert: number, triggered: boolean) {
    const body = this._getDisplayBody();
    const maxItem = this._ceilColumn(body.length);
    const rowIndex = Math.floor(baseIndex / this._column);
    const rowMax = this._maxRow(body.length);
    if (
      (vert > 0 && rowIndex !== rowMax - 1) ||
      (vert < 0 && rowIndex !== 0) ||
      (vert !== 0 && triggered)
    ) {
      return (baseIndex + this._column * vert + maxItem) % maxItem;
    }
    return -1;
  }

  private _findHorzNeighbor(baseIndex: number, body): number {
    // 左探索
    const left = Math.floor(baseIndex / this._column) * this._column;
    let start: number | null = null;
    for (let index = baseIndex - 1; index >= left; index -= 1) {
      if (this._existText(body, index)) {
        start = index;
        break;
      }
    }
    // 右探索
    const right = left + this._column;
    let end: number | null = null;
    for (let index = baseIndex + 1; index < right; index += 1) {
      if (this._existText(body, index)) {
        end = index;
        break;
      }
    }
    if (start !== null || end !== null) {
      if (start === null) {
        return end ?? 0;
      }
      if (end === null) {
        return start;
      }
      // 近いほうを設定
      return baseIndex - start < end - baseIndex ? start : end;
    }
    return -1;
  }

  // 水平移動
  private _moveCursorHorz(horz: number, triggered: boolean) {
    if (horz === 0) {
      return;
    }
    const page = this._getDisplayPage();
    const body = this._getDisplayBody();
    let nextIndex = this._getDisplayIndex();
    let newIndex = -1;
    const baseIndices: number[] = [];
    // 横が1の場合は探索しない
    for (let i = 0; i < this._column - 1; i++) {
      nextIndex = this._nextHorz(nextIndex, horz, triggered);
      if (nextIndex < 0) {
        break;
      }
      if (this._existText(body, nextIndex)) {
        newIndex = nextIndex;
        baseIndices.length = 0;
        break;
      }
      baseIndices.push(nextIndex);
    }
    // 楯列を探す
    for (const index of baseIndices) {
      newIndex = this._findVertNeighbor(index, body);
      if (newIndex < 0) {
        continue;
      }
      break;
    }

    if (newIndex >= 0) {
      this._cursorIndex = this._convertIndex(page, newIndex);
    } else if (this._enableScroll()) {
      // スクロール
      this._cursorIndex = this._nextPage(page, horz);
      this.refresh();
    }
  }

  private _nextHorz(baseIndex, horz, triggered) {
    const body = this._getDisplayBody();
    const maxItem = this._ceilColumn(body.length);
    const colIndex = baseIndex % this._column;
    const colMax = this._column;
    if ((horz > 0 && colIndex !== colMax - 1) || (horz < 0 && colIndex !== 0)) {
      return (baseIndex + horz + maxItem) % maxItem;
    } else if (horz !== 0 && triggered && !this._enableScroll()) {
      return (baseIndex + (colMax - 1) * -horz + maxItem) % maxItem;
    }
    return -1;
  }

  private _findVertNeighbor(baseIndex, body): number {
    const maxItem = this._ceilColumn(body.length);
    // 上探索
    const top = 0;
    let upper: number | null = null;
    for (
      let index = baseIndex - this._column;
      index >= top;
      index -= this._column
    ) {
      if (this._existText(body, index)) {
        upper = index;
        break;
      }
    }
    // 下探索
    const bottom = top + maxItem;
    let down: number | null = null;
    for (
      let index: number = baseIndex + this._column;
      index < bottom;
      index += this._column
    ) {
      if (this._existText(body, index)) {
        down = index;
        break;
      }
    }
    if (upper !== null || down !== null) {
      if (upper === null) {
        return down ?? 0;
      }
      if (down === null) {
        return upper;
      }
      // 近いほうを設定
      return baseIndex - upper < down - baseIndex ? upper : down;
    }
    return -1;
  }

  private _nextPage(page, horz) {
    const baseIndex = this._getDisplayIndex();
    const newPage = (page + horz + this.maxPage) % this.maxPage;
    const body = this._getBody(newPage);
    // 見つかるまで全探す
    const row = baseIndex % this._column;
    const col = Math.floor(baseIndex / this._column);
    const baseIndices: number[] = [];
    for (let i = 0; i < this._column; i++) {
      const nextIndex =
        ((row + i * horz + this._column) % this._column) + this._column * col;

      if (this._existText(body, nextIndex)) {
        return this._convertIndex(newPage, nextIndex);
      }
      baseIndices.push(nextIndex);
    }
    for (const index of baseIndices) {
      const newIndex = this._findVertNeighbor(index, body);
      if (newIndex < 0) {
        continue;
      }
      return this._convertIndex(newPage, newIndex);
    }
    // 見つからなかったらもとのまま返す
    return this._convertIndex(page, baseIndex);
  }

  /**
   * 行切り上げ
   * @param length
   * @returns
   */
  private _ceilColumn(length: number) {
    return this._maxRow(length) * this._column;
  }

  /**
   * 最大列
   * @param length
   * @returns
   */
  private _maxRow(length: number) {
    const colMax = this._column;
    return Math.floor((length + colMax - 1) / colMax);
  }

  /**
   * テキストが存在するか
   * @param body
   * @param index
   * @returns
   */
  private _existText(body, index: number) {
    return body[index] && !body[index].emptyText ? true : false;
  }

  /**
   * カーソル部分の領域を再描画してから
   * カーソルを描画する
   * 文字やウィンドウに重なるカーソルは想定していない
   * その場合はView側で描画が必要
   * @returns
   */
  refreshCursor() {
    if (!this._cursor) {
      return;
    }

    const move = this._cursorIndex !== this._oldCursorIndex;
    // 移動した場合は前のカーソルを消去
    if (
      move &&
      this._oldCursorIndex < this._body.length &&
      this._oldCursorIndex >= 0
    ) {
      const index = this._oldCursorIndex;
      const item = this._body[index];
      const scrollTop = this._getScrollTop(index);
      this._refreshCursorRect(item, scrollTop);
      this._oldCursorIndex = this._cursorIndex;
    }

    // 表示非表示が切り替わったかカーソルが移動したとき
    const cursorView = this._viewCursor();
    if (
      (this._oldCursorView !== cursorView || move) &&
      this._cursorIndex < this._body.length &&
      this._cursorIndex >= 0
    ) {
      this._oldCursorView = cursorView;
      const item = this._body[this._cursorIndex];
      const scrollTop = this._getScrollTop(this._cursorIndex);
      if (cursorView) {
        this._refreshCursorDraw(item, scrollTop);
      } else {
        this._refreshCursorRect(item, scrollTop);
      }
    }
  }

  /**
   * カーソル描画を一新する
   * @param item
   * @param scrollTop
   */
  private _refreshCursorDraw(item, scrollTop: number) {
    const cursorWidth = this._cursorWidth;
    const x = item.x - cursorWidth;
    const y = item.y - scrollTop;
    if (this._focus) {
      // フォーカスされている場合は更新フラグをつける
      this._dirtyCursor = true;
    } else {
      // フォーカスされていない場合はウィンドウに埋め込む
      this._drawCursor(x, y);
    }
    this.pushDirtyRect(x, y, cursorWidth, cursorWidth);
  }

  /**
   * 指定項目のカーソル矩形を一新する
   * @param item
   * @param scrollTop
   */
  private _refreshCursorRect(item, scrollTop: number) {
    const cursorWidth = this._cursorWidth;
    const x = item.x - cursorWidth;
    const y = item.y - scrollTop;
    this.pushDirtyRect(x, y, cursorWidth, cursorWidth);
  }

  /**
   * アニメーション更新
   */
  protected _updateAnimation() {
    this._updateAnimeCount();
    this._animeCount %= ECursor.MaxCount;
  }

  /**
   * フォーカスの設定
   * 入力の対象
   * 有効無効をすることでカーソルが描画されるようになる
   * @param state
   */
  setFocus(state: boolean) {
    this._focus = state;
    if (this._cursor) {
      this._initCursor();
    }
  }

  /**
   * カーソルをリセットする
   */
  resetCursor() {
    this._initCursor();
  }

  /**
   * カーソル初期化
   */
  private _initCursor() {
    this._resetAnimeCount();
    this._clearDirtyCursor();
    // 前のカーソルを今のに合わせる
    this._oldCursorIndex = this._cursorIndex;
    this._oldCursorView = false;
    this.refreshCursor();
  }

  /**
   * カーソルが表示されているか
   * @returns
   */
  protected _viewCursor() {
    return Math.floor(this._animeCount / ECursor.SwitchCount) < 1;
  }

  /**
   * カーソルのアニメカウントを更新
   */
  private _updateAnimeCount() {
    this._animeCount += 1;
  }

  /**
   * カーソルのアニメカウントをリセット
   */
  protected _resetAnimeCount() {
    this._animeCount = 0;
  }

  /**
   * カーソル非表示のカウントにする
   * カーソルは表示、非表示の2パターン
   */
  protected _hideAnimeCount() {
    this._animeCount = ECursor.SwitchCount;
  }

  /**
   * 更新矩形を描画する
   * @param ctx
   */
  drawDirtyRect(ctx: CanvasRenderingContext2D) {
    super.drawDirtyRect(ctx);
    this._drawDirtyCursor(ctx);
  }

  /**
   * 更新カーソルを描画
   * @param ctx
   * @returns
   */
  private _drawDirtyCursor(ctx: CanvasRenderingContext2D) {
    if (!this._dirtyCursor) {
      return;
    }
    this._clearDirtyCursor();
    const item = this._getBodyItem(this._cursorIndex);
    if (!item) {
      return;
    }
    const scrollTop = this._getScrollTop(this._cursorIndex);
    const cursorWidth = this._cursorWidth;
    const x = item.x - cursorWidth + this._offsetX;
    const y = item.y - scrollTop + this._offsetY;
    ctx.fillStyle = WindowFrame.getFrameColor(this.cursorColorId);
    WindowBase._drawCursorToContext(ctx, x, y);
  }

  /**
   * 指定のインデックスのbody項目を取得する
   * 配列の場合は先頭を返す
   * @param index
   * @returns
   */
  private _getBodyItem(index: number): WindowItem {
    const item = this._body[index];
    return Array.isArray(item) ? item[0] : item;
  }

  /**
   * 設置
   * @param header
   * @param body
   * @param object
   */
  setup(header: WindowItem[], body: WindowItem[] | WindowItem[][], object) {
    this._setContents(header, body, object);

    // 可変の可能性がある値をリセットする
    this._resetValue();

    // 自動要素再計算横方向
    // paddingLeftが変化するのでbodyChangeより先に行う必要がある
    this._adjustWindowHorz();

    this._headerChange();
    this._bodyChange();

    // 自動要素再計算縦方向
    // こちらはbodyChangeの結果に依存
    this._adjustWindowVert();

    this._footerChange();

    // サイズが変わっていたらキャンバスサイズを変更する
    this._changeCanvasSize();
    this.refresh();
  }

  /**
   * 中身を設定する
   * @param extra
   */
  private _setContents(
    header: WindowItem[],
    body: WindowItem[] | WindowItem[][],
    object
  ) {
    this._outer = header;
    this._body = body;
    this._object = object;
  }

  /**
   * ヘッダーテキストを設定する
   * @param index
   * @param text
   * @returns
   */
  setHeaderText(index: number, text: string) {
    const item = this._outer[index];
    if (!item) {
      return;
    }
    item.parts[0].text = text;
  }

  /**
   * 本体のテキストを設定する
   * @param index
   * @param text
   * @param order indexで指定した項目の中のパーツ順序
   * @returns
   */
  setBodyText(index: number, text: string, order: number) {
    const item = this._getBodyItem(index);
    if (!item) {
      return;
    }
    const part = item.parts[order];
    part.text = text;
  }
}
