import { GameSound, GameMusic } from './AudioUtils';
import {
  gameTemp,
  gameMap,
  commonScriptset,
  gameSystem,
  gameMenus,
  gameParty,
  items,
  gameMembers,
  mapParts,
  system,
  mapList,
  gameScreen,
  gameMapSight,
  gameMarch,
  gameAnimations,
  terrains,
  skills,
  gameTroop,
  enemies,
  actionConditions,
  setLastSaveHeader,
  setLastSaveData,
  lastSaveData,
  lastSaveHeader,
} from './DataStore';
import { EEventTriggerHex, EventCommand, EventScript } from './DataTypes';
import {
  createSaveObject,
  createSuspendObject,
  getFlag,
  getSlot,
  getSlotId,
  getSlotNumber,
  getVariable,
  idToBattler,
  SaveHeader,
  SaveObject,
  setFlag,
  setSlot,
  setSystemSlot,
  setVariable,
  SuspendHeader,
  SuspendObject,
} from './DataUtils';
import { ExecutorItemKeep, ExecutorItemPickup } from './ExecutorBankMenu';
import { ExecutorBattleMenu } from './ExecutorBattleMenu';
import { ExecutorDebugMenu } from './ExecutorDebugMenu';
import {
  EmbeddedToExecutor,
  ExecutorBuy,
  ExecutorDiscard,
  ExecutorEmbeddedBase,
  ExecutorSell,
} from './ExecutorEmbedded';
import { ExecutorMapMenu } from './ExecutorMapMenu';
import { ExecutorStartMenu } from './ExecutorStartMenu';
import { ActionResult, newActionResult } from './GameActionUtils';
import { GameBattler } from './GameBattler';
import { GameCharacter } from './GameCharacter';
import { EMapScale } from './GameConfig';
import { GameEnemy } from './GameEnemy';
import { GameEvent, GamePerson } from './GameEvent';
import { GameLog } from './GameLog';
import { GameMember } from './GameMember';
import { EMessageOption } from './GameMessage';
import { EErrorMessage, GameNumberList, GameUtils } from './GameUtils';
import Utils from './Utils';

// コマンドの種類
// １．ウィンドウ
//     1〜10
// ２．変数
//     11〜30
// ３．条件式
//     31〜50
// ４．条件判定
//     51〜60
// ４．もちもの
//     61〜70
// ５．仲間
//     71～80
// ６．ステータス
//     81〜90
// ７．遷移
//     91〜100
// ８．移動
//     101〜110
// ９．制御
//     111〜120
// １０．オーディオ
//     121～130
// １１．シーン
//     131～140
// １２．画面
//     141～150
// １３．キャラ
//     151～160
// １４．マップ
//     161～170
// １５．戦闘
//     181～200
// １６．システム
//     211～230
export const enum ECommandCode {
  Message = 1,
  Menu = 2,
  EndMenu = 3,
  MessageSettings = 4,
  MessageCloseWait = 5,
  Embedded = 6,
  EndEmbedded = 7,
  EndWaitMessage = 8,
  Flag = 11,
  Variable = 12,
  OperateSlot = 13,
  AssignFixData = 14,
  AssignGameData = 15,
  AssignSystemSlot = 16,
  AssignMapInfo = 17,
  GOODS = 21,
  ItemSpace = 31,
  CompareSlot = 33,
  AssignResult = 34,
  JudgeBattler = 35,
  JudgeCondition = 36,
  CASE = 51,
  ELSE = 52,
  EndBranch = 53,
  BeginLoop = 54,
  EndLoop = 55,
  LABEL = 56,
  JUMP = 57,
  EXIT = 58,
  ExitLoop = 59,
  ChangeItem = 61,
  ChangeSkill = 62,
  ResetSkill = 63,
  ChangeExp = 64,
  ChangeLv = 65,
  ApplyLv = 66,
  ChangeParameter = 67,
  ChangeEquipment = 68,
  ChangeGold = 70,
  RegisterMate = 71,
  DeleteMate = 72,
  ChangeParty = 73,
  ChangeNpc = 74,
  RefreshMarch = 75,
  ChangeFollower = 76,
  Recover = 81,
  NameChange = 82,
  changeState = 83,
  ChangeTile = 99,
  SwapTile = 100,
  Move = 101,
  MoveFromPosition = 102,
  WARP = 103,
  Location = 104, // 現在のマップ内での移動
  MoveVehicle = 105,
  MoveSettings = 106,
  Scroll = 107,
  MoveRoute = 108,
  MoveRouteWait = 109,
  MarchControl = 110,
  MapScript = 111,
  CommonScript = 112,
  Wait = 113,
  FollowerSettings = 114,
  ResetEvent = 115,
  AddressSettings = 116,
  Suspend = 117,
  Resume = 118,
  Save = 119,
  Load = 120,
  Se = 121,
  BgmPlay = 123,
  BgmInterrupt = 124,
  ChangePlayerBgm = 125,
  Startup = 129,
  Cleanup = 130,
  EventTrigger = 131,
  BattleStart = 132,
  ScreenFadeOut = 141,
  ScreenFadeIn = 142,
  ScreenShake = 145,
  MapAnimation = 146,
  ChangeTransparent = 151,
  GatherFollowers = 152,
  GetOutVehicle = 153,
  CharacterOptions = 160,
  ResetObjects = 161,
  AssignLocationInformation = 162,
  CancelConsume = 169,
  DelayedConsume = 170,
  ShowPicture = 171,
  MovePicture = 172,
  ErasePicture = 175,
  PushActionResult = 181,
  ActionMessage = 182,
  ActionMessageSettings = 183,
  ActionEffect = 184,
  ActionTarget = 185,
  ActionExtra = 186,
  ActionForce = 187,
  ChangeBattlerImage = 188,
  TransformBattler = 189,
  Comment = 201,
  ChangeFloorDamage = 211,
  ChangeSlipDamage = 212,
  ChangeEncounter = 213,
  RoomMoveSettings = 214,
  EndWait = 999,
}

/**
 * 待機モード
 */
const enum EExecutorWaitMode {
  None,
  EffectLength,
  EffectEnd,
  Scroll,
  TargetRoute,
  MoveRoute,
  Gathering,
  Saving,
  Se,
  interruptBgm,
}

/**
 * スロット演算種類
 */
const enum EOperateSlotType {
  Value,
  Text,
  Flag,
  Variable,
  Slot,
  Rand,
  GameData,
  RefSlot,
}

/**
 * 固定データ種類
 */
const enum EAssignFixDataType {
  Message,
  Item,
  SystemSlotId,
  Skill,
  Enemy,
}

/**
 * ゲームデータ種類
 */
const enum EAssignGameDataType {
  PartyMember,
  RegisterMember,
  Character,
  Tile,
  Item,
  State,
  Party,
  Text,
  Action,
  Member,
  Vehicle,
  System,
  Battler,
}

/**
 * マップ情報種類
 */
const enum EAssignMapInfoType {
  Standard,
  Event,
  Value,
  Result,
  Action,
}

/**
 * 組み込みメニューId
 */
const enum EEmbeddedId {
  Discard = 1,
  Buy = 2,
  Sell = 3,
  MapMenu = 4,
  BattleMenu = 5,
  Title = 6,
  Keep = 7,
  Pickup = 8,
  Debug = 9,
}

/**
 * ネスト時の情報保持情報
 */
interface ExecutionInfo {
  event: GameEvent | null;
  list: EventCommand[];
  embedded: ExecutorEmbeddedBase | null;
  index: number;
  nest: number;
}

/**
 * コマンド結果
 */
interface CommandResult {
  index: number;
  object: unknown;
}

/**
 * コマンド実行クラス
 */
export class Executor {
  /**
   * スクリプトコマンド配列
   */
  private _list: EventCommand[] = [];
  /**
   * コマンド実行インデックス
   */
  private _index: number = 0;
  /**
   * 分岐のネスト
   */
  private _nest: number = 0;
  /**
   * 待機カウント
   */
  private _waitCount: number = 0;
  /**
   * メッセージ終了待ち
   */
  private _waitMessageEnd: boolean = false;
  /**
   * メッセージ待ち後継続
   */
  private _waitMessageKeep: boolean = false;
  /**
   * メッセージ待機中
   */
  private _messageWaiting: boolean = false;
  /**
   * ネストごとに保持した分岐状態
   */
  private _branch: Array<CommandResult | null> = [];
  /**
   * 実行開始時のマップId
   */
  private _mapId: number = 0;
  /**
   * 実行元のイベント
   */
  private _event: GameEvent | null = null;
  /**
   * 他スクリプト呼び出し時の保存スタック
   */
  private _callStack: ExecutionInfo[] = [];
  /**
   * 組み込みメニュー
   */
  private _embedded: ExecutorEmbeddedBase | null = null;
  /**
   * 組み込みメニューが終了したか
   */
  private _endEmbedded: boolean = false;
  /**
   * 組み込みメニュー実行中
   */
  private _embedding: boolean = false;
  /**
   * 1フレーム中のコマンド実行数の上限
   * 組み込みメニュー内での実行を含む
   */
  private _limitCount: number = 0;
  /**
   * 待機状態の種類
   */
  private _waitMode: EExecutorWaitMode = EExecutorWaitMode.None;
  /**
   * 行動結果の保存場所
   */
  private _actionResult: ActionResult = newActionResult();
  /**
   * 実行待ちスクリプトキュー
   */
  private _scriptQueue: EventScript[] = [];
  /**
   * 対象Id
   */
  private _targetId: number = 0;

  /**
   * コンストラクタ
   * @param _ignoreWaitTransit 場所移動中待ちを無視
   */
  constructor(private _ignoreWaitTransit = false) {}

  /**
   * 待機時間を設定
   * @param value
   */
  private _setWaitCount(value: number) {
    this._waitCount = value;
  }

  /**
   * 待機モードを設定
   * @param value
   */
  private _setWaitMode(value: EExecutorWaitMode) {
    this._waitMode = value;
  }

  /**
   * 移動ルート待ちか
   */
  get moveRouteWaiting() {
    return this._waitMode === EExecutorWaitMode.MoveRoute;
  }

  /**
   * 集合待ちか
   */
  get gatheringWaiting() {
    return this._waitMode === EExecutorWaitMode.Gathering;
  }

  /**
   * メッセージ終了待ちを取得
   */
  get messageWaiting() {
    return this._messageWaiting;
  }

  /**
   * メッセージに使用するメニューId
   * 移動中か戦闘中かで変化する
   */
  private _getMessageMenuId() {
    return gameTemp.getMessageMenuId();
  }

  /**
   * 組み込みメニュー実行中か取得する
   */
  get embedding() {
    return this._embedding;
  }

  /**
   * イベント開始設定
   * @param list
   * @param event
   */
  setup(list: EventCommand[], event: GameEvent | null) {
    // 次のイベントが始まる場合、違うイベントならロックを外す
    if (this._event !== event) {
      this._event?.unlock();
    }
    this._list = list;
    this._index = 0;
    this._mapId = gameMapSight.mapId; //gameMap.mapId;
    this._event = event;
    this._setWaitCount(0);
    this._setWaitMode(EExecutorWaitMode.None);
  }

  /**
   * スクリプトをキューに追加する
   * @param script 追加するスクリプト
   */
  pushQueue(script: EventScript) {
    this._scriptQueue.push(script);
  }

  /**
   * 終了確認コマンド設定
   */
  setupEndCheckCommand() {
    this.setup([{ code: ECommandCode.EndWait, parameters: [] }], this._event);
  }

  /**
   * スクリプトを呼び出す
   * 呼び出し元が存在している必要がある
   * @param list
   * @param event
   * @param inc
   */
  onCallScript(list: EventCommand[], event: GameEvent | null) {
    if (!this.running()) {
      return;
    }
    this._callStack.push({
      event: this._event,
      list: this._list,
      embedded: this._embedded,
      index: this._index,
      nest: this._nest,
    });
    this._event = event;
    this._list = list;
    this._embedded = null;
    this._index = 0;
  }

