/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/global.d.ts" />
import { EParamEffectCalcType, EParamEffectApplyType } from './DataTypes';
import {
  actionTypes,
  commonScriptset,
  gameMap,
  gameMapSight,
  gameMembers,
  gameTemp,
  getTiledObjectProperty,
  items,
  skills,
  stateOvers,
  states,
  stateTypes,
  system,
} from './DataStore';
import { GameBattler } from './GameBattler';
import { SaveFileInfo, SuspendFileInfo } from './GameTemp';
import Utils from './Utils';
import {
  SaveHeader,
  SuspendHeader,
  getSlotId,
  getSlotNumber,
  getSystemSlotText,
  setSlot,
  setSystemSlot,
} from './DataUtils';
import { Tileset } from './GameMapSight';
import { GameLog } from './GameLog';
import { getSaveDataCompress } from './GameConfig';

export const enum EErrorMessage {
  ProgramError = 'Program Error!!',
  SaveFailed = 'save failed',
  LoadFailed = 'load failed',
  CopyFailed = 'copy failed',
  ParseFailed = 'parse failed',
  RemoveFailed = 'Remove failed',
  NoMove = 'No movement',
  WindowNotFound = 'Window not found',
  OutrangeScript = 'Outrange Script',
  OverScript = 'Over Script !!',
  InvalidEvent = 'Invalid Event',
  EnemyCantAppear = 'Enemy cant appear',
  BattlerCantCall = 'Battler cant call',
  RougeGroup = 'Rouge group',
  NoActionableEnemy = 'No actionable enemy',
}

export const enum EDefine {
  FSpace = '\u{3000}',
  FColon = '\u{ff1a}',
}

interface SaveHeaderSet {
  id: number;
  headerText: string | undefined;
  suspendHeaderText: string | undefined;
}

interface SaveHeaderSource {
  id: number;
  headerText: string;
}

interface SuspendHeaderSource {
  id: number;
  suspendHeaderText: string;
}

export interface GameShopItem {
  id: number;
  name: string;
  price: number;
}

/**
 * ゲーム中の便利クラス
 * staticクラス
 */
export class GameUtils {
  private static PARAM_UP_TEXT_TABLE = [
    'mhpUp',
    'mmpUp',
    'strUp',
    'agiUp',
    'resUp',
    'wizUp',
    'lukUp',
  ];

  /**
   * 数値を10桁未満に丸める
   * 999999999を超える値は999999999に丸める
   * 取得経験値とお金に適用
   * @param value
   */
  static limitTenDigit(value: number) {
    return value > 999999999 ? 999999999 : value;
  }

  //---------------------------------------------
  // スロット操作

  /**
   * スロットの値を数値に変換する
   * @param value
   * @returns
   */
  static slotToNumber(value: number | string) {
    if (typeof value === 'number') {
      return value;
    }
    const num = parseInt(value);
    // 数値じゃない場合は0を返す
    return isNaN(num) ? 0 : num;
  }

  /**
   * スロットの値が数値か確認する
   * @param value
   * @returns
   */
  static checkSlotNumber(value: number | string) {
    return typeof value === 'number';
  }
  /**
   * 行動者名を設定のスロットに格納する
   * @param value
   */
  static setSlotActorName(value: string) {
    setSystemSlot('actor', value);
  }

  /**
   * 行動者名を設定のスロットから取得する
   * @param value
   */
  static getSlotActorName(): string {
    return getSystemSlotText('actor');
  }

  /**
   * 対象者名を設定のスロットに格納する
   * @param value
   */
  //
  static setSlotTargetName(value: string) {
    setSystemSlot('target', value);
  }

  /**
   * 道具またはスキル名を設定のスロットに格納する
   * @param value
   */
  static setSlotItemName(value: string) {
    setSystemSlot('item', value);
  }

  /**
   * 対象道具名を設定のスロットに格納する
   * @param value
   */
  static setSlotTItemName(value: string) {
    setSystemSlot('titem', value);
  }

  /**
   * 保存したいインデックスを設定のスロットに格納する
   * @param value
   */
  static setSlotIndex(value: number) {
    setSystemSlot('index', value);
  }

  /**
   * ポイント値を設定のスロットに格納する
   * @param value
   */
  static setSlotPointValue(value: number) {
    setSystemSlot('point', value);
  }

  /**
   * パラメータ名をidから設定のスロットに格納する
   * @param id
   */
  static setParamValueFromId(id: number) {
    const value = this.getWords('params')[id];
    this.setParamValue(value);
  }

  /**
   * メンバーパラメータ名をidから設定のスロットに格納する
   * @param id
   */
  static setMemberParamValueFromId(id: number) {
    const value = this.getWords('memberParams')[id];
    this.setParamValue(value);
  }

  /**
   * 消費パラメータ名をidから設定のスロットに格納する
   * @param id
   */
  static setConsumeParamValueFromId(id: number) {
    const value = this.getWords('consumeParams')[id];
    this.setParamValue(value);
  }

  /**
   * パラメータ名を設定のスロットに格納する
   * @param value
   */
  static setParamValue(value: string) {
    setSystemSlot('param', value);
  }

  /**
   * メニュー追加データを格納するスロットIdのセットを取得
   * @returns
   */
  static getMenuExtraSlotIds() {
    return [getSlotId('extraStart'), getSlotId('extraCount')];
  }

  /**
   * メニューの商品データを格納するスロットIdのセットを取得
   * @returns
   */
  static getMenuGoodsSlotIds() {
    return [getSlotId('goodsStart'), getSlotId('goodsCount')];
  }

  /**
   * パラメーターから商品スロットに格納する
   * @param params
   */
  static paramsToGoodsSlot(params: number[]) {
    this._setListSlots(params, 'goodsStart', 'goodsCount');
  }

  /**
   * 追加スロットにパラメータを格納する
   * @param params
   */
  static setExtraSlots(params: Array<number | string>) {
    this._setListSlots(params, 'extraStart', 'extraCount');
  }

  private static _setListSlots(
    params: Array<number | string>,
    startName: string,
    countName: string
  ) {
    setSystemSlot(countName, params.length);
    const start = getSlotId(startName);
    for (let i = 0; i < params.length; i++) {
      setSlot(start + i, params[i]);
    }
  }

  /**
   * パラメーターから商品価格スロットに格納する
   * 商品番号スロットの10bit目以降に価格を格納する
   * @param params
   */
  static paramsToGoodsPriceSlot(params: number[]) {
    const start = getSlotId('extraStart');
    const goodsCount = getSlotId('goodsCount');
    const count = Math.min(params.length, goodsCount);
    for (let i = 0; i < count; i++) {
      const value = getSlotNumber(start + i);
      setSlot(start + i, value | (params[i] << 10));
    }
  }

  /**
   * 道具Idから商品情報に変換する
   * 10bitまでが道具Id、10bit目以降が価格
   * @param value
   * @returns {id: number, name: string, price: number}
   */
  static itemIdToShopItem(value: number) {
    const id = value & 0x3ff;
    const item = items[id];
    const price = value >>> 10;
    return { id, name: item.name, price: price > 0 ? price : item.price };
  }

  //---------------------------------------------
  // 共通スクリプト

  /**
   * システム共通スクリプトを追加
   * @param name
   * @param callFn スクリプト開始前に実行する処理
   */
  static pushSystemCommonScript(name: string, callFn?: () => void) {
    gameTemp.pushCommonScript(this.getCommonScriptId(name), callFn);
  }

