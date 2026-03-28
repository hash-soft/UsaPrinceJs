import { Enemy, ActionPattern, Skill } from './DataTypes';
import {
  actionPatternLists,
  enemies,
  gameBattleTemp,
  gameParty,
  gameTroop,
  skills,
} from './DataStore';
import { GameActionFigure } from './GameActionUtils';
import { EBaseParamId, GameBattler, LostBattleOptions } from './GameBattler';
import { GameNumberList, GameRate, GameUtils } from './GameUtils';
import Utils from './Utils';

export interface EnemyOptions {
  dispX: number;
}

/**
 * 敵クラス
 */
export class GameEnemy extends GameBattler {
  /**
   * 個体識別文字 A～Z
   */
  // prettier-ignore
  private static LETTER_TABLE = [
    '\u{ff21}', '\u{ff22}', '\u{ff23}', '\u{ff24}', '\u{ff25}', '\u{ff26}', 
    '\u{ff27}', '\u{ff28}', '\u{ff29}', '\u{ff2a}', '\u{ff2b}', '\u{ff2c}',
    '\u{ff2d}', '\u{ff2e}', '\u{ff2f}', '\u{ff30}', '\u{ff31}', '\u{ff32}',
    '\u{ff33}', '\u{ff34}', '\u{ff35}', '\u{ff36}', '\u{ff37}', '\u{ff38}', 
    '\u{ff39}', '\u{ff3a}',
  ];
  /**
   * id
   */
  private _id: number = -1;
  /**
   * 倒した回数
   */
  private _downCount: number = 0;
  /**
   * 選択状態か
   */
  private _select: boolean = false;
  /**
   * X座標
   */
  private _x: number = 0;
  /**
   * Y座標
   */
  private _y: number = 0;
  /**
   * 敵画像名
   */
  private _enemyName: string = '';
  /**
   * 敵判別の文字
   */
  private _letter: string = '';
  /**
   * スキルリスト
   */
  private _skillList: ActionPattern[] = [];

  /**
   * コンストラクタ
   * @param _enemyId EnemyデータのId
   * @param _groupId グループId
   * @param index
   * @param options
   */
  constructor(
    private _enemyId: number,
    private _groupId: number,
    index: number,
    options: EnemyOptions
  ) {
    super();
    this.setup(index, options);
  }

  /**
   * 自分を含む仲間かどうか
   */
  get myself() {
    return false;
  }

  /**
   * Battlerオブジェクトを取得する
   */
  protected override get _battler() {
    return enemies[this._enemyId];
  }

  /**
   * 敵オブジェクトを取得する
   */
  private get _enemy() {
    return this._battler as Enemy;
  }

  /**
   * idを取得する
   * index > 6bit 64 0x3F
   * group > 3bit 8 0x1C0 >> 6
   * myself > 1bit 2 0x200
   */
  override get id() {
    return this._id;
  }

  /**
   * データidを取得する
   * 敵データIdと同一
   */
  override get dataId(): number {
    return this.enemyId;
  }

  /**
   * 倒した回数を取得する
   */
  get downCount() {
    return this._downCount;
  }

  /**
   * 表示名
   * 記号を後ろにつける
   */
  get name() {
    return super.name + this._letter;
  }

  /**
   * idを取得する
   */
  get enemyId() {
    return this._enemy.id;
  }

  /**
   * パターンリストIdを取得する
   */
  get patternListId() {
    return this._enemy.patternListId;
  }

  /**
   * X座標を設定する
   * @param value
   */
  setX(value: number) {
    this._x = value;
  }

  /**
   * Y座標を設定する
   * @param value
   */
  setY(value: number) {
    this._y = value - this.srcBoots;
  }

  /**
   * 表示X座標を取得する
   */
  get screenX() {
    return this._x;
  }

  /**
   * 表示Y座標を取得する
   */
  get screenY() {
    return this._y + 340;
  }

  /**
   * 画像Xを取得
   */
  get srcX() {
    return this._enemy.x;
  }

  /**
   * 画像Yを取得
   */
  get srcY() {
    return this._enemy.y;
  }

  /**
   * 画像幅を取得
   */
  get srcWidth() {
    return this._enemy.width;
  }

  /**
   * 画像高さを取得
   */
  get srcHeight() {
    return this._enemy.height;
  }

  /**
   * 地上からの距離
   */
  get srcBoots() {
    return this._enemy.boots;
  }

  /**
   * 敵画像名を取得
   */
  get enemyName() {
    return this._enemyName;
  }

  /**
   * 選択状態変更
   */
  set select(value) {
    this._select = value;
  }

  get select() {
    return this._select;
  }

  /**
   * グループIdを取得する
   */
  override get groupId() {
    return this._groupId;
  }

  /**
   * 敵軍を取得する
   */
  override get opponent() {
    return gameParty;
  }

  /**
   * 自軍を取得する
   */
  override get selfUnit() {
    return gameTroop;
  }

  /**
   * 指定パラメータの最大値
   * @param id
   * @returns
   */
  override maxParam(id: number): number {
    if (id === EBaseParamId.MaxHp) {
      return 999999999;
    } else {
      return super.maxParam(id);
    }
  }

  /**
   * 呼ばれることがあってはいけない
   */
  getItem(): never {
    throw new Error(Utils.programErrorText);
  }

  /**
   * GameMemberとの互換のためで
   * 呼ばれることがあってはいけないもの
   */
  consumeItem() {
    throw new Error(Utils.programErrorText);
  }

  /**
   * 経験値
   */
  get exp() {
    return this._enemy.exp;
  }

