import { system } from './DataStore';
import { ActionConditionParam } from './DataTypes';
import { SaveHeader, SuspendHeader } from './DataUtils';
import { GameMapAction } from './GameAction';
import { ActionResult } from './GameActionUtils';
import { checkTestPlay } from './GameConfig';
import { GamePicture } from './GamePicture';
import { Point } from './GameTypes';
import { EUnitTurnType } from './GameUnit';
import { GameUtils } from './GameUtils';

import Utils from './Utils';

export interface SaveFileInfo {
  id: number;
  invalid: boolean;
  exist: boolean;
  header: SaveHeader;
  suspendExist: boolean;
  suspendHeader: SuspendHeader;
}

export interface SuspendFileInfo {
  id: number;
  suspendExist: boolean;
  suspendHeader: SuspendHeader;
}

/**
 * 戦闘オプション
 */
export interface GameBattleOptions {
  escape: boolean;
  escapeScript: number;
  winScript: number;
  loseScript: number;
  preemptive: boolean;
  preemptiveType: number;
  bgmId: number;
}

/**
 * 共通スクリプト情報
 */
interface CommonScriptInfo {
  kind: number;
  id: number;
  callFn?: () => void;
}

/**
 * 一時データクラスの中断オブジェクト
 */
export interface SuspendObjectGameTemp {
  slots: Array<number | string>;
}

/**
 * 一時データクラス
 */
export class GameTemp {
  /**
   * 日記リスト
   */
  private _diaryList: SaveFileInfo[];
  /**
   * 使用日記Id
   */
  private _diaryId: number;
  /**
   * 続きからかどうか
   */
  private _resume: boolean;
  /**
   * テストプレイモードかどうか
   */
  private _testPlay: boolean;
  /**
   * ウィンドウ更新ロックフラグ
   */
  private _windowLock: boolean;
  /**
   * イベント刷新フラグ
   */
  private _needsRefreshEvent: boolean;
  /**
   * 隊列刷新フラグ
   */
  private _needsRefreshMarch: boolean;
  /**
   * 置き換えるタイル位置
   * マップの再描画判定に使っているだけでなので保存不要
   */
  private _replaceTilePositions: Point[];
  /**
   * 部屋移動
   */
  private _changeRoom: boolean;

  /**
   * デバッグ起動フラグ
   */
  private _debugCalling: boolean;
  /**
   * 共通スクリプトキュー
   */
  private _commonScriptQueue: CommonScriptInfo[];
  /**
   * 一時保存領域
   * 数値と文字列を入れることができる
   */
  private _slots: Array<number | string>;
  /**
   * スナップピクチャー
   */
  private _snapPicture: GamePicture;
  /**
   * マップ画面のアクション
   */
  private _mapAction: GameMapAction;
  /**
   * 戦闘中か
   */
  private _inBattle: boolean;
  /**
   * セーブ中か
   */
  private _saving: boolean;
  /**
   * 移動ルート待機中の足踏み
   */
  private _moveRouteWaitStep: boolean = false;
  /**
   * 先頭者指定移動中
   */
  private _leaderMoveRouteOverride: boolean = false;
  /**
   * スクリプト実行時の行動者
   */
  private _actionActorId: number;
  /**
   * スクリプト実行時の対象者
   */
  private _actionTargetId: number;
  /**
   * 行動結果
   */
  private _actionResults: ActionResult[];
  /**
   * 敵の群れオプション
   */
  private _battleOptions: GameBattleOptions;
  /**
   * 場所移動時のクリーンアップスクリプトId
   */
  private _transferCleanupId: number = 0;
  /**
   * 場所移動時に乗り物から出るか
   */
  private _transferGetOut: boolean = false;