  //---------------------------------------------
  // 文字

  /**
   * 文字リストを取得
   * @param name
   */
  static getWords(name: string): string[] {
    return system.wordList[name];
  }

  /**
   * 道具の種類の文字を取得
   * @param kind
   */
  static itemKindWord(kind: number) {
    return this.getWords('itemKind')[kind];
  }

  /**
   * ステータス文字を取得
   * @param id
   */
  static statusWord(id: number) {
    return this.getWords('memberParams')[id];
  }

  /**
   * パラメータ名を取得
   * @param id
   * @returns
   */
  static paramsWord(id: number) {
    return this.getWords('params')[id];
  }

  /**
   * スキル分類文字を取得
   * @param kind
   */
  static skillCategoryWord(kind: number): string {
    return this.getWords('skillCategory')[kind];
  }

  /**
   * 複数系の単語を取得する
   * @param id
   * @param length 取得必要かの判断人数 1以下なら複数形を返さない
   * @returns
   */
  static getPluralWord(id: number, length = 1): string {
    if (length > 1) {
      return this.getWords('plural')[id];
    } else {
      return '';
    }
  }

  /**
   * 複数の敵グループを表す単語を取得する
   * @returns
   */
  static getFlockEnemyWord(id = 0): string {
    return this.getWords('flock')[id];
  }

  /**
   * 全員を表す単語を取得する
   * @returns
   */
  static getEveryoneWord(id = 0): string {
    return this.getWords('everyone')[id];
  }

  /**
   * 状態アニメIdを取得
   * @param id
   * @param name
   */
  static getStateAnimationId(id: number, name: string) {
    return this.getState(id).animationIds[name];
  }

  /**
   * 状態アニメ上書きIdを取得
   * @param id
   * @param name
   * @returns
   */
  static getStateOverAnimationId(id: number, name: string) {
    return stateOvers[id].animationIds[name];
  }

  //---------------------------------------------
  // データオブジェクト取得

  /**
   * 移動ルートオブジェクトを取得
   * @param type
   * @param routeId
   */
  static getMoveRoute(type: number, routeId: number) {
    if (type === 0) {
      // 共通
      return system.moveRoutes[routeId];
    } else {
      // マップ
      return gameMapSight.eventset.moveRoutes?.[routeId];
    }
  }

  /**
   * 状態を取得
   * @param id
   */
  static getState(id: number) {
    return states[id];
  }

  /**
   * 状態タイプを取得
   * @param id
   */
  static getStateType(id: number) {
    return stateTypes[id];
  }

  /**
   * 状態Idの状態タイプを取得する
   * @param id
   * @returns
   */
  static getStateTypeOfStateId(id: number) {
    const state = this.getState(id);
    return this.getStateType(state.type);
  }

  /**
   * 状態Idから除去率Idリストを取得する
   * @param id
   * @returns
   */
  static getRemoveRateIds(id: number, overId: number) {
    const overRateId = overId ? stateOvers[overId].removeRateId : 0;
    return overRateId
      ? system.numberLists[overRateId]
      : system.numberLists[states[id].removeRateId];
  }

  /**
   * 状態のメッセージIdを取得
   * @param id
   * @returns
   */
  static getStateMessageIds(id) {
    return GameUtils.getState(id).messageIds;
  }

  /**
   * 状態上書きのメッセージとアニメーションのIdセットを名前から取得する
   * @param id
   * @param name
   * @returns
   */
  static getStateOverIdsFromName(id: number, name: string) {
    const stateOver = stateOvers[id];
    return [stateOver.messageIds[name], stateOver.animationIds[name]];
  }

  /**
   * 低ランクの状態か比較する
   * @param stateId1 比較されるstateId
   * @param stateId2 比較情報のstateId
   */
  static lowRankState(stateId1, stateId2) {
    if (stateId1 === stateId2) {
      return false;
    }
    const state1 = GameUtils.getState(stateId1);
    const state2 = GameUtils.getState(stateId2);
    return (
      state1.priority >= state2.beginPriority &&
      state1.priority <= state2.endPriority
    );
  }

  /**
   * 通常攻撃のスキルオブジェクトを取得
   */
  static getNormalAttack() {
    const skillId = this.getNormalAttackId();
    return skills[skillId];
  }

  /**
   * 防御のスキルオブジェクトを取得
   */
  static getNormalParry() {
    const skillId = this.getNormalParryId();
    return skills[skillId];
  }

  /**
   * 敵の標準スキルオブジェクトを取得
   * @returns
   */
  static getEnemyStandardSkill() {
    const skillId = this.getEnemyStandardSkillId();
    return skills[skillId];
  }

  /**
   * 行先ID群を取得
   * @param id
   */
  static getAddressIds(id: number) {
    return system.addressList[id];
  }

  //---------------------------------------------
  // Id取得

  /**
   * 通常攻撃のIdを取得
   */
  static getNormalAttackId() {
    return system.normalSkillIds.attack;
  }

  /**
   * 防御のIdを取得
   */
  static getNormalParryId() {
    return system.normalSkillIds.parry;
  }

  /**
   * 敵の標準スキルIdを取得
   * @returns
   */
  static getEnemyStandardSkillId() {
    return system.normalSkillIds.enemy;
  }

  /**
   * 特別なスクリプトを取得する
   * @param key
   * @returns
   */
  static getSpecialScript(key: string) {
    return commonScriptset[this.getCommonScriptId(key)];
  }

  /**
   * 共通スクリプトIdを取得
   * @param key
   */
  static getCommonScriptId(key: string): number {
    return system.commonScriptIds[key];
  }

  /**
   * 敵か味方に応じ会心名を取得する
   * @param myself
   * @returns
   */
  static getCriticalName(myself: boolean) {
    return myself ? 'critical1' : 'critical2';
  }

  /**
   * 敵か味方に応じダメージ名を取得する
   * @param myself
   */
  static getDamageName(myself: boolean) {
    return myself ? 'damage1' : 'damage2';
  }

  /**
   * 敵か味方に応じMPダメージ名を取得する
   * @param myself
   */
  static getMpDamageName(myself: boolean) {
    return this._catBothSideName('mpDamage', myself);
  }

  /**
   * 敵か味方に応じ吸収名を取得する
   * @param myself
   */
  static getDrainName(myself: boolean) {
    return this._catBothSideName('drain', myself);
  }

  /**
   * 敵か味方に応じHP回復名を取得する
   * @param myself
   */
  static getRecoverName(myself: boolean) {
    return this._catBothSideName('recover', myself);
  }

  /**
   * 敵か味方に応じMP回復名を取得する
   * @param myself
   */
  static getRecoverMpName(myself: boolean) {
    return this._catBothSideName('recoverMp', myself);
  }

  /**
   * 敵か味方に応じばたんになった名を取得する
   * @param myself
   */
  static getDownName(myself: boolean) {
    return myself ? 'down1' : 'down2';
  }

  /**
   * 敵か味方に応じ能力増加名を取得する
   * @param myself
   */
  static getBuffName(myself: boolean) {
    return myself ? 'buff1' : 'buff2';
  }

  /**
   * 敵か味方に応じ能力減少名を取得する
   * @param myself
   */
  static getDebuffName(myself: boolean) {
    return myself ? 'debuff1' : 'debuff2';
  }

