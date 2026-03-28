import { EEventTriggerHex, EObjectPriorityHex, MapPart } from './DataTypes';
import {
  EDirection,
  GameCharacter,
  SuspendObjectGameCharacter,
} from './GameCharacter';
import { GameRange } from './GameMapParts';
import { EErrorMessage, GameUtils } from './GameUtils';
import Utils, { Constructor } from './Utils';
import { TiledObject } from 'tiled-types';
import {
  EConditionCompareFlag,
  EConditionCompareSlot,
  EConditionCompareVariable,
  ELockType,
  EMapPartOrder,
  EMoveType,
  EventCommand,
  EventCondition,
} from './DataTypes';
import {
  commonScriptset,
  gameMapSight,
  gameMarch,
  gameParty,
  gameTemp,
  mapParts,
} from './DataStore';
import { getFlag, getVariable } from './DataUtils';
import { GameLog } from './GameLog';

export type GameEvent = GameEventAuto | GameTile | GameRangeEvent | GamePerson;
export type SuspendObjectGameEvent =
  | SuspendObjectGamePerson
  | SuspendObjectGameEventBase<SuspendObjectEventBase>;

export class GameEventUtils {
  /**
   * 条件を満たすか確認
   * @param conditions
   */
  static checkConditions(conditions: EventCondition[] | undefined) {
    let result = true; // 条件がない場合は満たしている
    if (conditions === undefined) return result;

    for (let ci = 0; ci < conditions.length; ci++) {
      const condition = conditions[ci];
      const type = condition.type;
      const methodName = '_checkCondition' + type;
      if (typeof this[methodName] !== 'function') {
        // 不正値は条件なし扱い
        continue;
      }
      // 満たしていたら次を確認
      // 配列を使う必要があるがデータの型をイベントみたいな感じにしたほうが扱いやすそう
      if (this[methodName](condition)) {
        continue;
      }
      // 満たさなかったら終了
      result = false;
      break;
    }

    return result;
  }

  /**
   * フラグ条件確認
   * @param condition
   */
  static _checkCondition0(condition: EventCondition) {
    const flagId = condition.param1;
    const compare = condition.compare;
    const flag = getFlag(flagId);
    if (compare === EConditionCompareFlag.OFF) {
      return !flag;
    } else if (compare === EConditionCompareFlag.ON) {
      return flag;
    } else {
      return false;
    }
  }

  /**
   * 変数条件確認
   * @param condition
   */
  static _checkCondition1(condition: EventCondition) {
    const variableId = condition.param1;
    const value = condition.param2;
    const compare = condition.compare;
    const variable = getVariable(variableId);
    switch (compare) {
      case EConditionCompareVariable.EQUAL:
        return variable === value;
      case EConditionCompareVariable.MORE:
        return variable >= value;
      case EConditionCompareVariable.LESS:
        return variable <= value;
      case EConditionCompareVariable.GREATER:
        return variable > value;
      case EConditionCompareVariable.SMALLER:
        return variable < value;
      case EConditionCompareVariable.NOTEQUAL:
        return variable !== value;
      case EConditionCompareVariable.AND:
        return (variable & value) > 0;
      case EConditionCompareVariable.NAND:
        return !(variable & value);
      default:
        return false;
    }
  }

  /**
   * スロット条件確認
   * @param condition
   */
  static _checkCondition2(condition: EventCondition) {
    const slotId = condition.param1;
    const value = condition.param2;
    const compare = condition.compare;
    const slotValue = gameTemp.getSlotNumber(slotId);
    switch (compare) {
      case EConditionCompareSlot.EQUAL:
        return slotValue === value;
      case EConditionCompareSlot.MORE:
        return slotValue >= value;
      case EConditionCompareSlot.LESS:
        return slotValue <= value;
      case EConditionCompareSlot.GREATER:
        return slotValue > value;
      case EConditionCompareSlot.SMALLER:
        return slotValue < value;
      case EConditionCompareSlot.NOTEQUAL:
        return slotValue !== value;
      case EConditionCompareSlot.AND:
        return (slotValue & value) > 0;
      case EConditionCompareSlot.NAND:
        return !(slotValue & value);
      default:
        return false;
    }
  }

  /**
   * 道具条件確認
   * @param condition
   * @returns
   */
  static _checkCondition3(condition: EventCondition) {
    const have = gameParty.numItems(condition.param1) > 0;
    if (condition.compare === 0) {
      return !have;
    } else {
      return have;
    }
  }

  /**
   * 仲間条件確認
   * @param condition
   * @returns
   */
  static _checkCondition4(condition: EventCondition) {
    const index = gameParty.members.findIndex(
      (m) => m.memberId === condition.param1
    );
    if (condition.compare === 0) {
      return index < 0;
    } else {
      return index >= 0;
    }
  }
}

type EventBaseConstructor =
  | Constructor<GameObjectBase>
  | Constructor<GameCharacter>;

