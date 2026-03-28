import { Troop, ETroopOrderType, BattleConditionParam } from './DataTypes';
import { enemies, gameBattleTemp, gameSystem, troops } from './DataStore';
import { GameBattleAction } from './GameAction';
import { GameBattler } from './GameBattler';
import { EResolve } from './GameConfig';
import { GameEnemy } from './GameEnemy';
import { GameGroup } from './GameGroup';
import { EUnitTurnType, GameUnit, NewEntryOptions } from './GameUnit';
import { EErrorMessage, GameRate } from './GameUtils';
import Utils from './Utils';

/**
 * 開始時の敵情報
 */
interface StartingGroup {
  id: number;
  list: StartingEnemy[];
}

interface StartingEnemy {
  decreaseHp: number;
  dispX: number;
}

interface GroupInfo {
  name: string;
  length: number;
  index: number;
}

/**
 * 敵の群れ
 */
export class GameTroop extends GameUnit {
  /**
   * 開始時の敵情報配列
   * ここから敵を作成する
   */
  private _startingGroups: StartingGroup[] = [];
  /**
   * 敵グループ配列
   */
  private _enemyGroups: GameGroup[] = [];
  /**
   * 敵マップ
   */
  private _enemiesMap: Map<number, GameEnemy[]> = new Map();
  /**
   * 新規追加マップ
   */
  private _newEntryMap: Map<number, GameEnemy> = new Map();
  /**
   * 追加の敵
   */
  private _addEnemies: GameEnemy[] = [];
  /**
   * 戦闘イベントId
   */
  private _eventId: number = 0;
  /**
   * トループレベル
   */
  private _level: number = 1;
  /**
   * 敵の間隔
   */
  private static _DISTANCE = 2;
  /**
   * 最大グループ
   */
  private static _MAX_GROUP = 4;
  /**
   * 同じ敵の最大数
   */
  private static _MAX_SAME_ENEMY = 26;

  /**
   * コンストラクタ
   */
  constructor() {
    super();
  }

  /**
   * 生きている敵を一次元配列で取得する
   */
  get liveEnemies() {
    return this._enemyGroups.flatMap((group) => group.liveEnemies);
  }

  /**
   * 敵をグループで取得する
   */
  get enemyGroups() {
    return this._enemyGroups;
  }

  /**
   * グループ数を取得する
   */
  override get groupLength() {
    return this.enemyGroups.length;
  }

  /**
   * グループ情報を取得する
   * 敵表示ウィンドウで使用される
   */
  get groupInfos() {
    return this._getGroupInfos();
  }

  /**
   * グループ情報を取得する
   * @returns
   */
  private _getGroupInfos() {
    return this._enemyGroups.reduce((groupInfos: GroupInfo[], group) => {
      const indices = group.getLiveEnemyIndices();
      if (indices.length > 0) {
        groupInfos.push({
          name: group.enemyName,
          length: indices.length,
          index: group.groupId,
        });
      }
      return groupInfos;
    }, []);
  }

  /**
   * 戦闘イベントIdを取得する
   */
  get eventId() {
    return this._eventId;
  }

  /**
   * クリア
   */
  clear() {
    super._clear();
    this._startingGroups = [];
    this._enemyGroups = [];
    this._enemiesMap = new Map();
    this._newEntryMap = new Map();
    this._addEnemies = [];
    this._eventId = 0;
  }

  /**
   * 戦闘継続可能メンバーがいるか
   * @returns
   */
  existContinueFighting() {
    // とりあえず生存メンバーがいれば可能
    return this.liveEnemies.length > 0;
  }

  /**
   * 設定
   */
  setup(troopId: number) {
    this._makeStarting(troopId);
    this.refresh();
  }

  /**
   * 開始時の情報を作成する
   */
  private _makeStarting(troopId: number) {
    const max = EResolve.Width;
    const troop = troops[troopId];
    const appears = this._choiceAppears(troop);
    this._eventId = troop.eventId;
    this._level = troop.lv;
    let total = 0;
    this._startingGroups = appears
      .map((appear): StartingGroup => {
        const maxNum = Utils.randomInt(appear.min, appear.max + 1);
        const enemy = enemies[appear.enemyId];
        let num = 0;
        // 画面に収まる敵数に補正する
        for (let i = 0; i < maxNum; i++) {
          total += enemy.width;
          if (total > max) {
            break;
          }
          total += GameTroop._DISTANCE;
          num += 1;
        }
        const list = Array(num)
          .fill(undefined)
          .map((): StartingEnemy => {
            return { decreaseHp: 0, dispX: 0 };
          });
        return {
          id: appear.enemyId,
          list,
        };
      })
      .filter((groups) => groups.list.length > 0)
      .slice(0, GameTroop._MAX_GROUP);

    this._startingPlacement();
  }

