import { gameParty, gameSystem, gameTemp } from './DataStore';
import {
  GameLeader,
  GameFollower,
  SuspendObjectGameFollower,
  SuspendObjectGameLeader,
} from './GamePlayer';
import { EFollowerControl } from './GameSystem';
import { EInputOperation, Input } from './Input';

const enum EMarchControl {
  Refresh,
  Lineup,
  GatherLeader,
}

const enum EFirstFollowerId {
  Member,
  Npc = 1000,
}

/**
 * 隊列クラスの中断オブジェクト
 */
export interface SuspendObjectGameMarch {
  leader: SuspendObjectGameLeader;
  followers: SuspendObjectGameFollower[];
  displayOrder: number[];
}

/**
 * 隊列歩行クラス
 *
 * コマンド73 仲間追加
 * コマンド74 仲間外す
 * コマンド75 NPC追加
 * コマンド76 NPC外す
 */
export class GameMarch {
  /**
   * 先頭表示のプレイヤー
   */
  private _leader: GameLeader = new GameLeader(0);
  /**
   * 先頭についてくるプレイヤー
   * 要は隊員
   */
  private _followers: GameFollower[] = [];
  /**
   * 表示順序
   * ばたんなどで並び順と表示位置が違うことが
   * あるので表示用の参照インデックス
   */
  private _displayOrder: number[] = [];
  /**
   * メニュー起動フラグ
   */
  private _menuCalling: boolean = false;
  /**
   * 便利機能呼び出し
   */
  private _multiCalling: boolean = false;

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameMarch) {
    this._leader.loadSuspend(data.leader);
    for (const follower of data.followers) {
      const newFollower = new GameFollower(0);
      newFollower.loadSuspend(follower);
      this._followers.push(newFollower);
    }
    this._displayOrder = data.displayOrder ?? this._displayOrder;
    this._linkFollower();
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameMarch {
    return {
      leader: this._leader.createSuspendObject(),
      followers: this._followers.map((f) => f.createSuspendObject()),
      displayOrder: this._displayOrder,
    };
  }

  /**
   * 先頭オブジェクトを取得する
   */
  get leader() {
    return this._leader;
  }

  /**
   * 隊員オブジェクトを取得する
   */
  get followers() {
    return this._followers;
  }

  /**
   * メニュー呼び出しフラグを取得する
   */
  get menuCalling() {
    return this._menuCalling;
  }

  /**
   * 便利行動呼び出しフラグを取得する
   */
  get multiCalling() {
    return this._multiCalling;
  }

  /**
   * メニュー呼び出しをクリアする
   */
  clearMenuCalling() {
    this._menuCalling = false;
  }

  /**
   * 便利行動呼び出しをクリアする
   */
  clearMultiCalling() {
    this._multiCalling = false;
  }

  /**
   * インデックスのプレイヤーを取得する
   * @param index
   * @returns
   */
  getPlayer(index: number) {
    if (index === 0) {
      return this._leader;
    } else {
      return this._followers[index - 1];
    }
  }

  /**
   * 指定メンバーの表示位置を検索する
   * @param memberId
   * @returns
   */
  findDispOrder(memberId: number) {
    return (
      this._displayOrder.find(
        (value) => gameParty.members[value].id === memberId
      ) ?? -1
    );
  }

  /**
   * 表示メンバーIdを取得する
   * @param index
   * @returns
   */
  getDispMemberId(index: number) {
    return gameParty.members[this._displayOrder[index]]?.id ?? -1;
  }

  /**
   * 設定する
   */
  setup() {
    this._followers = gameParty.members.slice(1).map(() => new GameFollower(0));
    this._setDisplayOrder();
    this._linkFollower();
  }

  /**
   * 隊員を紐づける
   */
  private _linkFollower() {
    if (this._followers.length > 0) {
      this._leader.setFollower(this._followers[0]);
    }
    for (let i = 1; i < this._followers.length; i++) {
      this._followers[i - 1].setFollower(this._followers[i]);
    }
  }

  /**
   * 隊員を増やす
   * @returns
   */
  addFollower() {
    const displayLength = this.displayLength();
    if (gameParty.followerLength <= displayLength) {
      return;
    }
    if (displayLength > 0) {
      const player = new GameFollower(0);
      const front = this.getPlayer(displayLength - 1);
      front.setFollower(player);
      player.toBack(front);
      this._followers.push(player);
      this._leader.adjustAnimeCount();
    }
    gameTemp.requestRefreshMarch();
  }

  /**
   * 隊員を減らす
   */
  removeFollower() {
    const displayLength = this.displayLength();
    if (gameParty.followerLength >= displayLength) {
      return;
    }
    if (displayLength > 1) {
      const front = this.getPlayer(displayLength - 2);
      front.setFollower(null);
      this._followers.pop();
    }
    gameTemp.requestRefreshMarch();
  }

  /**
   * 表示数を取得する
   * @returns
   */
  displayLength() {
    return (this._leader.exist ? 1 : 0) + this._followers.length;
  }

  /**
   * 一新する
   */
  refresh() {
    this._setDisplayOrder();
    this._leader.refresh();
    for (const follower of this._followers) {
      follower.refresh();
    }
    gameTemp.endRefreshMarch();
  }

  /**
   * 指定の座標に移動する
   * @param x
   * @param y
   */
  moveto(x: number, y: number) {
    switch (gameSystem.transferFollower) {
      case EFollowerControl.GatherLeader:
        this._movetoGatherLeader(x, y);
        break;
      case EFollowerControl.Lineup:
        this._movetoLineup(x, y);
        break;
      default:
        this._movetoNormal(x, y);
    }
    this._resetInput();
    gameParty.clearFloorDamageAdjusts();
  }

  /**
   * 相対位置を維持したまま移動
   * @param x
   * @param y
   */
  private _movetoNormal(x: number, y: number) {
    const prevX = this._leader.x;
    const prevY = this._leader.y;
    this._leader.moveto(x, y);
    for (const follower of this._followers) {
      follower.moveto(x + (follower.x - prevX), y + (follower.y - prevY));
    }
  }

  /**
   * 一列に並んで移動
   * @param x
   * @param y
   */
  private _movetoLineup(x: number, y: number) {
    this._leader.moveto(x, y);
    this.lineup();
  }

  /**
   * 先頭に集合して移動
   * @param x
   * @param y
   */
  private _movetoGatherLeader(x: number, y: number) {
    this._leader.moveto(x, y);
    this.gatherLeader();
  }

  /**
   * 移動後の隊員の入力リストをクリア
   */
  private _resetInput() {
    this._leader.clearInputList();
    for (const follower of this._followers) {
      follower.clearInputList();
    }
  }

  /**
   * 移動後の表示を設定する
   * @returns
   */
  moveAfterVisible() {
    if (gameSystem.transferVisibility === 0) {
      return;
    }
    const transparent = gameSystem.transferVisibility === 2;
    this._leader.setTransparent(transparent);
    for (const follower of this._followers) {
      follower.setTransparent(transparent);
    }
  }

  /**
   * 移動速度を設定する
   * @param value
   */
  setMoveSpeed(value: number) {
    this._leader.setMoveSpeed(value);
    for (const follower of this._followers) {
      follower.setMoveSpeed(value);
    }
  }

  /**
   * 方向を設定する
   * @param value
   */
  changeDirection(value: number) {
    this._leader.changeDirection(value);
    for (const follower of this._followers) {
      follower.changeDirection(value);
    }
  }

  /**
   * アニメーションパターンをリセットする
   */
  resetPattern() {
    this._leader.resetPattern();
    for (const follower of this._followers) {
      follower.resetPattern();
    }
  }

  /**
   * 全体の表示状態を設定する
   * @param show
   */
  allVisible(show: boolean) {
    const value = !show;
    this._leader.setTransparent(value);
    for (const follower of this._followers) {
      follower.setTransparent(value);
    }
  }

  /**
   * 隊列操作
   * @param type 0:再設定 1:一列 2:先頭に移動
   */
  control(type: EMarchControl) {
    switch (type) {
      case EMarchControl.Refresh:
        this.refresh();
        break;
      case EMarchControl.Lineup:
        this.lineup();
        break;
      case EMarchControl.GatherLeader:
        this.gatherLeader();
    }
  }

  /**
   * 隊員を一列に並べる
   */
  lineup() {
    for (let i = 0; i < this._followers.length; i++) {
      const front = i === 0 ? this._leader : this._followers[i - 1];
      this._followers[i].stopMoving();
      this._followers[i].toBack(front);
    }
  }

  /**
   * 隊員を先頭に移動
   */
  gatherLeader() {
    for (const follower of this._followers) {
      follower.moveto(this._leader.x, this._leader.y);
      follower.stopMoving();
      follower.changeDirection(this._leader.direction);
    }
  }

  /**
   * フレーム更新
   * @returns
   */
  update() {
    this._leader.update();
    for (const follower of this._followers) {
      follower.update();
      if (gameSystem.following) {
        follower.setThrough(this._leader.through);
        follower.setAnimeCount(this._leader.animeCount);
      }
    }
    this._leader.gather();
    this._updateDisplay();
    this._checkButtonInput();
  }

  /**
   * 表示を更新する
   * @returns
   */
  private _updateDisplay() {
    if (!gameTemp.needsRefreshMarch) {
      return;
    }

    this.refresh();
  }

  /**
   * ボタン入力の確認
   * @returns
   */
  private _checkButtonInput() {
    if (!this._allowInputButton()) {
      return;
    }
    if (Input.isTriggeredOperation(EInputOperation.Menu)) {
      this._menuCalling = true;
      return;
    }
    if (Input.isTriggeredOperation(EInputOperation.Multi)) {
      // 押されたことを記録
      this._multiCalling = true;
      return;
    }
    if (gameTemp.testPlay) {
      this._checkTestButtonInput();
    }
  }

  /**
   * テストプレイ用のボタン入力の確認
   * @returns
   */
  private _checkTestButtonInput() {
    if (Input.isTriggeredDebug()) {
      // デバッグは他でも使うかもしれないのでtemp保存
      gameTemp.startDebugCalling();
      return;
    }

    if (Input.isTriggeredEncounter()) {
      this._leader.startEncounterCalling();
      return;
    }
  }

  /**
   * ボタン入力を許可するか
   * @returns
   */
  private _allowInputButton() {
    return this.leader.canMove() && this._canMove();
  }

  /**
   * 移動可能か
   * @returns
   */
  private _canMove() {
    return true;
  }

  /**
   * メニュー可能か
   * @returns
   */
  enableMenu() {
    return this._leader.exist && !this._leader.isMoving();
  }

  /**
   * 便利行動可能か
   * @returns
   */
  enableMulti() {
    return this._leader.exist && !this._leader.isMoving();
  }

  /**
   * 通行可能か
   * @param x
   * @param y
   * @returns
   */
  noTraffic(x: number, y: number) {
    if (!this._leader.exist) {
      return false;
    }

    return (
      this._leader.noTraffic(x, y) ||
      this._followers.some((player) => player.noTraffic(x, y))
    );
  }

  /**
   * 表示順序を設定する
   */
  private _setDisplayOrder() {
    this._displayOrder = this._makeDisplayOrder();
    this._setDisplayPriority();
  }

  /**
   * 表示順序を作成する
   * @returns
   */
  private _makeDisplayOrder() {
    const order: number[] = [];
    const downOrder: number[] = [];
    const members = gameParty.members;

    for (let i = 0; i < members.length; i++) {
      if (members[i].hidden) {
        continue;
      }
      if (members[i].live) {
        order.push(i);
      } else {
        downOrder.push(i);
      }
    }
    const npcs = gameParty.npcIds.map((id) => id + EFirstFollowerId.Npc);
    order.push(...npcs, ...downOrder);

    return order;
  }

  /**
   * 表示優先度を設定する
   */
  private _setDisplayPriority() {
    const max = this._displayOrder.length;
    if (max <= 0) {
      this._setPlayerDisplay(this._leader, -1, 0);
      return;
    }

    this._setPlayerDisplay(this._leader, this._displayOrder[0], max * 0.001);

    // offset = 1～max 前のほうが値が高い
    for (let i = 1; i < max; i++) {
      const offset = (max - i) * 0.001;
      this._setPlayerDisplay(
        this._followers[i - 1],
        this._displayOrder[i],
        offset
      );
    }
  }

  /**
   * プレイヤーの表示設定
   * @param player
   * @param id
   * @param priority
   */
  private _setPlayerDisplay(
    player: GameFollower,
    id: number,
    priority: number
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    id < EFirstFollowerId.Npc
      ? player.setMemberIndex(id)
      : player.setNpcId(id - EFirstFollowerId.Npc);
    player.setOffsetPriority(priority);
  }

  /**
   * いずれかが指定移動中か
   * @returns
   */
  someForceMoving() {
    return (
      this._leader.forceMoving ||
      this._followers.some((value) => value.forceMoving)
    );
  }

  /**
   * 移動ダメージを実行する
   * @returns
   */
  executeMoveDamage() {
    const terrainIds = this._currentTerrainIds();
    gameParty.updateFloorDamageAdjusts(terrainIds);
    this._leader.executeMoveDamage();
    for (const follower of this._followers) {
      follower.executeMoveDamage();
    }
  }

  /**
   * 現在位置の地形Idを取得する
   * @returns
   */
  private _currentTerrainIds() {
    const ids: Set<number> = new Set();
    ids.add(this._leader.currentTerrainId());
    for (const follower of this._followers) {
      ids.add(follower.currentTerrainId());
    }
    return Array.from(ids);
  }

  /**
   * 移動後ダメージをクリアする
   */
  clearMoveDamageCalling() {
    this._leader.clearMoveDamageCalling();
    this._leader.clearWalked();
    for (const follower of this._followers) {
      follower.clearWalked();
    }
  }
}
