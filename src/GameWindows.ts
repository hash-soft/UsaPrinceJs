/* eslint-disable @typescript-eslint/no-explicit-any */
import { gameTemp } from './DataStore';
import { GameMaterial } from './GameMaterial';
import { GameMenu } from './GameMenu';
import { WindowBase } from './WindowBase';

/**
 * ウィンドウを管理する
 */
export class GameWindows extends GameMaterial {
  /**
   * ウィンドウリスト
   */
  private _windowList: WindowBase[] = [];
  /**
   * 表示順を管理するインデックスリスト
   */
  private _listIndex: number[] = [0];
  /**
   * 全更新をするかのフラグ
   */
  private _allDirty: boolean = false;

  /**
   * ウィンドウリストを取得する
   */
  get windowList() {
    return this._windowList;
  }

  /**
   * 全更新をするかを取得する
   */
  get allDirty() {
    return this._allDirty;
  }

  /**
   * 全更新をするよう設定する
   */
  set allDirty(value: boolean) {
    this._allDirty = value;
  }

  /**
   * 指定インデックスのリストをトップに持ってくる
   * @param index
   */
  top(index: number) {
    this._allDirty = true;
    // 最後を取得
    const endList = this._listIndex[this._listIndex.length - 1];
    // 移動情報を取得
    const begin = this._listIndex[index];
    // 取得ついでに削除
    const end = this._listIndex.splice(index + 1, 1)[0];
    const window = this._windowList.splice(begin, end - begin);
    this._windowList.push(...window);

    // 前後のウィンドウ数の差
    const sub = end - begin;
    // 差分を引いていく
    for (let i = index + 1; i < this._listIndex.length; i++) {
      this._listIndex[i] -= sub;
    }
    // 最後を戻す
    this._listIndex.push(endList);
  }

  /**
   * ウィンドウ追加
   * @param window
   */
  pushes(window: WindowBase[]) {
    this._windowList.push(...window);
    this._listIndex.push(this._windowList.length);
  }

  /**
   * ウィンドウを取り除く
   */
  pops() {
    this._allDirty = true;
    const end = this._listIndex.pop() ?? 0;
    const begin = this._listIndex[this._listIndex.length - 1];
    // 個数分削除
    const windows = this._windowList.splice(begin, end - begin);
    // 一応
    windows.forEach((window) => window.destroy());

    return windows;
  }

  /**
   * 指定インデックスを削除する
   * @param index
   */
  clearIndex(index: number) {
    this._allDirty = true;
    // 削除情報を取得
    // begin取得時に要素も削除する
    const begin = this._listIndex.splice(index, 1)[0];
    const end = this._listIndex[index];
    this._windowList.splice(begin, end - begin);
    // 削除ウィンドウ数
    const sub = end - begin;
    // 差分を引いていく
    for (let i = index; i < this._listIndex.length; i++) {
      this._listIndex[i] -= sub;
    }
  }

  clearList() {
    if (this._windowList.length === 0) {
      return;
    }
    // 描画時ウィンドウシート全クリア
    this._allDirty = true;
    this._windowList.forEach((value) => value.destroy());
    this._windowList.length = 0;
    this._listIndex = [0];
  }

  clearDirty() {
    this.allDirty = false;
    this._windowList.forEach((value) => value.clearDirty());
  }

  /**
   * 更新
   */
  update() {
    // 全更新の場合は全ウィンドウの全範囲を更新するよう設定する
    if (this._allDirty) {
      this._updateAllWindows();
    }
  }

  private _updateAllWindows() {
    for (let i = 0; i < this._windowList.length; i++) {
      this._windowList[i].setDirtyAllArea();
    }
  }
}

/**
 * 構築するメニュー情報
 */
export type MenuInfo = {
  id: number;
  params: any[];
  fn?: (number?, any?) => void;
  waiting: boolean;
};

/**
 * メニューオブジェクトを管理する
 * メッセージオブジェクトも含む
 */
export class GameMenus {
  /**
   * メニュー群
   */
  private _menus: GameMenu[];
  /**
   * ViewWindowで使用する
   */
  private _windows: GameWindows;
  /**
   * 開始メニュー予約
   */
  private _startMenuInfo: MenuInfo[];
  /**
   * 終了させるメニューId
   */
  private _endMenuIds: number[];
  //private _closing: boolean;
  /**
   * 変動ウィンドウを更新するかのフラグ
   */
  private _fluctuate: boolean;
  /**
   * フォーカス中のメニュー
   */
  private _focusMenu: GameMenu | null;
  /**
   * 処理の遅延時間
   */
  private _openDelayTime: number;

  /**
   * コンストラクタ
   */
  constructor() {
    this._menus = [];
    this._windows = new GameWindows();
    this._startMenuInfo = [];
    this._endMenuIds = [];
    this._fluctuate = false;
    this._focusMenu = null;
    this._openDelayTime = 0;
  }

  /**
   * ウィンドウ群を取得する
   */
  get windows() {
    return this._windows;
  }

  /**
   * 開始メニュー予約情報
   */
  get startMenuInfo() {
    return this._openDelayTime > 0 ? [] : this._startMenuInfo;
  }

  /**
   * メニュー表示中か
   * 表示中はキャラクターの自律移動をできないようにする
   * 強制移動は可能
   */
  get hasMenu() {
    return (
      this._menus.length > 0 ||
      this._startMenuInfo.length > 0 ||
      this._openDelayTime > 0
    );
  }

  /**
   * 処理中か
   * フォーカスメニューが処理中かを返す
   * ウィンドウ作成指示から直後に作成されないので開始待機時はwaitingがtrueになる
   * 次処理可能状態になるとfalseを返す
   */
  get processing() {
    return (
      (this._focusMenu === null ? false : this._focusMenu.processing) ||
      this.waitingStartMenu()
    );
  }

