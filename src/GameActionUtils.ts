import {
  ActionEffect,
  ActionExtra,
  ActionStrike,
  EActionEffectCode,
  EActionEffectSpecial,
  EActionEffectType,
  EActionEffectValue1,
  EActionNoRandomType,
  EDamageCutType,
  ERandomRange,
} from './DataTypes';
import {
  actionEffects,
  actionFigures,
  actionPatternLists,
  actionStrikes,
  system,
} from './DataStore';
import { GameBattler } from './GameBattler';
import { EMessageOption } from './GameMessage';
import {
  GameCalc,
  GameUtils,
  GameRate,
  GameParamEffect,
  GameNumberList,
} from './GameUtils';
import Utils from './Utils';

/**
 * 行動結果の型のテキストオプション列挙体
 */
export const enum EActionResultText {
  NONE = -1,
  REFRESH = EMessageOption.Refresh, // 新しいテキスト
  PLUS = EMessageOption.Plus, // 既存のテキストに追加
  BASELINE = EMessageOption.BaseLine, // 基準行以下を消去して追加
}

/**
 * 行動結果の型のテキスト設定オプション列挙体
 */
export const enum EActionResultTextSetting {
  None = -1,
  PushBaseline = EMessageOption.PushBaseLine, // 基準行を設定して追加
  PopBaseline = EMessageOption.PopBaseLine, // 基準行を削除して追加
  ResetLine = EMessageOption.ResetLine, // 基準行をクリアする
}

/**
 * 行動結果追加処理列挙体
 */
export const enum EActionResultExtra {
  None = -1,
  ImmediateAction, // 即時行動
  Fluctuate, // 変動ウィンドウ再描画
  ExitProcess, // 行動を終了する
  ForceAction, // 強制行動
}

/**
 * 行動結果ベースの型
 */
export interface ActionResultBase {
  text: string;
  animationId: number;
  score: number;
}

/**
 * 行動結果の型
 */
export interface ActionResult extends ActionResultBase {
  textOption: EActionResultText;
  textSettingOption: EActionResultTextSetting;
  targets: GameBattler[];
  scriptId: number;
  extra: EActionResultExtra;
}

/**
 * 行動結果を作成する
 * @returns
 */
export const newActionResult = (): ActionResult => {
  const result: ActionResult = {
    textOption: EActionResultText.NONE,
    textSettingOption: EActionResultTextSetting.None,
    targets: [],
    scriptId: 0,
    extra: EActionResultExtra.None,
    text: '',
    animationId: 0,
    score: 0,
  };
  return result;
};

export class GameActionUtils {
  /**
   * 行動関係でランダムを無効にするか
   */
  private static _noRandom = false;
  /**
   * ランダムが無効なときの算出タイプ
   */
  private static _noRandomType = EActionNoRandomType.Center;
  /**
   * 空の追加行動
   */
  private static _emptyExtra: ActionExtra = {
    preScriptId: 0,
    scriptId: 0,
    expRateId: 0,
    goldRateId: 0,
    itemRateId: 0,
    leave: false,
    speedId: 0,
    userEffectId: 0,
    dispId1: 0,
    dispId2: 0,
    actionPatternListId: 0,
    switchingId: 0,
    attemptsId: 0,
    repeatId: 0,
  };

  /**
   * ランダムが有効かどうか取得する
   */
  static get noRandom() {
    return this._noRandom;
  }

  /**
   * ランダムを有効にする
   */
  static RandomOn() {
    this._noRandom = false;
  }

  /**
   * ランダムを無効にする
   */
  static RandomOff() {
    this._noRandom = true;
  }

  /**
   * ランダムなし時の算出処理
   * @param min
   * @param max
   * @returns
   */
  static noRandomProcess(min: number, max: number) {
    switch (this._noRandomType) {
      case EActionNoRandomType.Max:
        return max;
      case EActionNoRandomType.Min:
        return min;
      default:
        return Math.floor((min + max) / 2);
    }
  }

  /**
   * ランダムなし時の判定
   * 割合Id指定バージョン
   * @param id
   * @returns
   */
  static noRandomJudgeByRateId(id: number) {
    const [num, max] = GameRate.operation(id);
    return this.noRandomJudge(num / max);
  }

  /**
   * ランダムなし時の判定
   * 確率によって効く効かないを決め打ちする
   * @param rNum
   * @returns
   */
  static noRandomJudge(rNum: number) {
    switch (this._noRandomType) {
      case EActionNoRandomType.Max:
        return rNum > 0.0;
      case EActionNoRandomType.Min:
        return rNum > 0.3;
      default:
        return rNum > 0.15;
    }
  }