/**
 * 空のtiledオブジェクト
 */
const _emptyTiledObject: TiledObject = {
  height: 0,
  id: 0,
  name: '',
  properties: [],
  rotation: 0,
  type: '',
  visible: false,
  width: 0,
  x: 0,
  y: 0,
};

/**
 * イベントクラスの中断オブジェクト
 */
interface SuspendObjectGameEventBase<T> {
  base: T;
  objectTypeName: string;
  refPageId: number;
  erased: boolean;
  starting: boolean;
  startTrigger: number;
  triggeredObjectId: number;
  trigger: number;
  objectId: number;
  objectIndex: number;
  layerId: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type SuspendObjectGameObjectBase = {};

type SuspendObjectEventBase =
  | SuspendObjectGameCharacter
  | SuspendObjectGameObjectBase;

/**
 * イベントのミックスインクラス
 * @param Base
 */
const GameEventMixIn = <TBase extends EventBaseConstructor>(Base: TBase) =>
  /**
   * MixInのベースとなるクラス
   */
  class extends Base {
    /**
     * 参照ページId
     */
    protected _refPageId: number = -1;
    /**
     * イベントリスト
     */
    protected _list: EventCommand[] = [];
    /**
     * イベント消去されているか
     */
    private _erased: boolean = false;
    /**
     * イベント開始フラグ
     */
    protected _starting: boolean = false;
    /**
     * 起動したトリガー
     */
    protected _startTrigger: number = 0;
    /**
     * トリガーとなったオブジェクトId
     */
    private _triggeredObjectId: number = 0;
    /**
     * 起動可能なトリガー
     * 16進数の組み合わせ
     */
    protected _trigger: number = EEventTriggerHex.None;
    /**
     * イベントオブジェクト
     * マップに設定しているオブジェクト
     */
    private _object: TiledObject = _emptyTiledObject;

    /**
     * コンストラクタ
     * @param _objectId イベントオブジェクトのインデックスに相当する
     * @param _objectIndex マップに設定しているオブジェクトのインデックス
     * @param _layerId イベントグループのインデックスに相当する
     */
    constructor(
      private _objectId: number,
      private _objectIndex: number = -1,
      private _layerId: number = -1
    ) {
      super();
      GameLog.debug('GameEvent', this._objectId);
      this._resetObject();
    }

    /**
     * オブジェクトタイプ名を取得
     */
    get objectTypeName() {
      return 'base';
    }

    /**
     * 自動実行イベントオブジェクトか
     */
    get objectAuto() {
      return this.objectTypeName === 'auto';
    }

    /**
     * 範囲イベントオブジェクトか
     */
    get objectRange() {
      return this.objectTypeName === 'range';
    }

    /**
     * タイルイベントオブジェクトか
     */
    get objectTile() {
      return this.objectTypeName === 'tile';
    }

    /**
     * 人イベントオブジェクトか
     */
    get objectPerson() {
      return this.objectTypeName === 'person';
    }

    /**
     * 前方検出可能か
     */
    get detectFront() {
      return false;
    }

    get collision() {
      return true;
    }

    get playerCollision() {
      return true;
    }

    /**
     * オブジェクトのIdを取得
     * 自動実行イベントは空オブジェクト
     */
    get id() {
      return this._object.id;
    }

    /**
     * オブジェクトIdを取得
     */
    get objectId() {
      return this._objectId;
    }

    /**
     * コマンドリストを取得
     */
    get list() {
      return this._list;
    }

    /**
     * 起動起因を返却する
     */
    get startTriggerId() {
      return this._startTrigger;
    }

    /**
     * トリガーとなったオブジェクトIdを取得する
     */
    get triggeredObjectId() {
      return this._triggeredObjectId;
    }

    /**
     * 横軸の初期位置をタイル座標で取得する
     */
    get initialX() {
      return GameUtils.tileX(this._object.x);
    }

    /**
     * 縦軸の初期位置をタイル座標で取得する
     */
    get initialY() {
      return GameUtils.tileY(this._object.y);
    }

    /**
     * イベント開始フラグを取得する
     */
    get starting() {
      return this._starting;
    }

    /**
     * オブジェクトデータの横座標を取得する
     */
    protected get _objectX() {
      return this._object.x;
    }

    /**
     * オブジェクトデータの縦座標を取得する
     */
    protected get _objectY() {
      return this._object.y;
    }

    /**
     * オブジェクトの横幅を取得する
     */
    protected get _objectWidth() {
      return this._object.width;
    }

    /**
     * オブジェクトの縦幅を取得する
     */
    protected get _objectHeight() {
      return this._object.height;
    }

    /**
     * オブジェクトのグローバルIdを取得する
     * タイル用
     */
    protected get _objectGid() {
      return this._object.gid;
    }