  /**
   * 初期位置を設定する
   */
  private _startingPlacement() {
    const total = this._startingGroups.reduce((total, current) => {
      const enemy = enemies[current.id];
      return total + (enemy.width + GameTroop._DISTANCE) * current.list.length;
    }, -GameTroop._DISTANCE);

    let left = Math.floor((EResolve.Width - total) / 2);
    for (const starting of this._startingGroups) {
      const enemy = enemies[starting.id];
      for (const one of starting.list) {
        one.dispX = left;
        left += enemy.width + GameTroop._DISTANCE;
      }
    }
  }

  /**
   * 出現する敵を選択する
   * @param troop
   * @returns
   */
  private _choiceAppears(troop: Troop) {
    switch (troop.orderType) {
      case ETroopOrderType.Asc:
        return troop.appears;
      case ETroopOrderType.Des:
        return [...troop.appears].reverse();
    }
    return Utils.shuffleArray([...troop.appears]);
  }

  /**
   * 一新する
   */
  refresh() {
    gameBattleTemp.clear();
    this._enemiesMap.clear();
    this._newEntryMap.clear();
    this._makeEnemiesMap();
    this._makeGroups();
  }

  /**
   * 敵マップを作成する
   */
  private _makeEnemiesMap() {
    for (let groupId = 0; groupId < this._startingGroups.length; groupId++) {
      const startingGroup = this._startingGroups[groupId];
      const id = startingGroup.id;
      const enemies = this._enemiesMap.get(id) ?? [];
      const addEnemies = startingGroup.list.map((starting, index) => {
        return new GameEnemy(id, groupId, index + enemies.length, {
          dispX: starting.dispX,
        });
      });
      enemies.push(...addEnemies);
      this._enemiesMap.set(id, enemies);
    }
    this._setEnemiesLetter();
  }

  /**
   * 敵を識別する文字を設定する
   */
  private _setEnemiesLetter() {
    for (const enemies of this._enemiesMap.values()) {
      this._setEnemiesLetterSame(enemies);
    }
  }

  /**
   * 敵を識別する文字を同種の敵に設定する
   * @param enemies
   * @returns
   */
  private _setEnemiesLetterSame(enemies: GameEnemy[]) {
    if (enemies.length < 2) {
      return;
    }
    for (const enemy of enemies) {
      enemy.setLetter();
    }
  }

  /**
   * 敵グループを作成する
   */
  private _makeGroups() {
    this._enemyGroups = this._startingGroups.map((starting, index) => {
      const refEnemies = this._enemiesMap.get(starting.id);
      return new GameGroup(index, refEnemies as GameEnemy[]);
    });
  }

  /**
   * グループ選択状態にする
   * @param n
   */
  selectGroup(n: number) {
    this._enemyGroups.forEach((group, index) => {
      if (n === index) {
        group.setSelect(true);
      } else {
        group.setSelect(false);
      }
    });
  }

  /**
   * ターン終了後の処理
   */
  turnEnd() {
    for (const group of this._enemyGroups) {
      group.turnEnd();
    }
  }

  /**
   * 戦闘終了
   */
  fightEnd() {
    //
  }

  /**
   * 倒したか確認する
   * @returns
   */
  checkDefeat() {
    return this._someEnemiesDefeat();
  }

  /**
   * 倒した敵がいるか確認する
   * @returns
   */
  private _someEnemiesDefeat() {
    return [...this._enemiesMap.values()].some((enemies) =>
      enemies.some((enemy) => enemy.down)
    );
  }

  /**
   * すべての敵が去ったかどうかを取得する
   * @returns
   */
  private _allEnemiesLeave() {
    return [...this._enemiesMap.values()].every((enemies) =>
      enemies.every((enemy) => enemy.leave)
    );
  }

  /**
   * 呼び名を取得する
   */
  getUnitCallName() {
    const counts = [...this._enemiesMap.values()].map(
      (enemies) => enemies.length
    );

    return GameUnit.toTroopCallName(
      counts.length < 2,
      this._enemyGroups[0].enemyName,
      counts[0]
    );
  }

