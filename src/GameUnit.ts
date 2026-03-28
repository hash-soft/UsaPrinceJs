import { gameSystem } from './DataStore';
import { BattleConditionParam } from './DataTypes';
import { GameBattler } from './GameBattler';
import { GameUtils, EErrorMessage, GameRate } from './GameUtils';
import Utils from './Utils';

/**
 * 部隊ターンタイプ
 */
export const enum EUnitTurnType {
  Normal,
  PartyRaid, // 味方から強襲
  PartySurprise, // 味方から不意打ち
  TroopRaid, // 敵から強襲
  TroopSurprise, // 敵から不意打ち
  TroopStopEscape, // 敵に逃走阻止された
}

/**
 * グループインデックス
 */
export interface GameGroupIndex {
  index: number;
  list: number[];
}

export interface NewEntryOptions {
  groupId: number;
  same: boolean;
  battlerId: number;
}

/**
 * 味方敵パーティの抽象クラス
 */
export abstract class GameUnit {
  /**
   * コンストラクタ
   */
  constructor() {}

  /**
   * クリア
   */
  protected _clear() {}

  /**
   * グループインデックスに含まれているかを取得する
   * @param groupIndex
   * @param index
   * @returns
   */
  static includeGroupIndex(groupIndex: GameGroupIndex, index: number) {
    if (groupIndex.list.includes(index)) {
      return true;
    }
    return false;
  }

  /**
   * グループインデックス群のリスト要素合計
   * @param groupIndices
   * @returns
   */
  static gameGroupIndicesListTotal(groupIndices: GameGroupIndex[]) {
    return groupIndices.reduce((total, current) => {
      return total + current.list.length;
    }, 0);
  }

  /**
   * グループインデックス群から長さのリストに変換する
   * @param groupIndices
   * @returns
   */
  static gameGroupIndicesToLengthList(groupIndices: GameGroupIndex[]) {
    return groupIndices.map((value) => value.list.length);
  }

  /**
   * 指定のインデックスを取り除く
   * @param groupIndices
   * @param group
   * @param index
   * @returns
   */
  static removeIndex(
    groupIndices: GameGroupIndex[],
    group: number,
    index: number
  ) {
    const indices = groupIndices.find((value) => value.index === group);
    if (!indices) {
      return false;
    }
    const start = indices.list.indexOf(index);
    if (start < 0) {
      return false;
    }
    indices.list.splice(start, 1);
    return true;
  }

  /**
   * グループ数を取得する
   */
  get groupLength() {
    return 1;
  }

  /**
   * 有効メンバーインデックスリストを取得する
   * ★オプションじゃなくて最初からコールバックを渡したほうがいいな
   * @returns
   */
  getMemberIndicesList(filterFn = (battler: GameBattler) => battler.exist) {
    const list: GameGroupIndex[] = [];
    for (let i = 0; i < this.groupLength; i++) {
      const indices = this.getGroupMemberIndices(i, filterFn);

      if (indices.length === 0) {
        continue;
      }
      list.push({
        index: i,
        list: indices,
      });
    }
    return list;
  }

  /**
   * グループメンバーインデックスを取得する
   * @param group
   * @param filterFn
   */
  abstract getGroupMemberIndices(
    group: number,
    filterFn: (battler: GameBattler) => boolean
  ): number[];

  /**
   * バトラーからグループインデックスに変換する
   * @param battler
   * @returns
   */
  static toGroupIndex(battler: GameBattler): GameGroupIndex {
    return {
      index: battler.groupId,
      list: [battler.index],
    };
  }

  /**
   * 指定の要因を取得する
   * @param group
   * @param index
   * @returns
   */
  abstract get(group: number, index: number): GameBattler | undefined;

  /**
   * グループメンバーをグループインデックスから取得する
   * @param groupIndex
   * @returns
   */
  abstract getGroupMembers(index: number, indices?: number[]): GameBattler[];

  /**
   * グループメンバーをグループインデックス群から取得する
   * @param groupIndices
   * @returns
   */
  getMembers(groupIndices: GameGroupIndex[]) {
    return groupIndices.flatMap((value) =>
      this.getGroupMembers(value.index, value.list)
    );
  }

  /**
   * 戦闘メンバーを取得する
   */
  getBattleMembers(): GameBattler[] {
    const groupIndices = this.getMemberIndicesList();
    return this.getMembers(groupIndices);
  }

  /**
   * 戦闘メンバーの行動回数を作成する
   */
  makeActionTimes() {
    for (const member of this.getBattleMembers()) {
      member.setActionTimes(member.makeActionTimes());
    }
  }

  /**
   * 呼び名に変換
   * @param battlers
   * @returns
   */
  static toCallName(battlers: GameBattler[]) {
    if (battlers.length < 1) {
      return '';
    }
    if (battlers.length === 1) {
      return battlers[0].name;
    }
    const members = battlers.filter((battler) => battler.myself);
    const enemies = battlers.filter((battler) => !battler.myself);
    if (members.length > 0 && enemies.length > 0) {
      return GameUtils.getEveryoneWord();
    }
    if (members.length > 0) {
      return this.toPartyCallName(members[0].gname, members.length);
    }
    return this.toTroopCallName(
      this.checkOneKind(enemies),
      enemies[0].gname,
      enemies.length
    );
  }