  /**
   * フォーカスウィンドウを取得する
   */
  get focus() {
    return this._focusMenu;
  }

  /**
   * フォーカスがあるか
   */
  hasFocus() {
    return this._focusMenu !== null;
  }

  /**
   * メニューの動的項目更新をONにする
   */
  fluctuateOn() {
    this._fluctuate = true;
  }

  /**
   * メニュー表示の遅延時間を設定する
   * @param value
   */
  setOpenDelayTime(value: number) {
    this._openDelayTime = value;
  }

  /**
   * 開始メニューを追加
   * @param id
   * @param params
   * @param fn
   * @param waiting
   */
  pushStartMenuInfo(id: number, params, fn?, waiting = true) {
    this._startMenuInfo.push({ id, params, fn, waiting });
  }

  /**
   * メニュー開始予約で待機があるか
   * @returns
   */
  waitingStartMenu() {
    return this._startMenuInfo.some((info) => info.waiting);
  }

  /**
   * 開始メニュー予約をクリアする
   */
  clearStartMenuInfo() {
    this._startMenuInfo.length = 0;
  }

  /**
   * 終了するメニューを追加する
   * @param id
   */
  pushEndMenuId(id: number) {
    this._endMenuIds.push(id);
  }

  /**
   * すべてのメニューを終了に追加する
   */
  endAll() {
    this._endMenuIds = this._menus.map((menu) => menu.menuId);
  }

  /**
   * 指定のメニューId(windowsetid)のメニューを探す
   * @param id
   */
  find(id: number) {
    return this._menus.find((menu) => menu.menuId === id);
  }

  /**
   * 選択しているインデックス
   * @param id
   */
  selectedIndex(id: number) {
    const menu = this.find(id);
    return menu?.selectedIndex() ?? -1;
  }

  /**
   * 先頭のメニューを取得する
   * ない場合はnull
   */
  getTop() {
    if (this._menus.length === 0) {
      return null;
    }
    return this._menus[this._menus.length - 1];
  }

  /**
   * 項目を再構成の指定があるウィンドウを再構成する
   * @returns
   */
  refreshFluctuate() {
    if (!this._fluctuate) {
      return;
    }
    this._fluctuate = false;
    this._menus.forEach((menu) => {
      menu.refreshFluctuateWindow();
    });
    // 全書き直し
    this._windows.allDirty = true;
  }

  /**
   * 再描画しなおし
   */
  repaint() {
    this._windows.allDirty = true;
  }

  /**
   * 指定のメニューをトップ（配列の最後）に持っていく
   * @param menu
   * @returns
   */
  top(menu: GameMenu) {
    // すでにトップの場合はなにもしない
    if (menu === this._menus[this._menus.length - 1]) {
      return;
    }
    const index = this._menus.findIndex((value) => value === menu);
    const topMenu = this._menus.splice(index, 1);
    this._menus.push(topMenu[0]);
    this._windows.top(index);
  }

  /**
   * menuクラスを最後に追加
   * @param value
   */
  push(value: GameMenu) {
    this._windows.pushes(value.windowList);
    this._menus.push(value);
  }

  pop() {
    this._windows.pops();
    this._menus.pop();
  }

  clear() {
    this._windows.clearList();
    this._menus.length = 0;
    this.clearFocus();
  }

  /**
   * 終了予約されているメニューを終了する
   */
  clearEndMenu() {
    const endMenus = this._endMenuIds.map((id) => {
      const menu = this.find(id);
      if (menu === undefined) {
        return null;
      }
      const index = this._menus.findIndex((value) => value === menu);
      this._menus.splice(index, 1);
      this._windows.clearIndex(index);
      this._removeFocus(menu);
      return menu;
    });
    this._endMenuIds.length = 0;

    return endMenus;
  }

  /**
   * 指定のidのメニューを終了する
   * 通常は予約終了を使用する
   * @param id
   */
  endMenu(id: number) {
    const menu = this.find(id);
    if (menu === undefined) {
      return null;
    }

    const index = this._menus.findIndex((value) => value === menu);
    this._menus.splice(index, 1);
    this._windows.clearIndex(index);
    this._removeFocus(menu);

    return menu;
  }

  /**
   * コールバックを設定する
   * @param id
   * @param fn
   */
  setFn(id: number, fn: (index: number, object: unknown) => void) {
    const menu = this.find(id);
    if (menu) {
      menu.setFn(fn);
      return true;
    } else {
      return false;
    }
  }

  /**
   * 指定のメニューにフォーカスが設定されていれば
   * 外す
   * @param menu
   */
  private _removeFocus(menu: GameMenu) {
    if (this._focusMenu === menu) {
      this.clearFocus();
    }
  }

  /**
   * フォーカスを設定する
   * @param menu
   */
  setFocus(menu: GameMenu) {
    this._focusMenu = menu;
  }

  /**
   * フォーカスを外す
   */
  clearFocus() {
    this._focusMenu = null;
  }

  /**
   * フォーカスに設定されているメニューが
   * あるか確認する
   * なければ外す
   */
  checkFocus() {
    if (this._focusMenu === null) {
      return;
    }
    if (!this._menus.includes(this._focusMenu)) {
      this.clearFocus();
    }
  }

  /**
   * メッセージにフォーカスがあるか
   */
  messageFocus() {
    const id = gameTemp.getMessageMenuId();
    return this._focusMenu?.menuId === id ? true : false;
  }

  /**
   * 更新
   */
  update() {
    if (this._openDelayTime > 0) {
      this._openDelayTime--;
    }
    this._windows.update();
  }
}