    /**
     * 再設定
     */
    reset() {
      super.reset();
      this._resetObject();
      this._refPageId = -1;
      this._list = [];
      this._erased = false;
      this._starting = false;
      this._startTrigger = 0;
      this._triggeredObjectId = 0;
    }

    /**
     * 中断データから読み込み
     * @param data
     */
    loadSuspend(data: SuspendObjectGameEventBase<SuspendObjectEventBase>) {
      if (data.base) {
        super._loadSuspend(data.base);
      }
      this._refPageId = data.refPageId ?? this._refPageId;
      this._erased = data.erased ?? this._erased;
      this._starting = data.starting ?? this._starting;
      this._startTrigger = data.startTrigger ?? this._startTrigger;
      this._triggeredObjectId =
        data.triggeredObjectId ?? this._triggeredObjectId;
      this._trigger = data.trigger ?? this._trigger;
      this._objectId = data.objectId ?? this._objectId;
      this._objectIndex = data.objectIndex ?? this._objectIndex;
      this._layerId = data.layerId ?? this._layerId;
    }

    /**
     * 中断オブジェクトの作成
     * @returns
     */
    createSuspendObject(): SuspendObjectGameEventBase<SuspendObjectEventBase> {
      return {
        base: super._createSuspendObject(),
        objectTypeName: this.objectTypeName,
        refPageId: this._refPageId,
        erased: this._erased,
        starting: this._starting,
        startTrigger: this._startTrigger,
        triggeredObjectId: this._triggeredObjectId,
        trigger: this._trigger,
        objectId: this._objectId,
        objectIndex: this._objectIndex,
        layerId: this._layerId,
      };
    }

    /**
     * 中断データロード後の処理
     */
    afterLoadSuspend() {
      this._resetObject();
      if (this._refPageId >= 0) {
        this._setCommandList();
      }
    }

    /**
     * オブジェクトをリセットする
     */
    protected _resetObject() {
      if (this._layerId < 0) {
        this._object = _emptyTiledObject;
      } else {
        const objects = gameMapSight.getRawObjects(this._layerId);
        this._object = objects?.[this._objectIndex];
      }
    }

    /**
     * イベントを取得する
     * @returns
     */
    protected _getEvent() {
      return gameMapSight.eventset.objects[this._objectId];
    }

    /**
     * イベントの消去
     */
    erase() {
      this._erased = true;
      this.refresh();
    }

    /**
     * イベント起動
     * @param startTrigger
     */
    start(startTrigger: number, triggeredObjectId = 0) {
      GameLog.debug('start event', this._objectId);
      // 開始予約されていればなにもしない
      if (this._starting) {
        GameLog.debug(
          'event name',
          this._object?.name ?? '???',
          'already reserved'
        );
        return;
      }
      GameLog.debug(
        'event name',
        this._object?.name ?? '???',
        'size =',
        this._list.length,
        'start'
      );
      if (this._list.length > 0) {
        this._starting = true;
        this._startTrigger = startTrigger;
        this._triggeredObjectId = triggeredObjectId;
      }
    }

    /**
     * 開始をクリア
     */
    clearStarting() {
      this._starting = false;
    }

    /**
     * ページインデックスに設定されているスクリプトを取得する
     * @param index
     * @returns
     */
    protected _getScript(index: number) {
      const pages = this._getEvent().pages;
      if (!pages) {
        throw new Error(EErrorMessage.InvalidEvent);
      }
      if (pages.length <= index) {
        return;
      }
      const page = pages[index];
      if (page.scriptId !== undefined) {
        const script = gameMapSight.scriptset[page.scriptId];
        if (script === undefined) {
          throw new Error(EErrorMessage.OutrangeScript);
        }
        return script;
      }
      if (page.commonScriptId !== undefined) {
        const script = commonScriptset[page.commonScriptId];
        if (script === undefined) {
          throw new Error(EErrorMessage.OutrangeScript);
        }
        return script;
      }
      return;
    }

    /**
     * タイルイベント用
     * ほかはなにもしない
     * @param gid
     * @returns
     */
    replace(gid: number): void;
    replace() {
      return;
    }

    /**
     * リフレッシュ
     */
    refresh() {
      const refPageId = this._erased ? -1 : this._getAppearingPageId();
      // ページが変わっていない
      if (this._refPageId === refPageId) {
        return;
      }
      // 起動予約があるなら削除
      this.clearStarting();
      this._refPageId = refPageId;
      // 出現ページなし
      if (refPageId < 0) {
        this._clearEvent();
      } else {
        this._setData(refPageId);
      }
    }

    /**
     * 16進数トリガー確認
     * @param triggerHex
     * @returns
     */
    checkTriggerHex(triggerHex: number) {
      return (this._trigger & triggerHex) !== 0;
    }

    /**
     * ロックをかける
     */
    lock() {
      //
    }

    /**
     * ロックを解除
     */
    unlock() {
      //
    }

    /**
     * イベントのクリア
     */
    protected _clearEvent() {
      this._trigger = EEventTriggerHex.None;
      this._list = [];
    }

