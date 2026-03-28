import { WindowData } from './DataTypes';
import Utils from './Utils';
import { WindowBase, WindowExtra, WindowFrame } from './WindowBase';

/**
 * メッセージを表示するウィンドウ
 */
export class WindowMessage extends WindowBase {
  /**
   * 待機フレーム
   */
  private _waitCount: number = 0;
  /**
   * 自動待機するかどうか
   * する場合一時停止アイコンがでず自動で進む
   */
  private _autoWait: boolean = false;
  /**
   * 自動で一時停止するかどうか
   */
  private _autoPause: boolean = true;
  /**
   * キー入力待ち
   */
  private _pause: boolean = false;
  /**
   * ポーズアイコンを更新するかどうか
   */
  private _dirtyPause: boolean = false;
  /**
   * 表示テキストをクリアするかどうか
   */
  private _clearText: boolean = false;
  /**
   * メッセージ状態
   */
  private _messageState: WindowMessageState = new WindowMessageState();
  /**
   * ポーズアイコンの横幅
   */
  private _pauseWidth: number = 16;
  /**
   * スクロールの速度（１回の移動量）
   */
  private _scrollSpeed: number = 8;
  /**
   * 自動ウェイト時の速度
   */
  private _speed: number = 30;
  /**
   * １回で描画する文字数
   * 0なら一行全部
   */
  private _drawSize: number = 2;
  /**
   * 基点行のスタック
   */
  private _baseLineStack: number[] = [];
  /**
   * ベースライン巻き上げするか
   */
  private _hoistBaseLine: boolean = false;
  /**
   * ウィンドウに表示できる最大行数
   */
  private _row: number = this._window.row ?? 3;
  /**
   * スクロールする高さのpx
   */
  private _scrollSize: number = 0;
  /**
   * スクロール終了後のコールバック
   */
  private _endScrollFn: (() => void) | null = null;
  /**
   * セリフ音有効無効
   */
  private _wordsSound: boolean = false;
  /**
   * セリフ音のコールバック
   */
  private _wordsSoundFn: (() => void) | null = null;
  /**
   * 字下げサイズ
   */
  private _indentSize: number = 0;
  /**
   * 待機テーブル
   */
  private static WAIT_TABLE: number[] = [0, 20, 25, 30, 35, 40, 45, 50, 60];

  /**
   * コンストラクタ
   * @param window
   * @param extra
   */
  constructor(window: WindowData, extra: WindowExtra) {
    super(window, extra);
    this._scroll = false;
  }

  /**
   * 開始可能状態か
   */
  get ready() {
    return this._messageState.ready;
  }

  /**
   * 待機状態か
   */
  get wait() {
    // メッセージ表示中、ウェイト、休止すべて待機
    return this._waitCount > 0;
  }

  /**
   * 休止状態か
   */
  get pause() {
    return this._pause;
  }

  /**
   * 処理中か
   */
  get processing(): boolean {
    // 待機か停止かメッセージ表示中
    const state = this._messageState;
    return this._waiting || !state.endOfText();
  }

  /**
   * 自動待機か
   */
  get autoWait() {
    return this._autoWait;
  }

  /**
   * 自動ポーズか
   */
  get autoPause() {
    return this._autoPause;
  }

  /**
   * 待ち状態か
   */
  get _waiting() {
    return this.wait || this.pause || this._scroll;
  }

  /**
   * 一括表示モード
   */
  setBatchMode(clearText: boolean) {
    this._autoPause = false;
    this._clearText = clearText;
    this._hoistBaseLine = true;
    this._drawSize = 0;
  }

  /**
   * 自動待機モード
   * 設定された速度分ウェイトがかかる
   */
  autoWaitMode(): void {
    this._autoWait = true;
  }

  /**
   * 自動待機なし
   */
  noWaitMode(): void {
    this._autoWait = false;
  }

  /**
   * 自動ポーズを設定する
   * @param value
   */
  setAutoPause(value: boolean) {
    this._autoPause = value;
  }

