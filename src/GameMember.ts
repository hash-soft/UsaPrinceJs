import {
  EItemKind,
  Member,
  Item,
  Skill,
  Parameter,
  ESelectType,
} from './DataTypes';
import {
  gameMenus,
  gameParty,
  gameTroop,
  items as dataItems,
  learnings,
  memberParts,
  members,
  skillLists,
  skills,
  states,
  system,
  weapons,
} from './DataStore';
import { EMenuTransfer } from './ExecutorMapMenu';
import { GameActionFigure } from './GameActionUtils';
import {
  EBaseParamId,
  GameBattler,
  SaveObjectGameBattler,
} from './GameBattler';
import { GameMaterial } from './GameMaterial';
import { GameNumberList, GameNumberMap, GameRate } from './GameUtils';
import Utils from './Utils';
import { GameItem } from './GameItem';

interface ParameterInfo {
  rateIndex: number;
  refIndex: number;
  pos: number;
  baseValue: number;
  delimiterValue: number;
}

interface PersonalItem {
  id: number;
  equip: boolean;
}

interface lvUpValue {
  level: number;
  params: number[];
  subParams: number[];
  skills: number[];
}

/**
 * メンバークラスのセーブオブジェクト
 */
export interface SaveObjectGameMember extends SaveObjectGameBattler {
  id: number;
  memberId: number;
  exp: number;
  classId: number;
  items: PersonalItem[];
  imageId: number;
  imageIndex: number;
  downId: number;
  downIndex: number;
  skills: number[];
  maxLevel: number;
  plusParams: number[];
  lastBattleItem: number;
  lastBattleSkill: number;
  hidden: boolean;
}

export type SuspendObjectGameMember = SaveObjectGameMember;

/**
 * 味方の戦闘メンバー
 */
export class GameMember extends GameBattler {
  /**
   * ゲームメンバーId
   * メンバーデータのIdとは別でGameMembersのインデックス
   */
  private _id: number = -1;
  /**
   * メンバーデータId
   */
  private _memberId: number = 0;
  /**
   * 経験値
   */
  private _exp: number = 0;
  /**
   * クラスId
   */
  private _classId: number = 0;
  /**
   * 所持道具
   */
  private _items: GameItem[] = [];
  /**
   * キャラセットId
   */
  private _imageId: number = 0;
  /**
   * キャラセットインデックス
   */
  private _imageIndex: number = 0;
  /**
   * 倒れた状態のキャラセットId
   */
  private _downId: number = 0;
  /**
   * 倒れた状態のキャラセットインデックス
   */
  private _downIndex: number = 0;
  /**
   * 移動中に使用可能なスキルリスト
   */
  private _skillList: number[] = [];
  /**
   * 戦闘中に使用可能なスキルリスト
   */
  private _battleSkillList: number[] = [];
  /**
   * 習得スキル
   */
  private _skills: number[] = [];
  /**
   * 道具最大所持数
   */
  private _maxItem: number = system.maxItem;
  /**
   * 最大レベル
   */
  private _maxLevel: number = 99;
  /**
   * ドーピングパラメータ
   */
  private _plusParams: number[] = [0, 0, 0, 0, 0, 0, 0];
  /**
   * 最後に使用した戦闘アイテム
   */
  private _lastBattleItem: number = 0;
  /**
   * 最後に称した戦闘技能
   */
  private _lastBattleSkill: number = 0;
  /**
   * 移動ダメージエフェクトId
   */
  private _moveDamageEffectId: number = 0;
  /**
   * 移動ダメージ1フレーム蓄積
   */
  private _moveDamageValue: number = 0;
  /**
   * 移動時に倒れたかどうか
   */
  private _moveDown: boolean = false;
  /**
   * 隊列に含めないかどうか
   */
  private _hidden: boolean = false;

  /**
   * コンストラクタ
   */
  constructor() {
    super();
  }

  /**
   * Battlerオブジェクトを取得する
   */
  protected override get _battler() {
    return members[this._memberId];
  }

  /**
   * メンバーオブジェクトを取得する
   */
  private get _member() {
    return this._battler as Member;
  }

  /**
   * idを設定
   * @param value
   */
  private _setId(value: number) {
    this._id = value;
  }

  /**
   * idを取得
   */
  override get id() {
    return this._id;
  }

  /**
   * データidを取得する
   * メンバーIdと同一
   */
  override get dataId(): number {
    return this.memberId;
  }

  /**
   * メンバーIdを取得する
   */
  get memberId(): number {
    return this._memberId;
  }

  /**
   * 自分を含む仲間かどうか
   */
  get myself() {
    return true;
  }

  /**
   * アニメーション対象を取得する
   */
  override get animationTarget(): GameMaterial {
    return gameMenus.windows;
  }

  /**
   * 表示用レベル
   */
  get dlv() {
    const state = this.getHighestState((state) => state.word);
    // ：と全角スペース
    return state
      ? state.word
      : 'Lv\u{ff1a}' + Utils.convertFull(this.lv.toString(10), '\u{3000}', 2);
  }

  /**
   * 最優先状態を取得する
   * @param filterFn
   * @returns
   */
  getHighestState(filterFn: (state) => boolean) {
    const filterStates = this.states.filter((state) => filterFn(state));
    if (filterStates.length === 0) {
      return;
    }
    return filterStates.reduce((state, value) => {
      return state.priority < value.priority ? value : state;
    });
  }

  /**
   * strengthの略
   */
  get str() {
    return this._primeParam(2);
  }

  /**
   * resilienceの略
   */
  get res() {
    return this._primeParam(4);
  }

  /**
   * 経験値を取得
   */
  get ex() {
    return this._exp;
  }

  /**
   * 最大レベルを取得
   */
  get maxLevel() {
    return this._maxLevel;
  }

