import { actionPatternLists, system } from './DataStore';
import { GameActionPatternList } from './GameActionUtils';
import { GameBattler } from './GameBattler';
import { GameEnemy } from './GameEnemy';
import { EErrorMessage } from './GameUtils';

/**
 * グループ
 */
export class GameGroup {
  /**
   * 行動パターン使用回数リスト
   */
  private _patternTimesList: number[] = [];
  /**
   * 現在指している行動パターンインデックス
   */
  private _currentPattern: number = 0;

  /**
   * コンストラクタ
   * @param _groupId GameTroopのグループインデックスと同一
   * @param _refEnemies 敵の参照
   */
  constructor(
    private _groupId: number,
    private _refEnemies: GameEnemy[]
  ) {
    if (_refEnemies === undefined || _refEnemies.length < 1) {
      throw new Error(EErrorMessage.RougeGroup);
    }
    this._resetPatternTimesList();
  }

  /**
   * グループの敵を取得する
   */
  private get _enemies() {
    return this._getGroupIndices().map((index) => this._refEnemies[index]);
  }

  /**
   * グループidを取得する
   */
  get groupId() {
    return this._groupId;
  }

  /**
   * グループの敵idを取得する
   */
  get enemyId() {
    return this._refEnemies[0].enemyId;
  }

  /**
   * グループの敵名を取得する
   */
  get enemyName() {
    // 先頭のグループ名を返す
    return this._refEnemies[0].gname;
  }

  /**
   * グループの敵数を取得する
   */
  get enemyLength() {
    return this._enemies.length;
  }

  /**
   * グループの敵を取得する
   */
  get enemies() {
    return this._enemies;
  }

  /**
   * 生存メンバーを取得
   */
  get liveEnemies() {
    return this.getEnemiesFromIndices(this.getLiveEnemyIndices());
  }

  /**
   * 行動可能メンバーを取得
   */
  get actionableEnemies() {
    return this.getEnemiesFromIndices(this.getActionableEnemyIndices());
  }

  /**
   * ダウンメンバーを取得
   */
  get downEnemies() {
    return this._enemies.filter((enemy) => {
      return enemy.down;
    });
  }

  /**
   * 退場メンバーを取得
   */
  get leaveEnemies() {
    return this._enemies.filter((enemy) => {
      return enemy.leave;
    });
  }

  /**
   * 現在のパターンを取得する
   */
  get currentPattern() {
    return this._currentPattern;
  }

  /**
   * 選択設定
   * @param value
   */
  setSelect(value: boolean) {
    for (const enemy of this.liveEnemies) {
      enemy.select = value;
    }
  }

  /**
   * ターン終了処理
   */
  turnEnd() {
    // for (const enemy of this._enemies) {
    //   enemy.turnEnd();
    // }
    this._resetPatternTimesList();
  }

  /**
   * 行動パターン使用回数
   */
  private _resetPatternTimesList() {
    const patternListId = this._refEnemies[0].patternListId;
    const patternList = actionPatternLists[patternListId];
    const n =
      patternList.conditionId > 0
        ? system.numberLists[patternList.conditionId].length
        : 0;
    if (!n) {
      this._patternTimesList = [];
      return;
    }
    for (let i = 0; i < n; i++) {
      this._patternTimesList[i] = 0;
    }
  }

  /**
   * 行動パターン使用を1回増加する
   * @param pattern
   */
  increasePatternTimes(pattern: number) {
    const list = GameActionPatternList.list(this._refEnemies[0].patternListId);
    const index = list[pattern].rating;
    this._patternTimesList[index] += 1;
  }

  /**
   * 行動パターンを使用した回数を取得する
   * @param pattern
   * @returns
   */
  getPatternTimes(pattern: number) {
    return this._patternTimesList[pattern];
  }

  getEnemyIndices(filterFn: (battler: GameBattler) => boolean) {
    return this._getGroupIndices().filter((index) =>
      filterFn(this._refEnemies[index])
    );
  }

  /**
   * グループ内の存在している敵インデックスを取得する
   * @returns
   */
  // getExistEnemyIndices(stateTypeId: number) {
  //   return this._getGroupIndices().filter(
  //     (index) =>
  //       this._refEnemies[index].exist &&
  //       (!stateTypeId || this._refEnemies[index].hasStateType(stateTypeId))
  //   );
  // }

  /**
   * グループ内の生きている敵インデックスを取得する
   * @returns
   */
  getLiveEnemyIndices() {
    return this._getGroupIndices().filter(
      (index) => this._refEnemies[index].live
    );
  }

  /**
   * グループ内の行動可能な敵インデックスを取得する
   * @returns
   */
  getActionableEnemyIndices() {
    return this._getGroupIndices().filter(
      (index) => this._refEnemies[index].actionable
    );
  }

  /**
   * グループ内の倒れている敵インデックスを取得する
   * @returns
   */
  getDownEnemyIndices() {
    return this._getGroupIndices().filter(
      (index) => this._refEnemies[index].down
    );
  }

  /**
   * グループ内の敵インデックスを取得する
   * @returns
   */
  private _getGroupIndices() {
    const indices: number[] = [];
    for (let i = 0; i < this._refEnemies.length; i++) {
      if (this._sameGroup(this._refEnemies[i])) {
        indices.push(i);
      }
    }
    return indices;
  }

  /**
   * 同じグループかどうか
   * @param enemy
   * @returns
   */
  private _sameGroup(enemy: GameEnemy) {
    return enemy.groupId === this._groupId;
  }

  /**
   * 敵をインデックス群から取得する
   * @param indices
   * @returns
   */
  getEnemiesFromIndices(indices: number[]) {
    return indices.map((index) => this._refEnemies[index]);
  }

  /**
   * 敵1体を取得する
   * @param index
   * @returns
   */
  getEnemy(index: number) {
    return this._refEnemies[index];
  }

  /**
   * 現在のパターンを設定する
   * @param value
   */
  setCurrentPattern(value: number) {
    this._currentPattern = value;
  }
}
