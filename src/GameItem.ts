import { EItemKind, Item } from './DataTypes';
import { armors, items as dataItems, weapons } from './DataStore';
import { EBaseParamId, EBaseSubParamId } from './GameBattler';
import {
  GameUtils,
  GameNumberList,
  GameNumberMap,
  GameRate,
} from './GameUtils';
import Utils from './Utils';

const enum EDispParamOrder {
  Mhp,
  Mmp,
  Str,
  Agi,
  Res,
  Int,
  Luk,
  Atk,
  Def,
}

/**
 * 所持道具クラス
 */
export class GameItem {
  /**
   * 道具Id
   */
  private _itemId: number;
  /**
   * 装備しているか
   */
  private _equip: boolean;

  /**
   * コンストラクタ
   * @param itemId
   * @param equip
   */
  constructor(itemId: number, equip: boolean) {
    // 道具以外のオブジェクトにならないようにIdで管理する
    this._itemId = itemId;
    this._equip = equip || false;
  }

  /**
   * 道具idを設定する
   */
  set itemId(value: number) {
    this._itemId = value;
  }

  /**
   * 道具データを取得する
   */
  get data() {
    return dataItems[this._itemId];
  }

  /**
   * 道具Idを取得する
   * itemIdと同じ
   */
  get id() {
    return this._itemId;
  }

  /**
   * 道具名を取得する
   */
  get name() {
    return this.data.name;
  }

  /**
   * 道具名を取得する
   */
  get kind() {
    return this.data.kind;
  }

  /**
   * 通常の道具かどうか取得する
   */
  get normal() {
    return GameItem.judgeNormal(this.data);
  }

  /**
   * 指定の道具が通常か判定する
   * @param item
   * @returns
   */
  static judgeNormal(item: Item) {
    return item.kind === EItemKind.Normal;
  }

  /**
   * 武器かどうかを取得する
   */
  get weapon() {
    return this.data.kind === EItemKind.Weapon;
  }

  /**
   * 鎧かどうかを取得する
   */
  get armor() {
    return this.data.kind === EItemKind.Armor;
  }

  /**
   * 盾かどうかを取得する
   */
  get shield() {
    return this.data.kind === EItemKind.Shield;
  }

  /**
   * 兜かどうかを取得する
   */
  get helmet() {
    return this.data.kind === EItemKind.Helmet;
  }

  /**
   * 装飾品かどうかを取得する
   */
  get accessory() {
    return this.data.kind === EItemKind.Accessory;
  }

  /**
   * メニューを終了するかどうか
   */
  get menuEnd() {
    return this.data.menuEnd;
  }

  /**
   * 売れるかどうかを取得する
   */
  get sell() {
    return this.data.sell;
  }

  /**
   * 売値を取得する
   */
  get sellPrice() {
    const item = this.data;
    return Math.floor((item.price * 3) / 4);
  }

  /**
   * 捨てるかどうかを取得する
   */
  get discard() {
    return this.data.discard;
  }

  /**
   * 行動Idを取得する
   */
  get actionId() {
    return this.data.actionId;
  }

  /**
   * 戦闘行動Idを取得する
   */
  get battleActionId() {
    return this.data.battleActionId;
  }

  /**
   * メモを取得する
   */
  get note() {
    return this.data.note;
  }

  /**
   * 消費するかを取得する
   */
  get consumable() {
    return this.data.consumable;
  }

  /**
   * パラメータIdを取得する
   */
  get paramId() {
    return this.data.paramId;
  }

  /**
   * サブパラメータIdを取得する
   */
  get subParamId() {
    return this.data.subParamId;
  }

  /**
   * 属性守備レベルを取得する
   */
  get elementDefLevel() {
    return this.data.elementDefLevel;
  }

  /**
   * 武器Idを取得する
   */
  get weaponId() {
    return this.data.weaponId;
  }

  /**
   * 防具Idを取得する
   */
  get armorId() {
    return this.data.armorId;
  }

  /**
   * ダメージ軽減Idを取得する
   */
  get cutId() {
    const item = this.data;
    return item.armorId ? armors[item.armorId].cutId : 0;
  }

  /**
   * マップ利用可否を取得する
   * trueならマップでは設定関係なく利用できる
   */
  get mapAvailable() {
    return this.data.mapAvailable;
  }

  /**
   * 利用可否メンバーリストを取得する
   */
  get availableIds() {
    return this.data.availableIds;
  }

  /**
   * 装備状態を設定する
   * @param value
   */
  setEquip(value: boolean) {
    this._equip = value;
  }

  /**
   * 装備状態を取得する
   */
  get equip() {
    return this._equip;
  }

  /**
   * 手に持つタイプの装備か
   */
  get handEquipment() {
    return this.kind === EItemKind.Weapon || this.kind === EItemKind.Shield;
  }