  /**
   * 状態アイコン特殊文字を取得
   * 最優先状態のアイコンを返す
   */
  get sIcon() {
    const state = this.getHighestState((state) => state.iconId);
    return state?.iconId ? `\\i[${state.iconId}]` : '';
  }

  /**
   * 所持道具を取得
   */
  get items() {
    return this._items;
  }

  /**
   * 装備可能武器を返す
   * 先頭は装備中
   */
  get weapons() {
    return this._getEquipItems(EItemKind.Weapon);
  }

  get armors() {
    return this._getEquipItems(EItemKind.Armor);
  }

  get shields() {
    return this._getEquipItems(EItemKind.Shield);
  }

  get helmets() {
    return this._getEquipItems(EItemKind.Helmet);
  }

  get accessories() {
    return this._getEquipItems(EItemKind.Accessory);
  }

  /**
   * 装備道具全て取得する
   * @returns
   */
  private _getEquipAllItems() {
    return this._items.filter((item) => item.equip);
  }

  /**
   * 指定の種類の装備品を取得する
   * 装備している道具を先頭にする
   * 装備画面用
   * @param kind
   * @returns
   */
  private _getEquipItems(kind: EItemKind) {
    const equipList = this._items.filter((item) => item.kind === kind);
    equipList.sort((a, b) => {
      if (a.equip === b.equip) {
        return 0;
      }
      if (a.equip) {
        return -1;
      }
      return 1;
    });
    return equipList;
  }

  /**
   * 指定のidの道具を装備しているか
   * @param id
   * @returns
   */
  equipped(id: number) {
    return this._items.some((item) => item.equip && item.id === id);
  }

  /**
   * 装備中の武器を返す
   */
  get weapon() {
    return this._items.find((item) => item.weapon && item.equip);
  }

  /**
   * 装備中の鎧を返す
   */
  get armor() {
    return this._items.find((item) => item.armor && item.equip);
  }

  /**
   * 装備中の盾を返す
   */
  get shield() {
    return this._items.find((item) => item.shield && item.equip);
  }

  /**
   * 装備中の兜を返す
   */
  get helmet() {
    return this._items.find((item) => item.helmet && item.equip);
  }

  /**
   * 装備中の装飾品を返す
   */
  get accessory() {
    return this._items.find((item) => item.accessory && item.equip);
  }

  /**
   * キャラセットIdを取得
   */
  get imageId() {
    return this._imageId;
  }

  /**
   * キャラセットインデックスを取得
   */
  get imageIndex() {
    return this._imageIndex;
  }

  /**
   * 倒れキャラセットIdを取得
   */
  get downId() {
    return this._downId;
  }

  /**
   * 倒れキャラセットインデックスを取得
   */
  get downIndex() {
    return this._downIndex;
  }

  /**
   * 敵軍を取得する
   */
  get opponent() {
    return gameTroop;
  }

  /**
   * 自軍を取得する
   */
  get selfUnit() {
    return gameParty;
  }

  /**
   * 移動ダメージをクリアする
   */
  clearMoveDamage() {
    this._moveDamageEffectId = 0;
    this._moveDamageValue = 0;
  }

  /**
   * 移動ダメージエフェクトIdを設定する
   * @param value
   */
  setMoveDamageEffectId(value: number) {
    this._moveDamageEffectId = value;
  }

  /**
   * 移動ダメージエフェクトIdを取得する
   */
  get moveDamageEffectId() {
    return this._moveDamageEffectId;
  }

  /**
   * 移動ダメージ値を加算する
   * @param value
   */
  addMoveDamageValue(value: number) {
    this._moveDamageValue += value;
  }

  /**
   * 移動ダメージ値を取得する
   */
  get moveDamageValue() {
    return this._moveDamageValue;
  }

  /**
   * 移動でたおれたかを設定する
   * @param value
   */
  setMoveDown(value: boolean) {
    this._moveDown = value;
  }

  /**
   * 移動でたおれたかを取得する
   */
  get moveDown() {
    return this._moveDown;
  }

  /**
   * 隊列に含めないを設定する
   * @param value
   */
  setHidden(value: boolean) {
    this._hidden = value;
  }

  /**
   * 隊列に含めないを取得する
   */
  get hidden() {
    return this._hidden;
  }

  /**
   * 指定道具の装備をした後か外した後のパラメータを取得する
   * 道具Idではなくタイプで道具を決定している
   * @param item
   * @param paramId
   * @returns
   */
  equippedParam(item: GameItem | Item, equipOn: boolean, paramId?: number) {
    if (paramId == null) {
      paramId = this._equipParamId(item);
    }
    // 所持道具をループし
    // 指定の装備を外した後の指定パラメータ値を取得する
    const kind = item.kind;
    const off = this._items.reduce((prev, current) => {
      const add =
        current.kind !== kind && current.equip
          ? this.equipParam(current, paramId)
          : 0;
      return prev + add;
    }, 0);
    const prime = this._primeParam(paramId);
    const add = equipOn ? this.equipParam(item, paramId) : 0;
    return this.limitParam(paramId, prime + off + add);
  }

  /**
   * 装備効果値
   * @param item
   * @param paramId
   * @returns
   */
  equipParam(item: GameItem | Item, paramId?: number) {
    if (paramId == null) {
      paramId = this._equipParamId(item);
    }
    // 素のパラメータ
    const prime = this._primeParam(paramId);
    // 加算パラメータ
    return GameItem.getParam(
      item.paramId,
      item.weaponId,
      item.armorId,
      paramId,
      prime
    );
  }

  /**
   * 装備時に表示するパラメータIdを取得する
   * @param item
   * @returns
   */
  private _equipParamId(item: GameItem | Item) {
    return GameItem.mainParamId(item.kind, item.paramId);
  }

  /**
   * 移動中取得スキルを返す
   */
  get skills() {
    return this._getLearningSkills(this._skillList);
  }