  /**
   * マップまたはコモンスクリプトを呼び出す
   * @param list
   */
  private _callScript(list: EventCommand[]) {
    this.onCallScript(list, this._event);
  }

  /**
   * スクリプトキューを確認する
   * 実行中のイベントを引き継ぐ
   * @returns
   */
  private _checkQueue() {
    const script = this._scriptQueue.shift();
    if (!script) {
      return false;
    }
    this.setup(script.list, this._event);
    return true;
  }

  /**
   * スクリプトの呼び出し終了
   */
  private _returnScript() {
    const info = this._callStack.pop();
    // ルートの場合は何もしない
    if (info === undefined) {
      return false;
    }
    // 呼び出し元を設定
    // 組み込み起動中でなければスクリプト分を飛ばす
    this._event = info.event;
    this._list = info.list;
    this._embedded = info.embedded;
    this._index = info.index + this._returnScriptSkipIndexes(info);
    this._nest = info.nest;

    if (this._endEmbedded) {
      if (info.embedded) {
        this._endEmbedded = false;
        info.embedded.setForceEnd();
      }
    }

    return true;
  }

  /**
   * スクリプト呼び出し終了時にスキップするインデックス数
   * @param info
   * @returns
   */
  private _returnScriptSkipIndexes(info: ExecutionInfo) {
    return info.embedded ? 0 : 1;
  }

  /**
   * イベント開始時と同じマップか
   * @returns
   */
  private _sameMapStarted() {
    return this._mapId === gameMapSight.mapId;
  }

  /**
   * 実行中か
   */
  running() {
    return this._list.length !== 0;
  }

  /**
   * 最後まで実行したか
   */
  private _endList() {
    return this._index >= this._list.length;
  }

  /**
   * コマンドをクリア
   */
  private _clearList() {
    this._list = [];
  }

  /**
   * 更新
   */
  update() {
    this._limitCount = 0;
    for (;;) {
      if (this._checkWait()) {
        return;
      }

      // 実行コマンド数限界実行数確認
      this._checkLimit();
      // 組み込みイベント実行かどうか
      if (this._hasEmbedded()) {
        // trueなら継続、falseなら戻る
        // waitすることによりwaitModeで戻るので基本true
        if (this._executeEmbedded()) {
          continue;
        } else {
          return;
        }
      }

      // 終了かどうか
      if (this._checkEnd()) {
        return;
      }

      if (!this._executeCommand()) {
        return;
      }
    }
  }

  /**
   * 待機のチェック
   */
  private _checkWait() {
    return (
      this._checkRoomTransfer() ||
      this._checkWaitMode() ||
      this._checkWaitTransit() ||
      this._checkWaitCount() ||
      this._checkWaitWindow()
    );
  }

  /**
   * 部屋移動中か
   */
  private _checkRoomTransfer() {
    return gameTemp.changeRoom;
  }

  /**
   * 待機モードの確認
   */
  private _checkWaitMode() {
    const check = (() => {
      switch (this._waitMode) {
        case EExecutorWaitMode.EffectLength:
          return gameAnimations.runningSettingTime;
        case EExecutorWaitMode.EffectEnd:
          return gameAnimations.running;
        case EExecutorWaitMode.Scroll:
          return gameMapSight.scrolling;
        case EExecutorWaitMode.TargetRoute:
          return this._checkTargetRoute();
        case EExecutorWaitMode.MoveRoute:
          return this._checkWaitMoveRoute();
        case EExecutorWaitMode.Gathering:
          return gameMarch.leader.gathering;
        case EExecutorWaitMode.Saving:
          return gameTemp.saving;
        case EExecutorWaitMode.interruptBgm:
          return true;
        default:
          return false;
      }
    })();
    if (!check) {
      this._setWaitMode(EExecutorWaitMode.None);
    }
    return check;
  }

  /**
   * 対象指定移動待ち
   * @returns
   */
  private _checkTargetRoute() {
    const characters = this._getTargetCharacters(this._targetId);
    for (const character of characters) {
      if (character.forceMoving) {
        return true;
      }
    }
    return false;
  }

  /**
   * 指定移動終了待ち
   */
  private _checkWaitMoveRoute() {
    return gameMapSight.someForceMoving();
  }

  /**
   * 遷移終了待ち
   */
  private _checkWaitTransit() {
    return (
      (gameMapSight.transferPeriod && !this._ignoreWaitTransit) ||
      gameMapSight.nextTroopId > 0
    );
  }

  /**
   * 待機コマンド待ち
   */
  private _checkWaitCount() {
    if (this._waitCount > 0) {
      this._waitCount -= 1;
      return true;
    }
    return false;
  }

  /**
   * ウィンドウ関係の待機
   */
  private _checkWaitWindow() {
    if (this._waitMessageEnd) {
      // メッセージ終了待機をしている場合の処理
      if (this._messageWaiting) {
        return true;
      } else {
        // 終了可能状態になったらメッセージウィンドウを閉じる
        if (!this._waitMessageKeep) {
          this._closeMessageWindow();
        }
        this._waitMessageKeep = false;
        this._waitMessageEnd = false;
      }
    }
    if (gameMenus.processing) {
      // メニュー処理中は待機
      return true;
    }

    return false;
  }

  /**
   * 実行コマンド数の確認
   * 組み込みメニュー内の実行もカウントする
   */
  private _checkLimit() {
    this._limitCount += 1;
    // 制限を超えていたら強制終了
    if (this._limitCount > 10000) {
      throw new Error(EErrorMessage.OverScript);
    }
  }

  /**
   * 組み込みメニュー実行中か
   */
  private _hasEmbedded() {
    return this._embedded !== null;
  }

  /**
   * 組み込みメニュー実行
   */
  private _executeEmbedded() {
    const result = this._embedded?.execute();
    // embedded内でイベントを呼び出したときはnullになっている
    if (this._embedded?.end) {
      this._embedded = null;
      // スタックにも残ってなければfalseにする
      this._embedding = this._callStack.some((item) => {
        return item.embedded !== null;
      });
      this._embedding = false;
    }
    return result;
  }

  /**
   * 最後まで実行されたか確認し
   * 最後なら次のイベントを探す
   */
  private _checkEnd() {
    // 最後まで実行された場合イベントを探して実行する
    if (this._endList()) {
      // 他イベントの呼び出しから戻ってきた場合は終了ではない
      if (this._returnScript()) {
        return false;
      }
      if (this._checkQueue()) {
        return false;
      }
      //コマンド終了時の処理
      this._commandEnd();
      return true;
    }
    return false;
  }

  /**
   * インデックスの指しているコードを取得する
   * @returns
   */
  private _getCode() {
    return this._list[this._index].code;
  }

  private _getParameters() {
    return this._list[this._index].parameters || [];
  }

  /**
   * 現在のコマンドを取得する
   * @returns
   */
  private _getCommand() {
    return this._list[this._index];
  }

  /**
   * 次のコマンドを取得する
   * @returns
   */
  private _nextCommand() {
    return this._list[this._index + 1];
  }

  /**
   * 前のコマンドを取得する
   * @returns
   */
  private _prevCommand() {
    return this._list[this._index - 1];
  }

  /**
   * インデックスを1増やす
   */
  private _incIndex() {
    this._index += 1;
  }

  /**
   * インデックスを1減らす
   */
  private _decIndex() {
    this._index -= 1;
  }

  /**
   * ネストを1増やす
   */
  private _incNest() {
    this._nest += 1;
  }

  /**
   * ネストを1減らす
   */
  private _decNest() {
    this._nest -= 1;
  }

  /**
   * コマンド実行
   */
  private _executeCommand() {
    if (this._hasEmbedded()) {
      return true;
    }
    if (this._endList()) {
      return true;
    }

    const depth = this._callStack.length;
    const result = this.onCommand(this._getCommand());
    if (result && depth === this._callStack.length) {
      this._incIndex();
    }
    return result;
  }

  /**
   * コマンド発行
   * @param command
   */
  onCommand(command: EventCommand) {
    const code = command.code;
    const parameters = command.parameters ?? [];
    const methodName = '_command' + code;
    return typeof this[methodName] === 'function'
      ? this[methodName](...parameters)
      : true;
  }

  /**
   * コマンド終了
   */
  private _commandEnd() {
    this._clearList();
  }

  /**
   * 文章表示
   * メッセージを表示し切るまでここにはこない
   * @param text
   * @param type
   */
  private _command1(text: string, type: number) {
    // これがtrueの間は無条件でスクリプトが待機する
    // falseになると_waitMessageEndがfalseの場合は
    // 次に進む
    // trueの場合はウィンドウが閉じられるまで待機する
    this._messageWaiting = true;

    const menuId = this._getMessageMenuId();
    gameMenus.pushStartMenuInfo(menuId, [text, type], () => {
      this._messageWaiting = false;
    });

    return true;
  }

  /**
   * メニュー表示
   * @param windowsetId ウィンドウセットId
   * @param initIndex 初期インデックス
   * @param parentId 親ウィンドウ
   * @param extraId 追加データを格納する開始スロットId
   * @param extraCountId 追加データ数を格納するスロットId
   * @param cancelId キャンセルインデックス
   * @param closeType クローズタイプ
   * @returns
   */
  private _command2(
    windowsetId: number,
    initIndex = -1,
    parentId = 0,
    extraId = 0,
    extraCountId = 0,
    cancelId = -1,
    closeType = 0
  ) {
    const fnEnd = (index: number, object: unknown) => {
      // 選択インデックスを格納する
      GameUtils.setSlotIndex(index);
      this._setCommandResult(index, object);
      this._decideMenuClose(
        windowsetId,
        cancelId === index ? -1 : index,
        closeType
      );
    };

    gameMenus.pushStartMenuInfo(
      windowsetId,
      [initIndex, parentId, extraId, extraCountId],
      fnEnd
    );
    return true;
  }

  /**
   * メニュー決定時の閉じる処理
   * @param windowsetId
   * @param index
   * @param closeType
   */
  private _decideMenuClose(
    windowsetId: number,
    index: number,
    closeType: number
  ) {
    switch (closeType) {
      case 1: // 閉じる
        this._closeMenu(windowsetId);
        break;
      case 2: // キャンセルの場合だけ閉じる
        if (index < 0) {
          this._closeMenu(windowsetId);
        }
        break;
      default: // 閉じない
        break;
    }
  }

  /**
   * メニュー終了
   * @param windowsetId
   */
  private _command3(windowsetId: number) {
    if (windowsetId) {
      this._closeMenu(windowsetId);
    } else {
      gameMenus.endAll();
    }
    return true;
  }

  /**
   * メニューを閉じる
   * @param windowsetId
   */
  private _closeMenu(windowsetId: number) {
    gameMenus.pushEndMenuId(windowsetId);
  }

  /**
   * 文章の設定
   * type が EMessageOption.SettingsOption以降に対応している
   * ウェイトやポーズを反映させたいときは後ろに待機コマンドを置くこと
   */
  private _command4(type: number, value: number) {
    const menuId = this._getMessageMenuId();
    const option = type + EMessageOption.SettingsOption;
    gameMenus.pushStartMenuInfo(
      menuId,
      [null, option, value],
      undefined,
      false
    );

    return true;
  }

  /**
   * メッセージウィンドウを閉じる
   */
  private _closeMessageWindow() {
    this._closeMenu(this._getMessageMenuId());
  }

  /**
   * 文章待ち待機
   * メッセージを閉じるまで待機
   * メッセージが表示されている時だけ処理する
   */
  private _command5(keep: number) {
    this._startWaitMessageEnd(keep);
    return true;
  }

  /**
   * メッセージを閉じるまで待機を開始する
   */
  private _startWaitMessageEnd(keep: number) {
    if (this._hasMessageWindow()) {
      this._waitMessageEnd = true;
      this._waitMessageKeep = !!keep;
    }
  }

  /**
   * メッセージウィンドウ表示中か
   */
  private _hasMessageWindow() {
    const messageId = gameTemp.getMessageMenuId();
    return !!gameMenus.find(messageId);
  }

