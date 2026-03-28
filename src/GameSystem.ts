import { commonScriptset, system } from './DataStore';
import { Executor } from './Executor';
import Utils from './Utils';

/**
 * 隊員の操作
 */
export const enum EFollowerControl {
  Keep,
  GatherLeader,
  Lineup,
}

/**
 * システムクラスのセーブオブジェクト
 */
export interface SaveObjectGameSystem {
  following: boolean;
  mapScroll: boolean;
  transferScreenOff: number;
  transferScreenOn: number;
  transferFollower: EFollowerControl;
  transferSoundId: number;
  transferScreenXId: number;
  transferScreenYId: number;
  transferVisibility: number;
  fadeOutSpeed: number;
  fadeInSpeed: number;
  battleSpeed: number;
  encounterEffectId: number;
  battleMusicId: number;
  floorDamage: boolean;
  slipDamage: boolean;
  encounter: boolean;
  roomMove: boolean;
}

export type SuspendObjectGameSystem = SaveObjectGameSystem;

/**
 * ゲームシステムクラス
 */
export class GameSystem {
  /**
   * マップのスクリプト実行
   */
  private _mapExecutor: Executor = new Executor(false);
  /**
   * 戦闘のスクリプト実行
   */
  private _battleExecutor: Executor = new Executor(true);
  /**
   * 追尾するか
   */
  private _following: boolean = true;
  /**
   * マップスクロール可能かどうか
   */
  private _mapScroll: boolean = true;
  /**
   * 場所移動画面消去方式
   */
  private _transferScreenOff: number = 0;
  /**
   * 場所移動画面表示方式
   */
  private _transferScreenOn: number = 0;
  /**
   * 場所移動後の隊員の位置をどうするかの値
   */
  private _transferFollower: EFollowerControl = EFollowerControl.Lineup;
  /**
   * 場所移動時サウンド
   */
  private _transferSoundId: number = 0;
  /**
   * 場所移動時にずらす横座標格納スロット
   */
  private _transferScreenXId: number = 0;
  /**
   * 場所移動時にずらす縦座標格納スロット
   */
  private _transferScreenYId: number = 0;
  /**
   * 場所移動時の表示状態
   */
  private _transferVisibility: number = 0;
  /**
   * フェードアウト速度
   */
  private _fadeOutSpeed: number = system.switchingSpeed.fadeOut;
  /**
   * フェードイン速度
   */
  private _fadeInSpeed: number = system.switchingSpeed.fadeIn;
  /**
   * 戦闘速度
   */
  private _battleSpeed: number = system.battleSpeed;
  /**
   * 狙われ率
   */
  private _targetPriorities: number[] = [];
  /**
   * 敵遭遇効果
   */
  private _encounterEffectId: number = system.encounterEffectId;
  /**
   * 戦闘曲
   */
  private _battleMusicId: number = system.musicIds.battle;
  /**
   * 床ダメージが有効かどうか
   */
  private _floorDamage: boolean = true;
  /**
   * 歩行ダメージが有効かどうか
   */
  private _slipDamage: boolean = true;
  /**
   * エンカウントが有効かどうか
   */
  private _encounter: boolean = true;
  /**
   * 部屋移動が有効かどうか
   */
  private _roomMove: boolean = true;

  /**
   * コンストラクタ
   */
  constructor() {
    this._makeTargetPriorities(system.maxPartyMember);
  }