    /**
     * ページデータを設定
     * @param refPageId
     */
    protected _setData(refPageId: number) {
      const event = this._getEvent();
      // 優先度ページ＞イベント＞デフォルトデータで入れていく
      const page = event.pages[refPageId];
      this._trigger = page.trigger ?? event.trigger ?? EEventTriggerHex.None;
      // ページだけのデータ
      const script = this._getScript(refPageId);
      this._list = script?.list ?? [];

      // 自動実行イベントなら設定時に開始させる
      this._checkTriggerAuto();
    }

    /**
     * コマンドリストを設定する
     */
    private _setCommandList() {
      const script = this._getScript(this._refPageId);
      this._list = script?.list ?? [];
      this._checkTriggerAuto();
    }

    /**
     * 出現ページIdを取得
     */
    private _getAppearingPageId() {
      const pages = this._getEvent().pages;
      let refPageId = -1;
      // 降順に判定する
      for (let i = pages.length - 1; i >= 0; i--) {
        const script = this._getScript(i);
        // 条件を満たすページがあった
        if (GameEventUtils.checkConditions(script?.conditions)) {
          refPageId = i;
          break;
        }
      }
      return refPageId;
    }

    /**
     * 自動実行イベントの確認
     */
    protected _checkTriggerAuto() {
      if (this._trigger & EEventTriggerHex.Auto) {
        this.start(EEventTriggerHex.Auto);
      }
    }
  };

/**
 * オブジェクトベースクラス
 */
export class GameObjectBase {
  /**
   * コンストラクタ
   * @param args
   */
  constructor(...args);
  constructor() {}

  reset() {}

  /**
   * 中断データから読み込み
   * 保存データがないのでなにもしない、継承用
   * @param data
   */
  protected _loadSuspend(data: unknown): void;
  protected _loadSuspend() {
    //
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  protected _createSuspendObject() {
    return {};
  }

  /**
   * キャラクターかどうか
   */
  get character() {
    return false;
  }

  /**
   * タイルかどうか
   */
  get tile() {
    return false;
  }

  /**
   * 通行禁止か
   * デフォルトは禁止でない
   * @returns
   */
  noTraffic(x: number, y: number): boolean;
  noTraffic() {
    return false;
  }

  /**
   * 移動ルート
   * 移動できない
   */
  overrideMoveRoute() {
    //
  }

  /**
   * 接触判定
   * @param x
   * @param y
   */
  contact(x: number, y: number): boolean;
  contact() {
    return false;
  }

  /**
   * 更新
   */
  update() {
    //
  }
}

/**
 * 自動実行イベント
 * タイルやキャラクターを持たずに発生条件を満たせば自動実行される
 * 機能的にはGameObjectBaseを継承するベースメソッドを使ってるので
 * 便宜上継承している
 */
export class GameEventAuto extends GameEventMixIn(GameObjectBase) {
  /**
   * オブジェクトタイプ名を取得
   */
  override get objectTypeName() {
    return 'auto';
  }

  /**
   * コンストラクタ
   * @param args
   */
  constructor(objectId: number) {
    super(objectId);
    GameLog.debug('auto', this.objectId);
  }

  /**
   * 更新
   */
  update() {
    // ページが発生していればイベント実行
    if (this._refPageId >= 0) {
      this.start(EEventTriggerHex.Auto);
    }
  }
}

/**
 * 範囲クラスの中断オブジェクト
 */
export interface SuspendObjectGameRangeEvent
  extends SuspendObjectGameEventBase<SuspendObjectGameObjectBase> {
  range: [number, number, number, number];
  inout: string;
  priority: number;
  partId: number;
  partOrder: EMapPartOrder;
  layerIndex: number;
  oldPartId: number;
  oldPartOrder: EMapPartOrder;
  oldLayerIndex: number;
}

/**
 * 範囲イベント
 */
export class GameRangeEvent extends GameEventMixIn(GameObjectBase) {
  /**
   * 範囲
   */
  private _range: GameRange = this._makeRange();
  /**
   * 内か外か
   */
  private _inout: string = 'in';
  /**
   * 優先度
   */
  private _priority: number = EObjectPriorityHex.None;
  /**
   * マップパーツId
   */
  private _partId: number = 0;
  /**
   * マップパーツの順序
   */
  private _partOrder: EMapPartOrder = EMapPartOrder.LeftTop;
  /**
   * 影響するレイヤーインデックス
   */
  private _layerIndex: number = -1;
  /**
   * 前のマップパーツId
   */
  private _oldPartId: number = 0;
  /**
   * 前のマップパーツタイプ
   */
  private _oldPartOrder: EMapPartOrder = EMapPartOrder.LeftTop;
  /**
   * 前の影響するレイヤーインデックス
   */
  private _oldLayerIndex: number = -1;

  /**
   * オブジェクトタイプ名を取得
   */
  override get objectTypeName() {
    return 'range';
  }

