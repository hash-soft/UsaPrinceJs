/* eslint-disable @typescript-eslint/no-explicit-any */
import { WindowData, WindowSet } from './DataTypes';
import { gameParty, system, windows, windowsets } from './DataStore';
import * as objects from './DataStore';
import { GameMember } from './GameMember';
import {
  GameBattleMessage,
  GameMenuBank,
  GameMenuBase,
  GameMenuBattleItemChoice,
  GameMenuBattleItemDo,
  GameMenuBattleSpellChoice,
  GameMenuEnemySelect,
  GameMenuEquip,
  GameMenuEquipAccessory,
  GameMenuEquipArmor,
  GameMenuEquipHelmet,
  GameMenuEquipShield,
  GameMenuEquipWeapon,
  GameMenuFix,
  GameMenuFlagList,
  GameMenuGoods,
  GameMenuItem,
  GameMenuItemChoice,
  GameMenuItemDo,
  GameMenuItemTransfer,
  GameMenuNameInput,
  GameMenuNameList,
  GameMenuNumberEdit,
  GameMenuOrder,
  GameMenuSelect,
  GameMenuSelectTarget,
  GameMenuShow,
  GameMenuSlotEdit,
  GameMenuSlotList,
  GameMenuSpell,
  GameMenuSpellChoice,
  GameMenuStatus,
  GameMenuStatusSpell,
  GameMenuTroopList,
  GameMenuVariableList,
  GameMessage,
  GameSaveNameList,
} from './GameMessage';
import { GameUtils } from './GameUtils';
import Utils from './Utils';
import { WindowBase, WindowFrame, WindowItem } from './WindowBase';
import { WindowContent } from './WindowContent';
import { WindowMessage } from './WindowMessage';
import { getSlot, getSlotId } from './DataUtils';

export type DecideOption = { index: number; object?: any; callback: boolean };
export type NextOption = { sound: boolean };
export type MenuResult = { action: string; option?: DecideOption | NextOption };

/**
 * メニューのベースクラス
 */
export class GameMenu {
  /**
   * 構成ウィンドウのリスト
   */
  private _windowList: WindowBase[] = [];
  /**
   * _windowList内でフォーカスを持っているウィンドウ
   */
  private _focusIndex: number = 0;
  /**
   * コールバックメソッド
   */
  private _fn: ((index: number, object: unknown) => void) | null = null;
  /**
   * 最前面に復帰したかどうか
   */
  private _restore: boolean = false;
  /**
   * メニュー結果 何もしない場合
   */
  static RETURN_NONE: MenuResult = { action: 'none' };

  /**
   * コンストラクタ
   * @param menuId メニューId
   * @param params 作成後に設定できるパラメータ
   */
  constructor(
    private _menuId: number,
    protected _params: Array<number | string> = []
  ) {}

  /**
   * コンストラクタ完了後の処理
   */
  afterConstructor() {
    this._createMenu();
    this._didConstruct();
  }
  /**
   * メニュー(windowset)Idを取得する
   */
  get menuId() {
    return this._menuId;
  }

  /**
   * 所持ウィンドウリストを取得する
   */
  get windowList() {
    return this._windowList;
  }

  /**
   * 処理中かどうか
   * フォーカスがあたっていて未決定状態の場合
   */
  get processing() {
    return this.focusWindow.focus && !this.focusWindow.decided;
  }

  /**
   * 最初のウィンドウを取得
   */
  get firstWindow() {
    return this._windowList[0];
  }

  /**
   * 最初のウィンドウのオブジェクトを取得
   */
  get firstObject() {
    return this.firstWindow.object;
  }

  /**
   * 最初のウィンドウの選択インデックスを取得
   */
  get firstIndex() {
    return this.firstWindow.index;
  }

  /**
   * 最初のウィンドウの選択しているオブジェクトを取得
   */
  get firstSelectedObject() {
    return this.firstObject[this.firstIndex];
  }

  /**
   * フォーカスウィンドウを取得
   */
  get focusWindow() {
    return this._windowList[this._focusIndex];
  }

  /**
   * ウィンドウが復帰したかどうか
   */
  get restore() {
    return this._restore;
  }

  /**
   * 指定インデックスのウィンドウを取得
   * @param index
   * @returns
   */
  protected _getWindow(index: number) {
    return this._windowList[index];
  }

  /**
   * フォーカスを設定する
   * ・フォーカスをあてるのはメニューの指定インデックスウィンドウ（通常先頭）
   * ・すべてのウィンドウのアクティブ状態と連動
   * @param value
   */
  setFocus(value: boolean) {
    // アクティブ変更
    this._windowList.forEach((item) => {
      item.setActive(value);
    });
    this.focusWindow.setFocus(value);
  }

