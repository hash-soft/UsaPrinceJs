import { GameSound } from './AudioUtils';
import { Skill, EItemKind, Item } from './DataTypes';
import {
  actions,
  gameFlags,
  gameMenus,
  gameParty,
  gameTemp,
  gameTroop,
  gameVariables,
  items as dataItems,
  system,
  skillLists,
  terms,
  troops,
} from './DataStore';
import { GameAction } from './GameAction';
import { EBaseParamId } from './GameBattler';
import { GameMember } from './GameMember';
import { GameMenu, MenuResult } from './GameMenu';
import { GameShopItem, GameUtils } from './GameUtils';
import {
  CancelOperations,
  DecideOperations,
  EInputOperation,
  Input,
  MessageOperations,
} from './Input';
import Utils from './Utils';
import { WindowBase } from './WindowBase';
import { WindowMessage } from './WindowMessage';
import {
  getFlag,
  getSlot,
  getSlotNumber,
  setFlag,
  setSlot,
  sliceSlot,
} from './DataUtils';
import { GameItem } from './GameItem';
import { GameActionEffect } from './GameActionUtils';

/**
 * メッセージオプション
 */
export const enum EMessageOption {
  Refresh,
  Plus,
  BaseLine,
  WaitCount,
  Speed,
  AutoWaitMode,
  NoWaitMode,
  Pause,
  WordsSound,
  Indent,
  Suspend,
  AutoPause,
  Mode,
  HoistBaseLine,
  PushBaseLine,
  PopBaseLine,
  ResetLine,
  InputWait,
  DrawSize,
  RefSpeed,
  None,
  SettingsOption = 3,
}

export const enum EMessageMode {
  Normal,
  MidstBattle,
  BattleResult,
}

/**
 * メッセージキューの型
 */
type MessageQueue = { text: string | null; mode: string };

/**
 * メッセージベースクラス
 */
abstract class GameMessageBase extends GameMenu {
  /**
   * メッセージキュー
   */
  protected _queue: MessageQueue[] = [];
  /**
   * 更新時に実行される関数
   */
  private _updateFrame: () => { action: string } = this._updateMessage;
  /**
   * 休止状態かどうか
   * 休止状態なら更新処理をしない
   */
  private _suspend: boolean = false;
  /**
   * 自動ポーズ無効機関
   */
  private _invalidAutoPause: boolean = false;
  /**
   * 入力待ち時間
   * マイナスなら無限
   */
  private _inputWait: number = -1;
  /**
   * 待ち時間カウンタ
   */
  private _waitCount: number = 0;

  /**
   * 処理中かどうか
   */
  get processing() {
    const window = this._getMessageWindow();
    return window.processing || this._queue.length > 0;
  }

  /**
   * 復帰か確認する
   * @param focus
   * @param params
   * @returns
   */
  override checkRestore(
    focus: GameMenu | null,
    params: Array<number | string>
  ): boolean {
    return (
      super.checkRestore(focus, params) &&
      GameMessageBase._useQueueOption(params)
    );
  }

  /**
   * ウィンドウ構築完了時
   */
  protected _didConstruct() {
    super._didConstruct();
    this._setOptionParam();
  }

  /**
   * コールバックメソッドを設定
   * メッセージの場合はfnがnullの場合更新しない
   * @param fn
   */
  override setFn(fn?: (number?, any?) => void) {
    if (fn) {
      super.setFn(fn);
    }
  }

  /**
   * オプションパラメータの設定
   * params
   * 0:テキスト
   * 1:オプションコード
   * 2:値
   */
  private _setOptionParam() {
    switch (this._optionParam) {
      case EMessageOption.Refresh: // メッセージ表示消去
        this._pushMessage(this._textParam, 'refresh');
        break;
      case EMessageOption.Plus: // 続きのメッセージ
        this._pushMessage(this._textParam, 'plus');
        break;
      case EMessageOption.BaseLine: // 起点を設定してのメッセージ
        this._pushMessage(this._textParam, 'baseLine');
        break;
      case EMessageOption.WaitCount: // ウェイトカウント設定
        this._setWait(this._valueParam);
        break;
      case EMessageOption.Speed: // 速度の設定
        this._setWaitSpeed(this._valueParam);
        break;
      case EMessageOption.AutoWaitMode: // 自動待機モード
        this._autoWaitMode();
        break;
      case EMessageOption.NoWaitMode: // ウェイトなしモード
        this._noWaitMode();
        break;
      case EMessageOption.Pause: // ポーズ
        this._invalidAutoPause = true;
        this._getMessageWindow().beginPause();
        break;
      case EMessageOption.WordsSound: // 文字表示音
        this._setWordsSound(this._valueParam);
        break;
      case EMessageOption.Indent: // 字下げ
        this._setIndent(this._valueParam);
        break;
      case EMessageOption.Suspend: // 休止
        this._setSuspend(!!this._valueParam);
        break;
      case EMessageOption.AutoPause: // 自動ポーズするか
        this._setAutoPause(!!this._valueParam);
        break;
      case EMessageOption.Mode: // モード設定
        this._setMode(this._valueParam);
        break;
      case EMessageOption.HoistBaseLine: // ベースライン巻き上げするか
        this._setHoistBaseLine(!!this._valueParam);
        break;
      case EMessageOption.PushBaseLine: // 基点行を追加
        this._pushBaseLine();
        break;
      case EMessageOption.PopBaseLine: // 基点行を削除
        this._popBaseLine();
        break;
      case EMessageOption.ResetLine: //行のリセット
        this._resetLine();
        break;
      case EMessageOption.InputWait: //入力待ち時間
        this._setInputWait(this._valueParam);
        break;
      case EMessageOption.DrawSize: // 描画文字数
        this._setDrawSize(this._valueParam);
        break;
      case EMessageOption.RefSpeed: // 速度の設定（参照）
        this._setWaitSpeed(getSlotNumber(this._valueParam));
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this._textParam && this._pushMessage(this._textParam, 'refresh');
    }
  }

  /**
   * テキストパラメータを取得
   */
  private get _textParam(): string {
    return this._params[0] as string;
  }

  /**
   * オプションパラメータを取得
   */
  private get _optionParam(): EMessageOption {
    return this._params[1] as EMessageOption;
  }

  /**
   * キューを使うオプションかどうか
   * @param params
   * @returns
   */
  private static _useQueueOption(params: Array<number | string>) {
    const option = params[1] as EMessageOption;
    return option < EMessageOption.WaitCount;
  }

  /**
   * 値パラメータを取得
   */
  private get _valueParam(): number {
    return this._params[2] as number;
  }

  /**
   * メッセージをキューに追加する
   * @param nText
   * @param mode
   */
  private _pushMessage(nText: string, mode: string) {
    const text = this._convertMessageText(nText);
    this._queue.push({ text, mode });
  }

  /**
   * 待機時間を設定する
   * @param speed
   */
  private _setWait(speed: number) {
    const window = this._getMessageWindow();
    window.setWait(speed);
  }

  /**
   * 自動待機モード
   */
  private _autoWaitMode() {
    const window: WindowMessage = this._getMessageWindow();
    window?.autoWaitMode();
  }

  /**
   * 待機なしモード
   */
  private _noWaitMode() {
    const window: WindowMessage = this._getMessageWindow();
    window?.noWaitMode();
  }

  /**
   * 待機速度の設定
   * 自動待機モードのときの待機時間
   * @param speed
   */
  private _setWaitSpeed(speed: number) {
    const window: WindowMessage = this._getMessageWindow();
    window.setWaitSpeed(speed);
  }

  /**
   * セリフ音を設定
   * @param soundId
   */
  private _setWordsSound(soundId: number) {
    const window: WindowMessage = this._getMessageWindow();
    const fn = soundId === 0 ? null : () => GameSound.play(soundId);
    window.setWordsSound(fn);
  }

  /**
   * 字下げの設定
   * @param size
   */
  private _setIndent(size: number) {
    const window: WindowMessage = this._getMessageWindow();
    window.setIndent(size);
  }

  /**
   * 休止の設定
   * @param value
   */
  private _setSuspend(value: boolean) {
    this._suspend = value;
  }

  /**
   * 自動一時停止の設定
   * @param value
   */
  private _setAutoPause(value: boolean) {
    const window: WindowMessage = this._getMessageWindow();
    window.setAutoPause(value);
  }

  /**
   * モードの設定
   * @param value
   */
  private _setMode(value: number) {
    switch (value) {
      case EMessageMode.MidstBattle:
        this._setMidstBattleMode();
        break;
      case EMessageMode.BattleResult:
        this._setBattleResultMode();
    }
  }

  /**
   * 戦闘中モード設定
   */
  private _setMidstBattleMode() {
    const window: WindowMessage = this._getMessageWindow();
    window.setBatchMode(true);
    window.autoWaitMode();
    window.setWaitSpeed(0);
  }

  /**
   * 戦闘結果モード設定
   */
  private _setBattleResultMode() {
    const window: WindowMessage = this._getMessageWindow();
    window.setBatchMode(false);
    window.autoWaitMode();
    window.setWaitSpeed(0);
  }

  /**
   * ベースライン巻き上げするかどうかを設定する
   * @param value
   */
  private _setHoistBaseLine(value: boolean) {
    const window: WindowMessage = this._getMessageWindow();
    window.setHoistBaseLine(value);
  }

  /**
   * 基準行を追加する
   */
  private _pushBaseLine() {
    const window: WindowMessage = this._getMessageWindow();
    window.pushBaseLine();
  }

  /**
   * 基準行を削除する
   */
  private _popBaseLine() {
    const window: WindowMessage = this._getMessageWindow();
    window.popBaseLine();
  }

  /**
   * 行をリセットする
   * 戦闘中は基本的にこれ＋add
   */
  private _resetLine() {
    const window: WindowMessage = this._getMessageWindow();
    window.resetLine();
  }

  /**
   * 入力待ち時間を設定する
   * @param value
   */
  private _setInputWait(value: number) {
    this._inputWait = value;
  }

  private _setDrawSize(value: number) {
    const window: WindowMessage = this._getMessageWindow();
    window.setDrawSize(value);
  }