  /**
   * いずれかの判定にあたるか
   * @param rateIds
   * @returns
   */
  static someJudge(rateIds: number[]) {
    if (this.noRandom) {
      return this._someJudgeNoRandom(rateIds);
    } else {
      return rateIds.some((rateId) => GameRate.judge(rateId));
    }
  }

  /**
   * いずれかの判定にあたるか
   * ランダムなし時の判定
   * @param rateIds
   * @returns
   */
  private static _someJudgeNoRandom(rateIds: number[]) {
    const rate = rateIds.reduce((prev, total) => {
      const [num, max] = GameRate.operation(prev);
      return total + num / max;
    }, 0);
    return this.noRandomJudge(rate);
  }

  /**
   * 空の追加行動を取得する
   * @returns
   */
  static get emptyExtra() {
    return this._emptyExtra;
  }
}

export interface ActionJudgeRateOptions {
  rateId: number;
  actor: GameBattler;
  target: GameBattler;
  magicId: number;
  luckId: number;
}

/**
 * パラメータ影響あり判定クラス
 */
export class GameActionParamRate {
  /**
   * 魔力影響の判定
   * @param options
   * @returns
   */
  static judgeMagic(options: ActionJudgeRateOptions) {
    const [baseNum, max] = GameRate.operation(options.rateId);
    const rNum = baseNum / max;
    const bios = GameParamEffect.operation(
      options.magicId,
      rNum,
      options.actor.wiz,
      options.target.wiz
    );
    if (GameActionUtils.noRandom) {
      return GameActionUtils.noRandomJudge(rNum + bios);
    } else {
      return GameRate.luckBiosJudgeFromRealNumber(
        rNum + bios,
        options.luckId,
        options.actor.luk,
        options.target.luk
      );
    }
  }
}

/**
 * 打撃クラス
 */
export class GameActionStrike {
  /**
   * 取得する
   * @param id
   * @returns
   */
  static get(id: number) {
    return actionStrikes[id];
  }

  /**
   * 演算
   * @param id
   * @param actor
   * @param target
   * @returns
   */
  static operation(id: number, actor: GameBattler, target: GameBattler) {
    const operationId = this._getOperationId(id, actor, target);
    const value = this._getValue(operationId, actor, target);
    const zeroId = this.get(operationId).zeroId;
    if (value === 0 && zeroId > 0) {
      return this._getValue(zeroId, actor, target);
    } else {
      return value;
    }
  }

  /**
   * 演算対象のIdを取得する
   * @param id
   * @param actor
   * @param target
   * @returns
   */
  static _getOperationId(id: number, actor: GameBattler, target: GameBattler) {
    const other = this._otherTest(id, actor, target);
    return other ? this.get(id).otherId : id;
  }

  /**
   * 演算結果の値を計算し取得する
   * @param id
   * @param actor
   * @param target
   * @returns
   */
  static _getValue(id: number, actor: GameBattler, target: GameBattler) {
    const strike = this.get(id);
    const baseValue = GameCalc.operation(strike.calcId, actor, target);
    return this._randomValue(strike, baseValue, actor.luk, target.luk);
  }

  /**
   * ランダム値を計算し取得する
   * @param strike
   * @param value
   * @returns
   */
  static _randomValue(
    strike: ActionStrike,
    value: number,
    sl: number,
    tl: number
  ) {
    const [min, max, coefficient] =
      strike.random === ERandomRange.MinToMax
        ? [strike.min, strike.max, value]
        : [0, value, 1];

    const rand = GameActionUtils.noRandom
      ? GameActionUtils.noRandomProcess(min, max)
      : GameUtils.luckBiasRandomInt(min, max + 1, strike.luckId, sl, tl);
    return GameRate.div(strike.rateId, rand * coefficient);
  }

  /**
   * 別パターンが有効かのテスト
   * @param index
   * @param actor
   * @param target
   * @returns
   */
  private static _otherTest(
    id: number,
    actor: GameBattler,
    target: GameBattler
  ) {
    const strike = this.get(id);
    const methodName = '_test' + strike.otherId;
    const result: boolean =
      typeof this[methodName] === 'function'
        ? this[methodName](actor, target)
        : false;
    return result;
  }

