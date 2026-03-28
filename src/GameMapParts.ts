import { EMap } from './GameConfig';
import { Graphics } from './Graphics';

/**
 * 部屋表示のクラス
 */
export class GameMapRoom {
  /**
   * 部屋を表示するカウント
   */
  private _roomOpenCount: number;
  private _roomOpening: boolean;
  private _fnRoomOpen: (() => void) | null;
  private _roomCloseCount: number;
  private _roomClosing: boolean;
  private _fnRoomClose: (() => void) | null;

  /**
   * コンストラクタ
   * @param args
   */
  constructor() {
    this._roomOpenCount = 0;
    this._roomOpening = false;
    this._fnRoomOpen = null;
    this._roomCloseCount = 0;
    this._roomClosing = false;
    this._fnRoomClose = null;
  }

  /**
   * 処理中か
   */
  get processing() {
    return this._roomOpening || this._roomClosing;
  }

  /**
   * 展開カウントを取得
   */
  get roomOpenCount() {
    return this._roomOpenCount;
  }

  /**
   * 展開中か
   */
  get roomOpening() {
    return this._roomOpening;
  }

  /**
   * 閉じるカウントを取得
   */
  get roomCloseCount() {
    return this._roomCloseCount;
  }

  /**
   * 閉じ中か
   */
  get roomClosing() {
    return this._roomClosing;
  }

  /**
   * 展開開始
   * @param fn
   */
  startOpen(fn: (() => void) | null) {
    this._roomOpening = true;
    this._roomOpenCount = this.maxCount();
    this._fnRoomOpen = fn;
  }

  /**
   * 閉じる開始
   * @param fn
   */
  startClose(fn: (() => void) | null) {
    this._roomClosing = true;
    this._roomCloseCount = this.maxCount();
    this._fnRoomClose = fn;
  }

  /**
   * 最大カウント
   */
  maxCount() {
    // でかいほうの半分
    return Math.ceil(Math.max(Graphics.width, Graphics.height) / 2);
  }

  /**
   * 更新
   */
  update() {
    this._updateOpen();
    this._updateClose();
  }

  /**
   * 展開の更新
   */
  private _updateOpen() {
    if (!this._roomOpening) {
      return;
    }
    if (this._roomOpenCount <= 0) {
      this._roomOpening = false;
      this._fnRoomOpen?.();
      return;
    }
    // カウントダウン
    this._roomOpenCount = Math.max(this._roomOpenCount - EMap.TileSize, 0);
  }

  /**
   * 閉じるの更新
   */
  private _updateClose() {
    if (!this._roomClosing) {
      return;
    }
    if (this._roomCloseCount <= 0) {
      this._roomClosing = false;
      this._fnRoomClose?.();
      return;
    }
    // カウントダウン
    this._roomCloseCount = Math.max(this._roomCloseCount - EMap.TileSize, 0);
  }
}

/**
 * 範囲クラス
 */
export class GameRange {
  private _left: number;
  private _top: number;
  private _right: number;
  private _bottom: number;
  static empty = new GameRange(0, 0, 0, 0);

  /**
   * コンストラクタ
   * @param args
   */
  constructor(x: number, y: number, width: number, height: number) {
    this._left = x;
    this._top = y;
    this._right = x + width;
    this._bottom = y + height;
  }

  /**
   * X座標を取得する
   */
  get x() {
    return this._left;
  }

  /**
   * Y座標を取得する
   */
  get y() {
    return this._top;
  }

  /**
   * パラメータを配列で取得する
   * @returns
   */
  toArray(): [number, number, number, number] {
    return [
      this._left,
      this._top,
      this._right - this._left,
      this._bottom - this._top,
    ];
  }

  /**
   * 範囲内か
   * @param x
   * @param y
   */
  within(x: number, y: number) {
    if (
      this._left <= x &&
      this._right > x &&
      this._top <= y &&
      this._bottom > y
    ) {
      return true;
    }
    return false;
  }

  /**
   * 範囲外か
   * @param x
   * @param y
   */
  out(x: number, y: number) {
    return !this.within(x, y);
  }

  /**
   * 無効領域か
   */
  invalid() {
    return this._left === this._right || this._top === this._bottom;
  }

  /**
   * 重なっているか
   * @param left
   * @param top
   * @param right
   * @param bottom
   */
  overlap(left: number, top: number, right: number, bottom: number) {
    if (this.invalid()) {
      return false;
    }
    const horz = left < this._right && this._left < right;
    const vert = top < this._bottom && this._top < bottom;
    return horz && vert;
  }
}

/**
 * 部屋クラス
 */
export class GameRoom extends GameRange {
  /**
   * コンストラクタ
   * @param _roomId 部屋Id
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    private _roomId: number
  ) {
    super(x, y, width, height);
  }

  /**
   * 部屋Idを取得
   */
  get roomId() {
    return this._roomId;
  }
}

/**
 * 地域クラス
 */
export class GameRegion extends GameRange {
  /**
   * コンストラクタ
   * @param _areaId エリアId
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    private _areaId: number
  ) {
    super(x, y, width, height);
  }

  /**
   * エリアIdを取得
   */
  get areaId() {
    return this._areaId;
  }
}
