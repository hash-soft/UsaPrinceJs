/// <reference types="fpsmeter" />
import { Graphics } from './Graphics';
import { AudioManager } from './AudioManager';
import { SceneManager } from './SceneManager';
import {
  EResolve,
  UsaConfig,
  checkTestPlay,
  defaultScreenshot,
  setSaveDataCompress,
  usaConfigName,
} from './GameConfig';
import { Input } from './Input';
import { ELogLevel, GameLog } from './GameLog';
import { ErrorManager } from './ErrorManager';

/**
 * メインウィンドウオブジェクト
 */
function mainWindow() {
  throw new Error('type error!');
}

mainWindow.meterVisible = false;
mainWindow.active = false;
mainWindow.stop = false;
mainWindow.meter = undefined as unknown as FPSMeter;
mainWindow.elapsedTime = 0;
mainWindow.screenshot = defaultScreenshot;

/**
 * ウィンドウサイズにゲーム画面を合わせる
 */
mainWindow.viewFit = function () {
  const ratex = window.innerWidth / EResolve.Width;
  const ratey = window.innerHeight / EResolve.Height;
  const rate = ratex > ratey ? ratey : ratex;
  const style = (Graphics.app.renderer.view as HTMLCanvasElement).style;

  style.width = EResolve.Width * rate + 'px';
  style.height = EResolve.Height * rate + 'px';
};

mainWindow.onLoad = function () {
  this.init().then(() => this.start());
};

/**
 * 初期処理
 * ウィンドウにフォーカスが当たるまで開始に進まない
 */
mainWindow.init = async function () {
  // PIXIのビューを最初に作っておく
  await Graphics.initialize(EResolve.Width, EResolve.Height);
  this.viewFit();
  this.makeFPSMeter();
  this.makeDebugHtml();
  const logDefault = checkTestPlay() ? ELogLevel.Debug : ELogLevel.Error;
  // 初期設定はdebugかどうかで決定
  setSaveDataCompress(!checkTestPlay());
  let inputSetOK = false;
  let logSetOK = false;
  try {
    const settingsText = await window.file.readTextFile(usaConfigName);
    if (settingsText) {
      const settings: UsaConfig = JSON.parse(settingsText);
      const logLevel = settings.logLevel ?? logDefault;
      GameLog.initialize(logLevel);
      Input.initialize(settings);
      // compressフラグが設定されている場合は強制設定
      if (settings.compress !== undefined) {
        setSaveDataCompress(settings.compress);
      }
      // スクリーンショット名が設定されている場合強制設定
      if (settings.screenshot) {
        const screenshot = settings.screenshot;
        mainWindow.screenshot.path = screenshot.path ?? defaultScreenshot.path;
        mainWindow.screenshot.format =
          screenshot.format ?? defaultScreenshot.format;
      }
      inputSetOK = true;
      logSetOK = true;
    }
  } catch (e) {
    GameLog.error(e);
  }
  if (!inputSetOK) {
    Input.initialize();
  }
  if (!logSetOK) {
    GameLog.initialize(logDefault);
  }
  while (!window.top?.document.hasFocus()) {
    GameLog.log('waiting...');
    await this.sleep(100);
  }

  window.addEventListener('resize', mainWindow.viewFit.bind(mainWindow));
  window.addEventListener('blur', mainWindow.blur.bind(mainWindow));
  window.addEventListener('focus', mainWindow.focus.bind(mainWindow));
  window.addEventListener('keyup', mainWindow.keyup.bind(mainWindow));
};

/**
 * スリープ処理
 * @param ms
 * @returns
 */