  /**
   * データから読み込み
   * @param data
   */
  load(data: SaveObjectGameSystem) {
    this._following = data.following ?? this._following;
    this._mapScroll = data.mapScroll ?? this._mapScroll;
    this._transferScreenOff = data.transferScreenOff ?? this._transferScreenOff;
    this._transferScreenOn = data.transferScreenOn ?? this._transferScreenOn;
    this._transferFollower = data.transferFollower ?? this._transferFollower;
    this._transferSoundId = data.transferSoundId ?? this._transferSoundId;
    this._transferScreenXId = data.transferScreenXId ?? this._transferScreenXId;
    this._transferScreenYId = data.transferScreenYId ?? this._transferScreenYId;
    this._transferVisibility =
      data.transferVisibility ?? this._transferVisibility;
    this._fadeOutSpeed = data.fadeOutSpeed ?? this._fadeOutSpeed;
    this._fadeInSpeed = data.fadeInSpeed ?? this._fadeInSpeed;
    this._battleSpeed = data.battleSpeed ?? this._battleSpeed;
    this._encounterEffectId = data.encounterEffectId ?? this._encounterEffectId;
    this._battleMusicId = data.battleMusicId ?? this._battleMusicId;
    this._floorDamage = data.floorDamage ?? this._floorDamage;
    this._slipDamage = data.slipDamage ?? this._slipDamage;
    this._encounter = data.encounter ?? this._encounter;
    this._roomMove = data.roomMove ?? this._roomMove;
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  createSaveObject(): SaveObjectGameSystem {
    const object: SaveObjectGameSystem = {
      following: this._following,
      mapScroll: this._mapScroll,
      transferScreenOff: this._transferScreenOff,
      transferScreenOn: this._transferScreenOn,
      transferFollower: this._transferFollower,
      transferSoundId: this._transferSoundId,
      transferScreenXId: this._transferScreenXId,
      transferScreenYId: this._transferScreenYId,
      transferVisibility: this._transferVisibility,
      fadeOutSpeed: this._fadeOutSpeed,
      fadeInSpeed: this._fadeInSpeed,
      battleSpeed: this._battleSpeed,
      encounterEffectId: this._encounterEffectId,
      battleMusicId: this._battleMusicId,
      floorDamage: this._floorDamage,
      slipDamage: this._slipDamage,
      encounter: this._encounter,
      roomMove: this._roomMove,
    };
    return object;
  }

  /**
   * 中断から読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameSystem) {
    this.load(data);
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameSystem {
    return { ...this.createSaveObject() };
  }

  /**
   * 狙われ率を作成する
   * 最大に満たない場合は追加する
   */
  private _makeTargetPriorities(max: number) {
    if (this._targetPriorities.length >= max) {
      return;
    }
    const info = system.targetPriorities;
    for (let i = this._targetPriorities.length; i < max; i++) {
      const value = Utils.upperLimitedElement(info, i);
      this._targetPriorities.push(value);
    }
  }

  /**
   * マップスクリプター
   */
  get mapExecutor() {
    return this._mapExecutor;
  }

  /**
   * 戦闘スクリプター
   */
  get battleExecutor() {
    return this._battleExecutor;
  }

  /**
   * 戦闘速度を取得する
   */
  get battleSpeed() {
    return this._battleSpeed;
  }

  /**
   * 追尾するかを取得する
   */
  get following() {
    return this._following;
  }

  /**
   * マップスクロール
   */
  get mapScroll() {
    return this._mapScroll;
  }

  /**
   * 場所移動時の画面消去方式を設定
   * @param value
   */
  setTransferScreenOff(value: number) {
    this._transferScreenOff = value;
  }

  /**
   * 場所移動時の画面消去方式を取得
   */
  get transferScreenOff() {
    return this._transferScreenOff;
  }

  /**
   * 場所移動時の画面表示方式を設定
   * @param value
   */
  setTransferScreenOn(value: number) {
    this._transferScreenOn = value;
  }

  /**
   * 場所移動時の画面表示方式を取得
   */
  get transferScreenOn() {
    return this._transferScreenOn;
  }

  /**
   * 場所移動時に隊員をどうするかの設定
   * @param value
   */
  setTransferFollower(value: EFollowerControl) {
    this._transferFollower = value;
  }

  /**
   * 場所移動時の隊員
   */
  get transferFollower() {
    return this._transferFollower;
  }

  /**
   * 場所移動時のサウンドIdを設定
   * @param value
   */
  setTransferSoundId(value: number) {
    this._transferSoundId = value;
  }

  /**
   * 場所移動時のサウンドIdを取得
   */
  get transferSoundId() {
    return this._transferSoundId;
  }

  /**
   * 場所移動時の初期横画面座標スロットを設定
   * @param value
   */
  setTransferScreenXId(value: number) {
    this._transferScreenXId = value;
  }

  /**
   * 場所移動時の初期横画面座標スロットを取得
   */
  get transferScreenXId() {
    return this._transferScreenXId;
  }

  /**
   * 場所移動時の初期縦画面座標スロットを設定
   * @param value
   */
  setTransferScreenYId(value: number) {
    this._transferScreenYId = value;
  }

  /**
   * 場所移動時の初期縦画面座標スロットを取得
   */
  get transferScreenYId() {
    return this._transferScreenYId;
  }

  /**
   * 場所移動時の表示表示状態を設定
   * @param value
   */
  setTransferVisibility(value: number) {
    this._transferVisibility = value;
  }

  /**
   * 場所移動時の表示を取得
   */
  get transferVisibility() {
    return this._transferVisibility;
  }

  /**
   * フェードアウト速度を取得
   */
  get fadeOutSpeed() {
    return this._fadeOutSpeed;
  }

  /**
   * フェードイン速度を取得
   */
  get fadeInSpeed() {
    return this._fadeInSpeed;
  }

  /**
   * 自動実行スクリプト
   */
  get autoScripts() {
    return system.autoScriptIds.map((id) => commonScriptset[id]);
  }

  /**
   * 戦闘速度を設定する
   * @param value
   */
  setBattleSpeed(value: number) {
    this._battleSpeed = value;
  }

  /**
   * 追尾するかの設定
   * @param value
   */
  setFollowing(value: boolean) {
    this._following = value;
  }

  /**
   * マップをスクロールするかの設定
   * @param value
   */
  setMapScroll(value: boolean) {
    this._mapScroll = value;
  }

  /**
   * マップスクリプターの更新
   */
  updateMapExecutor() {
    this._mapExecutor.update();
  }

  /**
   * マップスクリプトが動作中か
   * @returns
   */
  runningMapExecutor() {
    return this._mapExecutor.running();
  }

  /**
   * 戦闘スクリプターの更新
   */
  updateBattleExecutor() {
    this._battleExecutor.update();
  }

  /**
   * 狙われ率を取得する
   * @param max
   */
  targetPriorities(max: number) {
    this._makeTargetPriorities(max);
    return this._targetPriorities.slice(0, max);
  }

  /**
   * 味方強襲率を取得する
   */
  get partyRaidRateId() {
    return system.partyRaidRateId;
  }

  /**
   * 味方不意打ち率を取得する
   */
  get partySurpriseRateId() {
    return system.partySurpriseRateId;
  }

  /**
   * 敵強襲率を取得する
   */
  get troopRaidRateId() {
    return system.troopRaidRateId;
  }

  /**
   * 敵不意打ち率を取得する
   */
  get troopSurpriseRateId() {
    return system.troopSurpriseRateId;
  }

  /**
   * 敵戦闘効果を設定する
   * @param value
   */
  setEncounterEffectId(value: number) {
    this._encounterEffectId = value;
  }

  /**
   * 敵遭遇効果を取得する
   */
  get encounterEffectId() {
    return this._encounterEffectId;
  }

  /**
   * 戦闘音楽を設定する
   */
  setBattleMusicId(value: number) {
    this._battleMusicId = value;
  }

  /**
   * 戦闘音楽を取得する
   */
  get battleMusicId() {
    return this._battleMusicId;
  }

  /**
   * 床ダメージの有効無効を設定する
   * @param value
   */
  setFloorDamage(value: boolean) {
    this._floorDamage = value;
  }

  /**
   * 床ダメージの有効無効を取得する
   */
  get floorDamage() {
    return this._floorDamage;
  }

  /**
   * 歩行ダメージの有効無効を設定する
   * @param value
   */
  setSlipDamage(value: boolean) {
    this._slipDamage = value;
  }

  /**
   * 歩行ダメージの有効無効を取得する
   */
  get slipDamage() {
    return this._slipDamage;
  }

  /**
   * エンカウントの有効無効を設定する
   * @param value
   */
  setEncounter(value: boolean) {
    this._encounter = value;
  }

  /**
   * エンカウントの有効無効を取得する
   */
  get encounter() {
    return this._encounter;
  }

  /**
   * 部屋移動の有効無効を設定する
   * @param value
   */
  setRoomMove(value: boolean) {
    this._roomMove = value;
  }

  /**
   * 部屋移動の有効無効を取得する
   */
  get roomMove() {
    return this._roomMove;
  }
}