  /**
   * 組み込みメニュー
   * @param type メニューの種類
   * @param pos メニュー開始位置
   * @param delayTime 表示までの遅延時間
   */
  private _command6(type: number, pos = 0, delayTime = -1) {
    // 実行中は呼び出せない
    if (this._hasEmbedded()) {
      return true;
    }

    const embedded = this._makeEmbedded(type);
    if (embedded) {
      embedded.initialSettings(pos);
      this._embedded = embedded;
      this._embedding = true;
      this._endEmbedded = false;
      if (delayTime >= 0) {
        gameMenus.setOpenDelayTime(delayTime);
      }
    }

    return true;
  }

  /**
   * 組み込みメニュー作成
   * @param id
   * @returns
   */
  private _makeEmbedded(id: number) {
    switch (id) {
      case EEmbeddedId.Discard:
        return new ExecutorDiscard(this._makeEmbeddedToExecutor());
      case EEmbeddedId.Buy:
        return new ExecutorBuy(this._makeEmbeddedToExecutor());
      case EEmbeddedId.Sell:
        return new ExecutorSell(this._makeEmbeddedToExecutor());
      case EEmbeddedId.MapMenu:
        return new ExecutorMapMenu(this._makeEmbeddedToExecutor());
      case EEmbeddedId.BattleMenu:
        return new ExecutorBattleMenu(this._makeEmbeddedToExecutor());
      case EEmbeddedId.Title:
        return new ExecutorStartMenu(this._makeEmbeddedToExecutor());
      case EEmbeddedId.Keep:
        return new ExecutorItemKeep(this._makeEmbeddedToExecutor());
      case EEmbeddedId.Pickup:
        return new ExecutorItemPickup(this._makeEmbeddedToExecutor());
      case EEmbeddedId.Debug:
        return new ExecutorDebugMenu(this._makeEmbeddedToExecutor());
      default:
        return;
    }
  }

  /**
   * 組み込みメニューで実行可能なコマンド作成
   * @returns
   */
  private _makeEmbeddedToExecutor(): EmbeddedToExecutor {
    return {
      getMessageWaiting: () => this.messageWaiting,
      getCommandResult: () => this.getCommandResult(),
      clearCommandResult: () => this.clearCommandResult(),
      onCommand: (command: EventCommand) => {
        this.onCommand(command);
      },
      onCallScript: (list, event) => {
        this.onCallScript(list, event);
      },
    };
  }

  /**
   * 組み込みメニュー終了
   */
  private _command7() {
    this._endEmbedded = true;
    return true;
  }

  /**
   * 文章待機終了
   * @returns
   */
  private _command8() {
    this._messageWaiting = false;
    this._waitMessageEnd = false;
    return true;
  }

  /**
   * フラグ
   * 更新前と後を確認しておき、変更がなければ更新しない
   * nullとfalseはフラグ判定上は同じだが変更ありとして扱う
   * @param beginId
   * @param endId
   * @param operand
   */
  private _command11(
    beginId: number,
    endId: number,
    operand: number,
    type = 0
  ) {
    const value = this._flagOperandOn(operand);
    if (type > 0) {
      beginId = endId = getSlotNumber(beginId);
    }
    let change = false;
    for (let i = beginId; i <= endId; i++) {
      const prevValue = getFlag(i);
      if (prevValue !== value) {
        setFlag(i, value);
        change = true;
      }
    }
    if (change) {
      this._requestRefreshEvent();
    }
    if (this._flagOperandSave(operand)) {
      this._saveFlag(beginId, endId, value);
    }

    return true;
  }

  /**
   * フラグ操作がONにするかどうかを判定する
   * 1 と 3 の場合ON
   * それ以外の場合OFF
   * @param operand
   * @returns
   */
  private _flagOperandOn(operand: number) {
    return operand === 1 || operand === 3;
  }

  /**
   * フラグ操作がセーブかどうかを判定する
   * 2 と 3 の場合セーブ
   * @param operand
   * @returns
   */
  private _flagOperandSave(operand: number) {
    return operand === 2 || operand === 3;
  }

  /**
   * 最後のセーブデータからフラグの変更だけをしてセーブする
   * セーブに失敗しても後続処理には影響しない
   * @param beginId
   * @param endId
   * @param value
   */
  private _saveFlag(beginId: number, endId: number, value: boolean) {
    const saveData: SaveObject = JSON.parse(lastSaveData);
    let change = false;
    for (let i = beginId; i <= endId; i++) {
      if (saveData.flags[i] !== value) {
        saveData.flags[i] = value;
        change = true;
      }
    }
    if (!change) {
      return;
    }
    const newSaveData = JSON.stringify(saveData, null, 2);
    setLastSaveData(newSaveData);
    const id = gameTemp.diaryId;
    GameUtils.saveFile(id, lastSaveHeader, newSaveData).then(
      () => {
        // OKならなにもしない
      },
      () => {
        // NGは画面に表示しないのでエラーログを出す
        GameLog.error('flag save error', id);
      }
    );
  }

  /**
   * 変数
   * @param beginId
   * @param endId
   * @param opecode
   * @param _operand
   * @param param
   */
  private _command12(
    beginId: number,
    endId: number,
    opecode: number,
    _operand,
    param
  ) {
    const value = param; // 今は定数だけ
    for (let i = beginId; i <= endId; i++) {
      const resultValue = GameUtils.calcOpecode(opecode, getVariable(i), value);
      setVariable(i, resultValue);
    }
    this._requestRefreshEvent();

    return true;
  }

  /**
   * スロット演算
   * @param beginId
   * @param endId
   * @param code
   * @param type
   * @param param1
   * @param param2
   */
  private _command13(
    beginId: number,
    endId: number,
    opecode: number,
    type: number,
    param1,
    param2,
    refType = 0
  ) {
    if (refType > 0) {
      beginId = getSlotNumber(beginId);
      endId = getSlotNumber(endId);
    }
    const value = this._getOperateSlotParam(type, param1, param2);
    for (let i = beginId; i <= endId; i++) {
      const resultValue = GameUtils.calcOpecode(
        opecode,
        getSlotNumber(i),
        value
      );
      setSlot(i, resultValue);
    }
    this._requestRefreshEvent();
    return true;
  }

  /**
   * スロット演算した結果を返す
   * @param type
   * @param param1
   * @param param2
   */
  private _getOperateSlotParam(type: number, param1, param2) {
    switch (type) {
      case EOperateSlotType.Value:
        return param1;
      case EOperateSlotType.Text:
        return param1;
      case EOperateSlotType.Flag:
        return getFlag(param1) ? 1 : 0;
      case EOperateSlotType.Variable:
        return getVariable(param1);
      case EOperateSlotType.Slot:
        return getSlot(param1);
      case EOperateSlotType.Rand:
        return Utils.randomInt(param1, param2 + 1);
      case EOperateSlotType.GameData:
        return this._getOperateSlotGameDataParam(param1);
      case EOperateSlotType.RefSlot:
        return getSlot(getSlotNumber(param1));
      default:
        return 0;
    }
  }

  /**
   * スロット演算に使用するゲームデータの値を取得
   * @param param
   */
  private _getOperateSlotGameDataParam(param) {
    switch (param) {
      case 0: // 所持金
        return gameParty.gold;
      case 1: // パーティ生存数
        return gameParty.liveMemberLength;
      case 2: // パーティ人数
        return gameParty.members.length;
      default:
        return 0;
    }
  }

  /**
   * イベントリフレッシュ要求
   */
  private _requestRefreshEvent() {
    gameTemp.requestRefreshEvent();
  }

  /**
   * 固定データ取得
   * @param slotId
   * @param type
   * @param param1
   * @param param2
   */
  private _command14(
    slotId: number,
    type: number,
    param1,
    param2: number,
    refType = 0
  ): boolean {
    if (refType > 0) {
      param1 = getSlot(param1);
    }
    switch (type) {
      case EAssignFixDataType.Message:
        setSlot(slotId, GameUtils.getMessage(param1));
        break;
      case EAssignFixDataType.Item:
        setSlot(slotId, this._getFixDataItem(param1, param2));
        break;
      case EAssignFixDataType.SystemSlotId:
        setSlot(slotId, getSlotId(param1));
        break;
      case EAssignFixDataType.Skill:
        setSlot(slotId, this._getFixDataSkill(param1, param2));
        break;
      case EAssignFixDataType.Enemy:
        setSlot(slotId, this._getFixDataEnemy(param1, param2));
        break;
    }
    return true;
  }

  /**
   * 道具の固定データを取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getFixDataItem(param1: number, param2: number) {
    const item = items[param1];
    switch (param2) {
      case 0:
        return item.name;
    }
    return 0;
  }

  /**
   * 技能の固定データを取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getFixDataSkill(param1: number, param2: number) {
    const skill = skills[param1];
    switch (param2) {
      case 0:
        return skill.name;
    }
    return 0;
  }

  /**
   * 敵の固定データを取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getFixDataEnemy(param1: number, param2: number) {
    const enemy = enemies[param1];
    switch (param2) {
      case 0:
        return enemy.name;
    }
    return 0;
  }

  /**
   * ゲームデータ取得
   * @param slotId
   * @param type
   * @param param1
   * @param param2
   */
  private _command15(
    slotId: number,
    type: number,
    param1: number,
    param2: number
  ): boolean {
    const value = this._getGameData(type, param1, param2);
    setSlot(slotId, value);
    return true;
  }

  /**
   * ゲームデータを取得
   * @param type
   * @param param1
   * @param param2
   */
  private _getGameData(
    type: number,
    param1: number,
    param2: number
  ): string | number {
    switch (type) {
      case EAssignGameDataType.PartyMember:
        return this._getGameDataPartyMember(param1, param2);
      case EAssignGameDataType.RegisterMember:
        return this._getGameDataRegisterMember(param1, param2);
      case EAssignGameDataType.Character:
        return this._getGameDataCharacter(param1, param2);
      case EAssignGameDataType.Tile:
        return this._getGameDataTile(param1, param2);
      case EAssignGameDataType.Item:
        return this._getGameDataItem(param1, param2);
      case EAssignGameDataType.State:
        return this._getGameDataState(param1, param2) ? 1 : 0;
      case EAssignGameDataType.Party:
        return this._getGameDataParty(param2);
      case EAssignGameDataType.Text:
        return this._getGameDataText(param1);
      case EAssignGameDataType.Action:
        return this._getGameDataAction(param2);
      case EAssignGameDataType.Member:
        return this._getGameDataMember(param1, param2);
      case EAssignGameDataType.Vehicle:
        return this._getGameDataVehicle(param1, param2);
      case EAssignGameDataType.System:
        return this._getGameDataSystem(param2);
      case EAssignGameDataType.Battler:
        return this._getGameDataBattler(param1, param2);
    }
    return 0;
  }

  /**
   * パーティメンバーの情報を取得
   * @param param1
   * @returns
   */
  private _getGameDataPartyMember(param1: number, param2: number) {
    const index = getSlotNumber(param1);
    switch (param2) {
      case 0: // 並び位置
        return gameParty.members[index]?.id ?? -1;
      case 1: // 表示位置
        return gameMarch.getDispMemberId(index);
    }
    return -1;
  }