  /**
   * update郡
   * @returns
   */
  updateMenu() {
    if (this._suspend) {
      return this._updateNone();
    }
    return this._updateFrame();
  }

  /**
   * コマンド実行中
   * @returns
   */
  private _updateMessage() {
    const window: WindowMessage = this._getMessageWindow();
    // 停止中
    if (window.wait) {
      return this._updateNone();
    }
    // 入力待ち
    if (window.pause) {
      const result = this._pauseWait(window);
      if (result !== null) {
        return result;
      }
    }

    // 設定されたメッセージを出し切っている
    if (window.didMessageOut()) {
      const result = this._nextMessage(window);
      if (result !== null) {
        return result;
      }
    } else {
      return this._updateNone();
    }

    // 入力チェック
    if (
      Input.isTriggeredOperations(MessageOperations) ||
      !this._checkInputWait()
    ) {
      this._waitCount = 0;
      // 0以上だと音が鳴ってしまうので
      return this._updateDecide(-4);
    }
    return this._updateNone();
  }

  /**
   * ポーズ待ち処理
   * @param window
   */
  protected _pauseWait(window: WindowMessage): MenuResult | null {
    if (
      Input.isTriggeredOperations(MessageOperations) ||
      !this._checkInputWait()
    ) {
      this._waitCount = 0;
      window.endPause();
      return this._pauseWaitUpdateNext();
    }
    return this._updateNone();
  }

  /**
   * 入力待ちを確認する
   * @returns
   */
  private _checkInputWait() {
    if (this._inputWait < 0) {
      return true;
    }
    return this._waitCount++ < this._inputWait;
  }

  /**
   * ポーズ待ち時にボタンを押したときの戻り値
   * @returns
   */
  protected _pauseWaitUpdateNext() {
    return this._updateNext();
  }

  /**
   * 次のメッセージ処理
   * @param window
   */
  protected _nextMessage(window: WindowMessage): MenuResult | null {
    const info = this._queue.shift();
    // 次のメッセージが設定された
    if (info !== undefined) {
      if (this._checkAutoPause(window)) {
        window.beginPause();
      }
      this._setMessage(info);
      this._invalidAutoPause = false;
      return this._updateNone();
    }
    return null;
  }

  /**
   * 自動ポーズするか確認する
   * @param window
   */
  private _checkAutoPause(window: WindowMessage) {
    // オートウェイトでない
    // かつメッセージを一度でも設定した
    // かつ復帰でない
    // かつ自動停止無効期間でない
    return (
      window.autoPause &&
      !window.autoWait &&
      window.ready &&
      !this.restore &&
      !this._invalidAutoPause
    );
  }

  /**
   * パラメータ更新時
   */
  protected _updateParams(): void {
    this._setOptionParam();
  }

  /**
   * 次ブロックにメッセージを追加するメッセージを追加する
   * @param text
   */
  private _addBlockMessage(text) {
    this._addMessage(text, (text: string) => {
      const window: WindowMessage = this._getMessageWindow();
      window.addMessageBlock(text);
    });
  }

  /**
   * 次行にメッセージを追加する
   * @param text
   */
  private _addLineMessage(text) {
    this._addMessage(text, (text: string) => {
      const window: WindowMessage = this._getMessageWindow();
      window.addMessageLine(text);
    });
  }

  /**
   * 基準行までさかのぼってメッセージを追加する
   * @param text
   */
  private _addBaseLineMessage(text) {
    this._addMessage(text, (text: string) => {
      const window: WindowMessage = this._getMessageWindow();
      window.addMessageBaseLine(text);
    });
  }

  /**
   * 文章を追加
   * @param text
   * @param fn
   */
  private _addMessage(text, fn: (text: string) => void) {
    fn(text);
  }

  /**
   * 文章の設定
   * @param info
   */
  protected _setMessage(info: MessageQueue) {
    switch (info.mode) {
      case 'refresh':
        this._addBlockMessage(info.text);
        break;
      case 'plus':
        this._addLineMessage(info.text);
        break;
      case 'baseLine':
        this._addBaseLineMessage(info.text);
        break;
      default:
        this._addBlockMessage(info.text);
    }
  }

  /**
   * 文章の表示用の変換
   * @param text
   */
  protected _convertMessageText(text) {
    // スロット文字展開
    text = this._replaceSlotStringText(text);
    // 展開された後変換処理
    text = this._convertTextGlobal(text);

    return text;
  }

  /**
   * メッセージウィンドウを取得
   */
  protected _getMessageWindow(): WindowMessage {
    return this.windowList[0] as WindowMessage;
  }
}

/**
 * 移動中のメッセージウィンドウ
 */
export class GameMessage extends GameMessageBase {
  /**
   * フォント情報を取得
   */
  protected _getFontInfo() {
    return { size: '24px', name: system.fonts[2].name, height: 24 };
  }
}

/**
 * メッセージ以外のベースクラス
 */
export class GameMenuBase extends GameMenu {
  /**
   * 更新メソッドの入れ物
   */
  protected _updateFrame: () => MenuResult = this._updateActive;
  /**
   * 親のメニューデータ
   */
  private _parent: GameMenu | undefined;
  /**
   * 追加データ
   */
  private _extras: Array<number | string>;

  /**
   * 追加データを取得する
   */
  get extras() {
    return this._extras;
  }

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    this._setParent(this._getParentId());
    this._makeExtras();
  }

  /**
   * 追加データを作成する
   * @returns
   */
  private _makeExtras() {
    const startId = this._getExtraStartId();
    const countId = this._getExtraCountId();
    if (!startId || !countId) {
      this._extras = [];
      return;
    }
    const count = getSlot(countId) as number;
    this._extras = sliceSlot(startId, startId + count);
  }

  /**
   * 初期インデックスを取得
   * @returns
   */
  protected override _getInitIndex(): number {
    return this._params[0] as number;
  }

  /**
   * 親メニューIdを取得
   * @returns
   */
  protected _getParentId(): number {
    return (this._params[1] as number) ?? 0;
  }

  /**
   * 追加データ開始Idを取得
   * @returns
   */
  protected _getExtraStartId(): number {
    return this._params[2] as number;
  }

  /**
   * 追加データ数Idを取得
   * @returns
   */
  protected _getExtraCountId() {
    return this._params[3] as number;
  }

  /**
   * ウィンドウ用のスロットに設定する
   * @param n
   * @param value
   */
  protected _setSlot(n: number, value: number | string) {
    setSlot(41 + n, value);
  }

  /**
   * 親を設定する
   * @param id
   */
  private _setParent(id: number) {
    this._parent = gameMenus.find(id);
  }

  /**
   * 親に設定されているメニューを取得する
   */
  get parent() {
    return this._parent;
  }

  /**
   * パラメータ更新時
   */
  protected _updateParams(): void {
    this._refreshItems();
  }

  /**
   * 項目の色を取得
   * @param win
   * @param object
   * @param index
   * @returns
   */
  override getItemColor(win: WindowBase, object: unknown, index: number) {
    const window = win.window;
    if (!window.stateColor) {
      return 0;
    }
    const element = this._getMemberObject(win, object, index);
    if (!element) {
      const firstWindow = this.firstWindow;
      if (firstWindow !== win) {
        return this.getItemColor(
          firstWindow,
          firstWindow.object,
          firstWindow.index
        );
      }
      if (this.parent) {
        const focus = this.parent.focusWindow;
        return this.parent.getItemColor(focus, focus.object, focus.index);
      }
      return 0;
    }
    return this._getStateColorId(element);
  }

  /**
   * メニュー内のメンバーオブジェクトを取得する
   * @param win
   * @param object
   * @param index
   * @returns
   */
  private _getMemberObject(win: WindowBase, object: unknown, index: number) {
    const element = this._checkMemberObject(object, index);
    const firstWindow = this.firstWindow;
    if (element || win === firstWindow) {
      return element;
    }
    return this._checkMemberObject(firstWindow.object, firstWindow.index);
  }

  /**
   * GameMemberオブジェクトか確認する
   * @param object
   * @param index
   * @returns
   */
  private _checkMemberObject(object: unknown, index: number) {
    const element = Array.isArray(object) ? object[index] : object;
    if (!element) {
      return;
    }
    if (element instanceof GameMember) {
      return element as GameMember;
    } else if (typeof element['partyOrderIndex'] === 'number') {
      return gameParty.getMember(element['partyOrderIndex']);
    }
    return;
  }

  /**
   * メニュー更新
   * @returns
   */
  updateMenu() {
    return this._updateFrame();
  }

  /**
   * アクティブ時の更新メソッド
   * @returns
   */
  protected _updateActive() {
    return GameMenu.RETURN_NONE;
  }

  protected _getMainWindow() {
    return this.windowList[0];
  }
}

/**
 * 表示ウィンドウ
 * 入力を持たない
 */
export class GameMenuShow extends GameMenuBase {
  /**
   * 制御を持たない
   */
  get modeless() {
    return true;
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    // なにもうけつけない
    // 外部からしか終了できない
    return this._updateNone();
  }
}

/**
 * 固定ウィンドウ
 * 選択はできないが入力は検知する
 */
export class GameMenuFix extends GameMenuBase {
  updateMenu() {
    return this._updateFrame();
  }

  /**
   * update郡
   * 入力されたら結果を返す
   * @returns
   */
  protected _updateActive() {
    // 操作ウィンドウを取得
    const window = this._getMainWindow();

    if (!window.focus) {
      return this._updateNone();
    }

    // キャンセル
    if (Input.isTriggeredOperation(EInputOperation.Close)) {
      return this._updateDecide(-1, null);
    }
    // オールキャンセル
    // キャンセル
    if (Input.isTriggeredOperation(EInputOperation.AllClose)) {
      return this._updateDecide(-2, null);
    }

    // 決定
    if (Input.isTriggeredOperations(DecideOperations)) {
      return this._updateDecide(0, null);
    }

    return this._updateNone();
  }
}

/**
 * 数値入力ウィンドウ
 * インデックスを入力値代わりにする
 */