  /**
   * 敵か味方に応じ能力増加限界名を取得する
   * @param myself
   */
  static getGoneUpName(myself: boolean) {
    return myself ? 'goneUp1' : 'goneUp2';
  }

  /**
   * 敵か味方に応じ能力減少限界名を取得する
   * @param myself
   */
  static getGoneDownName(myself: boolean) {
    return myself ? 'goneDown1' : 'goneDown2';
  }

  /**
   * 敵か味方に応じすでに名を取得する
   * @param myself
   * @returns
   */
  static getAlreadyName(myself: boolean) {
    return `already${myself ? '1' : '2'}`;
  }

  /**
   * 敵か味方に応じダメージなし名を取得する
   * @param myself
   * @returns
   */
  static getNoDamageName(myself: boolean) {
    return myself ? 'nodamage1' : 'nodamage2';
  }

  /**
   * 敵か味方に応じ回避名を取得する
   * @param myself
   * @returns
   */
  static getEvasionName(myself: boolean) {
    return myself ? 'evasion1' : 'evasion2';
  }

  /**
   * 敵か味方に応じ当たらなかった名を取得する
   * @param myself
   * @returns
   */
  static getFailedHitName(myself: boolean) {
    return myself ? 'failed1' : 'failed2';
  }

  /**
   * 敵か味方に応じ封印名を取得する
   * @param myself
   * @returns
   */
  static getSealName(myself: boolean) {
    return this._catBothSideName('seal', myself);
  }

  /**
   * 敵か味方に応じ反射名を取得する
   * @param myself
   * @returns
   */
  static getReflectionName(myself: boolean) {
    return this._catBothSideName('reflection', myself);
  }

  /**
   * 敵か味方に応じ名前を連結する
   * @param name
   * @param myself
   * @returns
   */
  private static _catBothSideName(name: string, myself: boolean) {
    return `${name}${myself ? '1' : '2'}`;
  }

  //---------------------------------------------
  // ゲームオブジェクト取得

  /**
   * スロットIdに格納しているメンバーインデックスから
   * メンバーオブジェクトを取得する
   * @param id
   * @returns
   */
  static getMemberFromSlotId(id: number) {
    const index = getSlotNumber(id);
    return gameMembers.getMember(index);
  }

  /**
   * 状態Idからスリップダメージを取得
   * @param stateId
   */
  static getSlipDamageFromStateId(stateId) {
    const state = states[stateId];
    if (!state.slipDamageId) {
      return;
    }
    return system.slipDamages[state.slipDamageId];
  }

  //---------------------------------------------
  // メッセージ取得

  /**
   * システムメッセージ取得
   * @param name
   */
  static getSystemMessage(name: string) {
    return this.getMessage(system.messageIds[name]);
  }

  /**
   * パラメータアップメッセージ取得
   * @param index
   */
  static getParamUpMessage(index) {
    return this.getMessage(system.messageIds[this.PARAM_UP_TEXT_TABLE[index]]);
  }

  /**
   * 状態メッセージを取得
   * @param id
   * @param name
   */
  static getStateMessage(id: number, name: string) {
    return this.getMessage(this.getState(id).messageIds[name]);
  }

  /**
   * 状態メッセージ上書きを取得
   * @param id
   * @param name
   * @returns
   */
  static getStateOverMessage(id: number, name: string) {
    return this.getMessage(stateOvers[id].messageIds[name]);
  }

  /**
   * メッセージ取得
   * @param id
   */
  static getMessage(id: number): string {
    return system.messages[id];
  }

  //---------------------------------------------
  // 計算処理

  /**
   * 固定値を計算して取得
   * @param min
   * @param max
   * @param base
   * @param rate
   */
  static figureValue(min: number, max: number, base: number, rateId: number) {
    if (rateId) {
      const [num, div] = GameRate.operation(rateId);
      return Utils.randomInt(min, max + 1) + Math.floor((base * num) / div);
    } else {
      return Utils.randomInt(min, max + 1);
    }
  }

  /**
   * 運の偏り付きランダム値取得
   * @param luckId
   * @param min
   * @param max
   * @param s
   * @param t
   * @returns
   */
  static luckBiasRandomInt(
    min: number,
    max: number,
    luckId: number,
    s: number,
    t: number
  ) {
    if (luckId) {
      const center = Math.floor((min + max) / 2);
      const bias = Math.floor(GameParamEffect.operation(luckId, center, s, t));
      return Utils.biasedRandomInt(min, max, bias);
    } else {
      return Utils.randomInt(min, max);
    }
  }

  /**
   * 演算子による演算
   * @param opecode
   * @param value1
   * @param value2
   */
  static calcOpecode(opecode: number, value1: number, value2: number) {
    switch (opecode) {
      case 0:
        return value2;
      case 1:
        return value1 + value2;
      case 2:
        return value1 - value2;
      case 3:
        return value1 * value2;
      case 4:
        return Math.floor(value1 / value2);
      case 5:
        return value1 % value2;
      case 6:
        return value1 | value2;
      case 7:
        return value1 & value2;
      case 8:
        return value1 & ~value2;
    }
    return value1;
  }

  //---------------------------------------------
  // ファイル読み込み

  /**
   * マップ関係のファイル読み込み
   * @param url
   * @param fn
   * @param fnError
   */
  static loadMapFile(url, fn, fnError) {
    const reviver = function (this, key, value) {
      if (key === 'properties' && Array.isArray(value)) {
        value.forEach((item) => (this[item.name] = item.value));
        return undefined;
      }
      return value;
    };
    this._loadJsonFile(url, fn, fnError, reviver);
  }

  /**
   * objecttypeファイル読み込み専用
   * @param url
   * @param fn
   * @param fnError
   */
  static loadObjectTypesFile(url, fn, fnError) {
    const reviver = function (key, value) {
      if (key === 'color') {
        return undefined;
      }
      if (key === 'properties' && Array.isArray(value)) {
        return value.reduce((object, current) => {
          object[current.name] = current.value;
          return object;
        }, {});
      }
      return value;
    };
    this._loadJsonFile(url, fn, fnError, reviver);
  }

  /**
   * jsonファイル読み込み
   * @param url
   * @param fn
   * @param fnError
   * @param reviver
   */
  private static _loadJsonFile(url, fn, fnError, reviver) {
    const xhr = new XMLHttpRequest();

    // 3番目は非同期かどうか
    xhr.open('GET', url, true);
    xhr.responseType = 'text';

    xhr.onload = (e) => {
      if (Math.floor(xhr.status / 100) !== 2) {
        fnError(e);
        return;
      }
      const data = JSON.parse(xhr.responseText, reviver);
      fn(data);
    };
    xhr.onerror = (e) => {
      fnError(e);
    };
    xhr.onerror = (e) => {
      fnError(e);
    };
    xhr.send();
  }

  //---------------------------------------------
  // タイル関係

  /**
   * タイル単位のX座標を取得
   * @param x
   */
  static tileX(x: number) {
    return Math.floor(x / gameMap.tileWidth);
  }

  /**
   * タイル単位のY座標を取得
   * @param y
   */
  static tileY(y: number) {
    return Math.floor(y / gameMap.tileHeight);
  }

  /**
   * tilesets:mapに関連づいているタイルセット情報 gid を参照するだけ
   * tilesetsData:タイルセットのデータ部分
   * 16: タイル情報ありフラグ
   * 5～15:タイルid
   * 1～4:タイルセットインデックス
   * @param gid
   * @param tilesets
   * @param tilesList
   */
  static gidToTileData(gid: number, tilesets: Tileset[]) {
    // gidからタイルidとタイルセットインデックスを取得する
    const [id, index] = this.getTile(gid, tilesets);
    if (id < 0 || index < 0) {
      // 描画しないタイル
      return 0;
    }

    return (1 << 15) | (id << 4) | index;
  }