mainWindow.sleep = function (ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * FPSメーター作成
 */
mainWindow.makeFPSMeter = function () {
  const meterOptions = {
    show: 'ms',
    theme: 'colorful',
    decimals: 2,
    heat: 1,
    graph: 1,
  };
  this.meter = new FPSMeter(undefined, meterOptions);
  this.meterVisible = checkTestPlay();
  if (!this.meterVisible) {
    this.meter.hide();
  }
};

/**
 * デバッグHTML作成
 * @returns
 */
mainWindow.makeDebugHtml = function () {
  if (checkTestPlay()) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="slotInput">
              <div class="tabs">
                <input id="tabNumerics" type="radio" name="tab_item" checked />
                <label class="tab_item" for="tabNumerics">数値</label>
                <div class="tab_content">
                  <label
                    >スロット値：<input
                      id="numerics"
                      type="number"
                      min="-9999999"
                      max="9999999"
                      value="0"
                  /></label>
                </div>
                <input id="tabText" type="radio" name="tab_item" />
                <label class="tab_item" for="tabText">テキスト</label>
                <div class="tab_content">
                  <label
                    >スロット値：
                    <div>
                      <textarea class="text" id="text" rows="3"></textarea>
                    </div>
                  </label>
                </div>
              </div>
              <div class="buttonGroup">
                <button id="ok" class="decide">OK</button>
                <button id="cancel" class="decide">キャンセル</button>
              </div>
            </div>`
    );
  }
};

/**
 * ウィンドウのフォーカスが外れたとき
 */
mainWindow.blur = function () {
  if (this.stop || !this.active) {
    return;
  }
  Graphics.stopTicker();
  AudioManager.allPause();
  if (this.meterVisible) {
    this.meter.pause();
  }
  this.active = false;
};

/**
 * ウィンドウがフォーカス状態になったとき
 */
mainWindow.focus = function () {
  if (this.stop || this.active) {
    return;
  }
  if (this.meterVisible) {
    this.meter.resume();
  }
  AudioManager.allResume();
  Graphics.startTicker();
  this.active = true;
};

/**
 * キーアップイベントハンドラー
 * Ctrl + Alt の組み合わせが押されている場合は何もしない。
 * F2キーでFPSメーターを表示・非表示に切り替え、
 * F3キーでFPSメーターの表示状態をトグルする。
 *
 * @param event - キーボードイベントオブジェクト
 */
mainWindow.keyup = function (event: KeyboardEvent) {
  if (event.ctrlKey && event.altKey) {
    return;
  }

  const code = event.code.toLowerCase();
  switch (code) {
    case 'f2':
      if (this.meterVisible) {
        this.meter.hide();
        this.meterVisible = false;
      } else {
        this.meter.show();
        this.meterVisible = true;
      }
      break;
    case 'f3':
      if (this.meterVisible) {
        this.meter.toggle();
      }
      break;
    case 'f4':
    case 'f5':
    case 'f6':
    case 'f12':
      window.file.specialKeyDown(code);
      break;
    case 'f10':
      this.takeScreenshot();
      break;
  }
};

/**
 * ここからシーンを開始
 */
mainWindow.start = function () {
  // 最初のシーン
  SceneManager.initScene('boot');
  // ゲームループ開始
  // renderの分を計測するためTickerのリスナーを変更する
  Graphics.setTickerListener(this.gameLoop, this);
  Graphics.startTicker();
  this.active = true;
};

/**
 * ゲームループ
 */
mainWindow.gameLoop = function (deltaTime: number) {
  this.meter.tickStart();

  const calcFrameNumber = () => {
    this.elapsedTime += deltaTime;
    const loop = Math.min((this.elapsedTime + 0.25) | 0, 2);
    this.elapsedTime -= loop;
    return loop;
  };
  const loop = calcFrameNumber();
  for (let i = 0; i < loop; i++) {
    const result = SceneManager.updateFrame();
    if (!result) {
      // ゲームを停止する
      this.stopGame();
      return;
    }
  }
  Graphics.render();

  if (loop !== 1) {
    GameLog.log(
      `count: ${loop}, elapsed: ${this.elapsedTime}, delta: ${deltaTime}`
    );
  }

  this.meter.tick();
};

/**
 * ゲームを停止する
 * Tickerを停止し、サウンドを一時停止する
 * FPSメーターも停止する
 */
mainWindow.stopGame = function () {
  this.stop = true;
  Graphics.stopTicker();
  AudioManager.allPause();
  if (this.meterVisible) {
    this.meter?.pause();
  }
};

/**
 * スナップショットをPNG形式で保存する
 * @returns {Promise<void>}
 */
mainWindow.takeScreenshot = function () {
  Graphics.getSnapshotUrl().then((url) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月は0始まりなので+1
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const nowStr = `${year}${month}${date}${hours}${minutes}${seconds}`;
    const filename = `${this.screenshot.path}/${this.screenshot.format.replace(
      '[d]',
      nowStr
    )}`;
    window.file.writeBase64File(
      filename,
      url.replace(/^data:image\/png;base64,/, '')
    );
  });
};

mainWindow.onError = function (e: ErrorEvent) {
  ErrorManager.showErrorScreen('エラー', e.error);
  this.stopGame();
};

mainWindow.onUnHandlerRejection = function (e: PromiseRejectionEvent) {
  ErrorManager.showErrorScreen('エラー', e.reason.message);
  this.stopGame();
};

window.addEventListener('error', mainWindow.onError.bind(mainWindow));
window.addEventListener(
  'unhandledrejection',
  mainWindow.onUnHandlerRejection.bind(mainWindow)
);
window.addEventListener('load', mainWindow.onLoad.bind(mainWindow));

window.file.onResetConfig((data: string) => {
  try {
    const settings: UsaConfig = JSON.parse(data);
    Input.reset(settings);
  } catch (e) {
    GameLog.error(e);
  }
  window.file.endResetConfig();
  return true;
});