  /**
   * 登録メンバーの情報を取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getGameDataRegisterMember(param1: number, param2: number) {
    const member = GameUtils.getMemberFromSlotId(param1);
    if (!member) {
      return -1;
    }
    switch (param2) {
      case 0: // 並び位置
        return gameParty.findIndex(member);
      case 1: // 表示位置
        return gameMarch.findDispOrder(member.id);
      case 2: // メンバーid
        return member.memberId;
      case 3: // 名前
        return member.name;
      case 4: // レベル
        return member.lv;
      case 5: // 必要経験値
        return member.needNextLevelExp();
      case 6: // 最大レベル
        return member.maxLevel;
    }
    return -1;
  }

  /**
   * キャラクターの情報を取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getGameDataCharacter(param1: number, param2: number) {
    const characters = this._getTargetCharacters(getSlotNumber(param1));
    if (characters.length === 0) {
      return 0;
    }
    // 最初のキャラだけが対象となる
    return this._getGameDataCharacterInfo(characters[0], param2);
  }

  /**
   * キャラクターの情報を取得
   * @param character
   * @param gainType
   * @returns
   */
  private _getGameDataCharacterInfo(character: GamePerson, gainType: number) {
    switch (gainType) {
      case 0:
        return character.objectId;
      case 1: // マップX
        return character.x;
      case 2: // マップY
        return character.y;
      case 3: // 向き
        return character.direction;
      case 4: // 画像Id
        return character.charasetId;
      case 5: // 画像インデックス
        return character.characterIndex;
    }
    return 0;
  }

  /**
   * タイルの情報を取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getGameDataTile(param1: number, param2: number) {
    // パラメータからタイル情報を取得して返す
    return param1 + param2;
  }

  /**
   * 状態になっているかを取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getGameDataState(param1: number, param2: number) {
    const index = getSlotNumber(param1);

    if (index < 0) {
      // 全体
      return gameParty.hasState(param2);
    }
    const member = gameMembers.getMember(index);
    return member.stateAlready(param2);
  }

  /**
   * パーティ情報を取得
   * @param param2
   * @returns
   */
  private _getGameDataParty(param2: number) {
    switch (param2) {
      case 0: // お金
        return gameParty.gold;
      case 1: // メンバー数
        return gameParty.memberLength;
      case 2: // 生存人数
        return gameParty.liveMemberLength;
      case 3: // 表示人数（メンバー+NPC）
        return gameParty.followerLength;
      case 4: // 生存＋NPC人数
        return gameParty.liveFollowerLength;
      case 5: // 行先数
        return gameParty.addresses.length;
      case 6: // 預けている道具の個数
        return gameParty.storedItems.length;
      case 7: // 預けている道具の総数
        return gameParty.storedItems.reduce(
          (total, current) => total + current.count,
          0
        );
      case 8: // 単独行動可能生存人数
        return gameParty.canSoloLiveMemberLength;
      case 9: // 乗っている乗り物
        return gameMapSight.getDrivingVehicleId();
    }
    return 0;
  }

  /**
   * どうぐ情報を取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getGameDataItem(param1: number, param2: number) {
    const index = getSlotNumber(param1);

    if (index < -1) {
      // 全体＋預り所
      return gameParty.numItemsIncludesStored(param2);
    } else if (index < 0) {
      // 全体
      return gameParty.numItems(param2);
    }
    const member = gameMembers.getMember(index);
    return member.numItems(param2);
  }

  /**
   * ゲームデータのテキストを取得する
   * @param type
   * @returns
   */
  private _getGameDataText(type: number) {
    switch (type) {
      case 0:
        return gameParty.getUnitCallName();
      case 1:
        return gameTroop.getUnitCallName();
      case 3:
        return gameParty.getUnitCallNameCanSolo();
      default:
        return '';
    }
  }

  /**
   * ゲームデータの行動情報を取得する
   * @param property
   * @returns
   */
  private _getGameDataAction(property: number) {
    switch (property) {
      case 0:
        return gameTemp.actionActorId;
      default:
        return gameTemp.actionTargetId;
    }
  }

  /**
   * 指定のメンバー数を取得する
   * @param memberId
   * @param type
   * @returns
   */
  private _getGameDataMember(memberId: number, type: number): number {
    if (type === 0) {
      return gameParty.members.filter((m) => m.memberId === memberId).length;
    } else {
      return gameMembers.getAll().filter((m) => m.memberId === memberId).length;
    }
  }

  /**
   * 乗り物の情報を取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getGameDataVehicle(param1: number, param2: number) {
    const vehicleId = getSlotNumber(param1);
    switch (param2) {
      case 0:
        return gameMap.getVehicle(vehicleId)?.mapId ?? 0;
      case 1:
        return gameMap.getVehicle(vehicleId)?.x ?? 0;
      case 2:
        return gameMap.getVehicle(vehicleId)?.y ?? 0;
    }
    return 0;
  }

  /**
   * システム情報を取得
   * @param property
   * @returns
   */
  private _getGameDataSystem(property: number) {
    switch (property) {
      case 0:
        return gameSystem.battleSpeed;
    }
    return 0;
  }

  /**
   * 戦闘者の情報を取得
   * @param param1
   * @param param2
   * @returns
   */
  private _getGameDataBattler(param1: number, param2: number) {
    const target = idToBattler(this._getBattlerId(param1));
    if (!target) {
      return 0;
    }
    switch (param2) {
      case 0:
        return target.name;
    }
    return 0;
  }

  /**
   * システムスロットに代入
   * @param systemSlotName システムスロット名
   * @param slotId 代入するスロットId
   * @returns
   */
  private _command16(systemSlotName: string, slotId: number): boolean {
    setSystemSlot(systemSlotName, getSlot(slotId));
    return true;
  }

  /**
   * マップ情報取得
   * @param slotId
   * @param type
   * @param param1
   */
  private _command17(slotId: number, type: number, param1: number): boolean {
    setSlot(slotId, this._getMapInfo(type, param1));
    return true;
  }

  /**
   * マップ情報を取得
   * @param type
   * @param param1
   * @param param2
   */
  private _getMapInfo(type: number, param1: number): number {
    switch (type) {
      case EAssignMapInfoType.Standard:
        return this._getMapInfoStandard(param1);
      case EAssignMapInfoType.Event:
        return this._getMapInfoEvent(param1);
      case EAssignMapInfoType.Value:
        return this._getMapInfoValue(param1);
      case EAssignMapInfoType.Result:
        return this._getMapInfoResult(param1);
      case EAssignMapInfoType.Action:
        return this._getMapInfoAction(param1);
      default:
        return 0;
    }
  }

  /**
   * マップ基本情報を取得
   * @param param1
   * @returns
   */
  private _getMapInfoStandard(param1: number) {
    switch (param1) {
      case 0:
        return gameMapSight.mapId;
      case 1:
        return gameMapSight.width;
      case 2:
        return gameMapSight.height;
      default:
        return 0;
    }
  }

  /**
   * マップイベント情報を取得
   * @param param1
   * @returns
   */
  private _getMapInfoEvent(param1: number) {
    switch (param1) {
      case 0:
        return this._event?.objectId ?? 0;
      case 1:
        return this._event?.startTriggerId ?? 0;
      default:
        return 0;
    }
  }

  /**
   * マップ情報値を取得
   * mapListのvalueの値のこと
   * @param param1
   * @returns
   */
  private _getMapInfoValue(param1: number) {
    if (!gameMapSight.mapInfo.valuesId) {
      return 0;
    }
    const list = GameNumberList.get(gameMapSight.mapInfo.valuesId);
    return list[param1] ?? 0;
  }

  /**
   * マップ結果情報を取得
   * メニュー選択結果など
   * @param param1
   * @returns
   */
  private _getMapInfoResult(param1: number) {
    switch (param1) {
      case 0:
        return this.getCommandResult().index;
      default:
        return 0;
    }
  }

  /**
   * マップ使用行動を取得
   * @param param1
   * @returns
   */
  private _getMapInfoAction(param1: number) {
    switch (param1) {
      case 0: // ユーザーid
        return gameTemp.mapAction.member.id;
      case 1: // メンバーid
        return gameTemp.mapAction.member.memberId;
      case 2: // 行動の種類
        return gameTemp.mapAction.getCommandKind();
      case 3: // 使用物id
        return gameTemp.mapAction.getSelectSpecialId();
      default:
        return 0;
    }
  }

  /**
   * 商品の設定
   * @param params
   */
  private _command21(...params: number[]) {
    GameUtils.paramsToGoodsSlot(params);
    return true;
  }

  /**
   * 商品の値段
   * @param params
   */
  private _command22(...params: number[]) {
    GameUtils.paramsToGoodsPriceSlot(params);
    return true;
  }

  /**
   * 道具追加可能判定
   * @returns
   */
  private _command31() {
    // 空きがあるか探す
    const member = gameParty.getItemSpaceMember();
    if (member === undefined) {
      // 空きがない
      this._setCommandResult(1);
      return true;
    }
    // あるので結果は0
    this._setCommandResult(0);

    return true;
  }

  /**
   * スロット比較
   * @param id
   * @param code
   * @param type
   * @param param
   */
  private _command33(id: number, code: number, type: number, param: number) {
    const left = gameTemp.getSlotNumber(id);
    const right = this._getNumberOrSlotToValue(type, param);
    const result = this._compareValue(code, left, right);

    this._setCommandResult(result ? 0 : 1);

    return true;
  }

  /**
   * スロット比較処理
   * @param code
   * @param left
   * @param right
   * @returns
   */
  private _compareValue(code: number, left: number, right: number) {
    switch (code) {
      case 0:
        return left === right;
      case 1:
        return left >= right;
      case 2:
        return left <= right;
      case 3:
        return left > right;
      case 4:
        return left < right;
      case 5:
        return left !== right;
      case 6:
        return (left & right) > 0;
    }
    return false;
  }

  /**
   * 結果代入
   * @param slotId 代入するスロットId
   * @returns
   */
  private _command34(slotId: number) {
    const result = getSlotNumber(slotId);
    this._setCommandResult(result);
    return true;
  }

  /**
   * 戦闘者判定
   * 結果を指定スロットに格納する
   * 結果 1:去っている 2:倒れている 0:それ以外
   *     -1:指定したメンバーor敵ではなかった
   *     -2:対象取得失敗
   *     -3:type不正
   * @param refSlotId
   * @param type
   * @param id
   * @returns
   */
  private _command35(
    slotId: number,
    refSlotId: number,
    type: number,
    id: number
  ) {
    const battlerId = this._getBattlerId(refSlotId);
    const target = idToBattler(battlerId);
    if (target) {
      const result = this._judgeBattlerResult(target);
      let index = -1;
      switch (type) {
        case 0:
          index = result;
          break;
        case 1:
          if (target.myself) {
            const memberId = (target as GameMember).memberId;
            index = memberId === id ? result : -1;
          }
          break;
        case 2:
          if (!target.myself) {
            const enemyId = (target as GameEnemy).enemyId;
            index = enemyId === id ? result : -1;
          }
          break;
        default:
          index = -3;
      }
      setSlot(slotId, index);
    } else {
      setSlot(slotId, -2);
    }

    return true;
  }

  /**
   * 戦闘者判定結果
   * @param target
   * @returns
   */
  private _judgeBattlerResult(target: GameBattler) {
    if (target.leave) {
      return 1;
    }
    if (target.down) {
      return 2;
    }
    return 0;
  }

  /**
   * 行動条件判定
   * @param slotId
   * @param conditionId
   * @returns
   */
  private _command36(slotId: number, conditionId: number) {
    const target = idToBattler(this._getBattlerId(slotId));
    if (target?.meetCondition(actionConditions[conditionId])) {
      this._setCommandResult(0);
    } else {
      this._setCommandResult(1);
    }

    return true;
  }

  /**
   * 結果判定CASE（選択結果や判定結果より）
   * @param n
   */
  private _command51(n: number) {
    if (this._checkResult(n)) {
      // 分岐データを削除することで以降の条件にあてはまらなくなる
      this.clearCommandResult();
      // ネストを増やす
      this._incNest();
      return true;
    }
    this._skipBranch();
    return true;
  }

  /**
   * 条件分岐その他ELSEの場合
   * 事前に分岐に入っておくコマンドを実施すること
   * @returns
   */
  private _command52() {
    if (this._hasResult()) {
      // ネストを増やてそのまま進む
      this._incNest();
      return true;
    }
    this._skipBranch();
    return true;
  }

  /**
   * 条件処理終了END
   * これを呼ばないとネストが戻らない
   * ひとつの条件ごとにセットで呼ぶ必要がある
   * @returns
   */
  private _command53() {
    this._decNest();
    return true;
  }

