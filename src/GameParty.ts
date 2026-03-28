import { gameMembers, gameSystem, gameTemp, system } from './DataStore';
import { BattleConditionParam } from './DataTypes';
import { setVariable } from './DataUtils';
import {
  ActionCommandOptions,
  EActionKind,
  GameBattleAction,
} from './GameAction';
import { GameBattler } from './GameBattler';
import { GameItem } from './GameItem';
import { GameMember } from './GameMember';
import { EUnitTurnType, GameUnit } from './GameUnit';
import { GameUtils, GameRate } from './GameUtils';
import Utils from './Utils';

/**
 * 戦闘コマンド
 */
interface BattleCommand {
  preemptive: EUnitTurnType;
  party: number;
  members: Array<{
    index: number;
    options: ActionCommandOptions;
  }>;
}

/**
 * パーティクラスのセーブオブジェクト
 */
export interface SaveObjectGameParty {
  gameMemberIds: number[];
  gold: number;
  addressIds: number[];
  npcIds: number[];
  storedItems: StoredItem[];
}

/**
 * パーティクラスの中断オブジェクト
 */
export interface SuspendObjectGameParty extends SaveObjectGameParty {
  slipSteps: number;
  encounterAdjusts: Array<[number, EncounterAdjust]>;
  floorDamageAdjusts: Array<[number, FloorDamageAdjust]>;
}

/**
 * エンカウント調整オブジェクト
 */
export interface EncounterAdjust {
  rateId: number;
  diffLevel: number;
  preemptiveIds: number[];
  steps: number;
  scriptId: number;
}

interface StoredItem {
  id: number;
  count: number;
}

const enum EFloorDamageState {
  None,
  Start,
  Standby,
}

/**
 * 床ダメージ調整オブジェクト
 */
export interface FloorDamageAdjust {
  rateId: number;
  state: EFloorDamageState;
}

/**
 * パーティクラス
 */
export class GameParty extends GameUnit {
  /**
   * メンバー配列
   */
  private _members: GameMember[] = [];
  /**
   * ゴールド
   */
  private _gold: number = 0;
  /**
   * 行先リスト
   */
  private _addressIds: number[] = [];
  /**
   * 歩行ダメージカウント
   */
  private _slipSteps: number = 0;
  /**
   * NPCメンバー配列
   */
  private _npcIds: number[] = [];
  /**
   * 貯蔵道具
   */
  private _storedItems: StoredItem[] = [];
  /**
   * 戦闘コマンド
   */
  private _battleCommand: BattleCommand = {
    preemptive: EUnitTurnType.Normal,
    party: 0,
    members: [],
  };
  /**
   * エンカウント調整
   */
  private _encounterAdjusts: Map<number, EncounterAdjust> = new Map();
  /**
   * 床ダメージ調整
   */
  private _floorDamageAdjusts: Map<number, FloorDamageAdjust> = new Map();

  /**
   * コンストラクタ
   */
  constructor() {
    super();
  }