  /**
   * タイルを取得
   * タイルidとタイルセットインデックスのセット
   * @param tilesetsInfo
   * @param gid
   */
  static getTile(gid: number, tilesets: Tileset[]) {
    // tilesetのfirstgidが昇順前提
    let id = -1;
    let index = -1;
    for (let i = tilesets.length - 1; i >= 0; i--) {
      const subId = gid - tilesets[i].firstgid;
      if (subId >= 0) {
        id = subId;
        index = i;
        break;
      }
      // gidが0の場合はマイナスになるので途中で抜けることはない
    }

    return [id, index];
  }

  /**
   * 有効なタイルか
   * @param tileData
   */
  static enableTile(tileData: number) {
    return (tileData & 0x8000) !== 0;
  }

  /**
   * タイルIdを取得
   * @param tileData
   */
  static getTileId(tileData: number) {
    return (tileData >> 4) & 0x7ff;
  }

  /**
   * タイルインデックスを取得
   * @param tileData
   */
  static getTileIndex(tileData: number) {
    return tileData & 0xf;
  }

  /**
   * タイルオブジェクトから数値に変換
   * 17〜32: 地形id
   * 14～16: アニメーションタイル距離
   * 13: アニメーション方向
   * 11～12: アニメーション枚数
   * 9～10: 空き
   * 8: 上層
   * 7: 空き
   * 3〜6: 各方向衝突フラグ 下(0x1)左(0x2)右(0x4)上(0x8)の順
   * 2: カウンター
   * 1: 空き
   * @param tile
   */
  static tileObjectToTile(tileObj): number {
    if (tileObj === undefined) {
      return 0;
    }
    const typeInfo = getTiledObjectProperty(tileObj.type);

    const baseCounter = tileObj.counter ?? typeInfo?.counter ?? false;
    const baseCollision4 = tileObj.collision4 ?? typeInfo?.collision4 ?? 0;
    const baseUpper = tileObj.upper ?? typeInfo?.upper ?? false;
    const baseAnimShift = tileObj.anim ?? typeInfo?.anim ?? 0;
    const baseDirection = tileObj.direction ?? typeInfo?.direction ?? 0;
    const defaultPattern = baseAnimShift > 0 ? 1 : 0;
    const basePattern = tileObj.pattern ?? typeInfo?.pattern ?? defaultPattern;

    const counter = baseCounter ? 1 << 1 : 0;
    const collision4 = baseCollision4 << 2;
    const upper = baseUpper ? 1 << 7 : 0;
    const animShift = baseAnimShift << 13;
    const direction = baseDirection << 12;
    const pattern = basePattern << 10;

    return counter | collision4 | upper | pattern | direction | animShift;
  }

  /**
   * 地形Idから数値に変換
   * @param terrainId
   */
  static terrainIdToTile(terrainId: number): number {
    if (typeof terrainId !== 'number') {
      return 0;
    }
    return terrainId << 16;
  }

  /**
   * アニメパターンの距離を取得
   * @param tile
   */
  static getAnim(tile) {
    return (tile >> 13) & 0x07;
  }

  /**
   * アニメ方向を取得
   * @param tile
   * @returns
   */
  static getAnimDirection(tile: number) {
    return (tile >> 12) & 0x01;
  }

  /**
   * アニメパターン数を取得
   * @param tile
   * @returns
   */
  static getAnimPattern(tile: number) {
    return (tile >> 10) & 0x03;
  }

  /**
   * 上層かどうか
   * @param tile
   */
  static upperTile(tile) {
    return ((tile >> 7) & 0x01) === 1;
  }

  /**
   * カウンタータイルかどうか
   * @param tile
   */
  static counterTile(tile) {
    return ((tile >> 1) & 0x01) === 1;
  }

  /**
   * 地形Idを取得
   * @param tile
   */
  static getTerrainId(tile: number) {
    return tile >>> 16;
  }

  /**
   * 4方向の衝突情報を取得
   * @param tile
   * @returns
   */
  static getCollision4(tile: number) {
    return (tile >> 2) & 0xf;
  }

  /**
   * 部屋データを作成
   * @param roomId
   * @param inFlag
   */
  static createRoomData(roomId: number, inFlag = true) {
    return roomId | (inFlag ? 0x80 : 0);
  }

  /**
   * 部屋に入るかどうかを取得
   * @param room
   */
  static roomIn(room: number) {
    return (room & 0x80) === 0x80;
  }

  /**
   * 部屋Idを取得
   * @param room
   */
  static getRoomId(room: number) {
    return room & 0x7f;
  }

  //--------------------------------------------------------
  // セーブロード

  /**
   * セーブファイルリストを取得する
   * @param path
   * @returns
   */
  static getSaveFileList() {
    if (this._runningElectron()) {
      return this._getSaveListToLocalFile();
    } else {
      return this._getSaveListToWebStorage();
    }
  }

  /**
   * 中断ファイルリストを取得する
   * electron：webストレージ
   * electron+テストプレイ：ローカルファイル+webストレージ
   * web：webストレージ
   * @param web
   * @returns
   */
  static getSuspendFileList(web: boolean) {
    if (web) {
      return this._getSuspendListToWebStorage();
    } else {
      if (this._runningElectron() && gameTemp.testPlay) {
        return this._getSuspendListToLocalFile();
      }
    }
  }

  /**
   * セーブファイルリストをローカルファイルから取得する
   * @returns
   */
  private static _getSaveListToLocalFile() {
    const saveInfo = system.saveInfo;
    window.file.send(
      'getSaveFileList',
      `${saveInfo.path}/${saveInfo.format}`,
      saveInfo.max
    );
    return new Promise<SaveFileInfo[]>((resolve, reject) => {
      window.file.on('getSaveFileListResult', async (result, data) => {
        if (result === 'success' && data !== undefined) {
          try {
            const headers = await this._parseHeaderSource(data);
            resolve(this._expandSaveFileListFromObject(headers));
          } catch (e) {
            GameLog.error(e);
            reject(e);
          }
        } else {
          reject(data);
        }
      });
    });
  }

  /**
   * 中断ファイルリストをローカルファイルから取得する
   * @returns
   */
  private static _getSuspendListToLocalFile() {
    const saveInfo = system.saveInfo;
    window.file.send(
      'getSuspendFileList',
      `${saveInfo.suspendPath}/${saveInfo.suspendFormat}`,
      saveInfo.max
    );
    return new Promise<SuspendFileInfo[]>((resolve, reject) => {
      window.file.on('getSuspendFileListResult', async (result, data) => {
        if (result === 'success' && data !== undefined) {
          try {
            const suspendHeaders = await this._parseSuspendHeaderSource(data);
            resolve(this._expandSuspendFileListFromObject(suspendHeaders));
          } catch (e) {
            GameLog.error(e);
            reject(e);
          }
        } else {
          reject(data);
        }
      });
    });
  }