  /**
   * 選択されたインデックス
   */
  selectedIndex() {
    return this.focusWindow.index;
  }

  /**
   * 制御を持たないウィンドウかどうか
   * 入力機能のあるウィンドウは持つので
   * デフォルトfalse
   */
  get modeless() {
    return false;
  }

  /**
   * コールバックメソッドを設定
   * @param fn
   */
  setFn(fn?: (number?, any?) => void) {
    if (!fn) {
      this._fn = null;
      return;
    }
    this._fn = fn;
  }

  /**
   * コールバック関数を発動
   * @param index
   * @param object
   */
  onFn(index: number, object) {
    if (this._fn) {
      this._fn(index, object);
      //this._fn = null;
    }
  }

  /**
   * メニューを作成する
   */
  private _createMenu() {
    const windowset = windowsets[this._menuId];
    this.setup(windowset);
  }

  /**
   * 指定のメニューを設定
   * @param windowset
   */
  setup(windowset: WindowSet) {
    this._createWindowList(windowset);
    if (this._windowList.length > 0) {
      this._windowList[0].setInitIndex(this._getInitIndex());
    }
    this.refresh();
  }

  /**
   * 初期インデックス
   * @returns
   */
  protected _getInitIndex() {
    return 0;
  }

  /**
   * メニュー更新
   */
  updateMenu() {
    return this._getReturnNone();
  }

  /**
   * 中身を更新する
   * @param fluctuate
   */
  protected _refreshItems(fluctuate = false) {
    this._windowList.forEach((win, index) => {
      if (fluctuate && !win.fluctuate) {
        return;
      }
      this._changeWindowItems(win);
      this._didRefreshWindow(win, index);
      if (fluctuate) {
        win.resetCursor();
      }
    });
  }

  /**
   * ウィンドウ項目を変更する
   * @param win
   */
  protected _changeWindowItems(win: WindowBase) {
    const object = this._getObject(win.windowPropertyNames);
    const hObject = this._getHeaderObject(win.windowHeaderProperty) ?? object;
    this._setContents(win, hObject, object);
  }

  /**
   * ウィンドウヘッダのテキストを変更する
   * @param win
   * @param index
   * @param text
   */
  protected _changeWindowHeaderText(
    win: WindowBase,
    index: number,
    text: string
  ) {
    win.setHeaderText(index, text);
    win.refresh();
  }

  /**
   * ウィンドウ本体テキストを変更する
   * @param win
   * @param index
   * @param text
   * @param order
   */
  protected _changeWindowBodyText(
    win: WindowBase,
    index: number,
    text: string,
    order = 0
  ) {
    win.setBodyText(index, text, order);
    win.refresh();
  }

  /**
   * 復帰か確認する
   * @param focus
   * @param params
   */
  checkRestore(focus: GameMenu | null, params: Array<number | string>): boolean;
  checkRestore(focus: GameMenu | null) {
    return this !== focus;
  }

  /**
   * データ設定
   * @param params
   * @param restore
   */
  setData(params: Array<number | string> = [], restore = false) {
    this._restore = restore;
    this._params = params;
    this._updateParams();
  }

  /**
   * パラメータが更新された
   */
  protected _updateParams() {
    //
  }

  /**
   * 項目を再構築し描画し直す
   */
  refresh() {
    this._refreshItems();
  }

  /**
   * 変動ウィンドウを再描画
   */
  refreshFluctuateWindow() {
    this._refreshItems(true);
  }

  /**
   * ウィンドウ更新を行ったあとに呼ばれる
   * @param win
   * @param index
   */
  protected _didRefreshWindow(win: WindowBase, index: number): void;
  protected _didRefreshWindow() {
    //
  }

  /**
   * ウィンドウの構築を行った
   */
  protected _didConstruct() {
    //
  }

  /**
   * windowに指定しているオブジェクトを取得する
   * @param propertyNames
   * @returns
   */
  private _getObject(propertyNames: string[]) {
    if (propertyNames === undefined) {
      return null;
    }
    // クラス、グローバルの順
    const c = propertyNames.reduce((object, propertyName) => {
      if (object == null) {
        return null;
      }
      const name = this._convertPropertyText(propertyName);
      return object[name];
    }, this);
    if (c != null) {
      return c;
    }

    return propertyNames.reduce((object, propertyName) => {
      if (object == null) {
        return null;
      }
      const name = this._convertPropertyText(propertyName);
      return object[name];
    }, objects);
  }