  /**
   * 攻撃別パターンテスト
   * @param actor
   * @param target
   * @returns
   */
  private static _test6(actor: GameBattler, target: GameBattler): boolean {
    const baseAtk = actor.atk;
    const targetDef = target.def;
    const baseDamage = baseAtk - targetDef / 2;
    const max = baseAtk / 16;
    if (baseDamage < max && -baseDamage < max) {
      return true;
    }
    return false;
  }
}

/**
 * 行動数値クラス
 */
export class GameActionFigure {
  /**
   * 取得する
   * @param id
   * @returns
   */
  static get(id: number) {
    return actionFigures[id];
  }

  /**
   * 範囲を取得する
   * @param id
   * @param baseValue
   * @param myself
   * @returns
   */
  static getRange(id: number, baseValue: number, myself: boolean) {
    const figure = this.get(id);
    const [min, max, rate] = myself
      ? [figure.min1, figure.max1, figure.rate1]
      : [figure.min2, figure.max2, figure.rate2];
    const value = GameRate.div(rate, baseValue, 0);
    return [min + value, max + value];
  }

  /**
   * 値を算出する
   * @param id
   * @param baseValue
   * @param myself
   * @returns
   */
  static calcValue(id: number, baseValue: number, myself: boolean) {
    const [min, max] = this.getRange(id, baseValue, myself);
    if (GameActionUtils.noRandom) {
      return GameActionUtils.noRandomProcess(min, max);
    }
    return Utils.randomInt(min, max + 1);
  }

  /**
   * 魔力影響を考慮した値を算出する
   * @param id
   * @param baseValue
   * @param myself
   * @param actor
   * @param target
   * @param magicId
   * @param luckId
   * @returns
   */
  static calcValueAffectMagicParam(
    id: number,
    baseValue: number,
    myself: boolean,
    actor: GameBattler,
    target: GameBattler,
    magicId: number,
    luckId: number
  ) {
    let [min, max] = this.getRange(id, baseValue, myself);
    if (magicId) {
      const [s, t] = [actor.wiz, target.wiz];
      min = Math.max(
        Math.floor(GameParamEffect.operation(magicId, min, s, t)),
        0
      );
      max = Math.max(
        Math.floor(GameParamEffect.operation(magicId, max, s, t)),
        0
      );
    }
    if (GameActionUtils.noRandom) {
      return GameActionUtils.noRandomProcess(min, max);
    }
    return GameUtils.luckBiasRandomInt(
      min,
      max + 1,
      luckId,
      actor.luk,
      target.luk
    );
  }
}

/**
 * ダメージ軽減クラス
 */
export class GameDamageCut {
  /**
   * 成功率
   */
  private static _successRate = [1, 1];
  /**
   * 失敗率
   */
  private static _failedRate = [0, 1];

  /**
   * 指定の守備力の軽減率を取得する
   * @param id
   * @param elementDef
   * @returns
   */
  static getCutRate(
    id: number,
    elementDef: number,
    luckId: number,
    sl: number,
    tl: number
  ) {
    const cut = system.damageCuts[id];
    const rateId = this._getRateId(cut.rateIds, elementDef);
    if (!rateId) {
      // ない場合はデフォルトを設定しておきたい
      return this._successRate;
    }
    if (cut.type === EDamageCutType.Rate) {
      // 成功なら100% 失敗なら0% を返す
      return this._luckBiosJudge(rateId, luckId, sl, tl)
        ? this._successRate
        : this._failedRate;
    }
    return GameRate.operation(rateId);
  }

  /**
   * 成功か失敗かを判定する
   * 軽減タイプrateIdがない場合と同一結果
   * @param id
   * @param elementDef
   * @returns
   */
  static judge(
    id: number,
    elementDef: number,
    luckId: number,
    sl: number,
    tl: number
  ): boolean {
    const cut = system.damageCuts[id];
    if (cut.type !== EDamageCutType.Rate) {
      return true;
    }
    const rateId = this._getRateId(cut.rateIds, elementDef);
    if (!rateId) {
      // ない場合はデフォルトを設定しておきたい
      return true;
    }
    return this._luckBiosJudge(rateId, luckId, sl, tl);
  }

  /**
   * 率Idを取得する
   * @param rateIds
   * @param elementDef
   * @returns
   */
  private static _getRateId(rateIds: number[], elementDef: number) {
    const rateId = rateIds[elementDef];
    return rateId ? rateId : Utils.lastElement(rateIds);
  }