  /**
   * 前方イベントが有効か
   */
  override get detectFront() {
    return (
      (this._priority & EObjectPriorityHex.Front) === EObjectPriorityHex.Front
    );
  }

  /**
   * 衝突するか
   */
  override get collision() {
    return (
      (this._priority & EObjectPriorityHex.Collision) ===
      EObjectPriorityHex.Collision
    );
  }

  /**
   * プレイヤーが衝突するか
   */
  override get playerCollision() {
    return (
      (this._priority & EObjectPriorityHex.PlayerCollision) ===
      EObjectPriorityHex.PlayerCollision
    );
  }

  /**
   * コンストラクタ
   * @param args
   */
  constructor(objectId: number, objectIndex: number, layerId: number) {
    super(objectId, objectIndex, layerId);
    GameLog.debug('range', this.objectId);
  }

  /**
   * 再設定
   */
  override reset() {
    super.reset();
    this._range = this._makeRange();
    this._clearRangeInfo();
    this._oldPartId = 0;
    this._oldPartOrder = EMapPartOrder.LeftTop;
    this._oldLayerIndex = -1;
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameRangeEvent) {
    super.loadSuspend(data);
    if (data.range) {
      this._range = new GameRange(...data.range);
    }
    this._inout = data.inout ?? this._inout;
    this._priority = data.priority ?? this._priority;
    this._partId = data.partId ?? this._partId;
    this._partOrder = data.partOrder ?? this._partOrder;
    this._layerIndex = data.layerIndex ?? this._layerIndex;
    this._oldPartId = data.oldPartId ?? this._oldPartId;
    this._oldPartOrder = data.oldPartOrder ?? this._oldPartOrder;
    this._oldLayerIndex = data.oldLayerIndex ?? this._oldLayerIndex;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameRangeEvent {
    return {
      ...super.createSuspendObject(),
      range: this._range.toArray(),
      inout: this._inout,
      priority: this._priority,
      partId: this._partId,
      partOrder: this._partOrder,
      layerIndex: this._layerIndex,
      oldPartId: this._oldPartId,
      oldPartOrder: this._oldPartOrder,
      oldLayerIndex: this._oldLayerIndex,
    };
  }

  /**
   * 範囲の作成
   * @returns
   */
  private _makeRange() {
    const x = GameUtils.tileX(this._objectX);
    const y = GameUtils.tileY(this._objectY);
    const width = GameUtils.tileX(this._objectWidth);
    const height = GameUtils.tileY(this._objectHeight);
    return new GameRange(x, y, width, height);
  }

  /**
   * 中断データロード後の処理
   */
  override afterLoadSuspend() {
    super.afterLoadSuspend();
    this._replaceNewPart();
  }

  /**
   * イベントをクリア
   */
  protected _clearEvent() {
    super._clearEvent();
    this._clearRangeInfo();
  }

  /**
   * 範囲情報を削除する
   */
  private _clearRangeInfo() {
    this._inout = 'in';
    this._priority = EObjectPriorityHex.None;
    this._partId = 0;
    this._partOrder = EMapPartOrder.LeftTop;
    this._layerIndex = -1;
  }

  /**
   * データを設定
   * @param refPageId
   */
  protected _setData(refPageId: number) {
    super._setData(refPageId);
    // ページデータがあれば上書きしていく
    const event = this._getEvent();
    const page = event.pages[refPageId];
    this._inout = page.inout ?? event.inout ?? 'in';
    this._priority =
      page.priority ?? event.priority ?? EObjectPriorityHex.Collision;
    this._partId = page.partId ?? event.partId ?? 0;
    this._partOrder =
      page.partOrder ?? event.partOrder ?? EMapPartOrder.LeftTop;
    this._layerIndex = page.layerIndex ?? event.layerIndex ?? -1;
  }

  /**
   * マップパーツを置き換える
   * @returns
   */
  private _replacePart() {
    if (this._oldPartId === this._partId) {
      return;
    }
    this._restoreOldPart();
    this._replaceNewPart();
    this._oldPartId = this._partId;
    this._oldPartOrder = this._partOrder;
    this._oldLayerIndex = this._layerIndex;
  }

  /**
   * 前のマップパーツを戻す
   */
  private _restoreOldPart() {
    if (this._oldPartId > 0) {
      // 戻す
      const mapPart = mapParts[this._oldPartId];
      const [rx, ry] = this._adjustPartStartPos(
        this._range,
        mapPart,
        this._oldPartOrder
      );
      gameMapSight.restorePart(this._oldLayerIndex, mapPart, rx, ry);
    }
  }

  /**
   * 新しいマップパーツを置き換える
   */
  private _replaceNewPart() {
    if (this._partId > 0) {
      // 設定する
      const mapPart = mapParts[this._partId];
      const [rx, ry] = this._adjustPartStartPos(
        this._range,
        mapPart,
        this._partOrder
      );
      gameMapSight.setPart(this._layerIndex, mapPart, rx, ry);
    }
  }

  /**
   * マップパーツ開始位置の調整
   * @param range
   * @param part
   * @param order
   * @returns
   */
  private _adjustPartStartPos(
    range: GameRange,
    part: MapPart,
    order: EMapPartOrder
  ) {
    switch (order) {
      case EMapPartOrder.LeftBottom:
        return [range.x, range.y - part.sizeY + 1];
      case EMapPartOrder.RightTop:
        return [range.x - part.sizeX + 1, range.y];
      case EMapPartOrder.RightBottom:
        return [range.x - part.sizeX + 1, range.y - part.sizeY + 1];
      default:
        return [range.x, range.y];
    }
  }

  /**
   * 通行禁止か
   * @returns
   */
  noTraffic(x: number, y: number) {
    return this.contact(x, y);
  }

  /**
   * 接触しているか
   * @param x
   * @param y
   * @returns
   */
  contact(x: number, y: number) {
    const within = this._range.within(x, y);
    return this._inout === 'in' ? within : !within;
  }

  /**
   * 更新
   */
  update() {
    super._checkTriggerAuto();
  }

  /**
   * 再構築
   */
  refresh() {
    super.refresh();
    // マップパーツの変更を行う
    this._replacePart();
  }
}

/**
 * タイルクラスの中断オブジェクト
 */
export interface SuspendObjectGameTile
  extends SuspendObjectGameEventBase<SuspendObjectGameObjectBase> {
  x: number;
  y: number;
  tileData: number;
}

/**
 * タイルクラス
 */
export class GameTile extends GameEventMixIn(GameObjectBase) {
  /**
   * X座標
   */
  private _x: number = GameUtils.tileX(this._objectX);
  /**
   * Y座標
   */
  private _y: number = GameUtils.tileY(this._objectY - this._objectHeight);
  /**
   * タイルデータ
   */
  private _tileData: number = 0;