  /**
   * window.jsonのpropertyNamesの特殊文字変換
   * thisオブジェクトを参照
   * ★これたぶんいらない
   * @param text
   * @returns
   */
  private _convertPropertyText(text: string) {
    return text.replace(/\\t\[(\w+)\]/gi, (_match, p1) => {
      return this[p1];
    });
  }

  /**
   * ヘッダーに指定しているオブジェクトを取得する
   * @param propertyName
   * @returns
   */
  private _getHeaderObject(propertyName: string) {
    if (propertyName === undefined) {
      return null;
    }
    if (this[propertyName]) {
      return this[propertyName];
    }
    return this['parent']?.[propertyName];
  }

  /**
   * ウィンドウリスト作成
   * 意味はメニュー作成と同一
   * @param windowset
   */
  private _createWindowList(windowset: WindowSet) {
    this._windowList = windowset.windowIds.map((id) => {
      return this._createWindow(windows[id]);
    });
  }

  /**
   * headerとdataの項目変換を行う
   * 1回ネストするので WindowItem[]の場合とArray[WindowItem[]]
   * の場合がある
   * @param data
   * @param object
   */
  private _dataToContents(data, object): WindowItem[] | WindowItem[][] {
    if (data === undefined) {
      return [];
    }
    const contents = data.map((value) => {
      if (typeof value === 'string') {
        // コンバート
        const text = this._convertText(value, object);
        // 文字列のときはデフォルトの設定を使用する
        const item = new WindowItem();
        item.createDefaultParts(text);
        return item;
      } else {
        // 他はオブジェクトという前提
        // 設定に従って処理を行う
        return this._expandData(value, object);
      }
    });

    // 一次元配列に変換する
    const odContents = Array.prototype.concat.apply([], contents);

    return odContents;
  }

  /**
   *  項目データ展開
   * @param value
   * @param object
   * @returns
   */
  private _expandData(
    value,
    object
  ): WindowItem | WindowItem[] | Array<WindowItem[] | WindowItem[][]> {
    if (value.ary) {
      // 配列指定の場合objectは配列が前提
      // オブジェクトがなければ空を返す
      if (object === null) {
        return [];
      }
      // 一回だけネスト可能
      if (value.body) {
        return (object as any[]).map((objValue) => {
          return this._dataToContents(value.body, objValue);
        });
      }
      // object配列を展開
      if (value.list) {
        //リスト形式の場合
        const list = value.list;
        const length = list.length;
        return (object as any[]).map((objValue, index) => {
          return this._createContent(list[index % length], objValue);
        });
      } else {
        return (object as any[]).map((objValue) => {
          return this._createContent(value, objValue);
        });
      }
    } else {
      // 単体で変換
      return this._createContent(value, object);
    }
  }

  /**
   * 要素を作成する
   * @param value windowの body or header
   * @param object
   * @returns
   */
  private _createContent(value, object) {
    const item = new WindowItem();
    // １項目が複数の部品で構成される
    if (value.multi) {
      const top = value.top;
      const infos = value.data.map((inValue, index) => {
        const text = this._convertText(inValue.text, object);
        return {
          text: text,
          textAlign: inValue.textAlign,
          left: inValue.left,
          top: inValue.top ?? top,
          colorId: this._adjustColor(inValue.colorId, object, index),
        };
      });
      item.setParts(infos);
    } else {
      const text = this._convertText(value.text, object);
      item.setParts([
        {
          text: text,
          textAlign: value.textAlign,
          left: value.left,
          top: value.top,
          colorId: this._adjustColor(value.colorId, object, 0),
        },
      ]);
    }
    // 区切り線
    this._setWindowItemBorder(item, value);

    return item;
  }

  /**
   * カラーコードIdを調整する
   * @param colorId
   * @param object
   * @param index
   */
  protected _adjustColor(
    colorId: number | undefined,
    object: unknown,
    index: number
  ): number | undefined;
  protected _adjustColor(colorId: number | undefined) {
    return colorId;
  }

  /**
   * 区切り線の設定
   * @param item
   * @param value
   */
  private _setWindowItemBorder(item: WindowItem, value) {
    if (value.border) {
      item.enableBorder();
    }

    if (value.borderLeft != null) {
      item.setBorderLeft(value.borderLeft);
    }
    if (value.borderTop != null) {
      item.setBorderTop(value.borderTop);
    }
    if (value.borderWidth != null) {
      item.setBorderWidth(value.borderWidth);
    }
    if (value.borderColorId != null) {
      item.setBorderColor(value.borderColorId);
    }
  }

