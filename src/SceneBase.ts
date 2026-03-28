/* eslint-disable @typescript-eslint/no-explicit-any */
import { gameAnimations, gameMenus, gameScreen } from './DataStore';
import { SceneManager } from './SceneManager';
import { ViewBase } from './ViewBase';

/**
 * シーンのベース
 */
export class SceneBase {
  /**
   * 表示オブジェクト
   */
  private _view: ViewBase | null;
  private _updateFrame: () => void;
  private _subMap: Map<string, SceneBase>;
  protected _extra: any;

  /**
   * コンストラクタ
   * @param args
   */
  constructor(...args) {
    const data = args[0];
    this._view = null;
    this._updateFrame = this.create;
    this._subMap = new Map();
    if (data !== undefined) {
      this._extra = data;
    }
  }

  /**
   * サブシーンのマッピングを取得する
   */
  get subMap() {
    return this._subMap;
  }

  /**
   * 表示オブジェクトを設定
   * @param view
   */
  setView(view: ViewBase) {
    this._view = view;
  }

  /**
   * 表示オブジェクトを取得
   */
  get view() {
    return this._view;
  }

  get updateFrame() {
    return this._updateFrame;
  }

  set updateFrame(next) {
    this._updateFrame = next;
  }

  /**
   * シーンを変更
   * @param className
   * @param data
   */
  changeScene(className: string, data?) {
    SceneManager.callScene(className, data);
  }

  /**
   * サブシーンを起動する
   * @param className
   * @param data
   */
  launchScene(className: string, data?) {
    const scene = SceneManager.launchScene(className, data);
    this._subMap.set(className, scene);
  }

  stopScene(className) {
    SceneManager.stopScene(className);
  }

  getSubScene(className) {
    return SceneManager.getSubScene(className);
  }

  create() {
    // これ終わったらwait()に遷移
  }

  wait() {
    // これ終わったらupdate()に遷移という具合
  }

  /**
   * 更新
   */
  update() {
    //
  }

  /**
   * 親の場合だけupdateFrameの前に呼ばれる
   */
  willUpdateFrame() {
    //
  }

  /**
   * 親の場合だけupdateFrameの後に呼ばれれる
   */
  didUpdateFrame() {
    gameAnimations?.update();
    gameScreen?.update();
    gameMenus?.update();
    this._view?.update();
  }

  /**
   * 終了処理
   */
  terminate() {
    this._view?.remove();
  }

  changeUpdateFrame(methodName: string, exec = false) {
    this.updateFrame = this[methodName];
    if (exec) {
      this.updateFrame();
    }
  }

  changePreload(exec = false) {
    this.changeUpdateFrame('preload', exec);
  }

  changeCreate(exec = false) {
    this.changeUpdateFrame('create', exec);
  }

  changeWait(exec = false) {
    this.changeUpdateFrame('wait', exec);
  }

  changeUpdate(exec = false) {
    this.changeUpdateFrame('update', exec);
  }

  /**
   * フェードインを開始する
   * @param value
   * @param fn
   */
  protected _startFadeIn(value: number, fn?: () => void) {
    gameScreen.setFadeInDuration(value, false, fn);
  }

  /**
   * フェードアウトを開始する
   * @param value
   * @param fn
   */
  protected _startFadeOut(value: number, fn?: () => void) {
    gameScreen.setFadeOutDuration(value, false, fn);
  }
}