export class GameMenuNumberEdit extends GameMenuBase {
  /**
   * 初期値
   */
  private _initialValue: number = 0;
  /**
   * 入力値
   */
  private _inputValue: number = 0;

  /**
   * 入力値を取得する
   */
  get inputValue() {
    return this._inputValue;
  }

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    this._initialValue = this._getInitIndex();
    this._inputValue = this._initialValue;
  }

  /**
   * メニュー更新部
   * @returns
   */
  updateMenu() {
    return this._updateFrame();
  }

  /**
   * update郡
   * 入力されたら結果を返す
   * @returns
   */
  protected _updateActive() {
    // 操作ウィンドウを取得
    const window = this._getMainWindow();

    if (!window.focus) {
      return this._updateNone();
    }

    this._updateSelectKey(window);

    // オールキャンセル
    // キャンセル
    if (Input.isTriggeredOperations(CancelOperations)) {
      return this._updateDecide(this._initialValue, null);
    }

    // 決定
    if (Input.isTriggeredOperations(DecideOperations)) {
      return this._updateDecide(this._inputValue, null);
    }

    return this._updateNone();
  }

  /**
   * 選択キーの更新
   * @param window
   */
  protected _updateSelectKey(window: WindowBase): void;
  protected _updateSelectKey() {
    const oldValue = this._inputValue;
    // 方向キーの解析
    if (Input.isRepeatedOperation(EInputOperation.Down)) {
      this._inputValue = Math.max(this._inputValue - 10, -9999999);
    }
    if (Input.isRepeatedOperation(EInputOperation.Up)) {
      this._inputValue = Math.min(this._inputValue + 10, 9999999);
    }
    if (Input.isRepeatedOperation(EInputOperation.Right)) {
      this._inputValue = Math.min(this._inputValue + 1, 9999999);
    }
    if (Input.isRepeatedOperation(EInputOperation.Left)) {
      this._inputValue = Math.max(this._inputValue - 1, -9999999);
    }
    if (oldValue !== this._inputValue) {
      this._changeWindowItems(this._getMainWindow());
    }
  }
}

/**
 * 選択ウィンドウ
 */
export class GameMenuSelect extends GameMenuBase {
  /**
   * ウィンドウのrefresh完了時に呼ばれる
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      // カーソル位置が超過していたら最後の要素に合わせる
      if (win.index >= win.length) {
        win.setIndex(win.length - 1);
      }
    }
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = () => {
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 更新部本体
   * @param fnDecide
   * @param fnCancel
   * @param fnChange
   * @param fnEmpty
   * @returns
   */
  protected _updateActiveBody(
    fnDecide,
    fnCancel,
    fnChange,
    fnEmpty = fnCancel
  ) {
    // 操作ウィンドウを取得
    const window = this._getSelectWindow();

    if (!window.focus) {
      return this._updateNone();
    }

    // 要素がなかったらキャンセル扱い
    if (window.length <= 0) {
      return fnEmpty(-3);
    }

    const oldIndex = window.index;
    this._updateSelectKey(window);
    if (oldIndex !== window.index) {
      const object = window.object && window.object[window.index];
      return fnChange(window.index, object);
    }

    return this._updateInputButton(fnDecide, fnCancel);
  }

  /**
   * 選択キーの更新
   * @param window
   */
  protected _updateSelectKey(window: WindowBase) {
    window.beginMoveCursor();
    // 方向キーの解析
    if (Input.isRepeatedOperation(EInputOperation.Down)) {
      window.moveCursor(0, 1, Input.isTriggeredOperation(EInputOperation.Down));
    }
    if (Input.isRepeatedOperation(EInputOperation.Up)) {
      window.moveCursor(0, -1, Input.isTriggeredOperation(EInputOperation.Up));
    }
    if (Input.isRepeatedOperation(EInputOperation.Right)) {
      window.moveCursor(
        1,
        0,
        Input.isTriggeredOperation(EInputOperation.Right)
      );
    }
    if (Input.isRepeatedOperation(EInputOperation.Left)) {
      window.moveCursor(
        -1,
        0,
        Input.isTriggeredOperation(EInputOperation.Left)
      );
    }
    window.endMoveCursor();
  }

  /**
   * ボタン入力の更新
   * @param fnDecide
   * @param fnCancel
   * @returns
   */
  private _updateInputButton(
    fnDecide: (n: number, object: unknown) => number,
    fnCancel: (n: number) => number
  ) {
    // キャンセル
    if (Input.isTriggeredOperation(EInputOperation.Close)) {
      this._resetCursor();
      return fnCancel(-1);
    }
    // オールキャンセル
    // キャンセル
    if (Input.isTriggeredOperation(EInputOperation.AllClose)) {
      this._resetCursor();
      return fnCancel(-2);
    }

    // 決定
    const window = this._getSelectWindow();
    if (Input.isTriggeredOperations(DecideOperations)) {
      this._resetCursor();
      const object = window.object && window.object[window.index];
      return fnDecide(window.index, object);
    }

    return this._updateNone();
  }

  /**
   * カーソルをリセットする
   */
  private _resetCursor() {
    this._getSelectWindow().resetCursor();
  }

  /**
   * 選択ウィンドウを取得する
   * @returns
   */
  protected _getSelectWindow() {
    return this.windowList[0];
  }
}

/**
 * 名前リストメニュー
 */
export class GameMenuNameList extends GameMenuSelect {
  /**
   * 名前リストを返す
   */
  get nameList() {
    return this.extras as string[];
  }
}

interface SaveItem {
  saveInfo: string;
  resumeInfo: string;
}
/**
 * セーブリストメニュー
 */
export class GameSaveNameList extends GameMenuSelect {
  /**
   * 名前リストを返す
   */
  get saveList() {
    const extras = this.extras as string[];
    const length = Math.floor(extras.length / 2);
    const list: SaveItem[] = [];
    for (let i = 0; i < length; i++) {
      list.push({
        saveInfo: extras[2 * i],
        resumeInfo: extras[2 * i + 1] || 'なし',
      });
    }
    return list;
  }

  /**
   * カラーコードIdを調整する
   * @param colorId
   * @param object
   * @param index
   */
  protected override _adjustColor(
    colorId: number | undefined,
    object: unknown,
    index: number
  ): number | undefined {
    if (index === 0) {
      return colorId;
    }
    const saveItem = object as SaveItem;
    if (saveItem.resumeInfo !== 'なし') {
      return colorId;
    } else {
      return 4;
    }
  }
}

/**
 * 道具メニュー
 */
export class GameMenuItem extends GameMenuSelect {
  /**
   * 道具一覧
   */
  private _items!: GameItem;

  /**
   * 道具選択可能メンバー
   */
  get members() {
    return gameParty.itemMembers;
  }

  /**
   * 道具一覧を取得する
   */
  get items() {
    return this._items;
  }