  /**
   * ウィンドウを作成する
   * @param window
   * @param object
   */
  private _createWindow(window: WindowData) {
    // ヘッダと本体部
    const itemInfo = {
      font: this._getFontInfo(),
    };

    const winClass = GameMenuBase.getWindowClass(window.className);
    return new winClass(window, itemInfo);
  }

  /**
   * 中身を設定する
   * @param win
   * @param object
   */
  private _setContents(win: WindowBase, hObject, object) {
    const [header, body] = [
      this._dataToHeaderContents(win, hObject),
      this._dataToBodyContents(win, object),
    ];
    // ここでheaderとbodyに色情報を設定する
    // windowデータにしこませてcontents作成時にできないものか
    win.setup(header, body, object);
  }

  /**
   * header項目の変換を行う
   * 2次元配列のものがあれば空を返す
   * @param win
   * @param object
   * @returns
   */
  private _dataToHeaderContents(win: WindowBase, object) {
    const contents = this._dataToContents(win.window.header, object);
    if (contents.some((content) => Array.isArray(content))) {
      return [];
    }
    contents.forEach((content) => {
      content.setColorId(this._headerItemColor(win));
    });
    return contents as WindowItem[];
  }

  /**
   * header項目の色を取得する
   * @param win
   * @param object
   * @param index
   * @returns
   */
  protected _headerItemColor(win: WindowBase) {
    return this.getItemColor(win, undefined, -1);
  }

  /**
   * body項目の変換を行う
   * @param win
   * @param object
   * @returns
   */
  private _dataToBodyContents(win: WindowBase, object) {
    const contents = this._dataToContents(win.window.body, object);
    contents.forEach((content, index) => {
      if (Array.isArray(content)) {
        const colorId = this._bodyItemColor(win, object, index);
        content.forEach((child) => child.setColorId(colorId));
      } else {
        content.setColorId(this._bodyItemColor(win, object, index));
      }
    });
    return contents;
  }

  /**
   * body項目の色を取得する
   * @param window
   * @param object
   * @param index
   */
  protected _bodyItemColor(win: WindowBase, object, index: number) {
    return this.getItemColor(win, object, index);
  }

  /**
   * 項目の色を取得
   * @param win
   * @param object
   * @param index
   */
  getItemColor(win: WindowBase, object: unknown, index: number): number;
  getItemColor() {
    return 0;
  }

  /**
   * 状態によって表示する色Idを取得
   * @param member
   * @returns
   */
  protected _getStateColorId(member: GameMember) {
    const state = member.getHighestState((state) => state.colorId);
    if (state) {
      return state.colorId;
    }
    if (member.hpDanger) {
      return this._dangerHpColorId;
    }
    return 0;
  }

  /**
   * 危険HP色
   * @returns
   */
  protected get _dangerHpColorId() {
    return 1;
  }

  /**
   * フォント情報を取得
   */
  protected _getFontInfo() {
    return { size: '16px', name: system.fonts[1].name, height: 16 };
  }

  /**
   * ウィンドウテキストコンバート
   * ウィンドウシステムのテキストがnullを想定していないから
   * なんらかの文字列を返す必要がある
   * @param text
   * @param object
   */
  private _convertText(text: string, object) {
    // グローバルデータ
    text = this._convertTextGlobal(text);
    // オブジェクト情報が未定義ならそのまま返す
    if (object === undefined) {
      return text;
    }
    // オブジェクト情報を利用しての変換
    if (typeof object === 'number') {
      text = text.replace('\\s', Utils.convertFull(object.toString(10)));
    } else if (typeof object === 'string') {
      // テキストのobjectを指定
      text = text.replace('\\s', object);
    } else if (typeof object === 'object') {
      // 任意のobjectを指定
      text = text.replace(/\\o\[(\w+)\]/gi, (_match, p1) => {
        if (object === null) {
          return '';
        }
        const cResult = object[p1];
        const value = cResult !== undefined ? cResult : '0';
        if (typeof value === 'number') {
          return Utils.convertFull(value.toString(10));
        } else {
          return value;
        }
      });
    }
    return text;
  }

  /**
   * グローバルデータを利用したコンバート
   * @param text
   */
  protected _convertTextGlobal(text) {
    text = text.replace('\\$', () => {
      const gold = gameParty.gold;
      return Utils.convertFull(gold.toString(10));
    });
    text = text.replace('\\gu', () => {
      return system.goldUnit;
    });
    text = text.replace('\\gn', () => {
      return system.goldName;
    });
    text = text.replace(/\\p\[(\w+)\]/gi, (_match, p1) => {
      return GameUtils.getPluralWord(p1, gameParty.memberLength);
    });
    text = this._replaceSlotStringText(text);
    return text;
  }