  // つよさ表示用移動中スキルを返す
  get statusSkills() {
    const skillWords = this._convertSkillList(this._skillList);
    // 空文字を後ろに移動するようにソート
    skillWords.sort((a, b) => {
      if (a && !b) {
        // aが習得済み
        return -1;
      } else if (!a && b) {
        return 1;
      } else {
        return 0;
      }
    });
    return skillWords;
  }

  // つよさ表示用戦闘中スキルを返す
  get statusBattleSkills() {
    return this._convertSkillList(this._battleSkillList);
  }

  /**
   * 戦闘中取得スキルを返す
   */
  get battleSkills() {
    return this._getLearningSkillsToTable(this._battleSkillList);
  }

  /**
   * 性別
   */
  get gen() {
    return memberParts.genders[this._member.genderId];
  }

  /**
   * クラス
   */
  get cls() {
    return memberParts.classes[this._classId];
  }

  /**
   * 道具選択可能か
   */
  get itemSelectable() {
    return (this._member.selectType & ESelectType.NoItem) === 0;
  }

  /**
   * 単独行動可能か
   */
  get canSolo() {
    return (this._member.selectType & ESelectType.NoAlone) === 0;
  }

  setLastBattleItem(value: number) {
    this._lastBattleItem = value;
  }

  get lastBattleItem() {
    return this._lastBattleItem;
  }

  setLastBattleSkill(value: number) {
    this._lastBattleSkill = value;
  }

  get lastBattleSkill() {
    return this._lastBattleSkill;
  }

  /**
   * 道具を持っているか
   * @param item undefined: 1つ以上あるか item 指定の道具を持っているか
   * @returns
   */
  hasItem(item?) {
    if (!item) {
      return this._items.length > 0;
    } else {
      return this._items.some((value) => item.id === value.id);
    }
  }

  /**
   * 指定Idの道具所持数を取得する
   * @param itemId
   * @returns
   */
  numItems(itemId: number) {
    return this._items.reduce((count, current) => {
      return count + (current.id === itemId ? 1 : 0);
    }, 0);
  }

  /**
   * 移動中の習得スキルがあるかどうか
   * @returns
   */
  hasSkill() {
    return this._hasSkillByList(this._skillList);
  }

  /**
   * 戦闘中の習得スキルがあるかどうか
   * @returns
   */
  hasBattleSkill() {
    return this._hasSkillByList(this._battleSkillList);
  }

  /**
   * 指定のリストに習得スキルがあるかどうか
   * @param list
   * @returns
   */
  private _hasSkillByList(list: number[]): boolean {
    return list.some((value) => {
      return this._skills.includes(value) && skills[value];
    });
  }

  /**
   * 強さ表示用のスキルがあるか
   * つまり１つでも表示可能なスキルがあるかなので
   * 移動中と戦闘中のリストのどちらかにあればtrueとなる
   */
  hasStatusSkill() {
    return this.hasSkill() || this.hasBattleSkill();
  }

  /**
   * 所持道具数を取得
   */
  get itemLength() {
    return this._items.length;
  }

  /**
   * 指定の位置の道具を取得
   * @param index
   */
  override getItem(index: number): GameItem {
    return this.items[index];
  }

  /**
   * 移動スキルを取得
   * @param index
   */
  getSkill(index: number) {
    const skillId = this._skillList[index];
    return skills[skillId];
  }

  /**
   * 戦闘スキルを取得
   * @param index
   */
  getBattleSkill(index: number) {
    const skillId = this._battleSkillList[index];
    return skills[skillId];
  }

  /**
   * 指定の道具が装備可能か
   * @param item
   */
  canEquip(item: Item | GameItem) {
    return this._canAvailableItem(item, this._member.equipId);
  }

  /**
   * 指定の道具が使用可能か
   * @param item
   * @returns
   */
  override canUsable(item: Item | GameItem, map: boolean) {
    if (map && item.mapAvailable) {
      return true;
    }
    return this._canAvailableItem(item, this._member.usableId);
  }

  /**
   * 指定の道具が使用可能かを取得する
   * @param item
   * @param id
   * @returns
   */
  private _canAvailableItem(item: Item | GameItem, id: number) {
    return item.availableIds[id];
  }

  /**
   * スリップダメージオブジェクトを取得
   */
  get slipDamages() {
    return this.states
      .filter((state) => state.slipDamageId > 0)
      .map((state) => system.slipDamages[state.slipDamageId]);
  }

  /**
   * 指定の地形の床防御率を取得する
   * @param terrainId
   * @returns
   */
  getFloorDefenseRateIds(terrainId: number) {
    return this.states
      .filter((state) => {
        if (state.floorDefenseId > 0) {
          return GameNumberMap.get(state.floorDefenseId).key === terrainId;
        }
        return false;
      })
      .map((state) => GameNumberMap.get(state.floorDefenseId).value);
  }

  /**
   * コンストラクタのオプションデータのインデックス
   * @returns
   */
  protected _getOptionsIndex() {
    return 2;
  }