  /**
   * 獲得金
   */
  get gold() {
    return this._enemy.gold;
  }

  /**
   * 設定
   * @param enemyId
   * @param groupId
   * @param index
   */
  setup(index: number, options: EnemyOptions) {
    this._id = GameBattler._makeId(false, this.groupId, index);
    this._select = false;
    this._setEnemyParameter();
    const enemy = this._enemy;
    this.setIndex(index);
    this.setX(options.dispX);
    this.setY(0);
    this._changeHp(
      Math.max(1, this._correctValue(this.mhp, enemy.hpCorrectId))
    );
    this.setMp(this._correctValue(this.mmp, enemy.mpCorrectId));
  }

  /**
   * 敵のパラメータ値を設定する
   */
  private _setEnemyParameter() {
    const enemy = this._enemy;
    this._setBaseParams(enemy.params);
    this._setBaseSubParams(enemy.subParams);
    this.setName(enemy.name);
    this.setLv(enemy.level);
    this._skillList = this._getSkillList();
    this.changeImage(enemy.imageName);
  }

  /**
   * 補正値を取得する
   * @param value
   * @param id
   * @returns
   */
  private _correctValue(value: number, id: number) {
    if (!id) {
      return value;
    }
    const [num, rateId] = GameNumberList.get(id);
    const minusMax = num + GameRate.div(rateId, value, 0) + 1;
    const minus = Utils.randomInt(0, minusMax);
    return value - minus;
  }

  /**
   * 再設定を行う
   * @param enemyId
   * @param groupId
   * @param index
   * @param dispX
   */
  reset(
    enemyId: number,
    groupId: number,
    index: number,
    options: EnemyOptions
  ) {
    super._clear();
    this._enemyId = enemyId;
    this._groupId = groupId;
    this.setup(index, options);
  }

  /**
   * 敵変更
   * @param enemyId
   */
  transform(enemyId: number) {
    this._enemyId = enemyId;
    this._setEnemyParameter();
  }

  /**
   * 敵識別の文字を設定する
   */
  setLetter() {
    this._letter = GameEnemy.LETTER_TABLE[this.index];
  }

  /**
   * 敵スキルリストを取得
   */
  private _getSkillList() {
    return actionPatternLists[this._enemy.patternListId].list;
  }

  /**
   * 画像名の変更
   * @param imageName
   */
  changeImage(imageName: string) {
    this._enemyName = imageName;
  }

  /**
   * 移動中スキルを取得
   * 呼ばれることがあってはいけないもの
   */
  getSkill(): never {
    throw new Error(Utils.programErrorText);
  }

  /**
   * 戦闘中スキルを取得
   * @param index
   * @returns
   */
  getBattleSkill(index: number): Skill {
    const skillId = this._skillList[index].id;
    return skills[skillId];
  }

  /**
   * 敵の行動数値データを取得
   * @param id
   * @returns
   */
  actionFigure(id: number) {
    const figure = GameActionFigure.get(id);
    return {
      min: figure.min2,
      max: figure.max2,
      rate: figure.rate2,
    };
  }

  /**
   * 会心率を取得
   * @returns
   */
  getCriticalRateId(): number {
    return 0;
  }

  /**
   * 戦闘不能処理
   * @param options
   */
  override lostBattle(options?: LostBattleOptions) {
    const {
      expRateId = 0,
      goldRateId = 0,
      itemRateId = 0,
      leave = false,
    } = { ...options };
    this._downCount += 1;
    this.setLeave(leave);
    const baseExp = GameRate.div(expRateId, this.exp);
    const baseGold = GameRate.div(goldRateId, this.gold);
    const baseItemId = this._dropItemId(itemRateId);
    // 2回目移行は経験値だけ半分
    const [exp, gold, itemId] =
      this._downCount < 2
        ? [baseExp, baseGold, baseItemId]
        : [Math.floor(baseExp / 2), 0, 0];
    gameBattleTemp.addExp(exp);
    gameBattleTemp.addGold(gold);
    if (itemId > 0) {
      gameBattleTemp.addDropItem(this.enemyId, itemId);
    }
  }

  /**
   * 取得道具を取得する
   * @param itemRateId
   * @returns
   */
  private _dropItemId(itemRateId: number) {
    if (!this._enemy.itemRatesId) {
      return 0;
    }
    const itemIds = this._enemy.itemIds;
    const [rateNum, rateMax] = itemRateId
      ? GameRate.operation(itemRateId)
      : [1, 1];
    const itemRateIds = GameNumberList.get(this._enemy.itemRatesId);
    let itemId = 0;
    for (let i = itemIds.length - 1; i >= 0; i--) {
      const [num, max] = GameRate.operation(itemRateIds[i]);
      if (GameRate.judgeFromValue(num * rateNum, max * rateMax)) {
        itemId = itemIds[i];
        break;
      }
    }
    return itemId;
  }

  /**
   * 通常攻撃スキルIdを取得する
   * @returns
   */
  override getNormalAttackId() {
    return GameUtils.getEnemyStandardSkillId();
  }

  /**
   * 対象の終了処理
   */
  override targetEnd() {
    if (!this.live) {
      this.reserveDispOff();
    }
  }
  /**
   * ターン終了処理
   */
  override turnEnd(): void {
    // サイレント回復処理
    super.turnEnd();
  }

  /**
   * 行動回数を作成
   * @returns
   */
  override makeActionTimes() {
    const figureId = this._enemy.actionTimesId;
    if (!figureId) {
      return super.makeActionTimes();
    }
    const figure = GameActionFigure.get(figureId);
    return this._calcActionTimes(figure.min2, figure.max2, figure.rate2);
  }
}