  /**
   * コマンドの結果を設定する
   * @param index
   * @param object
   */
  private _setCommandResult(index: number, object?: unknown) {
    this._branch[this._nest] = { index, object };
  }

  /**
   * コマンドの結果を消去する
   */
  clearCommandResult() {
    this._branch[this._nest] = null;
  }

  /**
   * 条件結果があるかどうか
   * @returns
   */
  private _hasResult() {
    const branch = this._branch[this._nest];
    return !!branch;
  }

  /**
   * コマンド結果を確認する
   * @param n
   */
  private _checkResult(n: number) {
    const branch = this._branch[this._nest];
    return branch?.index === n;
  }

  /**
   * コマンドの結果を取得する
   */
  getCommandResult() {
    return this._branch[this._nest] ?? { index: -1, object: null };
  }

  /**
   * 分岐終了まで飛ばす
   * @returns
   */
  private _skipBranch() {
    let command;
    let endSkip = 0;
    // 最後まで見つからなかったら強制的に分岐終了
    // 呼び出し元に戻るときにネストが戻される
    while ((command = this._nextCommand()) !== undefined) {
      // endの間にcaseかelseが挟まれている場合
      if (this._inNestCode(command.code)) {
        // ENDを飛ばしを加算する
        endSkip += 1;
      }
      if (this._outNestCode(command.code)) {
        // END飛ばしなし
        if (endSkip <= 0) {
          this._incIndex();
          break;
        }
        endSkip -= 1;
      }
      // コマンドスキップ
      this._incIndex();
    }

    return true;
  }

  /**
   * ループ開始
   * @returns
   */
  private _command54() {
    // ループに分岐条件はないのでネストは考慮しない
    return true;
  }

  /**
   * ループ終端
   * ループ開始に戻る
   * @returns
   */
  private _command55() {
    // ループ開始までさかのぼる
    this._backToStartLoop();
    return true;
  }

  /**
   * ループ開始まで戻る
   */
  private _backToStartLoop() {
    let command;
    let beginSkip = 0;
    let success = false;
    const index = this._index;
    while ((command = this._prevCommand()) !== undefined) {
      if (command.code === ECommandCode.BeginLoop) {
        // ここに来る前にendが挟まれていたらbeginスキップを減算する
        if (beginSkip <= 0) {
          this._decIndex();
          success = true;
          break;
        }
        beginSkip -= 1;
      }
      if (command.code === ECommandCode.EndLoop) {
        // 戻り中にendを発見したらbeginスキップを加算する
        beginSkip += 1;
      }
      this._decIndex();
    }
    if (!success) {
      this._index = index;
    }
    return success;
  }

  /**
   * ラベル
   * ジャンプが出てきたときに総当りするのでなにもしない
   * @returns
   */
  private _command56() {
    return true;
  }

  /**
   * ラベルジャンプ
   * @param name
   * @returns
   */
  private _command57(name: string) {
    const info = Utils.lastElement(this._callStack);
    const baseNest = info?.nest ?? 0;
    let nest = baseNest;
    for (let i = 0; i < this._list.length; i++) {
      const command = this._list[i];
      if (
        command.code === ECommandCode.LABEL &&
        command.parameters[0] === name
      ) {
        // ジャンプ先
        this._jump(i, nest);
        break;
      } else if (this._inNestCode(command.code)) {
        // ネスト+
        nest += 1;
      } else if (this._outNestCode(command.code)) {
        // ネスト-
        nest -= 1;
      }
    }
    if (nest < baseNest) {
      nest = baseNest;
    }
    return true;
  }

  /**
   * ジャンプ処理
   * @param index
   * @param nest
   */
  private _jump(index: number, nest: number) {
    // 分岐情報を削除する
    const oldNest = this._nest;
    const begin = Math.min(nest, oldNest);
    const end = Math.max(nest, oldNest);
    for (let i = begin; i <= end; i++) {
      this._branch[i] = null;
    }
    // ジャンプ先設定
    this._index = index;
    this._nest = nest;
  }

  /**
   * ネストに入るコマンドか
   * @param code
   * @returns
   */
  private _inNestCode(code) {
    return [ECommandCode.CASE, ECommandCode.ELSE].includes(code);
  }

  /**
   * ネストを出るコマンドか
   * @param code
   * @returns
   */
  private _outNestCode(code) {
    return code === ECommandCode.EndBranch;
  }

  /**
   * 以降実行しない
   * @returns
   */
  private _command58() {
    this._setEndIndex();
    return true;
  }

  /**
   * インデックスを最後に設定する
   */
  private _setEndIndex() {
    this._index = this._list.length;
  }

  /**
   * ループ中断
   */
  private _command59() {
    // ループ開始でネストを処理していないので
    // ネストは処理しない
    this._exitLoop();
    return true;
  }

  /**
   * ループを抜ける
   * @returns
   */
  private _exitLoop() {
    let command;
    let endSkip = 0;
    let success = false;
    const index = this._index;
    while ((command = this._nextCommand()) !== undefined) {
      if (command.code === ECommandCode.BeginLoop) {
        // end検索中にstartが挟まれていたらendスキップを加算する
        endSkip += 1;
      }
      if (command.code === ECommandCode.EndLoop) {
        // endスキップが加算されていたら減算する
        if (endSkip <= 0) {
          this._incIndex();
          success = true;
          break;
        }
        endSkip -= 1;
      }
      this._incIndex();
    }
    if (!success) {
      this._index = index;
    }
    return success;
  }

  /**
   * 道具の変更
   * type 0: どうぐId
   *      1: スロットId
   * @param type
   * @param id
   * @param memberSlotId
   * @param qty 個数
   */
  private _command61(type: number, id: number, memberSlotId: number, qty = 1) {
    const itemId = this._getNumberOrSlotToValue(type, id);
    if (!itemId) {
      return true;
    }
    const memberId = getSlotNumber(memberSlotId);
    if (qty > 0) {
      for (let i = 0; i < qty; i++) {
        const member = this._addItem(itemId, memberId);
        if (!member) {
          break;
        }
        // スロットに入手メンバーの登録idを入れる
        setSlot(memberSlotId, member.id);
      }
    } else if (qty < 0) {
      qty = -qty;
      for (let i = 0; i < qty; i++) {
        const member = this._removeItem(itemId, memberId);
        if (!member) {
          break;
        }
        // スロットに入手メンバーの登録idを入れる
        setSlot(memberSlotId, member.id);
      }
    }

    return true;
  }

  /**
   * 道具を追加する
   * @param itemId
   * @param memberId
   * @returns
   */
  private _addItem(itemId: number, memberId: number) {
    // メンバーを取得
    const member =
      memberId < 0
        ? gameParty.getItemSpaceMember()
        : gameMembers.getMember(memberId);

    if (!member?.itemSpace()) {
      return;
    }
    member.pushItem(itemId);
    return member;
  }

  /**
   * 道具を消去する
   * @param itemId
   * @param memberId
   * @returns
   */
  private _removeItem(itemId: number, memberId: number) {
    // メンバーを取得
    if (memberId < 0) {
      return gameParty.eraseItemByItemId(itemId);
    } else {
      const member = gameMembers.getMember(memberId);
      if (member?.eraseItemByItemId(itemId)) {
        return member;
      }
    }
  }

  /**
   * 技能の変更
   * @param type
   * @param id
   * @param memberSlotId
   * @param operate
   */
  private _command62(
    type: number,
    id: number,
    memberSlotId: number,
    operate: number
  ) {
    const skillId = this._getNumberOrSlotToValue(type, id);
    if (!skillId) {
      return true;
    }
    const memberId = getSlotNumber(memberSlotId);
    const member = gameMembers.getMember(memberId);
    if (!member) {
      return true;
    }
    if (operate === 0) {
      member.learnSkill(skillId);
    } else {
      member.forgetSkill(skillId);
    }

    return true;
  }

  /**
   * 経験値の変更
   * @param ref
   * @param expValue
   * @param memberSlotId
   * @param operate
   */
  private _command64(
    ref: number,
    expValue: number,
    memberSlotId: number,
    operate: number
  ) {
    const exp = this._getNumberOrSlotToValue(ref, expValue);
    if (!exp) {
      return true;
    }
    const addExp = operate === 0 ? exp : -exp;
    const memberId = getSlotNumber(memberSlotId);
    if (memberId < 0) {
      for (const member of gameParty.members) {
        member.gainExp(addExp);
      }
    } else {
      const member = gameMembers.getMember(memberId);
      member?.gainExp(addExp);
    }

    return true;
  }

  /**
   * レベルの変更
   * @param ref
   * @param lvValue
   * @param memberSlotId
   * @param operate
   */
  private _command65(
    ref: number,
    lvValue: number,
    memberSlotId: number,
    operate: number
  ) {
    const lv = this._getNumberOrSlotToValue(ref, lvValue);
    if (!lv) {
      return true;
    }
    const addLv = operate === 0 ? lv : -lv;
    const memberId = getSlotNumber(memberSlotId);
    if (memberId < 0) {
      for (const member of gameParty.members) {
        member.changeLevel(member.lv + addLv);
      }
    } else {
      const member = gameMembers.getMember(memberId);
      member?.changeLevel(member.lv + addLv);
    }

    return true;
  }

  /**
   * レベルの反映
   * @param memberSlotId
   */
  private _command66(memberSlotId: number) {
    const memberId = getSlotNumber(memberSlotId);
    if (memberId < 0) {
      for (const member of gameParty.members) {
        member.applyLevelUp();
      }
    } else {
      const member = gameMembers.getMember(memberId);
      member?.applyLevelUp();
    }

    return true;
  }

  /**
   * 装備の変更
   * @param memberSlotId
   * @param itemId
   */
  private _command68(memberSlotId: number, itemId: number) {
    const memberId = getSlotNumber(memberSlotId);
    if (memberId < 0) {
      for (const member of gameParty.members) {
        member.equipItemId(itemId, itemId > 0);
      }
    } else {
      const member = gameMembers.getMember(memberId);
      member?.equipItemId(itemId, itemId > 0);
    }

    return true;
  }

  /**
   * 所持金の増減
   * type 0: 直値
   *      1: スロットId
   * @param op
   * @param type
   * @param value
   * @returns
   */
  private _command70(op: number, type: number, value: number) {
    const gold = this._operateValue(op, type, value);
    gameParty.gainGold(gold);

    return true;
  }

  /**
   * 値の操作
   * type別の値にop演算をかける
   * @param op
   * @param type
   * @param value
   * @returns
   */
  private _operateValue(op: number, type: number, value: number) {
    const calcValue = this._getNumberOrSlotToValue(type, value);
    return op === 0 ? calcValue : -calcValue;
  }

  /**
   * 直値かスロットから値を取得する
   * @param type
   * @param value
   * @returns
   */
  private _getNumberOrSlotToValue(type: number, value: number) {
    switch (type) {
      case 0:
        return value;
      case 1:
        return gameTemp.getSlotNumber(value);
      default:
        return 0;
    }
  }

  /**
   * 仲間の登録
   * @param memberId 作成するメンバー
   * @param variableId 作成した仲間Idを格納する変数
   */
  private _command71(memberId: number, variableId: number) {
    const id = gameMembers.add(memberId);
    if (id < 0) {
      return true;
    }
    setVariable(variableId, id);
    return true;
  }

  /**
   * 仲間の削除
   * パーティメンバーならパーティから離脱も併せてしないといけないが。。。
   * @param variableId 削除する仲間Idを格納した変数
   */
  private _command72(variableId: number) {
    const id = getVariable(variableId);
    gameMembers.remove(id);
    return true;
  }

  /**
   * パーティの変更
   * @param type 0 加える 1:外す
   * @param variableId パーティから増減する仲間Idを格納した変数
   */
  private _command73(type: number, variableId: number) {
    const id = getVariable(variableId);
    if (type === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      gameParty.addMember(id) && gameMarch.addFollower();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      gameParty.removeMember(id) && gameMarch.removeFollower();
    }
    this._requestRefreshEvent();
    return true;
  }