  /**
   * セーブファイルリストをローカルストレージから取得する
   * @returns
   */
  private static _getSaveListToWebStorage() {
    const key = this._getSaveListKey();
    const listText = localStorage.getItem(key) ?? this._makeEmptySaveList();
    return this._parseHeaderSource(listText).then((headers) => {
      return new Promise<SaveFileInfo[]>((resolve, reject) => {
        try {
          resolve(this._expandSaveFileListFromObject(headers));
        } catch (e) {
          GameLog.error(e);
          reject('failed load suspend list');
        }
      });
    });
  }

  /**
   * JSON形式のセーブファイルのヘッダーを解析して、各ヘッダーのTextを展開する
   * @param data
   * @returns
   */
  private static async _parseHeaderSource(data: string) {
    const headers: SaveHeaderSource[] = JSON.parse(data);
    for (const header of headers) {
      header.headerText = await this._decompressSaveText(header.headerText);
    }
    return headers;
  }

  /**
   * JSON形式の中断ファイルのヘッダーを解析して、各ヘッダーのTextを展開する
   * @param data
   * @returns
   */
  private static async _parseSuspendHeaderSource(data: string) {
    const headers: SuspendHeaderSource[] = JSON.parse(data);
    for (const header of headers) {
      header.suspendHeaderText = await this._decompressSaveText(
        header.suspendHeaderText
      );
    }
    return headers;
  }

  /**
   * 中断ファイルリストをローカルストレージから取得する
   * @returns
   */
  private static _getSuspendListToWebStorage() {
    const key = this._getSuspendListKey();
    const listText = localStorage.getItem(key) ?? this._makeEmptySuspendList();
    return this._parseSuspendHeaderSource(listText).then((suspendHeaders) => {
      return new Promise<SuspendFileInfo[]>((resolve, reject) => {
        try {
          resolve(this._expandSuspendFileListFromObject(suspendHeaders));
        } catch (e) {
          GameLog.error(e);
          reject('failed load save list');
        }
      });
    });
  }

  /**
   * セーブファイルリストを展開する
   * @param headers
   * @returns
   */
  private static _expandSaveFileListFromObject(
    headers: SaveHeaderSource[]
  ): SaveFileInfo[] {
    return headers.map((value: SaveHeaderSource): SaveFileInfo => {
      return this._expandSaveHeaderFromObject(value);
    });
  }

  /**
   * SaveHeaderSourceをSaveFileInfoに展開する
   * @param value
   * @returns
   * @private
   */
  private static _expandSaveHeaderFromObject(
    value: SaveHeaderSource
  ): SaveFileInfo {
    let parseHeader: SaveHeader | null = null;
    if (value.headerText) {
      try {
        parseHeader = JSON.parse(value.headerText);
      } catch (e) {
        GameLog.error('save', value.id, e);
      }
    }
    const exist = parseHeader ? true : false;
    const header: SaveHeader = parseHeader
      ? parseHeader
      : { name: '', lv: 0, locate: '', count: 0 };
    const invalid = typeof header?.name !== 'string';
    header.lv ??= 0;
    header.locate ??= '';
    header.count ??= 0;

    return {
      id: value.id,
      invalid: invalid,
      exist: exist,
      header: header,
      suspendExist: false,
      suspendHeader: {
        name: '',
        lv: 0,
        locate: '',
        count: 0,
      },
    };
  }

  /**
   * SuspendHeaderSource[]をSuspendFileInfo[]に展開する
   * @param suspendHeaders
   * @returns
   * @private
   */
  private static _expandSuspendFileListFromObject(
    suspendHeaders: SuspendHeaderSource[]
  ): SuspendFileInfo[] {
    return suspendHeaders.map((value) => {
      return this._expandSuspendHeaderFromObject(value);
    });
  }

  /**
   * SuspendHeaderSourceからSuspendFileInfoに展開する
   * @param value
   * @returns
   * @private
   */
  private static _expandSuspendHeaderFromObject(
    value: SuspendHeaderSource
  ): SuspendFileInfo {
    let parseSuspendHeader: SuspendHeader | null = null;
    if (value.suspendHeaderText) {
      try {
        parseSuspendHeader = JSON.parse(value.suspendHeaderText);
      } catch (e) {
        GameLog.error('suspend', value.id, e);
      }
    }
    // 中断の場合は壊れていれば存在しないとする
    const suspendExist =
      typeof parseSuspendHeader?.name === 'string' &&
      parseSuspendHeader.name !== '';
    const suspendHeader =
      parseSuspendHeader && suspendExist
        ? parseSuspendHeader
        : { name: '', lv: 0, locate: '', count: 0 };
    suspendHeader.lv ??= 0;
    suspendHeader.locate ??= '';
    suspendHeader.count ??= 0;

    return {
      id: value.id,
      suspendExist: suspendExist,
      suspendHeader: suspendHeader,
    };
  }

  /**
   * セーブファイルを保存
   * @param id
   * @param data
   */
  static saveFile(id: number, header: string, body: string) {
    if (this._runningElectron()) {
      return this._saveToLocalFile(id, header, body, false);
    } else {
      return this._saveToWebStorage(id, header, body, false);
    }
  }

  /**
   * 中断ファイルを保存
   * @param id
   * @param data
   */
  static suspendFile(id: number, header: string, body: string) {
    const electron = this._runningElectron();
    const promiseLocal =
      electron && gameTemp.testPlay
        ? this._saveToLocalFile(id, header, body, true)
        : undefined;
    const promiseWeb = this._saveToWebStorage(id, header, body, true);
    return Promise.allSettled([promiseLocal, promiseWeb]);
  }

  /**
   * ローカルにセーブファイルを保存する
   * @param id
   * @param header
   * @param body
   * @returns
   */
  private static _saveToLocalFile(
    id: number,
    header: string,
    body: string,
    suspend: boolean
  ) {
    const name = this._makeSaveFilePath(id, suspend);
    return this._compressSaveText(header)
      .then((compressedHeader) => {
        header = compressedHeader;
        return this._compressSaveText(body);
      })
      .then((compressedBody) => {
        body = compressedBody;

        window.file.send('writeFile', name, header, body);
        return new Promise<void>((resolve, reject) => {
          window.file.on('writeResult', (result) => {
            if (result === 'success') {
              resolve();
            } else {
              reject();
            }
          });
        });
      });
  }

  /**
   * ローカルストレージにセーブファイルを保存する
   * @param id
   * @param header
   * @param body
   * @returns
   */
  private static _saveToWebStorage(
    id: number,
    header: string,
    body: string,
    suspend: boolean
  ) {
    const name = suspend
      ? this._makeSuspendFilename(id)
      : this._makeSaveFilename(id);
    return this._compressSaveText(header)
      .then((compressedHeader) => {
        header = compressedHeader;
        return this._compressSaveText(body);
      })
      .then((compressedBody) => {
        body = compressedBody;

        return new Promise<void>((resolve, reject) => {
          try {
            this._saveListToWebStorage(id, header, suspend);
            localStorage.setItem(name, body);
            resolve();
          } catch (e) {
            GameLog.error(e);
            reject();
          }
        });
      });
  }

  /**
   * ローカルストレージにセーブリストを保存する
   * @param id
   * @param header
   */
  private static _saveListToWebStorage(
    id: number,
    header: string,
    suspend: boolean
  ) {
    const key = this._getSaveListKey();
    const listText = localStorage.getItem(key) ?? this._makeEmptySaveList();
    const list = JSON.parse(listText) as SaveHeaderSet[];
    if (suspend) {
      list[id - 1].suspendHeaderText = header;
    } else {
      list[id - 1].headerText = header;
    }
    localStorage.setItem(key, JSON.stringify(list));
  }

