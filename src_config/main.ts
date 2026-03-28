/**
 * メイン
 */

import { KeyboardTable } from './KeyboardTable';
import { GamepadTable } from './GamepadTable';
import { TabSwitcher } from './TabSwitcher';
import { defaultConfig, UsaConfig, usaConfigName } from './UsaConfig';

const usaConfig: UsaConfig = structuredClone(defaultConfig);
const baseModalId = 'modal';

const tabSwitcher = new TabSwitcher('tab');
const keyboardTable = new KeyboardTable();
const gamepadTable = new GamepadTable();

window.addEventListener('DOMContentLoaded', async () => {
  await onDomContentLoaded();
});

/**
 * DOMContentLoadedイベントが発生した時に実行される処理
 *
 * 設定ファイルを読み込み、キーボード/ゲームパッドの設定を反映する
 * キーボード/ゲームパッドの監視を開始
 * 保存ボタン/キャンセルボタンにイベントリスナーを設定
 * フォーカス/ブルーイベントにイベントリスナーを設定
 */
const onDomContentLoaded = async () => {
  try {
    const result = await window.file.readTextFile(usaConfigName);
    if (result) {
      const json: UsaConfig = JSON.parse(result);
      if (json.keyboard) {
        usaConfig.keyboard = json.keyboard;
      }
      if (json.gamePad) {
        usaConfig.gamePad = json.gamePad;
      }
      // 編集対象外はそのまま入れる
      usaConfig.logLevel = json.logLevel;
      usaConfig.compress = json.compress;
      usaConfig.screenshot = json.screenshot;
    }
  } catch (e) {
    console.error(e);
  }
  tabSwitcher.setup();
  keyboardTable.setup(usaConfig.keyboard);
  keyboardTable.addKeyDownEvent();
  setKeyboardObserver();
  gamepadTable.setup(usaConfig.gamePad);
  setGamepadObserver();
  document.getElementById('save')?.addEventListener('click', () => {
    usaConfig.keyboard = keyboardTable.data.map((value) => [...value]);
    usaConfig.gamePad = gamepadTable.data.map((value) => [...value]);
    save();
  });
  document.getElementById('cancel')?.addEventListener('click', () => {
    cancel();
  });
  window.addEventListener('focus', onFocus);
  window.addEventListener('blur', onBlur);
  document.getElementById('modal-close')?.addEventListener('click', () => {
    toggleModal(baseModalId);
  });
  window.file.onEndResetConfig(() => {
    window.close();
  });
};

/**
 * キーボード設定タブのclass属性に変更があった場合にイベントを
 * 追加/削除する
 * @return {void}
 */
const setKeyboardObserver = () => {
  const content = tabSwitcher.getTabContent(0);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'class') {
          if (content.classList.contains('hidden')) {
            keyboardTable.removeKeyDownEvent();
          } else if (content.classList.contains('block')) {
            keyboardTable.addKeyDownEvent();
          }
        }
      }
    });
  });

  observer.observe(content, {
    attributes: true,
  });
};

/**
 * ゲームパッド設定タブのclass属性に変更があった場合にゲームパッド監視を
 * 開始/停止する
 * @return {void}
 */
const setGamepadObserver = () => {
  const content = tabSwitcher.getTabContent(1);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'class') {
          if (content.classList.contains('hidden')) {
            gamepadTable.endGamepadMonitoring();
          } else if (content.classList.contains('block')) {
            gamepadTable.startGamepadMonitoring();
          }
        }
      }
    });
  });

  observer.observe(content, {
    attributes: true,
  });
};

/**
 * Windowがフォーカスされた時、現在のタブがゲームパッド設定タブの
 * 場合にはゲームパッド監視を開始する
 */
const onFocus = () => {
  if (tabSwitcher.currentIndex !== 1) {
    return;
  }
  gamepadTable.startGamepadMonitoring();
};

/**
 * Windowがフォーカスを失った時、現在のタブがゲームパッド設定タブの
 * 場合にはゲームパッド監視を停止する
 */
const onBlur = () => {
  if (tabSwitcher.currentIndex !== 1) {
    return;
  }
  gamepadTable.endGamepadMonitoring();
};

/**
 * 現在の設定をファイルに保存し、ウィンドウを閉じる
 * 設定をJSON形式の文字列に変換し、フォーマットを調整して保存する。
 * 保存に失敗した場合はエラーメッセージをコンソールに出力し、モーダルを表示する。
 * @async
 */
const save = async () => {
  const configText = JSON.stringify(usaConfig, null, 2).replace(
    /\[\s+([^[]*?)\s+\]/gs,
    (_match, p1) => `[ ${p1.trim().replace(/\s+/g, ' ')} ]`
  );
  // ファイルに保存後、ゲームプロセスのキー設定を初期化する送信を行う
  // ゲームプロセス側からの通知はonEndResetConfigで受けるので
  // この関数内では送信だけで終了する
  const result = await window.file.writeTextFile(usaConfigName, configText);
  if (!result) {
    toggleModal(baseModalId);
    return;
  }
  await window.file.resetConfig(configText);
};

/**
 * モーダルをトグル表示する
 * @param {string} modalID - モーダルのid
 * @description
 * hiddenとflexクラスをトグルして、モーダルを表示/非表示にする。
 * また、モーダルのバックドロップも同様にトグルする。
 * @see https://tailwindcss.com/docs/display-and-visibility
 */
const toggleModal = (modalID: string) => {
  const modal = document.getElementById(modalID);
  const modalBackdrop = document.getElementById(modalID + '-backdrop');
  modal?.classList.toggle('hidden');
  modalBackdrop?.classList.toggle('hidden');
  modal?.classList.toggle('flex');
  modalBackdrop?.classList.toggle('flex');
};

/**
 * アプリケーションを閉じる
 * @async
 */
const cancel = async () => {
  window.close();
};