  /**
   * オブジェクトタイプ名を取得
   */
  override get objectTypeName() {
    return 'tile';
  }

  /**
   * コンストラクタ
   * @param args
   */
  constructor(objectId: number, objectIndex: number, layerId: number) {
    super(objectId, objectIndex, layerId);
  }

  /**
   * X座標を取得する
   */
  get x() {
    return this._x;
  }

  /**
   * Y座標を取得する
   */
  get y() {
    return this._y;
  }

  /**
   * タイルデータを取得する
   */
  get tileData() {
    return this._tileData;
  }

  /**
   * 再設定
   */
  override reset(): void {
    super.reset();
    this._x = GameUtils.tileX(this._objectX);
    // タイルオブジェクトの場合は下がy座標になっているので上に補正する
    this._y = GameUtils.tileY(this._objectY - this._objectHeight);
    this._clearTileInfo();
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameTile) {
    super.loadSuspend(data);
    this._x = data.x ?? this._x;
    this._y = data.y ?? this._y;
    this._tileData = data.tileData ?? this._tileData;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameTile {
    return {
      ...super.createSuspendObject(),
      x: this._x,
      y: this._y,
      tileData: this._tileData,
    };
  }

  /**
   * タイル置き換え操作をする
   * @param gid
   */
  replace(gid: number) {
    this._tileData = GameUtils.gidToTileData(gid, gameMapSight.tilesets);
    gameTemp.pushReplaceTilePositions(this.x, this.y);
  }

  /**
   * イベントをクリア
   */
  protected _clearEvent() {
    super._clearEvent();
    this._clearTileInfo();
  }

  /**
   * タイル情報を削除
   */
  private _clearTileInfo() {
    this._tileData = 0;
  }

  /**
   * データを設定する
   * @param refPageId
   */
  protected _setData(refPageId: number) {
    super._setData(refPageId);
    // ページデータがあれば上書きしていく

    this._tileData = GameUtils.gidToTileData(
      this._objectGid ?? 0,
      gameMapSight.tilesets
    );
  }

  /**
   * 指定座標と接触しているか
   * @param x
   * @param y
   */
  contact(x: number, y: number) {
    if (this._x === x && this._y === y) {
      return true;
    }
    return false;
  }

  /**
   * 初期化する
   */
  refresh() {
    super.refresh();
  }

  /**
   * 更新
   */
  update() {
    super._checkTriggerAuto();
  }
}

const enum EPersonUpdatePhase {
  Normal,
  Nothing,
  AfterMove,
}

/**
 * 人物クラスの中断オブジェクト
 */
export interface SuspendObjectGamePerson
  extends SuspendObjectGameEventBase<SuspendObjectGameCharacter> {
  moveType: EMoveType;
  moveRegionKey: string;
  lockType: ELockType;
  preLockDirection: number;
  locked: boolean;
  updatePhase: EPersonUpdatePhase;
}

/**
 * 人物クラス
 */
export class GamePerson extends GameEventMixIn(GameCharacter) {
  /**
   * 移動タイプ
   */
  private _moveType: EMoveType = EMoveType.None;
  /**
   * 移動範囲キー
   */
  private _moveRegionKey: string = '';
  /**
   * ロックタイプ
   */
  private _lockType: ELockType = ELockType.HOLDING;
  /**
   * ロック前の向き
   */
  private _preLockDirection: number = -1;
  /**
   * ロック中か
   */
  private _locked: boolean = false;
  /**
   * 更新段階
   * 部屋切替後、切替前の残処理を行うために
   * この変数で切り替える
   * 切替開始時はupdateがかかるのでプレイヤーだけでなく
   * イベントにも必要
   */
  private _updatePhase: EPersonUpdatePhase = EPersonUpdatePhase.Normal;