  /**
   * 空のセーブリストを作成する
   * @returns
   */
  private static _makeEmptySaveList() {
    const max = system.saveInfo.max;
    const list: Array<{
      id: number;
      headerText: string | undefined;
    }> = [];
    for (let i = 0; i < max; i++) {
      list.push({
        id: i + 1,
        headerText: undefined,
      });
    }
    return JSON.stringify(list);
  }

  /**
   * 空の中断リストを作成する
   * @returns
   */
  private static _makeEmptySuspendList() {
    const max = system.saveInfo.max;
    const list: Array<{
      id: number;
      suspendHeaderText: string | undefined;
    }> = [];
    for (let i = 0; i < max; i++) {
      list.push({
        id: i + 1,
        suspendHeaderText: undefined,
      });
    }
    return JSON.stringify(list);
  }

  /**
   * セーブヘッダをロードする
   * @param id
   * @returns
   */
  static loadSaveHeader(id: number) {
    if (this._runningElectron()) {
      return window.file
        .readSaveHeader(this._makeSaveFilePath(id, false))
        .then((header) => this._decompressSaveText(header));
    } else {
      return this._getSaveHeaderToWebStorage(id, false);
    }
  }

  /**
   * Web Storage からセーブヘッダをロードする
   * @param id
   * @param suspend
   * @returns
   */
  private static _getSaveHeaderToWebStorage(id: number, suspend: boolean) {
    const key = suspend ? this._getSuspendListKey() : this._getSaveListKey();
    const listText = localStorage.getItem(key);
    if (!listText) {
      return new Promise<string>((_resolve, reject) =>
        reject('failed load header list')
      );
    }
    if (suspend) {
      // なし
      return new Promise<string>((_resolve, reject) => reject('miss suspend'));
    } else {
      const headers: SaveHeaderSource[] = JSON.parse(listText);
      const header = headers[id - 1];
      if (!header) {
        return new Promise<string>((_resolve, reject) =>
          reject('failed load header list')
        );
      }
      return this._decompressSaveText(header.headerText).then(
        (headerText) =>
          new Promise<string>((resolve, reject) => {
            header.headerText = headerText;
            try {
              const headerSource = this._expandSaveHeaderFromObject(header);
              if (!headerSource.exist || headerSource.invalid) {
                reject('failed load header list');
              }
              return resolve(JSON.stringify(headerSource.header));
            } catch (e) {
              GameLog.error(e);
              reject('failed load header list');
            }
          })
      );
    }
  }

  /**
   * セーブファイルを読み込む
   * @param id
   * @returns
   */
  static loadSaveFile(id: number) {
    if (this._runningElectron()) {
      return this._loadFromLocalFile(id, false);
    } else {
      return this._loadFromWebStorage(id, false);
    }
  }

  /**
   * 中断ファイルを読み込む
   * @param id
   * @param web
   * @returns
   */
  static loadSuspendFile(id: number, web: boolean) {
    if (web) {
      return this._loadFromWebStorage(id, true);
    } else {
      if (this._runningElectron() && gameTemp.testPlay) {
        return this._loadFromLocalFile(id, true);
      }
    }
    return Promise.reject();
  }

  /**
   * ローカルファイルからセーブファイルを読み込む
   * @param id
   * @returns
   */
  private static _loadFromLocalFile(id: number, suspend: boolean) {
    const name = this._makeSaveFilePath(id, suspend);
    window.file.send('readFile', name);
    return new Promise<string>((resolve, reject) => {
      window.file.on('readResult', async (result, data) => {
        if (result === 'success' && data !== undefined) {
          try {
            data = await this._decompressSaveText(data);
            resolve(data);
          } catch (e) {
            GameLog.error(e);
            reject();
          }
        } else {
          reject();
        }
      });
    });
  }

  /**
   * ローカルストレージからセーブファイルを読み込む
   * @param id
   * @returns
   */
  private static _loadFromWebStorage(id: number, suspend: boolean) {
    const name = suspend
      ? this._makeSuspendFilename(id)
      : this._makeSaveFilename(id);
    const textData = localStorage.getItem(name);
    if (!textData) {
      return Promise.reject();
    }
    return this._decompressSaveText(textData);
  }

  /**
   * セーブデータのテキストを圧縮する
   * 圧縮しない場合はそのまま返す
   * 圧縮する場合はUtils.compress()を通して返す
   * @param text 圧縮するテキスト
   * @returns 圧縮されたテキスト
   */
  private static async _compressSaveText(text: string) {
    if (this._saveCompress()) {
      return await Utils.compress(text);
    } else {
      return text;
    }
  }

  /**
   * セーブデータのテキストを展開する
   * 保存されたテキストが Utils.compress() で圧縮されている場合は展開する
   * @param text 展開するテキスト
   * @returns 展開されたテキスト
   */
  private static async _decompressSaveText(text: string) {
    // 先頭2文字のコードが 0x78 0x9c なら圧縮とみなし展開する
    if (text && text.charCodeAt(0) === 0x78 && text.charCodeAt(1) === 0x9c) {
      return await Utils.decompress(text);
    } else {
      return text;
    }
  }

  /**
   * セーブファイルを写す
   * @param srcId
   * @param destId
   * @returns
   */
  static copyFile(srcId: number, destId: number) {
    if (this._runningElectron()) {
      return this._copyFromLocalFile(srcId, destId);
    } else {
      return this._copyFromWebStorage(srcId, destId);
    }
  }

  /**
   * ローカルのセーブファイルを写す
   * @param srcId
   * @param destId
   * @returns
   */
  private static _copyFromLocalFile(srcId: number, destId: number) {
    const srcName = this._makeSaveFilePath(srcId, false);
    const destName = this._makeSaveFilePath(destId, false);
    window.file.send('copyFile', srcName, destName);
    return new Promise<void>((resolve, reject) => {
      window.file.on('copyResult', (result) => {
        if (result === 'success') {
          resolve();
        } else {
          reject();
        }
      });
    });
  }

  /**
   * ローカルストレージのセーブファイルを写す
   * @param srcId
   * @param destId
   * @returns
   */
  private static _copyFromWebStorage(srcId: number, destId: number) {
    return new Promise<void>((resolve, reject) => {
      try {
        const key = this._getSaveListKey();
        const srcKey = this._makeSaveFilename(srcId);
        const textData = localStorage.getItem(srcKey);
        const listText = localStorage.getItem(key) ?? this._makeEmptySaveList();
        const list = JSON.parse(listText) as SaveHeaderSet[];
        list[destId - 1].headerText = list[srcId - 1].headerText;
        list[destId - 1].suspendHeaderText = undefined;
        const destKey = this._makeSaveFilename(destId);
        localStorage.setItem(destKey, textData ?? '');
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        GameLog.error(e);
        reject('failed copy');
      }
      resolve();
    });
  }

  /**
   * セーブファイルを削除する
   * @param id
   * @returns
   */
  static removeSaveFile(id: number) {
    if (this._runningElectron()) {
      return this._removeFromLocalFile(id, false);
    } else {
      return this._removeFromWebStorage(id, false);
    }
  }

  /**
   * 中断ファイルを削除する
   * @param id
   */
  static removeSuspendFile(id: number, web: boolean) {
    if (web) {
      return this._removeFromWebStorage(id, true);
    } else {
      if (this._runningElectron() && gameTemp.testPlay) {
        return this._removeFromLocalFile(id, true);
      }
    }
    return Promise.resolve();
  }

