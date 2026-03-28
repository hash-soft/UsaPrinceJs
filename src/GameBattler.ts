import {
  Skill,
  EStateRestriction,
  ActionEffect,
  Correct,
  Item,
  Battler,
  ActionConditionParam,
  EDecisionTiming,
  ActionCondition,
  EActionConditionType,
} from './DataTypes';
import { gameBattleTemp, intelligences, states, system } from './DataStore';
import { GameMaterial } from './GameMaterial';
import { GameItem } from './GameItem';
import { GameUnit } from './GameUnit';
import {
  GameRate,
  GameNumberList,
  GameNumberMap,
  GameUtils,
  EErrorMessage,
} from './GameUtils';
import Utils from './Utils';

// 戦闘で必要な基本パラメータ
// ・最大HP
// ・最大MP
// ・攻撃力
// ・守備力
// ・すばやさ
// ・かしこさ
// ・うんのよさ

export const enum EBaseParamId {
  MaxHp,
  MaxMp,
  Atk,
  Agi,
  Def,
  Wiz,
  Luk,
}

// 戦闘で必要なサブパラメータ
// 会心率
// 回比率
// 命中率
export const enum EBaseSubParamId {
  Critical,
  Evasion,
  Hit,
}

/**
 * 戦闘不能オプション
 */
export interface LostBattleOptions {
  expRateId?: number;
  goldRateId?: number;
  itemRateId?: number;
  leave?: boolean;
}

/**
 * 1体の報酬
 */
export interface RewordForOne {
  exp: number;
  gold: number;
  itemId: number;
}

/**
 * バトラークラスのセーブオブジェクト
 */
export interface SaveObjectGameBattler {
  name: string;
  hp: number;
  mp: number;
  lv: number;
  baseParams: number[];
  baseSubParams: number[];
  stateIds: number[];
}

/**
 * 戦闘者Id構築値
 * index > 6bit 64 0x3F
 * group > 3bit 8 0x1C0 >> 6
 * myself > 1bit 2 0x200
 */
const enum EBattlerId {
  IndexMask = 0x3f,
  GroupMask = 0x1c0,
  MyselfMask = 0x200,
  GroupShift = 6,
  MyselfShift = 9,
}

/**
 * 固定データは継承先に持つ
 * インターフェース的な役割
 */
export abstract class GameBattler extends GameMaterial {
  /**
   * 検索のためのインデックス
   */
  private _index: number = 0;
  /**
   * 名前
   */
  private _name: string = '';
  /**
   * レベル
   */
  private _lv: number = 1;
  /**
   * 現在hp
   */
  private _hp: number = 1;
  /**
   * 現在mp
   */
  private _mp: number = 0;
  /**
   * 基本パラメータ
   * 設定データに基づいた値
   */
  private _baseParams: number[] = [1, 0, 0, 0, 0, 0, 0];
  /**
   * 基本サブパラメータ
   */
  private _baseSubParams: number[] = [0, 0, 256];
  /**
   * かかっている状態Id
   */
  private _stateIds: number[] = [];
  /**
   * ターン状態情報
   */
  private _turnStateInfos: Map<number, number[]> = new Map();
  /**
   * バフパラメータ配列
   */
  private _buffParams: number[] = [0, 0, 0, 0, 0, 0, 0];
  /**
   * バフターン配列
   */
  private _buffTurns: number[] = [0, 0, 0, 0, 0, 0, 0];
  /**
   * 状態回復参照ターンインデックス
   * 配列要素数を初期設定とし
   * ターン経過ごとに減算される
   * 回復率は 配列要素数 - 値 を参照インデックスとする
   * インデックスが参照を超えた場合は配列最後の要素を参照する
   */
  private _stateTurns: Map<number, number> = new Map();
  /**
   * 状態上書きId
   * _stateTurnsで上書きされるOverId
   */
  private _stateOvers: Map<number, number> = new Map();
  /**
   * 表示オフ要求
   */
  private _dispOff: boolean = false;
  /**
   * 逃げたとか飛ばしたとかで去った
   * 復活不可
   */
  private _leave: boolean = false;
  /**
   * 行動回数
   */
  private _actionTimes: number = 0;
  /**
   * 行動速度
   */
  private _actionSpeed: number = 0;
  /**
   * 現在指している行動パターンインデックス
   */
  private _currentPattern: number = 0;
  /**
   * 不可行動の気づいているか
   * 理由はなんでもよくてとにかく使用できないことに気づいたかどうか
   */
  private _inactionNotice: boolean = false;
  /**
   * 強制実行スキルId
   */
  private _forceSkillId: number = 0;

  /**
   * Idを作成する
   * @param myself
   * @param group
   * @param index
   * @returns
   */
  protected static _makeId(myself: boolean, group: number, index: number) {
    return (
      ((myself ? 0 : 1) << EBattlerId.MyselfShift) |
      (group << EBattlerId.GroupShift) |
      index
    );
  }

  /**
   * 敵か味方かに変換する
   * @param id
   * @returns
   */
  static toMyself(id: number) {
    return !(id & EBattlerId.MyselfMask);
  }

  /**
   * グループインデックスに変化する
   * @param id
   * @returns
   */
  static toGroup(id: number) {
    return (id & EBattlerId.GroupMask) >> EBattlerId.GroupShift;
  }

  /**
   * インデックスに変換する
   * @param id
   * @returns
   */
  static toIndex(id: number) {
    return id & EBattlerId.IndexMask;
  }

  /**
   * コンストラクタ
   */
  constructor() {
    super();
  }

