import {
  Action,
  ActionCondition,
  ActionEffect,
  ActionEffectBuff,
  ActionEffectRelease,
  ActionExtra,
  EActionConditionType,
  EActionEffectCode,
  EActionEffectReleaseType,
  EActionEffectSpecial,
  EActionEffectStateCnd,
  EActionEffectType,
  EActionEffectValue1,
  EActionExtraDisp,
  EActionPatternSelect,
  EActionSwitchCondition,
  EAimType,
  EInactionType,
  EMeaninglessType,
  EStateRestriction,
  EWeaponEffect,
  Skill,
  State,
} from './DataTypes';
import {
  actionConditions,
  actionEffects,
  actionExtras,
  actions,
  actionTypes,
  gameParty,
  gameTroop,
  intelligences,
  skills,
  states,
  system,
} from './DataStore';
import { GameActionGenSupport } from './GameActionInterval';
import {
  ActionResult,
  ActionResultBase,
  EActionResultExtra,
  EActionResultText,
  EActionResultTextSetting,
  GameActionEffect,
  GameActionFigure,
  GameActionParamRate,
  GameActionPatternList,
  GameActionStrike,
  GameActionUtils,
  GameDamageCut,
  NewEntry,
} from './GameActionUtils';
import { GameBattler } from './GameBattler';
import { GameMember } from './GameMember';
import { GameGroupIndex, GameUnit } from './GameUnit';
import {
  GameActionType,
  GameNumberList,
  GameNumberMap,
  GameRate,
  GameUtils,
} from './GameUtils';
import Utils from './Utils';
import { GameItem } from './GameItem';
import { GameEnemy } from './GameEnemy';
import { GameLog } from './GameLog';

const enum EActionResultState {
  Already, // すでにかかっている
  Valid, // 有効
  Invalid, // 無効
  Unnecessary, // かかっていないので必要ない
  Failed, // 失敗
}

interface ActionResultState {
  id: number;
  overId: number;
  condition: EActionEffectStateCnd;
  result: EActionResultState;
}

/**
 * 行動結果のタイプ
 */
const enum EActionResultType {
  None,
  OutState,
  Apply,
  Party,
}

const enum EDirectAttack {
  None,
  Hp = 1 << EActionEffectValue1.Hp,
  Mp = 1 << EActionEffectValue1.Mp,
}

/**
 * 行動結果のクラス
 */
class GameActionResult {
  /**
   * 対象を見失ったかどうかのフラグ
   */
  private _lossTarget: boolean = false;
  /**
   * 直接攻撃行動をしたかどうかのフラグ
   */
  private _directAttack: EDirectAttack = EDirectAttack.None;
  /**
   * 間接攻撃行動をしたかどうかのフラグ
   */
  private _inDirectAttack: boolean = false;
  /**
   * 攻撃を防いだかのフラグ
   */
  private _block: boolean = false;
  /**
   * HPダメージ値
   */
  private _hpDamage: number = 0;
  /**
   * HP吸収値
   */
  private _hpDrain: number = 0;
  /**
   * MPダメージ値
   */
  private _mpDamage: number = 0;
  /**
   * MP吸収値
   */
  private _mpDrain: number = 0;
  /**
   * 追加する状態
   */
  private _addedStates: ActionResultState[] = [];
  /**
   * 除去する状態
   */
  private _removedStates: ActionResultState[] = [];
  /**
   * ターン中持続効果
   */
  private _turnEffect: boolean = false;
  /**
   * バフ情報
   */
  private _buffInfos: ActionEffectBuff[] = [];
  /**
   * 変化パラメータ
   */
  private _addedBuffValues: number[] = [0, 0, 0, 0, 0, 0, 0];
  /**
   * 変化パラメータターン数
   */
  private _addedBuffTurns: number[] = [0, 0, 0, 0, 0, 0, 0];
  /**
   * 成長パラメータ
   */
  private _addedGrowthValues: number[] = [0, 0, 0, 0, 0, 0, 0];
  /**
   * 状態解除
   */
  private _releaseInfos: ActionEffectRelease[] = [];
  /**
   * 反射対象
   */
  private _reflectionTarget: GameBattler | null = null;
  /**
   * 当たらなかったフラグ
   */
  private _failedHit: boolean = false;
  /**
   * かわしたかのフラグ
   */
  private _miss: boolean = false;
  /**
   * 仲間呼んだか
   */
  private _called: boolean = false;
  /**
   * 逃げる効果Id
   * 設定されていた場合は逃げる処理を行う
   */
  private _escapeEffectId: number = 0;
  /**
   * 結果タイプ
   */
  private _type: EActionResultType = EActionResultType.None;
  /**
   * 限定状態タイプId
   */
  private _limitStateTypeId: number = 0;
  /**
   * スクリプトId
   */
  private _scriptId: number = 0;
  /**
   * 選択された行動Id
   * パターンリストから指定の場合
   */
  private _selectedActionId: number = 0;
  /**
   * 行動タイプId
   */
  private _actionTypeId: number = 0;
  /**
   * 戻す行動Id
   */
  private _backActionId: number = 0;
  /**
   * 一括表示か
   */
  private _batchDisp: boolean = false;
  /**
   * 対象ごとに効果が発生したか格納する
   */
  private _noHappens: boolean[] = [];
  /**
   * １行動での実行回数
   */
  private _count: number = 0;
  /**
   * 消費MP
   */
  private _mpCost: number = 0;
  /**
   * 使用道具
   */
  private _useItem: GameItem | null = null;
  /**
   * 成長効果が発生したか
   */
  private _growthEffective: boolean = false;
  /**
   * 適用外効果が発生した数
   */
  private _outStateCount: number = 0;

  /**
   * 適用を設定
   */
  setTypeApply() {
    this._type = EActionResultType.Apply;
  }

  /**
   * 適用を取得
   */
  get apply() {
    return this._type === EActionResultType.Apply;
  }

  /**
   * 適用状態外を設定
   */
  setTypeOutState() {
    this._type = EActionResultType.OutState;
  }

  /**
   * 適用状態外を取得
   */
  get outState() {
    return this._type === EActionResultType.OutState;
  }

  /**
   * パーティ適用を設定する
   */
  setTypeParty() {
    this._type = EActionResultType.Party;
  }

  /**
   * 限定適用状態タイプIdを設定
   * @param value
   */
  setLimitStateTypeId(value: number) {
    this._limitStateTypeId = value;
  }

  /**
   * 限定適用状態タイプIdを取得
   */
  get limitStateTypeId() {
    return this._limitStateTypeId;
  }

  /**
   * 対象を見失ったかどうかのフラグを取得
   */
  get lossTarget() {
    return this._lossTarget;
  }

  /**
   * 当たらなかったを設定する
   */
  setFailedHit() {
    this._failedHit = true;
  }

  /**
   * 当たらなかったかどうかを取得する
   */
  get failedHit() {
    return this._failedHit;
  }

  /**
   * 回避を設定する
   */
  setMiss() {
    this._miss = true;
  }

  /**
   * 回避したかどうかを取得する
   */
  get miss() {
    return this._miss;
  }

  /**
   * HP攻撃行動を設定
   */
  setHpAttack() {
    this._directAttack |= EDirectAttack.Hp;
  }

  /**
   * MP攻撃行動を設定
   */
  setMpAttack() {
    this._directAttack |= EDirectAttack.Mp;
  }

  /**
   * HP攻撃行動を削除
   */
  removeHpAttack() {
    this._directAttack &= ~EDirectAttack.Hp;
  }

  /**
   * MP攻撃行動を削除
   */
  removeMpAttack() {
    this._directAttack &= ~EDirectAttack.Mp;
  }

  /**
   * HPダメージを削除
   */
  removeHpDamage() {
    this._directAttack &= ~EDirectAttack.Hp;
    this._hpDamage = 0;
    this._hpDrain = 0;
  }

  /**
   * MPダメージを削除
   */
  removeMpDamage() {
    this._directAttack &= ~EDirectAttack.Mp;
    this._mpDamage = 0;
    this._mpDrain = 0;
  }

  /**
   * 攻撃行動をしたかどうかのフラグを取得
   */
  get directAttack() {
    return this._directAttack;
  }

  /**
   * 間接攻撃行動を設定
   */
  setInDirectAttack() {
    this._inDirectAttack = true;
  }

  /**
   * 攻撃行動をしたかどうかのフラグを取得
   */
  get inDirectAttack() {
    return this._inDirectAttack;
  }

  /**
   * 攻撃を防いだかどうかのフラグを取得
   */
  get block() {
    return this._block;
  }

  /**
   * HPダメージ値を取得
   */
  get hpDamage() {
    return this._hpDamage;
  }

  /**
   * HP吸収値を取得
   */
  get hpDrain() {
    return this._hpDrain;
  }

  /**
   * 合計HPダメージ
   */
  get totalHpDamage() {
    return this.hpDamage + this.hpDrain;
  }

  /**
   * MPダメージ値を取得
   */
  get mpDamage() {
    return this._mpDamage;
  }

  /**
   * MP吸収値を取得
   */
  get mpDrain() {
    return this._mpDrain;
  }

  /**
   * 合計MPダメージ
   */
  get totalMpDamage() {
    return this.mpDamage + this.mpDrain;
  }

  /**
   * 行動タイプIdを取得
   */
  get actionTypeId() {
    return this._actionTypeId;
  }

  /**
   * 追加する状態を追加する
   * 重複Idは省く
   * @param id
   * @param result
   */
  pushAddedState(
    id: number,
    overId: number,
    condition: EActionEffectStateCnd,
    result: EActionResultState
  ) {
    if (this._addedStates.find((value) => value.id === id)) {
      return;
    }
    this._addedStates.push({ id, overId, condition, result });
    // 追加と除去は普通に追加してあとで下位を削除する
    // 追加と除去の相殺はしない
    // かかてないものを除去しようとした場合
    // ほかになにも結果がない場合だけすでにかかっている
    // メッセージを表示する
  }

  /**
   * 追加する状態を取得する
   */
  get addedStates() {
    return this._addedStates;
  }

  /**
   * 有効な追加状があるか
   */
  hasAddedStates() {
    return this._addedStates.length !== 0;
  }

  /**
   * 除去する状態を追加する
   * 重複Idは省く
   * @param id
   * @param result
   */
  pushRemovedState(
    id: number,
    overId: number,
    condition: EActionEffectStateCnd,
    result: EActionResultState
  ) {
    if (this._removedStates.find((value) => value.id === id)) {
      return;
    }
    this._removedStates.push({ id, overId, condition, result });
  }

  /**
   * 除去する状態を取得する
   */
  get removedStates() {
    return this._removedStates;
  }

  /**
   * 有効な除去状態があるか
   */
  hasRemovedStates() {
    return this._removedStates.length !== 0;
  }

  /**
   * バフ情報を追加する
   * @param paramId
   * @param value
   * @param condition
   * @param turns
   */
  pushBuffInfo(
    paramId: number,
    value: number,
    condition: EActionEffectStateCnd,
    turns: number
  ) {
    this._buffInfos.push({ paramId, value, condition, turns });
  }

  /**
   * 解除情報を追加する
   * @param releaseId
   * @param type
   * @param dispInfo
   */
  pushReleaseInfo(
    releaseId: number,
    type: EActionEffectReleaseType,
    dispInfo: number
  ) {
    this._releaseInfos.push({ releaseId, type, dispInfo });
  }

  /**
   * 解除Idを取得する
   */
  get releaseInfos() {
    return this._releaseInfos;
  }

  /**
   * 有効な解除Idがあるか
   * @returns
   */
  hasReleaseInfos() {
    return this._releaseInfos.length !== 0;
  }

  /**
   * 反射対象を取得する
   */
  get reflectionTarget() {
    return this._reflectionTarget;
  }

  /**
   * スクリプトIdを取得する
   */
  get scriptId() {
    return this._scriptId;
  }

  /**
   * 戻す行動Idを取得する
   */
  get backActionId() {
    return this._backActionId;
  }

  /**
   * 選択されたスキルIdを設定する
   * @param id
   */
  setSelectedActionId(id: number) {
    this._selectedActionId = id;
  }

  /**
   * 選択されたスキルIdを取得する
   */
  get selectedActionId() {
    return this._selectedActionId;
  }

  /**
   * 仲間を呼んだかを設定する
   */
  setCalled(value: boolean) {
    this._called = value;
  }

  /**
   * 逃げる効果Idを設定する
   * @param value
   */
  setEscapeEffectId(value: number) {
    this._escapeEffectId = value;
  }

  /**
   * 逃げる効果Idを取得する
   */
  get escapeEffectId() {
    return this._escapeEffectId;
  }

  /**
   * 仲間を呼んでいない
   * @returns
   */
  noCalled() {
    return !this._called;
  }

  /**
   * ノーダメージかどうかを取得
   */
  get noDamage() {
    return (
      this._directAttack === EDirectAttack.None ||
      (this.totalHpDamage === 0 && this.totalMpDamage === 0)
    );
  }

  /**
   * 能力変化値リストのサイズを取得
   */
  get buffLength() {
    return this._addedBuffValues.length;
  }

  /**
   * 成長値リストのサイズを取得
   */
  get growthLength() {
    return this._addedGrowthValues.length;
  }

  /**
   * 一括表示を設定する
   */
  setBatchDisp() {
    this._batchDisp = true;
  }

  /**
   * 一括表示かどうか取得する
   */
  get batchDisp() {
    return this._batchDisp;
  }

  /**
   * 発生結果を追加する
   * @param value
   */
  pushNoHappenResult() {
    this._noHappens.push(this._checkNoHappen());
    if (this.outState) {
      this._outStateCount += 1;
    }
  }

  /**
   * 消費MPを設定する
   * @param value
   */
  setMpCost(value: number) {
    this._mpCost = value;
  }

  /**
   * 消費MPを取得する
   */
  get mpCost() {
    return this._mpCost;
  }

  /**
   * 使用道具を設定する
   * @param value
   */
  setUseItem(value: GameItem | null) {
    this._useItem = value;
  }

  /**
   * 使用道具を取得する
   */
  get useItem() {
    return this._useItem;
  }

  /**
   * 行動適用したがなにもおこらなかったかどうかを取得
   */
  private _checkNoHappen(): boolean {
    return (
      this.apply &&
      !this._turnEffect &&
      this._checkAttackNoHappen() &&
      !this.hasReleaseInfos() &&
      this.escapeEffectId === 0
    );
  }

  /**
   * 攻撃行動をしなかった場合
   * @returns
   */
  private _checkAttackNoHappen() {
    return (
      !this.directAttack &&
      !this.inDirectAttack &&
      this.noDamage &&
      !this.hasAddedStates() &&
      !this.hasRemovedStates() &&
      this.noBuff() &&
      this.noGrowth()
    );
  }

  /**
   * 行動適用したがなにもおこらなかった場合を取得
   * 対象を見失った場合やスクリプト、仲間呼びが設定されている場合は対象外
   */
  get noHappen() {
    return this._judgeNoHappen() && !this._growthEffective;
  }

  /**
   * 効果があった
   */
  get effective() {
    return (
      !this._judgeNoHappen() && this._outStateCount !== this._noHappens.length
    );
  }

  /**
   * 何も起こらなかったかの判定
   * @returns
   */
  private _judgeNoHappen() {
    return (
      !this.lossTarget &&
      this.scriptId === 0 &&
      this.noCalled() &&
      this._noHappens.length > 0 &&
      !this._noHappens.includes(false)
    );
  }

  /**
   * 結果消去
   */
  clear() {
    this._turnEffect = false;
    this._lossTarget = false;
    this._type = EActionResultType.None;
    this._limitStateTypeId = 0;
    this._scriptId = 0;
    this._selectedActionId = 0;
    this._called = false;
    this._escapeEffectId = 0;
    this._batchDisp = false;
    this._noHappens = [];
    this._count = 0;
    this._mpCost = 0;
    this._useItem = null;
    this._growthEffective = false;
    this._outStateCount = 0;
    this.clearEffect();
  }

  /**
   * 効果の部分を消去
   */
  clearEffect() {
    this._failedHit = false;
    this._miss = false;
    this._block = false;
    this._directAttack = EDirectAttack.None;
    this.clearInDirectAttack();
    this._actionTypeId = 0;
    this._hpDamage = 0;
    this._hpDrain = 0;
    this._mpDamage = 0;
    this._mpDrain = 0;
    this._releaseInfos = [];
    this._reflectionTarget = null;
    this._backActionId = 0;
  }

  /**
   * 間接攻撃を消去する
   */
  clearInDirectAttack() {
    this._inDirectAttack = false;
    this._addedStates = [];
    this._removedStates = [];
    this._buffInfos = [];
    this._addedBuffValues = [0, 0, 0, 0, 0, 0, 0];
    this._addedBuffTurns = [0, 0, 0, 0, 0, 0, 0];
    this._addedGrowthValues = [0, 0, 0, 0, 0, 0, 0];
  }

  /**
   * ターン効果を設定
   */
  setTurnEffect(value: boolean) {
    this._turnEffect = value;
  }

  /**
   * 対象を見失った設定
   */
  setLossTarget() {
    this._lossTarget = true;
  }

  /**
   * HPダメージを蓄積
   * @param value
   */
  addHpDamage(value: number) {
    this._hpDamage += value;
  }

  /**
   * HPダメージを置き換える
   * @param value
   */
  replaceHpDamage(value: number) {
    this._hpDamage = value;
  }

  /**
   * HP吸収を蓄積
   * @param value
   */
  addHpDrain(value: number) {
    this._hpDrain += value;
  }

  /**
   * MPダメージを蓄積
   * @param value
   */
  addMpDamage(value: number) {
    this._mpDamage += value;
  }

  /**
   * MP吸収を蓄積
   * @param value
   */
  addMpDrain(value: number) {
    this._mpDrain += value;
  }

  /**
   * 能力変化値を取得する
   * @param id
   * @returns
   */
  addedBuffValue(id: number) {
    return this._addedBuffValues[id];
  }

  /**
   * 能力変化ターンを取得する
   * @param id
   * @returns
   */
  addedBuffTurn(id: number) {
    return this._addedBuffTurns[id];
  }

  /**
   * 成長値を加算する
   * @param id
   * @param value
   */
  plusGrowthValue(id: number, value: number) {
    this._addedGrowthValues[id] += value;
  }

  /**
   * 成長値をクリアする
   * @param id
   * @param value
   */
  clearGrowthValue(id: number) {
    this._addedGrowthValues[id] = 0;
  }

  /**
   * 成長値を制限する
   * @param id
   * @remarks
   */
  limitGrowthValue(id: number) {
    this._addedGrowthValues[id] = 0;
    this._growthEffective = true;
  }

  /**
   * 成長値を取得する
   * @param id
   * @returns
   */
  addedGrowthValue(id: number) {
    return this._addedGrowthValues[id];
  }

  /**
   * 反射対象を設定する
   * @param target
   */
  setReflectionTarget(target: GameBattler) {
    this._reflectionTarget = target;
  }

  /**
   * 能力変化があったかどうか
   * @returns
   */
  effectBuf() {
    return this._addedBuffValues.some((value) => value !== 0);
  }

  /**
   * 成長変化があったかどうか
   * @returns
   */
  effectGrowth() {
    return this._addedGrowthValues.some((value) => value !== 0);
  }

  /**
   * 能力変化がないかどうか
   * @returns
   */
  noBuff() {
    return !this.effectBuf();
  }

  /**
   * 成長変化がないかどうか
   * @returns
   */
  noGrowth() {
    return !this.effectGrowth();
  }

  /**
   * 状態変化がないかどうか
   * @returns
   */
  noState() {
    return this._addedStates.length + this._removedStates.length === 0;
  }

  /**
   * スクリプトIdを設定
   * @param id
   */
  setScriptId(id: number) {
    this._scriptId = id;
  }

  /**
   * 戻す行動Idを設定する
   * @param id
   */
  setBackActionId(id: number) {
    this._backActionId = id;
  }

  /**
   * 結果をまとめる
   * 状態の相殺はややこしいのでやらない
   * @param actionTypeId
   */
  makeReport(
    actor: GameBattler,
    target: GameBattler,
    action: Action,
    targetLength: number
  ) {
    // 行動タイプId
    this._actionTypeId = action.type;

    this._correctHpDamage(actor, target, this._actionTypeId, targetLength);
    // バフ設定
    this._setUpBuffValue();
    // 状態調整
    this._correctState();
    this._correctOneKill(target.downStateTypeId);
    // 効かなかった
    if (this._noDirectAttackEffect() || this._noInDirectAttackEffect()) {
      this._setGuard();
    }
    this._count++;
  }