  /**
   * 1種かどうか確認する
   * @param targets
   * @returns
   */
  static checkOneKind(targets: GameBattler[]) {
    const dataId = targets[0].dataId;
    const count = targets.reduce((count, target) => {
      return target.dataId === dataId ? count + 1 : count;
    }, 0);
    return targets.length === count;
  }

  /**
   * パーティを呼び名に変換
   * @param name
   * @param length
   * @returns
   */
  static toPartyCallName(name: string, length: number) {
    return name + GameUtils.getPluralWord(0, length);
  }

  /**
   * 敵を呼び名に変換
   * @param one
   * @param name
   * @param length
   * @returns
   */
  static toTroopCallName(one: boolean, name: string, length: number) {
    if (one) {
      return name + GameUtils.getPluralWord(0, length);
    } else {
      return GameUtils.getFlockEnemyWord();
    }
  }

  /**
   * 新規参加者の場所を取得する
   * @param options
   */
  getNewEntry(options: NewEntryOptions): [number, number];
  getNewEntry() {
    return [-1, 0];
  }

  /**
   * 新規参加者を作成する
   * @param options
   */
  makeNewEntry(options: NewEntryOptions): GameBattler | undefined;
  makeNewEntry() {
    return undefined;
  }

  /**
   * 表示エリアがあるか確認する
   * @param battlerId
   */
  checkDispArea(battlerId: number): boolean;
  checkDispArea() {
    return true;
  }

  /**
   * 既存戦闘者の表示エリアが空いているか確認する
   * @param groupId
   * @param index
   */
  checkBattlerDispArea(groupId: number, index: number): boolean;
  checkBattlerDispArea() {
    return true;
  }

  /**
   * 新出現の参戦者を追加する
   * @param groupId
   * @param battlerId
   */
  addNewBattler(groupId: number, battlerId: number): GameBattler | undefined;
  addNewBattler(): unknown {
    throw new Error(EErrorMessage.BattlerCantCall);
  }

  /**
   * ターン状態をバトラーIdで削除する
   * @param id
   */
  removeTurnStatesByBattlerId(id: number) {
    for (const battler of this.getBattleMembers()) {
      battler.removeTurnStatesByBattlerId(id);
    }
  }

  /**
   * 既存戦闘者の表示エリアを調整する
   * @param groupId
   * @param index
   */
  adjustBattlerDispArea(groupId: number, index: number): boolean;
  adjustBattlerDispArea() {
    return true;
  }

  /**
   * グループインデックス群から先頭優先でインデックスを決定する
   * @param groupIndices
   * @returns
   */
  static fromFirstTargetByGroupIndices(groupIndices: GameGroupIndex[]) {
    const totalIndex = this._fromFirstTarget(
      this.gameGroupIndicesListTotal(groupIndices)
    );
    const [group, index] = Utils.toArrayIndex(
      GameUnit.gameGroupIndicesToLengthList(groupIndices),
      totalIndex
    );
    const groupIndex = groupIndices[group];
    return [groupIndex.index, groupIndex.list[index]];
  }

  /**
   * グループインデックスから先頭優先でインデックスを決定する
   * @param groupIndex
   * @returns
   */
  static fromFirstTargetByGroupIndex(groupIndex: GameGroupIndex) {
    const index = this._fromFirstTarget(groupIndex.list.length);
    return groupIndex.list[index];
  }

  /**
   * 先頭優先でインデックスを決定する
   * @param length
   * @returns
   */
  private static _fromFirstTarget(length: number) {
    const priorities = gameSystem.targetPriorities(length);
    return Utils.roulette(priorities);
  }

  /**
   * グループインデックス群から後ろ優先でインデックスを決定する
   * @param groupIndices
   * @returns
   */
  static fromLastTargetByGroupIndices(groupIndices: GameGroupIndex[]) {
    const totalIndex = this._fromLastTarget(
      this.gameGroupIndicesListTotal(groupIndices)
    );
    const [group, index] = Utils.toArrayIndex(
      GameUnit.gameGroupIndicesToLengthList(groupIndices),
      totalIndex
    );
    const groupIndex = groupIndices[group];
    return [groupIndex.index, groupIndex.list[index]];
  }

  /**
   * グループインデックスから後ろ優先でインデックスを決定する
   * @param groupIndex
   * @returns
   */
  static fromLastTargetByGroupIndex(groupIndex: GameGroupIndex) {
    const index = this._fromLastTarget(groupIndex.list.length);
    return groupIndex.list[index];
  }

  /**
   * 後ろ優先でインデックスを決定する
   * @param length
   * @returns
   */
  private static _fromLastTarget(length: number) {
    const priorities = gameSystem.targetPriorities(length).reverse();
    return Utils.roulette(priorities);
  }