  /**
   * コンストラクタ
   */
  constructor() {
    this._diaryList = [];
    this._diaryId = 0;
    this._resume = false;
    this._testPlay = checkTestPlay();
    this._windowLock = false;
    this._needsRefreshEvent = false;
    this._needsRefreshMarch = false;
    // こいつらtempじゃなくてmapに持たせるでよさそうだが今更なので放置
    this._replaceTilePositions = [];
    this._debugCalling = false;
    this._commonScriptQueue = [];
    this._slots = [];
    this._snapPicture = new GamePicture();
    this._mapAction = new GameMapAction();
    this._inBattle = false;
    this._saving = false;
    this._actionActorId = -1;
    this._actionTargetId = -1;
    this._actionResults = [];
    this._battleOptions = this._makeEmptyBattleOption();
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameTemp) {
    this._slots = data.slots ?? this._slots;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameTemp {
    return { slots: this._slots };
  }

  //----------------------------------------------------------
  // 共通

  /**
   * 日記リストを設定する
   * @param value
   */
  setDiaryList(value: SaveFileInfo[]) {
    this._diaryList = value;
  }

  /**
   * 日記リストを取得する
   */
  get diaryList(): SaveFileInfo[] {
    return this._diaryList;
  }

  /**
   * 使用日記Idを設定
   * @param value
   */
  setDiaryId(value: number) {
    this._diaryId = value;
  }

  /**
   * 使用日記Idを取得
   */
  get diaryId() {
    return this._diaryId;
  }

  /**
   * 続きからかどうかを設定する
   * @param value
   */
  setResume(value: boolean) {
    this._resume = value;
  }

  /**
   * 続きからかどうかを取得する
   */
  get resume() {
    return this._resume;
  }

  /**
   * テストプレイモードかどうかを取得する
   */
  get testPlay() {
    return this._testPlay;
  }

  //----------------------------------------------------------
  // マップ

  /**
   * ウィンドウ更新ロック
   * 未使用
   * @param value
   */
  setWindowLock(value: boolean) {
    this._windowLock = value;
  }

  /**
   * ウィンドウ更新ロックの取得
   * 未使用
   */
  get windowLock() {
    return this._windowLock;
  }

  /**
   * イベント刷新フラグの取得
   */
  get needsRefreshEvent() {
    return this._needsRefreshEvent;
  }

  /**
   * 隊列刷新フラグの取得
   */
  get needsRefreshMarch() {
    return this._needsRefreshMarch;
  }

  /**
   * スナップ画像の取得
   */
  get snapPicture() {
    return this._snapPicture;
  }

  /**
   * 部屋移動を取得
   */
  get changeRoom() {
    return this._changeRoom;
  }

  /**
   * クリーンアップ実行Idを取得する
   * 0の場合は実行しない
   */
  get transferCleanupId() {
    return this._transferCleanupId;
  }

  /**
   * 乗り物から出るかどうかを取得する
   */
  get transferGetOut() {
    return this._transferGetOut;
  }

  /**
   * 部屋移動を開始
   */
  startChangeRoom() {
    this._changeRoom = true;
  }

  /**
   * 部屋移動を消去
   */
  endChangeRoom() {
    this._changeRoom = false;
  }

  /**
   * クリーンアップ実行Idを設定する
   * 0の場合は実行しない
   * @param id
   */
  setTransferCleanupId(id: number) {
    this._transferCleanupId = id;
  }

  /**
   * 乗り物から出るかどうかを設定する
   * @param value
   */
  setTransferGetOut(value: boolean) {
    this._transferGetOut = value;
  }

  //----------------------------------------------------------
  // マップ行動

  /**
   * マップ行動を取得する
   */
  get mapAction() {
    return this._mapAction;
  }

  /**
   * マップ行動をクリアする
   */
  clearMapAction() {
    this._mapAction.clear();
  }

  /**
   * マップ行動結果をクリアする
   */
  clearMapActionResult() {
    this._mapAction.clearResult();
  }

  /**
   * イベント更新要求をかける
   */
  requestRefreshEvent() {
    this._needsRefreshEvent = true;
  }

  /**
   * イベント更新要求を終了する
   */
  endRefreshEvent() {
    this._needsRefreshEvent = false;
  }

  /**
   * 隊列更新要求をかける
   */
  requestRefreshMarch() {
    this._needsRefreshMarch = true;
  }

  /**
   * 隊列更新要求を終了する
   */
  endRefreshMarch() {
    this._needsRefreshMarch = false;
  }

  /**
   * 変化したタイル位置情報を追加
   * @param x
   * @param y
   */
  pushReplaceTilePositions(x: number, y: number) {
    this._replaceTilePositions.push({ x, y });
  }

  /**
   * 変化したタイル位置情報を取得
   */
  get replaceTilePositions() {
    return this._replaceTilePositions;
  }

  /**
   * 変化したタイル位置情報を削除
   */
  clearReplaceTilePositions() {
    this._replaceTilePositions.length = 0;
  }

  /**
   * デバッグ呼び出し開始予約
   */
  startDebugCalling() {
    this._debugCalling = true;
  }

  /**
   * デバッグ呼び出しをクリアする
   */
  clearDebugCalling() {
    this._debugCalling = false;
  }

  /**
   * デバッグ呼び出しフラグを取得する
   */
  get debugCalling() {
    return this._debugCalling;
  }

  /**
   * 共通スクリプト呼び出し予約を追加
   */
  pushCommonScript(id: number, callFn?: () => void) {
    this._commonScriptQueue.push({ kind: 0, id, callFn });
  }

  /**
   * マップスクリプト呼び出し予約を追加
   */
  pushMapScript(id: number, callFn?: () => void) {
    this._commonScriptQueue.push({ kind: 1, id, callFn });
  }

  /**
   * スクリプト呼び出し予約の先頭を削除して取得
   */
  shiftScript() {
    return this._commonScriptQueue.shift();
  }

  /**
   * スクリプトの予約があるか
   */
  reservedScript() {
    return this._commonScriptQueue.length > 0;
  }

  /**
   * スロットを取得
   */
  get slots() {
    return this._slots;
  }

  /**
   * スロットデータを取得する
   * @param id
   */
  getSlot(id: number) {
    return this._slots[id];
  }

  /**
   * スロットデータを設定する
   * @param id
   * @param value
   */
  setSlot(id: number, value: number | string) {
    if (!id) {
      return;
    }
    this._slots[id] = value;
  }

  /**
   * スロットを数値かチェックして取得する
   * 数値以外の場合は0を返す
   * @param id
   */
  getSlotNumber(id: number): number {
    return GameUtils.slotToNumber(this.getSlot(id));
  }

  /**
   * スロットを文字かチェックして取得する
   * 文字以外の場合は空白を返す
   * @param id
   */
  getSlotText(id: number) {
    const slot = this.getSlot(id);
    // 文字でなければ''
    return typeof slot !== 'string' ? '' : slot;
  }

  /**
   * スロットをリセットする
   */
  resetSlots() {
    this._slots = [];
  }

  /**
   * 戦闘中か
   */
  get inBattle() {
    return this._inBattle;
  }

  /**
   * 戦闘中に設定
   */
  startBattle() {
    this._inBattle = true;
  }

  /**
   * 戦闘中を解除
   */
  clearInBattle() {
    this._inBattle = false;
  }

  /**
   * セーブ中か
   */
  get saving() {
    return this._saving;
  }

  /**
   * セーブ中にする
   */
  startSaving() {
    this._saving = true;
  }

  /**
   * セーブ終了にする
   */
  endSaving() {
    this._saving = false;
  }

  /**
   * メッセージメニューのIdを取得する
   */
  getMessageMenuId() {
    return this.inBattle
      ? system.battleMessageWindowId
      : system.messageWindowId;
  }

  /**
   * 移動ルート待機中に足踏みするかを設定
   * @param value
   */
  setMoveRouteWaitStep(value: boolean) {
    this._moveRouteWaitStep = value;
  }

  /**
   * 移動ルート待機中に足踏みするかを取得
   */
  get moveRouteWaitStep() {
    return this._moveRouteWaitStep;
  }

  /**
   * 先頭者が指定移動中かを設定
   * @param value
   */
  setLeaderMoveRouteOverride(value: boolean) {
    this._leaderMoveRouteOverride = value;
  }

  /**
   * 先頭者が指定移動中かを取得
   */
  get leaderMoveRouteOverride() {
    return this._leaderMoveRouteOverride;
  }

  /**
   * 行動者のIdを設定する
   * @param value
   */
  setActionActorId(value: number) {
    this._actionActorId = value;
  }

  /**
   * 行動者のIdを取得する
   */
  get actionActorId() {
    return this._actionActorId;
  }

  /**
   * 対象者のIdを設定する
   * @param value
   */
  setActionTargetId(value: number) {
    this._actionTargetId = value;
  }

  /**
   * 対象者のIdを取得する
   */
  get actionTargetId() {
    return this._actionTargetId;
  }

  /**
   * 行動結果をクリアする
   */
  clearActionResult() {
    this._actionResults = [];
  }

  /**
   * 行動結果を取り出す
   */
  retrieveActionResult() {
    return this._actionResults.shift();
  }

  /**
   * 行動結果を追加する
   * @param result
   */
  pushActionResult(result: ActionResult) {
    this._actionResults.push(result);
  }

  /**
   * 敵の群れオプションを設定する
   */
  setBattleOptions(troopOptions: GameBattleOptions) {
    this._battleOptions = troopOptions;
  }

  /**
   * 戦闘オプションをリセットする
   */
  resetBattleOptions() {
    this.setBattleOptions(this._makeEmptyBattleOption());
  }

  /**
   * 空の戦闘オプションを作成する
   * @returns
   */
  private _makeEmptyBattleOption(): GameBattleOptions {
    return {
      escape: true,
      escapeScript: 0,
      winScript: 0,
      loseScript: 0,
      preemptive: true,
      preemptiveType: 0,
      bgmId: 0,
    };
  }

  /**
   * 戦闘オプションを取得する
   */
  get battleOptions() {
    return this._battleOptions;
  }
}

/**
 * 戦闘一時データクラス
 */
export class GameBattleTemp {
  /**
   * 経験値
   */
  private _exp: number;
  /**
   * ゴールド
   */
  private _gold: number;
  /**
   * ドロップ情報
   */
  private _dropItemInfos: Array<{ enemyId: number; itemId: number }>;
  /**
   * ターン数
   */
  private _turnCount: number;
  /**
   * 最初のターンタイプ
   */
  private _firstTurnType: EUnitTurnType;
  /**
   * 最大ドロップ数
   */
  private static _MAX_DROP_ITEM = 4;