  /**
   * ウェイトカウントを加算
   * @param value
   */
  addWaitCount(value: number) {
    this._waitCount += value;
  }

  /**
   * 自動ウェイト時間の設定
   * @returns
   */
  private _setAutoWait(): void {
    if (!this._autoWait) {
      return;
    }
    this._waitCount = this._speed;
    this._checkPauseWait();
  }

  /**
   * ウェイトを設定
   * @param speed
   */
  setWait(speed: number) {
    this._waitCount = this._getWaitSpeed(speed);
    this._checkPauseWait();
  }

  /**
   * メッセージ音のコールバックを設定
   * @param fn
   */
  setWordsSound(fn: (() => void) | null) {
    this._wordsSoundFn = fn;
  }

  /**
   * 字下げサイズを設定
   * @param size
   */
  setIndent(size: number) {
    this._indentSize = (size * this.fontHeight) / 2;
  }

  /**
   * ポーズ状態のウェイトなら
   * ポーズにする
   */
  private _checkPauseWait() {
    if (this._waitCount < 0) {
      this.beginPause();
      this._waitCount = 0;
    }
  }

  /**
   * １ブロック追加する
   * @param blockText
   */
  addMessageBlock(blockText: string) {
    this._addMessage(blockText, true);
  }

  /**
   * ブロック内に行を追加する
   * @param lineText
   */
  addMessageLine(lineText: string) {
    this._addMessage(lineText, false);
  }

  /**
   * 基準行までさかのぼって行を追加する
   * @param lineText
   */
  addMessageBaseLine(lineText: string) {
    this._addMessage(lineText, false);
  }

  /**
   * メッセージを追加する
   * @param addText
   * @param block
   */
  private _addMessage(addText: string, block: boolean) {
    // 改行を\nに統一
    const text = addText.replace(/\r\n|\\n/g, '\n');
    const state = this._messageState;
    if (block) {
      // 自動ポーズのときはテキスト消去が無効になる
      this._setNewBlock(this._clearText && !this._autoPause);
    }
    this._checkHoistBaseLine(text);
    if (state.ready) {
      state.incLine(block ? 0 : 1);
    }
    state.setText(text);
    this._wordsSound = false;
  }

  /**
   * 新しいブロックの場合の設定
   */
  private _setNewBlock(reset: boolean) {
    // 行を続けない場合は行数をリセットする
    this._messageState.resetLineCount(reset);
    if (reset) {
      this._eraseMessage();
    }
    // 基点をリセット
    this.clearBaseLine();
  }

  /**
   * ベースライン巻き上げを行う
   * @param text
   * @returns
   */
  private _checkHoistBaseLine(text: string) {
    if (!this._hoistBaseLine) {
      return;
    }
    const count = (text.match(/\n/g)?.length ?? 0) + 1;
    const state = this._messageState;
    // 表示領域がなければベースラインを巻き上げていく
    if (!state.innerArea(this._row - count)) {
      let line: number | undefined;
      while ((line = Utils.lastElement(this._baseLineStack)) !== undefined) {
        if (line - 1 + count < this._row) {
          break;
        }
        this._baseLineStack.pop();
      }
      if (line === undefined) {
        // ベースラインがなくなった場合、先頭を入れる
        this._baseLineStack.push(0);
        line = 0;
      }
      this._setBaseLine(line);
    }
  }

  /**
   * 基準行を設定する
   * ない場合は1行目になる
   * @returns
   */
  private _setBaseLine(baseLine: number) {
    const state = this._messageState;
    // 設定されているインデックス以下の画面をクリアする
    const left = this._adjustLeft(0);
    const top = this._adjustTop(baseLine * this._itemHeight);
    const width = this._width - left * 2;
    const height = (this._row - baseLine) * this._itemHeight;
    this._refreshRect(left, top, width, height);
    this.setDirtyAllArea();
    state.setYIndex(baseLine - 1);
  }

  /**
   * 基準行を追加する
   * yIndex + 1 となるが not ready 時は 0 行目となる
   * ready and yIndex = 0 時は0
   */
  pushBaseLine() {
    const baseline = this._messageState.ready
      ? this._messageState.yIndex + 1
      : 0;
    this._baseLineStack.push(baseline);
  }