  /**
   * コンストラクタのオプションデータのインデックス
   * @returns
   */
  protected _getOptionsIndex() {
    return -1;
  }

  /**
   * クリア
   */
  protected _clear() {
    this._name = '';
    this._lv = 1;
    this._hp = 1;
    this._mp = 0;
    this._baseParams = [1, 0, 0, 0, 0, 0, 0];
    this._baseSubParams = [0, 0, 256];
    this._stateIds = [];
    this._clearBuffParams();
    this._index = 0;
    this._turnStateInfos = new Map();
    this._dispOff = false;
    this._leave = false;
    this._actionTimes = 0;
    this._actionSpeed = 0;
    this._stateTurns = new Map();
    this._stateOvers = new Map();
    this._currentPattern = 0;
    this._inactionNotice = false;
    this._forceSkillId = 0;
  }

  /**
   * データから読み込み
   * @param data
   */
  load(...args): void;
  load(data: SaveObjectGameBattler) {
    this._name = data.name ?? this._name;
    this._lv = data.lv ?? this._lv;
    this._hp = data.hp ?? this._hp;
    this._mp = data.mp ?? this._mp;
    this._baseParams = data.baseParams ?? this._baseParams;
    this._baseSubParams = data.baseSubParams ?? this._baseSubParams;
    this._stateIds = data.stateIds ?? this._stateIds;
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  createSaveObject(): SaveObjectGameBattler {
    return {
      name: this._name,
      hp: this._hp,
      mp: this._mp,
      lv: this._lv,
      baseParams: this._baseParams,
      baseSubParams: this._baseSubParams,
      stateIds: this._stateIds,
    };
  }

  /**
   * 基本パラメータを設定する
   * @param value
   */
  protected _setBaseParams(value: number[]) {
    this._baseParams = value;
  }

  /**
   * 基本パラメータを取得する
   * @returns
   */
  protected _getBaseParams() {
    return this._baseParams;
  }

  /**
   * 基本サブパラメータを設定する
   * @param value
   */
  protected _setBaseSubParams(value: number[]) {
    this._baseSubParams = value;
  }

  /**
   * 基本サブパラメータを取得する
   * @returns
   */
  protected _getBaseSubParams() {
    return this._baseSubParams;
  }

  /**
   * インデックスを設定する
   * @param value
   */
  setIndex(value: number) {
    this._index = value;
  }

  /**
   * インデックスを取得する
   */
  get index() {
    return this._index;
  }

  /**
   * オブジェクトを取得する
   */
  protected abstract get _battler(): Battler;

  /**
   * Idを取得する
   */
  abstract get id(): number;

  /**
   * データIdを取得する
   */
  abstract get dataId(): number;

  /**
   * グループIdを取得する
   */
  get groupId() {
    return 0;
  }

  /**
   * 種族Idを取得する
   */
  get raceId() {
    return this._battler.raceId;
  }

  /**
   * 知能Idを取得する
   */
  get intelligenceId() {
    return this._battler.intelligenceId;
  }

  /**
   * 知能を取得する
   */
  get intelligence() {
    return intelligences[this._battler.intelligenceId];
  }

  /**
   * 行動前決定かどうかを取得する
   */
  get decideBeforeAction() {
    return this.intelligence.timing === EDecisionTiming.BeforeAction;
  }

  /**
   * アニメーション対象を取得する
   */
  get animationTarget(): GameMaterial {
    return this;
  }

  /**
   * 敵軍を取得する
   */
  abstract get opponent(): GameUnit;

  /**
   * 自軍を取得する
   */
  abstract get selfUnit(): GameUnit;

  /**
   * 所持道具を取得する
   */
  getItem(index: number): GameItem;
  getItem(): GameItem {
    throw new Error(EErrorMessage.ProgramError);
  }

  /**
   * 所持道具を消費する
   * @param item
   */
  abstract consumeItem(item: GameItem);

  /**
   * 移動中スキルを取得する
   */
  abstract getSkill(index: number): Skill;

  /**
   * 戦闘中のスキルを取得する
   * @param index
   */
  abstract getBattleSkill(index: number): Skill;

  /**
   * 名前を設定
   * @param value
   */
  setName(value: string) {
    this._name = value;
  }

  /**
   * 名前を取得
   */
  get name() {
    return this._name;
  }

  /**
   * グループ名を取得する
   * 標準は名前と同じ
   */
  get gname() {
    return this._name;
  }

  /**
   * レベルを設定する
   * @param value
   */
  setLv(value: number) {
    this._lv = value;
  }

  /**
   * レベルを取得する
   */
  get lv() {
    return this._lv;
  }

  /**
   * パターンリストIdを取得する
   */
  get patternListId() {
    return 0;
  }

  /**
   * 現在のパターンを設定する
   * @param value
   */
  setCurrentPattern(value: number) {
    this._currentPattern = value;
  }

  /**
   * 現在のパターン
   */
  get currentPattern() {
    return this._currentPattern;
  }

  /**
   * 効果に影響するパラメータ
   * @param id
   */
  param(id: number) {
    // 固定パラメータに一時効果をかける
    const value = this.fixedParam(id) + this._buffParam(id);
    return this.limitParam(id, value);
  }

  /**
   * 限界値補正をする
   * @param id
   * @param value
   * @returns
   */
  limitParam(id: number, value: number) {
    const max = this.maxParam(id);
    const min = this.minParam(id);
    return Utils.clamp(value, min, max);
  }

  /**
   * 効果に影響するサブパラメータ
   */
  subParam(id: number) {
    // 固定サブパラメータに一時効果を適用する
    const value = GameRate.multiDiv(
      this._subParamRateIds(id),
      this.fixedSubParam(id)
    );
    return this._limitSubParam(id, value);
  }

  /**
   * サブパラメータ限界値補正をする
   * @param id
   * @param value
   * @returns
   */
  private _limitSubParam(id: number, value: number) {
    const max = 999;
    const min = 0;
    return Utils.clamp(value, min, max);
  }

  /**
   * 保持中のサブパラメータの割合Idを取得する
   * @returns
   */
  protected _subParamRateIds(id: number) {
    return this.states.reduce((rateIds: number[], current) => {
      if (current.subParamId > 0) {
        const numbers = GameNumberList.get(current.subParamId);
        const values = GameNumberMap.filterForList(numbers, id);
        rateIds.push(...values);
      }
      return rateIds;
    }, []);
  }

  /**
   * 基準になるパラメータを取得
   * @param id
   */
  protected _baseParam(id: number) {
    return this._baseParams[id];
  }

  /**
   * 固定パラメータを取得
   * @param id
   */
  fixedParam(id: number) {
    return this._baseParam(id);
  }

  /**
   * バフパラメータを取得する
   * @param id
   * @returns
   */
  private _buffParam(id) {
    return this._buffParams[id];
  }

  /**
   * 基準になるサブパラメータを取得
   * @param id
   * @returns
   */
  protected _baseSubParam(id: number) {
    return this._baseSubParams[id];
  }

  /**
   * 固定サブパラメータを取得
   * @param id
   * @returns
   */
  fixedSubParam(id: number) {
    return this._baseSubParams[id];
  }

  /**
   * バフパラメーターをクリア
   */
  private _clearBuffParams() {
    this._buffParams = [0, 0, 0, 0, 0, 0, 0];
    this._buffTurns = [0, 0, 0, 0, 0, 0, 0];
  }

  /**
   * 指定パラメータの最大値
   * @param id
   * @returns
   */
  maxParam(id: number): number;
  maxParam() {
    return 999;
  }

  /**
   * 指定パラメータの最小値
   * @param id
   * @returns
   */
  minParam(id: number) {
    return id === EBaseParamId.MaxHp ? 1 : 0;
  }

  /**
   * 最大HPを取得
   */
  get mhp() {
    return this.param(EBaseParamId.MaxHp);
  }

  /**
   * 最大MPを取得
   */
  get mmp() {
    return this.param(EBaseParamId.MaxMp);
  }

  /**
   * HPを取得
   */
  get hp() {
    return this._hp;
  }

  /**
   * MPを取得
   */
  get mp() {
    return this._mp;
  }

  /**
   * 攻撃力を取得
   */
  get atk() {
    return this.param(EBaseParamId.Atk);
  }

  /**
   * 素早さを取得
   */
  get agi() {
    return this.param(EBaseParamId.Agi);
  }

  /**
   * 守備力を取得
   */
  get def() {
    return this.param(EBaseParamId.Def);
  }

  /**
   * 賢さを取得
   */
  get wiz() {
    return this.param(EBaseParamId.Wiz);
  }

  /**
   * 運を取得
   */
  get luk() {
    return this.param(EBaseParamId.Luk);
  }

  /**
   * 会心値を取得
   */
  get critical() {
    return this.subParam(EBaseSubParamId.Critical);
  }

  /**
   * 回比値を取得
   */
  get evasion() {
    return this.subParam(EBaseSubParamId.Evasion);
  }

  /**
   * 命中値を取得
   */
  get hit() {
    return this.subParam(EBaseSubParamId.Hit);
  }

  /**
   * 行動速度を取得する
   */
  get actionSpeed() {
    return this._actionSpeed;
  }

  /**
   * 生きているか
   */
  get live() {
    return !this.hasStateType(this.downStateTypeId) && this.exist;
  }

  /**
   * 倒れているか
   */
  get down() {
    return this.hasStateType(this.downStateTypeId) && this.exist;
  }

  /**
   * HP0になったときに付加する状態
   */
  get downStateId() {
    return 1;
  }

  /**
   * ばたんの状態タイプId
   */
  get downStateTypeId() {
    return 1;
  }

  /**
   * かかっている状態を取得
   */
  get states() {
    return this._stateIds.map((id) => states[id]);
  }

  /**
   * かかっているターン状態を取得
   */
  get turnStates() {
    return [...this._turnStateInfos.values()]
      .flat()
      .map((value) => states[value]);
  }

  /**
   * 戦闘中の状態を取得
   * 基本に加え、ターン状態、装備を考慮
   */
  get battleStates() {
    return [...this.turnStates, ...this.states];
  }

  /**
   * コマンド入力可能か
   */
  get input() {
    return false;
  }

  /**
   * 行動可能か
   * 行動不可を一つでも持っていれば不可
   */
  get actionable() {
    return !this.incapable && this.exist;
  }

  /**
   * 行動不能か
   */
  get incapable() {
    return this.states.some(
      (state) => state.restriction === EStateRestriction.Incapable
    );
  }

  /**
   * 混乱しているかどうか
   */
  get confused() {
    return this.states.some(
      (state) => state.restriction === EStateRestriction.Confuse
    );
  }

  /**
   * 自動行動かどうか
   */
  get auto() {
    return this.states.some(
      (state) => state.restriction === EStateRestriction.Auto
    );
  }

  /**
   * 動けるかどうか
   */
  get movable() {
    return this.states.every(
      (state) => state.restriction < EStateRestriction.Confuse
    );
  }

  /**
   * 行動制約があるかどうか
   */
  get restriction() {
    return this.states.some(
      (state) => state.restriction !== EStateRestriction.None
    );
  }

  /**
   * 行動不能状態を取得する
   * 複数ある場合は優先度高を取得する
   * @returns
   */
  getIncapableState() {
    return this._getActionLimitState(EStateRestriction.Incapable);
  }

  /**
   * 混乱状態を取得する
   * 複数ある場合は優先度高を取得する
   * @returns
   */
  getConfuseState() {
    return this._getActionLimitState(EStateRestriction.Confuse);
  }

  /**
   * 指定の行動制約状態を取得する
   * 複数ある場合は優先度高を取得する
   * @param limit
   * @returns
   */
  private _getActionLimitState(limit: EStateRestriction) {
    const result = this.states.reduce(
      (result, state) => {
        if (state.restriction === limit && state.priority > result.id) {
          result.id = state.id;
          result.priority = state.priority;
        }
        return result;
      },
      { id: 0, priority: 0 }
    );
    return GameUtils.getState(result.id);
  }

  /**
   * 制約なし状態を取得する
   * @returns
   */
  getNoRestrictionStates() {
    return this.states.filter(
      (state) => state.restriction === EStateRestriction.None
    );
  }

  /**
   * 行動タイプの反射率を取得する
   * @param type
   * @returns
   */
  getReflectionRateIds(type: number) {
    return this._reflectionRateIds(type);
  }

  /**
   * 保持中の反射の割合Idを取得する
   * @returns
   */
  protected _reflectionRateIds(id: number) {
    return this.states.reduce((rateIds: number[], current) => {
      if (current.reflectionId > 0) {
        const numbers = GameNumberList.get(current.reflectionId);
        const values = GameNumberMap.filterForList(numbers, id);
        rateIds.push(...values);
      }
      return rateIds;
    }, []);
  }

  /**
   * プレイヤー側かどうか
   */
  abstract get myself(): boolean;

  /**
   * 去ったかどうかを設定する
   * @param value
   */
  setLeave(value: boolean) {
    this._leave = value;
  }

  /**
   * 去ったかどうかを取得する
   */
  get leave() {
    return this._leave;
  }

  /**
   * いるかどうかを確認する
   */
  get exist() {
    return !this._leave;
  }

  /**
   * 非表示予約
   */
  reserveDispOff() {
    this._dispOff = true;
  }

  /**
   * 非表示予約をクリア
   */
  clearDispOff() {
    this._dispOff = false;
  }

  /**
   * 表示OFF要求を取得する
   */
  get dispOff() {
    return this._dispOff;
  }

  /**
   * HPが警告状態かどうか
   */
  get hpWarn() {
    return this.hp <= Math.ceil(this.mhp / 2);
  }

  /**
   * HPが危険状態かどうか
   */
  get hpDanger() {
    return this.hp <= Math.ceil(this.mhp / 4);
  }

  /**
   * HP消耗度を取得する
   * @returns
   */
  consumeHpDegree() {
    const mhp = this.mhp;
    return (mhp - this.hp) / mhp;
  }

  /**
   * 成長可能パラメータかどうか
   * @param paramId
   * @returns
   */
  enableGrowthParam(paramId: number) {
    return paramId >= EBaseParamId.MaxHp && paramId <= EBaseParamId.Luk;
  }

  /**
   * 行動回数を取得
   */
  get actionTimes() {
    return this._actionTimes;
  }

  /**
   * 再構築
   */
  refresh() {
    // パラメータにより状態を設定する
    if (this.hp === 0) {
      this.addState(this.downStateId, 0);
    } else {
      //this.recoverState(this.downStateId);
    }
  }

  /**
   * HPを設定する
   * 0～最大HPで補正
   * @param hp
   */
  setHp(hp: number) {
    const oldHp = this._hp;
    this._hp = Utils.clamp(hp, 0, this.mhp);
    this.refresh();
    // 変化した値を返す
    return this._hp - oldHp;
  }

  /**
   * MPを設定する
   * @param mp
   * @returns
   */
  setMp(mp: number) {
    const oldMp = this._mp;
    this._mp = Utils.clamp(mp, 0, this.mmp);
    // 変化した値を返す
    return this._mp - oldMp;
  }

  /**
   * 全回復
   */
  recoverAll() {
    this.recoverHp(this.mhp);
    this.recoverMp(this.mmp);
  }

  /**
   * 指定回復
   * @param hpRate HP回復率
   * @param mpRate MP回復率
   * @param beginState 回復開始状態Id
   * @param endState 回復終了状態Id
   */
  recover(
    hpRate: number,
    mpRate: number,
    beginState: number,
    endState: number
  ) {
    this.recoverStateFromPriority(beginState, endState);
    if (this.live) {
      this.recoverHp(this.mhp * hpRate);
      this.recoverMp(this.mmp * mpRate);
    }
  }

  /**
   * HPを変更する
   * HP以外に影響を与えない
   * @param value
   */
  protected _changeHp(value: number) {
    this._hp = Utils.clamp(value, 0, this.mhp);
  }

  /**
   * HPを回復
   * @param value
   */
  recoverHp(value: number) {
    return this.setHp(this.hp + value);
  }

  /**
   * HPを加算する
   * マイナスならダメージになる
   * @param value
   */
  gainHp(value: number) {
    return this.setHp(this.hp + value);
  }

  /**
   * MPを回復する
   * @param value
   * @returns
   */
  recoverMp(value: number) {
    return this.setMp(this.mp + value);
  }

  /**
   * MPを加算する
   * マイナスなら減少する
   * @param value
   * @returns
   */
  gainMp(value: number) {
    return this.setMp(this.mp + value);
  }

  /**
   * MPを消費させる
   * @param value
   * @returns
   */
  consumeMp(value: number) {
    // valueに補正をかける、がいまはそのまま
    return this.gainMp(-value);
  }

  /**
   * MP無限かどうかを確認する
   * @returns
   */
  infiniteMp() {
    return this._baseParam(EBaseParamId.MaxMp) < 0;
  }

  /**
   * 封印されている行動タイプを確認する
   * @param actionTypeId
   */
  checkSeal(actionTypeId: number) {
    const sealIds = this.states
      .filter((state) => state.sealId > 0)
      .map((state) => state.sealId);
    const sealTypeIds = GameNumberList.union(sealIds);
    return sealTypeIds.includes(actionTypeId);
  }

  /**
   * バフパラメータを加算する
   * @param id
   * @param value
   * @returns
   */
  addBuffParam(id: number, value: number, turn: number) {
    const diffParam = this.buffMeanValue(id, value);
    this._buffParams[id] += diffParam;
    if (this._buffParams[id] === 0) {
      // バフによって元に戻った場合
      this.removeBuffParam(id);
    } else if (diffParam !== 0) {
      // 変化があった場合
      this._resetBuffCounts(id, turn);
    }
    return diffParam;
  }

  /**
   * バフ実効値を取得する
   * @param id
   * @param value
   * @returns
   */
  buffMeanValue(id: number, value: number) {
    const oldParam = this.param(id);
    if (oldParam < 0) {
      return 0;
    }
    const newParam = Utils.clamp(
      oldParam + value,
      this.minParam(id),
      this.maxParam(id)
    );
    return newParam - oldParam;
  }

  /**
   * バフのカウントをリセットする
   * @param id
   */
  protected _resetBuffCounts(id: number, turn: number) {
    this._buffTurns[id] = turn;
  }

  /**
   * バフのカウントを更新する
   */
  protected _updateBuffCounts() {
    for (let i = 0; i < this._buffTurns.length; i++) {
      if (this._buffTurns[i] > 0) {
        this._buffTurns[i]--;
      }
    }
  }

  /**
   * バフ効果を消去する
   * @param id
   */
  removeBuffParam(id: number) {
    this._buffParams[id] = 0;
    this._buffTurns[id] = 0;
  }

  /**
   * 複数のバフ効果を消去する
   * @param ids
   */
  removeBuffParams(ids: number[]) {
    for (const id of ids) {
      this.removeBuffParam(id);
    }
  }

  /**
   * バフ中の効果をカウントする
   * @param ids
   * @returns
   */
  countBuffed(ids?: number[]) {
    if (ids) {
      return ids.reduce((count, id) => {
        return this._buffParam(id) > 0 ? count + 1 : count;
      }, 0);
    } else {
      return this._buffParams.reduce((count, value) => {
        return value > 0 ? count + 1 : count;
      }, 0);
    }
  }

  /**
   * バフ効果無限
   * @param id
   * @returns
   */
  protected _buffInfinite(id: number) {
    return this._buffTurns[id] < 0;
  }

  /**
   * バフ効果期限切れ
   * @param id
   * @returns
   */
  protected _buffExpired(id: number) {
    return this._buffParam(id) !== 0 && this._buffTurns[id] === 0;
  }

  /**
   * バフ効果を全消去
   */
  removeAllBuffParams() {
    this._clearBuffParams();
  }

  /**
   * ドーピングパラメータを加算する
   * @param id
   * @param value
   * @returns
   */
  addPlusParam(id: number, value: number): number;
  addPlusParam() {
    return 0;
  }

  /**
   * 状態追加
   * @param stateId
   */
  addState(stateId: number, overId: number) {
    if (this._stateIds.includes(stateId)) {
      const state = states[stateId];
      if (state.updatable) {
        this._resetStateCounts(stateId, overId);
        return true;
      }
      return false;
    }
    this._removeLowState(stateId);
    this._resetStateCounts(stateId, overId);
    this._stateIds.push(stateId);
    const stateTypeId = GameUtils.getState(stateId).type;
    if (stateTypeId === this.downStateTypeId) {
      this._down();
    }
    return true;
  }

  /**
   * たおれた
   */
  private _down() {
    this._clearBuffParams();
    this._hp = 0;
  }

  /**
   * 下位の状態を削除
   * @param stateId
   */
  private _removeLowState(stateId: number) {
    const state = states[stateId];
    this.recoverStateFromPriority(state.beginPriority, state.endPriority);
  }

  /**
   * 状態のカウントをリセットする
   * @param stateId
   */
  protected _resetStateCounts(stateId: number, overId: number) {
    const removeRateIds = GameUtils.getRemoveRateIds(stateId, overId);
    if (!removeRateIds?.length) {
      // ターン回復が設定されていなければなにもしない
      return;
    }
    this._stateTurns.set(stateId, removeRateIds.length);
    if (overId) {
      this._stateOvers.set(stateId, overId);
    }
  }

  /**
   * 状態カウントを削除する
   * @param stateId
   */
  protected _deleteStateCounts(stateId: number) {
    this._stateTurns.delete(stateId);
    this._stateOvers.delete(stateId);
  }

  /**
   * 状態のカウントを更新する
   */
  protected _updateStateCounts() {
    for (const [key, value] of this._stateTurns) {
      if (value > 0) {
        this._stateTurns.set(key, value - 1);
      }
    }
  }

  /**
   * 状態解除率Idを取得する
   * @param stateId
   * @returns
   */
  protected _getRemoveStateRateId(stateId: number) {
    const count = this._stateTurns.get(stateId);
    if (count === undefined) {
      return 0;
    }
    const overId = this._stateOvers.get(stateId) ?? 0;
    const removeRateIds = GameUtils.getRemoveRateIds(stateId, overId);
    const index = removeRateIds.length - count;
    return index < removeRateIds.length
      ? removeRateIds[index]
      : (Utils.lastElement(removeRateIds) ?? 0);
  }

  /**
   * 状態回復
   * @param stateId
   */
  recoverState(stateId: number) {
    const index = this._stateIds.findIndex((value) => value === stateId);
    if (index < 0) {
      return false;
    }
    //this._clearStateCount(stateId);
    this._stateIds.splice(index, 1);
    this._deleteStateCounts(stateId);

    return true;
  }

  /**
   * 指定優先度の状態を回復する
   * @param begin
   * @param end
   */
  recoverStateFromPriority(begin: number, end: number) {
    for (const stateId of this._stateIds) {
      const state = states[stateId];
      if (state.priority >= begin && state.priority <= end) {
        this.recoverState(stateId);
      }
    }
  }

  /**
   * 指定優先度の状態にかかっている数をカウントする
   * @param begin
   * @param end
   */
  countStateFromPriority(begin: number, end: number) {
    return this._stateIds.reduce((count, stateId) => {
      const state = states[stateId];
      return state.priority >= begin && state.priority <= end
        ? count + 1
        : count;
    }, 0);
  }

  /**
   * 状態がついているか
   */
  protected _hasStates() {
    return this._stateIds.length !== 0;
  }

  /**
   * すでに指定の状態になっているか
   * @param stateId
   * @returns
   */
  stateAlready(stateId: number) {
    return this._stateIds.indexOf(stateId) >= 0;
  }

  /**
   * 指定の状態が除去可能か
   * @param stateId
   * @returns
   */
  stateRemoval(stateId: number) {
    return this._stateIds.indexOf(stateId) >= 0;
  }

  /**
   * 指定の状態タイプがついているか
   * @param stateType
   */
  hasStateType(stateTypeId: number) {
    return this.states.some((state) => state.type === stateTypeId);
  }

  /**
   * 倒れ表示がついているか
   */
  hasDownVisual() {
    return this.states.some((state) => state.visual === 1);
  }

  /**
   * ターン中効果を設定する
   * @param effects
   */
  setTurnStates(battlerId: number, effects: ActionEffect[]) {
    const values = effects.map((effects) => effects.refId);
    this._turnStateInfos.set(battlerId, values);
  }

  /**
   * 行動開始時の処理
   */
  actionStart() {
    this._updateBuffCounts();
    this._updateStateCounts();
  }

  /**
   * 行動終了時の処理
   */
  actionEnd() {
    //
  }

  /**
   * 自動バフ回復
   * @returns 回復したパラメータid
   */
  removeBuffAuto() {
    const removeBuffIds: number[] = [];
    for (let i = 0; i < this._buffParams.length; i++) {
      if (this._buffInfinite(i)) {
        continue;
      }
      if (this._buffExpired(i)) {
        this.removeBuffParam(i);
        removeBuffIds.push(i);
      }
    }
    return removeBuffIds;
  }

  /**
   * 状態自動回復
   * @returns 回復した状態Id
   */
  removeStatesAuto(timing: number) {
    const removeStateIds: number[] = [];
    for (const stateId of this._stateTurns.keys()) {
      if (GameUtils.getState(stateId).removeTiming !== timing) {
        continue;
      }
      const rateId = this._getRemoveStateRateId(stateId);
      if (GameRate.judge(rateId)) {
        removeStateIds.push(stateId);
      }
    }
    for (const stateId of removeStateIds) {
      this.recoverState(stateId);
    }
    return removeStateIds;
  }

  targetEnd() {
    //
  }

  /**
   * ターン終了時の処理
   */
  turnEnd() {
    // ターン効果を解除する
    this.removeAllTurnStates();
    // 自動回復処理を入れる
  }

  /**
   * 戦闘終了時の処理
   */
  battleEnd() {
    // ターン効果とバフを解除する
    this.removeAllTurnStates();
    this.removeAllBuffParams();
    this.removeBattleEndState();
  }

  /**
   * ターン状態をバトラーIdで削除する
   * @param id
   */
  removeTurnStatesByBattlerId(id: number) {
    this._turnStateInfos.delete(id);
  }

  /**
   * ターン状態を消去
   */
  removeAllTurnStates() {
    this._turnStateInfos.clear();
  }

  /**
   * 戦闘終了後の状態を除去
   */
  removeBattleEndState() {
    const removeState = this.states.filter((state) => state.removeBattleEnd);
    for (const state of removeState) {
      this.recoverState(state.id);
    }
  }

  /**
   * 指定属性のダメージ軽減値Idを取得する
   * @param elementId
   * @returns
   */
  getElementDamageCutFigures(elementId: number): number[];
  getElementDamageCutFigures(): number[] {
    return [];
  }

  /**
   * 攻撃時のHPダメージ補正を取得する
   * @param actionType
   * @param enable
   * @param addFigureId
   * @param target
   * @returns
   */
  getAtkHpCorrectFigures(
    actionType: number,
    enable: boolean,
    addFigureId: number,
    target: GameBattler
  ) {
    const specialId = this.getWeaponSpecialId();
    const spCorrectId = target.findSpecialCorrectId(specialId);
    const corrects = this._getCorrectHpDamage();
    if (spCorrectId > 0) {
      corrects.push(system.corrects[spCorrectId]);
    }
    const addCorrectId = this.addCorrectId();
    if (addCorrectId > 0) {
      corrects.push(system.corrects[addCorrectId]);
    }
    const filterCorrects = this._filterHpCorrects(
      corrects,
      actionType,
      true,
      enable
    );
    const figures = filterCorrects.map((correct) => correct.figureId);
    if (addFigureId > 0) {
      figures.push(addFigureId);
    }
    return figures;
  }

  /**
   * 守備時のHPダメージ補正を取得する
   * @param actionType
   * @param enable
   * @returns
   */
  getDefHpCorrectFigures(actionType: number, enable: boolean) {
    const corrects = this._getCorrectHpDamage();
    return this._filterHpCorrects(corrects, actionType, false, enable).map(
      (value) => value.figureId
    );
  }

  /**
   * HPダメージ補正を取得するをフィルターする
   * @param corrects
   * @param actionType
   * @param attack
   * @param enable
   * @returns
   */
  private _filterHpCorrects(
    corrects: Correct[],
    actionType: number,
    attack: boolean,
    enable: boolean
  ) {
    return corrects.filter((correct) => {
      if (correct.attack !== attack || (correct.conditional && !enable)) {
        return false;
      }
      if (correct.actionTypes === 0) {
        return true;
      }
      const actionTypes = GameNumberList.get(correct.actionTypes);
      return actionTypes.includes(actionType);
    });
  }

  /**
   * 値を適用する
   * 固定値＞割合の2段階処理をする
   * @param value
   * @param figureIds
   * @returns
   */
  applyFigures(value: number, figureIds: number[]) {
    let newValue = value;
    for (let i = 0; i < figureIds.length; i++) {
      const figure = this.actionFigure(figureIds[i]);
      newValue += Utils.randomInt(figure.min, figure.max + 1);
    }
    for (let i = 0; i < figureIds.length; i++) {
      const figure = this.actionFigure(figureIds[i]);
      newValue = GameRate.div(figure.rate, newValue, newValue);
    }
    return Math.max(0, newValue);
  }

  /**
   * 武器の特攻Idを取得する
   * @returns
   */
  getWeaponSpecialId() {
    return 0;
  }

  /**
   * 特攻補正Idを検索する
   * @param specialId
   * @returns
   */
  findSpecialCorrectId(specialId: number) {
    if (!specialId) {
      return 0;
    }
    const list = GameNumberList.get(specialId);
    const value = GameNumberMap.findForList(list, this.raceId);
    return value ?? 0;
  }

  /**
   * 追加補正Idを取得する
   * @returns
   */
  addCorrectId() {
    return 0;
  }

  /**
   * HPダメージ補正を取得する
   * @returns
   */
  private _getCorrectHpDamage() {
    return this.battleStates
      .filter((state) => state.correctId)
      .map((state) => system.corrects[state.correctId]);
  }

  /**
   * 行動数値データを取得
   * @param id
   * @returns
   */
  abstract actionFigure(id: number): { min: number; max: number; rate: number };

  /**
   * 基本パラメータを増減する
   * @param id
   * @value value
   */
  gainBaseParam(id: number, value: number) {
    this.changeBaseParam(id, this._baseParam(id) + value);
  }

  /**
   * 基本パラメータを変化させる
   * @param id
   * @value value
   */
  changeBaseParam(id: number, value: number) {
    this._baseParams[id] = Utils.clamp(value, 0, 500);
  }

  /**
   * 基本サブパラメータを増減する
   * @param id
   * @param value
   */
  gainBaseSubParam(id: number, value: number) {
    this.changeBaseSubParam(id, this._baseSubParam(id) + value);
  }

  /**
   * 基本サブパラメータを変化させる
   * @param id
   * @param value
   */
  changeBaseSubParam(id: number, value: number) {
    this._baseSubParams[id] = Utils.clamp(value, 0, 512);
  }

  /**
   * 行動回数を作成
   */
  makeActionTimes() {
    // デフォルトは一回
    return 1;
  }

  /**
   * 行動回数を設定
   * @param value
   */
  setActionTimes(value: number) {
    this._actionTimes = value;
  }

  /**
   * 行動回数を算出する
   * @param min
   * @param max
   * @param rateId
   * @returns
   */
  protected _calcActionTimes(min: number, max: number, rateId: number) {
    if (rateId) {
      let add = 0;
      for (let i = min; i < max; i++) {
        if (GameRate.judge(rateId)) {
          add++;
        }
      }
      return min + add;
    } else {
      return Utils.randomInt(min, max + 1);
    }
  }

  /**
   * 行動速度を作成
   * 基本を素早さ*2+10とする
   * 1/4を最小とし、補正値を加え最小と最大のランダム値で行動順を決定する
   * @param value 補正値
   * @param pos 補正位置
   */
  makeActionSpeed(value: number, pos: number) {
    const age2 = (this.agi + value) * 2 + 10;
    const ageMin = Math.floor(age2 * 0.25);
    const min = ageMin + pos * 2;
    const max = pos * 2 + age2 + 1;
    this._actionSpeed = Utils.randomInt(min, max);
  }

  /**
   * 戦闘不能処理
   * @param options
   */
  lostBattle(options?: LostBattleOptions): void;
  lostBattle() {
    //
  }

  /**
   * 不可行動の気づいているかを設定する
   * @param value
   */
  setInactionNotice(value: boolean) {
    this._inactionNotice = value;
  }

  /**
   * 不可行動の気づいているかを取得する
   */
  get inactionNotice() {
    return this._inactionNotice;
  }

  /**
   * 強制実行スキルIdを設定する
   * @param value
   */
  setForceSkillId(value: number) {
    this._forceSkillId = value;
  }

  /**
   * 強制実行スキルIdを取得する
   */
  get forceSkillId() {
    return this._forceSkillId;
  }

  /**
   * 混乱時の行動パターンを取得する
   * @returns
   */
  confusePatternId() {
    const [mapId] = this._confuseAction();
    const confuseInfo = GameNumberMap.get(mapId);
    if (confuseInfo.key <= 0) {
      // 通常パターン
      return this.patternListId;
    } else {
      if (GameRate.judge(confuseInfo.value)) {
        // 混乱パターン
        return confuseInfo.key;
      } else {
        // 通常パターン
        return this.patternListId;
      }
    }
  }

  /**
   * 混乱時に対象を反転する割合Idを取得する
   * @returns
   */
  confuseReserveRateId() {
    const [, rateId] = this._confuseAction();
    return rateId;
  }

  /**
   * 混乱行動情報を取得
   */
  protected _confuseAction(): number[] {
    return GameNumberList.get(this._battler.confuseAction);
  }

  /**
   * 混乱時に行動パータンがなかった場合に取得するスキルId
   * 味方のスキルリストから選択される
   */
  choiceConfuseSkillId(): number {
    return 0;
  }

  /**
   * 指定の属性の守備力を取得
   * @param id 属性Id
   * @returns
   */
  getElementDef(id: number): number {
    const list = GameNumberList.get(this._getElementDefs());
    // listは1始まりなので-1する
    const value = list[id - 1];
    return Math.max(0, value + this._relativeElementDevLevel(id));
  }

  /**
   * 属性守備力を取得する
   * @returns
   */
  protected _getElementDefs(): number {
    return this._battler.elementDefs;
  }

  /**
   * 相対属性守備力レベルを取得する
   * @returns
   */
  protected _relativeElementDevLevel(id: number): number;
  protected _relativeElementDevLevel() {
    return 0;
  }

  /**
   * 追加試行回数を取得する
   */
  addNumRepeat() {
    return 0;
  }

  /**
   * 通常攻撃スキルIdを取得する
   * @returns
   */
  getNormalAttackId() {
    return GameUtils.getNormalAttackId();
  }

  /**
   * 追加効果Idを取得する
   * @returns
   */
  addEffectId() {
    return 0;
  }

  /**
   * 指定の道具が使用可能かを取得する
   * @param item
   */
  canUsable(item: Item | GameItem, map: boolean): boolean;
  canUsable() {
    return false;
  }

  /**
   * 単一条件を満たすか確認する
   * @param condition
   * @returns
   */
  meetCondition(condition: ActionCondition) {
    switch (condition.type) {
      case EActionConditionType.Turn:
        return gameBattleTemp.meetTurnCondition(condition);
      case EActionConditionType.Hp:
        return this.meetHpCondition(condition);
      case EActionConditionType.Mp:
        return this.meetMpCondition(condition);
      case EActionConditionType.Level:
        return this.meetLevelCondition(condition);
      case EActionConditionType.State:
        return this.meetStateCondition(condition);
      case EActionConditionType.opponentLevel:
        return this.meetOpponentLevelCondition(condition);
      case EActionConditionType.equalZero:
        return Utils.getFrameCount() % condition.param1 === 0;
      default:
        return false;
    }
  }

  /**
   * hp条件を満たすか確認する
   * @param condition
   * @returns
   */
  meetHpCondition({ param1: min, param2: max, opeType }: ActionConditionParam) {
    if (opeType === 0) {
      min = GameRate.div(min, this.mhp, 0);
      max = GameRate.div(max, this.mhp);
    }
    return this.hp >= min && this.hp <= max;
  }

  /**
   * mp条件を満たすか確認する
   * @param condition
   * @returns
   */
  meetMpCondition({ param1: min, param2: max, opeType }: ActionConditionParam) {
    if (opeType === 0) {
      min = GameRate.div(min, this.mmp, 0);
      max = GameRate.div(max, this.mmp);
    }
    return this.mp >= min && this.mp <= max;
  }

  /**
   * レベル条件を満たすか確認する
   * @param param0
   */
  meetLevelCondition({ param1: lv, opeType: little }: ActionConditionParam) {
    const selfLv = this.lv;
    return little > 0 ? lv >= selfLv : lv <= selfLv;
  }

  /**
   * 状態条件を満たすか確認する
   * @param condition
   * @returns
   */
  meetStateCondition({
    param1: stateId,
    opeType: normal,
  }: ActionConditionParam) {
    const already = this.stateAlready(stateId);
    return normal ? !already : already;
  }

  /**
   * 敵レベル条件を満たすか確認する
   * @param param0
   */
  meetOpponentLevelCondition({
    param1: lv,
    param2: absolute,
    opeType: little,
  }: ActionConditionParam) {
    const baseLv = Math.max(1, absolute > 0 ? lv : this.lv + lv);
    const opponentLv = this.opponent.getLv();
    return little > 0 ? baseLv >= opponentLv : baseLv <= opponentLv;
  }

  /**
   * 使用回数制限を満たすか確認する
   * @param param0
   * @param pattern
   * @returns
   */
  meetTimesCondition({ param1: max }: ActionConditionParam, pattern: number) {
    const times = this.selfUnit.getPatternTimes(this.groupId, pattern);
    return times < max;
  }

  getAutoUsableBattleSkillIds(): number[] {
    return [];
  }

  getAutoUsableBattleItemIndices(): number[] {
    return [];
  }
}
