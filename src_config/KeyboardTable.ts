/**
 * キーボートテーブルのクラス
 */

import { TableSelector } from './TableSelector';
import { defaultConfig, KeyMap } from './UsaConfig';

export class KeyboardTable extends TableSelector {
  /**
   * イベント削除のためのAbortController
   */
  private _controller!: AbortController;

  /**
   * コンストラクタ
   */
  constructor() {
    super('keyboard');
  }

  override setup(data: Readonly<KeyMap>) {
    super.setup(data);
    this._setButtonListener();
  }

  private _setButtonListener() {
    const allDeleteButton = document.getElementById('keyboard-all-delete');
    allDeleteButton?.addEventListener('click', () => {
      super.deleteKeyMap();
      super.resetTable();
    });
    const defaultButton = document.getElementById('keyboard-default');
    defaultButton?.addEventListener('click', () => {
      super.setKeyMap(defaultConfig.keyboard);
      super.resetTable();
    });
  }

  /**
   * キーダウンイベントを登録
   */
  addKeyDownEvent() {
    this._controller = new AbortController();
    document.addEventListener('keydown', this._onKeyDown.bind(this), {
      signal: this._controller.signal,
    });
  }

  /**
   * キーダウンイベントを削除
   */
  removeKeyDownEvent() {
    this._controller.abort();
  }

  /**
   * キーダウン時の処理
   * @param e
   */
  private _onKeyDown(e: KeyboardEvent) {
    // キーコードを拾えない
    // もしくは割り当て不可なキーな場合追加不可
    if (
      !e.code ||
      [
        'Backspace',
        'Tab',
        'F1',
        'F2',
        'F3',
        'F4',
        'F5',
        'F6',
        'F7',
        'F8',
        'F9',
        'F10',
        'F11',
        'F12',
      ].includes(e.code)
    ) {
      return;
    }
    this._pushData(e.code);
  }
}
