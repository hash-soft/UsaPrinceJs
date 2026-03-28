import { ErrorManager } from './ErrorManager';
import { Input } from './Input';
import { SceneBase } from './SceneBase';
import { SceneBattle, SceneBattleFight, SceneBattleOpen } from './SceneBattle';
import { SceneBoot } from './SceneBoot';
import { SceneEventWindow } from './SceneEventWindow';
import { SceneMap } from './SceneMap';
import { SceneStart } from './SceneStart';
import { SceneTitle } from './SceneTitle';
import Utils from './Utils';

/**
 * シーン管理クラス
 */
export class SceneManager {
  /**
   * 実行中のシーン
   */
  static scene: SceneBase;
  /**
   * 切り替わった直前のシーン
   */
  static lastScene: SceneBase | null;

  /**
   * シーン初期化
   * @param sceneName
   * @returns
   */
  static initScene(sceneName) {
    this.lastScene = null;
    return SceneManager.callScene(sceneName);
  }

  /**
   * シーンを作成する
   * @param sceneName
   * @param data
   */
  static createScene(sceneName, data) {
    const obj = {
      boot: SceneBoot,
      start: SceneStart,
      title: SceneTitle,
      map: SceneMap,
      battle: SceneBattle,
      eventWindow: SceneEventWindow,
      battleOpen: SceneBattleOpen,
      battleFight: SceneBattleFight,
    };
    const scene = new obj[sceneName](data);

    return scene;
  }

  /**
   * メインシーンを呼ぶ
   * @param sceneName
   * @param data
   */
  static callScene(sceneName, data?) {
    const scene = SceneManager.createScene(sceneName, data);
    // 直前のシーンが残っていれば終了して切替前のシーンを入れる
    this.lastScene?.terminate();
    this.lastScene = this.scene;
    // 新しいのを設定
    this.scene = scene;
    return scene;
  }

  /**
   * シーンを作成する
   * サブシーン用
   * @param sceneName
   * @param data
   */
  static launchScene(sceneName, data) {
    const scene = SceneManager.createScene(sceneName, data);
    return scene;
  }

  /**
   * サブシーンを削除する
   * @param className
   */
  static stopScene(className) {
    SceneManager.scene.subMap.delete(className);
  }

  /**
   * サブシーンを取得する
   * @param className
   */
  static getSubScene(className: string) {
    return SceneManager.scene.subMap.get(className);
  }

  /**
   * フレーム更新
   */
  static updateFrame() {
    try {
      this._updateProcess();
      return true;
    } catch (e: unknown) {
      ErrorManager.catchException(e);
      return false;
    }
  }

  /**
   * 更新処理
   */
  private static _updateProcess() {
    this._checkError();
    // 前処理
    this._updatePreprocess();
    // 入力更新
    Input.update();
    if (this.lastScene) {
      // 残シーンの停止
      this.lastScene.terminate();
      this.lastScene = null;
    }
    // SceneManager.sceneが途中で変わると異なと異なるsceneの
    // 処理が呼び出されるためローカル変数に保存して呼び出す
    const scene = SceneManager.scene;
    scene.updateFrame();
    scene.subMap.forEach((value) => {
      value.updateFrame();
    });
    scene.didUpdateFrame();
  }

  /**
   * エラーを確認する
   */
  private static _checkError() {
    const error = Utils.popError();
    if (error) {
      const cause: Error[] = [];
      let innerError;
      while ((innerError = Utils.popError())) {
        cause.push(innerError);
      }
      error.cause = cause;
      throw error;
    }
  }

  /**
   * 更新の前処理
   */
  private static _updatePreprocess() {
    // フレームカウントを加算
    Utils.addFrameCount();
  }
}