  /**
   * データから設定
   * @param data
   */
  override load(options: {
    id: number;
    memberId: number;
    data: SaveObjectGameMember;
  }) {
    const data = options.data;
    super.load(data);
    this._setMemberInfo(options.id, options.memberId);
    this._exp = data.exp ?? this._exp;
    this._classId = data.classId ?? this._classId;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    data.items && this._setupItems(data.items);
    this._imageId = data.imageId ?? this._imageId;
    this._imageIndex = data.imageIndex ?? this._imageIndex;
    this._downId = data.downId ?? this._downId;
    this._downIndex = data.downIndex ?? this._downIndex;
    this._skills = data.skills ?? this._skills;
    this._maxLevel = data.maxLevel ?? this._maxLevel;
    this._plusParams = data.plusParams ?? this._plusParams;
    this._lastBattleItem = data.lastBattleItem ?? this._lastBattleItem;
    this._lastBattleSkill = data.lastBattleSkill ?? this._lastBattleSkill;
    this._hidden = data.hidden ?? this._hidden;
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  override createSaveObject(): SaveObjectGameMember {
    const items = this._items.map((item) => {
      return { id: item.id, equip: item.equip };
    });
    const object: SaveObjectGameMember = {
      ...super.createSaveObject(),
      id: this._id,
      memberId: this.memberId,
      exp: this._exp,
      classId: this._classId,
      items,
      imageId: this._imageId,
      imageIndex: this._imageIndex,
      downId: this._downId,
      downIndex: this._downIndex,
      skills: this._skills,
      maxLevel: this._maxLevel,
      plusParams: this._plusParams,
      lastBattleItem: this._lastBattleItem,
      lastBattleSkill: this._lastBattleSkill,
      hidden: this._hidden,
    };
    return object;
  }

  /**
   * 中断から設定
   * @param data
   */
  loadSuspend(options: {
    id: number;
    memberId: number;
    data: SuspendObjectGameMember;
  }) {
    this.load(options);
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameMember {
    return {
      ...this.createSaveObject(),
    };
  }

  /**
   * 削除
   */
  clear() {
    super._clear();
    this._setId(-1);
    this._classId = 0;
    this._exp = 0;
    this._skills = [];
    this._imageId = 0;
    this._imageIndex = 0;
    this._lastBattleItem = 0;
    this._lastBattleSkill = 0;
    this._maxItem = system.maxItem;
    this._maxLevel = 99;
    this._skillList = [];
    this._battleSkillList = [];
    this._downId = 0;
    this._downIndex = 0;
    this._clearPlusParameter();
    this._items = [];
    this._moveDamageEffectId = 0;
    this._moveDamageValue = 0;
    this._moveDown = false;
    this._hidden = false;
  }
  /**
   * ドーピングパラメータを加算する
   * @param id
   * @param value
   * @returns
   */
  override addPlusParam(id: number, value: number): number {
    const oldParam = this._primeParam(id);
    const newParam = Utils.clamp(
      oldParam + value,
      this.minParam(id),
      this.maxGrowthParam(id)
    );
    const diffParam = newParam - oldParam;
    this._plusParams[id] += diffParam;
    return diffParam;
  }

  /**
   * 成長最大値
   * @param id
   * @returns
   */
  maxGrowthParam(id: number) {
    if (id === EBaseParamId.MaxHp || id === EBaseParamId.MaxMp) {
      return 999;
    } else {
      return 500;
    }
  }

  /**
   * ベース＋ドーピング＋装備
   * 素のパラメータに装備パラメータを加えたもの
   * これが固定パラメータとなる
   * @param id
   */
  override fixedParam(id: number) {
    const value = this._primeParam(id);
    // 装備中の加算値を算出する
    const plus = this.items.reduce((acc, item) => {
      if (!item.equip) {
        return acc;
      }
      return acc + item.getParam(id, value);
    }, 0);
    return this.limitParam(id, value + plus);
  }

  /**
   * ベース＋ドーピング
   * ステータス画面で表示されるパラメータのもとになるもの
   * @param id
   */
  private _primeParam(id: number) {
    const value = this._baseParam(id) + this._plusParams[id];
    return Utils.clamp(value, this.minParam(id), this.maxGrowthParam(id));
  }

  /**
   * 固定サブパラメータを取得
   * @param id
   * @returns
   */
  override fixedSubParam(id: number) {
    const value = super.fixedSubParam(id);
    // 装備中の加算値を算出する
    const plus = this.items.reduce((acc, item) => {
      if (!item.equip) {
        return acc;
      }
      return acc + item.getSubParam(id, value);
    }, 0);
    return value + plus;
  }

  /**
   * 保持中のサブパラメータの割合Idを取得する
   * 武器、防具をの値を反映
   * @returns
   */
  protected override _subParamRateIds(id: number) {
    return super._subParamRateIds(id);
  }

  /**
   * スキルリストIdを取得する
   */
  get skillListId() {
    return this._member.skillListId;
  }

  /**
   * 戦闘スキルリストIdを取得する
   */
  get battleSkillListId() {
    return this._member.battleSkillListId;
  }

  /**
   * メンバーデータから設定
   * @param id
   * @param memberId
   */
  setup(id: number, memberId: number) {
    this._setMemberInfo(id, memberId);
    const member = this._member;
    // ロード済みでなければデータを設定する
    this.setName(member.name);
    this.setLv(member.initialLevel);
    this._initBaseParams();
    this._clearPlusParameter();
    this._initExp();
    this._setupItems(member.items);
    this._initSkills();
    this.recoverAll();
  }

  /**
   * メンバー情報を設定する
   * @param id
   * @param memberId
   */
  private _setMemberInfo(id: number, memberId: number) {
    this._setId(id);
    this._memberId = memberId;

    this._classId = this._member.classId;
    this._setupSkillList(this.skillListId, this.battleSkillListId);
    this._setImage();
  }

  /**
   * 初期基盤パラメータを設定
   */
  private _initBaseParams() {
    this._setBaseParams(this._getBaseParamsForLevel(this.lv));
    this._setBaseSubParams(this._getBaseSubParamsForLevel(this.lv));
  }

  /**
   * 指定レベルの基盤パラメータを取得
   * @param lv
   */
  private _getBaseParamsForLevel(lv: number): number[] {
    const parameters = memberParts.parameters;
    const params = this._member.paramIds.map((id) => {
      return GameMember._levelToParamInfo(parameters[id], lv).baseValue;
    });
    return params;
  }

  /**
   * 指定レベルのベースサブパラメータを取得する
   * 0の場合はデフォルトを参照
   * @param lv
   * @returns
   */
  private _getBaseSubParamsForLevel(lv: number): number[] {
    const parameters = memberParts.parameters;
    const params = this._member.subParamIds.map((id) => {
      return GameMember._levelToParamInfo(parameters[id], lv).baseValue;
    });
    return params;
  }

  /**
   * 上昇パラメータ値を計算する
   * @param data
   * @param nextLv
   * @param currentValue
   * @returns
   */
  private static _calcUpParam(
    data: Parameter,
    nextLv: number,
    currentValue: number
  ) {
    if (nextLv <= 1) {
      return 0;
    }

    const info = this._levelToParamInfo(data, nextLv);
    if (info.rateIndex < 0) {
      return 0;
    }
    if (data.random) {
      const prevInfo = this._levelToParamInfo(data, nextLv - 1);
      const upBaseValue = info.baseValue - prevInfo.baseValue;
      const upMinValue = GameRate.div(data.random, upBaseValue);
      const upValue = Utils.randomInt(upMinValue, upBaseValue + 1);
      if (data.lower) {
        //下限確認
        const min = GameRate.div(data.lower, info.baseValue);
        if (currentValue + upValue < min) {
          return min - currentValue;
        }
      }
      if (data.upper) {
        // 上限確認
        const max = GameRate.div(data.upper, info.baseValue);
        if (currentValue + upValue > max) {
          return Math.max(0, info.baseValue - currentValue);
        }
      }
      return upValue;
    } else {
      if (
        this._delimiterLevel(data, info) ||
        !data.rates[info.rateIndex].variation ||
        !data.lower ||
        !data.upper
      ) {
        // 区切りレベルかばらつきなしの場合は基本値になるようにする
        return Math.max(info.baseValue - currentValue, 0);
      }
      const upBaseValue = Math.max(0, info.baseValue - currentValue);
      // 区切りレベルじゃない場合はばらつくが基準値は超えない
      const min = GameRate.div(data.lower, upBaseValue);
      const max = GameRate.div(data.upper, upBaseValue);
      const value = currentValue + Utils.randomInt(min, max + 1);
      const nextValue = Math.min(value, info.delimiterValue);
      return Math.max(nextValue - currentValue, 0);
    }
  }

  /**
   * 区切りレベルかどうか取得する
   * @param data
   * @param info
   * @returns
   */
  private static _delimiterLevel(data: Parameter, info: ParameterInfo) {
    return data.rates[info.rateIndex].interval - 1 === info.pos;
  }

  /**
   * 指定レベルからパラメータ情報を取得する
   * @param data
   * @param lv
   * @returns
   */
  private static _levelToParamInfo(data: Parameter, lv: number) {
    const info: ParameterInfo = {
      rateIndex: -1,
      refIndex: 0,
      pos: 0,
      baseValue: data.baseValue,
      delimiterValue: data.baseValue,
    };
    if (lv <= 1) {
      return info;
    }
    let branchLevel = 1;
    for (let i = 0; i < data.rates.length; i++) {
      // ratesの参照indexを決定する
      const rate = data.rates[i];
      const rateStartLevel = branchLevel;
      branchLevel += rate.interval * rate.list.length;
      if (lv > branchLevel) {
        info.delimiterValue += rate.list.reduce(
          (total, current) => total + current,
          0
        );
        continue;
      }
      // rate決定
      // rate.listのindexを決定する
      const rateRefLevel = lv - rateStartLevel - 1;
      const refIndex = Math.floor(rateRefLevel / rate.interval);
      for (let listIndex = 0; listIndex < refIndex; listIndex++) {
        info.delimiterValue += rate.list[listIndex];
      }
      const pos = rateRefLevel % rate.interval;
      const listValue = rate.list[refIndex];
      info.baseValue =
        info.delimiterValue +
        this._intervalPosValue(listValue, pos, rate.interval, rate.weightId);
      info.delimiterValue += listValue;
      info.rateIndex = i;
      info.refIndex = refIndex;
      info.pos = pos;
      break;
    }

    return info;
  }

  /**
   * 間隔の指定位置の値を取得する
   * @param listValue
   * @param pos
   * @param interval
   * @param weightId
   * @returns
   */
  private static _intervalPosValue(
    listValue: number,
    pos: number,
    interval: number,
    weightId: number
  ) {
    if (interval === 1 || !weightId) {
      return Math.floor((listValue * (pos + 1)) / interval);
    }
    const weightList = GameNumberList.get(weightId);
    if (pos >= weightList.length) {
      return listValue;
    }
    const subTotal = weightList
      .slice(0, pos + 1)
      .reduce((total, current) => total + current);
    const total = weightList.reduce((total, current) => total + current);
    return Math.floor((listValue * subTotal) / total);
  }

  /**
   * 指定レベルのベースパラメータを取得する(static)
   * @param data
   * @param lv
   * @returns
   */
  private static _calcBaseParam(data: Parameter, lv: number) {
    if (lv <= 1) {
      return data.baseValue;
    }
    let branchLevel = 1;
    let value = data.baseValue;
    for (let i = 0; i < data.rates.length; i++) {
      // ratesの参照indexを決定する
      const rate = data.rates[i];
      const rateStartLevel = branchLevel;
      branchLevel += rate.interval * rate.list.length;
      if (lv > branchLevel) {
        value += rate.list.reduce((total, current) => total + current, 0);
        continue;
      }
      // rate決定
      // rate.listのindexを決定する
      const rateRefLevel = lv - rateStartLevel - 1;
      const refIndex = Math.floor(rateRefLevel / rate.interval);
      for (let listIndex = 0; listIndex < refIndex; listIndex++) {
        value += rate.list[listIndex];
      }
      const pos = rateRefLevel % rate.interval;
      const listValue = rate.list[refIndex];
      value += Math.floor((listValue * (pos + 1)) / rate.interval);
      break;
    }

    return value;
  }

  /**
   * 加算パラメータをクリア
   */
  private _clearPlusParameter() {
    this._plusParams = [0, 0, 0, 0, 0, 0, 0];
  }

  /**
   * 初期経験値を設定
   */
  private _initExp() {
    this._exp = this._currentLevelExp();
  }

  /**
   * 現在のレベルの経験値を取得する
   */
  private _currentLevelExp() {
    return this.expForLevel(this.lv);
  }

  /**
   * 指定のレベルの経験値を算出する
   * @param lv
   */
  expForLevel(lv: number): number {
    const data = memberParts.exps[this._member.expId];
    if (lv <= 1) {
      return 0;
    } else if (lv === 2) {
      return data.baseValue;
    }

    let lvCount = 2;
    let last = data.baseValue;
    let exp = last;
    loop: for (let i = 0; i < data.list.length; i++) {
      const info = data.list[i];
      for (let c = 0; c < info.times; c++) {
        last = Math.floor(last * info.rate);
        exp += last;
        lvCount += 1;
        if (lvCount === lv) {
          break loop;
        }
      }
    }
    return exp;
  }

  /**
   * どうぐの初期設定
   * @param itemInfos
   */
  private _setupItems(itemInfos: PersonalItem[]) {
    this._items = itemInfos
      .filter((value) => {
        // 存在しないのは取り除いておく
        return dataItems[value.id];
      })
      .map((value) => {
        return new GameItem(value.id, value.equip);
      });
  }

  /**
   * スキルの初期設定
   * @param id
   * @returns
   */
  private _initSkills() {
    const filterSkills = this._getLearnSkillsForLevel(this.lv);
    // 重複を取り除く
    this._skills = Array.from(new Set(filterSkills));
  }

  /**
   * リストの取得スキルをオブジェクトにして返す
   * 未取得スキルは詰められる
   * @param list
   */
  private _getLearningSkills(list: number[]): Skill[] {
    return list
      .filter((value) => {
        if (this._skills.includes(value) && skills[value]) {
          return true;
        }
        return false;
      })
      .map((value) => skills[value]);
  }

  /**
   * リストの取得スキルをオブジェクトにして返す
   * 未取得スキルはnullが入る
   * @param list
   */
  private _getLearningSkillsToTable(list: number[]): Array<Skill | null> {
    return list.map((value) => {
      if (this._skills.includes(value) && skills[value]) {
        return skills[value];
      }
      return null;
    });
  }

  /**
   * リストのスキルIdを文字列にして返す
   * 覚えているスキル：スキル名
   * 覚えていないスキル：空文字
   * @param list
   */
  private _convertSkillList(list: number[]) {
    return list.map((value) => {
      if (this._skills.includes(value)) {
        return skills[value].name;
      } else {
        return '';
      }
    });
  }

  /**
   * スキルリストの初期設定
   * @param id
   * @param battleId
   */
  private _setupSkillList(id: number, battleId: number) {
    this._skillList = skillLists[id] ? skillLists[id].list : [];
    this._battleSkillList = skillLists[battleId]
      ? skillLists[battleId].list
      : [];
  }

  /**
   * 画像の設定
   */
  private _setImage() {
    this._imageId = this._member.imageId;
    this._imageIndex = this._member.imageIndex;
    this._downId = this._member.downId;
    this._downIndex = this._member.downIndex;
  }

  /**
   * どうぐ装備
   * 同じ種類を装備していたらいったん外す
   * @param item
   * @param value
   */
  equipItem(item: GameItem | undefined, value: boolean) {
    if (!item) {
      return;
    }
    const index = this._items.indexOf(item);
    if (index < 0) {
      return;
    }
    this._takeOffEquipKind(item.kind);
    item.setEquip(value);
  }

  /**
   * 指定インデックスの道具を装備
   * @param index
   * @param value
   */
  equipItemIndex(index: number, value: boolean) {
    this.equipItem(this._items[index], value);
  }

  /**
   * 道具idの道具を持っていたら装備する
   * @param itemId
   * @param value
   */
  equipItemId(itemId: number, value: boolean) {
    this.equipItem(
      this._items.find((item) => item.id === itemId),
      value
    );
  }

  /**
   * 指定の種類の装備を外す
   * @param kind
   */
  private _takeOffEquipKind(kind: EItemKind) {
    this._items.forEach((item) => {
      if (item.kind === kind) {
        item.setEquip(false);
      }
    });
  }

  /**
   * 装備どうぐを返す
   */
  get equips() {
    const equipList = new Array(5);
    this.items.forEach((item) => {
      if (!item.canEquip() || !item.equip) {
        return;
      }
      // 武器、鎧、盾、兜の順
      const index = item.data.kind - 1;
      equipList[index] = item;
    });
    return equipList;
  }

  /**
   * 道具を消費する
   * @param erItem
   */
  consumeItem(erItem: GameItem) {
    if (erItem.consumable) {
      this.eraseItem(erItem);
    }
  }

  /**
   * 道具を消去する
   * @param erItem
   */
  eraseItem(erItem: GameItem) {
    const index = this._items.indexOf(erItem);
    if (index >= 0) {
      this.eraseItemIndex(index);
      return true;
    }
    return false;
  }

  /**
   * 道具Idを指定して消去する
   * @param id
   */
  eraseItemByItemId(id: number) {
    const index = this._items.findIndex((value) => value.id === id);
    if (index >= 0) {
      this.eraseItemIndex(index);
      return true;
    }
    return false;
  }

  /**
   * 指定インデックスの道具を消去する
   * @param itemIndex
   */
  eraseItemIndex(index: number) {
    this._items.splice(index, 1);
  }

  /**
   * 道具をまだ追加できるか
   */
  itemSpace() {
    return this._items.length < this._maxItem;
  }

  /**
   * 道具を追加する
   * @param id
   * @param equip
   */
  pushItem(id: number, equip = false) {
    this._items.push(new GameItem(id, equip));
  }

  /**
   * 道具渡す
   * @param item 渡す道具
   * @param target 渡し先
   * @param tItem 渡し先の交換道具
   */
  transferItem(item: GameItem, target: GameMember, tItem: GameItem) {
    // 同じ場所だったらなにもせず持ち替え扱い
    if (this === target && item === tItem) {
      return EMenuTransfer.CHANGE;
    }

    const index = this._items.indexOf(item);
    const tItems = target.items;
    const tIndex = tItems.indexOf(tItem);
    // 渡す前に装備をはずす
    item.setEquip(false);
    if (tIndex < 0) {
      // 空きに渡す
      tItems.push(item);
      this._items.splice(index, 1);
      const result = this.live ? EMenuTransfer.HAND : EMenuTransfer.TAKE;
      return this === target ? EMenuTransfer.CHANGE : result;
    } else {
      // 交換する
      tItem.setEquip(false);
      [this._items[index], tItems[tIndex]] = [tItem, item];
      return this === target ? EMenuTransfer.CHANGE : EMenuTransfer.SWAP;
    }
  }

  /**
   * 指定のどうぐのインデックスを返す
   * @param item
   */
  getItemIndex(item: GameItem) {
    return this._items.indexOf(item);
  }

  /**
   * コマンド入力可能か
   * 行動制約がなければ可能
   */
  get input() {
    return !this.restriction;
  }

  /**
   * 行動数値を取得する
   * @param id
   * @returns
   */
  actionFigure(id: number) {
    const figure = GameActionFigure.get(id);
    return {
      min: figure.min1,
      max: figure.max1,
      rate: figure.rate1,
    };
  }

  /**
   * 経験値取得
   * @param exp
   */
  gainExp(exp: number) {
    this.changeExp(this._exp + exp);
  }

  /**
   * 経験値変更
   * @param exp
   */
  changeExp(exp: number) {
    const maxExp = this.expForLevel(this._maxLevel);
    this._exp = Utils.clamp(exp, 0, maxExp);
  }

  /**
   * レベル変更
   * @param lv
   */
  changeLevel(lv: number) {
    const exp = this.expForLevel(lv);
    this.changeExp(exp);
  }

  /**
   * 現在の経験値からレベルアップを適用する
   * @returns
   */
  applyLevelUp() {
    for (;;) {
      if (!this.checkLevelUp()) {
        break;
      }
      const value = this.nextLevelParams();
      this.addLevel(value.level);
      for (let i = 0; i < value.params.length; i++) {
        this.gainBaseParam(i, value.params[i]);
      }
      for (const id of value.skills) {
        this.learnSkill(id);
      }
      for (let i = 0; i < value.subParams.length; i++) {
        this.gainBaseSubParam(i, value.subParams[i]);
      }
    }
    return this.lv;
  }

  /**
   * レベルアップチェック
   * 現在のレベルから１レベル上をチェックする
   */
  checkLevelUp(): boolean {
    if (this._reachedMaxLevel()) {
      return false;
    }
    return this.needNextLevelExp() <= 0;
  }

  /**
   * 次のレベルに必要な経験値を取得する
   * @returns
   */
  needNextLevelExp() {
    if (this._reachedMaxLevel()) {
      return 0;
    }
    const nextLv = this.lv + 1;
    const nextExp = this.expForLevel(nextLv);
    return nextExp - this._exp;
  }

  /**
   * 次レベルの変化パラメータを取得する
   * @returns
   */
  nextLevelParams(): lvUpValue {
    if (this._reachedMaxLevel()) {
      return { level: 0, params: [], subParams: [], skills: [] };
    }
    const level = this.lv + 1;
    const params = this._member.paramIds.map((id, index) => {
      return GameMember._calcUpParam(
        memberParts.parameters[id],
        level,
        this._baseParam(index)
      );
    });

    const subParams = this._member.subParamIds.map((id, index) => {
      return GameMember._calcUpParam(
        memberParts.parameters[id],
        level,
        this._baseSubParam(index)
      );
    });

    const nextSkills = new Set(this._getLearnSkillsForLevel(level));
    for (const id of this._skills) {
      nextSkills.delete(id);
    }
    if (params.every((value) => value === 0) && nextSkills.size === 0) {
      // サブパラメータ以外変化がない場合はHP1増にする
      // 5.5.2にあげたらparams[0]が 0 型と判定されてエラーになった
      // 仕方なくキャストしているが不具合っぽいきがするのだが
      (params[0] as number) = 1;
    }

    return { level: 1, params, subParams, skills: Array.from(nextSkills) };
  }

  /**
   * 指定数レベルを加算する
   * @param value
   */
  addLevel(value: number) {
    const level = Utils.clamp(this.lv + value, 1, this._maxLevel);
    this.setLv(level);
  }

  /**
   * 最大レベルに達しているか
   */
  private _reachedMaxLevel(): boolean {
    return this.lv >= this._maxLevel;
  }

  /**
   * 現在のレベルまでの習得スキルを取得する
   */
  private _getLearnSkillsForLevel(level: number): number[] {
    const list = this._getLearningList(this._member.learningId);
    return list
      .filter((value) => value.level <= level)
      .map((value) => value.id);
  }

  /**
   * 取得スキルリストを取得
   */
  private _getLearningList(id: number) {
    const learningList = learnings[id]?.list;
    return learningList ? learningList : [];
  }

  /**
   * 技能を習得
   * @param id
   */
  learnSkill(id: number) {
    if (!this._skills.includes(id)) {
      this._skills.push(id);
    }
  }

  /**
   * 技能を忘れる
   * @param id
   */
  forgetSkill(id: number) {
    const index = this._skills.indexOf(id);
    if (index >= 0) {
      this._skills.splice(index, 1);
    }
  }

  /**
   * かかっている状態を取得
   */
  override get states() {
    const alwaysStates = this._alwaysStateIds().map((id) => states[id]);
    return [...alwaysStates, ...super.states];
  }

  /**
   * 状態がついているか
   * @returns
   */
  protected override _hasStates() {
    return super._hasStates() || this._alwaysStateIds().length !== 0;
  }

  /**
   * すでに指定の状態になっているか
   * @param stateId
   * @returns
   */
  override stateAlready(stateId: number) {
    const stateIds = this._alwaysStateIds();
    if (stateIds.indexOf(stateId) >= 0) {
      return true;
    }
    return super.stateAlready(stateId);
  }

  /**
   * 常時状態を取得する
   * @returns
   */
  private _alwaysStateIds() {
    const statesIds = this._equipStateIds();
    if (this._member.statesId) {
      statesIds.push(this._member.statesId);
    }
    if (statesIds.length > 0) {
      return GameNumberList.distinct(statesIds);
    } else {
      return [];
    }
  }

  /**
   * 装備に付加されている状態Idを取得する
   * @returns
   */
  private _equipStateIds() {
    return this._getEquipAllItems()
      .filter((item) => item.data.statesId)
      .map((item) => item.data.statesId);
  }

  /**
   * 混乱時に行動パータンがなかった場合に取得するスキルId
   * 味方のスキルリストから選択される
   */
  override choiceConfuseSkillId(): number {
    const skillIds = this._getAutoUsableSkillIds(this._battleSkillList);
    const normalId = this.getNormalAttackId();
    const add = Math.floor(skillIds.length / 4) + 1;

    for (let i = 0; i < add; i++) {
      skillIds.push(normalId);
    }

    return skillIds[Utils.randomInt(0, skillIds.length)];
  }

  /**
   * 自動行動で使用可能な戦闘スキルを返す
   * @returns
   */
  override getAutoUsableBattleSkillIds(): number[] {
    return this._getAutoUsableSkillIds(this._battleSkillList);
  }

  /**
   * 自動行動で使用可能なスキルを返す
   * @param list
   */
  private _getAutoUsableSkillIds(list: number[]): number[] {
    return list.filter((value) => {
      if (this._skills.includes(value) && skills[value]?.autoUsable) {
        return true;
      }
      return false;
    });
  }

  /**
   * 自動行動で使用可能な道具を返す
   * @returns
   */
  override getAutoUsableBattleItemIndices(): number[] {
    return this.items
      .map((item, index) => (this.canUsable(item, false) ? index : -1))
      .filter((n) => n >= 0);
  }

  /**
   * 相対属性守備力レベルを取得する
   * @returns
   */
  protected override _relativeElementDevLevel(id: number) {
    const value = this.items.reduce((acc, item) => {
      if (item.equip && item.elementDefLevel > 0) {
        const list = GameNumberList.get(item.elementDefLevel);
        return acc + list[id - 1];
      } else {
        return acc;
      }
    }, 0);
    return value;
  }

  /**
   * 追加試行回数を取得する
   */
  override addNumRepeat() {
    const baseNum = super.addNumRepeat();
    return this._addEquipNumRepeat(baseNum);
  }

  /**
   * 装備試行回数を加算する
   * @param baseNum
   * @returns
   */
  private _addEquipNumRepeat(baseNum: number) {
    const value = this.items.reduce((acc, item) => {
      const weaponId = item.equip ? item.weaponId : 0;
      const repeatId = weaponId ? weapons[weaponId].numRepeat : 0;
      if (!repeatId) {
        return acc;
      }
      const list = GameNumberList.get(repeatId);
      let plus = 0;
      for (const value of list) {
        if (GameRate.judge(value)) {
          plus += 1;
          continue;
        }
        break;
      }
      return acc + plus;
    }, baseNum);
    return value;
  }

  /**
   * 通常攻撃スキルIdを取得する
   * @returns
   */
  override getNormalAttackId(): number {
    const weaponId = this.weapon?.weaponId;
    const skillId = weaponId ? weapons[weaponId].skillId : 0;
    return skillId ? skillId : super.getNormalAttackId();
  }

  /**
   * 指定属性のダメージ軽減値Idを取得する
   * @param elementId
   * @returns
   */
  override getElementDamageCutFigures(elementId: number) {
    const cutIds = this._getDamageCutIds();
    return cutIds.reduce((figureIds: number[], cutId) => {
      const list = GameNumberList.get(cutId);
      const value = GameNumberMap.findForList(list, elementId);
      if (value !== undefined) {
        figureIds.push(value);
      }
      return figureIds;
    }, []);
  }

  /**
   * ダメージ軽減効果を持つ装備品をフィルターする
   * @returns
   */
  private _getDamageCutIds() {
    return this.items.reduce((cutIds: number[], item) => {
      if (!item.equip) {
        return cutIds;
      }
      const cutId = item.cutId;
      if (cutId) {
        cutIds.push(cutId);
      }
      return cutIds;
    }, []);
  }

  /**
   * 武器の特攻Idを取得する
   * @returns
   */
  override getWeaponSpecialId() {
    const weaponId = this.weapon?.weaponId;
    return weaponId ? weapons[weaponId].specialId : super.getWeaponSpecialId();
  }

  /**
   * 追加補正Idを取得する
   * @returns
   */
  override addCorrectId() {
    const weaponId = this.weapon?.weaponId;
    return weaponId ? weapons[weaponId].correctId : super.addCorrectId();
  }

  /**
   * 追加効果Idを取得する
   * @returns
   */
  override addEffectId() {
    const weaponId = this.weapon?.weaponId;
    return weaponId ? weapons[weaponId].effectId : super.addEffectId();
  }
}