  /**
   * 基準行を削除する
   */
  popBaseLine() {
    const line = this._baseLineStack.pop();
    if (line === undefined) {
      return;
    }
    this._setBaseLine(line);
  }

  /**
   * 基準行を初期化する
   */
  clearBaseLine() {
    this._baseLineStack = [];
  }

  /**
   * 行をリセットする
   */
  resetLine() {
    this._setNewBlock(true);
  }

  /**
   * ベースライン巻き上げするかどうかを設定する
   * @param value
   */
  setHoistBaseLine(value: boolean) {
    this._hoistBaseLine = value;
  }

  /**
   * 描画サイズを設定する
   * @param value
   */
  setDrawSize(value: number) {
    this._drawSize = value;
  }

  /**
   * 表示メッセージを消去する
   */
  private _eraseMessage() {
    const state = this._messageState;
    state.resetViewPosition();
    this.refresh();
  }

  /**
   * 再構築
   */
  refresh() {
    super.refresh();
    this._drawStoreMessage();
  }

  /**
   * 表示済みメッセージを描画する
   */
  private _drawStoreMessage() {
    const state = this._messageState;
    if (!state.hasDrewTexts()) {
      return;
    }
    const drewTexts = state.drewTexts;
    const start =
      drewTexts.length - this._row < 0 ? 0 : drewTexts.length - this._row;
    const colorId = this.fontColorId;
    for (let i = start; i < drewTexts.length; i++) {
      const x = this._adjustLeft(0) + state.drewIndents[i];
      const y = this._adjustTop((i - start) * this._itemHeight);
      this._drawText(drewTexts[i], x, y, colorId);
    }
  }

  /**
   * 待機速度を設定
   * @param speed
   */
  setWaitSpeed(speed: number) {
    this._speed = this._getWaitSpeed(speed);
  }

  /**
   * インデックスから待機速度を取得する
   * @param index
   * @returns
   */
  private _getWaitSpeed(index: number) {
    return index >= 0 && index < WindowMessage.WAIT_TABLE.length
      ? WindowMessage.WAIT_TABLE[index]
      : -1;
  }

  /**
   * メッセージを出し切ったか
   */
  didMessageOut() {
    // メッセージが終了しているかつスクロール中でない
    return this._messageState.endOfText() && this._scroll === false;
  }

  /**
   * ポーズ開始
   */
  beginPause() {
    if (this._pause) {
      return;
    }
    this._pause = true;
    this._resetAnimeCount();
    this._refreshPause();
  }

  /**
   * ポーズ終了
   */
  endPause() {
    if (!this._pause) {
      return;
    }
    this._pause = false;
    // ポーズ領域を消去
    this._hideAnimeCount();
    this._refreshPause();
  }

  /**
   * スクロール開始
   * @param scrollRow
   */
  private _startScroll(
    scrollRow: number,
    endScrollFn: (() => void) | null = null
  ) {
    this._scroll = true;
    this._scrollSize = scrollRow * this._itemHeight;
    this._endScrollFn = endScrollFn;
  }

  /**
   * スクロール停止
   */
  private _stopScroll() {
    this._scroll = false;
    if (this._endScrollFn !== null) {
      this._endScrollFn();
      this._endScrollFn = null;
    }
  }

  /**
   * ここで追加したメッセージを描画していく
   */
  update() {
    if (this._waitCount > 0) {
      this._waitCount -= 1;
      return;
    }
    // 入力待ち状態
    if (this._pause) {
      this._updatePause();
      return;
    }

    if (this._scroll) {
      this._updateScroll();
      return;
    }
    if (this._messageState.endOfText()) {
      // 最後まで処理されているのでテキスト処理は行わない
      return;
    }

    this._updateView();
  }

