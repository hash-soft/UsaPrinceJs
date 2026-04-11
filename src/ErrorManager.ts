import { GameLog } from './GameLog';
import Utils from './Utils';

/**
 * エラー管理
 */
export class ErrorManager {
  /**
   * 例外処理
   * @param e
   */
  static catchException(e: unknown) {
    if (e instanceof Error) {
      this._normalException(e);
    } else if (Array.isArray(e)) {
      this._originalException(e);
    } else {
      this._elseException(e);
    }
  }

  /**
   * 通常の例外
   * @param e
   */
  private static _normalException(e: Error) {
    GameLog.error(e);
    this.showErrorScreen(e.name, e.message);
  }

  /**
   * 独自例外
   * @param e
   */
  private static _originalException(e: string[]) {
    GameLog.error(e);
    this.showErrorScreen(e[0], e[1]);
  }

  /**
   * 想定外の例外
   * @param e
   */
  private static _elseException(e: unknown) {
    GameLog.error(e);
    this.showErrorScreen('不明なエラー', e as string);
  }

  /**
   * エラースクリーンを表示
   * @param title タイトル
   * @param message メッセージ
   */
  public static showErrorScreen(title: string, message: string) {
    const coverElm = document.createElement('div');
    coverElm.className = 'error-bg-cover';
    const titleElm = document.createElement('div');
    titleElm.innerHTML = title;
    titleElm.className = 'error-title-text';
    const messageElm = document.createElement('div');
    messageElm.className = 'error-message-text';
    messageElm.innerHTML = message;
    const closeElm = document.createElement('button');
    closeElm.className = 'error-button';
    closeElm.innerHTML = '閉じる';
    closeElm.addEventListener('click', () => {
      this._close();
    });
    coverElm.innerHTML = titleElm.outerHTML + messageElm.outerHTML;
    coverElm.appendChild(closeElm);
    document.body.appendChild(coverElm);
  }

  /**
   * 終了処理
   */
  private static _close() {
    if (Utils.runningAndroid()) {
      window.android.sendMessage('close');
    } else {
      window.close();
    }
  }
}
