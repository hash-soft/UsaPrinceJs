import {
  gameAnimations,
  gameMapSight,
  gameParty,
  gameSystem,
  gameTemp,
  system,
  terrains,
} from './DataStore';
import { EDirection, GameCharacter } from './GameCharacter';
import { EMap } from './GameConfig';
import { GamePerson, SuspendObjectGamePerson } from './GameEvent';
import { GameMember } from './GameMember';
import { GameRate } from './GameUtils';
import { Input } from './Input';

/**
 * 隊員クラスの中断オブジェクト
 */
export interface SuspendObjectGameFollower extends SuspendObjectGamePerson {
  memberIndex: number;
  npcId: number;
  offsetPriority: number;
  inputList: number[][];
}

export class GameFollower extends GamePerson {
  /**
   * パーティメンバーインデックス
   */
  private _memberIndex: number = -1;
  /**
   * npcのId
   */
  private _npcId: number = -1;
  /**
   * 表示優先度のオフセット
   */
  private _offsetPriority: number = 0;
  /**
   * 追尾パラメータ
   */
  private _inputList: number[][] = [];
  /**
   * 歩行後
   */
  private _walked: boolean = false;
  /**
   * 追尾する隊員
   */
  private _follower: GameFollower | null = null;

  /**
   * コンストラクタ
   * @param objectId
   */
  constructor(objectId: number) {
    super(objectId, -1, -1);
  }