  /**
   * 表示更新
   */
  private _updateView() {
    const state = this._messageState;

    // 表示領域がなければ
    // スクロール
    if (!state.innerArea(this._row)) {
      this._startScroll(1);
      return;
    }

    // 1行切り取って
    // 制御
    // 文字表示
    // の順に処理する
    const sliceResult = state.sliceLineText(this._drawSize);
    this._updateText(sliceResult.text);
    state.addDrewText(sliceResult.text);

    switch (sliceResult.code) {
      case ECtrlCode.NewLine:
        state.incLine(1);
        break;
    }
    switch (sliceResult.additional) {
      case EAdditionalCode.StartSpeech:
        this._wordsSound = true;
        break;
    }

    // テキスト終了処理
    this._updateEndOfText();
  }

  /**
   * テキストの更新
   * @param text
   */
  private _updateText(text: string) {
    if (text.length === 0) {
      return;
    }
    const state = this._messageState;
    const indentSize = state.afterLineBreak ? this._indentSize : 0;
    const x = this._adjustLeft(state.x) + indentSize;
    const y = this._adjustTop(state.yIndex * this._itemHeight);
    const colorId = this.fontColorId;
    this._drawText(text, x, y, colorId);
    state.setDrewIndent(indentSize);

    // 進んだ分表示位置を更新
    const info = this._measureText(text);
    state.addX(info.width);

    // 描画範囲更新
    this.setDirtyAllArea();
    // セリフ音再生
    this._playWordsSound();
  }

  /**
   * 描画開始位置Xの調整
   * @param x
   */
  private _adjustLeft(x: number): number {
    return this._paddingLeft + x;
  }

  /**
   * 描画開始位置Yの調整
   * @param y
   */
  private _adjustTop(y: number): number {
    return this._paddingTop + y;
  }

  /**
   * メッセージ音の再生
   */
  private _playWordsSound() {
    if (this._wordsSound) {
      this._wordsSoundFn?.();
    }
  }

  /**
   * テキスト終了時の更新
   */
  private _updateEndOfText() {
    const state = this._messageState;
    // メッセージが残っていれば処理なし
    if (!state.endOfText()) {
      return;
    }
    const diff = state.getDifferTop();
    if (diff > 0) {
      // 差の行分スクロール
      this._startScroll(diff, () => this._setAutoWait());
    } else {
      this._setAutoWait();
    }
  }

  /**
   * スクロール
   */
  private _updateScroll() {
    const speed = this._scrollSpeed;
    // 画像を移動
    const left = this._paddingLeft;
    const top = this._paddingTop;
    // rowは２以上ある前提
    const height = this._itemHeight * (this._row - 1) + this.fontHeight - speed;
    const rect = Utils.rect(left, top + speed, this._width - left * 2, height);
    this._moveRect(rect, left, top);
    let clearHeight = speed;
    if (clearHeight >= this.fontHeight) {
      clearHeight = this.fontHeight;
    }
    const reTop =
      top +
      this._itemHeight * (this._row - 1) +
      (this.fontHeight - clearHeight);
    this._refreshRect(left, reTop, rect.width, clearHeight);
    this.setDirtyAllArea();

    // スクロール関係の保持値変更
    this._scrollSize -= speed;
    if (this._scrollSize % this._itemHeight === 0) {
      const state = this._messageState;
      state.scrollY();
    }

    // スクロールが必要なければフラグを落とす
    if (this._scrollSize <= 0) {
      this._stopScroll();
    }
  }

  /**
   * ポーズ状態の更新
   */
  private _updatePause() {
    const oldView = this._viewCursor();
    this._updateAnimation();
    // 表示状態が変わったときかすでに更新要求を
    // かけられている場合だけ更新
    if (oldView !== this._viewCursor() || this.dirty) {
      this._refreshPause();
    }
  }

  /**
   * ポーズを一新する
   */
  private _refreshPause() {
    const pauseWidth = this._pauseWidth;
    const x = (this._width - pauseWidth) / 2;
    const y = this._height - 20;

    if (this._viewCursor()) {
      this._dirtyPause = true;
    }
    this.pushDirtyRect(x, y, pauseWidth, pauseWidth);
  }