  /**
   * オブジェクトタイプ名を取得
   */
  override get objectTypeName() {
    return 'person';
  }

  /**
   * 前方イベントが有効か
   */
  override get detectFront() {
    return true;
  }

  /**
   * コンストラクタ
   * @param args
   */
  constructor(objectId: number, objectIndex: number, layerId: number) {
    super(objectId, objectIndex, layerId);
    this._setInitialPosition();
    // 開始時イベントの場合は this.start()を行う
    GameLog.debug('person', this.objectId);
  }

  /**
   * 再設定
   */
  override reset(): void {
    super.reset();
    this._clearMoveInfo();
    this._locked = false;
    this._setInitialPosition();
    this._updatePhase = EPersonUpdatePhase.Normal;
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGamePerson) {
    super.loadSuspend(data);
    this._moveType = data.moveType ?? this._moveType;
    this._moveRegionKey = data.moveRegionKey ?? this._moveRegionKey;
    this._lockType = data.lockType ?? this._lockType;
    this._preLockDirection = data.preLockDirection ?? this._preLockDirection;
    this._locked = data.locked ?? this._locked;
    this._updatePhase = data.updatePhase ?? this._updatePhase;
  }

  /**
   * 中断オブジェクトの作成
   * createSuspendObject()の展開ができないのでキャストでごまかしている
   * @returns
   */
  createSuspendObject(): SuspendObjectGamePerson {
    return {
      ...(super.createSuspendObject() as SuspendObjectGameEventBase<SuspendObjectGameCharacter>),
      moveType: this._moveType,
      moveRegionKey: this._moveRegionKey,
      lockType: this._lockType,
      preLockDirection: this._preLockDirection,
      locked: this._locked,
      updatePhase: this._updatePhase,
    };
  }

  /**
   * 初期位置を設定する
   */
  protected _setInitialPosition() {
    this.moveto(GameUtils.tileX(this._objectX), GameUtils.tileY(this._objectY));
  }

  /**
   * イベントのクリア
   */
  protected _clearEvent() {
    super._clearEvent();
    this.setImage(0, 0);
    this._clearMoveInfo();
  }

  /**
   * 動作情報のクリア
   */
  private _clearMoveInfo() {
    this._moveType = EMoveType.None;
    this._moveRegionKey = '';
    this._lockType = ELockType.HOLDING;
    this._preLockDirection = -1;
    this.setMoveRouteOverride(false);
  }

  /**
   * データの設定
   * @param refPageId
   */
  protected _setData(refPageId: number) {
    super._setData(refPageId);
    const event = this._getEvent();
    // ページデータがあれば上書きしていく
    const page = event.pages[refPageId];

    // 歩行画像
    const imageId = page.imageId ?? event.imageId ?? 0;
    const index = page.index ?? event.index ?? 0;
    this.setImage(imageId, index);

    // 方向
    this.setDirection(page.direction ?? event.direction ?? 0);

    // 移動タイプ
    this._moveType = page.moveType ?? event.moveType ?? EMoveType.None;

    // 移動ルート
    const routeId = page.moveRouteId ?? event.moveRouteId ?? 0;
    this._adjustMoveRoute(routeId);

    // 移動可能範囲制限
    const moveRegionKey = page.moveRegionKey ?? event.moveRegionKey ?? '';
    this._setMoveRegion(moveRegionKey);

    // 移動速度
    const speed = page.speed ?? event.speed ?? 0;
    this.setMoveSpeed(speed ? 1 << (speed - 1) : gameMapSight.nextMapMoveSpeed);

    // ロックタイプ
    this._lockType = page.lockType ?? event.lockType ?? ELockType.HOLDING;
  }

  /**
   * 移動ルートを調整する
   * @param routeId
   * @returns
   */
  private _adjustMoveRoute(routeId: number) {
    const type = this._moveType - EMoveType.Custom;
    if (![0, 1].includes(type)) {
      return;
    }
    const moveRoute = GameUtils.getMoveRoute(type, routeId);
    if (!moveRoute) {
      // 固定に変更する
      this._moveType = EMoveType.None;
      return;
    }
    super._setMoveRoute(moveRoute);
    this._moveType = EMoveType.Custom;
  }