  /**
   * HPダメージの一時効果補正
   * @param actor
   * @param target
   * @param actionTypeId
   */
  private _correctHpDamage(
    actor: GameBattler,
    target: GameBattler,
    actionTypeId: number,
    targetLength: number
  ) {
    if (this.totalHpDamage <= 0) {
      return;
    }

    const [enable, figureId] = this._atkCorrectInfo(targetLength);
    const atkCorrects = actor.getAtkHpCorrectFigures(
      actionTypeId,
      enable,
      figureId,
      target
    );
    const defCorrects = target.getDefHpCorrectFigures(actionTypeId, enable);
    const correctHp = actor.applyFigures(this.totalHpDamage, [
      ...atkCorrects,
      ...defCorrects,
    ]);
    const newHpDamage = Math.floor(
      (correctHp * this.hpDamage) / this.totalHpDamage
    );
    const newHpDrain = correctHp - newHpDamage;
    [this._hpDamage, this._hpDrain] = [newHpDamage, newHpDrain];
  }

  /**
   * 行動タイプから攻撃補正情報を取得する
   * @returns [バトラーに設定されている攻撃補正の有効無効,追加の攻撃補正率]
   */
  private _atkCorrectInfo(targetLength: number): [boolean, number] {
    if (!this._actionTypeId) {
      return [true, 0];
    }
    const typeInfo = actionTypes[this.actionTypeId];
    const enable = this._count < typeInfo.numCorrection;
    if (!typeInfo.multipleId) {
      return [enable, 0];
    }
    const index = typeInfo.multipleType === 0 ? this._count : targetLength - 1;
    const list = GameNumberList.get(typeInfo.multipleId);
    return [enable, Utils.upperLimitedElement(list, index)];
  }

  /**
   * ガードを解除する
   */
  removeGuard() {
    this._block = false;
  }

  /**
   * ガードを設定する
   */
  private _setGuard() {
    this._block = true;
  }

  /**
   * 直接攻撃効果がなかった
   */
  private _noDirectAttackEffect() {
    return (
      this.directAttack !== EDirectAttack.None &&
      !this.totalHpDamage &&
      !this.totalMpDamage
    );
  }

  /**
   * 間接攻撃効果がなかった
   * 直接攻撃をしていない場合だけ有効
   */
  private _noInDirectAttackEffect() {
    return (
      this.directAttack === EDirectAttack.None &&
      this.inDirectAttack &&
      this.noBuff() &&
      this.noState()
    );
  }

  /**
   * バフ値を設定する
   * turns = -1 は無限に続く
   */
  private _setUpBuffValue() {
    for (const info of this._buffInfos) {
      if (
        info.condition === EActionEffectStateCnd.Damage &&
        this.totalHpDamage === 0
      ) {
        continue;
      }
      this._addedBuffValues[info.paramId] += info.value;
      if (info.turns < 0) {
        this._addedBuffTurns[info.paramId] = info.turns;
      }
      if (this._addedBuffTurns[info.paramId] >= 0) {
        this._addedBuffTurns[info.paramId] += info.turns;
      }
    }
  }

  /**
   * 状態を補正する
   */
  private _correctState() {
    const conditionFn = (state: ActionResultState) => {
      return (
        state.condition === EActionEffectStateCnd.None ||
        (state.result !== EActionResultState.Failed &&
          state.result !== EActionResultState.Already &&
          this.totalHpDamage !== 0)
      );
    };
    const addedStates = this._addedStates.filter((state) => conditionFn(state));
    this._addedStates = this._removeRowRankState(addedStates);
    const removedStates = this._removedStates.filter((state) =>
      conditionFn(state)
    );
    this._removedStates = this._removeRowRankState(removedStates);
  }