  /**
   * 指定のコンテキストへポーズを描画する
   * @param context
   * @param x
   * @param y
   * @param width
   */
  private static _drawPauseToContext(
    context: CanvasRenderingContext2D,
    x: number,
    y: number
  ) {
    context.beginPath();
    context.moveTo(x + 2, y + 6);
    context.lineTo(x + 8, y + 12);
    context.lineTo(x + 14, y + 6);
    context.closePath();

    context.fill();
  }

  /**
   * 更新矩形を描画する
   * @param ctx
   */
  drawDirtyRect(ctx: CanvasRenderingContext2D) {
    super.drawDirtyRect(ctx);
    this._drawDirtyPause(ctx);
  }

  /**
   * 更新ポーズを描画
   * @param ctx
   * @returns
   */
  private _drawDirtyPause(ctx: CanvasRenderingContext2D) {
    if (!this._dirtyPause) {
      return;
    }
    const x = (this._width - this._pauseWidth) / 2 + this._offsetX;
    const y = this._height - 20 + this._offsetY;
    ctx.fillStyle = WindowFrame.getFrameColor(this.cursorColorId);
    WindowMessage._drawPauseToContext(ctx, x, y);
    this._dirtyPause = false;
  }
}

const enum ECtrlCode {
  Empty,
  NewLine,
}

const enum EAdditionalCode {
  None,
  StartSpeech,
}

type SliceLineResult = {
  text: string;
  code: ECtrlCode;
  additional: EAdditionalCode;
};

/**
 * メッセージ状態を保持するクラス
 */
class WindowMessageState {
  /**
   * 開始可能状態か
   */
  private _ready: boolean;
  /**
   * テキストデータ
   */
  private _text: string;
  /**
   * _textデータの表示が改行まで達したか
   */
  private _afterLineBreak: boolean;
  /**
   * 描画済みテキストデータ
   * 行単位で保持する
   */
  private _drewTexts: string[];
  /**
   * 描画済みインデントサイズ
   * 行単位で保持する
   */
  private _drewIndents: number[];
  /**
   * textのインデックス
   */
  private _index: number;
  /**
   * 内部行数
   */
  private _lineCount: number;
  /**
   * X座標
   */
  private _x: number;
  /**
   * Y座標のインデックス
   */
  private _yIndex: number;

  /**
   * コンストラクタ
   */
  constructor() {
    this.clear();
  }

  /**
   * 開始可能かどうか
   */
  get ready() {
    return this._ready;
  }

  /**
   * X座標取得
   */
  get x() {
    return this._x;
  }

  /**
   * Y座標のインデックス取得
   */
  get yIndex() {
    return this._yIndex;
  }

  /**
   * ２行目以降かどうか
   */
  get afterSecondLine() {
    return this._lineCount > 1;
  }

  /**
   * 改行が行われたか
   */
  get afterLineBreak() {
    return this._afterLineBreak;
  }

  /**
   * 状態クリア
   */
  clear() {
    this._text = '';
    this._afterLineBreak = false;
    this.resetIndex();
    this.resetLineCount(true);
    this.resetViewPosition();
  }

  /**
   * インデックスのリセット
   */
  resetIndex() {
    this._index = 0;
  }

  /**
   * 行数のリセット
   */
  resetLineCount(reset: boolean) {
    if (reset) {
      this._ready = false;
    }
    this._lineCount = 1;
    this._drewTexts = [''];
    this._drewIndents = [0];
  }

  /**
   * 表示位置クリア
   */
  resetViewPosition() {
    this._x = 0;
    this._yIndex = 0;
  }

  /**
   * テキストを設定する
   * @param text
   */
  setText(text: string) {
    this._ready = true;
    this._text = text;
    this._afterLineBreak = false;
    this.resetIndex();
    if (this._yIndex < 0) {
      this.setYIndex(0);
    }
  }

  /**
   * Yインデックスを設定する
   * @param value
   */
  setYIndex(value: number) {
    this._yIndex = value;
  }

  /**
   * インデックスを進める
   */
  incIndex() {
    this._index += 1;
  }