  /**
   * データから読み込み
   * @param data
   */
  load(data: SaveObjectGameParty) {
    if (data.gameMemberIds) {
      this._members = data.gameMemberIds.map((id) => gameMembers.getMember(id));
    }
    this._gold = data.gold ?? this._gold;
    this._addressIds = data.addressIds ?? this._addressIds;
    this._npcIds = data.npcIds ?? this._npcIds;
    this._storedItems = data.storedItems ?? this._storedItems;
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  createSaveObject(): SaveObjectGameParty {
    return {
      gameMemberIds: this._members.map((member) => member.id),
      gold: this._gold,
      addressIds: this._addressIds,
      npcIds: this._npcIds,
      storedItems: this._storedItems,
    };
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameParty) {
    this.load(data);
    this._slipSteps = data.slipSteps ?? this._slipSteps;
    if (data.encounterAdjusts) {
      this._encounterAdjusts = new Map(data.encounterAdjusts);
    }
    if (data.floorDamageAdjusts) {
      this._floorDamageAdjusts = new Map(data.floorDamageAdjusts);
    }
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameParty {
    return {
      ...this.createSaveObject(),
      slipSteps: this._slipSteps,
      encounterAdjusts: [...this._encounterAdjusts],
      floorDamageAdjusts: [...this._floorDamageAdjusts],
    };
  }

  /**
   * メンバーを取得
   */
  get members() {
    return this._members;
  }

  /**
   * 指定のインデックスのメンバーを取得
   * @param index
   * @returns
   */
  getMember(index: number) {
    return this._members[index];
  }

  /**
   * メンバー数を取得
   */
  get memberLength() {
    return this.members.length;
  }

  /**
   * 道具選択可のメンバーを取得
   */
  get itemMembers() {
    return this.members.filter((member) => member.itemSelectable);
  }

  /**
   * 生存メンバー
   */
  get liveMembers() {
    return this._members.filter((member) => {
      return member.live;
    });
  }

  /**
   * 生存メンバー数
   */
  get liveMemberLength() {
    return this._members.reduce((total, member) => {
      total += member.live ? 1 : 0;
      return total;
    }, 0);
  }

  /**
   * 単独行動可能生存メンバー数
   */
  get canSoloLiveMemberLength() {
    return this._filterLiveAndCanSolo().length;
  }

  /**
   * ばたんメンバー
   */
  get downMembers() {
    return this._members.filter((member) => {
      return member.down;
    });
  }

  /**
   * NPCメンバーId
   */
  get npcIds() {
    return this._npcIds;
  }

  /**
   * NPCメンバー
   */
  get npcs() {
    return this._npcIds.map((npcId) => {
      return system.startNpcs[npcId];
    });
  }

  /**
   * NPC数を取得
   */
  get npcLength() {
    return this._npcIds.length;
  }

  /**
   * 指定位置のNPCを取得
   * @param index
   * @returns
   */
  getNpc(order: number) {
    return system.startNpcs[this.npcIds[order]];
  }

  /**
   * 隊員数を取得
   */
  get followerLength() {
    const length = this.members.reduce((total, current) => {
      if (!current.hidden) {
        total++;
      }
      return total;
    }, 0);
    return length + this.npcLength;
    //return this.memberLength + this.npcLength;
  }

  /**
   * 生存隊員数を取得
   */
  get liveFollowerLength() {
    return this.liveMemberLength + this.npcLength;
  }

  /**
   * 最大パーティ人数
   */
  get max() {
    return system.maxPartyMember;
  }

  /**
   * パーティに空きがあるか
   */
  get empty() {
    return this._members.length < this.max;
  }

  /**
   * 先頭メンバーを取得
   */
  get leader() {
    return this._members[0];
  }

  /**
   * 表示先頭メンバー
   */
  get dispLeader() {
    const live = this._members.find((member) => {
      return member.live;
    });
    if (live) {
      return live;
    }
    return this._members.find((member) => {
      return member.down;
    });
  }

  /**
   * ゴールド
   */
  get gold() {
    return this._gold;
  }

  /**
   * 行先オブジェクトを取得
   */
  get addresses() {
    // 0:通常 1:デバッグ
    const index = gameTemp.testPlay ? 1 : 0;
    const list = GameUtils.getAddressIds(index);
    return list
      .filter((id) => this._addressIds.includes(id))
      .map((id) => system.warpPlaces[id]);
  }

  /**
   * 歩行ダメージカウントを取得
   */
  get slipSteps() {
    return this._slipSteps;
  }

  /**
   * 歩行ダメージカウントを加算
   */
  incSlipSteps() {
    this._slipSteps += 1;
  }

  /**
   * スリップダメージカウントをリセットする
   */
  resetSlipSteps() {
    this._slipSteps = Utils.randomInt(0, 12);
  }

  /**
   * パーティのメンバーが生きているかを取得
   */
  get lives() {
    return this.members.map((member) => member.live);
  }

  /**
   * 貯蔵道具を取得する
   */
  get storedItems() {
    return this._storedItems;
  }

  /**
   * 仲間がいるか
   */
  hasFollower() {
    return this._members.length > 1;
  }

  /**
   * 指定の道具所持数を取得
   * @param itemId
   */
  numItems(itemId: number) {
    return this._members.reduce((count, member) => {
      return count + member.numItems(itemId);
    }, 0);
  }

  /**
   * 預り所を含む指定の道具所持数を取得
   * @param itemId
   * @returns
   */
  numItemsIncludesStored(itemId: number) {
    const storedItem = this._storedItems.find((item) => item.id === itemId);
    return this.numItems(itemId) + (storedItem?.count ?? 0);
  }

  /**
   * 指定の状態にだれかなっているかを取得
   * @param stateId
   * @returns
   */
  hasState(stateId: number) {
    return this._members.some((member) => member.stateAlready(stateId));
  }

  /**
   * 並び順変更
   * @param orders 新しい並び順
   */
  changeOrder(orders: GameMember[]) {
    // サイズが違ったら不正
    if (orders.length !== this._members.length) {
      return false;
    }
    this._members = orders;
    this._resetMemberIndex();
    return true;
  }

  /**
   * メンバーインデックスを再設定する
   */
  private _resetMemberIndex() {
    for (let i = 0; i < this.memberLength; i++) {
      this._members[i].setIndex(i);
    }
  }

  /**
   * 指定のメンバーのインデックスを検索する
   * @param member
   * @returns
   */
  findIndex(member: GameMember) {
    return this.members.findIndex((value) => value === member);
  }

  /**
   * ゴールド取得
   * @param value
   */
  gainGold(value: number) {
    this._gold = Utils.clamp(this._gold + value, 0, system.maxGold);
  }

  /**
   * ゴールド消費
   * @param value
   */
  loseGold(value: number) {
    this.gainGold(-value);
  }

  /**
   * だれかがうごけるかどうか
   */
  get movable() {
    return this._members.some((member) => member.movable);
  }

  /**
   * パーティコマンドを設定する
   * @param value
   */
  setBattlePartyCommand(value: number) {
    this._battleCommand.party = value;
  }

  /**
   * メンバーコマンドを再設定する
   */
  resetMemberCommand() {
    this._battleCommand.members = this.members.flatMap((member, index) => {
      return Array.from({ length: member.actionTimes }).map(() => {
        return {
          index,
          options: {
            kind: EActionKind.Unset,
            itemIndex: 0,
            targetGroup: -1,
            targetIndex: -1,
          },
        };
      });
    });
  }

  /**
   * 先制タイプを設定する
   * @param value
   */
  setPreemptiveType(value: EUnitTurnType) {
    this._battleCommand.preemptive = value;
  }

  /**
   * 指定インデックスの戦闘コマンドが存在しているか
   * @param index
   * @returns
   */
  existBattleMemberCommand(index: number) {
    return !!this.getBattleMemberCommand(index);
  }

  /**
   * パーティコマンドを取得する
   * @returns
   */
  getBattlePartyCommand() {
    return this._battleCommand.party;
  }

  /**
   * 指定インデックスの戦闘コマンドを取得する
   * @param index
   * @returns
   */
  getBattleMemberCommand(index: number) {
    return this._battleCommand.members[index];
  }

  /**
   * 先制タイプを取得する
   * @param value
   */
  getPreemptiveType() {
    return this._battleCommand.preemptive;
  }

  /**
   * 行動を作成する
   */
  makeActions() {
    const actions = Array.from({ length: this.memberLength }).map(
      (_v, index) => {
        return new GameBattleAction(this.members[index]);
      }
    );
    // actionにコマンドを追加し
    // コマンドがあるactionだけを抽出する
    return this._battleCommand.members
      .reduce((actions, memberCommand) => {
        const action = actions[memberCommand.index];
        action.makeInput(memberCommand.options);
        return actions;
      }, actions)
      .filter((action) => !action.empty);
  }

  /**
   * 逃げるに失敗した場合の行動を作成する
   */
  makeStopEscapeActions() {
    const skillId = system.stopEscapeSkillId;
    return this.members.map((member) => {
      const action = new GameBattleAction(member);
      action.makeInput({ kind: EActionKind.Skill, itemIndex: skillId });
      return action;
    });
  }

  /**
   * 初期メンバー登録
   */
  setupStartingMembers() {
    for (let i = 0; i < system.startMembers.length; i++) {
      const id = gameMembers.add(system.startMembers[i]);
      if (id < 0) {
        continue;
      }
      // 作成インデックスを変数に格納
      setVariable(system.startMemberId + i, id);
      // 初期パーティ最大数まで追加
      if (i < system.startMaxParty) {
        const member = gameMembers.getMember(id);
        this._members.push(member);
      }
    }
    // NPC
    for (let i = 0; i < system.startNpcs.length; i++) {
      setVariable(system.startNpcId + i, i);
      // 初期パーティ最大数まで追加
      if (i < system.startMaxNpc) {
        this._npcIds.push(i);
      }
    }
    this._resetMemberIndex();
  }

  /**
   * パーティに加える
   * @param id
   * @returns
   */
  addMember(id: number) {
    const member = gameMembers.getMember(id);
    if (!member) {
      return false;
    }
    if (!this.empty) {
      return false;
    }
    if (this._members.includes(member)) {
      return false;
    }
    this._members.push(member);
    this._resetMemberIndex();

    return true;
  }

  /**
   * パーティから外す
   * @param id
   * @returns
   */
  removeMember(id: number) {
    const member = gameMembers.getMember(id);
    if (!member) {
      return false;
    }
    const index = this._members.findIndex((value) => value === member);
    if (index < 0) {
      return false;
    }
    this._members.splice(index, 1);
    this._resetMemberIndex();

    return true;
  }

  /**
   * NPCをパーティに加える
   * @param id
   */
  addNpc(id: number) {
    if (id >= system.startNpcs.length) {
      return false;
    }
    if (this._npcIds.includes(id)) {
      return false;
    }
    this._npcIds.push(id);

    return true;
  }

  /**
   * NPCをパーティから外す
   * @param id
   * @returns
   */
  removeNpc(id: number) {
    if (id >= system.startNpcs.length) {
      return false;
    }
    const index = this._npcIds.findIndex((value) => value === id);
    if (index < 0) {
      return false;
    }
    this._npcIds.splice(index, 1);

    return true;
  }

  /**
   * 行先を追加する
   * 重複不可
   * @param addressId
   */
  addAddressId(addressId: number) {
    if (this._addressIds.includes(addressId)) {
      return;
    }
    this._addressIds.push(addressId);
  }

  /**
   * 行先を除去する
   * @param addressId
   */
  removeAddressId(addressId: number) {
    const index = this._addressIds.indexOf(addressId);
    if (index < 0) {
      return;
    }
    this._addressIds.splice(index, 1);
  }

  /**
   * 道具を持つ空きがあるメンバーを返す
   * 道具選択不可メンバーは省く
   */
  getItemSpaceMember() {
    return this.itemMembers.find((member) => member.itemSpace());
  }

  /**
   * 指定の道具Idを消去する
   * 道具選択不可メンバーは省く
   * @param itemId
   * @returns
   */
  eraseItemByItemId(itemId: number) {
    for (const member of this.itemMembers) {
      if (member.eraseItemByItemId(itemId)) {
        return member;
      }
    }
    return;
  }

  /**
   * 指定の要因を取得する
   * @param group
   * @param index
   * @returns
   */
  override get(group: number, index: number): GameBattler | undefined {
    return this._sameGroup(group) ? this.members[index] : undefined;
  }

  /**
   * グループメンバーをグループインデックスから取得する
   * @param index
   * @param indices
   * @returns
   */
  override getGroupMembers(index: number, indices?: number[]): GameBattler[] {
    if (this._sameGroup(index)) {
      return indices ? this._getMembersByIndices(indices) : this.members;
    } else {
      return [];
    }
  }

  /**
   * メンバーをインデックスから取得する
   * @param indices
   */
  private _getMembersByIndices(indices: number[]) {
    return indices.map((index) => this._members[index]);
  }

  /**
   * メンバーインデックスを取得する
   */
  private _getMemberIndices() {
    return Utils.toIndices(this.members);
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
    if (!this._sameGroup(group)) {
      return [];
    }
    return this._getMemberIndices().filter((index) =>
      filterFn(this._members[index])
    );
  }

  /**
   * 同じグループかどうか
   * @param group
   * @returns
   */
  private _sameGroup(group: number) {
    return group === 0;
  }

  /**
   * メンバーをインデックス群から取得する
   * @param indices
   * @returns
   */
  getMembersFromIndices(indices: number[]) {
    return indices.map((index) => this._members[index]);
  }

  /**
   * 戦闘継続可能メンバーがいるか
   * @returns
   */
  existContinueFighting() {
    // 単独行動可能生存メンバーがいれば可能
    return this.canSoloLiveMemberLength > 0;
  }

  /**
   * ターン終了後の処理
   */
  turnEnd() {
    //
  }

  /**
   * 戦闘終了後の処理
   */
  battleEnd() {
    this.members.forEach((member) => {
      member.battleEnd();
    });
  }

  /**
   * 生存メンバーからランダムで対象を取得する
   */
  randomTarget() {
    const liveMembers = this.liveMembers;
    const priorities = gameSystem.targetPriorities(liveMembers.length);
    const index = Utils.roulette(priorities);
    return liveMembers[index];
  }

  /**
   * 初回攻撃タイプを取得
   */
  firstAttack(rateIds1: number[], rateIds2: number[]) {
    rateIds1.push(gameSystem.partyRaidRateId);
    if (GameRate.multiJudge(rateIds1)) {
      return EUnitTurnType.PartyRaid;
    }
    rateIds2.push(gameSystem.partySurpriseRateId);
    if (GameRate.multiJudge(rateIds2)) {
      return EUnitTurnType.PartySurprise;
    }
    return EUnitTurnType.Normal;
  }

  /**
   * 先頭メンバー名を取得する
   */
  getLeaderName() {
    return this.dispLeader?.name ?? '';
  }

  /**
   * 群れの呼び名を取得する
   */
  getUnitCallName() {
    return GameUnit.toPartyCallName(this.getLeaderName(), this.memberLength);
  }

  /**
   * 単独行動可能メンバーだけの呼び名を取得する
   * @returns
   */
  getUnitCallNameCanSolo() {
    const solos = this._members.filter((member) => member.canSolo);
    const live = solos.find((member) => member.live);
    if (solos.length === 0) {
      return '';
    }
    if (live) {
      return GameUnit.toPartyCallName(live.name, solos.length);
    } else {
      return GameUnit.toPartyCallName(solos[0].name, solos.length);
    }
  }

  /**
   * 生存メンバーと単独行動可能メンバーでフィルターする
   * @returns
   */
  private _filterLiveAndCanSolo() {
    return this._members.filter((member) => {
      return member.live && member.canSolo;
    });
  }

  /**
   * 逃走可能率を取得する
   * 基準が128から逃走回数により増加する
   * 4回以上試行だと256を超え必ず分母を超える
   * レベル差が5以上のときも必ず分母を超える
   * @param troopLv
   * @param trials
   */
  escapeRate(troopLv: number, trials: number) {
    const base = Math.floor(128 * (1 + trials / 3));
    const deficit = 256 - base;
    const partyLv = this.getLv();
    const sub = Math.max(partyLv - troopLv, 0);
    const num = base + Math.floor((deficit * sub) / 10);
    return [num, 256];
  }

  /**
   * パーティレベルを取得する
   * 先頭表示メンバーのレベル
   */
  override getLv() {
    return this.dispLeader?.lv ?? 0;
  }

  /**
   * 行動可能か
   * @param type
   * @returns
   */
  Actionable(type: EUnitTurnType) {
    return ![
      EUnitTurnType.TroopRaid,
      EUnitTurnType.TroopSurprise,
      EUnitTurnType.TroopStopEscape,
    ].includes(type);
  }

  /**
   * 総HPを取得する
   * @returns
   */
  override getTotalHp(): number {
    return this.members.reduce((subTotal, member) => {
      return subTotal + (member.leave ? 0 : member.hp);
    }, 0);
  }

  /**
   * 総最大を取得する
   * @returns
   */
  override getTotalMaxHp(): number {
    return this.members.reduce((subTotal, member) => {
      return subTotal + member.mhp;
    }, 0);
  }

  /**
   * 味方条件
   * @param params
   * @returns
   */
  override battlerCondition(params: BattleConditionParam): boolean {
    const target = this.members.find(
      (member) => member.memberId === params.target
    );

    return target?.meetHpCondition(params) ?? false;
  }

  /**
   * エンカウント調整を設定する
   * @param n
   * @param adjust
   */
  setEncounterAdjust(n: number, adjust: EncounterAdjust) {
    this._encounterAdjusts.set(n, adjust);
  }

  /**
   * エンカウント調整を全削除する
   */
  clearAllEncounterAdjusts() {
    this._encounterAdjusts.clear();
  }

  /**
   * エンカウント回避かどうか
   * @param ids
   * @param troopLv
   * @returns
   */
  evasionEncounter(ids: number[], troopLv: number) {
    for (const id of ids) {
      const adjust = this._encounterAdjusts.get(id);
      if (adjust?.rateId === -1) {
        if (this.getLv() + adjust.diffLevel >= troopLv) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 指定のId配列のエンカウント調整を取得する
   * @param ids
   * @returns
   */
  getEncounterAdjustRates(ids: number[]) {
    return ids
      .map((id) => this._encounterAdjusts.get(id)?.rateId ?? 0)
      .filter((rateId) => rateId > 0);
  }

  /**
   * 指定の先制タイプ調整を取得する
   * @param type
   * @returns
   */
  getEncounterAdjustPreemptiveRates(ids: number[], type: number) {
    return ids
      .map((id) => this._encounterAdjusts.get(id)?.preemptiveIds[type] ?? 0)
      .filter((rateId) => rateId > 0);
  }

  /**
   * 指定のId配列のエンカウント調整の歩数を減らす
   * @param ids
   */
  decEncounterAdjustsCount(ids: number[]) {
    ids.forEach((id) => this.decEncounterAdjustCount(id));
  }

  /**
   * 指定Idのエンカウント調整の歩数を減らす
   * @param id
   * @returns 削除時に実行するスクリプトId
   */
  decEncounterAdjustCount(id: number) {
    const adjust = this._encounterAdjusts.get(id);
    if (adjust && adjust.steps > 0) {
      adjust.steps--;
    }
  }

  /**
   * 終了したエンカウント調整を削除する
   * @param id
   * @returns
   */
  deleteFinishedEncounterAdjust(id: number) {
    const adjust = this._encounterAdjusts.get(id);
    if (adjust && adjust.steps <= 0) {
      this._encounterAdjusts.delete(id);
      return adjust.scriptId;
    } else {
      return 0;
    }
  }

  /**
   * 床ダメージ調整を設定する
   * @param terrainId
   * @param rateId
   */
  setFloorDamageAdjust(terrainId: number, rateId: number) {
    this._floorDamageAdjusts.set(terrainId, {
      rateId: rateId,
      state: EFloorDamageState.Standby,
    });
  }

  /**
   * 床ダメージ調整の割合を取得する
   * @param terrainId
   * @returns
   */
  getFloorDamageAdjustRate(terrainId: number) {
    const adjust = this._floorDamageAdjusts.get(terrainId);
    if (!adjust) {
      return 0;
    }
    return adjust.state > EFloorDamageState.None ? adjust.rateId : 0;
  }

  /**
   * 床ダメージ調整を更新する
   * @param terrainIds
   */
  updateFloorDamageAdjusts(terrainIds: number[]) {
    for (const [key, value] of this._floorDamageAdjusts.entries()) {
      if (terrainIds.includes(key)) {
        if (value.state === EFloorDamageState.Standby) {
          value.state = EFloorDamageState.Start;
        }
      } else {
        if (value.state === EFloorDamageState.Start) {
          value.state = EFloorDamageState.None;
        }
      }
    }
  }

  /**
   * 床ダメージ調整を全て削除する
   */
  clearFloorDamageAdjusts() {
    this._floorDamageAdjusts.clear();
  }

  /**
   * 道具を捨てる
   * @param member
   * @param item
   */
  discardItem(member: GameMember, item: GameItem) {
    if (member.eraseItem(item)) {
      this.addStoreItem(item.id);
    }
  }

  /**
   * 貯蔵道具の空きがあるか確認する
   * @param itemId
   * @returns
   */
  checkStoreItemSpace(itemId: number) {
    const storedItem = this._storedItems.find((item) => item.id === itemId);
    return !storedItem || storedItem.count < 99;
  }

  /**
   * 貯蔵道具を追加する
   * @param itemId
   */
  addStoreItem(itemId: number) {
    const storedItem = this._storedItems.find((item) => item.id === itemId);
    if (storedItem && storedItem.count < 99) {
      storedItem.count++;
      return true;
    } else {
      this._storedItems.push({ id: itemId, count: 1 });
      return false;
    }
  }

  /**
   * 貯蔵道具を削除する
   * @param itemId
   */
  removeStoreItem(itemId: number) {
    const index = this._storedItems.findIndex((item) => item.id === itemId);
    if (index < 0) {
      return false;
    }
    const storedItem = this._storedItems[index];
    if (storedItem && storedItem.count > 0) {
      storedItem.count--;
      if (storedItem.count === 0) {
        this._storedItems.splice(index, 1);
      }
      return true;
    }
    return false;
  }
}