  /**
   * NPCの変更
   * @param type 0 加える 1:外す
   * @param variableId NPCから増減するNPCIdを格納した変数
   * @returns
   */
  private _command74(type: number, variableId: number) {
    const id = getVariable(variableId);
    if (type === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      gameParty.addNpc(id) && gameMarch.addFollower();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      gameParty.removeNpc(id) && gameMarch.removeFollower();
    }
    return true;
  }

  /**
   * 隊列のリフレッシュ
   * @returns
   */
  private _command75() {
    gameMarch.refresh();
    return true;
  }

  /**
   * 隊列の変更
   * @param type 0：含める 1:含めない
   * @param variableId パーティから増減する仲間Idを格納した変数
   */
  private _command76(type: number, variableId: number) {
    const id = getVariable(variableId);
    const member = gameMembers.getMember(id);
    if (!member) {
      return true;
    }
    const hidden = type > 0;
    if (member.hidden === hidden) {
      return true;
    }
    member.setHidden(hidden);
    if (!gameParty.members.includes(member)) {
      return true;
    }
    if (hidden) {
      gameMarch.removeFollower();
    } else {
      gameMarch.addFollower();
    }

    return true;
  }

  /**
   * 回復
   * @param type 操作 0>パーティ 1>仲間全体 2>登録id 3>並び順
   * @param param 登録id>メンバーid  並び順>並び番号
   * @param hpRate hp回復率
   * @param mpRate mp回復率
   * @param beginState 状態回復優先度先頭
   * @param endState 状態回復優先度終端
   * @returns
   */
  private _command81(
    type: number,
    param: number,
    hpRate: number,
    mpRate: number,
    beginState: number,
    endState: number
  ) {
    const members = this._getTargetMembers(type, param);
    members.forEach((member) => {
      member.recover(hpRate, mpRate, beginState, endState);
    });
    return true;
  }

  /**
   * 名称変更
   * @param refId 登録Id参照変数Id
   * @param name 変更名
   * @returns
   */
  private _command82(refId: number, name: string) {
    const member = this._getMember(refId);
    member.setName(name);
    return true;
  }

  /**
   * 変数Idを参照してメンバーを取得する
   * @param refId
   * @returns
   */
  private _getMember(refId: number) {
    const id = getVariable(refId);
    return gameMembers.getMember(id);
  }

  /**
   * 状態の変更
   * @param slotId 対象登録Idを格納しているスロット
   * @param type 0:追加 1:除去
   * @param stateId 状態Id
   * @returns
   */
  private _command83(slotId: number, type: number, stateId: number) {
    const range = slotId <= 0 ? slotId + 1 : 2;
    const members = this._getTargetMembers(range, slotId);
    if (type === 0) {
      members.forEach((member) => member.addState(stateId, 0));
    } else {
      members.forEach((member) => member.recoverState(stateId));
    }
    return true;
  }

  /**
   * 対象メンバーを取得
   * @param type
   * @param param
   * @returns
   */
  private _getTargetMembers(type: number, param: number) {
    switch (type) {
      case 0:
        return gameMembers.getAll();
      case 1:
        return gameParty.members;
      case 2:
        return [gameMembers.getMember(getSlotNumber(param))];
    }
    return [];
  }

  /**
   * タイルの変更
   * @param layerIndex 切り替えるレイヤー
   * @param partId マップパーツid
   * @param x x座標
   * @param y y座標
   * @returns
   */
  private _command99(
    layerIndex: number,
    partId: number,
    x: number,
    y: number,
    posType: number
  ) {
    const mapPart = mapParts[partId];
    if (posType) {
      x = getSlotNumber(x);
      y = getSlotNumber(y);
    }
    gameMapSight.setPart(layerIndex, mapPart, x, y);

    return true;
  }

  /**
   * タイルの切替
   * @param type 0:元のタイル 1:設定タイル
   * @param layerIndex 切り替えるレイヤー
   * @returns
   */
  private _command100(gid: number) {
    this._event?.replace(gid);

    return true;
  }

  /**
   * 場所移動
   * @param type 0:直接 1:スロット
   * @param mapName 移動先マップid
   * @param x x座標
   * @param y y座標
   * @param direction 方向
   * @param pos 位置
   */
  private _command101(
    type: number,
    mapId: number,
    x: number,
    y: number,
    direction: number,
    pos = 0
  ) {
    // ウィンドウ表示中は待機する
    if (!this._enableTransfer()) {
      return false;
    }
    // typeが0以外ならスロット参照する
    if (type !== 0) {
      mapId = gameTemp.getSlotNumber(mapId);
      x = gameTemp.getSlotNumber(x);
      y = gameTemp.getSlotNumber(y);
    }
    // posが0以上なら相対移動にする
    if (pos > 0) {
      x += gameMarch.leader.x;
      y += gameMarch.leader.y;
    }
    gameMapSight.reserveTransfer({
      move: true,
      mapId,
      x,
      y,
      direction,
    });

    return true;
  }

  /**
   * 位置リスト移動
   * @param type
   * @param positionId
   * @param direction
   */
  private _command102(type: number, positionId: number, direction: number) {
    // ウィンドウ表示中は待機する
    if (!this._enableTransfer()) {
      return false;
    }
    // typeが0以外ならスロット参照する
    if (type !== 0) {
      positionId = gameTemp.getSlotNumber(positionId);
    }
    const position = system.positions[positionId];
    gameMapSight.reserveTransfer({
      move: true,
      mapId: position.mapId,
      x: position.x,
      y: position.y,
      direction,
    });

    return true;
  }

  /**
   * ワープ
   * @param type
   * @param warpId
   * @param direction
   */
  private _command103(type: number, warpId: number, direction: number) {
    // ウィンドウ表示中は待機する
    if (!this._enableTransfer()) {
      return false;
    }
    // typeが0でなければスロット参照する
    if (type !== 0) {
      warpId = gameTemp.getSlotNumber(warpId);
    }
    const warp = (() => {
      if (type === 2) {
        // typeが2ならアドレスを参照する
        return gameParty.addresses[warpId];
      } else {
        return system.warpPlaces[warpId];
      }
    })();

    const positionIds = warp.positionIds;
    const position = system.positions[positionIds[0]];
    gameMapSight.reserveTransfer({
      move: true,
      mapId: position.mapId,
      x: position.x,
      y: position.y,
      direction,
    });

    // 乗り物があればここで予約する
    for (let i = 1; i < positionIds.length; i++) {
      gameMap.setVehicleWarpPosition(i, positionIds[i]);
    }

    return true;
  }

  /**
   * 場所移動可能か
   * 戦闘中は予約をするだけなので無条件で可能
   * @returns
   */
  private _enableTransfer() {
    if (!gameTemp.inBattle && this._hasMessageWindow()) {
      // 待機待ちを設定する
      this._startWaitMessageEnd(0);
      return false;
    }
    return true;
  }

  /**
   * キャラクターの位置設定
   * @param type
   * @param target
   * @param dest
   * @param value1
   * @param value2
   * @param direction
   * @returns
   */
  private _command104(
    type: number,
    target: number,
    dest: number,
    value1: number,
    value2: number,
    direction: number
  ) {
    const targetId = type === 1 ? getSlotNumber(target) : target;
    const characters = this._getTargetCharacters(targetId);
    if (characters.length === 0) {
      return true;
    }
    for (const character of characters) {
      this._setLocation(character, dest, value1, value2, direction);
    }

    return true;
  }

  /**
   * キャラクターの位置設定を行う
   * @param character
   * @param dest
   * @param value1
   * @param value2
   * @param direction
   */
  private _setLocation(
    character: GameCharacter,
    dest: number,
    value1: number,
    value2: number,
    direction: number
  ) {
    switch (dest) {
      case 0: // 直接指定
        character.moveto(value1, value2);
        break;
      case 1: // スロット指定
        character.moveto(getSlotNumber(value1), getSlotNumber(value2));
        break;
      case 2: // 指定キャラの位置
        this._moveToCharacterPos(character, value1, value2 === 1);
        break;
      case 3: // 指定キャラの位置スロット指定
        this._moveToCharacterPos(
          character,
          getSlotNumber(value1),
          value2 === 1
        );
        break;
    }
    if (direction >= 0) {
      character.changeDirection(direction);
    }
  }

  /**
   * 指定のキャラクター位置に移動
   * @param srcCharacter
   * @param targetId
   * @param exchange
   * @returns
   */
  private _moveToCharacterPos(
    srcCharacter: GameCharacter,
    targetId: number,
    exchange: boolean
  ) {
    const characters = this._getTargetCharacters(targetId);
    if (characters.length === 0) {
      return 0;
    }
    // 最初のキャラだけが対象となる
    const character = characters[0];
    if (exchange) {
      srcCharacter.swapPos(character);
    } else {
      srcCharacter.moveto(character.x, character.y);
      srcCharacter.setDirection(character.direction);
    }
  }

  /**
   * 乗り物の移動
   * @param vehicleId
   * @param type
   * @param positionId
   * @param direction
   */
  private _command105(
    vehicleId: number,
    type: number,
    positionId: number,
    direction: number
  ) {
    // typeが0以外ならスロット参照する
    if (type !== 0) {
      positionId = gameTemp.getSlotNumber(positionId);
    }
    gameMap.moveVehicle(vehicleId, positionId, direction);

    return true;
  }

  /**
   * 移動の設定
   * 0:画面消去方法 0:フェードアウト 1:消去しない
   * 1:画面表示方法 0:フェードイン 1:瞬時
   * 2:隊員の並び 0:そのまま 1:集合 2:一列
   * 3:サウンド
   * 4:中央からのずれを反映するかどうか 0:しない 1:する
   * 5:下からのずれを反映するかどうか 0:しない 1:する
   * 6:移動後の表示 0:そのまま 1:する 2:しない
   * 7:クリーンアップID
   * 8:乗り物から出る
   * @param type
   */
  private _command106(type: number, value: number) {
    switch (type) {
      case 0:
        gameSystem.setTransferScreenOff(value);
        break;
      case 1:
        gameSystem.setTransferScreenOn(value);
        break;
      case 2:
        gameSystem.setTransferFollower(value);
        break;
      case 3:
        gameSystem.setTransferSoundId(value);
        break;
      case 4:
        gameSystem.setTransferScreenXId(value);
        break;
      case 5:
        gameSystem.setTransferScreenYId(value);
        break;
      case 6:
        gameSystem.setTransferVisibility(value);
        break;
      case 7:
        gameTemp.setTransferCleanupId(value);
        break;
      case 8:
        gameTemp.setTransferGetOut(true);
        break;
    }
    return true;
  }

  /**
   * 画面スクロール
   * @param type
   * @param distanceX
   * @param distanceY
   * @param speed
   * @param wait
   */
  private _command107(
    type: number,
    distanceX: number,
    distanceY: number,
    speed: number,
    wait: boolean
  ): boolean {
    switch (type) {
      case 0: // 固定
        return this._setFixScreen();
      case 1: // 固定解除
        return this._releaseFixScreen();
      case 2: // スクロール指定
        return this._startShift(distanceX, distanceY, speed, wait);
      case 3: // スクロールを戻す
        return this._restoreShift(speed, wait);
    }
    return true;
  }

  /**
   * マップ固定を設定
   */
  private _setFixScreen() {
    gameSystem.setMapScroll(false);
    return true;
  }

  /**
   * マップ固定解除
   */
  private _releaseFixScreen() {
    gameSystem.setMapScroll(true);
    return true;
  }

  /**
   * ずらし開始
   * @param distanceX
   * @param distanceY
   * @param speed
   * @param wait
   */
  private _startShift(
    distanceX: number,
    distanceY: number,
    speed: number,
    wait: boolean
  ) {
    if (gameMapSight.scrolling) {
      // ずらし中のときは待機させて再度コマンドを実行する
      this._waitMode = EExecutorWaitMode.Scroll;
      return false;
    }
    gameMapSight.startShift(distanceX, distanceY, speed);
    if (wait) {
      this._waitMode = EExecutorWaitMode.Scroll;
    }
    return true;
  }