  /**
   * 範囲制限を設定する
   * @param moveRegionKey
   */
  private _setMoveRegion(moveRegionKey: string) {
    this._moveRegionKey = moveRegionKey;
    if (moveRegionKey !== '') {
      const moveRegion = gameMapSight.regions.get(moveRegionKey);
      if (moveRegion === undefined) {
        throw new Error('region undefined');
      }
    }
  }

  /**
   * 更新
   */
  update() {
    switch (this._updatePhase) {
      case EPersonUpdatePhase.Normal:
        this._updateNormal();
        break;
      case EPersonUpdatePhase.Nothing:
        this._updateNoting();
        break;
      case EPersonUpdatePhase.AfterMove:
        this._updateAfterMove();
        break;
    }
  }

  /**
   * 通常時の更新
   */
  private _updateNormal() {
    const lastMoving = this.isMoving();
    super.update();
    super._checkTriggerAuto();
    this.checkCurrent(lastMoving);
  }

  /**
   * 現在位置を確認する
   * @param lastMoving
   */
  checkCurrent(lastMoving: boolean) {
    // 移動完了した
    if (lastMoving && !this.isMoving()) {
      this._updateAfterMove();
    } else {
      if (gameTemp.changeRoom) {
        this._updatePhase = EPersonUpdatePhase.Nothing;
      }
    }
  }

  /**
   * 何もしない場合の更新
   */
  private _updateNoting() {
    if (!gameTemp.changeRoom) {
      this._updatePhase = EPersonUpdatePhase.Normal;
    }
  }

  /**
   * 移動後の更新
   */
  protected _updateAfterMove() {
    if (gameTemp.changeRoom) {
      this._updatePhase = EPersonUpdatePhase.AfterMove;
    } else {
      this._checkAfterMove();
      this._updatePhase = EPersonUpdatePhase.Normal;
    }
  }

  /**
   * 移動後の確認
   */
  protected _checkAfterMove() {
    this.checkTerrainHere();
  }

  /**
   * 停止中の更新
   */
  override updateStop() {
    super.updateStop();
    if (this.canMove()) {
      this._autoMove();
    }
  }

  /**
   * 自律移動ルート
   */
  private _autoMove() {
    if (this._checkStopping()) {
      return;
    }
    switch (this._moveType) {
      case EMoveType.Random:
        this._moveRandom();
        break;
      case EMoveType.Near:
        this._moveNear();
        break;
      case EMoveType.Custom:
        this._moveCustom();
        break;
    }
  }

  /**
   * 停止中か確認する
   * @returns
   */
  private _checkStopping() {
    return this._stopCount < this._currentStopThreshold;
  }

  /**
   * ランダム移動
   */
  private _moveRandom() {
    // 半分の確率で一回休みにするため乱数の範囲を倍にする
    const dir = Utils.randomInt(0, 8);
    if (dir <= EDirection.End && this._passable(this.x, this.y, dir)) {
      super.moveStraight(dir, true);
    }
  }

  /**
   * 近づく
   */
  private _moveNear() {
    // いまはなにもない
  }

  /**
   * カスタム
   * プレイヤーも対象にするのでCharacterの方に実装
   */
  private _moveCustom() {
    super._updateMoveRoute();
  }

  /**
   * 範囲外かどうか確認
   * @param x
   * @param y
   */
  protected _outRegion(x: number, y: number) {
    // 範囲外かどうか確認
    return (
      gameMapSight.regions.get(this._moveRegionKey)?.out(x, y) ??
      super._outRegion()
    );
  }

  /**
   * イベント中のロック
   * ロックタイプが向きを変えない以外はプレイヤーのほうに向く
   * @returns
   */
  override lock() {
    if (this._locked) {
      return;
    }

    this._preLockDirection =
      this._lockType === ELockType.ABOUT ? this.direction : -1;
    if (this._lockType !== ELockType.KEEP) {
      this._turnAwayTriggedDirection();
    }
    this._locked = true;
  }

  /**
   * イベント中のロックを解除
   * 向きなおり方向が入っている場合は向きなおす
   */
  override unlock() {
    if (!this._locked) {
      return;
    }
    this.changeDirection(this._preLockDirection);
    this._locked = false;
  }

  /**
   * トリガーとなったオブジェクトの方向を向く
   */
  private _turnAwayTriggedDirection() {
    const object = this._getTriggeredCharacter();
    if (object) {
      this.turnAwayCharacterDirection(object);
    }
  }

  /**
   * トリガーとなったキャラクターを取得する
   * @returns
   */
  private _getTriggeredCharacter(): GameCharacter | undefined {
    if (this.triggeredObjectId > 0) {
      return gameMapSight.findCharacter(this.triggeredObjectId);
    } else {
      return gameMarch.leader;
    }
  }
}