  /**
   * グループインデックス群からHP最大者のインデックスを決定する
   * @param groupIndices
   * @returns
   */
  strongTargetByGroupIndices(groupIndices: GameGroupIndex[]) {
    const targets = this.getMembers(groupIndices);
    const totalIndex = this._strongTargetByTargets(targets);
    const [group, index] = Utils.toArrayIndex(
      GameUnit.gameGroupIndicesToLengthList(groupIndices),
      totalIndex
    );
    const groupIndex = groupIndices[group];
    return [groupIndex.index, groupIndex.list[index]];
  }

  /**
   * グループインデックスからHP最大者のインデックスを決定する
   * @param groupIndex
   * @returns
   */
  strongTargetByGroupIndex(groupIndex: GameGroupIndex) {
    const targets = this.getGroupMembers(groupIndex.index, groupIndex.list);
    const index = this._strongTargetByTargets(targets);
    return groupIndex.list[index];
  }

  /**
   * 戦闘者からHP最大者のインデックスを決定する
   * @param targets
   * @returns
   */
  private _strongTargetByTargets(targets: GameBattler[]) {
    return targets.reduce(
      (info, current, index) => {
        if (current.hp > info.hp) {
          info.hp = current.hp;
          info.index = index;
        }
        return info;
      },
      { index: 0, hp: 0 }
    ).index;
  }

  /**
   * グループインデックス群からHP最小者のインデックスを決定する
   * @param groupIndices
   * @returns
   */
  weakTargetByGroupIndices(groupIndices: GameGroupIndex[]) {
    const targets = this.getMembers(groupIndices);
    const totalIndex = this._weakTargetByTargets(targets);
    const [group, index] = Utils.toArrayIndex(
      GameUnit.gameGroupIndicesToLengthList(groupIndices),
      totalIndex
    );
    const groupIndex = groupIndices[group];
    return [groupIndex.index, groupIndex.list[index]];
  }

  /**
   * グループインデックスからHP最小者のインデックスを決定する
   * @param groupIndex
   * @returns
   */
  weakTargetByGroupIndex(groupIndex: GameGroupIndex) {
    const targets = this.getGroupMembers(groupIndex.index, groupIndex.list);
    const index = this._weakTargetByTargets(targets);
    return groupIndex.list[index];
  }

  /**
   * 戦闘者からHP最小者のインデックスを決定する
   * @param targets
   * @returns
   */
  private _weakTargetByTargets(targets: GameBattler[]) {
    return targets.reduce(
      (info, current, index) => {
        if (current.hp < info.hp) {
          info.hp = current.hp;
          info.index = index;
        }
        return info;
      },
      { index: 0, hp: Number.MAX_SAFE_INTEGER }
    ).index;
  }

  /**
   * グループインデックス群からランダムでインデックスを決定する
   * @param groupIndex
   * @returns
   */
  static randomTargetByGroupIndices(groupIndices: GameGroupIndex[]) {
    const length = groupIndices.reduce((total, current) => {
      return total + current.list.length;
    }, 0);
    if (!length) {
      return [-1, -1];
    }
    let index = Utils.randomInt(0, length);
    for (const groupIndex of groupIndices) {
      if (index < groupIndex.list.length) {
        return [groupIndex.index, groupIndex.list[index]];
      }
      index -= groupIndex.list.length;
    }
    return [-1, -1];
  }

  /**
   * グループインデックスからランダムでインデックスを決定する
   * @param groupIndex
   * @returns
   */
  static randomTargetByGroupIndex(groupIndex: GameGroupIndex) {
    const index = Utils.randomInt(0, groupIndex.list.length);
    return groupIndex.list[index];
  }

  /**
   * ユニットレベルを取得する
   */
  abstract getLv(): number;

  /**
   * グループが行動パターンを使用した回数を１追加する
   * @param group
   * @param pattern
   */
  increasePatternTimes(group: number, pattern: number): void;
  increasePatternTimes() {
    //
  }

  /**
   * グループが行動パターンを使用した回数取得する
   * @param group
   * @returns
   */
  getPatternTimes(group: number, pattern: number): number;
  getPatternTimes() {
    return 0;
  }

  /**
   * 現在のグループパターンを設定する
   * @param group
   * @param pattern
   */
  setCurrentPattern(group: number, pattern: number): void;
  setCurrentPattern() {
    //
  }

  /**
   * 現在のグループパターンを取得する
   * @param group
   */
  getCurrentPattern(group: number): number;
  getCurrentPattern() {
    return 0;
  }

  /**
   * 消耗度条件
   */
  consumeCondition({
    param1: min,
    param2: max,
  }: BattleConditionParam): boolean {
    const totalMaxHp = this.getTotalMaxHp();
    const totalHp = this.getTotalHp();
    min = GameRate.div(min, totalMaxHp, 0);
    max = GameRate.div(max, totalMaxHp);
    return min <= totalHp && totalHp <= max;
  }

  /**
   * 総HPを取得する
   */
  abstract getTotalHp(): number;

  /**
   * 総最大HPを取得する
   */
  abstract getTotalMaxHp(): number;

  /**
   * 戦闘者条件
   * @param params
   */
  abstract battlerCondition(params: BattleConditionParam): boolean;
}