  /**
   * ずらしを戻す
   * @param speed
   * @param wait
   */
  private _restoreShift(speed: number, wait: boolean) {
    // ずらし中なら完了をまたず戻すので実行中かどうかは確認しない
    gameMapSight.restoreShift(speed);
    if (wait) {
      this._waitMode = EExecutorWaitMode.Scroll;
    }
    return true;
  }

  /**
   * 移動ルート
   * @param type
   * @param target
   * @param storage
   * @param routeId
   */
  private _command108(
    type: number,
    target: number,
    storage: number,
    routeId: number,
    wait = false
  ) {
    const moveRoute = GameUtils.getMoveRoute(storage, routeId);
    if (!moveRoute) {
      return true;
    }

    const targetId = type === 1 ? getSlotNumber(target) : target;
    const characters = this._getTargetCharacters(targetId);
    for (const character of characters) {
      character.overrideMoveRoute(moveRoute);
    }
    this._targetId = targetId;
    if (wait) {
      this._setWaitMode(EExecutorWaitMode.TargetRoute);
    }

    return true;
  }

  /**
   * 移動ルート待機
   */
  private _command109(stepType: number) {
    this._setWaitMode(EExecutorWaitMode.MoveRoute);
    gameTemp.setMoveRouteWaitStep(stepType > 0);
    return true;
  }

  /**
   * 対象キャラクターを取得
   * @param targetId
   * @returns
   */
  private _getTargetCharacters(targetId: number) {
    if (targetId < 0) {
      return this._event?.objectPerson ? [this._event as GamePerson] : [];
    } else {
      return gameMapSight.getTargetCharacters(targetId);
    }
  }

  /**
   * 隊列操作
   * @param type 0:再設定 1:一列 2:先頭に移動
   */
  private _command110(type: number) {
    gameMarch.control(type);
    return true;
  }

  /**
   * スクリプト呼び出し（マップ）
   * @param type
   * @param scriptId
   * @param timing
   * @returns
   */
  private _command111(type: number, scriptId: number, timing = 0) {
    // スロット指定の場合スロットの値を代入する
    scriptId = this._adjustScriptId(type, scriptId);
    const script = gameMapSight.scriptset[scriptId];
    if (script === undefined) {
      return true;
    }
    if (timing === 1) {
      this._scriptQueue.push(script);
    } else {
      this._callScript(script.list);
    }

    return true;
  }

  /**
   * スクリプト呼び出し（共通）
   * @param type 0:固定 1:スロット参照
   * @param scriptId スクリプトId
   * @param timing 0:即時実行 1:予約
   */
  private _command112(type: number, scriptId: number, timing = 0) {
    scriptId = this._adjustScriptId(type, scriptId);
    const script = commonScriptset[scriptId];
    if (script === undefined) {
      return true;
    }
    if (timing === 1) {
      this._scriptQueue.push(script);
    } else {
      this._callScript(script.list);
    }

    return true;
  }

  /**
   * スクリプトIdの調整
   * @param type
   * @param scriptId
   * @returns
   */
  private _adjustScriptId(type: number, scriptId: number) {
    // スロット指定の場合
    if (type === 1) {
      return gameTemp.getSlotNumber(scriptId);
    }
    return scriptId;
  }

  /**
   * ウェイト
   * @param waitFrame
   * @returns
   */
  private _command113(waitFrame: number) {
    this._setWaitCount(waitFrame);

    return true;
  }

  /**
   * 隊員設定
   * @param type 0:追尾 1:キャラ間隔（未実装）
   * @param param パラメータ
   * @returns
   */
  private _command114(type: number, param: number) {
    switch (type) {
      case 0:
        // 0:する 1:しない
        this._setFollowing(param === 0);
        break;
    }
    return true;
  }

  /**
   * 隊員の追尾設定を行う
   * @param following
   */
  private _setFollowing(following: boolean) {
    gameSystem.setFollowing(following);
    if (following) {
      gameMarch.leader.adjustAnimeCount();
    }
  }

  /**
   * イベントの消去
   * @returns
   */
  private _command115() {
    if (this._sameMapStarted()) {
      this._event?.erase();
    }
    return true;
  }

  /**
   * 行先の設定
   * @param type 設定の種類
   * @param id 行先id
   * @returns
   */
  private _command116(type: number, id: number) {
    if (type === 0) {
      gameParty.addAddressId(id);
    } else {
      gameParty.removeAddressId(id);
    }
    return true;
  }

  /**
   * 中断
   * @param id セーブId
   * @returns
   */
  private _command117(id = 0) {
    gameTemp.startSaving();
    const data = createSuspendObject();
    const textData = JSON.stringify(data, null, 2);
    const header = this._makeSuspendHeader(data);
    if (id === 0) {
      id = gameTemp.diaryId;
    }
    this._setWaitMode(EExecutorWaitMode.Saving);
    GameUtils.suspendFile(id, JSON.stringify(header), textData).then(
      (results: Array<PromiseSettledResult<unknown>>) => {
        if (results.some((result) => result.status === 'rejected')) {
          this._endSaving(1);
        } else {
          this._endSaving(0);
        }
      }
    );

    return true;
  }

  /**
   * 中断ヘッダーを作成する
   * locate以外はセーブヘッダと同じ
   * @param data
   * @returns
   */
  private _makeSuspendHeader(data: SuspendObject): SuspendHeader {
    // 最初に登録したキャラ
    const saveMember = data.members.find((member) => member.id === 0);
    const name = saveMember?.name ?? '';
    const lv = saveMember?.lv ?? 1;
    const mapInfo = mapList[data.map.mapId];
    const locate = mapInfo?.name ?? system.saveInfo.initName ?? '';
    const count = Utils.getPlayCount();
    return { name, lv, locate, count };
  }

  /**
   * 再開
   * @returns
   */
  private _command118() {
    return true;
  }

  /**
   * セーブ
   * @param id セーブId
   * @returns
   */
  private _command119(id = 0) {
    gameTemp.startSaving();
    const data = createSaveObject();
    const position = this._getSavePosition(data.map.mapId);
    if (position) {
      data.map.mapId = position.id;
      data.march.x = position.x;
      data.march.y = position.y;
      data.march.direction = position.direction;
    }
    const textData = JSON.stringify(data, null, 2);
    const header = this._makeSaveHeader(data);
    if (id === 0) {
      id = gameTemp.diaryId;
    }
    this._setWaitMode(EExecutorWaitMode.Saving);
    const headerText = JSON.stringify(header);
    Promise.all([
      // セーブ時に中断ファイルを削除
      GameUtils.removeSuspendFile(id, true),
      GameUtils.saveFile(id, headerText, textData),
    ]).then(
      () => {
        setLastSaveHeader(headerText);
        setLastSaveData(textData);
        this._endSaving(0);
      },
      () => {
        this._endSaving(1);
      }
    );

    return true;
  }

  /**
   * セーブ位置を取得する
   * @param mapId
   * @returns
   */
  private _getSavePosition(mapId: number) {
    if (!mapId) {
      return null;
    }
    const index = mapList[mapId].savePositionId;
    const position = system.positions[index];
    return {
      id: position.mapId,
      x: position.x,
      y: position.y,
      direction: mapList[mapId].saveDirection,
    };
  }

  /**
   * セーブヘッダーを作成する
   * @param data
   * @returns
   */
  private _makeSaveHeader(data: SaveObject): SaveHeader {
    // 最初に登録したキャラ
    const saveMember = data.members.find((member) => member.id === 0);
    const name = saveMember?.name ?? '';
    const lv = saveMember?.lv ?? 1;
    const mapInfo = mapList[data.map.mapId];
    const locate =
      mapInfo?.saveName ?? mapInfo?.name ?? system.saveInfo.initName ?? '';
    const count = Utils.getPlayCount();
    return { name, lv, locate, count };
  }

  /**
   * セーブ終了
   * @param resultIndex
   */
  private _endSaving(resultIndex: number) {
    gameTemp.endSaving();
    this._setCommandResult(resultIndex);
  }

  /**
   * ロード
   * @returns
   */
  private _command120() {
    return true;
  }

  /**
   * SEの演奏
   * @param soundId
   * @returns
   */
  private _command121(soundId: number) {
    GameSound.play(soundId);
    return true;
  }

  /**
   * BGMの演奏
   * @param musicId
   * @returns
   */
  private _command123(musicId: number, noLoop?: boolean) {
    GameMusic.play(musicId, noLoop !== true);
    return true;
  }

  /**
   * BGM割込
   * @param musicId
   * @returns
   */
  private _command124(musicId: number, wait: boolean, noResume: boolean) {
    GameMusic.interrupt(
      musicId,
      () => {
        // 割り込み待機になっている場合は解除する
        if (this._waitMode === EExecutorWaitMode.interruptBgm) {
          this._setWaitMode(EExecutorWaitMode.None);
        }
      },
      noResume
    );
    if (wait) {
      this._setWaitMode(EExecutorWaitMode.interruptBgm);
    }

    return true;
  }

  /**
   * プレイヤーBGMの変更
   * @param musicId
   * @returns
   */
  private _command125(musicId: number) {
    gameMarch.leader.setBgmId(musicId);
    return true;
  }

  /**
   * スタートアップ実行
   * @returns
   */
  private _command129() {
    const scriptId = gameMapSight.mapInfo?.startupId;
    if (!scriptId) {
      return true;
    }
    const script = gameMapSight.scriptset[scriptId];
    if (!script) {
      return true;
    }
    this._callScript(script.list);

    return true;
  }

  /**
   * クリーンアップ実行
   * @returns
   */
  private _command130() {
    const scriptId = gameMapSight.mapInfo?.cleanupId;
    if (!scriptId) {
      return true;
    }
    const script = gameMapSight.scriptset[scriptId];
    if (!script) {
      return true;
    }
    this._callScript(script.list);

    return true;
  }

  /**
   * イベント起動
   * @param triggerHex
   * @returns
   */
  private _command131(triggerHex: number, eventId = 0) {
    if (
      eventId > 0 &&
      gameMapSight.checkEventTriggerByEventId(triggerHex, eventId)
    ) {
      return true;
    }
    if (eventId !== -1 && gameMapSight.checkEventTrigger(triggerHex)) {
      return true;
    }
    const scriptId = this._getNotingScriptId(triggerHex);
    if (scriptId > 0) {
      gameTemp.pushCommonScript(scriptId);
    }

    return true;
  }

  /**
   * 起動するイベントがない時に実行するスクリプトId
   * @param triggerHex
   * @returns
   */
  private _getNotingScriptId(triggerHex: number) {
    if (triggerHex & EEventTriggerHex.Talk) {
      return GameUtils.getCommonScriptId('notFindTalk');
    } else if (triggerHex & EEventTriggerHex.Search) {
      return GameUtils.getCommonScriptId('notFindAnything');
    } else if (triggerHex & EEventTriggerHex.Door) {
      return GameUtils.getCommonScriptId('notFindDoor');
    }
    return 0;
  }

  /**
   * 戦闘開始
   * @param groupType
   * @param groupId
   * @param terrainId
   * @param escape
   * @param escapeScript
   * @param winScript
   * @param loseScript
   * @param preemptive
   * @param preemptiveType
   * @returns
   */
  private _command132(
    groupType: number,
    groupId: number,
    terrainId: number,
    escape: number,
    escapeScript: number,
    winScript: number,
    loseScript: number,
    preemptive: number,
    preemptiveType: number,
    bgmId = 0
  ) {
    const troopId = this._decideTroopIdByGroupInfo(groupType, groupId);
    if (!troopId) {
      return true;
    }
    gameMapSight.setNextTroopId(troopId);
    gameMapSight.setEncounterEffectId(0);
    if (terrainId) {
      gameMapSight.setBattleBackName(terrains[terrainId].battleBackName);
    } else {
      gameMapSight.setBattleBackNameByPosition(
        gameMarch.leader.x,
        gameMarch.leader.y
      );
    }
    gameTemp.setBattleOptions({
      escape: escape === 1,
      escapeScript: escapeScript,
      winScript: winScript,
      loseScript: loseScript,
      preemptive: preemptive === 1,
      preemptiveType: preemptiveType,
      bgmId: bgmId,
    });
    return true;
  }