  /**
   * スロット文字列を変換する
   * @param text
   */
  protected _replaceSlotStringText(text) {
    return text.replace(/\\s\[(\w+)\]/gi, (match, p1) => {
      const object = getSlot(this._convertRefSlotText(p1));
      if (typeof object === 'number') {
        return Utils.convertFull(object.toString(10));
      } else if (typeof object === 'string') {
        return object;
      }
      // 他はそのまま返す
      return match;
    });
  }

  /**
   * 参照スロットテキストを変換
   * @param text
   */
  private _convertRefSlotText(text: string): number {
    const num = parseInt(text);
    // 数値の場合は数値型にして返す
    if (!isNaN(num)) {
      return num;
    }
    return getSlotId(text);
  }

  /**
   * 決定したときの更新
   * @param index
   * @param object
   * @param callback
   */
  protected _updateDecide(index: number, object?, callback = true) {
    this.focusWindow.setDecided(true);
    return this._createDecideResult({ index, object, callback });
  }

  /**
   * メッセージ送りしようとしたときの更新
   * ・ポーズ状態でボタンを押した
   * @returns
   */
  protected _updateNext(sound = true) {
    return { action: 'next', option: { sound } };
  }

  /**
   * なにもしないときの更新
   */
  protected _updateNone() {
    return this._getReturnNone();
  }

  /**
   * 決定したときの結果を作成
   * @param option
   */
  private _createDecideResult(option: DecideOption): MenuResult {
    return { action: 'decide', option };
  }

  /**
   * 何もしない時の戻り値を取得する
   * @returns
   */
  private _getReturnNone() {
    return GameMenu.RETURN_NONE;
  }

  /**
   * クラスを取得
   * @param name
   */
  static getClass(name: string) {
    return this._getMenuObj()[name];
  }

  /**
   * メニュークラスオブジェクト
   */
  private static _getMenuObj() {
    return {
      GameBattleMessage: GameBattleMessage,
      GameMenuBattleItemChoice: GameMenuBattleItemChoice,
      GameMenuBattleItemDo: GameMenuBattleItemDo,
      GameMenuBattleSpellChoice: GameMenuBattleSpellChoice,
      GameMenuEnemySelect: GameMenuEnemySelect,
      GameMenuEquip: GameMenuEquip,
      GameMenuEquipAccessory: GameMenuEquipAccessory,
      GameMenuEquipArmor: GameMenuEquipArmor,
      GameMenuEquipHelmet: GameMenuEquipHelmet,
      GameMenuEquipShield: GameMenuEquipShield,
      GameMenuEquipWeapon: GameMenuEquipWeapon,
      GameMenuFix: GameMenuFix,
      GameMenuGoods: GameMenuGoods,
      GameMenuBank: GameMenuBank,
      GameMenuItem: GameMenuItem,
      GameMenuItemChoice: GameMenuItemChoice,
      GameMenuItemDo: GameMenuItemDo,
      GameMenuItemTransfer: GameMenuItemTransfer,
      GameMenuOrder: GameMenuOrder,
      GameMenuSelect: GameMenuSelect,
      GameMenuNameList: GameMenuNameList,
      GameSaveNameList: GameSaveNameList,
      GameMenuShow: GameMenuShow,
      GameMenuSpell: GameMenuSpell,
      GameMenuSpellChoice: GameMenuSpellChoice,
      GameMenuSelectTarget: GameMenuSelectTarget,
      GameMenuStatus: GameMenuStatus,
      GameMenuStatusSpell: GameMenuStatusSpell,
      GameMessage: GameMessage,
      GameMenuNameInput: GameMenuNameInput,
      GameMenuNumberEdit: GameMenuNumberEdit,
      GameMenuSlotEdit: GameMenuSlotEdit,
      GameMenuFlagList: GameMenuFlagList,
      GameMenuVariableList: GameMenuVariableList,
      GameMenuSlotList: GameMenuSlotList,
      GameMenuTroopList: GameMenuTroopList,
    };
  }

  /**
   * ウィンドウクラスを取得
   * @param name
   */
  static getWindowClass(name: string) {
    return this._getWindowObj()[name];
  }

  /**
   * ウィンドウクラスオブジェクト
   */
  private static _getWindowObj() {
    return {
      WindowFrame: WindowFrame,
      WindowContent: WindowContent,
      WindowMessage: WindowMessage,
    };
  }
}