  /**
   * 装備マークを取得する
   */
  get em() {
    return this._equip ? 'E' : '';
  }

  // 売値表示
  get sp() {
    const item = this.data;
    if (item.sell) {
      const price = this.sellPrice;
      return Utils.convertFull(price.toString(10));
    } else {
      return 'うれない';
    }
  }

  /**
   * 装備可能品か
   * @returns
   */
  canEquip() {
    return this.data.kind !== 0;
  }

  /**
   * 装備や所持することにより変化する種別のテキスト化
   * @returns
   */
  equipParamWord() {
    return GameItem.equipParamWord(this.kind, this.paramId);
  }

  /**
   * 装備や所持することにより変化する種別のテキスト化(static版)
   * @param kind
   */
  static equipParamWord(kind: EItemKind, paramId: number) {
    if (kind === EItemKind.Normal) {
      return GameUtils.itemKindWord(kind);
    }
    const id = this._equipMainParamId(kind, paramId);
    return GameUtils.statusWord(id);
  }

  /**
   * メニュー表示用のメインパラメータId
   * static版
   * @param kind
   * @returns
   */
  private static _equipMainParamId(kind: EItemKind, paramId: number) {
    const id = this.mainParamId(kind, paramId);
    // ちからかみのまもりの場合は攻撃力と守備力に変換
    if (id === EBaseParamId.Atk) {
      return EDispParamOrder.Atk;
    } else if (id === EBaseParamId.Def) {
      return EDispParamOrder.Def;
    }
    return id;
  }

  /**
   * 装備することで変化するメインのパラメータId
   * static版
   * @param kind
   * @returns
   */
  static mainParamId(kind: EItemKind, paramId: number) {
    if (kind === EItemKind.Weapon) {
      return EBaseParamId.Atk;
    } else if (kind === EItemKind.Accessory) {
      // 装飾品は基本守備で0なら一番上昇する値を返す
      if (!paramId) {
        return EBaseParamId.Def;
      }
      const params = GameNumberList.get(paramId);
      const max = Math.max(...params);
      const index = params.findIndex((param) => param === max);
      return index < 0 ? EBaseParamId.Def : index;
    } else {
      // 鎧、盾、兜はここ
      return EBaseParamId.Def;
    }
  }

  /**
   * 装備することで変化するメインのパラメータId
   * @returns
   */
  mainParamId() {
    return GameItem.mainParamId(this.kind, this.paramId);
  }

  /**
   * 指定パラメータを取得する
   * static版
   * @param paramId
   * @param weaponId
   * @param armorId
   * @param n
   * @param baseValue
   * @returns
   */
  static getParam(
    paramId: number,
    weaponId: number,
    armorId: number,
    n: EBaseParamId,
    baseValue: number
  ) {
    const mapId = paramId ? GameNumberList.get(paramId)[n] : 0;
    const value = GameItem._calcParam(mapId, baseValue);
    switch (n) {
      case EBaseParamId.Atk:
        return value + GameItem.getAtkValue(weaponId);
      case EBaseParamId.Def:
        return value + GameItem.getDefValue(armorId);
    }
    return value;
  }

  /**
   * 指定パラメータを取得する
   * @param n
   * @returns
   */
  getParam(n: EBaseParamId, baseValue: number) {
    return GameItem.getParam(
      this.paramId,
      this.weaponId,
      this.armorId,
      n,
      baseValue
    );
  }

  /**
   * パラメータ値を計算する
   * @param mapId
   * @param baseValue
   * @returns
   */
  private static _calcParam(mapId: number, baseValue: number) {
    if (!mapId) {
      return 0;
    }
    const info = GameNumberMap.get(mapId);
    const rateValue = info.key < 1 ? 0 : GameRate.div(info.key, baseValue);
    return info.value + rateValue;
  }

  /**
   * 攻撃値を取得する
   * static版
   * @param weaponId
   * @returns
   */
  static getAtkValue(weaponId: number) {
    return weaponId ? weapons[weaponId].value : 0;
  }

  /**
   * 攻撃値を取得する
   */
  get atkValue() {
    return GameItem.getAtkValue(this.weaponId);
  }

  /**
   * 守備値を取得する
   * static版
   * @param armorId
   * @returns
   */
  static getDefValue(armorId: number) {
    return armorId ? armors[armorId].value : 0;
  }

  /**
   * 守備値を取得する
   */
  get defValue() {
    return GameItem.getDefValue(this.armorId);
  }

  /**
   * 指定サブパラメータ値を取得する
   * @param n
   * @param baseValue
   * @returns
   */
  getSubParam(n: EBaseSubParamId, baseValue: number) {
    const mapId = this.subParamId ? GameNumberList.get(this.subParamId)[n] : 0;
    const value = GameItem._calcParam(mapId, baseValue);
    return value;
  }
}
