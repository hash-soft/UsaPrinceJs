import { GameSound } from './AudioUtils';
import { gameMenus, windowsets } from './DataStore';
import { DecideOption, GameMenu, MenuResult, NextOption } from './GameMenu';
import { GameMenuBase } from './GameMessage';
import { MenuInfo } from './GameWindows';
import { SceneBase } from './SceneBase';

/**
 * メッセージも含むメニューシーンのベース
 */
export class SceneMenuBase extends SceneBase {
  /**
   * updateでイベントの発生を待ち続ける
   * @param exec
   */
  create(exec = false) {
    super.changeUpdate(exec);
  }

  /**
   * 更新
   * @returns
   */
  update() {
    // 入力チェック
    // trueを返した場合は処理を終える
    if (this._checkInput()) {
      return;
    }
    // 終了が優先
    this._closeEndMenus();
    this._openStartMenus();
    this._checkFocus();
    // 再描画必要ウィンドウ
    gameMenus.refreshFluctuate();
    this._updateMenu();
  }

  /**
   * 入力チェック
   * 必要なら継承先で実装
   * @returns
   */
  protected _checkInput() {
    return false;
  }

  /**
   * 終了予約のメニューを閉じる
   * フォーカスメニューが含まれていたらフォーカスの参照を外す
   * ★ほんとは自動でトップのメニューにフォーカスを復帰させたいが
   * 自動復帰を考慮していないため外すことにする
   */
  private _closeEndMenus() {
    gameMenus.clearEndMenu();
  }

  /**
   * 開始予約されているメニューを開始
   */
  private _openStartMenus() {
    const menuInfo = gameMenus.startMenuInfo;
    if (menuInfo.length === 0) {
      return;
    }
    menuInfo.forEach((info) => this._startMenu(info));
    gameMenus.clearStartMenuInfo();
  }

  /**
   * メニュー開始
   * @param menuInfo
   */
  private _startMenu(menuInfo: MenuInfo) {
    // すでに存在するか
    const menu = gameMenus.find(menuInfo.id);
    // 存在する
    if (menu !== undefined) {
      this._setMenu(menuInfo, menu);
    } else {
      // メニューを作成する
      this._createMenu(menuInfo);
    }
  }

  /**
   * メニューの設定
   * @param menuInfo
   * @param menu
   */
  private _setMenu(menuInfo: MenuInfo, menu: GameMenu) {
    const restore = menu.checkRestore(gameMenus.focus, menuInfo.params);
    // 最前面に出し
    // モードレスでない場合はフォーカスを当てる
    if (restore) {
      gameMenus.top(menu);
      this._changeFocus(menu);
    }
    // データを入れ直す
    menu.setData(menuInfo.params, restore);
    menu.setFn(menuInfo.fn);
  }

  /**
   * メニューの作成
   * @param menuInfo
   */
  private _createMenu(menuInfo: MenuInfo) {
    const windowset = windowsets[menuInfo.id];
    const menuClass = GameMenuBase.getClass(windowset.className);
    const menu: GameMenu = new menuClass(menuInfo.id, menuInfo.params);
    menu.afterConstructor();
    menu.setFn(menuInfo.fn);
    gameMenus.push(menu);
    this._changeFocus(menu);
  }

  /**
   * フォーカスを変更する
   * すでにフォーカスがあたっているかモードレスの場合は変更しない
   * @param menu
   * @returns
   */
  private _changeFocus(menu: GameMenu) {
    if (menu === gameMenus.focus || menu.modeless) {
      return;
    }
    if (gameMenus.focus) {
      this._clearFocus(gameMenus.focus);
    }
    this._setFocus(menu);
  }

  /**
   * モードレスでない場合はフォーカスをあてる
   * @param menu
   */
  private _setFocus(menu: GameMenu) {
    gameMenus.setFocus(menu);
    menu.setFocus(true);
  }

  /**
   * フォーカスを外す
   * モードレスの場合は呼ばれない
   * @param menu
   */
  private _clearFocus(menu: GameMenu) {
    menu.setFocus(false);
    gameMenus.clearFocus();
  }

  /**
   * なんらかの理由でフォーカスを持っているメニューがなくなっていたら
   * 参照を外す
   */
  private _checkFocus() {
    gameMenus.checkFocus();
  }

  /**
   * メニュー更新
   */
  private _updateMenu() {
    // フォーカスがなければなにもしない
    const menu = gameMenus.focus;
    if (menu === null) {
      return;
    }
    // フォーカスが当たっているメニューを更新
    const result: MenuResult = menu.updateMenu();
    // 結果を受けて分岐する
    const methodName = '_' + result.action;
    if (this[methodName] !== undefined) {
      this[methodName](menu, result.option);
    }
  }

  /**
   * 決定処理
   * ※methodNameで使用されている
   * @param menu
   * @param option
   */
  private _decide(menu: GameMenu, option: DecideOption) {
    if (option.index >= 0) {
      GameSound.playDecide();
    }
    if (option.callback) {
      menu.onFn(option.index, option.object);
    }
  }

  /**
   * ポーズ解除
   * 決定音を鳴らすだけ
   * ※methodNameで使用されている
   */
  private _next(_menu: GameMenu, option: NextOption) {
    if (option.sound) {
      GameSound.playDecide();
    }
  }
}