  /**
   * 中断ファイルを削除する
   * 任意に削除を選択したわけではないので消滅とする
   * テストプレイ時は中断ファイルを削除しないのがremoveとの違い
   * @param id
   */
  static eraseSuspendFile(id: number) {
    if (!gameTemp.testPlay) {
      this._removeFromWebStorage(id, true);
    }
  }

  /**
   * ローカルのセーブファイル削除
   * @param id
   * @param suspend
   * @returns
   */
  private static _removeFromLocalFile(id: number, suspend: boolean) {
    const name = this._makeSaveFilePath(id, suspend);
    window.file.send('removeFile', name);
    return new Promise<void>((resolve, reject) => {
      window.file.on('removeResult', (result) => {
        if (result === 'success') {
          resolve();
        } else {
          reject();
        }
      });
    });
  }

  /**
   * ローカルストレージのセーブファイル削除
   * @param id
   * @param suspend
   * @returns
   */
  private static _removeFromWebStorage(id: number, suspend: boolean) {
    return new Promise<void>((resolve, reject) => {
      try {
        const key = this._getSaveListKey();
        const listText = localStorage.getItem(key) ?? this._makeEmptySaveList();
        const list = JSON.parse(listText) as SaveHeaderSet[];
        if (suspend) {
          list[id - 1].suspendHeaderText = undefined;
        } else {
          list[id - 1].headerText = undefined;
        }
        const saveKey = suspend
          ? this._makeSuspendFilename(id)
          : this._makeSaveFilename(id);
        localStorage.removeItem(saveKey);
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        GameLog.error(e);
        reject('failed remove');
      }
      resolve();
    });
  }

  /**
   * セーブファイルパスを作成する
   * @param id
   * @returns
   */
  private static _makeSaveFilePath(id: number, suspend: boolean) {
    if (suspend) {
      return `${system.saveInfo.suspendPath}/${this._makeSuspendFilename(id)}`;
    } else {
      return `${system.saveInfo.path}/${this._makeSaveFilename(id)}`;
    }
  }

  /**
   * セーブファイル名を作成する
   * @param id
   * @returns
   */
  private static _makeSaveFilename(id: number) {
    return system.saveInfo.format.replace('[d]', id.toString());
  }

  /**
   * 中断ファイル名を作成する
   * @param id
   * @returns
   */
  private static _makeSuspendFilename(id: number) {
    return system.saveInfo.suspendFormat.replace('[d]', id.toString());
  }

  /**
   * セーブリストのキーを取得する
   * @returns
   */
  private static _getSaveListKey() {
    return system.saveInfo.path;
  }

  /**
   * 中断リストのキーを取得する
   * @returns
   */
  private static _getSuspendListKey() {
    return system.saveInfo.suspendPath;
  }

  /**
   * electron上で実行しているか
   * @returns
   */
  private static _runningElectron() {
    return Utils.runningElectron();
  }

  /**
   * セーブデータを圧縮するかどうかを判定する
   * @returns 圧縮を行う場合は true、それ以外の場合は false
   */
  private static _saveCompress() {
    return getSaveDataCompress();
  }
}

/**
 * 矩形
 */
export type Rect = { x: number; y: number; width: number; height: number };

/**
 * 値クラスのベース
 */
class GameValues<T> {
  /**
   * データ
   */
  private _data: T[];

  /**
   * コンストラクタ
   */
  constructor() {
    this._data = [];
  }

  /**
   * データから設定
   * @param options
   */
  load(data: T[]) {
    this._data = data;
  }

  /**
   * 中断データから設定
   * @param data
   */
  loadSuspend(data: T[]) {
    this.load(data);
  }

  /**
   * データを取得
   */
  get data() {
    return this._data;
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  createSaveObject(): T[] {
    return this._data;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): T[] {
    return this.createSaveObject();
  }

  /**
   * データ数を取得
   */
  get length() {
    return this._data.length;
  }

  /**
   * 値を設定
   * @param id
   * @param value
   */
  setValue(id: number, value: T) {
    this._data[id] = value;
  }

  /**
   * 値を取得
   * @param id
   */
  getValue(id: number) {
    return this._data[id];
  }
}

/**
 * フラグクラス
 * bit-vectorを使ってもいいかも
 */
export class GameFlags extends GameValues<boolean> {
  /**
   * 値を取得
   * @param id
   */
  getValue(id: number) {
    return !!super.getValue(id);
  }
}

/**
 * 変数クラス
 */
export class GameVariables extends GameValues<number> {
  /**
   * 値を取得
   * @param id
   */
  getValue(id: number) {
    return super.getValue(id) ?? 0;
  }
}

/**
 * 率クラス
 */
export class GameRate {
  /**
   * 確率判定
   * @param id
   * @param actor
   * @param target
   * @returns
   */
  static judge(id: number) {
    const [num, max] = this.operation(id);
    return this.judgeFromValue(num, max);
  }

  /**
   * 複数掛け合わせた判定
   * @param ids
   * @returns
   */
  static multiJudge(ids: number[]) {
    const num = ids.reduce((values, current) => {
      const [mul, div] = this.operation(current);
      return (values * mul) / div;
    }, 1);
    return Utils.random() < num;
  }

  /**
   * 値指定で確率判定
   * @param num
   * @param max
   * @returns
   */
  static judgeFromValue(num: number, max: number) {
    return Utils.randomInt(0, max) < num;
  }

  /**
   * 運影響の確率判定
   * @param id
   * @param luckId
   * @param sl
   * @param tl
   * @returns
   */
  static luckBiosJudge(id: number, luckId: number, sl: number, tl: number) {
    const [num, max] = this.operation(id);
    return this.luckBiosJudgeFromValue(num, max, luckId, sl, tl);
  }

  /**
   * 値指定で運影響の確率判定
   * @param num
   * @param max
   * @param luckId
   * @param sl
   * @param tl
   * @returns
   */
  static luckBiosJudgeFromValue(
    num: number,
    max: number,
    luckId: number,
    sl: number,
    tl: number
  ) {
    return this.luckBiosJudgeFromRealNumber(num / max, luckId, sl, tl);
  }

  /**
   * 実数指定で運影響の確率判定
   * @param rNum
   * @param luckId
   * @param sl
   * @param tl
   * @returns
   */
  static luckBiosJudgeFromRealNumber(
    rNum: number,
    luckId: number,
    sl: number,
    tl: number
  ) {
    if (!luckId) {
      return Utils.random() < rNum;
    }
    const bias = GameParamEffect.operation(luckId, rNum, sl, tl);
    // 成功判定を行うのでbiasが逆転する
    return Utils.random() - bias < rNum;
  }

  /**
   * 係数付き確率判定
   * @param id
   * @param coefficient
   * @returns
   */
  static judgeWithCoefficient(id: number, coefficient: number) {
    const [num, max] = this.operation(id);
    return Utils.randomInt(0, max) < num * coefficient;
  }

  /**
   * 確率取得演算
   * 分数形式で返す
   * @param id
   * @param actor
   * @param target
   * @returns
   */
  static operation(id: number) {
    const rate = system.rates[id];
    return [rate.value1, rate.value2];
  }

  /**
   * 値を割合で除算する
   * id = 0の場合値は変化しない
   * @param id
   * @param value
   * @returns
   */
  static div(id: number, value: number, notValue = value) {
    if (id) {
      const [num, max] = this.operation(id);
      return Math.floor((num * value) / max);
    } else {
      return notValue;
    }
  }