  /**
   * ウィンドウが作成されたとき
   * @param win
   * @param index
   */
  protected override _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      this._items = win.object[win.index].items;
    }
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      // インデックス補正
      const index =
        n < 0 ? n : gameParty.members.findIndex((member) => member === object);
      return this._updateDecide(index, object);
    };
    const fnChange = (n) => {
      this._updateItem(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 道具の内容を変更する
   * @param index
   */
  protected _updateItem(index: number) {
    const itemWin = this._getItemWindow();
    // 道具の中身を作って設定する
    const win = this._getSelectWindow();
    this._items = win.object[index].items;
    this._changeWindowItems(itemWin);
  }

  /**
   * 道具ウィンドウを取得する
   * @returns
   */
  private _getItemWindow() {
    return this.windowList[1];
  }
}

/**
 * 道具選択メニュー
 */
export class GameMenuItemChoice extends GameMenuSelect {
  /**
   * 選択道具
   */
  private _item: GameItem;

  /**
   * 選択道具を取得する
   */
  get item() {
    return this._item;
  }

  /**
   * ウィンドウ更新時に呼ばれる
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      this._item = win.object[win.index];
    }
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = (n) => {
      this._updateMote(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 説明の内容を変更する
   * @param n
   */
  private _updateMote(n: number) {
    const noteWin = this._getNoteWindow();
    const win = this._getSelectWindow();
    this._item = win.object[n];
    this._changeWindowItems(noteWin);
  }

  /**
   * 説明ウィンドウを取得する
   * @returns
   */
  protected _getNoteWindow() {
    return this.windowList[1];
  }
}

/**
 * じゅもんメニュー
 */
export class GameMenuSpell extends GameMenuSelect {
  /**
   * 技能の種類
   */
  private _kind: string = ' ';
  /**
   * 選択スキル
   */
  private _skills: Skill[] = [];

  /**
   * 技能の種類を取得する
   */
  get kind() {
    return this._kind;
  }

  /**
   * 技能一覧を取得する
   */
  get skills() {
    return this._skills;
  }

  /**
   * ウィンドウ更新後の処理
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      this._updateProperties(win.object[win.index]);
    }
  }

  /**
   * 技能の内容を更新する
   * @param index
   */
  private _updateSpell(index: number) {
    const spellWin = this._getSpellWindow();
    // 技能の中身を作って設定する
    this._updateProperties(this._getSelectWindow().object[index]);
    this._changeWindowItems(spellWin);
  }

  /**
   * プロパティの中身を更新する
   * @param member
   */
  private _updateProperties(member: GameMember) {
    this._skills = member.skills;
    this._kind =
      this._skills.length > 0
        ? terms[skillLists[member.battleSkillListId].termId]
        : ' ';
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = (n) => {
      this._updateSpell(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 技能ウィンドウを取得する
   * @returns
   */
  private _getSpellWindow() {
    return this.windowList[1];
  }
}

/**
 * 呪文選択メニュー
 */
export class GameMenuSpellChoice extends GameMenuSelect {
  /**
   * 選択スキル
   */
  protected _skill: Skill | null = null;
  /**
   * 使用メンバー
   */
  protected _member!: GameMember;

  /**
   * 選択スキルを取得する
   */
  get skill() {
    return this._skill;
  }

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    this._setMember();
  }

  /**
   * メンバーを設定する
   */
  protected _setMember() {
    this._member = this.parent?.firstSelectedObject;
  }

  /**
   * ウィンドウ再構築時
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      this._skill = win.object[win.index];
      this._setNote();
    }
  }

  /**
   * メモ欄を設定する
   */
  private _setNote() {
    this._setNoteText();
    this._setMpInfo();
  }

  /**
   * 説明を設定する
   * @returns
   */
  private _setNoteText() {
    const note = this._skill?.note;
    if (!note) {
      this._setSlot(0, '');
      this._setSlot(1, '');
      this._setSlot(2, '');
      return;
    }
    this._setSlot(0, note[0] ?? '');
    this._setSlot(1, note[1] ?? '');
    this._setSlot(2, note[2] ?? '');
  }

  /**
   * MP情報を設定する
   */
  private _setMpInfo() {
    this._setSlot(3, this._getMpCost());
    this._setSlot(4, this._member.mp);
  }

  /**
   * 消費MPを取得する
   * @returns
   */
  protected _getMpCost() {
    if (!this._skill) {
      return 0;
    }
    const action = actions[this._getActionId(this._skill)];
    return GameAction.getMpCost(action);
  }

  /**
   * 行動Idを取得する
   * @param skill
   * @returns
   */
  protected _getActionId(skill: Skill) {
    return skill.actionId;
  }

  /**
   * 説明の内容を変更する
   * @param n
   */
  private _updateNote(n: number) {
    const win = this._getSelectWindow();
    this._skill = win.object[n];
    this._setNote();
    this._changeNoteWindowItems();
  }

  /**
   * 説明ウィンドウの中身を変更する
   */
  protected _changeNoteWindowItems() {
    this._changeWindowItems(this._getNoteWindow());
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = (n) => {
      this._updateNote(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * メモウィンドウを取得する
   * @returns
   */
  protected _getNoteWindow() {
    return this.windowList[1];
  }
}

const enum ERecoverType {
  None,
  Hp,
  Mp,
}

/**
 * 対象選択メニュー
 */
export class GameMenuSelectTarget extends GameMenuSelect {
  /**
   * 対象メンバー
   */
  private _member: GameMember | null = null;
  /**
   * 回復タイプ
   */
  private _recoverType: ERecoverType = ERecoverType.None;
  /**
   * 状態情報
   */
  private _stateInfo: { type: string; current: number; max: number } = {
    type: '',
    current: 0,
    max: 0,
  };

  /**
   * 選択メンバーを取得する
   */
  get member() {
    return this._member;
  }

  /**
   * 状態情報を取得する
   */
  get stateInfo() {
    return this._stateInfo;
  }

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    this._setRecoverType();
  }

  /**
   * 行動の回復タイプを設定する
   * @returns
   */
  private _setRecoverType() {
    this._recoverType = ERecoverType.None;
    const actionIndex = this.extras[0] as number;
    if (!actionIndex) {
      return;
    }
    const action = actions[actionIndex];
    const effects = GameActionEffect.effects(action.effectIds);
    if (
      effects.some((effect) => {
        return GameActionEffect.hpRecover(effect);
      })
    ) {
      // HP
      this._recoverType = ERecoverType.Hp;
      return;
    }
    if (
      effects.some((effect) => {
        return GameActionEffect.mpRecover(effect);
      })
    ) {
      // MP
      this._recoverType = ERecoverType.Mp;
      return;
    }
  }

  /**
   * ウィンドウ再構築時
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      this._member = win.object[win.index];
      this._updateState();
    } else if (index === 1) {
      win.setVisible(this._recoverType !== ERecoverType.None);
    }
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n: number, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = (n: number) => {
      this._updateMember(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * メンバーを更新する
   * @param n
   */
  private _updateMember(n: number) {
    this._member = this._getSelectWindow().object[n];
    this._updateState();
    this._updateMemberWindow();
  }

  /**
   * 状態を更新する
   * @returns
   */
  private _updateState() {
    if (!this._member) {
      return;
    }
    switch (this._recoverType) {
      case ERecoverType.Hp:
        this._stateInfo.type = terms[system.termIds.hp];
        this._stateInfo.current = this._member.hp;
        this._stateInfo.max = this._member.mhp;
        break;
      case ERecoverType.Mp:
        this._stateInfo.type = terms[system.termIds.mp];
        this._stateInfo.current = this._member.mp;
        this._stateInfo.max = this._member.mmp;
        break;
      default:
        break;
    }
  }

  /**
   * メンバーウィンドウを更新する
   */
  private _updateMemberWindow() {
    if (this._recoverType !== ERecoverType.None) {
      this._changeWindowItems(this._getMemberWindow());
    }
  }

  /**
   * メンバー状態ウィンドウを取得する
   * @returns
   */
  protected _getMemberWindow() {
    return this.windowList[1];
  }
}

/**
 * 移動道具どうするメニュー
 */
export class GameMenuItemDo extends GameMenuSelect {
  /**
   * 対象メンバー
   */
  private _member!: GameMember;
  /**
   * 道具インデックス
   */
  private _index!: number;

  /**
   * 所持道具を返す
   */
  get items() {
    return this._member.items;
  }

  /**
   * どうするリストを返す
   */
  get doList() {
    const list = [...system.wordList.itemAction];
    list[2] = this._getEquipWord();
    return list;
  }

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    const memberIndex = this.extras[0] as number;
    const members = gameParty.members.filter((member) => member.itemSelectable);
    this._member = members[memberIndex]; //gameParty.getMember(memberIndex);
    this._index = this.parent?.selectedIndex() ?? 0;
  }

  /**
   * 中身を更新後、表示非表示を切り替える
   */
  protected override _refreshItems(fluctuate = false) {
    super._refreshItems(fluctuate);
    this._indexCorrection();
    this._setMpCostInfo();
    this._setEquipInfo();
    this._changeWindowItems(this._getMpCostWindow());
    this._changeWindowItems(this._getEquipWindow());
    this._updateInfo(this._getSelectWindow().index);
  }

  /**
   * インデックス補正
   */
  private _indexCorrection() {
    if (this._index >= this.items.length) {
      this._index = this.items.length - 1;
    }
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = (n) => {
      this._updateInfo(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 道具情報を更新する
   * @param n
   */
  protected _updateInfo(n: number) {
    switch (n) {
      case 0:
        // つかう
        this._updateInfoUse();
        break;
      case 2:
        // そうび
        this._updateInfoEquip();
        break;
      default:
        this._updateInfoNone();
        break;
    }
  }

  /**
   * 道具使用情報を更新する
   */
  protected _updateInfoUse() {
    if (this._needMpCostInfo(this._index)) {
      this._getMpCostWindow().setVisible(true);
      this._getEquipWindow().setVisible(false);
    } else {
      this._updateInfoNone();
    }
  }

  /**
   * 道具装備情報を更新する
   */
  protected _updateInfoEquip() {
    this._getMpCostWindow().setVisible(false);
    this._getEquipWindow().setVisible(true);
  }

  /**
   * 道具情報なしを更新する
   */
  protected _updateInfoNone() {
    this._getMpCostWindow().setVisible(false);
    this._getEquipWindow().setVisible(false);
    gameMenus.repaint();
  }

  /**
   * MP消費情報が必要か
   * @param n
   * @returns
   */
  private _needMpCostInfo(n: number) {
    return this._getPlainMpCost(n) > 0;
  }

  /**
   * 素のMP消費を取得する
   * @param n
   * @returns
   */
  private _getPlainMpCost(n: number) {
    const actionId = this._getActionId(n);
    return actions[actionId].mpCost;
  }

  /**
   * MP消費情報を設定する
   */
  private _setMpCostInfo() {
    this._setMpCost(this._index);
    this._setSlot(4, this._member.mp);
  }

  /**
   * 道具装備文字を取得する
   * @returns
   */
  protected _getEquipWord() {
    const item = this._member.items[this._index];
    return item.equip ? 'はずす' : 'そうび';
  }

  /**
   * MP消費を設定する
   * @param n
   */
  private _setMpCost(n: number) {
    const actionId = this._getActionId(n);
    const cost = GameAction.getMpCost(actions[actionId]);
    this._setSlot(3, cost);
  }

  /**
   * 行動Idを取得する
   * @param n
   * @returns
   */
  protected _getActionId(n: number) {
    return this.items[n].actionId;
  }

  /**
   * 装備の情報を設定する
   */
  private _setEquipInfo() {
    const item = this._member.items[this._index];
    const [v1, v2, v3] = item.equip
      ? EquipStatus.takeoff(this._member, this._index)
      : EquipStatus.equip(this._member, item.data);
    this._setSlot(5, item.equipParamWord());
    this._setSlot(6, v1);
    this._setSlot(7, v2);
    this._setSlot(8, v3);
  }

  /**
   * MP消費ウィンドウを取得する
   * @returns
   */
  private _getMpCostWindow() {
    return this.windowList[1];
  }

  /**
   * 装備情報ウィンドウを取得する
   * @returns
   */
  private _getEquipWindow() {
    return this.windowList[2];
  }
}

/**
 * 移動道具渡すメニュー
 */
export class GameMenuItemTransfer extends GameMenuItem {
  /**
   * 対象道具
   */
  private _item!: GameItem;

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    const memberIndex = this.extras[0] as number;
    const itemIndex = this.extras[1] as number;
    const members = this.members;
    this._item = members[memberIndex].getItem(itemIndex);
    this._setEquipInfo(members[this._getInitIndex()]);
  }

  /**
   * 道具の内容を変更する
   * @param index
   */
  protected override _updateItem(index: number) {
    super._updateItem(index);
    this._setEquipInfo(this._getSelectWindow().object[index]);
    this._changeWindowItems(this._getEquipWindow());
  }

  /**
   * 装備の情報を設定する
   */
  private _setEquipInfo(member: GameMember) {
    const item = this._item;
    const [v1, v2, v3] = EquipStatus.equip(member, item.data);
    this._setSlot(5, item.equipParamWord());
    this._setSlot(6, v1);
    this._setSlot(7, v2);
    this._setSlot(8, v3);
  }

  /**
   * 装備情報ウィンドウを取得する
   * @returns
   */
  private _getEquipWindow() {
    return this.windowList[2];
  }
}

// つよさメニュー
export class GameMenuStatus extends GameMenuSelect {
  /**
   * 対象メンバー
   */
  private _member: GameMember;

  /**
   * 対象メンバーを取得する
   */
  get member() {
    return this._member;
  }

  /**
   * ウィンドウ再構築時
   * @param win
   * @param index
   */
  protected override _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      this._member = win.object[win.index];
    }
  }

  /**
   * update郡
   * @returns
   */
  protected override _updateActive() {
    const fn = (n, object) => {
      const memberWin = this._getSelectWindow();
      if (n < memberWin.object.length) {
        return this._updateDecide(n, object);
      }
      return this._updateNone();
    };
    const fnChange = (n) => {
      this._updateTarget(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 対象を更新する
   * @param n
   */
  private _updateTarget(n: number) {
    const memberWin = this._getSelectWindow();
    if (n < memberWin.object.length) {
      // 個人の場合
      this._updateMember(memberWin.object[n]);
    } else {
      // 全員の場合
      this._updateAll();
    }
  }

  /**
   * ステータスの内容を変更する
   * @param n
   * @returns
   */
  private _updateMember(member: GameMember) {
    this._member = member;
    this._updateStatus();
    if (this._getAllWindow().visible) {
      this._showMemberWindow(true);
      this._getAllWindow().setVisible(false);
      gameMenus.repaint();
    }
  }

  /**
   * ステータスを更新する
   */
  private _updateStatus() {
    this._changeWindowItems(this._getProfileWindow());
    this._changeWindowItems(this._getEquipWindow());
    this._changeWindowItems(this._getStatusWindow());
  }

  /**
   * ぜんいんを更新する
   */
  private _updateAll() {
    this._showMemberWindow(false);
    this._getAllWindow().setVisible(true);
    gameMenus.repaint();
  }

  /**
   * メンバーウィンドウの表示設定
   * @param value
   */
  private _showMemberWindow(value: boolean) {
    this._getProfileWindow().setVisible(value);
    this._getEquipWindow().setVisible(value);
    this._getStatusWindow().setVisible(value);
  }

  /**
   * 紹介ウィンドウを取得する
   * @returns
   */
  private _getProfileWindow() {
    return this.windowList[1];
  }

  /**
   * 装備情報ウィンドウを取得する
   * @returns
   */
  private _getEquipWindow() {
    return this.windowList[2];
  }

  /**
   * スタータスウィンドウを取得する
   * @reんurns
   */
  private _getStatusWindow() {
    return this.windowList[3];
  }

  /**
   * ぜんいんウィンドウを取得する
   * @returns
   */
  private _getAllWindow() {
    return this.windowList[4];
  }
}

/**
 * つよさじゅもんメニュー
 */
export class GameMenuStatusSpell extends GameMenuFix {
  /**
   * 対象メンバー
   */
  private _member: GameMember = this.parent?.firstSelectedObject;

  /**
   * 対象メンバーを取得する
   */
  get member() {
    return this._member;
  }

  /**
   * 技能の種類を取得する
   */
  get kind() {
    return terms[skillLists[this._member.battleSkillListId].termId];
  }
}

/**
 * そうびメニュー
 */

export class GameMenuEquip extends GameMenuSelect {
  /**
   * 対象メンバー
   */
  private _member: GameMember;

  /**
   * 対象メンバーを取得する
   */
  get member() {
    return this._member;
  }

  /**
   * 道具使用可能メンバーを取得する
   */
  get members() {
    return gameParty.itemMembers;
  }

  /**
   * ウィンドウ再構築時
   * @param win
   * @param index
   */
  protected override _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      this._member = win.object[win.index];
    }
  }

  /**
   * update郡
   * @returns
   */
  protected override _updateActive() {
    const fn = (n, object) => {
      const index =
        n < 0 ? n : gameParty.members.findIndex((member) => member === object);
      return this._updateDecide(index, object);
    };
    const fnChange = (n) => {
      this._updateMember(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 選択メンバーを更新する
   * @param n
   */
  private _updateMember(n: number) {
    const memberWin = this._getSelectWindow();
    this._member = memberWin.object[n];
    this._updateEquip();
  }

  /**
   * そうびの内容を変更する
   */
  private _updateEquip() {
    this._changeWindowItems(this._getEquipWindow());
  }

  /**
   * 装備ウィンドウを取得する
   * @returns
   */
  private _getEquipWindow() {
    return this.windowList[1];
  }
}

interface ItemSuggestDisp {
  name: string;
  effect1: number | string;
  effect2: number | string;
  effect3: number | string;
  partyOrderIndex?: number;
}

interface ItemEquipSuggestDisp extends ItemSuggestDisp {
  type: string;
}

/**
 * 装備選択ベースクラス
 */
class GameMenuEquipBase extends GameMenuSelect {
  /**
   * 変更後の装備
   */
  protected _equips!: GameItem[];
  /**
   * 装備候補
   */
  protected _suggest!: GameItem[];
  /**
   * 変化状態
   */
  protected _status!: ItemEquipSuggestDisp;
  /**
   * 対象メンバー
   */
  protected _member!: GameMember;

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    this._createContents(0);
  }

  /**
   * 戻ってきたときの再設定
   */
  protected override _updateParams() {
    const win = this._getSelectWindow();
    this._createContents(win.index);
    super._updateParams();
  }

  /**
   * 中身を作成
   */
  private _createContents(index: number) {
    this._createSuggest();
    this._createStatus(index);
    this._equips = this.parent?.firstSelectedObject.equips;
  }

  /**
   * 選択状態のオブジェクトを取得
   * GameMemberであることが前提
   * @returns
   */
  get firstSelectedObject() {
    return super.firstSelectedObject as GameMember;
  }

  /**
   * 候補を取得する
   */
  get suggest() {
    return this._suggest;
  }

  /**
   * 変化状態を取得する
   */
  get status() {
    return this._status;
  }

  /**
   * 変更後の装備を取得する
   */
  get equips() {
    return this._equips;
  }

  /**
   * 装備候補を作成する
   */
  protected _createSuggest() {
    this._member = this.parent?.firstSelectedObject;
  }

  /**
   * パラメータ変化を作成する
   * @param n
   */
  private _createStatus(n: number) {
    const item = this._suggest[n];
    // ４つのパターン
    // 現在装備
    // 別の装備
    // 装備不可
    // 装備しない
    const name = this._getItemName(item);
    const type = this._getType(item);
    const [effect1, effect2, effect3] = this._getEffect(item);
    this._status = { name, effect1, effect2, effect3, type };
  }

  /**
   * パラメータ種類を取得する
   */
  private _getType(item: GameItem): string {
    if (item) {
      return item.equipParamWord();
    } else {
      const equip = this._suggest.find((value) => value.equip);
      return equip
        ? equip.equipParamWord()
        : GameUtils.paramsWord(this._getDefaultParamId());
    }
  }

  /**
   * デフォルトパラメータIdを取得する
   * @returns
   */
  protected _getDefaultParamId() {
    return EBaseParamId.Def;
  }

  /**
   * 道具名を取得する
   * @param item
   * @returns
   */
  private _getItemName(item: GameItem) {
    return item?.name ?? '';
  }

  /**
   * 装備効果を取得する
   * @param item
   * @returns
   */
  private _getEffect(item: GameItem) {
    if (item) {
      return EquipStatus.equip(this._member, item.data);
    } else {
      const equip = this._suggest.find((value) => value.equip);
      if (equip) {
        return EquipStatus.takeoffHaven(this._member, equip);
      } else {
        const effect1 = this._member.fixedParam(this._getDefaultParamId());
        const effect2 = '＞';
        return [effect1, effect2, effect1];
      }
    }
  }

  /**
   * そうびの内容を変更する
   * @param n
   */
  private _updateEquip(n: number) {
    this._createStatus(n);
    const win = this._getStatusWindow();
    this._changeWindowItems(win);
  }

  /**
   * update郡
   * @returns
   */
  protected override _updateActive() {
    const fn = (n, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = (n) => {
      this._updateEquip(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 装備状態のウィンドウを取得する
   * @returns
   */
  private _getStatusWindow() {
    return this.windowList[1];
  }
}

/**
 * 武器選択クラス
 */
export class GameMenuEquipWeapon extends GameMenuEquipBase {
  /**
   * 種類を取得する
   */
  get kind() {
    return GameUtils.itemKindWord(EItemKind.Weapon);
  }

  /**
   * 装備候補を作成する
   */
  protected override _createSuggest() {
    super._createSuggest();
    this._suggest = this._member.weapons;
  }

  /**
   * デフォルトパラメータIdを取得する
   * @returns
   */
  protected override _getDefaultParamId() {
    return EBaseParamId.Atk;
  }
}

/**
 * 鎧選択クラス
 */
export class GameMenuEquipArmor extends GameMenuEquipBase {
  /**
   * 種類を取得する
   */
  get kind() {
    return GameUtils.itemKindWord(EItemKind.Armor);
  }

  /**
   * 装備候補を作成する
   */
  protected override _createSuggest() {
    super._createSuggest();
    this._suggest = this._member.armors;
  }
}

// 盾選択
export class GameMenuEquipShield extends GameMenuEquipBase {
  /**
   * 種類を取得する
   */
  get kind() {
    return GameUtils.itemKindWord(EItemKind.Shield);
  }

  /**
   * 装備候補を作成する
   */
  protected override _createSuggest() {
    super._createSuggest();
    this._suggest = this._member.shields;
  }
}

/**
 * 兜選択クラス
 */
export class GameMenuEquipHelmet extends GameMenuEquipBase {
  /**
   * 種類を取得する
   */
  get kind() {
    return GameUtils.itemKindWord(EItemKind.Helmet);
  }

  /**
   * 装備候補を作成する
   */
  protected override _createSuggest() {
    super._createSuggest();
    this._suggest = this._member.helmets;
  }
}

/**
 * 装飾品選択クラス
 */
export class GameMenuEquipAccessory extends GameMenuEquipBase {
  /**
   * 種類を取得する
   */
  get kind() {
    return GameUtils.itemKindWord(EItemKind.Accessory);
  }

  /**
   * 装備候補を作成する
   */
  protected override _createSuggest() {
    super._createSuggest();
    this._suggest = this._member.accessories;
  }
}

interface OrderMember {
  member: GameMember;
  order: number;
}

/**
 * ならびかえメニュークラス
 */
export class GameMenuOrder extends GameMenuSelect {
  /**
   * 並び替え元のメンバー
   */
  private _originals!: OrderMember[];
  /**
   * 並び替え先のメンバー
   */
  private _orders!: Array<OrderMember | null>;
  /**
   * 選択メンバー
   */
  private _member!: GameMember;

  /**
   * 並び替え元のメンバーを取得する
   */
  get originalMembers() {
    return this._originals.map((value) => value.member);
  }

  /**
   * 並び替え先のメンバーを取得する
   */
  get orderMembers() {
    return this._orders.map((value) => (value ? value.member : { name: ' ' }));
  }

  /**
   * 選択メンバーを取得する
   */
  get member() {
    return this._member;
  }

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    this._originals = gameParty.members.map((value, index) => ({
      member: value,
      order: index,
    }));
    this._orders = Array.from({ length: gameParty.members.length }, () => null);
  }

  /**
   * ウィンドウ再構築時
   * @param win
   * @param index
   */
  protected override _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0 && 0 <= win.index) {
      this._member = this._originals[win.index].member;
    }
  }

  /**
   * update郡
   * @returns
   */
  protected override _updateActive() {
    const fn = (n, object) => {
      return this._updateOrderDecide(n, object);
    };
    const fnChange = (n) => {
      this._updateMember(n);
      return this._updateNone();
    };
    // 空になったらキー入力待ち
    const fnEmpty = () => {
      // キャンセル
      if (Input.isTriggeredOperation(EInputOperation.Close)) {
        return this._updateDecideCancel();
      }
      // オールキャンセル
      if (Input.isTriggeredOperation(EInputOperation.AllClose)) {
        return super._updateDecide(-2);
      }
      // 決定
      if (Input.isTriggeredOperations(DecideOperations)) {
        return super._updateDecide(
          0,
          this._orders.map((value) => value?.member)
        );
      }
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange, fnEmpty);
  }

  /**
   * ステータスの内容を変更する
   * @param n
   */
  private _updateMember(n: number) {
    this._member = this._originals[n].member;
    const win = this._getForceWindow();
    this._changeWindowItems(win);
  }

  /**
   * 並び順決定
   * @param n
   * @param object
   * @returns
   */
  private _updateOrderDecide(n: number, object?: GameMember) {
    // nが0以上なら決定
    // マイナスならキャンセル
    if (n >= 0 && object) {
      return this._updateDecideSelect(n, this._originals[n]);
    } else if (n === -1) {
      return this._updateDecideCancel();
    } else {
      return super._updateDecide(-2);
    }
  }

  /**
   * 並び順変更
   * @param n
   * @param object
   * @returns
   */
  private _updateDecideSelect(n: number, object: OrderMember) {
    // 選択メンバーをordersに入れる
    const lastIndex = this._orders.findIndex((value) => value === null);
    this._orders[lastIndex] = object;
    // オブジェクトを外す
    this._originals.splice(n, 1);
    this._refreshItems();
    gameMenus.repaint();
    GameSound.playDecide();
    return this._updateNone();
  }

  /**
   * 並び順戻す
   * @returns
   */
  private _updateDecideCancel() {
    // 選択されていない状態ならキャンセル
    if (this._originals.length === this._orders.length) {
      return super._updateDecide(-1);
    }
    // 最後を取り出す
    const lastIndex = this._orders.findLastIndex((value) => value !== null);
    const last = this._orders[lastIndex];
    this._orders[lastIndex] = null;
    // 取り出したメンバーを入れる
    if (last) {
      const index = this._originals.findIndex(
        (value) => last.order < value.order
      );
      this._originals.splice(index, 0, last);
      this._refreshItems();
      if (this._originals.length <= 1) {
        // 元が空だった場合は任意にカーソルリセットをかける
        this._getSelectWindow().resetCursor();
      }
    }

    return this._updateNone();
  }

  /**
   * 武力ウィンドウを取得する
   * @returns
   */
  private _getForceWindow() {
    return this.windowList[2];
  }
}

/**
 * 商品メニューベースクラス
 */
abstract class GameMenuGoodsBase extends GameMenuSelect {
  /**
   * 選択商品の状態
   */
  private _statuses: ItemSuggestDisp[] = [];
  /**
   * 道具のタイプ
   */
  private _type: string = '';

  /**
   * 道具選択可メンバー
   */
  get members() {
    return gameParty.itemMembers;
  }

  /**
   * 状態を取得する
   */
  get statuses() {
    return this._statuses;
  }

  /**
   * 道具のタイプを取得する
   */
  get type() {
    return this._type;
  }

  /**
   * ウィンドウrefresh完了時に呼ばれる
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 0) {
      this._createStatus(this._getItem(this._getMainWindow().index));
    }
  }

  /**
   * 道具効果表示を作成
   * @param goods
   * @param n
   * @returns
   */
  private _createStatus(item: Item) {
    if (!item) {
      return;
    }
    // どうぐのタイプ
    this._type = this._getType(item);
    // パーティの道具の状態
    this._statuses = this._getStatus(item);
  }

  /**
   * どうぐのおおまかな特徴を取得
   * @param item
   */
  private _getType(item: Item) {
    return GameItem.equipParamWord(item.kind, item.paramId);
  }

  /**
   * パーティ道具の状態を取得する
   * @param item
   * @returns
   */
  private _getStatus(item: Item) {
    return this.members.map((member, index) => {
      const [effect1, effect2, effect3] = this._getEffect(item, member);
      return {
        name: member.name,
        effect1,
        effect2,
        effect3,
        partyOrderIndex: index,
      };
    });
  }

  /**
   * 道具の適用効果を取得する
   * @param item
   * @param member
   * @returns
   */
  private _getEffect(item: Item, member: GameMember) {
    if (GameItem.judgeNormal(item)) {
      // 通常の道具の場合
      if (member.hasItem(item)) {
        return this._getHave();
      } else {
        return this._getNotHave();
      }
    }

    return EquipStatus.equip(member, item);
  }

  /**
   * どうぐもっていない
   * @returns
   */
  private _getNotHave() {
    const effect1 = '';
    const effect2 = '';
    const effect3 = 'もっていない';
    return [effect1, effect2, effect3];
  }

  /**
   * どうぐ持っている
   * @returns
   */
  private _getHave() {
    const effect1 = '';
    const effect2 = '';
    const effect3 = 'もっている';
    return [effect1, effect2, effect3];
  }

  /**
   * 状態を変更する
   * @param n
   */
  private _updateStatus(n: number) {
    this._createStatus(this._getItem(n));
    const win = this._getStatusWindow();
    this._changeWindowItems(win);
  }

  /**
   * 指定インデックスの道具を取得する
   * @param n
   */
  protected abstract _getItem(n: number): Item;

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = (n) => {
      this._updateStatus(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 状態表示ウィンドウを取得する
   * @returns
   */
  private _getStatusWindow() {
    return this.windowList[1];
  }
}

/**
 * 商品選択メニュークラス
 */
export class GameMenuGoods extends GameMenuGoodsBase {
  /**
   * 商品
   */
  private _goods: GameShopItem[] = this._makeGoods();

  /**
   * 商品を取得する
   */
  get goods() {
    return this._goods;
  }

  /**
   * 商品を作成する
   * 道具idは下位10ビット、価格は10ビット目以降
   */
  private _makeGoods() {
    return this.extras.map((value) => {
      return GameUtils.itemIdToShopItem(value as number);
    });
  }

  /**
   * 道具を取得する
   * @param n
   * @returns
   */
  protected _getItem(n: number) {
    const shopItems: BankItem[] = this._getSelectWindow().object;
    return dataItems[shopItems?.[n]?.id ?? 0];
  }
}

/**
 * 装備状態クラス
 */
class EquipStatus {
  /**
   * 装備効果を取得する
   * @param item
   * @returns
   */
  static equip(member: GameMember, item: Item) {
    if (!member.canEquip(item)) {
      return this._getNotEquipEffect();
    }
    const paramId = GameItem.mainParamId(item.kind, item.paramId);
    return member.equipped(item.id)
      ? this._getCurrentEffect(member, paramId)
      : this._getEquipEffect(item, member, paramId);
  }

  /**
   * 装備を外す
   * 現在の値から外す装備の値を引く
   * @returns
   */
  static takeoff(member: GameMember, index: number) {
    const item = member.items[index];
    return this.takeoffHaven(member, item);
  }

  /**
   * 所持道具を指定して装備を外す
   * @param member
   * @param item
   * @returns
   */
  static takeoffHaven(member: GameMember, item: GameItem) {
    const paramId = GameItem.mainParamId(item.kind, item.paramId);
    const effect1 = member.fixedParam(paramId);
    const effect2 = '＞';
    const effect3 = member.equippedParam(item, false, paramId);

    return [effect1, effect2, effect3];
  }

  /**
   * 装備できない
   * @returns
   */
  private static _getNotEquipEffect() {
    const effect1 = '';
    const effect2 = '';
    const effect3 = 'そうびできない';
    return [effect1, effect2, effect3];
  }

  /**
   * 同じ装備の効果を取得
   * @param member
   * @param paramId
   * @returns
   */
  private static _getCurrentEffect(member: GameMember, paramId: number) {
    const effect1 = 'Ｅ';
    const effect2 = '';
    const effect3 = member.fixedParam(paramId);
    return [effect1, effect2, effect3];
  }

  /**
   * 装備可能
   * @param item
   * @param member
   * @param paramId
   * @returns
   */
  private static _getEquipEffect(
    item: Item,
    member: GameMember,
    paramId: number
  ) {
    const effect1 = member.fixedParam(paramId);
    const effect2 = '＞';
    const effect3 = member.equippedParam(item, true, paramId);
    return [effect1, effect2, effect3];
  }
}

interface BankItem {
  id: number;
  name: string;
  count: number;
}

/**
 * 受け取り物選択メニュークラス
 */
export class GameMenuBank extends GameMenuGoodsBase {
  /**
   * 受け取り物
   */
  private _goods: BankItem[] = this._makeGoods();

  /**
   * 商品を取得する
   */
  get goods() {
    return this._goods;
  }

  /**
   * 戻ってきたときの再設定
   */
  protected override _updateParams() {
    this._goods = this._makeGoods();
    super._updateParams();
  }

  /**
   * 商品を作成する
   */
  private _makeGoods() {
    return gameParty.storedItems.map((value) => {
      return {
        id: value.id,
        name: dataItems[value.id].name,
        count: value.count,
      };
    });
  }

  /**
   * 道具を取得する
   * @param n
   * @returns
   */
  protected _getItem(n: number) {
    const bankItems: BankItem[] = this._getSelectWindow().object;
    return dataItems[bankItems?.[n]?.id ?? 0];
  }
}

//----------------------------------------------
////// ここから戦闘 //////

// 戦闘メッセージ
export class GameBattleMessage extends GameMessageBase {
  /**
   * ポーズ待ち時にボタンを押したときの戻り値
   * @returns
   */
  protected _pauseWaitUpdateNext() {
    return this._updateNext(false);
  }
}

/**
 * 敵選択メニュー
 */
export class GameMenuEnemySelect extends GameMenuSelect {
  /**
   * ウィンドウのrefresh完了時に呼ばれる
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    this._updateSelect(win.object[0]?.index);
  }

  /**
   * update部
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      this._updateSelect(-1);
      return this._updateDecide(object ? object.index : n, object);
    };
    const fnChange = (_n, object) => {
      this._updateSelect(object.index);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 選択時の更新
   * @param n
   */
  private _updateSelect(n: number) {
    gameTroop.selectGroup(n);
  }
}

/**
 * 戦闘呪文選択メニュー
 */
export class GameMenuBattleSpellChoice extends GameMenuSpellChoice {
  /**
   * 習得呪文一覧
   */
  private _skills: Array<Skill | null> = this._member.battleSkills;

  /**
   * 習得呪文一覧を取得する
   */
  get skills() {
    return this._skills;
  }

  /**
   * メンバーを設定する
   */
  protected _setMember() {
    const memberIndex = this.extras[0] as number;
    this._member = gameParty.getMember(memberIndex);
  }

  /**
   * 行動Idを取得する
   * @param skill
   * @returns
   */
  protected _getActionId(skill: Skill) {
    return skill.battleActionId;
  }
}

/**
 * 戦闘道具選択メニュー
 */
export class GameMenuBattleItemChoice extends GameMenuSelect {
  /**
   * 対象メンバー
   */
  private _member!: GameMember;

  /**
   * 所持道具を返す
   */
  get items() {
    return this._member.items;
  }

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    const memberIndex = this.extras[0] as number;
    this._member = gameParty.getMember(memberIndex);
    const index =
      this._getInitIndex() < this._member.itemLength ? this._getInitIndex() : 0;
    // カーソル位置より項目が少ない時は0にする
    this._setNote(index);
    this._setMpCost(index);
    this._setSlot(4, this._member.mmp);
  }

  /**
   * ウィンドウが作成されたとき
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number) {
    super._didRefreshWindow(win, index);
    if (index === 1) {
      const n = this._getSelectWindow().index;
      if (this._needMpCostInfo(n)) {
        win.setVisible(true);
      }
    }
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fn = (n, object) => {
      return this._updateDecide(n, object);
    };
    const fnChange = (n) => {
      this._updateNote(n);
      return this._updateNone();
    };

    return this._updateActiveBody(fn, fn, fnChange);
  }

  /**
   * 説明の内容を変更する
   * @param n
   */
  private _updateNote(n: number) {
    this._setNote(n);
    this._changeWindowItems(this._getSelectWindow());
    this._showMpCostWindow(n);
  }

  /**
   * 説明の内容を設定する
   * @param n
   */
  private _setNote(n: number) {
    const note = this.items[n].note;
    this._setSlot(0, note[0] ?? '');
    this._setSlot(1, note[1] ?? '');
    this._setSlot(2, note[2] ?? '');
  }

  /**
   * MP消費ウィンドウの表示非表示
   * @param n
   * @returns
   */
  private _showMpCostWindow(n: number) {
    const win = this._getMpCostWindow();
    if (this._needMpCostInfo(n)) {
      this._setMpCost(n);
      this._changeWindowItems(win);
      win.setVisible(true);
      return;
    }
    if (win.visible) {
      win.setVisible(false);
      gameMenus.repaint();
    }
  }

  /**
   * MP消費情報が必要か
   * @param n
   * @returns
   */
  private _needMpCostInfo(n: number) {
    return !this.items[n].handEquipment && this._getPlainMpCost(n) > 0;
  }

  /**
   * MP消費を設定する
   * @param n
   */
  private _setMpCost(n: number) {
    const actionId = this.items[n].battleActionId;
    const cost = GameAction.getMpCost(actions[actionId]);
    this._setSlot(3, cost);
  }

  /**
   * 素のMP消費を取得する
   * @param n
   * @returns
   */
  private _getPlainMpCost(n: number) {
    const actionId = this.items[n].battleActionId;
    return actions[actionId].mpCost;
  }

  /**
   * MP消費ウィンドウを取得する
   * @returns
   */
  private _getMpCostWindow() {
    return this.windowList[1];
  }
}

/**
 * 戦闘道具どうするメニュー
 */
export class GameMenuBattleItemDo extends GameMenuItemDo {
  /**
   * どうするリストを返す
   */
  get doList() {
    return ['つかう', this._getEquipWord()];
  }

  /**
   * 道具情報を更新する
   * @param n
   */
  /**
   * 道具情報を更新する
   * @param n
   */
  protected _updateInfo(n: number) {
    switch (n) {
      case 0:
        // つかう
        this._updateInfoUse();
        break;
      case 1:
        // そうび
        this._updateInfoEquip();
        break;
      default:
        this._updateInfoNone();
        break;
    }
  }

  /**
   * 戦闘行動Idを取得する
   * @param n
   * @returns
   */
  protected override _getActionId(n: number) {
    return this.items[n].battleActionId;
  }
}

//----------------------------------------------
////// ここからタイトル //////

/**
 * 名前入力特殊コード
 */
const enum ENameInputSpecialCode {
  Dot = 10,
  Circle = 21,
  Switch = 65,
  End = 76,
}

/**
 * 名前入力メニュー
 */
export class GameMenuNameInput extends GameMenuSelect {
  /**
   * 表示中のかなリストのインデックス
   */
  private _kanaListIndex: number = 0;
  /**
   * 入力名
   */
  private _inputName: string = GameUtils.getSlotActorName().slice();

  /**
   * かなリストを返す
   */
  get kanaList() {
    return system.kanaList[this._kanaListIndex];
  }

  /**
   * 表示名を返す
   */
  get dispName() {
    return this._inputName.padEnd(4, '\u203b');
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fnOk = (n, object) => {
      return this._updateOk(n, object);
    };
    const fnCancel = (n, object) => {
      return this._updateCancel(n, object);
    };
    const fnChange = () => {
      return this._updateNone();
    };

    return this._updateActiveBody(fnOk, fnCancel, fnChange);
  }

  /**
   * OKボタン押したときの更新
   * @param n
   * @returns
   */
  private _updateOk(n: number, object: string): MenuResult {
    GameSound.playDecide();
    return this._processOk(n, object);
  }

  /**
   * 決定処理
   * @param n
   * @param object
   */
  private _processOk(n: number, object: string) {
    switch (n) {
      case ENameInputSpecialCode.Dot:
        return this._processVoiced('\u3099');
      case ENameInputSpecialCode.Circle:
        return this._processVoiced('\u309A');
      case ENameInputSpecialCode.Switch:
        return this._processSwitch();
      case ENameInputSpecialCode.End:
        return this._processEnd(n, object);
      default:
        return this._processAddWord(object);
    }
  }

  /**
   * 濁点半濁点の処理
   * @param code
   * @returns
   */
  private _processVoiced(code: string) {
    if (!this._hasName()) {
      return this._updateNone();
    }
    const oldWord = this._inputName.slice(-1);
    const div = oldWord.normalize('NFD');
    this._removeLastWord();
    if (div.length === 1) {
      const newWords = (div + code).normalize('NFC');
      return this._processAddWord(newWords[0]);
    } else {
      // 濁点か半濁点どちらかがついていれば変更する
      const newWords =
        code !== div[1] ? (div[0] + code).normalize('NFC') : div[0];
      // 2文字になってしまっていた場合は変更しない
      return this._processAddWord(newWords.length > 1 ? oldWord : newWords);
    }
  }

  /**
   * ひらがなカタカナ切替処理
   * @returns
   */
  private _processSwitch() {
    this._kanaListIndex = (this._kanaListIndex + 1) % system.kanaList.length;
    this._changeWindowItems(this._getSelectWindow());
    return this._updateNone();
  }

  /**
   * 終了処理
   * @returns
   */
  private _processEnd(n: number, object: string): MenuResult {
    // 未入力ならなにもしない
    if (!this._hasName()) {
      return this._updateNone();
    }
    // 名前をスロットに入れて戻る
    GameUtils.setSlotActorName(this._inputName.slice());
    return this._updateDecide(n, object);
  }

  /**
   * 文字追加処理
   * @param word
   * @returns
   */
  private _processAddWord(word: string) {
    this._addWord(word);
    if (this._fullWords()) {
      // カーソルを終わりに合わせる
      this._getSelectWindow().setIndex(ENameInputSpecialCode.End);
    }
    this._changeNameWindowItem();
    return this._updateNone();
  }

  /**
   * キャンセルボタンを押したときの処理
   * ０文字なら前のメニューに戻る
   * １文字以上なら1文字削る
   * @param n
   * @param object
   * @returns
   */
  private _updateCancel(n: number, object: string): MenuResult {
    if (this._hasName()) {
      this._removeLastWord();
      this._changeNameWindowItem();
      return this._updateNone();
    }
    return this._updateDecide(n, object);
  }

  /**
   * 入力名に文字を追加する
   * @param word
   */
  private _addWord(word: string) {
    if (this._fullWords()) {
      this._removeLastWord();
    }
    this._inputName += word;
  }

  /**
   * 最後の文字を削る
   */
  private _removeLastWord() {
    this._inputName = this._inputName.slice(0, -1);
  }

  /**
   * 名前が入力されているか
   * @returns
   */
  private _hasName() {
    return this._inputName.length > 0;
  }

  /**
   * 最大文字数入力されているか
   * @returns
   */
  private _fullWords() {
    return this._inputName.length >= 4;
  }

  /**
   * 名前ウィンドウの中身を変更する
   */
  private _changeNameWindowItem() {
    this._changeWindowItems(this._getNameWindow());
  }

  /**
   * 名前ウィンドウを取得する
   * @returns
   */
  private _getNameWindow() {
    return this._getWindow(1);
  }
}

//----------------------------------------------
////// ここからデバッグ //////

interface FlagInfo {
  name: string;
  value: string;
}
/**
 * フラグリストメニュークラス
 */
export class GameMenuFlagList extends GameMenuSelect {
  /**
   * フラグリストデータ
   */
  private _flagList: FlagInfo[] = this._makeFlagList();
  /**
   * フラグデータ
   */
  private _flagData: boolean[] = [...gameFlags.data];

  /**
   * フラグリストデータを取得
   */
  get flagList() {
    return this._flagList;
  }

  /**
   * フラグリストデータを作成
   */
  private _makeFlagList() {
    const flagList: FlagInfo[] = [];
    for (let i = 1; i < gameFlags.length; i++) {
      flagList.push({
        name: `${Utils.alignId(i)}:${system.flags[i]}`,
        value: this._makeFlagValue(gameFlags.getValue(i)),
      });
    }
    return flagList;
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    const fnOk = (n, object) => {
      return this._updateOk(n, object);
    };
    const fnCancel = (n, object) => {
      return this._updateCancel(n, object);
    };
    const fnChange = () => {
      return this._updateNone();
    };

    return this._updateActiveBody(fnOk, fnCancel, fnChange);
  }

  /**
   * OKボタン押したときの更新
   * @param n
   * @returns
   */
  private _updateOk(n: number, object: FlagInfo): MenuResult {
    const index = n + 1;
    const newValue = !getFlag(index);
    setFlag(index, newValue);
    object.value = this._makeFlagValue(newValue);

    const win = this._getSelectWindow();
    this._changeWindowBodyText(win, n, object.value, 1);
    GameSound.playDecide();
    return this._updateNone();
  }

  /**
   * キャンセルボタンを押したときの処理
   * 変更されていれば更新要求を投げる
   * @param n
   * @param object
   * @returns
   */
  private _updateCancel(n: number, object: FlagInfo): MenuResult {
    const srcJson = JSON.stringify(this._flagData);
    const destJson = JSON.stringify(gameFlags.data);
    if (srcJson !== destJson) {
      gameTemp.requestRefreshEvent();
    }
    return this._updateDecide(n, object);
  }

  /**
   * フラグ表示値を作成
   * @param flag
   * @returns
   */
  private _makeFlagValue(flag: boolean) {
    return `[${flag ? 'UP' : 'DOWN'}]`;
  }
}

interface VariableInfo {
  name: string;
  value: number;
}
/**
 * 変数リストメニュークラス
 */
export class GameMenuVariableList extends GameMenuSelect {
  /**
   * 変数リストデータ
   */
  private _variableList: VariableInfo[] = this._makeVariableList();

  /**
   * 変数リストデータを取得
   */
  get variableList() {
    return this._variableList;
  }

  /**
   * 変数リストデータを作成
   */
  private _makeVariableList() {
    const variableList: VariableInfo[] = [];
    for (let i = 1; i < gameVariables.length; i++) {
      variableList.push({
        name: `${Utils.alignId(i)}:${system.variables[i]}`,
        value: gameVariables.getValue(i),
      });
    }
    return variableList;
  }
}

interface SlotInfo {
  name: string;
  value: number | string;
}
/**
 * スロットリストメニュークラス
 */
export class GameMenuSlotList extends GameMenuSelect {
  /**
   * スロットリストデータ
   */
  private _slotList: SlotInfo[] = this._makeSlotList();

  /**
   * スロットリストデータを取得
   */
  get slotList() {
    return this._slotList;
  }

  /**
   * スロットリストデータを作成
   */
  private _makeSlotList() {
    const gameSlots = gameTemp.slots;
    const slotList: SlotInfo[] = [];
    for (let i = 1; i < gameSlots.length; i++) {
      slotList.push({
        name: `${Utils.alignId(i)}:${system.slots[i]}`,
        value: gameSlots[i] ?? 'undefined',
      });
    }
    return slotList;
  }
}

/**
 * スロット編集ウィンドウ
 * ゲームのウィンドウはダミーでhtmlのウィンドウを制御する
 */
export class GameMenuSlotEdit extends GameMenuBase {
  /**
   * 編集インデックス
   */
  private _index: number = this._getInitIndex();
  /**
   * 数値タブ
   */
  private _tabNumerics!: HTMLInputElement;
  /**
   * テキストタブ
   */
  private _tabText!: HTMLInputElement;
  /**
   * 数値編集エディット
   */
  private _numerics!: HTMLInputElement;
  /**
   * テキスト編集エディット
   */
  private _text!: HTMLInputElement;
  /**
   * OKボタン
   */
  private _ok!: HTMLElement;
  /**
   * キャンセルボタン
   */
  private _cancel!: HTMLElement;
  /**
   * 数値編集エディットからフォーカスが外れるときの関数
   */
  private _onNumericsBlur!: (e: Event) => void;
  /**
   * OKボタン押したときの関数
   */
  private _onOk!: () => void;
  /**
   * キャンセルボタン押したときの関数
   */
  private _onCancel!: () => void;

  /**
   * コンストラクタ
   * @param menuId
   * @param params
   */
  constructor(menuId: number, params: Array<number | string>) {
    super(menuId, params);
    this._setElement();
  }

  /**
   * HTML要素を設定する
   * @param index
   */
  private _setElement() {
    this._createEventListener();
    const slotInput = <HTMLElement>document.getElementById('slotInput');
    slotInput.style.display = 'block';
    this._numerics = <HTMLInputElement>document.getElementById('numerics');
    this._numerics.addEventListener('blur', this._onNumericsBlur);
    this._ok = <HTMLElement>document.getElementById('ok');
    this._ok.addEventListener('click', this._onOk);
    this._cancel = <HTMLElement>document.getElementById('cancel');
    this._cancel.addEventListener('click', this._onCancel);
    this._tabNumerics = <HTMLInputElement>(
      document.getElementById('tabNumerics')
    );
    this._text = <HTMLInputElement>document.getElementById('text');
    this._tabText = <HTMLInputElement>document.getElementById('tabText');
    this._setInputElement();
  }

  /**
   * HTMLのイベントリスナーを作成する
   */
  private _createEventListener() {
    this._onNumericsBlur = (e: Event) => {
      const newValue = Utils.clamp(
        parseInt((e.target as HTMLInputElement).value),
        -9999999,
        9999999
      );
      this._numerics.value = newValue.toString();
    };
    this._onOk = () => {
      const value = this._getValue();
      setSlot(this._index, value);
      this._endElement();
      this._updateFrame = () => {
        return this._updateDecide(this._index, null);
      };
    };
    this._onCancel = () => {
      this._endElement();
      this._updateFrame = () => {
        return this._updateDecide(-1, null);
      };
    };
  }

  /**
   * HTMLの入力を設定する
   */
  private _setInputElement() {
    const value = getSlot(this._index);
    this._numerics.value = '0';
    this._text.value = '';
    this._tabNumerics.checked = true;
    if (typeof value === 'number') {
      this._numerics.value = value.toString();
      this._tabNumerics.checked = true;
    } else if (typeof value === 'string') {
      this._text.value = value;
      this._tabText.checked = true;
    }
  }

  /**
   * HTMLの選択している値を取得する
   * @returns
   */
  private _getValue() {
    if (this._tabNumerics.checked) {
      return parseInt(this._numerics.value);
    }
    if (this._tabText.checked) {
      return this._text.value;
    }
    return 0;
  }

  /**
   * HTMLを終了する
   */
  private _endElement() {
    this._numerics.removeEventListener('blur', this._onNumericsBlur);
    this._ok.removeEventListener('click', this._onOk);
    this._cancel.removeEventListener('click', this._onCancel);
    const slotInput = <HTMLElement>document.getElementById('slotInput');
    slotInput.style.display = 'none';
  }

  /**
   * update郡
   * @returns
   */
  protected _updateActive() {
    // キャンセル
    if (Input.isTriggeredOperations(CancelOperations)) {
      this._onCancel();
    }
    // 決定
    if (Input.isTriggeredOperations(DecideOperations)) {
      this._onOk();
    }
    // なにもうけつけない
    // htmlのウィンドウから結果を返す
    return this._updateNone();
  }
}

interface TroopInfo {
  name: string;
  value: number;
}
/**
 * フラグリストメニュークラス
 */
export class GameMenuTroopList extends GameMenuSelect {
  /**
   * トループリストデータ
   */
  private _troopList: TroopInfo[] = this._makeTroopList();

  /**
   * フラグリストデータを取得
   */
  get troopList() {
    return this._troopList;
  }

  /**
   * トループリストデータを作成
   */
  private _makeTroopList() {
    const troopList: TroopInfo[] = [];
    for (let i = 1; i < troops.length; i++) {
      troopList.push({
        name: `${Utils.alignId(i)}:${troops[i].name}`,
        value: troops[i].lv,
      });
    }
    return troopList;
  }
}