  /**
   * コンストラクタ
   */
  constructor() {
    this.clear();
  }

  /**
   * 戦闘一時情報をクリアする
   */
  clear() {
    this._exp = 0;
    this._gold = 0;
    this._dropItemInfos = [];
    this._turnCount = 0;
    this._firstTurnType = EUnitTurnType.Normal;
  }

  /**
   * 戦闘取得経験値を追加する
   * @param value
   */
  addExp(value: number) {
    this._exp += value;
    this._exp = GameUtils.limitTenDigit(this._exp);
  }

  /**
   * 戦闘取得経験値を取得する
   */
  get exp() {
    return this._exp;
  }

  /**
   * 戦闘取得ゴールドを追加する
   * @param value
   */
  addGold(value: number) {
    this._gold += value;
    this._gold = GameUtils.limitTenDigit(this._gold);
  }

  /**
   * 戦闘取得ゴールドを取得する
   */
  get gold() {
    return this._gold;
  }

  /**
   * 取得道具を追加する
   * @param enemyId
   * @param itemId
   * @returns
   */
  addDropItem(enemyId: number, itemId: number) {
    if (this._dropItemInfos.length < GameBattleTemp._MAX_DROP_ITEM) {
      this._dropItemInfos.push({ enemyId, itemId });
      return;
    }
    // 入れ替える場所を今回追加の道具も含めて決定する
    const index = Utils.randomInt(0, this._dropItemInfos.length + 1);
    if (index >= this._dropItemInfos.length) {
      return;
    }
    this._dropItemInfos[index].enemyId = enemyId;
    this._dropItemInfos[index].itemId = itemId;
  }

  /**
   * 取得道具を取得する
   */
  get dropItemInfos() {
    return this._dropItemInfos;
  }

  /**
   * ターン数を１増加する
   */
  increaseTurn() {
    this._turnCount += 1;
  }

  /**
   * ターン数を取得する
   */
  get turnCount() {
    return this._turnCount;
  }

  /**
   * 最初のターンタイプを設定する
   * @param type
   */
  setFirstTurnType(type: EUnitTurnType) {
    this._firstTurnType = type;
  }

  /**
   * どちらかが先制だったかを取得する
   */
  get preemptive() {
    return [
      EUnitTurnType.PartyRaid,
      EUnitTurnType.PartySurprise,
      EUnitTurnType.TroopRaid,
      EUnitTurnType.TroopSurprise,
    ].includes(this._firstTurnType);
  }

  /**
   * ターン条件を満たすか確認する
   * @param param0
   * @returns
   */
  meetTurnCondition({
    param1: a,
    param2: x,
    opeType: preemptive,
  }: ActionConditionParam) {
    const turn = this.turnCount;
    if (preemptive > 0) {
      return turn === 1 && this.preemptive;
    }
    if (x) {
      return a >= turn && turn % x === a % x;
    } else {
      return a === turn;
    }
  }
}