  /**
   * 複数除算する
   * @param ids
   * @param value
   * @returns
   */
  static multiDiv(ids: number[], value: number) {
    return ids.reduce((total, current) => {
      return this.div(current, total);
    }, value);
  }

  /**
   * 計算結果を取得する
   * @param id
   * @returns
   */
  static calc(id: number, defaultValue = 1) {
    if (id) {
      const [num, max] = this.operation(id);
      return num / max;
    } else {
      return defaultValue;
    }
  }

  /**
   * 複数計算結果を取得する
   * @param ids
   * @param defaultValue
   * @returns
   */
  static multiCalc(ids: number[], defaultValue = 1) {
    return ids.reduce((total, current) => {
      return this.calc(current, total);
    }, defaultValue);
  }
}

/**
 * 計算クラス
 */
export class GameCalc {
  /**
   * 演算
   * @param id
   * @param actor
   * @param target
   * @returns
   */
  static operation(id: number, actor: GameBattler, target: GameBattler) {
    return this._getCalcValues(id, actor, target);
  }

  /**
   * 計算値を取得する
   * @param index
   * @param actor
   * @param target
   * @returns
   */
  private static _getCalcValues(
    index: number,
    actor: GameBattler,
    target: GameBattler
  ) {
    const methodName = '_calc' + index;
    const result: number =
      typeof this[methodName] === 'function'
        ? this[methodName](actor, target)
        : 0;
    return result;
  }

  /**
   * 味方通常攻撃値
   */
  private static _calc1(actor: GameBattler, target: GameBattler) {
    return Math.max(0, actor.atk - Math.floor(target.def / 2));
  }

  /**
   * 味方会心値
   * @param actor
   * @returns
   */
  private static _calc2(actor: GameBattler) {
    return actor.atk;
  }

  /**
   * 別攻撃計算
   * @param actor
   * @returns
   */
  private static _calc3(actor: GameBattler, target: GameBattler) {
    const baseAtk = actor.atk;
    const targetDef = target.def;
    const baseDamage = baseAtk - Math.floor(targetDef / 2);
    const max = Math.floor(baseAtk / 16) + 1;
    const bias = max - baseDamage;
    return Utils.biasedRandomInt(0, max, bias);
  }

  /**
   * 1ダメージ
   * @param actor
   * @returns
   */
  private static _calc4(actor: GameBattler): number;
  private static _calc4() {
    return 1;
  }

  /**
   * しんくうは
   * こうげき＋すばやさが攻撃力の代わり
   * しゅび＋すばやさが守備力の代わり
   * 通常攻撃に比べ値が大きくなるので除数を大きくしてバランスをとる
   * @param actor
   * @returns
   */
  private static _calc5(actor: GameBattler, target: GameBattler) {
    const baseAtk = actor.atk + actor.agi;
    const targetDef = target.def + target.agi;
    return Math.max(0, baseAtk - targetDef);
  }

  /**
   * 自爆
   * 使用者のHPをそのまま返す
   * @param actor
   * @returns
   */
  private static _calc6(actor: GameBattler) {
    return actor.hp;
  }
}

/**
 * パラメータ効果クラス
 */
export class GameParamEffect {
  /**
   * 適用する
   * @param id
   * @param value
   * @param s
   * @param t
   * @returns
   */
  static operation(id: number, value: number, s: number, t: number) {
    if (!id) {
      return 0;
    }
    const pe = system.paramEffects[id];
    s = GameRate.div(pe.subject, s, 0);
    t = GameRate.div(pe.target, t, 0);
    const degree = this._calcEffectDegree(pe.calcType, s, t);
    const applyValue = this._applyEffect(
      pe.applyType,
      value,
      degree + pe.applyValue
    );
    return GameRate.calc(pe.rateId) * applyValue;
  }

  /**
   * 影響度を計算する
   * @param type
   * @param s
   * @param t
   * @returns
   */
  private static _calcEffectDegree(
    type: EParamEffectCalcType,
    s: number,
    t: number
  ) {
    switch (type) {
      case EParamEffectCalcType.Ave:
        return Math.floor((s + t) / 2);
      case EParamEffectCalcType.Sub:
        return s - t;
      default:
        return s + t;
    }
  }

  /**
   * 効果を適用する
   * @param type
   * @param value
   * @param degree
   * @returns
   */
  private static _applyEffect(
    type: EParamEffectApplyType,
    value: number,
    degree: number
  ) {
    switch (type) {
      case EParamEffectApplyType.Mul:
        return value * degree;
      case EParamEffectApplyType.Degree:
        return degree;
      default:
        return value + degree;
    }
  }
}

/**
 * 行動の種類クラス
 */
export class GameActionType {
  /**
   * 回避情報を取得する
   * @param id
   * @param myself
   * @returns
   */
  static evasionInfo(id: number, myself: boolean): [string, number] {
    return this.getResultInfo(id, GameUtils.getEvasionName(myself));
  }

  /**
   * ダメージなしの情報を取得する
   * @param id
   * @param myself
   * @returns
   */
  static noDamageInfo(id: number, myself: boolean): [string, number] {
    return this.getResultInfo(id, GameUtils.getNoDamageName(myself));
  }

  /**
   * 結果情報を取得する
   * @param id
   * @param name
   * @returns
   */
  static getResultInfo(id: number, name: string): [string, number] {
    if (!id) {
      return ['', 0];
    }
    const info = actionTypes[id];
    const [messageId, animationId] = [
      info.messageIds[name],
      info.animationIds[name],
    ];
    return [GameUtils.getMessage(messageId), animationId];
  }
}

/**
 * 数値リストゲームクラス
 */
export class GameNumberList {
  /**
   * 指定インデックスの要素を取得する
   * @param id
   * @returns
   */
  static get(id: number) {
    return system.numberLists[id];
  }
  /**
   * 0番目と1番目の値のランダム値を取得する
   * @param id
   * @returns
   */
  static randomInt(id: number) {
    if (!id) {
      return 0;
    }
    const [min, max] = system.numberLists[id];
    const value = Utils.randomInt(min, max + 1);
    return value;
  }

  /**
   * 複数を結合する
   * @param ids
   * @returns
   */
  static union(ids: number[]) {
    return ids.flatMap((id) => system.numberLists[id]);
  }

  /**
   * 複数を結合し重複を取り除いて取得する
   * @param ids
   * @returns
   */
  static distinct(ids: number[]) {
    const union = this.union(ids);
    return Array.from(new Set(union));
  }
}

/**
 * 数値マップゲームクラス
 */
export class GameNumberMap {
  /**
   * 指定インデックスの要素を取得する
   * @param id
   * @returns
   */
  static get(id: number) {
    return system.numberMaps[id];
  }

  /**
   * 配列からフィルターする
   * @param ids
   * @param key
   * @returns
   */
  static filterForList(ids: number[], key: number) {
    const values: number[] = [];
    for (const mapId of ids) {
      const item = this.get(mapId);
      if (item.key === key) {
        values.push(item.value);
      }
    }
    return values;
  }

  /**
   * 配列から指定キーの値を検索する
   * @param ids
   * @param key
   * @returns
   */
  static findForList(ids: number[], key: number) {
    for (const mapId of ids) {
      const item = this.get(mapId);
      if (item.key === key) {
        return item.value;
      }
    }
  }
}