  /**
   * グループ情報からトループIdを決定する
   * @param groupType
   * @param groupId
   * @returns
   */
  private _decideTroopIdByGroupInfo(groupType: number, groupId: number) {
    switch (groupType) {
      case 0: // トループ
        return groupId;
      case 1: // エンカウンター
        return gameMap.decideTroopIdByEncounterId(groupId);
      default:
        return gameMap.decideTroopId();
    }
  }

  /**
   * 画面のフェードアウト
   * @returns
   */
  private _command141(wait: number, speed = -1, target = 0) {
    speed = speed < 0 ? gameSystem.fadeOutSpeed : speed;
    gameScreen.setFadeOutDuration(speed, target > 0);
    if (wait > 0) {
      this._setWaitCount(speed);
    }
    return true;
  }

  /**
   * 画面のフェードイン
   * @returns
   */
  private _command142(wait: number, speed = -1, target = 0) {
    speed = speed < 0 ? gameSystem.fadeInSpeed : speed;
    gameScreen.setFadeInDuration(speed, target > 0);
    if (wait > 0) {
      this._setWaitCount(speed);
    }
    return true;
  }

  /**
   * 画面のシェイク
   * @param type
   * @param x
   * @param y
   * @param speed
   * @param frame
   * @param wait
   * @returns
   */
  private _command145(
    type: number,
    x: number,
    y: number,
    speed: number,
    frame: number,
    wait: boolean
  ) {
    gameScreen.startShake(
      type,
      x * EMapScale.Scale,
      y * EMapScale.Scale,
      1 << speed,
      frame
    );
    if (wait) {
      this._setWaitCount(frame);
    }
    return true;
  }

  /**
   * マップ、キャラクター、タイルのエフェクト表示
   * @param targetType
   * @param target
   * @param effectId
   * @param waitType
   * @returns
   */
  private _command146(
    targetType: number,
    target: number,
    effectId: number,
    waitType: number
  ) {
    const targets = this._getEffectTargets(targetType, target);
    if (targets.length === 0) {
      return true;
    }

    gameAnimations.push(effectId, targets);
    switch (waitType) {
      case 1:
        this._setWaitMode(EExecutorWaitMode.EffectLength);
        break;
      case 2:
        this._setWaitMode(EExecutorWaitMode.EffectEnd);
        break;
    }

    return true;
  }

  /**
   * エフェクト対象を取得する
   * @param targetType
   * @param target
   * @returns
   */
  private _getEffectTargets(targetType: number, target: number) {
    switch (targetType) {
      case 0:
        return [gameScreen];
      case 1:
        return this._getTargetCharacters(getSlotNumber(target));
      case 3: {
        const picture = gameScreen.findPicture(getSlotNumber(target));
        return picture ? [picture] : [];
      }
      case 4: {
        const battler = idToBattler(this._getBattlerId(target));
        return battler ? [battler] : [];
      }
      default:
        return [];
    }
  }

  /**
   * 透明状態変更
   * @param type 0:透明にする 1:解除する
   */
  private _command151(targetId: number, type: number) {
    const characters = this._getTargetCharacters(targetId);
    const value = type === 0;
    for (const character of characters) {
      character.setTransparent(value);
    }
    return true;
  }

  /**
   * 隊列の集合
   * @param type 集合タイプ
   */
  private _command152(type: number, wait: number) {
    gameMarch.leader.startGather(type);
    if (wait > 0) {
      this._setWaitMode(EExecutorWaitMode.Gathering);
    }
    return true;
  }

  /**
   * 乗り物から出る
   * @returns
   */
  private _command153() {
    gameMapSight.vehicleGetOut();
    return true;
  }

  /**
   * キャラオプション
   * @param type
   * @param target
   * @param storage
   * @param routeId
   * @returns
   */
  private _command160(
    type: number,
    target: number,
    storage: number,
    routeId: number
  ) {
    const moveRoute = GameUtils.getMoveRoute(storage, routeId);
    if (!moveRoute) {
      return true;
    }

    const targetId = type === 1 ? getSlotNumber(target) : target;
    const characters = this._getTargetCharacters(targetId);
    for (const character of characters) {
      character.executeOptionCommands(moveRoute.list);
    }

    return true;
  }

  /**
   * オブジェクトの再設定
   * @returns
   */
  private _command161() {
    gameMap.resetObjects();
    return true;
  }

  /**
   * 指定位置情報取得
   * @param slotId
   * @param kind
   * @param layer
   * @param locationType
   * @param value1
   * @param value2
   * @returns
   */
  private _command162(
    slotId: number,
    kind: number,
    layer: number,
    locationType: number,
    value1: number,
    value2: number
  ) {
    const [x, y] = this._locationTypeToPos(locationType, value1, value2);
    setSlot(slotId, this._getLocationInformation(kind, x, y, layer));

    return true;
  }

  /**
   * 位置タイプから位置に変換する
   * @param locationType
   * @param value1
   * @param value2
   */
  private _locationTypeToPos(
    locationType: number,
    value1: number,
    value2: number
  ) {
    switch (locationType) {
      case 0: // 直接指定
        return [value1, value2];
      case 1: // スロット指定
        return [getSlotNumber(value1), getSlotNumber(value2)];
      case 2:
      case 3: {
        value1 = locationType === 3 ? getSlotNumber(value1) : value1;
        const characters = this._getTargetCharacters(value1);
        return [characters[0]?.x ?? 0, characters[0]?.y ?? 0];
      }
      default:
        return [0, 0];
    }
  }

  /**
   * 指定座標の位置情報を取得する
   * @param kind
   * @param x
   * @param y
   * @param layer
   * @returns
   */
  private _getLocationInformation(
    kind: number,
    x: number,
    y: number,
    layer: number
  ) {
    switch (kind) {
      case 0:
        return gameMapSight.getTerrainId(x, y);
      case 1:
        return gameMapSight.getTileId(x, y, layer);
      case 2:
        return gameMapSight.getGId(layer, x, y);
      default:
        return 0;
    }
  }

  /**
   * 遅延消費キャンセル
   * @returns
   */
  private _command169() {
    gameTemp.mapAction.cancelSafetyConsume();
    return true;
  }

  /**
   * 遅延消費実行
   * @returns
   */
  private _command170() {
    gameTemp.mapAction.safetyUseItem();
    return true;
  }

  /**
   * ピクチャの表示
   * @returns
   */
  private _command171(
    pictureNo: number,
    pictureId: number,
    materialName: string,
    anchorType: number,
    x: number,
    y: number
  ) {
    gameScreen.showPicture(
      pictureNo,
      pictureId,
      materialName,
      anchorType,
      x,
      y
    );
    return true;
  }

  /**
   * ピクチャの移動
   * @param pictureNo
   * @param x
   * @param y
   * @param moveType
   * @param duration
   * @returns
   */
  private _command172(
    pictureNo: number,
    x: number,
    y: number,
    moveType: number,
    duration: number
  ) {
    gameScreen.movePicture(pictureNo, x, y, moveType, duration);
    return true;
  }

  /**
   * ピクチャの削除
   * @param pictureNo
   * @returns
   */
  private _command175(pictureNo: number) {
    gameScreen.erasePicture(pictureNo);
    return true;
  }

  /**
   * 行動結果追加
   * @returns
   */
  private _command181() {
    // 追加後新規オブジェクトにする
    gameTemp.pushActionResult(this._actionResult);
    this._actionResult = newActionResult();
    return true;
  }

  /**
   * 行動文章指定
   * @param messageId
   * @param option
   * @returns
   */
  private _command182(messageId: number, option: number) {
    const text = GameUtils.getMessage(messageId);
    this._actionResult.text = text;
    this._actionResult.textOption = option;

    return true;
  }

  /**
   * 行動文章の設定
   * @param type
   * @returns
   */
  private _command183(type: number) {
    const option = type + EMessageOption.SettingsOption;
    this._actionResult.textSettingOption = option;

    return true;
  }

  /**
   * 行動エフェクトの指定
   * @param effectId
   * @returns
   */
  private _command184(effectId: number) {
    this._actionResult.animationId = effectId;
    return true;
  }

  /**
   * 行動対象の指定
   * slotId: 対象Idの入ったスロットId
   * @returns
   */
  private _command185(slotId: number) {
    const battlerId = this._getBattlerId(slotId);
    const target = idToBattler(battlerId);
    if (target) {
      this._actionResult.targets.push(target);
    }
    return true;
  }

  /**
   * スロットに格納された戦闘者Idを取得する
   * @param slotId
   * @returns
   */
  private _getBattlerId(slotId: number) {
    return GameUtils.checkSlotNumber(slotId)
      ? (gameTemp.getSlot(slotId) as number)
      : -1;
  }

  /**
   * 追加行動指定
   * ActionExtraではない
   * 処理を抜ける(extra =2)を指定することよりスクリプト以降の処理を実施できなく
   * することができる
   * @returns
   */
  private _command186(extra = 2) {
    this._actionResult.extra = extra;
    return true;
  }

  /**
   * 強制行動の指定
   * @param slotId
   * @param skillId
   * @returns
   */
  private _command187(slotId: number, skillId: number) {
    const battlerId = this._getBattlerId(slotId);
    const target = idToBattler(battlerId);
    if (!target?.live) {
      return true;
    }
    target.setForceSkillId(skillId);

    return true;
  }

  /**
   * 戦闘者画像の変更
   * 実体は敵画像
   * @param slotId
   * @param enemyId
   * @returns
   */
  private _command188(slotId: number, enemyId: number) {
    const battlerId = this._getBattlerId(slotId);
    const target = idToBattler(battlerId);
    if (!target || target.myself) {
      return true;
    }
    (target as GameEnemy).changeImage(enemies[enemyId].imageName);

    return true;
  }

  /**
   * 戦闘者の変更
   * @param slotId
   * @param enemyId
   * @returns
   */
  private _command189(slotId: number, enemyId: number) {
    const battlerId = this._getBattlerId(slotId);
    const target = idToBattler(battlerId);
    if (!target || target.myself) {
      return true;
    }
    (target as GameEnemy).transform(enemyId);

    return true;
  }

  /**
   * コメント
   * デバッグ用
   * @param text
   * @returns
   */
  private _command201(text: string) {
    GameLog.debug(text);
    return true;
  }

  /**
   * 床ダメージ切替
   * 0以外の時は有効にする
   * @param enable
   * @returns
   */
  private _command211(enable: number) {
    gameSystem.setFloorDamage(enable !== 0);
    return true;
  }

  /**
   * 歩行ダメージ切替
   * 0以外の時は有効にする
   * @param enable
   * @returns
   */
  private _command212(enable: number) {
    gameSystem.setSlipDamage(enable !== 0);
    return true;
  }

  /**
   * エンカウント切替
   * 0以外の時は有効にする
   * 無効にするときにエンカウントフラグをクリアする
   * @param enable
   * @returns
   */
  private _command213(enable: number) {
    if (enable === 0) {
      gameMarch.leader.clearEncounterCalling();
      gameSystem.setEncounter(false);
    } else {
      gameSystem.setEncounter(true);
    }
    return true;
  }

  /**
   * 部屋移動設定
   * 0以外の時は有効にする
   * @param enable
   * @returns
   */
  private _command214(enable: number) {
    gameSystem.setRoomMove(enable !== 0);
    return true;
  }

  /**
   * コマンド終了チェック
   * 終了できる状態になるまでfalseを返す
   */
  private _command999() {
    if (gameMenus.hasMenu) {
      if (!this._messageWaiting) {
        gameMenus.endAll();
      }
      return false;
    }
    if (this._event) {
      this._event.unlock();
      this._event = null;
    }
    return true;
  }
}