  /**
   * 下位の状態を削除する
   * 効果のない状態はそのまま残す
   * @param resultStates
   */
  private _removeRowRankState(resultStates: ActionResultState[]) {
    if (resultStates.length === 0) {
      return resultStates;
    }
    const targetInfos = resultStates.filter((stateInfo) => {
      // その状態にならない結果は対象にしない
      return stateInfo.result < EActionResultState.Invalid;
    });

    return resultStates.filter((stateInfo) => {
      for (const targetInfo of targetInfos) {
        if (GameUtils.lowRankState(stateInfo.id, targetInfo.id)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 一撃必殺の場合の補正
   */
  private _correctOneKill(downId: number) {
    if (
      this._addedStates.find(
        (state) =>
          state.result === EActionResultState.Valid &&
          GameUtils.getStateTypeOfStateId(state.id).id === downId
      )
    ) {
      this.removeHpDamage();
    }
  }
}

/**
 * 行動対象
 */
const enum EActionTarget {
  None,
  FriendSolo,
  FriendGroup,
  FriendAll,
  FriendRandom,
  Self,
  EnemySolo,
  EnemyGroup,
  EnemyAll,
  EnemyRandom,
  Other,
  All,
  AllRandom,
  ReverseValue = EnemySolo - FriendSolo,
}

interface JudgeOptions {
  unit: GameUnit;
  recover: boolean;
  strength: number;
  aim: EAimType;
  flexible: number;
  more: number;
  random: boolean;
  groupIndices: GameGroupIndex[];
  effects: ActionEffect[];
}

interface EvaluateOptions {
  effects: ActionEffect[];
  total: number;
  reverse: boolean;
}

interface TargetPoint {
  point: number;
  group: number;
  index: number;
}

/**
 * 行動に関する処理をまとめたクラス
 */
export class GameAction {
  /**
   * 空アクション
   */
  private static _emptyAction: Action = {
    id: 0,
    type: 0,
    mpCost: 0,
    scope: 0,
    weapon: 0,
    animationId: 0,
    messageId: 0,
    extraId: 0,
    safety: false,
    effectIds: [],
    limitStateTypeId: 0,
    successMessageId: 0,
    failedMessageId: 0,
    successRateId: 0,
    hitRateId: 0,
    hitRaceValueId: 0,
  };
  /**
   * 行動者
   */
  protected _actor!: GameBattler;
  /**
   * 行動データ
   */
  protected _action: Action = GameAction._emptyAction;
  /**
   * 行動結果
   */
  protected _result: GameActionResult = new GameActionResult();
  /**
   * 行動追加情報
   */
  private _extra: ActionExtra = GameActionUtils.emptyExtra;

  /**
   * コンストラクタ
   * @param args
   */
  constructor(actor?: GameBattler) {
    if (actor) {
      this._actor = actor;
    }
  }

  /**
   * 行動者を設定する
   */
  setActor(value: GameBattler) {
    this._actor = value;
  }

  /**
   * 行動者を取得する
   */
  get actor() {
    return this._actor;
  }

  /**
   * 行動者名を取得する
   */
  get actorName() {
    return this._actor?.name ?? '';
  }

  /**
   * 行動者をメンバーとして返す
   */
  get member() {
    return this._actor as GameMember;
  }

  /**
   * 行動オブジェクトを設定する
   * @param actionId
   */
  private _setup(actionId: number) {
    this._action = actions[actionId];
    this._extra = this.extraId
      ? actionExtras[this.extraId]
      : GameActionUtils.emptyExtra;
  }

  /**
   * 行動を設定する
   * @param value
   */
  setActionId(value: number) {
    this._setup(value);
  }

  /**
   * 設定されている行動のidを取得
   */
  get actionId() {
    return this._action?.id;
  }

  /**
   * 行動の効果Id
   */
  get effectIds() {
    return this._action.effectIds;
  }

  /**
   * 行動タイプ
   */
  get actionType() {
    return this._action.type;
  }

  /**
   * 行動のおまけId
   */
  get extraId() {
    return this._action?.extraId;
  }

  /**
   * 行動のおまけ情報
   */
  get extra() {
    return this._extra;
  }

  /**
   * 消費MP
   */
  get mpCost() {
    return GameAction.getMpCost(this._action);
  }

  /**
   * 消費MP(static)
   * @param action
   * @returns
   */
  static getMpCost(action: Action) {
    return action?.mpCost ?? 0;
  }

  /**
   * 行動開始メッセージを取得
   */
  get message() {
    return GameUtils.getMessage(this._action.messageId);
  }

  /**
   * 行動の対象範囲を取得
   */
  get scope() {
    return this._action.scope;
  }

  /**
   * 行動開始時のアニメーションIdを取得する
   */
  get animationId() {
    return this._action.animationId;
  }

  /**
   * 成功メッセージ
   */
  get successMessage() {
    return GameUtils.getMessage(this._action.successMessageId);
  }

  /**
   * 失敗メッセージ
   */
  get failedMessage() {
    return GameUtils.getMessage(this._action.failedMessageId);
  }

  /**
   * 対象がないか
   */
  get noTarget() {
    return this._action.scope === EActionTarget.None;
  }

  /**
   * 仲間一人が対象か
   */
  get forOneFriend() {
    return GameAction.checkForOneFriend(this._action);
  }

  /**
   * 仲間一人が対象か(static)
   * @param action
   * @returns
   */
  static checkForOneFriend(action: Action) {
    return action.scope === EActionTarget.FriendSolo;
  }

  /**
   * 仲間グループが対象か
   */
  get forGroupFriend() {
    return GameAction.checkForGroupFriend(this._action);
  }

  /**
   * 仲間グループが対象か(static)
   * @param action
   * @returns
   */
  static checkForGroupFriend(action: Action) {
    return action.scope === EActionTarget.FriendGroup;
  }

  /**
   * 敵一人が対象か
   */
  get forOneEnemy() {
    return GameAction.checkForOneEnemy(this._action);
  }

  /**
   * 敵一人が対象か(static)
   * @param action
   * @returns
   */
  static checkForOneEnemy(action: Action) {
    return action.scope === EActionTarget.EnemySolo;
  }

  /**
   * 敵グループが対象か
   */
  get forGroupEnemy() {
    return GameAction.checkForGroupEnemy(this._action);
  }

  /**
   * 敵グループが対象か(static)
   * @param action
   * @returns
   */
  static checkForGroupEnemy(action: Action) {
    return action.scope === EActionTarget.EnemyGroup;
  }

  /**
   * 敵一人かグループ対象か
   */
  get forOneOrGroupEnemy() {
    return GameAction.checkForOneOrGroupEnemy(this._action);
  }

  /**
   * 敵一人かグループ対象か(static)
   * @param action
   * @returns
   */
  static checkForOneOrGroupEnemy(action: Action) {
    return [EActionTarget.EnemySolo, EActionTarget.EnemyGroup].includes(
      action.scope
    );
  }

  /**
   * 結果を消去
   */
  clearResult() {
    this._result.clear();
  }

  /**
   * 対象を作成する
   * 範囲 0:なし 1:味方単 2:味方グループ 3:味方全体
   *    5:自分
   *    6:敵単 7:敵グループ 8:敵全体
   *    9:自分以外 10:全体
   * @param range
   * @param group 対象グループ
   * @param index 対象インデックス
   */
  makeTargets(range: number, group: number, index: number) {
    const times = this._numAttempts();
    if (!times) {
      return [];
    }
    const targets = this._makeOnceTargets(range, group, index);
    if (times === 1) {
      return targets;
    }
    const attemptsTargets: GameBattler[] = [];
    if (this._randomRange(range)) {
      for (const target of targets) {
        attemptsTargets.push(target);
        for (let i = 1; i < times; i++) {
          attemptsTargets.push(...this._makeOnceTargets(range, group, index));
        }
      }
    } else {
      for (const target of targets) {
        for (let i = 0; i < times; i++) {
          attemptsTargets.push(target);
        }
      }
    }
    return attemptsTargets;
  }

  /**
   * 試行回数を取得する
   * @returns
   */
  private _numAttempts() {
    const attemptsId = this.extra.attemptsId;
    if (!attemptsId) {
      return 1;
    }
    return GameNumberList.randomInt(attemptsId);
  }

  /**
   * 1回分の対象を作成する
   * @param range
   * @param group
   * @param index
   * @returns
   */
  private _makeOnceTargets(range: number, group: number, index: number) {
    if (this._friendRange(range)) {
      return this._friendTargets(range, group, index);
    } else if (this._enemyRange(range)) {
      return this._enemyTargets(range, group, index);
    } else if (this._everyoneRange(range)) {
      return this._everyoneTargets();
    }
    return [];
  }

  /**
   * 仲間が対象
   * @param range
   */
  protected _friendRange(range: number) {
    return [
      EActionTarget.FriendSolo,
      EActionTarget.FriendGroup,
      EActionTarget.FriendAll,
      EActionTarget.FriendRandom,
      EActionTarget.Self,
      EActionTarget.Other,
    ].includes(range);
  }

  /**
   * 敵が対象
   * @param range
   */
  protected _enemyRange(range: number) {
    return [
      EActionTarget.EnemySolo,
      EActionTarget.EnemyGroup,
      EActionTarget.EnemyAll,
      EActionTarget.EnemyRandom,
    ].includes(range);
  }

  /**
   * 全体が対象
   * @param range
   * @returns
   */
  protected _everyoneRange(range: number) {
    return range === EActionTarget.All;
  }

  /**
   * 敵味方両方が対象
   * @param range
   */
  protected _bothRange(range: number) {
    return [EActionTarget.All, EActionTarget.AllRandom].includes(range);
  }

  /**
   * ランダム対象
   * @param range
   * @returns
   */
  protected _randomRange(range: number) {
    return [
      EActionTarget.FriendRandom,
      EActionTarget.EnemyRandom,
      EActionTarget.AllRandom,
    ].includes(range);
  }

  protected _soloRange(range: number) {
    return [
      EActionTarget.FriendSolo,
      EActionTarget.Self,
      EActionTarget.FriendRandom,
      EActionTarget.EnemySolo,
      EActionTarget.EnemyRandom,
      EActionTarget.AllRandom,
    ].includes(range);
  }

  protected _groupRange(range: number) {
    return [EActionTarget.FriendGroup, EActionTarget.EnemyGroup].includes(
      range
    );
  }

  protected _allRange(range: number) {
    return [
      EActionTarget.FriendAll,
      EActionTarget.EnemyAll,
      EActionTarget.Other,
      EActionTarget.All,
    ].includes(range);
  }

  /**
   * 反転した対象を作成する
   * 自分と自分以外は反転しない
   * @param range
   * @param group 対象グループ
   * @param index 対象インデックス
   */
  makeReverseTargets(range: number, group: number, index: number) {
    return this.makeTargets(this._reverseRange(range), group, index);
  }

  /**
   * 範囲を反転させる
   * @param range
   */
  protected _reverseRange(range: EActionTarget) {
    if (
      [
        EActionTarget.FriendSolo,
        EActionTarget.FriendGroup,
        EActionTarget.FriendAll,
        EActionTarget.FriendRandom,
      ].includes(range)
    ) {
      return range + EActionTarget.ReverseValue;
    } else if (
      [
        EActionTarget.EnemySolo,
        EActionTarget.EnemyGroup,
        EActionTarget.EnemyAll,
        EActionTarget.EnemyRandom,
      ].includes(range)
    ) {
      return range - EActionTarget.ReverseValue;
    } else {
      return range;
    }
  }

  /**
   * 仲間の対象を取得する
   * @param range
   * @param group
   * @param index
   */
  protected _friendTargets(
    range: EActionTarget,
    group: number,
    index: number
  ): GameBattler[] {
    const unit = this._actor.selfUnit;
    switch (range) {
      case EActionTarget.FriendSolo:
        return this._oneTarget(unit, group, index);
      case EActionTarget.FriendGroup:
        return this._oneGroupTargets(unit, group);
      case EActionTarget.FriendAll:
        return this._allTargets(unit);
      case EActionTarget.FriendRandom:
        return this._randomTarget(unit);
      case EActionTarget.Self:
        return [this._actor];
      case EActionTarget.Other:
        return this._otherTargets(unit);
    }
    return [];
  }

  /**
   * 敵の対象を取得する
   * @param range
   * @param group
   * @param index
   */
  protected _enemyTargets(
    range: number,
    group: number,
    index: number
  ): GameBattler[] {
    const unit = this._actor.opponent;
    switch (range) {
      case EActionTarget.EnemySolo:
        return this._oneTarget(unit, group, index);
      case EActionTarget.EnemyGroup:
        return this._oneGroupTargets(unit, group);
      case EActionTarget.EnemyAll:
        return this._allTargets(unit);
      case EActionTarget.EnemyRandom:
        return this._randomTarget(unit);
    }
    return [];
  }

  /**
   * 単一ターゲット
   * @param unit
   * @param group
   * @param index
   */
  protected _oneTarget(unit: GameUnit, group: number, index: number) {
    const battler = unit.get(group, index);
    if (!battler) {
      this._result.setLossTarget();
      return [];
    }
    return [battler];
  }

  /**
   * オートターゲットが有効かどうか
   * @returns
   */
  protected _enableAutoTarget() {
    return false;
  }

  /**
   * １対象のインデックスを決定する
   * @param indicesList
   * @param group
   * @param index
   * @returns
   */
  protected _decideOneTargetIndex(
    unit: GameUnit,
    group: number,
    index: number
  ): [number, number] {
    const indicesList = this._validTargetIndicesList(unit);
    if (group < 0) {
      [group] = this._selectOneSetFromValid(unit, indicesList);
    }
    const groupIndex = this._findGroupIndices(indicesList, group);
    if (!groupIndex) {
      // ターゲットなし
      return [-1, -1];
    }
    if (index < 0) {
      index = this._selectOneIndexFromValid(unit, groupIndex);
    }
    if (!GameUnit.includeGroupIndex(groupIndex, index)) {
      // ターゲットなし
      index = -1;
    }
    return [group, index];
  }

  /**
   * 有効グループ対象から1体のインデックスセットを選択する
   * 適当入力が有利にならないようにランダムにする
   * @param unit
   * @param groupIndices
   * @returns
   */
  private _selectOneSetFromValid(
    _unit: GameUnit,
    groupIndices: GameGroupIndex[]
  ) {
    return GameUnit.randomTargetByGroupIndices(groupIndices);
  }

  /**
   * 有効対象から1体のインデックスを選択する
   * @param unit
   * @param groupIndex
   * @returns
   */
  private _selectOneIndexFromValid(unit: GameUnit, groupIndex: GameGroupIndex) {
    const recover = unit === this.actor.selfUnit;
    const intelligence = intelligences[this.actor.intelligenceId];
    const aim = recover ? intelligence.rcvAim : intelligence.atkAim;
    if (intelligence.rcvAim === EAimType.Effective && recover) {
      return this._adhocRecoverTargetByGroupIndex(unit, groupIndex);
    } else if (intelligence.atkAim === EAimType.Effective && !recover) {
      return this._adhocAttackTargetByGroupIndex(unit, groupIndex);
    }
    return this._selectOneIndexFromValidAim(unit, groupIndex, aim);
  }

  /**
   * エイムタイプから１体の対象を選択する
   * @param unit
   * @param groupIndex
   * @param aim
   * @returns
   */
  private _selectOneIndexFromValidAim(
    unit: GameUnit,
    groupIndex: GameGroupIndex,
    aim: EAimType
  ) {
    switch (aim) {
      case EAimType.FromFirst:
        return GameUnit.fromFirstTargetByGroupIndex(groupIndex);
      case EAimType.FromLast:
        return GameUnit.fromLastTargetByGroupIndex(groupIndex);
      case EAimType.Strong:
        return unit.strongTargetByGroupIndex(groupIndex);
      case EAimType.Weak:
        return unit.weakTargetByGroupIndex(groupIndex);
      default:
        return GameUnit.randomTargetByGroupIndex(groupIndex);
    }
  }

  /**
   * グループインデックスから最適な回復対象を選択する
   * @param unit
   * @param groupIndex
   * @returns
   */
  private _adhocRecoverTargetByGroupIndex(
    unit: GameUnit,
    groupIndex: GameGroupIndex
  ) {
    const effects = this._getRecoverEffects();
    if (effects.length === 0) {
      // 回復効果でない場合はランダム
      return GameUnit.randomTargetByGroupIndex(groupIndex);
    }
    const targets = unit.getGroupMembers(groupIndex.index, groupIndex.list);
    const index = this._selectAdhocRecoverTargetIndex(targets, effects);

    return groupIndex.list[index];
  }

  /**
   * 戦闘者から最適な回復対象インデックスを選択する
   * @param targets
   * @param effects
   * @returns
   */
  private _selectAdhocRecoverTargetIndex(
    targets: GameBattler[],
    effects: ActionEffect[]
  ) {
    const length = targets.length;
    const priorities: number[] = [];

    GameActionUtils.RandomOff();
    // 状態回復>HP危険状態>HP回復度
    // だいたいこんな優先度になるように算出する
    for (let i = 0; i < length; i++) {
      this.clearResult();
      priorities.push(this._calcRecoverPriority(targets[i], effects));
    }
    GameActionUtils.RandomOn();
    this.clearResult();

    const maxPriority = Math.max(...priorities);
    return priorities.findIndex((value) => value === maxPriority);
  }

  /**
   * 回復の優先度を計算する
   * @param target
   * @param effects
   * @returns
   */
  private _calcRecoverPriority(target: GameBattler, effects: ActionEffect[]) {
    const stateIds = effects
      .filter((effect) => effect.code === EActionEffectCode.State)
      .map((effect) => effect.refId);

    const statePriority = stateIds.reduce((priority, id) => {
      const plus = target.stateRemoval(id) ? states[id].priority : 0;
      return priority + plus;
    }, 0);

    this.executeEffects(target, effects);
    this._result.makeReport(this.actor, target, this._action, 1);
    const hpPriority =
      this._result.hpDamage < 0
        ? this._calcHpRecoverPriority(target, -this._result.hpDamage)
        : 0;

    return statePriority + hpPriority;
  }

  /**
   * Hp回復の優先度を計算する
   * @param target
   * @param value
   * @returns
   */
  private _calcHpRecoverPriority(target: GameBattler, value: number) {
    // danger:60 warn:30
    // + degree * 20
    // + value / 20
    const warn = target.hpWarn ? 30 : 0;
    const danger = target.hpDanger ? 30 : 0;
    const degree = target.consumeHpDegree() * 20;
    const quantity = Math.min(value, target.mhp - target.hp);
    return warn + danger + degree + quantity;
  }

  /**
   * グループインデックスから最適な攻撃対象を選択する
   * @param unit
   * @param groupIndex
   * @returns
   */
  private _adhocAttackTargetByGroupIndex(
    unit: GameUnit,
    groupIndex: GameGroupIndex
  ) {
    const effects = this._getHpEffects();
    if (effects.length === 0) {
      // HP効果でない場合はランダム
      return GameUnit.randomTargetByGroupIndex(groupIndex);
    }
    const targets = unit.getGroupMembers(groupIndex.index, groupIndex.list);
    const index = this._selectAdhocAttackTargetIndex(targets, effects);

    return groupIndex.list[index];
  }

  /**
   * 戦闘者から最適な攻撃対象インデックスを選択する
   * @param targets
   * @param effects
   * @returns
   */
  private _selectAdhocAttackTargetIndex(
    targets: GameBattler[],
    effects: ActionEffect[]
  ) {
    const length = targets.length;

    GameActionUtils.RandomOff();
    // ダメージ試算
    const damages: number[] = [];
    for (let i = 0; i < length; i++) {
      this.clearResult();
      const target = targets[i];
      this.executeEffects(targets[i], effects);
      this._result.makeReport(this.actor, target, this._action, 1);
      damages.push(this._result.totalHpDamage);
    }
    // 残りHP算出
    const remainHps: number[] = [];
    for (let i = 0; i < length; i++) {
      remainHps.push(targets[i].hp - damages[i]);
    }
    // 倒せる敵から決定
    let [index, damage] = [-1, 0];
    for (let i = 0; i < length; i++) {
      if (remainHps[i] > 0) {
        continue;
      }
      const battler = targets[i];
      const hp = battler.hp;
      const rand = Utils.random();
      if (hp + rand > damage) {
        damage = hp + rand;
        index = i;
      }
    }

    if (index < 0) {
      // 乱数補正
      for (let i = 0; i < length; i++) {
        const target = targets[i];
        if (target.actionable) {
          // 同じ値なら先頭が選択されないようにばらけされるためのもの
          const rand = Utils.random();
          damages[i] += rand;
          remainHps[i] += rand;
        } else {
          // 行動不可は対象にならないようにする
          damages[i] = 0;
          remainHps[i] = Number.MAX_VALUE;
        }
      }
      index = this._selectDamageSuitable(damages, remainHps);
    }

    GameActionUtils.RandomOn();
    this.clearResult();

    return index;
  }

  /**
   * 適切なダメージ対象を選択する
   * @param length
   * @param damages
   * @param remainHps
   * @returns
   */
  private _selectDamageSuitable(damages: number[], remainHps: number[]) {
    // 残りHPが少ない
    const minHp = Math.min(...remainHps);
    const minHpIndex = remainHps.indexOf(minHp);
    // ダメージ0なら最大ダメージから選択
    if (damages[minHpIndex] < 1) {
      // 最大ダメージから選択
      const maxDamage = Math.max(...damages);
      // ダメージ1以上なら確定
      if (maxDamage >= 1) {
        return damages.findIndex((value) => value === maxDamage);
      }
    }
    return minHpIndex;
  }

  /**
   * １グループターゲット
   * @param unit
   * @param group
   */
  protected _oneGroupTargets(unit: GameUnit, group: number) {
    let indices: number[];
    [group, indices] = this._decideGroupTargetIndex(unit, group);
    if (group < 0 && this._enableAutoTarget()) {
      // 対象外の結果になっていたらもう一度
      [group, indices] = this._decideGroupTargetIndex(unit, group);
    }
    const battlers = unit.getGroupMembers(group, indices);
    if (battlers.length === 0) {
      this._result.setLossTarget();
      return [];
    }
    return battlers;
  }

  /**
   * グループターゲットインデックスを決定する
   * @param unit
   * @param group
   * @returns
   */
  private _decideGroupTargetIndex(
    unit: GameUnit,
    group: number
  ): [number, number[]] {
    const indicesList = this._validTargetIndicesList(unit);
    if (group < 0) {
      [group] = this._selectOneSetFromValid(unit, indicesList);
    }
    const groupIndex = this._findGroupIndices(indicesList, group);
    if (!groupIndex) {
      // ターゲットなし
      return [-1, []];
    }
    return [group, groupIndex.list];
  }

  /**
   * グループインデックスを探す
   * @param indicesList
   * @param group
   * @returns
   */
  private _findGroupIndices(indicesList: GameGroupIndex[], group: number) {
    return indicesList.find((value) => value.index === group);
  }

  /**
   * 全体
   * グループ対象と同じ条件
   * @param unit
   */
  protected _allTargets(unit: GameUnit) {
    const indicesList = this._validTargetIndicesList(unit);
    return unit.getMembers(indicesList);
  }

  /**
   * ランダム対象
   * @param unit
   * @returns
   */
  private _randomTarget(unit: GameUnit) {
    const indicesList = this._validTargetIndicesList(unit);
    const [group, index] = GameUnit.randomTargetByGroupIndices(indicesList);
    const battler = unit.get(group, index);
    if (!battler) {
      this._result.setLossTarget();
      return [];
    }
    return [battler];
  }

  /**
   * 自分以外
   * @param unit
   * @returns
   */
  private _otherTargets(unit: GameUnit) {
    const indicesList = this._validTargetIndicesList(unit);
    return unit
      .getMembers(indicesList)
      .filter((target) => target !== this.actor);
  }

  /**
   * 敵味方全部
   * @returns
   */
  private _everyoneTargets() {
    const indicesList1 = this._validTargetIndicesList(this.actor.opponent);
    const indicesList2 = this._validTargetIndicesList(this.actor.selfUnit);
    return [
      ...this.actor.opponent.getMembers(indicesList1),
      ...this.actor.selfUnit.getMembers(indicesList2),
    ];
  }

  /**
   * 有効ターゲットインデックスリストを取得する
   * @param unit
   * @returns
   */
  private _validTargetIndicesList(unit: GameUnit) {
    if (this._validDownAction()) {
      return unit.getMemberIndicesList((battler) => battler.exist);
    } else {
      return unit.getMemberIndicesList((battler) => battler.live);
    }
  }

  /**
   * 評価ターゲットインデックスリストを取得する
   * @param unit
   * @returns
   */
  private _evaluateTargetIndicesList(unit: GameUnit) {
    const stateTypeId = this._action.limitStateTypeId;
    if (this._validDownAction()) {
      return unit.getMemberIndicesList(
        (battler) =>
          battler.exist && (!stateTypeId || battler.hasStateType(stateTypeId))
      );
    } else {
      return unit.getMemberIndicesList(
        (battler) =>
          battler.live && (!stateTypeId || battler.hasStateType(stateTypeId))
      );
    }
  }

  /**
   * 有効ターゲットか
   * @param target
   */
  protected _validOneTarget(target: GameBattler): boolean;
  protected _validOneTarget() {
    return true;
  }

  /**
   * ばたん状態に有効な行動かどうか
   */
  protected _validDownAction() {
    return this._getEffects().some((effect) => {
      if (
        effect.code !== EActionEffectCode.State ||
        effect.type !== EActionEffectType.Plus
      ) {
        return false;
      }
      return (
        GameUtils.getStateTypeOfStateId(effect.refId).id ===
        this.actor.downStateTypeId
      );
    });
  }

  /**
   * 設定している行動の対象インデックスを取得する
   * @param range
   * @returns
   */
  getTargetIndex(): [number, number] {
    const range = this.scope;
    if (this._friendRange(range)) {
      return this._getFriendTargetIndex(range);
    } else if (this._enemyRange(range)) {
      return this._getEnemyTargetIndex(range);
    }
    return [-1, -1];
  }

  /**
   * 味方対象インデックスを取得する
   * @param range
   * @returns
   */
  protected _getFriendTargetIndex(range: number): [number, number] {
    const unit = this._actor.selfUnit;
    switch (range) {
      case EActionTarget.FriendSolo:
        return this._decideOneTargetIndex(unit, -1, -1);
      case EActionTarget.FriendGroup:
        return [this._decideGroupTargetIndex(unit, -1)[0], -1];
    }
    return [-1, -1];
  }

  /**
   * 敵対象インデックスを取得する
   * @param range
   * @returns
   */
  protected _getEnemyTargetIndex(range: number): [number, number] {
    const unit = this._actor.opponent;
    switch (range) {
      case EActionTarget.EnemySolo:
        return this._decideOneTargetIndex(unit, -1, -1);
      case EActionTarget.EnemyGroup:
        return [this._decideGroupTargetIndex(unit, -1)[0], -1];
    }
    return [-1, -1];
  }

  /**
   * 行動を判定する
   * 可能の場合、選択した対象インデックスを返す
   * @param actionId
   * @returns
   */
  judgeAction(): [boolean, number, number] {
    const range = this.scope;
    const intelligence = this.actor.intelligence;
    const options: JudgeOptions = {
      unit: this.actor.opponent,
      recover: false,
      strength: intelligence.meaningless,
      aim: intelligence.atkAim,
      flexible: intelligence.atkFlexible,
      more: intelligence.more,
      random: false,
      effects: this._getEffects(),
      groupIndices: [],
    };

    const newBattlerIds = this._getNewBattlerIds(options.effects);
    if (this._someAppear(newBattlerIds)) {
      // 仲間呼び可能な場合はOK
      return [true, -1, -1];
    }

    if (this._friendRange(range)) {
      options.unit = this.actor.selfUnit;
      options.recover = true;
      options.aim = intelligence.rcvAim;
      options.flexible = intelligence.rcvFlexible;
    } else if (this._enemyRange(range)) {
      // デフォルトオプション
    } else if (this._bothRange(range)) {
      // 敵味方両方は判定なしでOK
      return [true, -1, -1];
    } else {
      // ターゲットなし
      return [false, -1, -1];
    }

    // 新規ターゲット追加の場合の判定
    if (range === EActionTarget.Self) {
      return this._judgeSelfTarget(options);
    }

    if (this._randomRange(range)) {
      options.random = true;
    }

    options.effects = this._getEffects();
    options.groupIndices = this._evaluateTargetIndicesList(options.unit);
    if (range === EActionTarget.Other) {
      GameUnit.removeIndex(
        options.groupIndices,
        this.actor.groupId,
        this.actor.index
      );
    }

    if (this._soloRange(range)) {
      return this._judgeSoloTarget(options);
    } else if (this._groupRange(range)) {
      return this._judgeGroupTarget(options);
    } else {
      return this._judgeAllTarget(options);
    }
  }

  /**
   * 新規出現戦闘者Idを取得する
   * @param effects
   * @returns
   */
  private _getNewBattlerIds(effects: ActionEffect[]) {
    if (this.actor.myself) {
      // 味方の場合は不可
      return [];
    }
    const callEffects = GameActionEffect.filterSpecialCode(
      effects,
      EActionEffectSpecial.Call
    );
    if (callEffects.length < 1) {
      return [];
    }

    const battlerIds: number[] = [];
    for (const effect of callEffects) {
      const entry = GameActionEffect.toNewEntry(effect, this.actor.dataId);
      const [, newBattlerId] = this.actor.selfUnit.getNewEntry({
        groupId: this.actor.groupId,
        same: entry.same,
        battlerId: entry.battlerId,
      });
      if (newBattlerId > 0) {
        battlerIds.push(newBattlerId);
      }
    }
    return battlerIds;
  }

  /**
   * いずれかの戦闘者の表示スペースがあるか
   * @param battlerIds
   * @returns
   */
  private _someAppear(battlerIds: number[]) {
    if (battlerIds.length === 0) {
      return false;
    }
    return battlerIds.some((id) => this.actor.selfUnit.checkDispArea(id));
  }

  /**
   * １体の行動判定
   * 攻撃＞一人でもダメージが0でなければランダムでami関係なしに選ぶ
   * 回復＞amiが先頭、最後、ランダムの場合一人でもダメージがあれば選ぶ
   *      他の場合、HPが減少しているターゲットを選ぶ
   *      HP高＞最大HPが高い
   *      HP低＞最大HPが低い
   *      効率的＞回復量が大きい
   * @param options
   * @returns
   */
  private _judgeSoloTarget(options: JudgeOptions): [boolean, number, number] {
    const groupIndices = options.groupIndices;
    const targetPoints: TargetPoint[] = groupIndices.flatMap((value) => {
      return value.list.map((index) => {
        return {
          point: this._gradingOne(value.index, index, options),
          group: value.index,
          index: index,
        };
      });
    });

    if (targetPoints.every((value) => value.point === 0)) {
      return [false, -1, -1];
    }
    if (options.random) {
      return [true, -1, -1];
    }

    Utils.shuffleArray(targetPoints);
    targetPoints.sort((a, b) => b.point - a.point);

    if (options.aim === EAimType.Effective) {
      for (const point of targetPoints) {
        if (this._judgeEffective(options, point)) {
          return [true, point.group, point.index];
        }
        return [false, -1, -1];
      }
    }

    const priorityTarget = targetPoints[0];
    const groupIndex = groupIndices.find(
      (value) => value.index === priorityTarget.group
    );
    if (!groupIndex) {
      GameLog.error('_judgeSoloTarget: groupIndex is null');
      return [false, -1, -1];
    }
    const index = this._selectOneIndexFromValidAim(
      options.unit,
      groupIndex,
      options.aim
    );
    return [true, groupIndex.index, index];
  }

  /**
   * 効率的判定
   * @param options
   * @param chosen
   * @returns
   */
  private _judgeEffective(options: JudgeOptions, chosen: TargetPoint) {
    const target = options.unit.get(chosen.group, chosen.index);
    if (!target) {
      return false;
    }
    const [mhp, myself] = [target.mhp, target.myself];
    const comparePoint =
      options.flexible > 0
        ? GameActionFigure.calcValue(options.flexible, mhp, myself)
        : 1;
    return chosen.point >= comparePoint;
  }

  /**
   * 自分自身の行動判定
   * @param options
   * @returns
   */
  private _judgeSelfTarget(options: JudgeOptions): [boolean, number, number] {
    const [group, index] = [this.actor.groupId, this.actor.index];
    const point = this._gradingOne(group, index, options);
    if (
      this._judgeEffective(options, {
        point: point,
        group: group,
        index: index,
      })
    ) {
      return [true, -1, -1];
    }

    return [false, -1, -1];
  }

  /**
   * グループの行動判定
   * @param options
   * @returns
   */
  private _judgeGroupTarget(options: JudgeOptions): [boolean, number, number] {
    const groupPoints: TargetPoint[] = options.groupIndices.map((value) => {
      const points = this._gradingGroup(value, options);
      const point = this._checkEvaluatePoints(points, options.more);
      return {
        index: value.list[0] ?? -1, // グループの代表
        group: value.index,
        point: Math.floor(point / value.list.length),
      };
    });
    if (groupPoints.every((value) => value.point === 0)) {
      return [false, -1, -1];
    }

    Utils.shuffleArray(groupPoints);
    groupPoints.sort((a, b) => b.point - a.point);
    if (options.aim === EAimType.Effective) {
      for (const point of groupPoints) {
        if (this._judgeEffective(options, point)) {
          return [true, point.group, point.index];
        }
        return [false, -1, -1];
      }
    }
    const priorityTarget = groupPoints[Utils.randomInt(0, groupPoints.length)];
    const groupIndex = options.groupIndices.find(
      (value) => value.index === priorityTarget.group
    );
    if (!groupIndex) {
      GameLog.error('_judgeGroupTarget: groupIndex is null');
      return [false, -1, -1];
    }
    return [true, groupIndex.index, -1];
  }

  /**
   * 全体の行動判定
   * @param options
   * @returns
   */
  private _judgeAllTarget(options: JudgeOptions): [boolean, number, number] {
    const points = this._gradingAll(options.groupIndices, options);
    const point = Math.floor(
      this._checkEvaluatePoints(points, options.more) / points.length
    );
    if (point === 0) {
      return [false, -1, -1];
    }
    if (options.aim === EAimType.Effective) {
      for (const value of options.groupIndices) {
        const target = options.unit.get(value.index, value.list[0] ?? -1);
        if (target) {
          if (
            this._judgeEffective(options, {
              point: point,
              group: value.index,
              index: value.list[0] ?? -1,
            })
          ) {
            return [true, -1, -1];
          }
        }
      }
    }
    return [true, -1, -1];
  }

  /**
   * 評価ポイント確認
   * @param points
   * @param more
   * @returns
   */
  private _checkEvaluatePoints(points: number[], more: number) {
    const available = points.filter((value) => value > 0);
    if (available.length === 0 || more > available.length) {
      return 0;
    }
    const total = available.reduce((total, point) => total + point);
    return total;
  }

  /**
   * １体の格付け
   * @param group
   * @param index
   * @param options
   * @returns
   */
  private _gradingOne(group: number, index: number, options: JudgeOptions) {
    const target = options.unit.get(group, index);
    if (!target) {
      return 0;
    }
    GameActionUtils.RandomOff();
    const point = this._evaluate(target, {
      effects: options.effects,
      total: 1,
      reverse: options.recover,
    });
    this.clearResult();
    GameActionUtils.RandomOn();
    return point;
  }

  /**
   * グループの格付け
   * @param groupIndex
   * @param options
   * @returns
   */
  private _gradingGroup(groupIndex: GameGroupIndex, options: JudgeOptions) {
    const targets = options.unit.getGroupMembers(
      groupIndex.index,
      groupIndex.list
    );
    GameActionUtils.RandomOff();
    const points = targets.map((target) => {
      this._result.clearEffect();
      return this._evaluate(target, {
        effects: options.effects,
        total: targets.length,
        reverse: options.recover,
      });
    });
    this.clearResult();
    GameActionUtils.RandomOn();
    return points;
  }

  /**
   * 全体の格付け
   * @param groupIndices
   * @param options
   * @returns
   */
  private _gradingAll(groupIndices: GameGroupIndex[], options: JudgeOptions) {
    const targets = options.unit.getMembers(groupIndices);
    GameActionUtils.RandomOff();
    const points = targets.map((target) => {
      this._result.clearEffect();
      return this._evaluate(target, {
        effects: options.effects,
        total: targets.length,
        reverse: options.recover,
      });
    });
    this.clearResult();
    GameActionUtils.RandomOn();
    return points;
  }

  /**
   * 評価の補正
   * @param point
   * @param strength
   * @returns
   */
  private _correctEvaluate(point: number, strength: number) {
    if (strength > EMeaninglessType.DoNot && point < 5) {
      return 0;
    }
    return point;
  }

  /**
   * 評価する
   * @param target
   * @param options
   * @returns
   */
  private _evaluate(target: GameBattler, options: EvaluateOptions) {
    if (this._checkReflection(target)) {
      // 反射であれば最低評価
      return 0;
    }
    this.executeEffects(target, options.effects);
    this._result.makeReport(this.actor, target, this._action, options.total);

    const hp = this._result.totalHpDamage;
    const state = this._evaluatePointState();
    const param = this._evaluatePointBuff(target);
    const release = this._evaluatePointRelease(target);
    const special = this._evaluateSpecial();

    const total = release + special;

    if (options.reverse) {
      return (
        this._reverseEvaluateTotal(
          target,
          hp,
          this._result.totalMpDamage,
          state,
          param
        ) + total
      );
    } else {
      const mp = Math.min(target.mp, this._result.totalMpDamage);
      const attackTotal = hp + mp + state + param;
      return attackTotal + total;
    }
  }

  /**
   * 回復の時の評価
   * HPの減少値を考慮する
   * @param target
   * @param hp
   * @param mp
   * @param state
   * @param param
   * @returns
   */
  private _reverseEvaluateTotal(
    target: GameBattler,
    hp: number,
    mp: number,
    state: number,
    param: number
  ) {
    hp = Math.min(-hp, target.mhp - target.hp);
    mp = Math.min(-mp, target.mmp - target.mp);
    return hp + mp + state + param;
  }

  /**
   * 状態を評価する
   * @returns
   */
  private _evaluatePointState() {
    return (
      this._result.addedStates.reduce((point, state) => {
        switch (state.result) {
          case EActionResultState.Valid:
            return point + 10;
          case EActionResultState.Invalid:
            return point + 1;
          default:
            return point;
        }
      }, 0) +
      this._result.removedStates.reduce((point, state) => {
        switch (state.result) {
          case EActionResultState.Valid:
            return point - 10;
          case EActionResultState.Invalid:
            return point - 1;
          default:
            return point;
        }
      }, 0)
    );
  }

  /**
   * バフを評価する
   * @param target
   * @returns
   */
  private _evaluatePointBuff(target: GameBattler) {
    let point = 0;
    for (let i = 0; i < this._result.buffLength; i++) {
      const value = target.buffMeanValue(i, this._result.addedBuffValue(i));
      point += value;
    }
    return point * -1;
  }

  /**
   * 除去を評価する
   * @param target
   * @returns
   */
  private _evaluatePointRelease(target: GameBattler) {
    let point = 0;
    for (const info of this._result.releaseInfos) {
      const { releaseId, type } = info;
      const [rangeId, paramListId] = GameNumberList.get(releaseId);
      if (type & EActionEffectReleaseType.State) {
        const [begin, end] = GameNumberList.get(rangeId);
        point += target.countStateFromPriority(begin, end);
      }
      if (type & EActionEffectReleaseType.Buff) {
        if (paramListId > 0) {
          point += target.countBuffed(GameNumberList.get(paramListId));
        } else {
          point += target.countBuffed();
        }
      }
    }
    return point * 10;
  }

  /**
   * 特殊行動の評価
   * @returns
   */
  private _evaluateSpecial() {
    return this._result.escapeEffectId > 0 ? 100 : 0;
  }

  /**
   * 使用可能かどうか
   * ・封じ込まれていない
   * ・MPがある
   * ・かき消された
   * など
   */
  usable() {
    if (this._checkSeal()) {
      return this._createSealedResult();
    }
    if (!this.mpCheck()) {
      return GameAction._createNotEnoughMpResult();
    }
    return GameAction._createUsableResult(true);
  }

  /**
   * MPが足りているか確認する
   * @returns
   */
  mpCheck() {
    return GameAction._mpCheck(this._actor, this._action);
  }

  /**
   * MPが足りているか確認する(static)
   * @param actor
   * @param action
   * @returns
   */
  protected static _mpCheck(actor: GameBattler, action: Action) {
    return actor.mp >= action.mpCost || actor.infiniteMp();
  }

  /**
   * 封印されているか確認する
   * @returns
   */
  protected _checkSeal() {
    return this.actor.checkSeal(this.actionType);
  }

  /**
   * MP不足の結果を作成
   * @returns
   */
  protected static _createNotEnoughMpResult() {
    const id = system.messageIds['notMpEnough'];
    return this._createUsableResult(false, false, id);
  }

  /**
   * 封印されていた結果を作成する
   * @returns
   */
  protected _createSealedResult() {
    const name = GameUtils.getSealName(this.actor.myself);
    const info = actionTypes[this.actionType];
    return GameAction._createUsableResult(false, true, info.messageIds[name]);
  }

  /**
   * 使用可能確認オブジェクトの作成
   * @param success
   * @param consume
   * @param text
   */
  protected static _createUsableResult(
    success: boolean,
    consume = false,
    id = 0
  ): [boolean, boolean, number] {
    return [success, consume, id];
  }

  /**
   * 会心かどうかの結果を反映
   * @param target
   * @param critical
   * @returns
   */
  resultCritical(critical: boolean) {
    const enableFn = () => critical;
    const resultFn = () => {
      const name = GameUtils.getCriticalName(this.actor.myself);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, () => 0, resultFn);
  }

  /**
   * HPダメージ結果を反映
   * @param target
   * @param value
   */
  resultHpDamage(target: GameBattler, value: number) {
    const enableFn = () => target.live && value > 0;
    const effectFn = () => this._attack(target, value);
    const resultFn = () => {
      const name = GameUtils.getDamageName(target.myself);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * HP吸収結果を反映
   * @param target
   * @param value
   */
  resultHpDrain(target: GameBattler, value: number) {
    const enableFn = () => this.actor.live && value > 0;
    const effectFn = () => this._recover(this.actor, value, true);
    const resultFn = () => {
      const name = GameUtils.getDrainName(target.myself);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * MPダメージ結果を反映
   * @param target
   * @param value
   */
  resultMpDamage(target: GameBattler, value: number) {
    const enableFn = () => target.live && value > 0;
    const effectFn = () => this._mpAttack(target, value);
    const resultFn = () => {
      const name = GameUtils.getMpDamageName(target.myself);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * MP吸収結果を反映
   * @param target
   * @param value
   */
  resultMpDrain(target: GameBattler, value: number) {
    const enableFn = () => this.actor.live;
    const effectFn = () => this._mpRecover(this.actor, value, true);
    const resultFn = () => {
      const name = GameUtils.getDrainName(target.myself);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * HP回復結果を反映
   * @param target
   * @param value
   */
  resultHpRecover(target: GameBattler, value: number) {
    const enableFn = () => {
      if (value >= 0) {
        return false;
      }
      if (!target.live) {
        this._result.removeHpAttack();
        return false;
      }
      if (this._action.safety && target.mhp === target.hp) {
        this._result.removeHpDamage();
        return false;
      }
      return true;
    };
    const effectFn = () => this._recover(target, -value);
    const resultFn = () => {
      const name = GameUtils.getRecoverName(target.myself);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * MP回復結果を反映
   * @param target
   * @param value
   */
  resultMpRecover(target: GameBattler, value: number) {
    const enableFn = () => {
      if (value >= 0) {
        return false;
      }
      if (!target.live) {
        this._result.removeMpAttack();
        return false;
      }
      if (this._action.safety && target.mmp === target.mp) {
        this._result.removeMpDamage();
        return false;
      }
      return true;
    };
    const effectFn = () => this._mpRecover(target, -value);
    const resultFn = () => {
      const name = GameUtils.getRecoverMpName(target.myself);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * 能力増減結果を反映
   * @param target
   * @param id
   */
  resultBuffedParam(target: GameBattler, id: number) {
    const value = this._result.addedBuffValue(id);
    const turn = this._result.addedBuffTurn(id);
    const enableFn = () => target.live && value !== 0;
    const effectFn = () => this._buff(target, value, turn, id);
    const resultFn = (effectValue: number) => {
      const name = this._getResultBuffSystemName(target, value, effectValue);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * 成長増減結果を反映
   * @param target
   * @param id
   */
  resultGrowthParam(target: GameBattler, id: number) {
    const value = this._result.addedGrowthValue(id);
    const enableFn = () => {
      if (value === 0) {
        return false;
      }
      if (!target.live) {
        this._result.clearGrowthValue(id);
        return false;
      }
      return true;
    };
    const effectFn = () => this._growth(target, value, id);
    const resultFn = (effectValue: number) => {
      const name = this._getResultGrowthSystemName(target, value, effectValue);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * 継続増減結果のシステム名を取得する
   * @param target
   * @param value
   * @param effectValue
   * @returns
   */
  private _getResultBuffSystemName(
    target: GameBattler,
    value: number,
    effectValue: number
  ) {
    if (effectValue === 0) {
      // 効いたけど限界まで達している
      return value > 0
        ? GameUtils.getGoneUpName(target.myself)
        : GameUtils.getGoneDownName(target.myself);
    } else {
      return effectValue > 0
        ? GameUtils.getBuffName(target.myself)
        : GameUtils.getDebuffName(target.myself);
    }
  }

  /**
   * 成長増減結果のシステム名を取得する
   * @param target
   * @param value
   * @param effectValue
   * @returns
   */
  private _getResultGrowthSystemName(
    target: GameBattler,
    value: number,
    effectValue: number
  ) {
    if (effectValue === 0) {
      // 効いたけど限界まで達している
      return value > 0
        ? GameUtils.getGoneUpName(target.myself)
        : GameUtils.getGoneDownName(target.myself);
    } else {
      return effectValue > 0
        ? GameUtils.getBuffName(target.myself)
        : GameUtils.getDebuffName(target.myself);
    }
  }

  /**
   * 状態追加結果を反映
   * @param target
   * @param stateId
   */
  resultAddedState(target: GameBattler, stateInfo: ActionResultState) {
    const enableFn = () => target.live;
    const effectFn = () => {
      if (stateInfo.result !== EActionResultState.Valid) {
        return 0;
      }
      target.addState(stateInfo.id, stateInfo.overId);
      if (!target.live) {
        this._setRewordRate(target);
      }
      if (
        GameUtils.getState(stateInfo.id).restriction > EStateRestriction.Auto
      ) {
        this._removeTurnStates();
      }
      return 0;
    };
    const resultFn = () => {
      const name = this._getResultAddStateSystemName(target, stateInfo.result);
      return name === null
        ? null
        : this._getStateInfo(stateInfo.id, stateInfo.overId, name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * 状態付与結果のシステム名を取得する
   * @param target
   * @param result
   * @returns
   */
  private _getResultAddStateSystemName(
    target: GameBattler,
    result: EActionResultState
  ) {
    switch (result) {
      case EActionResultState.Already:
        return GameUtils.getAlreadyName(target.myself);
      case EActionResultState.Valid:
        return GameUtils.getDamageName(target.myself);
      case EActionResultState.Invalid:
      case EActionResultState.Failed:
        return null;
    }
    return null;
  }

  /**
   * 状態除去結果を反映
   * @param target
   * @param stateId
   */
  resultRemovedState(target: GameBattler, stateInfo: ActionResultState) {
    const { id: stateId, result } = stateInfo;
    const enableFn = () => {
      // 回復可能でなかったら何もしない
      if (!target.stateRemoval(stateId)) {
        // 実行時にはじいているのでここにくることはない
        return false;
      }
      return true;
    };
    const effectFn = () => {
      if (result !== EActionResultState.Valid) {
        this._result.removeGuard();
        return 0;
      }
      if (!this._removeDown(target, stateId)) {
        return -1;
      }
      const beforeLive = target.live;
      if (!target.recoverState(stateId)) {
        return -1;
      }
      const currentLive = target.live;
      if (beforeLive !== currentLive) {
        // ばたん状態が回復していれば
        // 回復に設定している値が加算される
        if (this._result.hpDamage >= 0) {
          this._result.replaceHpDamage(-1);
        }
        this._riseRecover(target, -this._result.hpDamage);
        // ガードされていたら解いておく
        this._result.removeGuard();
      }
      if (GameUtils.getState(stateId).restriction > EStateRestriction.Auto) {
        this._removeTurnStates();
      }
      return 0;
    };
    const resultFn = (value: number): [string, number] | null => {
      if (value < 0) {
        return null;
      }
      const name = this._getResultRemoveStateSystemName(target, result);
      return name === null
        ? null
        : this._getStateInfo(stateInfo.id, stateInfo.overId, name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * 復活位置の調整
   * @param target
   * @returns
   */
  private _removeDown(target: GameBattler, stateId: number) {
    if (!target.down || target.downStateTypeId !== states[stateId].type) {
      return true;
    }
    return target.selfUnit.adjustBattlerDispArea(target.groupId, target.index);
  }

  /**
   * 復活時のHP回復
   * @param target
   * @param hp
   */
  private _riseRecover(target: GameBattler, hp: number) {
    const value = Math.max(hp, 1);
    this._recover(target, value);
  }

  /**
   * 状態付与結果のシステム名を取得する
   * @param target
   * @param result
   * @returns
   */
  private _getResultRemoveStateSystemName(
    target: GameBattler,
    result: EActionResultState
  ) {
    switch (result) {
      case EActionResultState.Valid:
        return GameUtils.getRecoverName(target.myself);
      case EActionResultState.Invalid:
      case EActionResultState.Failed:
        return 'failedRecover';
    }
    return null;
  }

  /**
   * 効果解除結果を反映
   * @param target
   * @param releaseInfo
   * @returns
   */
  resultRelease(target: GameBattler, releaseInfo: ActionEffectRelease) {
    const enableFn = () => target.live;
    const { releaseId, type, dispInfo } = releaseInfo;
    const effectFn = () => {
      const [rangeId, paramListId] = GameNumberList.get(releaseId);
      if (type & EActionEffectReleaseType.State) {
        const [begin, end] = GameNumberList.get(rangeId);
        target.recoverStateFromPriority(begin, end);
      }
      if (type & EActionEffectReleaseType.Buff) {
        if (paramListId > 0) {
          target.removeBuffParams(GameNumberList.get(paramListId));
        } else {
          target.removeAllBuffParams();
        }
      }
      return 0;
    };
    const resultFn = (): [string, number] | null => {
      const [textId, animeId] = GameNumberList.get(dispInfo);
      const text = GameUtils.getMessage(textId);
      return [text, animeId];
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * 効果なしを反映
   * 無効タイプにより分岐する
   * @param target
   */
  resultNoEffect(target: GameBattler) {
    const resultFn = () => {
      const name = this._getNoEffectName(target.myself);
      if (!name) {
        return null;
      }
      return GameActionType.getResultInfo(this._result.actionTypeId, name);
    };
    return this._resultEffectProcess(
      () => true,
      () => 0,
      resultFn
    );
  }

  /**
   * 効果なしの場合のプロパティ名を取得する
   * @param myself
   * @returns
   */
  private _getNoEffectName(myself: boolean) {
    if (this._result.failedHit) {
      return GameUtils.getFailedHitName(myself);
    } else if (this._result.miss) {
      return GameUtils.getEvasionName(myself);
    } else if (this._result.block) {
      return GameUtils.getNoDamageName(myself);
    } else {
      return null;
    }
  }

  /**
   * 攻撃でばたんになった
   * @param target
   */
  resultDown(target: GameBattler, damage: boolean) {
    const enableFn = () => target.down && damage;
    const effectFn = () => {
      this._setRewordRate(target);
      return 0;
    };
    const resultFn = () => {
      const name = GameUtils.getDownName(target.myself);
      return this._getSystemInfo(name);
    };
    return this._resultEffectProcess(enableFn, effectFn, resultFn);
  }

  /**
   * 仲間を呼んだを反映
   * @param group
   * @param battlerId
   * @returns
   */
  resultCalledBattler(entry: NewEntry) {
    const target = this.actor.selfUnit.makeNewEntry({
      same: entry.same,
      groupId: this._actor.groupId,
      battlerId: entry.battlerId,
    });
    if (!target) {
      return null;
    }
    if (this._result.batchDisp || !entry.effectId) {
      return { base: this._createEffectResultBase('', 0), target };
    }
    const [textId, animId] = GameNumberList.get(entry.effectId);
    return {
      base: this._createEffectResultBase(GameUtils.getMessage(textId), animId),
      target,
    };
  }

  /**
   * 逃げるを設定
   * @param target
   */
  protected _setEscape(target: GameBattler) {
    this._setRewordRate(target);
  }

  /**
   * 報酬率を設定する
   * @param target
   */
  private _setRewordRate(target: GameBattler) {
    target.lostBattle(this.extra);
  }

  /**
   * なにもおこらなかった
   */
  resultNoHappen() {
    const text = GameUtils.getSystemMessage('noEffect');
    const animeId = 0;
    return this._createEffectResultBase(text, animeId);
  }

  /**
   * 状態対象外
   */
  resultOutState(stateTypeId: number) {
    const resultFn = (): [string, number] | null => {
      const stateType = GameUtils.getStateType(stateTypeId);
      if (!stateType.outMessageId) {
        return null;
      }
      return [GameUtils.getMessage(stateType.outMessageId), 0];
    };
    return this._resultEffectProcess(
      () => true,
      () => 0,
      resultFn
    );
  }

  /**
   * 効果の結果反映処理
   * @param enableFn
   * @param effectFn
   * @param batchDisp
   * @param resultFn
   */
  private _resultEffectProcess(
    enableFn: () => boolean,
    effectFn: () => number,
    resultFn: (effectValue: number) => [string, number] | null
  ) {
    if (!enableFn()) {
      return null;
    }
    const effectValue = effectFn();
    if (this._result.batchDisp) {
      return null;
    }
    const result = resultFn(effectValue);
    return result === null
      ? null
      : this._createEffectResultBase(result[0], result[1], effectValue);
  }

  /**
   * システム情報を取得
   * @param name
   */
  private _getSystemInfo(name: string): [string, number] {
    const text = GameUtils.getSystemMessage(name);
    const animeId = system.animationIds[name] ?? 0;
    return [text, animeId];
  }

  /**
   * 状態情報を取得
   * @param id
   * @param name
   */
  private _getStateInfo(
    id: number,
    overId: number,
    name: string
  ): [string, number] {
    const result: [string, number] = ['', 0];
    const ids = overId
      ? GameUtils.getStateOverIdsFromName(overId, name)
      : [0, 0];
    result[0] = ids[0]
      ? GameUtils.getMessage(ids[0])
      : GameUtils.getStateMessage(id, name);
    result[1] = ids[1]
      ? ids[1]
      : (GameUtils.getStateAnimationId(id, name) ?? 0);

    return result;
  }

  /**
   * 攻撃反映
   * @param target
   * @param value
   */
  private _attack(target: GameBattler, value: number) {
    target.gainHp(-value);
    GameUtils.setSlotPointValue(value);
    return value;
  }

  /**
   * MP攻撃反映
   * @param target
   * @param value HPと違い0までの変化分となる
   * @returns
   */
  private _mpAttack(target: GameBattler, value: number) {
    const changeValue = target.infiniteMp() ? value : -target.gainMp(-value);
    GameUtils.setSlotPointValue(changeValue);
    GameUtils.setConsumeParamValueFromId(EActionEffectValue1.Mp);
    return changeValue;
  }

  /**
   * 回復反映
   * @param target
   * @param value
   */
  private _recover(target: GameBattler, value: number, drain = false) {
    const effectValue = target.gainHp(value);
    const meanValue = drain ? value : effectValue;
    GameUtils.setSlotPointValue(meanValue);
    GameUtils.setConsumeParamValueFromId(EActionEffectValue1.Hp);
    return meanValue;
  }

  /**
   * MP回復反映
   * @param target
   * @param value
   */
  private _mpRecover(target: GameBattler, value: number, drain = false) {
    const effectValue = target.gainMp(value);
    const meanValue = drain ? value : effectValue;
    GameUtils.setSlotPointValue(meanValue);
    GameUtils.setConsumeParamValueFromId(EActionEffectValue1.Mp);
    return meanValue;
  }

  /**
   * 能力増減値を取得
   * @param target
   * @param value
   * @param id
   */
  private _buff(target: GameBattler, value: number, turn: number, id: number) {
    const effectValue = target.addBuffParam(id, value, turn);
    GameUtils.setSlotPointValue(effectValue > 0 ? effectValue : -effectValue);
    GameUtils.setParamValueFromId(id);
    return effectValue;
  }

  /**
   * 成長増減値を取得
   * @param target
   * @param value
   * @param id
   */
  private _growth(target: GameBattler, value: number, id: number) {
    const effectValue = target.addPlusParam(id, value);
    GameUtils.setSlotPointValue(effectValue > 0 ? effectValue : -effectValue);
    GameUtils.setMemberParamValueFromId(id);
    if (!effectValue) {
      // 成長上限値に達していた場合
      this._result.limitGrowthValue(id);
    }
    return effectValue;
  }

  /**
   * 行動を実行する
   * @param target
   */
  executeAction(target: GameBattler) {
    if (this._action.hitRateId) {
      const sLuk = this.actor.luk;
      const tLuk = target.luk;
      const baseHit = GameRate.div(this._action.hitRateId, this.actor.hit);
      const hit = this._correctHitValueRace(target, baseHit);
      const eva = this._correctEva(target.evasion, hit);
      if (!this._checkHit(hit, sLuk, tLuk)) {
        // 当たらなかった場合
        this._result.setFailedHit();
      } else if (this._checkEvasion(target, eva, sLuk, tLuk)) {
        // よけられた場合
        this._result.setMiss();
      }
    }
    if (!this._result.failedHit && !this._result.miss) {
      if (this._checkReflection(target)) {
        this._result.setReflectionTarget(this._actor);
      }
      const toTarget = this._executedTarget(target);
      this._setSwitchingAction(toTarget);
      if (
        this._action.limitStateTypeId > 0 &&
        !toTarget.hasStateType(this._action.limitStateTypeId)
      ) {
        // 限定状態外のときはeffectsを反映させない
        this._executeOutState(this._action.limitStateTypeId);
      } else {
        // 効果を適用する
        const effects = this._getEffects();
        this.executeEffects(toTarget, effects);
      }
    }
    // 使用者と対象が同一の場合反射しないので反射を考慮しない
    this._result.makeReport(
      this.actor,
      target,
      this._action,
      this._targetLength
    );
  }

  /**
   * 実行対象を取得する
   * @param target
   * @returns
   */
  protected _executedTarget(target: GameBattler) {
    return this._result.reflectionTarget ?? target;
  }

  /**
   * 反射か確認する
   * @param target
   * @returns
   */
  private _checkReflection(target: GameBattler) {
    if (!this.actionType || target === this.actor) {
      return;
    }
    const rateIds = target.getReflectionRateIds(this.actionType);
    return GameActionUtils.someJudge(rateIds);
  }

  /**
   * すり替え行動の設定
   * @param target
   * @returns
   */
  private _setSwitchingAction(target: GameBattler) {
    const switchingId = this.extra.switchingId;
    if (!switchingId) {
      return false;
    }
    const list = GameNumberList.get(switchingId);
    for (const mapId of list) {
      const info = GameNumberMap.get(mapId);
      const result = this._checkSwitchingActionCondition(info.key, target);
      if (result) {
        this._result.setBackActionId(this.actionId);
        this.setActionId(info.value);
        return true;
      }
    }
    return false;
  }

  /**
   * すり替え行動の条件を確認する
   * @param id
   * @param target
   * @returns
   */
  private _checkSwitchingActionCondition(id: number, target: GameBattler) {
    const condition = GameNumberMap.get(id);
    switch (condition.key) {
      case EActionSwitchCondition.Rate:
        return GameRate.judge(condition.value);
      case EActionSwitchCondition.SubParam:
        return this._checkSwitchingActionSubParam(condition.value, target);
      case EActionSwitchCondition.ElementDef:
        return this._judgeDamageCut(condition.value, target);
    }
    return false;
  }

  /**
   * すり替え行動サブパラメータを判定する
   * @param id
   * @param target
   * @returns
   */
  private _checkSwitchingActionSubParam(id: number, target: GameBattler) {
    switch (id) {
      case 0:
        return GameRate.judgeWithCoefficient(
          system.subParamRateId,
          this._actor.critical
        );
      case 1:
        return GameRate.judgeWithCoefficient(
          system.subParamRateId,
          target.evasion
        );
      case 2:
        return GameRate.judgeWithCoefficient(
          system.subParamRateId,
          this._actor.hit
        );
    }
    return false;
  }

  /**
   * 使用者効果を実行する
   * @param target
   */
  executeUserEffect(target: GameBattler) {
    const effectId = this.extra.userEffectId;
    const effect = actionEffects[effectId];
    this.executeEffect(target, effect);
    this._result.makeReport(this.actor, target, this._action, 1);
  }

  /**
   * 種族で命中値を補正する
   * @param target
   * @param baseHit
   * @returns
   */
  private _correctHitValueRace(target: GameBattler, baseHit: number) {
    if (!this._action.hitRaceValueId) {
      return baseHit;
    }
    const list = GameNumberList.get(this._action.hitRaceValueId);
    const figureId = GameNumberMap.findForList(list, target.raceId);
    if (figureId) {
      return GameActionFigure.calcValue(figureId, baseHit, target.myself);
    } else {
      return baseHit;
    }
  }

  /**
   * 回避率補正
   * 命中の値が基準値をこえていた分、回比率を下げる
   * 実質命中率の限界をこえた値を持っている場合に適用される
   * @param eva
   * @param hit
   * @returns
   */
  private _correctEva(eva: number, hit: number) {
    const [, max] = GameRate.operation(system.subParamRateId);
    const minus = Math.max(0, hit - max);
    return Math.max(0, eva - minus);
  }

  /**
   * 命中かどうか
   * @returns
   */
  private _checkHit(hit: number, sLuk: number, tLuk: number) {
    const [num, max] = GameRate.operation(system.subParamRateId);
    return GameRate.luckBiosJudgeFromValue(
      num * hit,
      max,
      system.hitLuckId,
      sLuk,
      tLuk
    );
  }

  /**
   * 回避判定
   * evaが 0 の場合でも運により回避の可能性がある
   * @param target
   * @returns
   */
  private _checkEvasion(
    target: GameBattler,
    eva: number,
    sLuk: number,
    tLuk: number
  ) {
    // 行動不可状態なら回避なし
    if (!target.actionable) {
      return false;
    }
    const [num, max] = GameRate.operation(system.subParamRateId);
    // 成功判定を行うため回避の場合は運対象が逆になる
    return GameRate.luckBiosJudgeFromValue(
      num * eva,
      max,
      system.evasionLuckId,
      tLuk,
      sLuk
    );
  }

  /**
   * 状態外の行動を実行
   * @param stateTypeId
   */
  private _executeOutState(stateTypeId: number) {
    this._result.setTypeOutState();
    this._result.setLimitStateTypeId(stateTypeId);
  }

  /**
   * ターン効果が存在するか
   * @returns
   */
  protected _existTurnEffect(): boolean {
    return this._getEffectIds().some((effectId) => {
      return actionEffects[effectId].code === EActionEffectCode.TurnCorrect;
    });
  }

  /**
   * 行動の効果オブジェクトを取得
   */
  protected _getEffects(): ActionEffect[] {
    return GameActionEffect.effects(this._getEffectIds());
  }

  /**
   * 行動の効果Idを取得
   * @returns
   */
  protected _getEffectIds(): number[] {
    const effectIds = structuredClone(this._action.effectIds);
    if (this._action.weapon & EWeaponEffect.Effect) {
      // 武器の追加効果
      const addEffectId = this.actor.addEffectId();
      if (addEffectId > 0) {
        effectIds.push(addEffectId);
      }
    }
    return effectIds;
  }

  /**
   * HP行動の効果オブジェクトを取得する
   * @returns
   */
  private _getHpEffects(): ActionEffect[] {
    return this._getEffects().filter(
      (effect) =>
        GameActionEffect.directCodes.includes(effect.code) &&
        effect.value1 === EActionEffectValue1.Hp
    );
  }

  /**
   * 回復行動の効果オブジェクトを取得する
   * @returns
   */
  private _getRecoverEffects(): ActionEffect[] {
    return this._getEffects().filter(
      (effect) =>
        [
          EActionEffectCode.Calc,
          EActionEffectCode.Figure,
          EActionEffectCode.State,
        ].includes(effect.code) && effect.type === EActionEffectType.Plus
    );
  }

  /**
   * 全効果を実行するが
   * 対象者には反映せず適用すべき結果を返す
   * @param target
   * @param effects
   */
  executeEffects(target: GameBattler, effects: ActionEffect[]) {
    if (effects.length < 1) {
      return;
    }
    this._result.setTypeApply();
    effects.forEach((effect) => {
      this.executeEffect(target, effect);
    });
  }

  /**
   * 効果を実行し適用すべき結果を返す
   * @param target
   * @param effect
   */
  executeEffect(target: GameBattler, effect: ActionEffect) {
    switch (effect.code) {
      case EActionEffectCode.Calc:
        this._executeEffect1(target, effect);
        break;
      case EActionEffectCode.Figure:
        this._executeEffect2(target, effect);
        break;
      case EActionEffectCode.State:
        this._executeEffect3(target, effect);
        break;
      case EActionEffectCode.Buff:
        this._executeEffect4(target, effect);
        break;
      case EActionEffectCode.Release:
        this._executeEffect5(target, effect);
        break;
      case EActionEffectCode.TurnCorrect:
        break;
      case EActionEffectCode.Growth:
        this._executeEffect7(target, effect);
        break;
      case EActionEffectCode.Script:
        this._executeEffect8(target, effect);
        break;
      case EActionEffectCode.Special:
        this._executeEffect9(target, effect);
    }
  }

  /**
   * 計算ダメージを実行
   * @param target
   * @param effect
   */
  private _executeEffect1(target: GameBattler, effect: ActionEffect) {
    if (!this._enableEffectConsumeParam(effect.value1)) {
      return;
    }

    switch (effect.type) {
      case EActionEffectType.Minus:
        this._executeEffectStrike(target, effect, Utils.getAsFn);
        break;
      case EActionEffectType.Plus:
        this._executeEffectStrike(target, effect, Utils.getMinusFn);
        break;
      case EActionEffectType.Drain:
        this._executeEffectStrike(target, effect, Utils.getAsFn, true);
        break;
    }
  }

  /**
   * 直接ダメージ値を結果に格納
   * @param target
   * @param effect
   * @param calcFn
   */
  private _executeEffectStrike(
    target: GameBattler,
    effect: ActionEffect,
    calcFn: (number) => number,
    drain = false
  ) {
    const baseValue = GameActionStrike.operation(
      effect.refId,
      this._actor,
      target
    );
    const list = GameNumberList.get(effect.value2);
    const rateId = list
      ? Utils.upperLimitedElement(list, this._targetLength - 1)
      : 0;
    const correctValue = GameRate.div(rateId, baseValue);
    const value = this._calcDamageCut(correctValue, effect.elementId, target);

    if (drain) {
      this._addResultDrain(calcFn(value), effect.value1);
    } else {
      this._addResultDamage(calcFn(value), effect.value1);
    }
  }

  /**
   * ターゲット数を取得する
   */
  protected get _targetLength() {
    return 1;
  }

  /**
   * 固定ダメージを実行
   * @param target
   * @param effect
   */
  private _executeEffect2(target: GameBattler, effect: ActionEffect) {
    if (!this._enableEffectConsumeParam(effect.value1)) {
      return;
    }
    // ダメージなので正負が逆転する
    switch (effect.type) {
      case EActionEffectType.Minus:
        this._executeEffectFigure(target, effect, Utils.getAsFn);
        break;
      case EActionEffectType.Plus:
        this._executeEffectFigure(target, effect, Utils.getMinusFn);
        break;
      case EActionEffectType.Drain:
        this._executeEffectFigure(target, effect, Utils.getAsFn, true);
        break;
    }
  }

  /**
   * 消耗値効果可能パラメータかどうか
   * @param paramId
   * @returns
   */
  private _enableEffectConsumeParam(paramId: number) {
    return (
      paramId === EActionEffectValue1.Hp || paramId === EActionEffectValue1.Mp
    );
  }

  /**
   * 固定ダメージ値を結果に格納
   * @param target
   * @param effect
   * @param calcFn
   */
  private _executeEffectFigure(
    target: GameBattler,
    effect: ActionEffect,
    calcFn: (number) => number,
    drain = false
  ) {
    // 対象パラメータを取得
    const param = target.fixedParam(effect.value1);
    const baseValue = GameActionFigure.calcValueAffectMagicParam(
      effect.refId,
      param,
      this.actor.myself,
      this.actor,
      target,
      effect.magicId,
      effect.luckId
    );
    const value = this._calcDamageCut(baseValue, effect.elementId, target);
    if (drain) {
      this._addResultDrain(calcFn(value), effect.value1);
    } else {
      this._addResultDamage(calcFn(value), effect.value1);
    }
  }

  /**
   * 効果数値取得
   * @param effect
   * @param baseValue
   * @returns
   */
  private _effectFigureValue(effect: ActionEffect, baseValue: number) {
    return GameActionFigure.calcValue(
      effect.refId,
      baseValue,
      this.actor.myself
    );
  }

  /**
   * 結果ダメージを追加する
   * @param value
   * @param paramId
   */
  private _addResultDamage(value: number, paramId: number) {
    switch (paramId) {
      case EActionEffectValue1.Hp:
        this._result.setHpAttack();
        this._result.addHpDamage(value);
        break;
      case EActionEffectValue1.Mp:
        this._result.setMpAttack();
        this._result.addMpDamage(value);
        break;
    }
  }

  /**
   * 結果吸収を追加する
   * @param value
   * @param paramId
   */
  private _addResultDrain(value: number, paramId: number) {
    switch (paramId) {
      case EActionEffectValue1.Hp:
        this._result.setHpAttack();
        this._result.addHpDrain(value);
        break;
      case EActionEffectValue1.Mp:
        this._result.setMpAttack();
        this._result.addMpDrain(value);
        break;
    }
  }

  /**
   * ダメージ軽減計算
   * @param value
   * @param elementId
   * @param target
   * @returns
   */
  private _calcDamageCut(
    value: number,
    elementId: number,
    target: GameBattler
  ) {
    const figureIds = target.getElementDamageCutFigures(elementId);
    const newValue = this.actor.applyFigures(value, figureIds);
    const [num, max] = this._damageCutRateFromElementId(elementId, target);
    return Math.floor((newValue * num) / max);
  }

  /**
   * 属性Idからダメージ軽減率を取得する
   * @param id
   * @param target
   * @returns
   */
  private _damageCutRateFromElementId(elementId: number, target: GameBattler) {
    if (!elementId) {
      return [1, 1];
    }
    const cutId = system.elements[elementId].cutId;
    return GameDamageCut.getCutRate(
      cutId,
      target.getElementDef(elementId),
      0,
      0,
      0
    );
  }

  /**
   * 状態変化を実行
   * @param target
   * @param effect
   */
  private _executeEffect3(target: GameBattler, effect: ActionEffect) {
    switch (effect.type) {
      case EActionEffectType.Minus:
        this._executeEffectAddState(target, effect);
        break;
      case EActionEffectType.Plus:
        this._executeEffectRemoveState(target, effect);
        break;
    }
  }

  /**
   * 状態付与を実行
   * @param target
   * @param effect
   */
  private _executeEffectAddState(target: GameBattler, effect: ActionEffect) {
    const [condition, rateId] = GameNumberList.get(effect.value2);
    const stateId = effect.refId;
    const state = states[stateId];
    if (!state.updatable && target.stateAlready(stateId)) {
      this._result.pushAddedState(
        stateId,
        effect.value1,
        condition,
        EActionResultState.Already
      );
      return;
    }
    this._result.setInDirectAttack();
    const resultState = this._getEffectStateJudge(target, rateId, effect);
    if (resultState > EActionResultState.Valid) {
      return;
    }
    this._result.pushAddedState(stateId, effect.value1, condition, resultState);
  }

  /**
   * 状態解除を実行
   * @param target
   * @param effect
   */
  private _executeEffectRemoveState(target: GameBattler, effect: ActionEffect) {
    const [condition, rateId] = GameNumberList.get(effect.value2);
    const stateId = effect.refId;
    if (!target.stateRemoval(stateId)) {
      return;
    }
    this._result.setInDirectAttack();
    let resultState = this._getEffectStateJudge(target, rateId, effect);
    // 表示領域チェック
    if (resultState === EActionResultState.Valid) {
      if (!this._checkRevivalArea(target, stateId)) {
        resultState = EActionResultState.Failed;
      }
    }
    this._result.pushRemovedState(
      stateId,
      effect.value1,
      condition,
      resultState
    );
  }

  /**
   * 復活時の表示エリア確認
   * @param target
   * @param id
   * @returns
   */
  private _checkRevivalArea(target: GameBattler, id: number) {
    if (
      !target.down ||
      GameUtils.getStateTypeOfStateId(id).id !== target.downStateTypeId
    ) {
      return true;
    }
    return (
      target.selfUnit.checkBattlerDispArea(target.groupId, target.index) ||
      target.selfUnit.checkDispArea(target.dataId)
    );
  }

  /**
   * 状態変化判定を取得する
   * @param target
   * @param effect
   * @returns
   */
  private _getEffectStateJudge(
    target: GameBattler,
    rateId: number,
    effect: ActionEffect
  ) {
    const success = GameActionParamRate.judgeMagic({
      rateId,
      actor: this.actor,
      target: target,
      magicId: effect.magicId,
      luckId: effect.luckId,
    });
    if (success) {
      return this._judgeDamageCut(effect.elementId, target)
        ? EActionResultState.Valid
        : EActionResultState.Invalid;
    } else {
      return EActionResultState.Failed;
    }
  }

  /**
   * ダメージ軽減の有効無効を判定する
   * @param elementId
   * @param target
   * @returns
   */
  private _judgeDamageCut(elementId: number, target: GameBattler) {
    if (!elementId) {
      return true;
    }
    const cutId = system.elements[elementId].cutId;
    return GameDamageCut.judge(cutId, target.getElementDef(elementId), 0, 0, 0);
  }

  /**
   * パラメータ変化
   * @param target
   * @param effect
   */
  private _executeEffect4(target: GameBattler, effect: ActionEffect) {
    switch (effect.type) {
      case 0:
        this._executeEffectParam(target, effect, Utils.getMinusFn);
        break;
      case 1:
        this._executeEffectParam(target, effect, Utils.getAsFn);
        break;
    }
  }

  /**
   * パラメータ変化を実行
   * @param target
   * @param effect
   * @param calcFn
   */
  private _executeEffectParam(
    target: GameBattler,
    effect: ActionEffect,
    calcFn: (number) => number
  ) {
    const [condition, rateId] = GameNumberList.get(effect.value2);
    const success = GameActionParamRate.judgeMagic({
      rateId,
      actor: this.actor,
      target: target,
      magicId: effect.magicId,
      luckId: effect.luckId,
    });
    if (success) {
      const [paramId, turnsId, magicId = 0, luckId = 0] = GameNumberList.get(
        effect.value1
      );
      const param = target.fixedParam(paramId);
      const baseValue = GameActionFigure.calcValueAffectMagicParam(
        effect.refId,
        param,
        this.actor.myself,
        this.actor,
        target,
        magicId,
        luckId
      );
      const value = this._calcDamageCut(baseValue, effect.elementId, target);
      const turns = turnsId ? GameNumberList.randomInt(turnsId) : -1;
      this._result.pushBuffInfo(paramId, calcFn(value), condition, turns);
    }
    this._result.setInDirectAttack();
  }

  /**
   * 効果解除
   * @param target
   * @param effect
   */
  private _executeEffect5(_: GameBattler, effect: ActionEffect) {
    this._result.pushReleaseInfo(effect.refId, effect.type, effect.value1);
  }

  /**
   * パラメータ変化を実行
   * @param target
   * @param effect
   */
  private _executeEffect7(target: GameBattler, effect: ActionEffect) {
    if (!target.enableGrowthParam(effect.value1)) {
      return;
    }

    switch (effect.type) {
      case EActionEffectType.Minus:
        this._executeEffectGrowth(target, effect, Utils.getMinusFn);
        break;
      case EActionEffectType.Plus:
        this._executeEffectGrowth(target, effect, Utils.getAsFn);
        break;
    }
  }

  /**
   * 成長値を結果に格納
   * @param target
   * @param effect
   * @param calcFn
   */
  private _executeEffectGrowth(
    target: GameBattler,
    effect: ActionEffect,
    calcFn: (number) => number
  ) {
    const param = target.fixedParam(effect.value1);
    const baseValue = GameActionFigure.calcValueAffectMagicParam(
      effect.refId,
      param,
      this.actor.myself,
      this.actor,
      target,
      effect.magicId,
      effect.luckId
    );
    const value = this._calcDamageCut(baseValue, effect.elementId, target);
    this._result.plusGrowthValue(effect.value1, calcFn(value));
  }

  /**
   * スクリプト
   * @param effect
   */
  protected _executeEffect8(_: GameBattler, effect: ActionEffect) {
    this._result.setScriptId(effect.refId);
  }

  /**
   * 特殊効果を実行する
   * @param target
   * @param effect
   * @returns
   */
  private _executeEffect9(_: GameBattler, effect: ActionEffect) {
    switch (effect.refId) {
      case EActionEffectSpecial.Escape:
        this._executeEffectEscape(effect);
        break;
    }
  }

  /**
   * 逃げる効果を実行する
   * @param effect
   */
  private _executeEffectEscape(effect: ActionEffect) {
    this._result.setEscapeEffectId(effect.value2);
  }

  /**
   * パーティ効果を実行する
   * @param effect
   */
  executePartyEffect(effect: ActionEffect) {
    switch (effect.code) {
      case EActionEffectCode.Encounter:
        this._executeEffect10(effect);
        break;
      case EActionEffectCode.FloorDamage:
        this._executeEffect11(effect);
        break;
    }
  }

  /**
   * エンカウント調整を実行する
   * @param effect
   */
  private _executeEffect10(effect: ActionEffect) {
    this._result.setTypeParty();
    const list = GameNumberList.get(effect.refId);
    gameParty.setEncounterAdjust(effect.elementId, {
      rateId: list[0] ?? 0,
      diffLevel: list[1] ?? 0,
      preemptiveIds: [list[2] ?? 0, list[3] ?? 0, list[4] ?? 0, list[5] ?? 0],
      steps: effect.value1 ?? 0,
      scriptId: effect.value2 ?? 0,
    });
  }

  /**
   * 床ダメージ調整を実行する
   * @param effect
   */
  private _executeEffect11(effect: ActionEffect) {
    this._result.setTypeParty();
    gameParty.setFloorDamageAdjust(effect.elementId, effect.refId);
  }

  /**
   * effect効果作成
   * @param text
   * @param animeId
   */
  protected _createEffectResultBase(
    text: string,
    animationId: number,
    score = 0
  ): ActionResultBase {
    return {
      text,
      animationId,
      score,
    };
  }

  /**
   * ターン効果を除去する
   */
  protected _removeTurnStates() {
    //
  }
}

/**
 * 行動使用抽象クラス
 */
abstract class GameUseAction extends GameAction {
  /**
   * 処理を抜ける
   */
  private _exitProcess: boolean = false;
  /**
   * 対象の配列
   */
  protected _targets: GameBattler[] = [];
  /**
   * 処理ジェネレーター
   */
  private _processing: Generator<ActionResult, void, unknown> | null = null;

  /**
   * ターゲット数を取得する
   */
  protected override get _targetLength() {
    return this._targets.length;
  }

  /**
   * 処理を抜ける設定をする
   */
  reserveExitProcess() {
    this._exitProcess = true;
  }

  /**
   * 処理を抜ける設定を終了する
   */
  endExitProcess() {
    this._exitProcess = false;
  }

  /**
   * 処理を抜けるかどうか取得する
   */
  get exitProcess() {
    return this._exitProcess;
  }

  /**
   * 最初のメッセージを取得する
   */
  private get _firstMessage() {
    return super.message;
  }

  /**
   * 最初のアニメーションを取得する
   */
  private get _firstAnimationId() {
    return super.animationId;
  }

  /**
   * コマンド未設定
   */
  protected get _unset() {
    return this.getCommandKind() === EActionKind.Unset;
  }

  /**
   * 行動なし
   */
  protected get _noAction() {
    return this.getCommandKind() <= EActionKind.Cancel;
  }

  /**
   * 技能かどうかを取得
   */
  private get _skill() {
    return this.getCommandKind() === EActionKind.Skill;
  }

  /**
   * 道具かどうかを取得
   */
  private get _item() {
    return this.getCommandKind() === EActionKind.Item;
  }

  /**
   * 参照中のコマンドを取得する
   */
  protected abstract _getCommand(): GameActionCommand;

  /**
   * コマンドをキャンセルする
   */
  protected _cancelCommand() {
    if (this.getCommandKind() !== EActionKind.Cancel) {
      this.setCommandKind(EActionKind.Cancel);
      this.setSelectedAction();
    }
  }

  /**
   * コマンドの種類を設定する
   * @param kind
   */
  setCommandKind(kind: EActionKind) {
    this._getCommand().setKind(kind);
  }

  /**
   * コマンドの種類を取得する
   * @returns
   */
  getCommandKind() {
    return this._getCommand().kind;
  }

  /**
   * アイテムインデックスを設定する
   * 設定された種類からアクションオブジェクトとidを設定する
   * @param itemIndex
   */
  setItemIndex(itemIndex: number) {
    this._getCommand().setItemIndex(itemIndex);
  }

  /**
   * アイテムインデックスを取得する
   * @returns
   */
  getItemIndex(): number {
    return this._getCommand().itemIndex;
  }

  /**
   * 対象グループを設定する
   * @param targetGroup
   */
  setTargetGroup(targetGroup) {
    this._getCommand().setTargetGroup(targetGroup);
  }

  /**
   * 対象インデックスを設定する
   * @param targetIndex
   */
  setTargetIndex(targetIndex: number) {
    this._getCommand().setTargetIndex(targetIndex);
  }

  /**
   * 選択中のアクションIdを取得
   * 移動中と戦闘中でフィールドが違う
   */
  protected abstract _getSelectActionId(): number;

  /**
   * 選択中のスキルか道具オブジェクトを取得する
   */
  protected _getSelectSpecial() {
    if (this._skill) {
      return this._getSelectSkill();
    }
    if (this._item) {
      return this._getSelectItem();
    }

    return null;
  }

  /**
   * 選択中のスキルを取得
   */
  protected _getSelectSkill(): Skill {
    return skills[this.getItemIndex()];
  }

  /**
   * 選択中の道具を取得する
   */
  private _getSelectItem() {
    return this._actor.getItem(this.getItemIndex());
  }

  /**
   * 選択中のスキルか道具idを取得する
   */
  getSelectSpecialId() {
    return this._getSelectSpecial()?.id ?? 0;
  }

  /**
   * 選択中のスキルか道具使用後にメニューを終了するかを取得する
   */
  getSelectMenuEnd() {
    return this._getSelectSpecial()?.menuEnd ?? false;
  }

  /**
   * 技能から行動Idを取得する
   * @param skill
   */
  protected abstract _getActionIdFromSkill(skill: Skill): number;

  /**
   * スキルIdから行動Idを取得する
   * @param skillId
   * @returns
   */
  protected _getActionId(skillId: number): number {
    return this._getActionIdFromSkill(skills[skillId]);
  }

  /**
   * 行動開始
   */
  start() {
    if (!this._enableProcess()) {
      this._clearProcessGen();
      return;
    }
    this._checkAction();
    // 使用名を設定する
    this.setSlotSelectItemName();
    // 対象を用意
    this._prepareTargets();
    // 処理
    this._setProcessGen();
  }

  /**
   * 行動制限を確認する
   * @returns
   */
  protected _checkAction() {
    if (this.actor.incapable) {
      // 制限しなくてもいいけどとりあえず
      this._cancelCommand();
    }
  }

  /**
   * ターン効果を設定する
   * 行動が回ってくるまでコストはかからないことにする
   * @returns
   */
  protected _setTurnEffect() {
    const effects = this._getTurnEffects();
    if (effects.length === 0) {
      return;
    }
    this._prepareTargets();
    for (const target of this._targets) {
      target.setTurnStates(this.actor.id, effects);
    }
  }

  /**
   * ターン中の効果を取得
   */
  private _getTurnEffects() {
    return this._getEffects().filter(
      (effect) => effect.code === EActionEffectCode.TurnCorrect
    );
  }

  /**
   * 選択された行動を設定する
   */
  setSelectedAction() {
    this._setAction();
  }

  /**
   * 行動の設定
   * 入力したコマンドを元に行動が決定される
   */
  protected _setAction() {
    const actionId = this._getSelectActionId();
    this.setActionId(actionId);
  }

  /**
   * 選択中の項目の名前をスロットに設定する
   */
  setSlotSelectItemName() {
    this._setSlotItemName(this._getSelectSpecial());
  }

  /**
   * 項目の名前をスロットに設定する
   * @param item
   */
  private _setSlotItemName(item: Skill | GameItem | null) {
    GameUtils.setSlotItemName(item?.name ?? '');
  }

  /**
   * 対象の設定
   */
  protected _prepareTargets() {
    if (!this._action) {
      // 行動が設定されていなければ対象設定不可
      return;
    }
    const range = this._getRangeId();
    const command = this._getCommand();
    if (this._checkReverseRange()) {
      this._targets = this.makeReverseTargets(
        range,
        command.targetGroup,
        command.targetIndex
      );
    } else {
      this._targets = this.makeTargets(
        range,
        command.targetGroup,
        command.targetIndex
      );
    }
  }

  /**
   * 範囲を逆転させるか確認する
   * @returns
   */
  private _checkReverseRange() {
    if (this.actor.confused) {
      const reverseRate = this.actor.confuseReserveRateId();
      if (GameRate.judge(reverseRate)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 次の行動を実行
   * ジェネレーターを進める
   * 終了後に次のコマンドがある場合は再度実行する
   */
  next(): ActionResult | 'NextCommand' | 'EndCommand' {
    if (!this._processing) {
      return 'EndCommand';
    }
    const result = this._processing.next();
    if (result.done) {
      if (this._toNextCommand()) {
        this._prepareNextCommand();
        return 'NextCommand';
      }
      return 'EndCommand';
    }
    return result.value;
  }

  /**
   * 次のコマンドに進める
   * @returns
   */
  protected _toNextCommand() {
    return false;
  }

  /**
   * 次のコマンドへの準備
   */
  private _prepareNextCommand() {
    this._removeTurnStates();
    this.clearResult();
  }

  /**
   * 範囲Idを取得
   */
  private _getRangeId() {
    return super.scope;
  }

  /**
   * アイテムの消費処理
   */
  useItem() {
    this._consumeMp();
    this._consumeItem();
  }

  /**
   * 効果がなかったときに消費しないアイテムの消費処理
   */
  safetyUseItem() {
    if (this._result.mpCost > 0) {
      this._actor.consumeMp(this._result.mpCost);
      this._result.setMpCost(0);
    }
    if (this._result.useItem !== null) {
      this._actor.consumeItem(this._result.useItem);
      this._result.setUseItem(null);
    }
  }

  /**
   * 消費しないアイテムの消費キャンセル
   */
  cancelSafetyConsume() {
    this._result.setMpCost(0);
    this._result.setUseItem(null);
  }

  /**
   * 使用可能か確認する
   * テキストが入った場合は使用不能
   */
  protected _checkUsable(): [boolean, string] {
    const [success, consume, id] = this.usable();
    if (success) {
      this.useItem();
      return [success, ''];
    }
    // 不可の場合足りない以外はMPを消費する
    if (consume) {
      this._consumeMp();
    }
    this.actor.setInactionNotice(true);
    const text = GameUtils.getMessage(id);
    return [success, text];
  }

  /**
   * 使用MPを消費する
   */
  private _consumeMp() {
    if (this._action.safety) {
      this._result.setMpCost(this._action.mpCost);
    } else {
      this._actor.consumeMp(this._action.mpCost);
    }
  }

  /**
   * 使用道具を消費する
   * @returns
   */
  private _consumeItem() {
    if (!this._item) {
      return;
    }
    const item = this._getSelectSpecial() as GameItem;
    if (this._action.safety) {
      this._result.setUseItem(item);
    } else {
      this._actor.consumeItem(item);
    }
  }

  /**
   * 処理ジェネレーター設定
   */
  protected _setProcessGen() {
    this._processing = this._processGen();
  }

  /**
   * 処理ジェネレーターをクリア
   */
  protected _clearProcessGen() {
    this._processing = null;
  }

  /**
   * メインジェネレーター
   * 行動可能な場合と不可な場合で分岐する
   */
  protected *_processGen() {
    yield* this._processBeforeActionGen();
    // 行動可能な場合
    if (this._actionable) {
      yield* this._processActionableGen();
    }
    yield* this._processAfterActionGen();
  }

  /**
   * 行動前処理
   */
  protected *_processBeforeActionGen(): Generator<ActionResult, void, unknown> {
    //
  }

  /**
   * 行動後処理
   */
  protected *_processAfterActionGen(): Generator<ActionResult, void, unknown> {
    //
  }

  /**
   * 実行可能かどうか
   * @returns
   */
  protected _enableProcess() {
    return true;
  }

  /**
   * 行動可能かどうか
   */
  protected get _actionable() {
    return this.actor.actionable;
  }

  /**
   * 行動開始処理
   * ★複数回行動者は何回も呼ばれるため
   * 自動回復機会が増える
   */
  protected _actionStart() {
    this._actor.actionStart();
  }

  /**
   * 行動終了処理
   */
  protected _actionEnd() {
    this.actor.actionEnd();
  }

  /**
   * バフ自動回復ジェネレーター
   */
  protected *_processAutoRemoveBuffGen() {
    const removeBuffIds = this.actor.removeBuffAuto();
    for (const id of removeBuffIds) {
      GameUtils.setParamValueFromId(id);
      const text = GameUtils.getSystemMessage('removeBuff');
      yield* GameActionGenSupport.processMessageGen(
        text,
        0,
        EActionResultText.REFRESH,
        [this.actor]
      );
    }
  }

  /**
   * ターンメッセージジェネレーター
   * @returns
   */
  protected *_processTurnMessagesGen() {
    yield* this._processTurnMessageGen(this.actor.getIncapableState());
    if (this._noAction) {
      return;
    }
    yield* this._processTurnMessageGen(this.actor.getConfuseState());
    for (const state of this.actor.getNoRestrictionStates()) {
      yield* this._processTurnMessageGen(state);
    }
  }

  /**
   * 状態指定のターンメッセージジェネレーター
   * @param state
   */
  private *_processTurnMessageGen(state: State) {
    if (state?.messageIds.turn) {
      const text = GameUtils.getMessage(state.messageIds.turn);
      yield* GameActionGenSupport.processMessageGen(
        text,
        0,
        EActionResultText.REFRESH,
        [this.actor]
      );
    }
  }

  /**
   * 行動可能な場合のメインジェネレーター
   * 行動、結果のジェネレータに続く
   */
  protected *_processActionableGen() {
    yield* this._processStandardGen(false);
    if (this._result.selectedActionId > 0) {
      yield* this._processStandardGen(true);
    }
  }

  /**
   * 標準行動ジェネレーター
   * 行動、結果のジェネレータに続く
   */
  protected *_processStandardGen(again: boolean) {
    const usableItem = this._checkUsableItem();
    const text = usableItem
      ? this._firstMessage
      : GameUtils.getSystemMessage('uselessItem');
    // 行動
    yield* this._processDoGen(text, this._firstAnimationId, again);
    if (!usableItem) {
      return;
    }
    // 使用可能確認
    const [usable, noUseText] = this._checkUsable();
    // 結果
    if (usable) {
      if (this._checkSuccess()) {
        if (this._checkExtraOtherAction(again)) {
          return;
        }
        yield* this._processExtraDispGen(this.extra.dispId1);
        yield* this._processResultGen();
      } else {
        yield* this._processSafetyConsumeItemGen(true);
        yield* GameActionGenSupport.processMessageGen(this.failedMessage);
      }
    } else {
      yield* this._processSafetyConsumeItemGen(true);
      yield* GameActionGenSupport.processMessageGen(noUseText);
    }
  }

  /**
   * 使用可能道具か確認する
   * @returns
   */
  private _checkUsableItem() {
    const item = this._item ? this._getSelectItem() : undefined;
    if (item && !this._availableItem(item)) {
      GameUtils.setSlotItemName(item.name);
      return false;
    }
    return true;
  }

  /**
   * マップで使用可能道具か確認する
   * @param item
   * @returns
   */
  protected _availableItem(item: GameItem) {
    return this.actor.canUsable(item, true);
  }

  /**
   * 成功か確認する
   * @param target
   * @returns
   */
  private _checkSuccess() {
    return GameRate.judge(this._action.successRateId);
  }

  /**
   * 行動ジェネレーター
   */
  protected *_processDoGen(
    text: string,
    animationId: number,
    again: boolean
  ): Generator<ActionResult, void, unknown> {
    // 最初のメッセージ
    yield GameActionGenSupport.createActionResult(
      text,
      animationId,
      0,
      EActionResultText.PLUS,
      again
        ? EActionResultTextSetting.None
        : EActionResultTextSetting.ResetLine,
      [this.actor]
    );
  }

  /**
   * 別行動をチェックする
   * @returns
   */
  protected _checkExtraOtherAction(again: boolean) {
    if (again) {
      return false;
    }
    const patternListId = this.extra.actionPatternListId;
    if (!patternListId) {
      return false;
    }
    const skillId = this._selectSkillFromExtraOtherPattern(patternListId);
    const actionId = skillId ? this._getActionId(skillId) : 0;
    if (!actionId) {
      return false;
    }
    this._setSlotItemName(skills[skillId]);
    this.setActionId(actionId);
    this._prepareTargets();
    this._result.setSelectedActionId(actionId);
    return true;
  }

  /**
   * 別行動パターンからスキルIdを選択する
   * @param patternListId
   * @returns
   */
  protected _selectSkillFromExtraOtherPattern(patternListId: number) {
    const pattern = GameActionPatternList.get(patternListId);
    const length = pattern.list.length;
    return pattern.list[Utils.randomInt(0, length)].id;
  }

  /**
   * 追加表示ジェネレーター
   */
  protected *_processExtraDispGen(
    dispId: number,
    targets: GameBattler[] = []
  ): Generator<ActionResult, void, unknown> {
    if (!dispId) {
      return;
    }

    const dispList = GameNumberList.get(dispId);
    for (const disp of dispList) {
      const { key: type, value } = GameNumberMap.get(disp);
      switch (type) {
        case EActionExtraDisp.Message:
          yield* this._processExtraDispMessageGen(targets, value);
          break;
        case EActionExtraDisp.Option:
          yield this._createTextSettingOption(
            value + EActionResultTextSetting.PushBaseline
          );
          break;
      }
    }
  }

  /**
   * 追加表示メッセージジェネレーター
   * @param targets
   * @param id
   */
  private *_processExtraDispMessageGen(targets: GameBattler[], id: number) {
    const [textId, animId] = GameNumberList.get(id);
    yield* GameActionGenSupport.processMessageGen(
      GameUtils.getMessage(textId),
      animId,
      EActionResultText.PLUS,
      targets
    );
  }

  /**
   * 結果ジェネレーター
   * @param noUseText
   */
  protected *_processResultGen() {
    if (this._action.successMessageId) {
      this._result.setBatchDisp();
    }
    yield* this._processScriptResultGen();
    if (this._checkExitProcess()) {
      return;
    }
    this._executePartyEffects();
    yield* this._processNewTargetEffectResultGen();
    yield* this._processTargetsGen();
    yield* this._processBatchDispGen();
    yield* this._processSafetyConsumeItemGen(false);
    yield* this._processUserEffectGen();
  }

  /**
   * スクリプト結果ジェネレーター
   */
  private *_processScriptResultGen() {
    const scriptId = this.extra.scriptId;
    if (!scriptId) {
      return;
    }
    yield GameActionGenSupport.createActionResult(
      '',
      0,
      0,
      EActionResultText.NONE,
      EActionResultTextSetting.None,
      [],
      scriptId
    );
  }

  /**
   * 処理を抜けるか確認する
   * @returns
   */
  private _checkExitProcess() {
    if (this.exitProcess) {
      this.endExitProcess();
      return true;
    }
    return false;
  }

  /**
   * 対象に効果適用ジェネレーター
   */
  protected *_processTargetsGen() {
    this._result.setTurnEffect(this._existTurnEffect());
    const times = this._numRepeat();
    for (const target of this._targets) {
      for (let i = 0; i < times; i++) {
        yield* this._processTargetEffectGen(target);
      }
    }
  }

  /**
   * 実行回数を取得する
   * @returns
   */
  private _numRepeat() {
    // 実行回数が武器の影響をうけるなら武器の回数を乗せる
    const addRepeat =
      this._action.weapon & EWeaponEffect.Repeat
        ? this.actor.addNumRepeat()
        : 0;
    const repeatId = this.extra.repeatId;
    if (!repeatId) {
      return 1 + addRepeat;
    }
    return GameNumberList.randomInt(repeatId) + addRepeat;
  }

  /**
   * パーティ効果を実行する
   */
  protected _executePartyEffects() {
    for (const effect of this._getEffects()) {
      this.executePartyEffect(effect);
    }
  }

  /**
   * すり替え行動を戻す
   * @returns
   */
  private _backSwitchingAction() {
    if (!this._result.backActionId) {
      return;
    }
    this.setActionId(this._result.backActionId);
  }

  private _targetEnd(target: GameBattler) {
    target.targetEnd();
  }

  /**
   * 反射ジェネレーター
   * @param target
   * @returns
   */
  protected *_processReflectionGen(target: GameBattler) {
    if (!this._result.reflectionTarget) {
      return;
    }
    const name = GameUtils.getReflectionName(target.myself);
    const [text, animId] = GameActionType.getResultInfo(this.actionType, name);
    yield* GameActionGenSupport.processMessageGen(
      text,
      animId,
      EActionResultText.PLUS,
      [target]
    );
  }

  /**
   * 効果結果ジェネレーター
   * 対象が有効でない場合ははじく
   * @param target
   */
  protected *_processEffectResultGen(target: GameBattler) {
    yield* this._processReflectionGen(target);
    const toTarget = this._executedTarget(target);
    yield* this._processTargetScriptGen(toTarget);
    if (this._checkExitProcess()) {
      return;
    }
    yield* this._processTargetExtraDispGen(toTarget);
    yield* this._processDamageResultGen(toTarget);
    yield* this._processRecoverResultGen(toTarget);
    yield* this._processBuffResultGen(toTarget);
    yield* this._processGrowthResultGen(toTarget);
    yield* this._processStatesResultGen(toTarget);
    yield* this._processReleaseResultGen(toTarget);
    yield* this._processEscapeResultGen(toTarget);
    yield* this._processNoEffectResultGen(toTarget);
    yield* this._processAfterResultGen(toTarget);
    yield* this._processOutStateResultGen(toTarget);
  }

  /**
   * 対象効果ジェネレーター
   * @param target
   * @returns
   */
  protected *_processTargetEffectGen(target: GameBattler) {
    if (!this._validOneTarget(target)) {
      return;
    }
    yield* this._processBaseLineGen();
    this._result.clearEffect();
    this.executeAction(target);
    yield* this._processEffectResultGen(target);
    this._result.pushNoHappenResult();
    this._backSwitchingAction();
    this._targetEnd(target);
  }

  /**
   * 使用者効果ジェネレーター
   * @param baseline
   * @returns
   */
  protected *_processUserEffectGen() {
    const effectId = this.extra.userEffectId;
    if (!effectId) {
      return;
    }
    if (!this._validOneTarget(this.actor)) {
      return;
    }
    yield* this._processBaseLineGen();
    this._result.clearEffect();
    this.executeUserEffect(this.actor);
    yield* this._processEffectResultGen(this.actor);
  }

  /**
   * ベースラインジェネレーター
   */
  private *_processBaseLineGen() {
    yield this._createTextSettingOption(EActionResultTextSetting.PopBaseline);
    yield this._createTextSettingOption(EActionResultTextSetting.PushBaseline);
  }

  /**
   * 対象ごとのスクリプトジェネレーター
   * @param target
   * @returns
   */
  protected *_processTargetScriptGen(target: GameBattler) {
    const scriptId = this._result.scriptId;
    if (!scriptId) {
      return;
    }
    yield GameActionGenSupport.createActionResult(
      '',
      0,
      0,
      EActionResultText.NONE,
      EActionResultTextSetting.None,
      [target],
      scriptId
    );
  }

  /**
   * 対象ごとの追加表示ジェネレーター
   * @param target
   * @returns
   */
  protected *_processTargetExtraDispGen(target: GameBattler) {
    if (this._result.batchDisp) {
      return;
    }
    yield* this._processExtraDispGen(this.extra.dispId2, [target]);
  }

  /**
   * ダメージ結果ジェネレーター
   * @param target
   */
  protected *_processDamageResultGen(target: GameBattler) {
    yield* this._processHpDamageResultGen(target);
    yield* this._processMpDamageResultGen(target);
  }

  /**
   * HPダメージ結果ジェネレーター
   * @param target
   */
  protected *_processHpDamageResultGen(target: GameBattler) {
    // 合計ダメージ、ダメージ分から吸収と処理する
    // 合計ダメージはHPダメージ＋HP吸収値
    const oldHp = target.hp;
    const result1 = this.resultHpDamage(target, this._result.totalHpDamage);
    if (result1 !== null) {
      yield* this._processEffectResultToCaller(result1, target);
    }
    // HP吸収可能値
    const drainHp = Math.min(oldHp - target.hp, this._result.hpDrain);
    const result2 = this.resultHpDrain(target, drainHp);
    if (result2 !== null) {
      yield* this._processEffectResultToCaller(result2, target);
    }
  }

  /**
   * MPダメージ結果ジェネレーター
   * @param target
   */
  protected *_processMpDamageResultGen(target: GameBattler) {
    // 合計ダメージ、ダメージ分から吸収と処理する
    // 合計ダメージはMPダメージ＋MP吸収値
    // ただし、MPダメージがない場合、ダメージ結果は出さない
    const oldMp = target.mp;
    const result1 = this.resultMpDamage(target, this._result.totalMpDamage);
    if (result1 !== null && this._result.mpDamage > 0) {
      yield* this._processEffectResultToCaller(result1, target);
    }
    if (this._result.mpDrain > 0) {
      // MP吸収可能値
      const drainMp = target.infiniteMp()
        ? this._result.mpDrain
        : Math.min(oldMp - target.mp, this._result.mpDrain);
      const result2 = this.resultMpDrain(target, drainMp);
      if (result2 !== null) {
        yield* this._processEffectResultToCaller(result2, target);
      }
    }
  }

  /**
   * 回復結果ジェネレーター
   * @param target
   */
  protected *_processRecoverResultGen(target: GameBattler) {
    yield* this._processHpRecoverResultGen(target);
    yield* this._processMpRecoverResultGen(target);
  }

  /**
   * HP回復結果ジェネレーター
   * @param target
   * @returns
   */
  private *_processHpRecoverResultGen(target: GameBattler) {
    const result = this.resultHpRecover(target, this._result.totalHpDamage);
    if (result === null) {
      return;
    }
    yield* this._processEffectResultToCaller(result, target);
  }

  /**
   * MP回復結果ジェネレーター
   * @param target
   * @returns
   */
  private *_processMpRecoverResultGen(target: GameBattler) {
    const result = this.resultMpRecover(target, this._result.totalMpDamage);
    if (result === null) {
      return;
    }
    yield* this._processEffectResultToCaller(result, target);
  }

  /**
   * 能力増減ジェネレーター
   * @param target
   */
  protected *_processBuffResultGen(target: GameBattler) {
    for (let i = 0; i < this._result.buffLength; i++) {
      const result = this.resultBuffedParam(target, i);
      if (result === null) {
        continue;
      }
      yield* this._processEffectResultToCaller(result, target);
    }
  }

  /**
   * 成長増減ジェネレーター
   * @param target
   */
  protected *_processGrowthResultGen(target: GameBattler) {
    for (let i = 0; i < this._result.buffLength; i++) {
      const result = this.resultGrowthParam(target, i);
      if (result === null) {
        continue;
      }
      yield* this._processEffectResultToCaller(result, target);
    }
  }

  /**
   * 状態増減ジェネレーター
   * @param target
   */
  protected *_processStatesResultGen(target: GameBattler) {
    yield* this._processAddedStatesResultGen(target);
    yield* this._processRemovedStatesResultGen(target);
  }

  /**
   * 状態増加ジェネレーター
   * @param target
   */
  protected *_processAddedStatesResultGen(target: GameBattler) {
    for (const stateInfo of this._result.addedStates) {
      const result = this.resultAddedState(target, stateInfo);
      if (result === null) {
        continue;
      }
      yield* this._processEffectResultToCaller(result, target);
    }
  }

  /**
   * 状態除去ジェネレーター
   * @param target
   */
  protected *_processRemovedStatesResultGen(target: GameBattler) {
    for (const stateInfo of this._result.removedStates) {
      // メッセージを設定していない場合textがnullなどで返ってくるので注意
      const result = this.resultRemovedState(target, stateInfo);
      if (result === null || !this._needOutputActionResult(result)) {
        continue;
      }
      yield* this._processEffectResultToCaller(result, target);
    }
  }

  /**
   * 出力する必要があるか
   * @param result
   * @returns
   */
  private _needOutputActionResult(result: ActionResultBase) {
    return result.text?.length > 0 || result.animationId > 0;
  }

  /**
   * 効果解除処理ジェネレーター
   * @param target
   */
  private *_processReleaseResultGen(target: GameBattler) {
    for (const releaseInfo of this._result.releaseInfos) {
      const result = this.resultRelease(target, releaseInfo);
      if (result === null) {
        continue;
      }
      yield* this._processEffectResultToCaller(result, target);
    }
  }

  /**
   * 逃げる処理ジェネレーター
   * @param target
   * @returns
   */
  protected *_processEscapeResultGen(target: GameBattler) {
    if (!this._result.escapeEffectId) {
      return;
    }
    this._setEscape(target);
    const [textId, animId] = GameNumberList.get(this._result.escapeEffectId);
    yield* GameActionGenSupport.processMessageGen(
      GameUtils.getMessage(textId),
      animId,
      EActionResultText.PLUS,
      [target]
    );
  }

  /**
   * 効果がなかったジェネレーター
   * @param target
   */
  private *_processNoEffectResultGen(target: GameBattler) {
    const result = this.resultNoEffect(target);
    if (result === null) {
      return;
    }
    yield* this._processEffectResultToCaller(result, target);
  }

  /**
   * 新規対象結果ジェネレーター
   */
  protected *_processNewTargetEffectResultGen() {
    if (this.actor.myself) {
      // 味方の場合は不可
      return;
    }
    const callEffects = GameActionEffect.filterSpecialCode(
      this._getEffects(),
      EActionEffectSpecial.Call
    );
    if (callEffects.length < 1) {
      return [];
    }

    let success = false;
    for (const effect of callEffects) {
      yield* this._processBaseLineGen();
      const entry = GameActionEffect.toNewEntry(effect, this.actor.dataId);
      const result = this._processNewEntryResult(entry);
      if (result === null) {
        continue;
      }
      success = true;
      yield result;
    }

    if (success) {
      this._result.setCalled(true);
      return;
    }
    if (this._targets.length > 0) {
      // 行動対象があった場合は失敗メッセージを出さない
      return;
    }
    const text = GameUtils.getSystemMessage('neverCome');
    yield* GameActionGenSupport.processMessageGen(
      text,
      0,
      EActionResultText.PLUS
    );
  }

  /**
   * 新規参加結果処理
   * @param entry
   * @returns
   */
  private _processNewEntryResult(entry: NewEntry) {
    const result = this.resultCalledBattler(entry);
    if (result === null) {
      return null;
    }
    const effectResult = GameActionGenSupport.createActionResult(
      result.base.text,
      result.base.animationId
    );
    if (result.base.text !== '') {
      effectResult.textOption = EActionResultText.PLUS;
    }
    effectResult.targets = [result.target];
    if (entry.immediate) {
      effectResult.extra = EActionResultExtra.ImmediateAction;
    }
    return effectResult;
  }

  /**
   * 結果一括表示ジェネレーター
   */
  protected *_processBatchDispGen() {
    if (this._result.batchDisp) {
      // 一括表示
      const result = this._createEffectResultBase(this.successMessage, 0);
      yield* this._processEffectResultTargetsToCaller(result, this._targets);
    }
    // 全部まわしてなにもなければなにもおこらないのメッセージ
    // 対象を見失った場合は出さない
    else if (this._result.noHappen) {
      yield* this._processNoHappenResultGen(this._targets);
    }
  }

  /**
   * なにもなかったジェネレーター
   * @param targets
   */
  private *_processNoHappenResultGen(targets) {
    const result = this.resultNoHappen();
    if (result === null) {
      return;
    }
    yield GameActionGenSupport.createActionResult(
      result.text,
      result.animationId,
      0,
      EActionResultText.BASELINE,
      EActionResultTextSetting.None,
      targets,
      0
    );
  }

  /**
   * 効果がなかったときに消費しないアイテムの消費ジェネレーター
   * @param noCheck true:効果があったかチェックしない
   */
  private *_processSafetyConsumeItemGen(noCheck: boolean) {
    if (this._action.safety && (noCheck || this._result.effective)) {
      this.safetyUseItem();
      yield this._createActionResultFluctuate();
    }
  }

  /**
   * 状態対象外ジェネレーター
   * かけられる状態ではない
   * @param targets
   */
  private *_processOutStateResultGen(target: GameBattler) {
    if (!this._result.outState) {
      return;
    }
    const result = this.resultOutState(this._result.limitStateTypeId);
    if (result === null) {
      return;
    }
    yield GameActionGenSupport.createActionResult(
      result.text,
      result.animationId,
      0,
      EActionResultText.PLUS,
      EActionResultTextSetting.None,
      [target],
      0
    );
  }

  /**
   * 行動結果を呼び出し元に返す
   * @param result
   * @param target
   */
  private *_processEffectResultToCaller(
    result: ActionResultBase,
    target: GameBattler
  ) {
    yield GameActionGenSupport.createActionResult(
      result.text,
      result.animationId,
      0,
      EActionResultText.PLUS,
      EActionResultTextSetting.None,
      [target]
    );
  }

  /**
   * 行動結果を複数対象あてで呼び出し元に返す
   * @param result
   * @param targets
   */
  private *_processEffectResultTargetsToCaller(
    result: ActionResultBase,
    targets: GameBattler[]
  ) {
    yield GameActionGenSupport.createActionResult(
      result.text,
      result.animationId,
      0,
      EActionResultText.PLUS,
      EActionResultTextSetting.None,
      targets
    );
  }

  /**
   * ばたんになったジェネレーター
   * @param target
   */
  private *_processAfterResultGen(target: GameBattler) {
    const result = this.resultDown(target, this._result.hpDamage > 0);
    if (result === null) {
      return;
    }
    yield* this._processEffectResultToCaller(result, target);
  }

  /**
   * テキスト設定オプションを作成する
   * @param setting
   * @returns
   */
  private _createTextSettingOption(setting: EActionResultTextSetting) {
    return GameActionGenSupport.createActionResult(
      '',
      0,
      0,
      EActionResultText.NONE,
      setting
    );
  }

  /**
   * ステータスウィンドウ更新を作成する
   * @returns
   */
  private _createActionResultFluctuate() {
    return GameActionGenSupport.createActionResult(
      '',
      0,
      0,
      EActionResultText.NONE,
      EActionResultTextSetting.None,
      [],
      0,
      EActionResultExtra.Fluctuate
    );
  }
}

/**
 * 移動時の行動クラス
 */
export class GameMapAction extends GameUseAction {
  /**
   * 実行コマンド
   */
  private _command: GameActionCommand = new GameActionCommand();

  /**
   * コマンドを消去する
   */
  clear() {
    this._command.clear();
  }

  /**
   * コマンドを取得する
   * @returns
   */
  protected _getCommand(): GameActionCommand {
    return this._command;
  }

  /**
   * 選択中のアクションIdを取得
   */
  protected _getSelectActionId() {
    return this._getSelectSpecial()?.actionId ?? 0;
  }

  /**
   * 敵が対象
   * ありえないのでfalse
   */
  protected override _enemyRange() {
    return false;
  }

  /**
   * スキルから行動Idを取得する
   * @param skill
   * @returns
   */
  protected override _getActionIdFromSkill(skill: Skill) {
    return skill.actionId;
  }
}

interface CheckPatternOption {
  patternListId: number;
  pattern: number;
  targetGroup: number;
  targetIndex: number;
}

/**
 * 戦闘行動クラス
 */
export class GameBattleAction extends GameUseAction {
  /**
   * 行動コマンド
   */
  private _list: GameActionCommand[] = [];
  /**
   * 行動コマンド参照インデックス
   */
  private _index: number = 0;
  /**
   * コマンド決定時の行動制限
   */
  private _stateCommandSetting: EStateRestriction = EStateRestriction.None;

  /**
   * 戦闘で使用可能道具か確認する
   * @param item
   * @returns
   */
  protected override _availableItem(item: GameItem) {
    return this.actor.canUsable(item, false);
  }

  /**
   * 自動補正有効か
   * 戦闘中だけ判定する
   * @returns
   */
  protected override _enableAutoTarget() {
    const intelligence = intelligences[this.actor.intelligenceId];
    return intelligence.autoTarget > 0;
  }

  /**
   * 単一ターゲット
   * 戦闘用
   * @param unit
   * @param group
   * @param index
   */
  protected override _oneTarget(unit: GameUnit, group: number, index: number) {
    [group, index] = this._decideOneTargetIndex(unit, group, index);
    if ((group < 0 || index < 0) && this._enableAutoTarget()) {
      // 対象外の結果になっていたらもう一度
      [group, index] = this._decideOneTargetIndex(unit, group, index);
    }
    const battler = unit.get(group, index);
    if (!battler) {
      this._result.setLossTarget();
      return [];
    }
    return [battler];
  }

  /**
   * 有効ターゲットか
   * 戦闘用
   * @param target
   */
  protected _validOneTarget(target: GameBattler) {
    if (target.live) {
      // 対象が生存していれば有効
      return true;
    }
    // 倒れている場合に有効な行動か
    return this._validDownAction();
  }

  /**
   * コマンドが空かどうか
   */
  get empty() {
    return this._list.length === 0;
  }

  /**
   * コマンドが終了かどうか
   */
  get end() {
    return this._index >= this._list.length;
  }

  /**
   * 有効かどうか
   */
  get valid() {
    return this._actor.live;
  }

  /**
   * コマンドを追加する
   * @param command
   */
  pushCommand(command: GameActionCommand) {
    this._list.push(command);
  }

  /**
   * 参照中のコマンドを取得する
   */
  protected _getCommand() {
    return this._list.length > this._index
      ? this._list[this._index]
      : GameActionCommand.emptyCommand;
  }

  /**
   * 選択中のアクションIdを取得
   */
  protected _getSelectActionId() {
    return this._getSelectSpecial()?.battleActionId ?? 0;
  }

  /**
   * コマンド決定時行動不能かどうか
   */
  private get _incapableCommand() {
    return this._stateCommandSetting === EStateRestriction.Incapable;
  }

  /**
   * コマンド決定時混乱かどうか
   */
  private get _confuseCommand() {
    return this._stateCommandSetting === EStateRestriction.Confuse;
  }

  /**
   * コマンド決定時オートかどうか
   * @returns
   */
  private get _autoCommand() {
    return this._stateCommandSetting === EStateRestriction.Auto;
  }

  /**
   * 行動速度を作成する
   */
  makeSpeed() {
    const [value, pos] = this._correctSpeed(this.extra.speedId);
    this.actor.makeActionSpeed(value, pos);
  }

  /**
   * 速度補正値を算出する
   * @param speedId
   * @returns
   */
  private _correctSpeed(speedId: number) {
    if (!speedId) {
      return [0, 0];
    }
    const [av, ar, pv, pr] = system.numberLists[speedId];
    const value = av + GameRate.div(ar, this.actor.agi);
    const pos = pv + GameRate.div(pr, this.actor.agi);
    return [value, pos];
  }

  /**
   * 行動速度を取得する
   * @returns
   */
  getActionSpeed() {
    return this.actor.actionSpeed;
  }

  /**
   * 選択可能確認(static)
   * @param actor
   * @param action
   * @returns
   */
  static checkSelect(actor: GameBattler, action: Action) {
    if (!this._mpCheck(actor, action)) {
      return this._createNotEnoughMpResult();
    }
    return this._createUsableResult(true);
  }

  /**
   * ターン開始時の処理
   * ターン中ずっと適用する効果を反映
   * 常に成功
   */
  turnStart() {
    this.setSelectedAction();
    // 行動不能の場合適用できない
    if (!this._actionable) {
      return;
    }
    this._setTurnEffect();
  }

  /**
   * 次のコマンドに進める
   * @returns
   */
  protected override _toNextCommand() {
    this._index += 1;
    return !this.end;
  }

  /**
   * メッセージウィンドウIdを取得する
   * @returns
   */
  protected _getMessageWindowId(): number {
    return system.battleMessageWindowId;
  }

  /**
   * 実行可能かどうか
   * コマンドが終了していなければ可能
   * @returns
   */
  protected override _enableProcess() {
    return !this.end;
  }

  /**
   * 行動可能かどうか
   * 行動不可状態になっていない
   * もしくは行動が設定されていない
   */
  protected override get _actionable() {
    return super._actionable && !this._noAction;
  }

  /**
   * ターン効果を除去する
   */
  protected override _removeTurnStates() {
    gameParty.removeTurnStatesByBattlerId(this.actor.id);
    gameTroop.removeTurnStatesByBattlerId(this.actor.id);
  }

  /**
   * 行動前処理
   */
  protected override *_processBeforeActionGen() {
    this._actionStart();

    yield* GameActionGenSupport.processAutoRemoveBeforeGen(this.actor);
    yield* this._processTurnMessagesGen();
  }

  /**
   * 行動後処理
   */
  protected override *_processAfterActionGen() {
    yield* GameActionGenSupport.processAutoRemoveAfterGen(this.actor);
    yield* this._processAutoRemoveBuffGen();
    this._actionEnd();
  }

  /**
   * スキルから行動Idを取得する
   * @param skill
   * @returns
   */
  protected override _getActionIdFromSkill(skill: Skill) {
    return skill.battleActionId;
  }

  /**
   * 行動を確認する
   * @returns
   */
  protected override _checkAction() {
    const prevState = this._stateCommandSetting;
    this._stateCommandSetting = this._currentState();

    if (
      prevState === EStateRestriction.Incapable ||
      prevState === EStateRestriction.Force
    ) {
      // コマンド作成時行動不能もしくは強制
      return;
    }
    if (this._incapableCommand) {
      // 行動不能になった
      this._cancelCommand();
      return;
    }
    if (prevState === EStateRestriction.Confuse && !this._confuseCommand) {
      // 混乱だったが回復した
      this._cancelCommand();
      return;
    }
    if (prevState !== EStateRestriction.Confuse && this._confuseCommand) {
      // 混乱になった
      // 未設定にする
      this.setCommandKind(EActionKind.Unset);
    }
    if (!this._unset && !this.actor.myself) {
      // 自身の行動パターンと異なっていた場合は未設定にする
      const enemy = this.actor as GameEnemy;
      if (this._getCommand().patternListId !== enemy.patternListId) {
        this.setCommandKind(EActionKind.Unset);
      }
    }

    if (this._unset) {
      // 行動前決定の場合は行動選択
      const options = this._makeCommandOptions();
      this._getCommand().set(options);
    }
  }

  /**
   * 現在の状態を取得する
   * @returns
   */
  private _currentState() {
    if (this.actor.incapable) {
      return EStateRestriction.Incapable;
    } else if (this.actor.confused) {
      return EStateRestriction.Confuse;
    } else if (this.actor.auto) {
      return EStateRestriction.Auto;
    } else {
      return EStateRestriction.None;
    }
  }

  /**
   * 別行動パターンからスキルIdを選択する
   * @param patternListId
   * @returns
   */
  protected _selectSkillFromExtraOtherPattern(patternListId: number) {
    const indices = this._actionCandidatesIndices(patternListId);
    if (indices.length === 0) {
      return super._selectSkillFromExtraOtherPattern(patternListId);
    }
    const choice = GameActionPatternList.roulette(patternListId, indices);
    const pattern = GameActionPatternList.get(patternListId);
    return pattern.list[choice].id;
  }

  /**
   * 入力からコマンドを作成する
   * @param options
   */
  makeInput(options: ActionCommandOptions) {
    this._stateCommandSetting = this._currentState();
    const kind = options.kind ?? EActionKind.Unset;
    if (kind !== EActionKind.Unset) {
      const command = new GameActionCommand(options);
      this.pushCommand(command);
    } else {
      const command = this._makeCommand();
      this.pushCommand(command);
    }
  }

  /**
   * コマンドを作成する
   */
  make() {
    this._stateCommandSetting = this._currentState();
    const command = this._makeCommand();
    this.pushCommand(command);
  }

  /**
   * 強制コマンドを作成する
   * @param options
   */
  makeForce(options: ActionCommandOptions) {
    this._stateCommandSetting = EStateRestriction.Force;
    const command = new GameActionCommand(options);
    this.pushCommand(command);
  }

  /**
   * コマンドを作成する
   * @returns
   */
  private _makeCommand() {
    if (this._incapableCommand) {
      return new GameActionCommand();
    }
    if (
      !this.empty &&
      (this._confuseCommand || this.actor.decideBeforeAction)
    ) {
      // 混乱もしくは行動前決定の場合2個目以降は行動前に決定を試みない
      // 作成ごとにlistに追加されるからemptyでなければ2回目以降となる
      return new GameActionCommand();
    }
    const options = this._makeCommandOptions();
    return new GameActionCommand(options);
  }

  /**
   * コマンドオプションを作成する
   * @returns
   */
  private _makeCommandOptions() {
    const laterFirst =
      this.actor.decideBeforeAction && this.empty && !this._confuseCommand;
    const patternListId = this._usePatternListId();
    if (patternListId > 0) {
      // 行動パターン
      const options = this._patternCommandOptions(patternListId);
      if (options.kind !== EActionKind.Unset || laterFirst) {
        const target = this.actor;
        if (
          options.kind === EActionKind.Skill &&
          target.patternListId === patternListId &&
          options.pattern !== undefined
        ) {
          // 使用回数、現在パターン、グループパターンを追加する
          target.selfUnit.increasePatternTimes(target.groupId, options.pattern);
          target.setCurrentPattern(options.pattern);
          target.selfUnit.setCurrentPattern(target.groupId, options.pattern);
        }
        return options;
      }
    } else if (this._autoCommand) {
      // オート行動
      const options = this._autoCommandOptions();
      if (options.kind !== EActionKind.Unset || laterFirst) {
        return options;
      }
    }

    // 標準スキル
    return this._commandStandardOptions();
  }

  /**
   * 使用行動パターンリストを取得する
   * @returns
   */
  private _usePatternListId() {
    if (this._confuseCommand) {
      return this.actor.confusePatternId();
    } else {
      return this.actor.patternListId;
    }
  }

  /**
   * 標準コマンドオプションを作成する
   * @returns
   */
  private _commandStandardOptions() {
    const target = this.actor;
    const skillId = target.getNormalAttackId();
    this.setActionId(this._getActionId(skillId));
    const [group, index] = this.getTargetIndex();
    return {
      kind: EActionKind.Skill,
      itemIndex: skillId,
      targetGroup: group,
      targetIndex: index,
    };
  }

  /**
   * 行動パターリンスとオプションを作成する
   * @param patternListId
   * @returns
   */
  private _patternCommandOptions(patternListId: number) {
    const indices = this._actionCandidatesIndices(patternListId);
    const [pattern, group, index] = this._choicePattern(patternListId, indices);
    if (pattern < 0) {
      // 行動前決定にするので未設定とする
      return { kind: EActionKind.Unset };
    }
    const skillId = GameActionPatternList.skillId(patternListId, pattern);
    return {
      kind: EActionKind.Skill,
      itemIndex: skillId,
      targetGroup: group,
      targetIndex: index,
      patternListId,
      pattern,
    };
  }

  /**
   * 行動候補インデックスを取得する
   * @returns
   */
  private _actionCandidatesIndices(patternListId: number) {
    const pattern = GameActionPatternList.get(patternListId);

    if (!pattern.conditionId) {
      // 条件がない場合は全部
      return Utils.makeIndices(pattern.list.length);
    }

    const conditionIdList = GameNumberList.get(pattern.conditionId);
    const indices: number[] = [];
    const ratings: number[] = [];
    const limit = pattern.limit ? pattern.limit : conditionIdList.length;
    // 上位から判定する
    for (let i = conditionIdList.length - 1; i >= 0; i--) {
      if (ratings.length >= limit) {
        // 制限数に達したら終了
        break;
      }
      const conditionId = conditionIdList[i];
      if (!conditionId) {
        // 条件指定がない場合は可
        ratings.push(i);
        continue;
      }
      if (this._meetConditions(GameNumberList.get(conditionId), i)) {
        ratings.push(i);
      }
    }
    if (ratings.length < 1) {
      // 条件に当てはまるものがなかった場合レーティング0が有効
      ratings.push(0);
    }

    for (let i = 0; i < pattern.list.length; i++) {
      if (ratings.includes(pattern.list[i].rating)) {
        indices.push(i);
      }
    }

    return indices;
  }

  /**
   * 複数条件を満たすか判定する
   * @param conditionIds
   * @returns
   */
  private _meetConditions(conditionIds: number[], pattern: number) {
    for (const id of conditionIds) {
      if (!this._meetCondition(actionConditions[id], pattern)) {
        // いずれかの条件を満たさなければ不可
        return false;
      }
    }
    return true;
  }

  /**
   * 単一条件を満たすか確認する
   * @param condition
   * @returns
   */
  private _meetCondition(condition: ActionCondition, pattern: number) {
    if (this.actor.meetCondition(condition)) {
      return true;
    }
    switch (condition.type) {
      case EActionConditionType.Times:
        return this.actor.meetTimesCondition(condition, pattern);
      case EActionConditionType.TurnStart:
        return this.empty;
      default:
        return false;
    }
  }

  /**
   * 行動パターンから選択する
   * @param patternListId
   * @param indices
   * @returns
   */
  private _choicePattern(patternListId: number, indices: number[]) {
    if (indices.length === 0) {
      return [-1, -1, -1];
    }

    if (this._confuseCommand) {
      return this._choiceConfusePattern(patternListId, indices);
    }

    if (this.actor.decideBeforeAction && this.empty) {
      return this._checkPatternLaterFirst(
        this._choicePatternLaterFirst(patternListId, indices)
      );
    } else {
      return this._choicePatternNormal(patternListId, indices);
    }
  }

  /**
   * 行動パターンから混乱選択する
   * @param patternListId
   * @param indices
   * @returns
   */
  private _choiceConfusePattern(patternListId: number, indices: number[]) {
    const choice = GameActionPatternList.roulette(patternListId, indices);
    return [choice, -1, -1];
  }

  /**
   * 行動パターンから通常選択する
   * @param patternListId
   * @param indices
   * @returns
   */
  private _choicePatternNormal(patternListId: number, indices: number[]) {
    const pattern = GameActionPatternList.get(patternListId);
    switch (pattern.select) {
      case EActionPatternSelect.Random:
        return this._choiceRandomPattern(patternListId, indices);
      case EActionPatternSelect.Rotation:
        return this._choiceRotationPattern(patternListId, indices);
      case EActionPatternSelect.GroupRotation:
        return this._choiceGroupRotationPattern(patternListId, indices);
      default:
        return [-1, -1, -1];
    }
  }

  /**
   * 行動パターンから後で決定時の初回選択する
   * @param patternListId
   * @param indices
   * @returns
   */
  private _choicePatternLaterFirst(patternListId: number, indices: number[]) {
    const pattern = GameActionPatternList.get(patternListId);
    switch (pattern.select) {
      case EActionPatternSelect.Random:
        return this._choiceOncePattern(patternListId, indices);
      case EActionPatternSelect.Rotation:
        return this._choiceRotationPattern(patternListId, indices);
      case EActionPatternSelect.GroupRotation:
        return this._choiceGroupRotationPattern(patternListId, indices);
      default:
        return [-1, -1, -1];
    }
  }

  /**
   * 決定時の初回選択した結果の確認を行う
   * @param choiceResult
   * @returns
   */
  private _checkPatternLaterFirst(choiceResult: number[]) {
    if (
      choiceResult[0] >= 0 &&
      (this.extra.speedId > 0 || this._existTurnEffect())
    ) {
      return choiceResult;
    } else {
      return [-1, -1, -1];
    }
  }

  /**
   * ランダムパターン選択
   * @param indices
   * @returns
   */
  private _choiceRandomPattern(patternListId: number, indices: number[]) {
    const orders = GameActionPatternList.shuffle(patternListId, indices);

    const option = this._makeCheckPatternOption(patternListId);
    for (const pattern of orders) {
      option.pattern = pattern;
      const [ok, group, index] = this._checkPattern(option);
      if (ok) {
        return [pattern, group, index];
      }
    }

    return [-1, -1, -1];
  }

  /**
   * ランダムで一回だけ選択する
   * @param patternListId
   * @param indices
   * @returns
   */
  private _choiceOncePattern(patternListId: number, indices: number[]) {
    const choice = GameActionPatternList.roulette(patternListId, indices);
    const option = this._makeCheckPatternOption(patternListId);
    option.pattern = choice;
    const [ok, group, index] = this._checkPattern(option);
    return [ok ? choice : -1, group, index];
  }

  /**
   * ローテーションパターン選択
   * @param patternListId
   * @param indices
   * @returns
   */
  private _choiceRotationPattern(patternListId: number, indices: number[]) {
    const list = GameActionPatternList.get(patternListId).list;
    const length = list.length;
    const current = this.actor.currentPattern + 1;

    const option = this._makeCheckPatternOption(patternListId);
    for (let i = 0; i < length; i++) {
      const pattern = (i + current) % length;
      if (indices.indexOf(pattern) < 0) {
        continue;
      }
      option.pattern = pattern;
      const [ok, group, index] = this._checkPattern(option);
      if (ok) {
        return [pattern, group, index];
      }
    }

    return [-1, -1, -1];
  }

  /**
   * グループローテーションパターン選択
   * @param patternListId
   * @param indices
   * @returns
   */
  private _choiceGroupRotationPattern(
    patternListId: number,
    indices: number[]
  ) {
    const target = this.actor;
    const list = GameActionPatternList.get(patternListId).list;
    const length = list.length;
    const current = target.selfUnit.getCurrentPattern(target.groupId) + 1;

    const option = this._makeCheckPatternOption(patternListId);
    for (let i = 0; i < length; i++) {
      const pattern = (i + current) % length;
      if (indices.indexOf(pattern) < 0) {
        continue;
      }

      option.pattern = pattern;
      const [ok, group, index] = this._checkPattern(option);
      if (ok) {
        return [pattern, group, index];
      }
    }

    return [-1, -1, -1];
  }

  private _makeCheckPatternOption(patternListId: number): CheckPatternOption {
    // target* は持ち越しのために用意していたが
    // 変更が大きくなりすぎるので未使用にしている
    return {
      patternListId: patternListId,
      pattern: 0,
      targetGroup: -1,
      targetIndex: -1,
    };
  }

  /**
   * 選択したパターンを確認する
   * @param patternListId
   * @param pattern
   * @returns
   */
  private _checkPattern(option: CheckPatternOption): [boolean, number, number] {
    const skillId = GameActionPatternList.skillId(
      option.patternListId,
      option.pattern
    );
    const id = this._getActionId(skillId);
    this.setActionId(id);
    if (!this._checkInactionPattern()) {
      return [false, -1, -1];
    }
    return this._checkMeaningLessPattern();
  }

  /**
   * 可能行動パターンか確認する
   * @returns
   */
  private _checkInactionPattern() {
    const target = this.actor;
    const inaction = target.intelligence.inaction;
    if (inaction === EInactionType.Do) {
      return true;
    }

    if (this.usable()[0]) {
      return true;
    }
    if (inaction === EInactionType.UntilNotice && !target.inactionNotice) {
      // 認識していなければ使用する
      return true;
    }

    return false;
  }

  /**
   * 無意味行動パターンか確認する
   * @param id
   * @returns
   */
  private _checkMeaningLessPattern(): [boolean, number, number] {
    const meaningless = this.actor.intelligence.meaningless;
    // ターン効果の場合は行動判定を行わない
    if (meaningless === EMeaninglessType.Do || this._existTurnEffect()) {
      return [true, ...this.getTargetIndex()];
    }
    return this.judgeAction();
  }

  /**
   * オートコマンドオプションを作成する
   * @returns
   */
  private _autoCommandOptions() {
    if (this._confuseCommand) {
      const skillId = this.actor.choiceConfuseSkillId();
      if (skillId > 0) {
        return {
          kind: EActionKind.Skill,
          itemIndex: skillId,
        };
      }
    } else {
      return this._autoNormalCommandOptions();
    }

    return { kind: EActionKind.Unset };
  }

  /**
   * 通常時のオートコマンドオプションを作成する
   * @returns
   */
  private _autoNormalCommandOptions() {
    const target = this.actor;
    const dangerHps = target.selfUnit.getMemberIndicesList(
      (battler) => battler.live && battler.hpDanger
    );
    if (dangerHps.length > 0) {
      // 消費なしの道具＞スキル＞消費道具の順
      // 回復手段があれば決定
      const selects = [...this._autoSelectItems(), ...this._autoSelectSkills()];
      if (selects.length > 0) {
        // コストが少ないものから優先
        selects.sort((a, b) => a.cost - b.cost);
        const [group, index] = this._autoRecoverIndex(dangerHps);
        return {
          kind: selects[0].kind,
          itemIndex: selects[0].itemIndex,
          targetGroup: group,
          targetIndex: index,
        };
      }
    }
    const skillId = target.getNormalAttackId();
    this.setActionId(this._getActionId(skillId));
    if (this._selectableAction()) {
      return {
        kind: EActionKind.Skill,
        itemIndex: target.getNormalAttackId(),
      };
    } else {
      return { kind: EActionKind.Unset };
    }
  }

  /**
   * オート時の道具選択を取得する
   * @returns
   */
  private _autoSelectItems() {
    const target = this.actor;
    const selects: SelectCommand[] = [];
    const itemIndices = target.getAutoUsableBattleItemIndices();
    for (const index of itemIndices) {
      const item = target.getItem(index);
      this.setActionId(item.battleActionId);
      if (!this._selectableAction() || !this.usable()) {
        continue;
      }
      if (!this._existHpRecoverEffects()) {
        continue;
      }
      selects.push({
        kind: EActionKind.Item,
        itemIndex: index,
        actionId: item.battleActionId,
        cost: this.mpCost + (item.consumable ? 1000 : 0),
      });
    }
    return selects;
  }

  /**
   * オート時のスキル選択を取得する
   * @returns
   */
  private _autoSelectSkills() {
    const target = this.actor;
    const selects: SelectCommand[] = [];
    const itemIndices = target.getAutoUsableBattleSkillIds();
    for (const index of itemIndices) {
      const item = skills[index];
      this.setActionId(item.battleActionId);
      if (!this._selectableAction() || !this.usable()) {
        continue;
      }
      if (!this._existHpRecoverEffects()) {
        continue;
      }
      selects.push({
        kind: EActionKind.Skill,
        itemIndex: index,
        actionId: item.battleActionId,
        cost: this.mpCost,
      });
    }
    return selects;
  }

  /**
   * 選択可能行動か判別する
   * @returns
   */
  private _selectableAction() {
    //1回目で行動前決定の場合はターン効果と速さ補正だけ有効
    if (this.empty && this.actor.decideBeforeAction) {
      return this.extra.speedId > 0 || this._existTurnEffect();
    } else {
      return true;
    }
  }

  /**
   * HP回復効果があるかどうか
   * @returns
   */
  private _existHpRecoverEffects(): boolean {
    return this._getEffects().some((effect) =>
      GameActionEffect.hpRecover(effect)
    );
  }

  /**
   * オート時の回復対象インデックスを取得する
   * @param dangerHps
   * @returns
   */
  private _autoRecoverIndex(dangerHps: GameGroupIndex[]) {
    let minHp = 999;
    let groupId = 0;
    let index = 0;
    for (const dangerGroup of dangerHps) {
      for (const dangerId of dangerGroup.list) {
        const target = this.actor.selfUnit.get(dangerGroup.index, dangerId);
        if (!target) {
          continue;
        }
        if (target === this.actor) {
          // 自分優先
          return [dangerGroup.index, dangerId];
        }
        const hp = target.hp;
        if (hp < minHp) {
          groupId = dangerGroup.index;
          index = dangerId;
          minHp = hp;
        }
      }
    }
    return [groupId, index];
  }
}

interface SelectCommand {
  kind: EActionKind;
  itemIndex: number;
  actionId: number;
  cost: number;
}

/**
 * 行動の種類
 */
export const enum EActionKind {
  Unset,
  Cancel,
  Skill,
  Item,
}

export interface ActionCommandOptions {
  kind?: EActionKind;
  itemIndex?: number;
  targetGroup?: number;
  targetIndex?: number;
  patternListId?: number;
  pattern?: number;
}

/**
 * 行動指定クラス
 */
export class GameActionCommand {
  /**
   * 基本、技能、道具、混乱、キャンセル
   */
  private _kind: EActionKind;
  /**
   * 行動の種類に基づいたインデックス
   * 道具は選択インデックス
   */
  private _itemIndex: number;
  /**
   * 対象グループ 0～ パーティの場合は0
   */
  private _targetGroup: number;
  /**
   * グループ内のインデックス
   */
  private _targetIndex: number;
  /**
   * パターンリスト
   */
  private _patternListId: number;
  /**
   * 選択パターン
   */
  private _pattern: number;
  /**
   * 空コマンド
   */
  static emptyCommand = new GameActionCommand();

  /**
   * コンストラクタ
   */
  constructor(options: ActionCommandOptions = {}) {
    this.set(options);
  }

  /**
   * 設定する
   * @param kind
   * @param itemIndex
   * @param groupIndex
   * @param targetIndex
   */
  set(options: ActionCommandOptions) {
    const {
      kind = EActionKind.Unset,
      itemIndex = -1,
      targetGroup = -1,
      targetIndex = -1,
      patternListId = 0,
      pattern = 0,
    } = options;
    this.setKind(kind);
    this.setItemIndex(itemIndex);
    this.setTargetGroup(targetGroup);
    this.setTargetIndex(targetIndex);
    this._patternListId = patternListId;
    this._pattern = pattern;
  }

  /**
   * 行動の種類を設定する
   * @param value
   */
  setKind(value: EActionKind) {
    this._kind = value;
  }

  /**
   * 行動の種類を取得する
   */
  get kind() {
    return this._kind;
  }

  /**
   * 対象グループを設定する
   * @param value
   */
  setTargetGroup(value: number) {
    this._targetGroup = value;
  }

  /**
   * 対象グループを取得する
   */
  get targetGroup() {
    return this._targetGroup;
  }

  /**
   * グループ内のインデックスを設定する
   * @param value
   */
  setTargetIndex(value: number) {
    this._targetIndex = value;
  }

  /**
   * 対象インデックスを取得する
   */
  get targetIndex() {
    return this._targetIndex;
  }

  /**
   * 行動の種類に基づいたインデックス
   * @param value
   */
  setItemIndex(value: number) {
    this._itemIndex = value;
  }

  /**
   * 行動の種類に基づいたインデックスを取得する
   */
  get itemIndex() {
    return this._itemIndex;
  }

  /**
   * パターンリストIdを取得する
   */
  get patternListId() {
    return this._patternListId;
  }

  /**
   * パターンを取得する
   */
  get pattern() {
    return this._pattern;
  }

  /**
   * クリア
   */
  clear() {
    this._kind = EActionKind.Unset;
    this._itemIndex = 0;
    this._targetGroup = -1;
    this._targetIndex = -1;
    this._patternListId = 0;
    this._pattern = 0;
  }
}