  /**
   * 再設定
   */
  override reset(): void {
    super.reset();
    this._memberIndex = -1;
    this._npcId = -1;
    this._offsetPriority = 0;
    this._inputList = [];
    this._walked = false;
    this._follower = null;
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameFollower) {
    super.loadSuspend(data);
    this._memberIndex = data.memberIndex ?? this._memberIndex;
    this._npcId = data.npcId ?? this._npcId;
    this._offsetPriority = data.offsetPriority ?? this._offsetPriority;
    this._inputList = data.inputList ?? this._inputList;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameFollower {
    return {
      ...super.createSuspendObject(),
      memberIndex: this._memberIndex,
      npcId: this._npcId,
      offsetPriority: this._offsetPriority,
      inputList: this._inputList,
    };
  }

  /**
   * 画面上のZ座標を取得
   */
  override get screenZ() {
    return super.screenZ + this._offsetPriority;
  }

  /**
   * 強制移動中かどうか
   * 追尾中なら先頭者のものとなる
   */
  override get forceMoving() {
    if (gameSystem.following) {
      return (
        gameTemp.leaderMoveRouteOverride ||
        gameSystem.mapExecutor.gatheringWaiting
      );
    } else {
      return super.forceMoving || gameSystem.mapExecutor.gatheringWaiting;
    }
  }

  /**
   * 存在するプレイヤーか
   */
  get exist() {
    return this._memberIndex >= 0 || this._npcId >= 0;
  }

  /**
   * 入力リストをクリア
   */
  clearInputList() {
    this._inputList = [];
  }

  /**
   * 歩行後をクリアする
   */
  clearWalked() {
    this._walked = false;
  }

  /**
   * メンバーインデックスを設定する
   * @param value
   */
  setMemberIndex(value: number) {
    this._memberIndex = value;
    this._npcId = -1;
  }

  /**
   * NPCインデックスを設定する
   * @param value
   */
  setNpcId(value: number) {
    this._memberIndex = -1;
    this._npcId = value;
  }

  /**
   * 表示優先度オフセットを設定する
   * @param value
   */
  setOffsetPriority(value: number) {
    this._offsetPriority = value;
  }

  /**
   * 後ろの隊員を設定する
   * @param follower
   */
  setFollower(follower: GameFollower | null) {
    this._follower = follower;
  }

  /**
   * メンバーオブジェクトを取得する
   * @returns
   */
  private _getMember() {
    if (this._memberIndex < 0) {
      return;
    }
    return gameParty.members[this._memberIndex];
  }

  /**
   * NPCオブジェクトを取得する
   * @returns
   */
  private _getNpc() {
    if (this._npcId < 0) {
      return;
    }
    return gameParty.npcs[this._npcId];
  }

  /**
   * 移動を停止する
   */
  stopMoving() {
    this._setJumpParameters(0, 0, 0, 0);
  }

  /**
   * 全隊員に処理を行う
   * 関数実行結果がfalseの場合、ループを中断する
   * @param fn
   */
  protected _eachFollowers(fn: (follower: GameFollower) => boolean) {
    for (
      let follower = this._follower;
      follower !== null;
      follower = follower._follower
    ) {
      if (!fn(follower)) {
        break;
      }
    }
  }

  /**
   * 全隊員が条件を満たしているかどうか
   * @param fn
   * @returns
   */
  protected _everyFollowers<T>(fn: (follower: GameFollower) => T) {
    for (
      let follower = this._follower;
      follower !== null;
      follower = follower._follower
    ) {
      if (!fn(follower)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 初期位置設定のオーバーライド
   * イベントの設定はないのでなにもしない
   */
  protected override _setInitialPosition() {}

  /**
   * 移動地点までの加算をする
   * 1.隊列移動中の場合移動記録を後ろに渡す
   * 2.隊列移動中の場合移動記録を更新する
   * 3.基底の処理を行う
   * @param addX
   * @param addY
   */
  protected override _addMovePoint(addX: number, addY: number) {
    if (gameSystem.following) {
      this._recordFollowCommand(addX, addY);
    }
    super._addMovePoint(addX, addY);
  }

  /**
   * 隊員に実行させるコマンドを記録する
   * @param addX
   * @param addY
   * @returns
   */
  private _recordFollowCommand(addX: number, addY: number) {
    if (!this._follower) {
      return;
    }

    if (this.jumping) {
      if (this._follower.jumping || this._follower._inputList.length > 0) {
        this._follower._inputList.push([
          addX,
          addY,
          ...this._getJumpParameters(),
        ]);
      } else {
        if (!this._recordFollowNormal(this._follower)) {
          this._follower._inputList.push([EMap.RealScale / this.realMoveSpeed]);
        }
        this._follower._inputList.push([
          addX,
          addY,
          ...this._getJumpParameters(),
        ]);
      }
    } else {
      if (this._follower._inputList.length === 0) {
        this._recordFollowNormal(this._follower);
      }
    }
  }

  /**
   * 指定の隊員に通常移動コマンドを記録する
   * @param follower
   * @returns
   */
  protected _recordFollowNormal(follower: GameFollower) {
    const sx = follower.rangeX(this.x);
    const sy = follower.rangeY(this.y);
    if (sx === 0 && sy === 0) {
      return false;
    }
    follower._inputList.push([this.x, this.y]);
    return true;
  }

  /**
   * 更新
   * 隊員の同期を行う
   */
  override update(): void {
    this._walked = false;
    super.update();
  }

  /**
   * 停止中の更新
   */
  override updateStop() {
    super.updateStop();
    if (this._allowInputMove()) {
      this._inputMove();
    }
  }

  /**
   * 移動を更新する
   * 先頭の入力をマネする
   * @returns
   */
  protected _inputMove() {
    if (!gameSystem.following) {
      return;
    }

    if (this._inputList.length < 1) {
      return;
    }
    const input = this._inputList[0];
    const length = input.length;
    if (length > 2) {
      this._jumpMove();
    } else if (length > 1) {
      this._normalMove();
    } else {
      input[0]--;
      if (input[0] <= 0) {
        this._inputList.shift();
      }
    }
  }

  /**
   * 通常移動
   */
  private _normalMove() {
    const input = this._inputList.shift() as number[];
    const [x, y] = input;
    const addX = this.rangeX(x);
    const addY = this.rangeY(y);
    this._addMovePoint(addX, addY);
    this._turnAwayMoveDirection(addX, addY);
  }

  /**
   * ジャンプ移動
   */
  private _jumpMove() {
    const params = this._inputList.shift() as number[];
    this._setJumpParameters(params[2], params[3], params[4], params[5]);
    this._addMovePoint(params[0], params[1]);
    this.changeDirection(params[5]);
  }

  /**
   * 移動入力を許すか
   * @returns
   */
  private _allowInputMove() {
    return !this.isMoving() && (this.canMove() || this._towed());
  }

  /**
   * 牽引されているか
   * @returns
   */
  protected _towed() {
    return (
      gameTemp.leaderMoveRouteOverride ||
      gameSystem.mapExecutor.gatheringWaiting
    );
  }

  /**
   * マップの通行可能判定
   * 乗り物に乗っている間は無条件で可能
   * @param x
   * @param y
   * @param newX
   * @param newY
   * @param dir
   * @returns
   */
  protected override _mapPassable(
    x: number,
    y: number,
    newX: number,
    newY: number,
    dir: number
  ) {
    return (
      gameMapSight.driving ||
      gameMapSight.contactVehicle(x, y) ||
      super._mapPassable(x, y, newX, newY, dir)
    );
  }

  /**
   * 一新する
   */
  override refresh(): void {
    const [imageId, imageIndex] = this._getImageInfo();
    super.setImage(imageId, imageIndex);
  }

  /**
   * 画像情報を取得
   */
  private _getImageInfo() {
    const member = this._getMember();
    if (member) {
      return this._getMemberImageInfo(member);
    }
    const npc = this._getNpc();
    if (npc) {
      return this._getNpcImageInfo(...npc);
    }

    return [0, 0];
  }

  /**
   * メンバーの画像情報を取得
   * @param member
   * @returns
   */
  private _getMemberImageInfo(member: GameMember) {
    const down = member.hasDownVisual();
    if (down) {
      return [member.downId, member.downIndex];
    } else {
      return [member.imageId, member.imageIndex];
    }
  }

  /**
   * NPCの画像情報を取得
   * @param charsetId
   * @param index
   * @returns
   */
  private _getNpcImageInfo(charsetId: number, index: number) {
    return [charsetId, index];
  }

  /**
   * 通行可能か
   * @param x
   * @param y
   * @returns
   */
  protected override _passableCharacters(x: number, y: number) {
    return gameMapSight.noTraffic(x, y, true);
  }

  /**
   * 後ろにひっつく
   * @param front
   */
  followCharacter(front: GameCharacter) {
    const sx = this.rangeX(front.x);
    const sy = this.rangeY(front.y);
    if (sx !== 0) {
      super.moveStraight(sx < 0 ? EDirection.Left : EDirection.Right);
    }
    if (sy !== 0) {
      super.moveStraight(sy < 0 ? EDirection.Up : EDirection.Down);
    }
  }

  /**
   * 移動ダメージを実行する
   */
  executeMoveDamage() {
    if (!this._walked) {
      return;
    }
    this._checkMoveDamage();
    return this._applyMoveDamage();
  }

  /**
   * 移動ダメージを確認する
   * @returns
   */
  private _checkMoveDamage() {
    const member = this._getMember();
    if (!member?.live) {
      return;
    }

    this._checkFloorDamage(member);
    this._checkSlipDamage(member);
  }

  /**
   * 床ダメージを確認する
   */
  private _checkFloorDamage(member: GameMember) {
    if (!gameSystem.floorDamage) {
      return;
    }
    const terrainId = this.currentTerrainId();
    if (terrainId === 0) {
      return;
    }
    const damage = terrains[terrainId].damage;
    if (!damage) {
      return;
    }
    const value = this._adjustFloorDamageValue(member, terrainId, damage.value);
    if (!value) {
      return;
    }
    this._setMoveDamage(member, value, damage.animationId);
  }

  /**
   * 床ダメージ値の調整
   * @param terrainId
   * @param value
   * @returns
   */
  private _adjustFloorDamageValue(
    member: GameMember,
    terrainId: number,
    value: number
  ) {
    const standardId = gameParty.getFloorDamageAdjustRate(terrainId);
    const rateIds = member.getFloorDefenseRateIds(terrainId);
    if (standardId) {
      rateIds.push(standardId);
    }
    return GameRate.multiDiv(rateIds, value);
  }

  /**
   * 現在の地形を取得する
   * @returns
   */
  currentTerrainId() {
    return gameMapSight.getTerrainId(this._x, this._y);
  }

  /**
   * スリップダメージを確認する
   */
  private _checkSlipDamage(member: GameMember) {
    if (!gameSystem.slipDamage) {
      return;
    }
    const rateId = gameMapSight.mapInfo.slipDamageRateId;
    if (!rateId) {
      return;
    }
    const slipDamages = member.slipDamages ?? [];
    const steps = gameParty.slipSteps;
    for (const damage of slipDamages) {
      if (steps % damage.steps) {
        continue;
      }
      this._setMoveDamage(
        member,
        GameRate.div(rateId, damage.value),
        damage.animationId
      );
    }
  }

  /**
   * 歩行ダメージを設定
   * @param value
   * @param animationId
   */
  private _setMoveDamage(
    member: GameMember,
    value: number,
    animationId: number
  ) {
    if (!value) {
      return;
    }
    const lastDamageValue = member.moveDamageValue;
    member.addMoveDamageValue(value);
    if (member.moveDamageValue === 0) {
      // ダメージと回復が同じ場合相殺
      member.setMoveDamageEffectId(0);
      return;
    }
    if (lastDamageValue * member.moveDamageValue <= 0) {
      // 初回か状態が変わった場合エフェクトを更新する
      member.setMoveDamageEffectId(animationId);
    }
  }

  /**
   * ダメージ効果を反映
   */
  private _applyMoveDamage() {
    const member = this._getMember();
    if (!member) {
      return false;
    }
    this._applyMoveDamageEffect(member);
    this._applyMoveDamageValue(member);
    const result = member.moveDamageValue !== 0;
    member.clearMoveDamage();
    return result;
  }

  /**
   * 移動ダメージ効果のアニメを反映
   */
  private _applyMoveDamageEffect(member: GameMember) {
    if (member.moveDamageEffectId > 0) {
      gameAnimations.push(member.moveDamageEffectId, [this]);
    }
  }

  /**
   * 移動ダメージ値を反映
   */
  private _applyMoveDamageValue(member: GameMember) {
    if (member.moveDamageValue !== 0) {
      const down = member.down;
      member.gainHp(-member.moveDamageValue);
      if (!down && member.down) {
        member.setMoveDown(true);
      }
    }
  }

  /**
   * 移動が終わったタイミングで確認する
   */
  protected override _updateAfterMove() {
    // 移動後フラグをON
    this._walked = true;
    super._updateAfterMove();
  }
}

const enum EGatherType {
  Normal,
  PerTimeHide,
  EndHide,
}

/**
 * 先頭者クラスの中断オブジェクト
 */
export interface SuspendObjectGameLeader extends SuspendObjectGameFollower {
  gathering: boolean;
  gatherType: EGatherType;
  moveDamageCalling: boolean;
  encounterCalling: boolean;
  encounterSkipCount: number;
}

/**
 * 先頭表示者
 */
export class GameLeader extends GameFollower {
  /**
   * 集合中かどうか
   */
  private _gathering: boolean = false;
  /**
   * 集合タイプ
   */
  private _gatherType: EGatherType = EGatherType.Normal;
  /**
   * 移動ダメージ呼び出しフラグ
   */
  private _moveDamageCalling: boolean = false;
  /**
   * エンカウント呼び出しフラグ
   */
  private _encounterCalling: boolean = false;
  /**
   * 敵に遭遇しない歩数
   */
  private _encounterSkipCount: number = 0;
  /**
   * 遭遇率補正Id
   */
  private _encounterCorrectId: number = 0;
  /**
   * BGMId
   */
  private _bgmId: number = 0;

  /**
   * 再設定
   */
  override reset(): void {
    super.reset();
    this._gathering = false;
    this._gatherType = EGatherType.Normal;
    this._moveDamageCalling = false;
    this._encounterCalling = false;
    this._encounterSkipCount = 0;
    this._encounterCorrectId = 0;
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  override loadSuspend(data: SuspendObjectGameLeader) {
    super.loadSuspend(data);
    this._gathering = data.gathering ?? this._gathering;
    this._gatherType = data.gatherType ?? this._gatherType;
    this._moveDamageCalling = data.moveDamageCalling ?? this._moveDamageCalling;
    this._encounterCalling = data.encounterCalling ?? this._encounterCalling;
    this._encounterSkipCount =
      data.encounterSkipCount ?? this._encounterSkipCount;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  override createSuspendObject(): SuspendObjectGameLeader {
    return {
      ...super.createSuspendObject(),
      gathering: this._gathering,
      gatherType: this._gatherType,
      moveDamageCalling: this._moveDamageCalling,
      encounterCalling: this._encounterCalling,
      encounterSkipCount: this._encounterSkipCount,
    };
  }

  /**
   * 移動ルート上書きフラグの設定
   * 先頭者にもフラグを設定する
   * @param value
   */
  override setMoveRouteOverride(value: boolean) {
    super.setMoveRouteOverride(value);
    gameTemp.setLeaderMoveRouteOverride(value);
  }

  /**
   * 集合するかどうかを取得する
   */
  get gathering() {
    return this._gathering;
  }

  /**
   * 移動ダメージを呼び出しフラグを取得する
   */
  get moveDamageCalling() {
    return this._moveDamageCalling;
  }

  /**
   * 移動ダメージを呼び出しフラグを消去する
   */
  clearMoveDamageCalling() {
    this._moveDamageCalling = false;
  }

  /**
   * エンカウント呼び出しフラグを取得する
   */
  get encounterCalling() {
    return this._encounterCalling;
  }

  /**
   * エンカウント呼び出しフラグを消去する
   */
  clearEncounterCalling() {
    this._encounterCalling = false;
  }

  /**
   * エンカウント呼び出しフラグを立てる
   */
  startEncounterCalling() {
    this._encounterCalling = true;
  }

  /**
   * エンカウント補正Idを消去する
   */
  clearEncounterCorrectId() {
    this._encounterCorrectId = 0;
  }

  /**
   * 敵に遭遇しない歩数を設定する
   */
  setEncounterSkipCount(value: number) {
    this._encounterSkipCount = value;
  }

  /**
   * BGMIdを設定する
   * @param value
   */
  setBgmId(value: number) {
    this._bgmId = value;
  }

  /**
   * BGMIdを取得する
   */
  get bgmId() {
    return this._bgmId;
  }

  /**
   * 移動を更新する
   * @returns
   */
  protected _inputMove() {
    const dir = this._inputDirection();
    if (dir < 0) {
      return;
    }
    this.moveStraight(dir);
  }

  /**
   * 前方イベントの確認
   * @returns
   */
  protected override _checkFrontEvent() {
    return gameMapSight.checkEventFront();
  }

  /**
   * 方向入力
   * @returns
   */
  private _inputDirection() {
    const dir4 = Input.dir4();
    if (dir4 === 0) {
      return -1;
    }
    // キャラセット座標に変換
    return dir4 / 2 - 1;
  }

  /**
   * 移動可能か
   * @returns
   */
  override canMove(): boolean {
    if (this._gathering) {
      return false;
    }
    return super.canMove();
  }

  /**
   * マップの通行可能判定
   * 接触で乗り込める乗り物があれば通行可能とする
   * @param x
   * @param y
   * @param newX
   * @param newY
   * @param dir
   * @returns
   */
  protected override _mapPassable(
    x: number,
    y: number,
    newX: number,
    newY: number,
    dir: number
  ) {
    if (this._testThrough()) {
      return true;
    }
    const vehiclePass = gameMapSight.passInVehicle(newX, newY);
    if (vehiclePass > 0) {
      // 可能ならそのままok
      return true;
    }
    const walkPassable = gameMapSight.passable(
      newX,
      newY,
      this.reverseDir(dir)
    );
    if (vehiclePass < 0 && walkPassable) {
      // 乗り物はだめだが歩行可の場合乗車タイプが接触なら降車して通行可能
      if (gameMapSight.contactGetOff()) {
        return true;
      }
    }
    if (vehiclePass < 0) {
      return false;
    } else {
      return (
        (walkPassable && gameMapSight.passable(x, y, dir)) ||
        gameMapSight.contactVehicle(newX, newY)
      );
    }
  }

  /**
   * テスト用のすり抜け可能かどうか
   * @returns
   */
  private _testThrough() {
    return (
      gameTemp.testPlay &&
      (Input.isPressedThrough() || Input.isPressedTalisman())
    );
  }

  /**
   * イベントチェック
   * 移動が終わったタイミングで確認する
   */
  protected override _updateAfterMove() {
    // 部屋の確認
    if (gameMapSight.checkChangeRoom()) {
      this._encounterCorrectId = system.switchingRateId;
    }
    super._updateAfterMove();
  }

  /**
   * 移動後の確認
   */
  protected override _checkAfterMove() {
    super._checkAfterMove();
    // 乗り物確認
    this._checkVehicle();
    // 同位置イベントの確認
    gameMapSight.checkEventCurrent();
    // エンカウント開始の確認
    this._checkStartEncounter();
    // 移動ダメージ開始の確認
    this._checkStartMoveDamage();
    this.clearEncounterCorrectId();
  }

  /**
   * 乗り物を確認する
   */
  private _checkVehicle() {
    if (this.ignoredEvents) {
      return;
    }
    const vehicle = gameMapSight.contactGetOn(this.x, this.y);
    if (vehicle) {
      this.startGather(vehicle.gatherType);
      return true;
    }
    return false;
  }

  /**
   * エンカウント開始を確認する
   */
  private _checkStartEncounter() {
    if (this.ignoredEvents || !gameSystem.encounter) {
      return;
    }
    const ids = gameMapSight.getEncounterElements();
    gameParty.decEncounterAdjustsCount(ids);
    if (this._encounterSkipCount > 0) {
      this._encounterSkipCount--;
      return;
    }

    if (this._judgeEncounter(ids) && !this._testTalisman()) {
      this.startEncounterCalling();
    }
  }

  /**
   * テスト用のエンカウントなしかどうか
   * @returns
   */
  private _testTalisman() {
    return gameTemp.testPlay && Input.isPressedTalisman();
  }

  /**
   * エンカウントを判定する
   * @returns
   */
  private _judgeEncounter(ids: number[]) {
    const rateId = gameMapSight.getEncounterRateId();
    if (!rateId) {
      return false;
    }
    const terrainId = gameMapSight.getTerrainId(this.x, this.y);
    const correctId = terrains[terrainId]?.encounterRateId ?? 0;
    const rateIds = gameParty.getEncounterAdjustRates(ids);
    rateIds.push(rateId);
    if (correctId) {
      rateIds.push(correctId);
    }
    if (this._encounterCorrectId) {
      rateIds.push(this._encounterCorrectId);
    }
    return GameRate.multiJudge(rateIds);
  }

  /**
   * 移動ダメージ開始を確認する
   */
  private _checkStartMoveDamage() {
    if (this.ignoredEvents) {
      return;
    }
    gameParty.incSlipSteps();
    this._moveDamageCalling = true;
  }

  /**
   * 集合を開始する
   * @param type
   */
  startGather(type: EGatherType) {
    this._gathering = true;
    this._gatherType = type;
  }

  /**
   * 集合処理
   * 追尾設定offでも集合する
   * _checkGather()とfollowing()を逆転させると
   * 集合まで１フレーム遅らせることができる
   * @returns
   */
  gather() {
    if (!this._gathering) {
      return;
    }

    // 集合した
    if (this._checkGather()) {
      this._endGather();
      return;
    }
    let prevFollower = this as GameFollower;
    this._eachFollowers((follower) => {
      if (!this.contact(prevFollower.x, prevFollower.y)) {
        return false;
      }
      if (!prevFollower.isMoving()) {
        this._recordFollowNormal.call(prevFollower, follower);
      }
      prevFollower = follower;
      return true;
    });
  }

  /**
   * 集合を確認する
   * @returns
   */
  private _checkGather() {
    if (this.isMoving()) {
      return false;
    }
    this._gatherPerTimeHide(this);

    this._eachFollowers((follower) => {
      if (follower.isMoving()) {
        return false;
      }
      if (follower.contact(this.x, this.y)) {
        return this._gatherPerTimeHide(follower);
      }
      return false;
    });

    return this._everyFollowers((follower) => {
      return !follower.isMoving() && follower.contact(this.x, this.y);
    });
  }

  /**
   * 集合タイプが集合終わった隊員ごとなら非表示にする
   * @param person
   */
  private _gatherPerTimeHide(person: GamePerson) {
    if (this._gatherType === EGatherType.PerTimeHide) {
      if (!person.transparent) {
        person.setTransparent(true);
      }
    }
    return person.transparent;
  }

  /**
   * 集合を終了する
   */
  private _endGather() {
    this._gathering = false;
    if (this._gatherType === EGatherType.EndHide) {
      this.setTransparent(true);
      this._eachFollowers((follower) => {
        follower.setTransparent(true);
        return true;
      });
    }
  }

  /**
   * アニメーカウントをそろえる
   */
  adjustAnimeCount() {
    const value = this.animeCount;
    this._eachFollowers((follower) => {
      follower.setAnimeCount(value);
      return true;
    });
  }

  /**
   * 牽引されているか
   * @returns
   */
  protected override _towed() {
    return false;
  }
}