  /**
   * 行を進める
   */
  incLine(incCount: number) {
    this._lineCount += incCount;
    this._x = 0;
    this._yIndex += 1;
    this._afterLineBreak = true;
    this._drewTexts.push('');
    this._drewIndents.push(0);
  }

  /**
   * 描画済みテキストに加算する
   * @param text
   */
  addDrewText(text: string) {
    this._drewTexts[this._drewTexts.length - 1] += text;
  }

  /**
   * 描画済みインデントに設定する
   * @param indent インデント
   */
  setDrewIndent(indent: number) {
    this._drewIndents[this._drewIndents.length - 1] = indent;
  }

  /**
   * 描画済みテキストを取得する
   * @returns
   */
  get drewTexts() {
    return this._drewTexts;
  }

  /**
   * 描画済みテキストがあるか
   * 初期状態から追加がある場合はある
   * @returns
   */
  hasDrewTexts() {
    return this._drewTexts.length > 1 || this._drewTexts[0].length > 0;
  }

  /**
   * 描画済みインデントを取得する
   */
  get drewIndents() {
    return this._drewIndents;
  }

  /**
   * X位置を加算する
   * @param movX
   */
  addX(movX: number) {
    this._x += movX;
    return this._x;
  }

  /**
   * スクロール反映
   */
  scrollY() {
    this._yIndex -= 1;
  }

  /**
   * 文末に達しているか
   */
  endOfText(): boolean {
    return this._index >= this._text.length;
  }

  /**
   * 表示領域内かどうかを取得
   * @param row
   * @returns
   */
  innerArea(row: number): boolean {
    return this._yIndex < row;
  }

  /**
   * 現在位置一文字取得
   * @returns
   */
  getChar(): string {
    return this._text[this._index];
  }

  /**
   * 残り文字数取得
   * @returns
   */
  getRestTextLength(): number {
    return this._text.length - this._index;
  }

  /**
   * 現在の行の指定文字数を取得
   * 制御文字が入ったらその時点で止める
   * 制御文字はcodeに入る
   * @param size
   */
  sliceLineText(size: number): SliceLineResult {
    const restLength = this.getRestTextLength();
    if (size <= 0 || size >= restLength) {
      size = this.getRestTextLength();
    }

    const result: SliceLineResult = this._slice(size);
    // おまけのコードチェック
    // 制御コードで終わらなかった場合はおまけで次の文字をチェックする
    if (result.code === ECtrlCode.Empty) {
      result.code = this._nextCharacterCtrlCode();
    }
    return result;
  }

  /**
   * サイズ分テキストを切り取る
   * @param size
   * @returns
   */
  private _slice(size: number): SliceLineResult {
    const result: SliceLineResult = {
      text: '',
      code: ECtrlCode.Empty,
      additional: EAdditionalCode.None,
    };
    for (let i = 0; i < size; i++) {
      const c = this.getChar();
      this.incIndex();
      const code = this._checkCtrlCode(c);
      if (code !== ECtrlCode.Empty) {
        result.code = code;
        break;
      }
      const additional = this._checkAdditionalCode(c);
      if (additional !== EAdditionalCode.None) {
        result.additional = additional;
      }
      result.text += c;
    }
    return result;
  }

  private _nextCharacterCtrlCode() {
    const c = this.getChar();
    const code = this._checkCtrlCode(c);
    if (code !== ECtrlCode.Empty) {
      this.incIndex();
    }
    return code;
  }

  /**
   * 制御コードを判別
   * @param c
   */
  private _checkCtrlCode(c: string): ECtrlCode {
    switch (c) {
      case '\n':
        return ECtrlCode.NewLine;
      default:
        return ECtrlCode.Empty;
    }
  }

  private _checkAdditionalCode(c: string): EAdditionalCode {
    switch (c) {
      case '「':
        return EAdditionalCode.StartSpeech;
      default:
        return EAdditionalCode.None;
    }
  }

  /**
   * 表示位置と先頭位置の差
   */
  getDifferTop() {
    return this._yIndex - this._lineCount + 1;
  }
}