  /**
   * 運影響の確率判定
   * @param id
   * @param luckId
   * @param sl
   * @param tl
   * @returns
   */
  private static _luckBiosJudge(
    id: number,
    luckId: number,
    sl: number,
    tl: number
  ) {
    return GameActionUtils.noRandom
      ? GameActionUtils.noRandomJudgeByRateId(id)
      : GameRate.luckBiosJudge(id, luckId, sl, tl);
  }
}

export interface NewEntry {
  same: boolean;
  battlerId: number;
  immediate: boolean;
  effectId: number;
}

/**
 * 行動効果クラス
 */
export class GameActionEffect {
  /**
   * 取得する
   * @param id
   * @returns
   */
  static get(id: number) {
    return actionEffects[id];
  }

  /**
   * 効果リストを取得する
   * @param ids
   * @returns
   */
  static effects(ids: number[]) {
    return ids.map((id) => actionEffects[id]);
  }

  /**
   * 指定の効果が含まれているか
   * @param effects
   * @param filterFn
   * @returns
   */
  static includes(
    effects: ActionEffect[],
    filterFn: (effect: ActionEffect) => boolean
  ) {
    return effects.some((effect) => filterFn(effect));
  }

  /**
   * 特殊効果コードをフィルターする
   * @param effects
   * @param type
   * @returns
   */
  static filterSpecialCode(
    effects: ActionEffect[],
    type: EActionEffectSpecial
  ) {
    return effects.filter(
      (effect) =>
        effect.code === EActionEffectCode.Special && effect.refId === type
    );
  }

  /**
   * 新規登録に変換する
   * @param effect
   * @param selfId
   * @returns
   */
  static toNewEntry(effect: ActionEffect, selfId: number): NewEntry {
    const same = effect.value1 === 0;
    const battlerId = same ? selfId : effect.value1;
    return {
      same,
      battlerId,
      immediate: effect.type === 1,
      effectId: effect.value2,
    };
  }

  /**
   * HP回復効果が含まれているか取得する
   * @param effect
   * @returns
   */
  static hpRecover(effect: ActionEffect) {
    return (
      this.directCodes.includes(effect.code) &&
      effect.value1 === EActionEffectValue1.Hp &&
      effect.type === EActionEffectType.Plus
    );
  }

  /**
   * MP回復効果が含まれているか取得する
   * @param effect
   * @returns
   */
  static mpRecover(effect: ActionEffect) {
    return (
      this.directCodes.includes(effect.code) &&
      effect.value1 === EActionEffectValue1.Mp &&
      effect.type === EActionEffectType.Plus
    );
  }

  /**
   * 直接攻撃のコードを取得する
   */
  static get directCodes() {
    return [EActionEffectCode.Calc, EActionEffectCode.Figure];
  }

  /**
   * 間接攻撃のコードを取得する
   */
  static get inDirectCodes() {
    return [EActionEffectCode.State, EActionEffectCode.Buff];
  }
}

/**
 * 行動パターンリストクラス
 */
export class GameActionPatternList {
  /**
   * 取得する
   * @param id
   * @returns
   */
  static get(id: number) {
    return actionPatternLists[id];
  }

  /**
   * スキルリストを取得する
   * @param id
   * @returns
   */
  static list(id: number) {
    return this.get(id).list;
  }

  /**
   * スキルIdを取得する
   * @param id
   * @param index
   * @returns
   */
  static skillId(id: number, index: number) {
    const pattern = this.get(id);
    return pattern.list[index].id;
  }

  /**
   * 優先度を取得する
   * @param patterns
   * @returns
   */
  static priorities(id: number, indices: number[]) {
    const patterns = this.get(id);
    const priorities = GameNumberList.get(patterns.priorityId);
    return indices.map((index) => priorities[index] ?? 0);
  }

  /**
   * インデックス群からパターンインデックスを選択する
   * @param id
   * @param indices
   * @returns
   */
  static choiceFromIndices(id: number, indices: number[]) {
    const priorities = this.priorities(id, indices);
    const index = Utils.roulette(priorities);
    return indices[index] ?? -1;
  }

  /**
   * インデックス群を優先度でシャッフルする
   * @param id
   * @param indices
   * @returns
   */
  static shuffle(id: number, indices: number[]) {
    const priorities = this.priorities(id, indices);
    return Utils.shuffleArrayWeight(indices, priorities);
  }

  /**
   * インデックス群から優先度で選択する
   * @param id
   * @param indices
   * @returns
   */
  static roulette(id: number, indices: number[]) {
    const priorities = this.priorities(id, indices);
    return Utils.rouletteWeight(indices, priorities);
  }
}