  /**
   * 行動を作成
   * 先制か逃げるで行動から漏れた敵は行動から外す
   * @returns
   */
  makeActions(preemptive: boolean) {
    const enemies = this._enemyGroups.flatMap((group) => group.liveEnemies);
    const filterEnemies = preemptive
      ? this._preemptiveEnemies(enemies)
      : enemies;
    // ランダムでシャッフル
    Utils.shuffleArray(filterEnemies);
    const actions = filterEnemies.flatMap((enemy) => {
      const action = new GameBattleAction(enemy);
      for (let i = 0; i < enemy.actionTimes; i++) {
        action.make();
      }
      return [action];
    });
    return actions;
  }

  /**
   * 先制する敵を取得する
   * 行動不能は行動対象
   * @returns
   */
  private _preemptiveEnemies(enemies: GameEnemy[]) {
    const actionableSubjects: number[] = [];
    const actionlessSubjects: number[] = [];
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.actionable) {
        actionableSubjects.push(i);
      } else {
        actionlessSubjects.push(i);
      }
    }
    const length = actionableSubjects.length;
    if (length === 0) {
      return actionlessSubjects.map((order) => enemies[order]);
    }
    const num = Utils.randomInt(0, length) + 1;
    const box = Array.from({ length }, (_v, i) => i);
    const subjects = Utils.shuffleArray(box);
    subjects.length = num;
    return [...subjects, ...actionlessSubjects].map((order) => enemies[order]);
  }

  /**
   * 初回攻撃タイプを取得
   */
  firstAttack(rateIds1: number[], rateIds2: number[]) {
    rateIds1.push(gameSystem.troopRaidRateId);
    if (GameRate.multiJudge(rateIds1)) {
      return EUnitTurnType.TroopRaid;
    }
    rateIds2.push(gameSystem.troopSurpriseRateId);
    if (GameRate.multiJudge(rateIds2)) {
      return EUnitTurnType.TroopSurprise;
    }
    return EUnitTurnType.Normal;
  }

  /**
   * パーティレベルを取得する
   * 生存中メンバーの中の最大レベル
   */
  getLv() {
    return this._level;
  }

  /**
   * 行動可能か
   * @param type
   * @returns
   */
  Actionable(type: EUnitTurnType) {
    return ![EUnitTurnType.PartyRaid, EUnitTurnType.PartySurprise].includes(
      type
    );
  }

  /**
   * 追加の敵を取り出す
   * @returns
   */
  popAddEnemy() {
    return this._addEnemies.pop();
  }

  /**
   * 新規参加者の場所を取得する
   * @param options
   * @returns
   */
  override getNewEntry(options: NewEntryOptions): [number, number] {
    if (options.same) {
      if (options.groupId >= this._enemyGroups.length) {
        // 自分のグループがない
        return [-1, 0];
      }
      // 同一グループ
      return [options.groupId, this._enemyGroups[options.groupId].enemyId];
    } else {
      // 別グループ
      const group = this.enemyGroups.find(
        (group) =>
          group.groupId !== options.groupId &&
          group.enemyId === options.battlerId
      );
      if (group) {
        return [group.groupId, group.enemyId];
      } else {
        // 最大グループを超えていなければ新規エントリーを作成する
        return this.enemyGroups.length >= GameTroop._MAX_GROUP
          ? [-1, 0]
          : [this.enemyGroups.length, options.battlerId];
      }
    }
  }

  /**
   * 新規参加者を作成する
   * @param options
   * @returns
   */
  override makeNewEntry(options: NewEntryOptions) {
    // 指定の敵が追加可能か
    const enemies = this._enemiesMap.get(options.battlerId) ?? [];
    const appearAll =
      enemies.length >= GameTroop._MAX_SAME_ENEMY &&
      enemies.every((enemy) => enemy.live);
    if (appearAll) {
      return;
    }

    const [groupId, enemyId] = this.getNewEntry(options);
    if (groupId >= 0) {
      return this.addNewBattler(groupId, enemyId);
    }
  }

  /**
   * 表示エリアがあるか確認する
   * @param battlerId
   * @returns
   */
  override checkDispArea(battlerId: number): boolean {
    const needWidth = enemies[battlerId].width;
    // 横位置を昇順に並び替えた表示されている敵
    const appearEnemies = this.liveEnemies.sort(
      (a, b) => a.screenX - b.screenX
    );
    let left = 0;
    let result = false;
    for (let i = 0; i < appearEnemies.length; i++) {
      const enemy = appearEnemies[i];
      const area = enemy.screenX - GameTroop._DISTANCE - left;
      if (area >= needWidth) {
        result = true;
        break;
      }
      left = enemy.screenX + enemy.srcWidth + GameTroop._DISTANCE;
    }
    // 右側の隙間を考慮
    return result || EResolve.Width - left >= needWidth;
  }

  /**
   * 既存戦闘者の表示エリアが空いているか確認する
   * @param groupId
   * @param index
   * @returns
   */
  override checkBattlerDispArea(groupId: number, index: number): boolean {
    const enemy = this._enemyGroups[groupId].getEnemy(index);
    if (!enemy) {
      return false;
    }
    const needWidth = enemy.srcWidth;
    const screenX = enemy.screenX;
    const left = screenX - GameTroop._DISTANCE;
    const right = screenX + needWidth + GameTroop._DISTANCE;
    // いずれか重なっていればfalse
    return !this.liveEnemies.some((enemy) => {
      return left < enemy.screenX + enemy.srcWidth && enemy.screenX < right;
    });
  }

  /**
   * 新出現の敵を追加する
   * @param groupId
   * @param battlerId
   */
  override addNewBattler(
    groupId: number,
    battlerId: number
  ): GameBattler | undefined {
    // 追加位置を取得
    const dispX = this._findAddEnemyDispX(battlerId);
    if (dispX < 0) {
      return;
    }
    // グループに敵を追加
    if (groupId < this._enemyGroups.length) {
      const enemy = this._newEnemy(groupId, battlerId, {
        decreaseHp: 0,
        dispX: dispX,
      });
      this._addEnemies.push(enemy);
      return enemy;
    } else {
      // グループが存在しない場合は作成
      const groupId = this._enemyGroups.length;
      const enemy = this._newEnemy(groupId, battlerId, {
        decreaseHp: 0,
        dispX: dispX,
      });
      const enemies = this._enemiesMap.get(battlerId) as GameEnemy[];
      this._enemyGroups.push(new GameGroup(groupId, enemies));
      this._addEnemies.push(enemy);
      return enemy;
    }
  }

  /**
   * 新しい敵を作成する
   * @param id
   * @param groupId
   * @param options
   * @returns
   */
  private _newEnemy(groupId: number, id: number, options: StartingEnemy) {
    const enemies = this._enemiesMap.get(id) ?? [];
    this._enemiesMap.set(id, enemies);

    if (enemies.length < GameTroop._MAX_SAME_ENEMY) {
      const enemy = new GameEnemy(id, groupId, enemies.length, {
        dispX: options.dispX,
      });
      enemies.push(enemy);
      this._setEnemiesLetterSame(enemies);
      return enemy;
    }

    // インデックスを取得
    const index = this._findEmptyIndex(enemies);
    if (index < 0) {
      // 出現不可能例外
      throw new Error(EErrorMessage.EnemyCantAppear);
    }
    // リセットする
    const newEnemy = enemies[index];
    newEnemy.reset(id, groupId, index, { dispX: options.dispX });
    this._setEnemiesLetterSame(enemies);

    return newEnemy;
  }

  /**
   * 空きインデックスを探す
   * @param enemies
   * @returns
   */
  private _findEmptyIndex(enemies: GameEnemy[]) {
    // 去っていったインデックスを探す
    const leaveIndex = enemies.findIndex((enemy) => enemy.leave);
    if (leaveIndex >= 0) {
      return leaveIndex;
    }
    // 倒れているインデックスを探す
    const downIndex = enemies.findIndex((enemy) => enemy.down);
    // これでもない場合は追加不可
    return downIndex;
  }

  /**
   * 追加敵のX座標を探す
   * @param enemyId
   * @returns
   */
  private _findAddEnemyDispX(enemyId: number) {
    const needWidth = enemies[enemyId].width;
    // 横位置を昇順に並び替えた表示されている敵
    const appearEnemies = this.liveEnemies.sort(
      (a, b) => a.screenX - b.screenX
    );
    let left = 0;
    const choices: number[] = [];
    for (let i = 0; i < appearEnemies.length; i++) {
      const enemy = appearEnemies[i];
      const area = enemy.screenX - GameTroop._DISTANCE - left;
      const center = this._calcDispCenterX(area, needWidth, left);
      if (center >= 0) {
        choices.push(center);
      }
      left = enemy.screenX + enemy.srcWidth + GameTroop._DISTANCE;
    }
    const center = this._calcDispCenterX(
      EResolve.Width - left,
      needWidth,
      left
    );
    if (center >= 0) {
      choices.push(center);
    }
    if (choices.length < 1) {
      return -1;
    }
    // 中央に近い値を抜き出す
    const centerX = EResolve.Width / 2;
    const dispCenterX = choices.reduce((prev, curr) => {
      return Math.abs(curr - centerX) <= Math.abs(prev - centerX) ? curr : prev;
    });

    return dispCenterX - needWidth / 2;
  }

  /**
   * 表示中央位置を算出する
   * @param area
   * @param needWidth
   * @param left
   * @returns
   */
  private _calcDispCenterX(area: number, needWidth: number, left: number) {
    if (area >= needWidth) {
      const center = left + area / 2;
      if (center < EResolve.Width / 2) {
        // 画面左に出現
        return left + area - needWidth / 2;
      } else {
        // 画面右に出現
        return left + needWidth / 2;
      }
    }
    return -1;
  }

  /**
   * 既存戦闘者の表示エリアを調整する
   * @param groupId
   * @param index
   * @returns
   */
  override adjustBattlerDispArea(groupId: number, index: number): boolean {
    const noChange = this.checkBattlerDispArea(groupId, index);
    if (noChange) {
      return true;
    }
    const enemy = this._enemyGroups[groupId].getEnemy(index);
    if (!enemy) {
      return false;
    }
    const left = this._findAddEnemyDispX(enemy.enemyId);
    if (left < 0) {
      return false;
    }
    enemy.setX(left);
    enemy.setY(0);
    return true;
  }

  /**
   * 指定の要因を取得する
   * @param group
   * @param index
   * @returns
   */
  override get(group: number, index: number): GameBattler | undefined {
    return this._enemyGroups[group]?.getEnemy(index);
  }

  /**
   * グループメンバーをグループインデックスから取得する
   * @param groupIndex
   * @returns
   */
  override getGroupMembers(index: number, indices?: number[]): GameBattler[] {
    const enemyGroup = this._enemyGroups[index];
    if (enemyGroup) {
      return indices
        ? enemyGroup.getEnemiesFromIndices(indices)
        : enemyGroup.enemies;
    } else {
      return [];
    }
  }

  /**
   * グループメンバーインデックスを取得する
   * @param group
   * @param filterFn
   * @returns
   */
  override getGroupMemberIndices(
    group: number,
    filterFn: (battler: GameBattler) => boolean
  ): number[] {
    return this._enemyGroups[group]?.getEnemyIndices(filterFn) ?? [];
  }

  /**
   * グループが行動パターンを使用した回数を１追加する
   * @param group
   * @param pattern
   */
  override increasePatternTimes(group: number, pattern: number): void {
    this.enemyGroups[group].increasePatternTimes(pattern);
  }

  /**
   * グループが行動パターンを使用した回数取得する
   * @param group
   * @returns
   */
  override getPatternTimes(group: number, pattern: number): number {
    return this.enemyGroups[group].getPatternTimes(pattern);
  }

  /**
   * 現在のグループパターンを設定する
   * @param group
   * @param pattern
   */
  override setCurrentPattern(group: number, pattern: number): void {
    this.enemyGroups[group].setCurrentPattern(pattern);
  }

  /**
   * 現在のグループパターンを取得する
   * @param group
   */
  override getCurrentPattern(group: number): number {
    return this.enemyGroups[group].currentPattern;
  }

  /**
   * 総HPを取得する
   * @returns
   */
  override getTotalHp(): number {
    let total = 0;
    for (const enemies of this._enemiesMap.values()) {
      total += enemies.reduce((subTotal, enemy) => {
        return subTotal + (enemy.leave ? 0 : enemy.hp);
      }, 0);
    }
    return total;
  }

  /**
   * 総最大を取得する
   * @returns
   */
  override getTotalMaxHp(): number {
    let total = 0;
    for (const enemies of this._enemiesMap.values()) {
      total += enemies.reduce((subTotal, enemy) => {
        return subTotal + enemy.mhp;
      }, 0);
    }
    return total;
  }

  /**
   * 敵条件
   * @param params
   * @returns
   */
  override battlerCondition(params: BattleConditionParam): boolean {
    const targets = this._enemiesMap.get(params.target);
    if (!targets) {
      return false;
    }
    const count = targets.reduce((total, enemy) => {
      return total + (enemy.meetHpCondition(params) ? 1 : 0);
    }, 0);

    return count >= params.num;
  }
}
